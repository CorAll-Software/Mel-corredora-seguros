import { z } from 'zod';
import { FORMULAS, MONEDAS, PERIODOS, RAMOS, RAMO_IDS, type CondicionCampo, type RamoId } from './ramos';

// Entidad Tarifa referencial (issue #44) y sus reglas de negocio. Sin
// dependencias de base de datos ni de framework: se puede probar y reutilizar
// en el comparador.
//
// Reglas: toda tarifa tiene vigencia (desde/hasta); las vencidas o inactivas no
// se usan para cotizar; las cifras son referenciales (no promesas exigibles).

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa el formato AAAA-MM-DD.');
const entero = z.number({ error: 'Escribe un número.' }).int('Debe ser un número entero.').min(0, 'No puede ser negativo.');

export const tarifaInputSchema = z
  .object({
    ramo: z.enum(RAMO_IDS, { error: 'Elige un ramo.' }),
    aseguradora: z.string().min(1, 'Elige una aseguradora.'),
    plan: z.string().trim().min(1, 'Escribe el nombre del plan.').max(80, 'Máximo 80 caracteres.'),
    uso: z.string().nullable(),
    anioMin: entero.max(2100).nullable(),
    anioMax: entero.max(2100).nullable(),
    producto: z.string().nullable(),
    edadMin: entero.max(120).nullable(),
    edadMax: entero.max(120).nullable(),
    actividad: z.string().nullable(),
    trabajadoresMin: entero.nullable(),
    trabajadoresMax: entero.nullable(),
    formula: z.enum(FORMULAS, { error: 'Elige cómo se calcula.' }),
    valor: z.number({ error: 'Escribe un número.' }).positive('Debe ser mayor que cero.'),
    primaMinima: z.number({ error: 'Escribe un número.' }).min(0, 'No puede ser negativa.').nullable(),
    moneda: z.enum(MONEDAS),
    periodo: z.enum(PERIODOS),
    // Sin "|": es el separador de coberturas en el CSV.
    coberturas: z
      .array(z.string().trim().min(1).max(120, 'Cada cobertura: máximo 120 caracteres.').refine((c) => !c.includes('|'), 'No uses el carácter "|".'))
      .max(5, 'Máximo 5 coberturas.'),
    vigenciaDesde: fecha,
    vigenciaHasta: fecha,
    activa: z.boolean(),
    esEjemplo: z.boolean(),
    nota: z.string().trim().max(300, 'Máximo 300 caracteres.').nullable(),
  })
  .superRefine((t, ctx) => {
    const ramo = RAMOS[t.ramo as RamoId];
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });

    if (!ramo.aseguradoras.includes(t.aseguradora)) {
      issue('aseguradora', `Para ${ramo.label} solo se usan: ${ramo.aseguradoras.join(', ')}.`);
    }
    if (!ramo.formulas.includes(t.formula)) {
      issue('formula', `Para ${ramo.label} el cálculo puede ser: ${ramo.formulas.join(', ')}.`);
    }
    if (t.formula === 'porcentaje' && t.valor > 100) {
      issue('valor', 'La tasa es un porcentaje: máximo 100.');
    }

    // Variables que no aplican a este ramo deben quedar vacías.
    const campos: CondicionCampo[] = ['uso', 'anioMin', 'anioMax', 'producto', 'edadMin', 'edadMax', 'actividad', 'trabajadoresMin', 'trabajadoresMax'];
    for (const campo of campos) {
      if (!ramo.condiciones.includes(campo) && t[campo] !== null) {
        issue(campo, `${ramo.label} no usa este dato.`);
      }
    }
    const opcionesPorCampo = { uso: ramo.usos, producto: ramo.productos, actividad: ramo.actividades } as const;
    for (const [campo, opciones] of Object.entries(opcionesPorCampo) as Array<[keyof typeof opcionesPorCampo, typeof ramo.usos]>) {
      const value = t[campo];
      if (value !== null && opciones && !opciones.some((o) => o.id === value)) {
        issue(campo, 'Opción no válida.');
      }
    }
    if (t.actividad !== null && t.producto === 'vida-ley') {
      issue('actividad', 'Vida Ley no se tarifa por nivel de riesgo.');
    }

    const restriccion = ramo.restricciones?.[t.aseguradora];
    if (restriccion && (t.producto === null || !restriccion.productos.includes(t.producto))) {
      issue('producto', `Esta aseguradora solo cotiza: ${restriccion.productos.join(', ')}.`);
    }

    const rango = (min: number | null, max: number | null, path: string) => {
      if (min !== null && max !== null && min > max) {
        issue(path, 'El mínimo no puede ser mayor que el máximo.');
      }
    };
    rango(t.anioMin, t.anioMax, 'anioMax');
    rango(t.edadMin, t.edadMax, 'edadMax');
    rango(t.trabajadoresMin, t.trabajadoresMax, 'trabajadoresMax');

    if (t.vigenciaDesde > t.vigenciaHasta) {
      issue('vigenciaHasta', 'La vigencia termina antes de empezar.');
    }
  });

export type TarifaInput = z.infer<typeof tarifaInputSchema>;

export interface Tarifa extends TarifaInput {
  id: number;
  actualizadoEn: Date;
}

export type TarifaEstado = 'vigente' | 'futura' | 'vencida' | 'inactiva';

// Fecha de hoy en Lima (AAAA-MM-DD): las vigencias se cuentan en hora peruana.
export function hoyEnLima(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(now);
}

export function estadoTarifa(t: Pick<Tarifa, 'activa' | 'vigenciaDesde' | 'vigenciaHasta'>, hoy: string): TarifaEstado {
  if (!t.activa) return 'inactiva';
  if (t.vigenciaHasta < hoy) return 'vencida';
  if (t.vigenciaDesde > hoy) return 'futura';
  return 'vigente';
}

// Errores de validación como { campo: mensaje } para mostrarlos en el formulario.
export type TarifaErrores = Record<string, string>;

export function validarTarifa(raw: unknown): { ok: true; data: TarifaInput } | { ok: false; errores: TarifaErrores } {
  const parsed = tarifaInputSchema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  const errores: TarifaErrores = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join('.') || '_';
    errores[key] ??= issue.message;
  }
  return { ok: false, errores };
}
