import type { DatosConsulta } from './consulta';
import type { Moneda, Periodo } from './ramos';
import type { Tarifa } from './tarifa';

// Motor de cálculo del comparador (issue #46). Dominio puro y determinista: el
// mismo caso con las mismas tarifas devuelve siempre el mismo resultado.
//
// Reglas:
// - Una tarifa aplica si todas sus condiciones no vacías calzan con el caso.
// - Si una aseguradora no tiene tarifa que aplique, no aparece (no se inventa).
// - Por aseguradora se muestra su plan de menor prima.
// - Se ordena por prima anualizada (las mensuales × 12) y, a igual prima, por id.

// Tipo de cambio REFERENCIAL para comparar primas en distinta moneda y aplicar
// una prima mínima en la moneda del caso. TODO-TIPO-CAMBIO: confirmar con Melanie
// si prefiere otro valor o actualizarlo desde el panel.
export const TIPO_CAMBIO_REFERENCIAL = 3.75;

export interface ResultadoAseguradora {
  aseguradora: string;
  plan: string;
  prima: number;
  moneda: Moneda;
  periodo: Periodo;
  coberturas: string[];
  esEjemplo: boolean;
}

const redondear = (n: number) => Math.round(n * 100) / 100;

const enRango = (valor: number, min: number | null, max: number | null) => (min === null || valor >= min) && (max === null || valor <= max);

const convertir = (monto: number, de: Moneda, a: Moneda) => {
  if (de === a) return monto;
  return de === 'USD' ? monto * TIPO_CAMBIO_REFERENCIAL : monto / TIPO_CAMBIO_REFERENCIAL;
};

// Condiciones que no dependen de la edad de cada persona.
function calzaCaso(t: Tarifa, d: DatosConsulta): boolean {
  if (t.ramo !== d.ramo) return false;
  switch (d.ramo) {
    case 'soat':
      return t.uso === null || t.uso === d.uso;
    case 'vehicular':
      return (t.uso === null || t.uso === d.uso) && enRango(d.anio, t.anioMin, t.anioMax);
    case 'salud':
      return t.producto === null || t.producto === d.producto;
    case 'sctr-vida-ley':
      return (
        (t.producto === null || t.producto === d.producto) &&
        (t.actividad === null || t.actividad === d.actividad) &&
        enRango(d.trabajadores, t.trabajadoresMin, t.trabajadoresMax)
      );
  }
}

const cubreEdad = (t: Tarifa, edad: number) => enRango(edad, t.edadMin, t.edadMax);

// Prima de un plan (tarifas de una misma aseguradora y plan) o null si no cubre el caso.
function primaDelPlan(tarifas: Tarifa[], d: DatosConsulta): Omit<ResultadoAseguradora, 'aseguradora' | 'plan' | 'esEjemplo'> | null {
  // Salud: cada persona necesita una tarifa del plan que cubra su edad.
  if (d.ramo === 'salud') {
    const porPersona = d.edades.map((edad) =>
      tarifas.filter((t) => cubreEdad(t, edad)).sort((a, b) => a.valor - b.valor || a.id - b.id)[0],
    );
    if (porPersona.some((t) => !t)) return null;
    const elegidas = porPersona as Tarifa[];
    const base = elegidas[0];
    // Todas en la misma moneda y periodo que la primera (las demás se convierten).
    let prima = 0;
    const fijasContadas = new Set<number>();
    for (const t of elegidas) {
      const monto = t.formula === 'fija' ? (fijasContadas.has(t.id) ? 0 : t.valor) : t.valor;
      fijasContadas.add(t.id);
      const mensual = t.periodo === base.periodo ? monto : t.periodo === 'anual' ? monto / 12 : monto * 12;
      prima += convertir(mensual, t.moneda, base.moneda);
    }
    const minima = Math.max(...elegidas.map((t) => convertir(t.primaMinima ?? 0, t.moneda, base.moneda)));
    return { prima: redondear(Math.max(prima, minima)), moneda: base.moneda, periodo: base.periodo, coberturas: base.coberturas };
  }

  const candidatos = tarifas.map((t) => {
    let prima: number;
    let moneda: Moneda = t.moneda;
    switch (t.formula) {
      case 'fija':
        prima = t.valor;
        break;
      case 'por-unidad':
        prima = t.valor * (d.ramo === 'sctr-vida-ley' ? d.trabajadores : 1);
        break;
      case 'porcentaje': {
        // La tasa se aplica sobre la base en su propia moneda.
        const base = d.ramo === 'vehicular' ? { monto: d.valor, moneda: d.moneda } : d.ramo === 'sctr-vida-ley' ? { monto: d.planilla, moneda: 'PEN' as Moneda } : null;
        if (!base) return null;
        prima = (t.valor / 100) * base.monto;
        moneda = base.moneda;
        break;
      }
    }
    const minima = convertir(t.primaMinima ?? 0, t.moneda, moneda);
    return { tarifa: t, prima: redondear(Math.max(prima, minima)), moneda, periodo: t.periodo, coberturas: t.coberturas };
  });
  const mejor = candidatos
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => anual(a) - anual(b) || a.tarifa.id - b.tarifa.id)[0];
  return mejor ? { prima: mejor.prima, moneda: mejor.moneda, periodo: mejor.periodo, coberturas: mejor.coberturas } : null;
}

// Prima anual en soles: solo para ordenar.
function anual(r: { prima: number; moneda: Moneda; periodo: Periodo }): number {
  return convertir(r.prima, r.moneda, 'PEN') * (r.periodo === 'mensual' ? 12 : 1);
}

// Calcula la prima referencial por aseguradora con las tarifas vigentes del ramo.
export function compararTarifas(tarifas: Tarifa[], d: DatosConsulta, maxCoberturas = 3): ResultadoAseguradora[] {
  const planes = new Map<string, Tarifa[]>();
  for (const t of tarifas) {
    if (!calzaCaso(t, d)) continue;
    // Fuera de salud la edad no aplica; en salud se evalúa persona por persona.
    if (d.ramo !== 'salud' && (t.edadMin !== null || t.edadMax !== null)) continue;
    const clave = `${t.aseguradora}\u0000${t.plan}`;
    planes.set(clave, [...(planes.get(clave) ?? []), t]);
  }

  const porAseguradora = new Map<string, ResultadoAseguradora>();
  for (const [clave, grupo] of planes) {
    const [aseguradora, plan] = clave.split('\u0000');
    const prima = primaDelPlan(grupo, d);
    if (!prima) continue;
    const resultado: ResultadoAseguradora = {
      aseguradora,
      plan,
      ...prima,
      coberturas: prima.coberturas.slice(0, maxCoberturas),
      esEjemplo: grupo.some((t) => t.esEjemplo),
    };
    const actual = porAseguradora.get(aseguradora);
    if (!actual || anual(resultado) < anual(actual) || (anual(resultado) === anual(actual) && resultado.plan < actual.plan)) {
      porAseguradora.set(aseguradora, resultado);
    }
  }

  return [...porAseguradora.values()].sort((a, b) => anual(a) - anual(b) || a.aseguradora.localeCompare(b.aseguradora));
}
