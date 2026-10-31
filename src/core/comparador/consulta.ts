import { RAMOS, type RamoId } from './ramos';
import { hoyEnLima } from './tarifa';

// Consulta del comparador (issue #45): qué pasos pide cada ramo y cómo se
// valida cada uno. Es dominio puro: lo usa el asistente de /comparar (cliente) y
// lo reutilizará el endpoint POST /api/comparar (#46) con el mismo borrador.
//
// Reglas (reunión 01): máximo 4 pasos por ramo, solo los datos que usa la
// tarifa y el contacto al final, para ver el resultado.

export type PasoId = 'uso' | 'vehiculo' | 'valor' | 'producto' | 'edades' | 'empresa' | 'contacto';

export const PASOS: Record<RamoId, PasoId[]> = {
  soat: ['uso', 'contacto'],
  vehicular: ['uso', 'vehiculo', 'valor', 'contacto'],
  salud: ['producto', 'edades', 'contacto'],
  'sctr-vida-ley': ['producto', 'empresa', 'contacto'],
};

export const MONEDAS_VALOR = ['USD', 'PEN'] as const;
export type MonedaValor = (typeof MONEDAS_VALOR)[number];

export const CONSULTA_LIMITES = {
  anioMin: 1980,
  valorMin: 1000,
  valorMax: 2_000_000,
  edadMax: 99,
  personasMax: 8,
  trabajadoresMax: 5000,
  planillaMax: 50_000_000,
  texto: 120,
} as const;

// Lo que escribe la persona, tal cual (los inputs devuelven texto).
export interface Borrador {
  uso: string;
  marca: string;
  anio: string;
  valor: string;
  moneda: MonedaValor;
  producto: string;
  edades: string[];
  actividad: string;
  trabajadores: string;
  planilla: string;
  nombre: string;
  celular: string;
  correo: string;
  acepta: boolean;
}

export type Campo = Exclude<keyof Borrador, 'edades'> | `edades.${number}` | 'edades';

export function borradorVacio(): Borrador {
  return {
    uso: '',
    marca: '',
    anio: '',
    valor: '',
    moneda: 'USD',
    producto: '',
    edades: [''],
    actividad: '',
    trabajadores: '',
    planilla: '',
    nombre: '',
    celular: '',
    correo: '',
    acepta: false,
  };
}

// Códigos de error por campo; el texto visible vive en los diccionarios
// (comparador.errors.<código>).
export type ConsultaErrorCode =
  | 'required'
  | 'invalid'
  | 'too_long'
  | 'year_range'
  | 'value_range'
  | 'age_range'
  | 'ages_count'
  | 'workers_range'
  | 'payroll_range'
  | 'phone'
  | 'email'
  | 'consent_required';

export type ConsultaErrores = Partial<Record<Campo, ConsultaErrorCode>>;

export function anioMaximo(hoy: string = hoyEnLima()): number {
  return Number(hoy.slice(0, 4)) + 1;
}

// Sctr pide el nivel de riesgo; Vida Ley se tarifa sin él (ver tarifa.ts).
export function pideActividad(producto: string): boolean {
  return producto === 'sctr';
}

const ENTERO = /^\d+$/;
const NUMERO = /^\d+(\.\d{1,2})?$/;
const CELULAR = /^9\d{8}$/;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function entero(valor: string, min: number, max: number): boolean {
  const limpio = valor.trim();
  return ENTERO.test(limpio) && Number(limpio) >= min && Number(limpio) <= max;
}

function numero(valor: string, min: number, max: number): boolean {
  const limpio = valor.trim();
  return NUMERO.test(limpio) && Number(limpio) >= min && Number(limpio) <= max;
}

function opcion(ramo: RamoId, campo: 'usos' | 'productos' | 'actividades', valor: string): ConsultaErrorCode | undefined {
  if (!valor) return 'required';
  return RAMOS[ramo][campo]?.some((o) => o.id === valor) ? undefined : 'invalid';
}

function texto(valor: string): ConsultaErrorCode | undefined {
  if (!valor.trim()) return 'required';
  return valor.trim().length > CONSULTA_LIMITES.texto ? 'too_long' : undefined;
}

