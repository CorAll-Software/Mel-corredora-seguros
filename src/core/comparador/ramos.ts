// Catálogo de ramos del comparador (issue #44, reunión 01). Es dominio puro: lo
// usan el panel de tarifas (servidor) y, más adelante, el comparador (#45/#46).
// Solo figuran las aseguradoras que Melanie nombró para cada ramo.

export const RAMO_IDS = ['soat', 'vehicular', 'salud', 'sctr-vida-ley'] as const;
export type RamoId = (typeof RAMO_IDS)[number];

// Variables que puede exigir una tarifa. null en una tarifa = aplica a todos.
export type CondicionCampo = 'uso' | 'anioMin' | 'anioMax' | 'producto' | 'edadMin' | 'edadMax' | 'actividad' | 'trabajadoresMin' | 'trabajadoresMax';

// Cómo se calcula la prima referencial:
// - fija: un monto por póliza.
// - por-unidad: monto × unidades (personas aseguradas o trabajadores).
// - porcentaje: tasa (%) × base (valor del vehículo o planilla mensual).
export const FORMULAS = ['fija', 'por-unidad', 'porcentaje'] as const;
export type FormulaTipo = (typeof FORMULAS)[number];

export const MONEDAS = ['PEN', 'USD'] as const;
export type Moneda = (typeof MONEDAS)[number];

export const PERIODOS = ['anual', 'mensual'] as const;
export type Periodo = (typeof PERIODOS)[number];

export interface Opcion {
  id: string;
  label: string;
}

export interface RamoDef {
  id: RamoId;
  label: string;
  aseguradoras: string[];
  condiciones: CondicionCampo[];
  formulas: FormulaTipo[];
  // Qué se multiplica en "por-unidad" y sobre qué se aplica el % en "porcentaje"
  // (frase lista para "3 % del valor del vehículo").
  unidad?: string;
  base?: string;
  usos?: Opcion[];
  productos?: Opcion[];
  actividades?: Opcion[];
  // Aseguradoras que solo cotizan algunos productos del ramo.
  restricciones?: Record<string, { productos: string[] }>;
}

export const RAMOS: Record<RamoId, RamoDef> = {
  soat: {
    id: 'soat',
    label: 'SOAT',
    aseguradoras: ['mapfre', 'positiva'],
    condiciones: ['uso'],
    formulas: ['fija'],
    usos: [
      { id: 'particular', label: 'Particular' },
      { id: 'taxi', label: 'Taxi' },
      { id: 'carga', label: 'Carga' },
      { id: 'moto', label: 'Moto' },
    ],
  },
  vehicular: {
    id: 'vehicular',
    label: 'Vehicular',
    aseguradoras: ['pacifico', 'mapfre', 'rimac', 'positiva', 'qualitas'],
    condiciones: ['uso', 'anioMin', 'anioMax'],
    formulas: ['porcentaje', 'fija'],
    base: 'del valor del vehículo',
    usos: [
      { id: 'particular', label: 'Particular' },
      { id: 'comercial', label: 'Comercial' },
    ],
  },
  salud: {
    id: 'salud',
    label: 'Salud / EPS',
    aseguradoras: ['rimac', 'pacifico', 'mapfre', 'sanitas', 'positiva'],
    condiciones: ['producto', 'edadMin', 'edadMax'],
    formulas: ['por-unidad', 'fija'],
    unidad: 'persona',
    productos: [
      { id: 'salud', label: 'Seguro de salud' },
      { id: 'eps', label: 'EPS' },
    ],
    // Reunión 01: La Positiva solo en EPS.
    restricciones: { positiva: { productos: ['eps'] } },
  },
  'sctr-vida-ley': {
    id: 'sctr-vida-ley',
    label: 'SCTR y Vida Ley',
    aseguradoras: ['rimac', 'pacifico', 'mapfre', 'positiva', 'crecer', 'protecta'],
    condiciones: ['producto', 'actividad', 'trabajadoresMin', 'trabajadoresMax'],
    formulas: ['porcentaje', 'por-unidad'],
    unidad: 'trabajador',
    base: 'de la planilla mensual',
    productos: [
      { id: 'sctr', label: 'SCTR' },
      { id: 'vida-ley', label: 'Vida Ley' },
    ],
    actividades: [
      { id: 'bajo', label: 'Riesgo bajo' },
      { id: 'medio', label: 'Riesgo medio' },
      { id: 'alto', label: 'Riesgo alto' },
    ],
    // Reunión 01: Protecta solo en SCTR.
    restricciones: { protecta: { productos: ['sctr'] } },
  },
};

export function isRamoId(value: unknown): value is RamoId {
  return typeof value === 'string' && (RAMO_IDS as readonly string[]).includes(value);
}

export function opcionLabel(opciones: Opcion[] | undefined, id: string | null): string | undefined {
  return id ? opciones?.find((opcion) => opcion.id === id)?.label : undefined;
}
