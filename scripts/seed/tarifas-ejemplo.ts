import type { RamoId } from '../../src/core/comparador/ramos';
import type { TarifaInput } from '../../src/core/comparador/tarifa';

// Tarifas de EJEMPLO para la demo del comparador (issue #44). No son precios
// reales de ninguna aseguradora: van marcadas con esEjemplo = true y una nota,
// y Melanie las reemplaza por sus valores desde /admin/tarifas.

const NOTA = 'Valor de ejemplo para la demo: reemplazar por la tarifa real.';

type Base = Omit<TarifaInput, 'vigenciaDesde' | 'vigenciaHasta'>;

const vacio = {
  uso: null,
  anioMin: null,
  anioMax: null,
  producto: null,
  edadMin: null,
  edadMax: null,
  actividad: null,
  trabajadoresMin: null,
  trabajadoresMax: null,
  primaMinima: null,
  activa: true,
  esEjemplo: true,
  nota: NOTA,
} as const;

function tarifa(ramo: RamoId, aseguradora: string, datos: Partial<Base> & Pick<Base, 'formula' | 'valor' | 'moneda' | 'periodo' | 'coberturas'>): Base {
  return { ...vacio, ramo, aseguradora, plan: 'Plan referencial (ejemplo)', ...datos };
}

const SOAT = ['Muerte e invalidez permanente', 'Gastos médicos por accidente', 'Gastos de sepelio'];
const VEHICULAR = ['Daño propio', 'Robo total', 'Responsabilidad civil frente a terceros'];
const SALUD = ['Atención ambulatoria en red de clínicas', 'Hospitalización', 'Emergencias accidentales'];
const EPS = ['Plan de salud para trabajadores en planilla', 'Atención en red de clínicas afiliadas'];
const SCTR = ['Cobertura de salud por accidente de trabajo', 'Pensión por invalidez', 'Constancia para ingreso a obra'];
const VIDA_LEY = ['Fallecimiento natural o accidental', 'Invalidez total y permanente por accidente'];

export const TARIFAS_EJEMPLO: Base[] = [
  // SOAT (Mapfre, La Positiva): monto fijo anual por uso.
  ...(
    [
      ['mapfre', { particular: 95, taxi: 280, moto: 160 }],
      ['positiva', { particular: 89, taxi: 265, moto: 150 }],
    ] as const
  ).flatMap(([aseguradora, precios]) =>
    Object.entries(precios).map(([uso, valor]) => tarifa('soat', aseguradora, { uso, formula: 'fija', valor, moneda: 'PEN', periodo: 'anual', coberturas: SOAT })),
  ),

  // Vehicular (Pacífico, Mapfre, Rímac, La Positiva, Quálitas): tasa sobre el valor del vehículo.
  ...(
    [
      ['pacifico', 3.4, 380],
      ['mapfre', 3.1, 350],
      ['rimac', 3.6, 400],
      ['positiva', 2.9, 330],
      ['qualitas', 2.7, 300],
    ] as const
  ).map(([aseguradora, valor, primaMinima]) =>
    tarifa('vehicular', aseguradora, { uso: 'particular', anioMin: 2012, formula: 'porcentaje', valor, primaMinima, moneda: 'USD', periodo: 'anual', coberturas: VEHICULAR }),
  ),

  // Salud (Rímac, Pacífico, Mapfre, Sanitas): monto mensual por persona según edad.
  ...(
    [
      ['rimac', 210, 380],
      ['pacifico', 225, 400],
      ['mapfre', 195, 350],
      ['sanitas', 240, 420],
    ] as const
  ).flatMap(([aseguradora, joven, adulto]) => [
    tarifa('salud', aseguradora, { producto: 'salud', edadMin: 18, edadMax: 40, formula: 'por-unidad', valor: joven, moneda: 'PEN', periodo: 'mensual', coberturas: SALUD }),
    tarifa('salud', aseguradora, { producto: 'salud', edadMin: 41, edadMax: 65, formula: 'por-unidad', valor: adulto, moneda: 'PEN', periodo: 'mensual', coberturas: SALUD }),
  ]),
  // EPS (+ La Positiva): monto mensual por trabajador afiliado.
  ...(
    [
      ['rimac', 130],
      ['pacifico', 140],
      ['mapfre', 125],
      ['sanitas', 145],
      ['positiva', 120],
    ] as const
  ).map(([aseguradora, valor]) => tarifa('salud', aseguradora, { producto: 'eps', formula: 'por-unidad', valor, moneda: 'PEN', periodo: 'mensual', coberturas: EPS })),

  // SCTR (+ Protecta) y Vida Ley: tasa sobre la planilla mensual.
  ...(
    [
      ['rimac', 1.5],
      ['pacifico', 1.6],
      ['mapfre', 1.4],
      ['positiva', 1.3],
      ['crecer', 1.25],
      ['protecta', 1.2],
    ] as const
  ).map(([aseguradora, valor]) =>
    tarifa('sctr-vida-ley', aseguradora, { producto: 'sctr', formula: 'porcentaje', valor, primaMinima: 50, moneda: 'PEN', periodo: 'mensual', coberturas: SCTR }),
  ),
  ...(
    [
      ['rimac', 0.55],
      ['pacifico', 0.6],
      ['mapfre', 0.5],
      ['positiva', 0.48],
      ['crecer', 0.45],
    ] as const
  ).map(([aseguradora, valor]) =>
    tarifa('sctr-vida-ley', aseguradora, { producto: 'vida-ley', formula: 'porcentaje', valor, primaMinima: 30, moneda: 'PEN', periodo: 'mensual', coberturas: VIDA_LEY }),
  ),
];