// Errores de un paso; un objeto vacío significa que se puede avanzar.
export function validarPaso(ramo: RamoId, paso: PasoId, b: Borrador, hoy?: string): ConsultaErrores {
  const errores: ConsultaErrores = {};
  const set = (campo: Campo, code: ConsultaErrorCode | undefined) => {
    if (code) errores[campo] = code;
  };
  const L = CONSULTA_LIMITES;

  switch (paso) {
    case 'uso':
      set('uso', opcion(ramo, 'usos', b.uso));
      break;
    case 'vehiculo':
      set('marca', texto(b.marca));
      set('anio', !b.anio.trim() ? 'required' : entero(b.anio, L.anioMin, anioMaximo(hoy)) ? undefined : 'year_range');
      break;
    case 'valor':
      set('valor', !b.valor.trim() ? 'required' : numero(b.valor, L.valorMin, L.valorMax) ? undefined : 'value_range');
      set('moneda', (MONEDAS_VALOR as readonly string[]).includes(b.moneda) ? undefined : 'invalid');
      break;
    case 'producto':
      set('producto', opcion(ramo, 'productos', b.producto));
      break;
    case 'edades':
      if (b.edades.length < 1 || b.edades.length > L.personasMax) {
        set('edades', 'ages_count');
      }
      b.edades.forEach((edad, i) => {
        set(`edades.${i}`, !edad.trim() ? 'required' : entero(edad, 0, L.edadMax) ? undefined : 'age_range');
      });
      break;
    case 'empresa':
      if (pideActividad(b.producto)) {
        set('actividad', opcion(ramo, 'actividades', b.actividad));
      }
      set('trabajadores', !b.trabajadores.trim() ? 'required' : entero(b.trabajadores, 1, L.trabajadoresMax) ? undefined : 'workers_range');
      set('planilla', !b.planilla.trim() ? 'required' : numero(b.planilla, 1, L.planillaMax) ? undefined : 'payroll_range');
      break;
    case 'contacto':
      set('nombre', texto(b.nombre));
      set('celular', !b.celular.trim() ? 'required' : CELULAR.test(b.celular.trim()) ? undefined : 'phone');
      set('correo', !b.correo.trim() ? 'required' : CORREO.test(b.correo.trim()) && b.correo.trim().length <= L.texto ? undefined : 'email');
      set('acepta', b.acepta ? undefined : 'consent_required');
      break;
  }
  return errores;
}

// Datos ya validados y tipados que recibirá el motor de cálculo (#46).
export type DatosConsulta =
  | { ramo: 'soat'; uso: string }
  | { ramo: 'vehicular'; uso: string; marca: string; anio: number; valor: number; moneda: MonedaValor }
  | { ramo: 'salud'; producto: string; edades: number[] }
  | { ramo: 'sctr-vida-ley'; producto: string; actividad: string | null; trabajadores: number; planilla: number };

export interface Consulta {
  datos: DatosConsulta;
  contacto: { nombre: string; celular: string; correo: string; acepta: true };
}

function aDatos(ramo: RamoId, b: Borrador): DatosConsulta {
  switch (ramo) {
    case 'soat':
      return { ramo, uso: b.uso };
    case 'vehicular':
      return { ramo, uso: b.uso, marca: b.marca.trim(), anio: Number(b.anio), valor: Number(b.valor), moneda: b.moneda };
    case 'salud':
      return { ramo, producto: b.producto, edades: b.edades.map(Number) };
    case 'sctr-vida-ley':
      return {
        ramo,
        producto: b.producto,
        actividad: pideActividad(b.producto) ? b.actividad : null,
        trabajadores: Number(b.trabajadores),
        planilla: Number(b.planilla),
      };
  }
}

// Valida todos los pasos del ramo y arma la consulta tipada.
export function validarConsulta(ramo: RamoId, b: Borrador, hoy?: string): { ok: true; consulta: Consulta } | { ok: false; errores: ConsultaErrores } {
  const errores: ConsultaErrores = {};
  for (const paso of PASOS[ramo]) {
    Object.assign(errores, validarPaso(ramo, paso, b, hoy));
  }
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }
  return {
    ok: true,
    consulta: {
      datos: aDatos(ramo, b),
      contacto: { nombre: b.nombre.trim(), celular: b.celular.trim(), correo: b.correo.trim(), acepta: true },
    },
  };
}

const montoPe = (valor: number) => valor.toLocaleString('es-PE', { maximumFractionDigits: 2 });

// Resumen en español para Melanie (mensaje de WhatsApp; luego, correo y bandeja).
export function resumenConsulta(consulta: Consulta): Array<{ label: string; value: string }> {
  const { datos, contacto } = consulta;
  const ramo = RAMOS[datos.ramo];
  const etiqueta = (lista: typeof ramo.usos, id: string) => lista?.find((o) => o.id === id)?.label ?? id;
  const filas: Array<{ label: string; value: string }> = [];

  switch (datos.ramo) {
    case 'soat':
      filas.push({ label: 'Uso', value: etiqueta(ramo.usos, datos.uso) });
      break;
    case 'vehicular':
      filas.push(
        { label: 'Uso', value: etiqueta(ramo.usos, datos.uso) },
        { label: 'Vehículo', value: `${datos.marca} ${datos.anio}` },
        { label: 'Valor', value: `${datos.moneda === 'USD' ? 'US$' : 'S/'} ${montoPe(datos.valor)}` },
      );
      break;
    case 'salud':
      filas.push(
        { label: 'Seguro', value: etiqueta(ramo.productos, datos.producto) },
        { label: 'Edades', value: datos.edades.join(', ') },
      );
      break;
    case 'sctr-vida-ley':
      filas.push({ label: 'Seguro', value: etiqueta(ramo.productos, datos.producto) });
      if (datos.actividad) {
        filas.push({ label: 'Actividad', value: etiqueta(ramo.actividades, datos.actividad) });
      }
      filas.push(
        { label: 'Trabajadores', value: String(datos.trabajadores) },
        { label: 'Planilla mensual', value: `S/ ${montoPe(datos.planilla)}` },
      );
      break;
  }
  filas.push(
    { label: 'Nombre', value: contacto.nombre },
    { label: 'Celular', value: contacto.celular },
    { label: 'Correo', value: contacto.correo },
  );
  return filas;
}
