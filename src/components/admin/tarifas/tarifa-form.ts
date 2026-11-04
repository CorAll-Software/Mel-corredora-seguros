import { RAMOS, type RamoId } from '../../../core/comparador/ramos';
import { hoyEnLima, type Tarifa } from '../../../core/comparador/tarifa';

// Adaptador del formulario HTML de tarifas (capa de presentación): convierte el
// FormData en el objeto que validan los casos de uso y prepara los valores para
// volver a pintar el formulario. No contiene reglas de negocio.

// Valores del formulario como texto, tal como se escriben en los campos.
export type TarifaFormValues = Record<string, string> & { activa: string; esEjemplo: string };

const NUMERICOS = ['anioMin', 'anioMax', 'edadMin', 'edadMax', 'trabajadoresMin', 'trabajadoresMax', 'valor', 'primaMinima'] as const;
const TEXTOS = ['aseguradora', 'plan', 'uso', 'producto', 'actividad', 'formula', 'moneda', 'periodo', 'vigenciaDesde', 'vigenciaHasta', 'nota'] as const;

function toNumber(value: string): number | string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const number = Number(trimmed.replace(',', '.'));
  return Number.isFinite(number) ? number : trimmed;
}

export function valuesFromForm(form: FormData): TarifaFormValues {
  const values: Record<string, string> = {};
  for (const name of [...NUMERICOS, ...TEXTOS, 'coberturas']) {
    values[name] = String(form.get(name) ?? '');
  }
  values.activa = form.get('activa') === 'on' ? 'on' : '';
  values.esEjemplo = form.get('esEjemplo') === 'on' ? 'on' : '';
  return values as TarifaFormValues;
}

// Objeto para tarifasService.crear/actualizar. Las variables que el ramo no usa
// se envían vacías.
export function inputFromValues(ramo: RamoId, values: TarifaFormValues): Record<string, unknown> {
  const condiciones = RAMOS[ramo].condiciones as readonly string[];
  const text = (name: string) => (values[name]?.trim() ? values[name].trim() : null);
  const input: Record<string, unknown> = { ramo };
  for (const name of TEXTOS) {
    input[name] = text(name);
  }
  for (const name of NUMERICOS) {
    input[name] = toNumber(values[name] ?? '');
  }
  for (const name of ['uso', 'anioMin', 'anioMax', 'producto', 'edadMin', 'edadMax', 'actividad', 'trabajadoresMin', 'trabajadoresMax']) {
    if (!condiciones.includes(name)) input[name] = null;
  }
  input.coberturas = (values.coberturas ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  input.activa = values.activa === 'on';
  input.esEjemplo = values.esEjemplo === 'on';
  return input;
}

export function valuesFromTarifa(t: Tarifa): TarifaFormValues {
  const str = (value: string | number | null) => (value === null ? '' : String(value));
  return {
    aseguradora: t.aseguradora,
    plan: t.plan,
    uso: str(t.uso),
    anioMin: str(t.anioMin),
    anioMax: str(t.anioMax),
    producto: str(t.producto),
    edadMin: str(t.edadMin),
    edadMax: str(t.edadMax),
    actividad: str(t.actividad),
    trabajadoresMin: str(t.trabajadoresMin),
    trabajadoresMax: str(t.trabajadoresMax),
    formula: t.formula,
    valor: str(t.valor),
    primaMinima: str(t.primaMinima),
    moneda: t.moneda,
    periodo: t.periodo,
    coberturas: t.coberturas.join('\n'),
    vigenciaDesde: t.vigenciaDesde,
    vigenciaHasta: t.vigenciaHasta,
    nota: str(t.nota),
    activa: t.activa ? 'on' : '',
    esEjemplo: t.esEjemplo ? 'on' : '',
  };
}

// Valores iniciales de una tarifa nueva: vigente desde hoy por un año.
export function defaultValues(ramo: RamoId): TarifaFormValues {
  const hoy = hoyEnLima();
  const [y, m, d] = hoy.split('-');
  return {
    aseguradora: '',
    plan: '',
    uso: '',
    anioMin: '',
    anioMax: '',
    producto: '',
    edadMin: '',
    edadMax: '',
    actividad: '',
    trabajadoresMin: '',
    trabajadoresMax: '',
    formula: RAMOS[ramo].formulas[0],
    valor: '',
    primaMinima: '',
    moneda: 'PEN',
    periodo: ramo === 'salud' ? 'mensual' : 'anual',
    coberturas: '',
    vigenciaDesde: hoy,
    vigenciaHasta: `${Number(y) + 1}-${m}-${d}`,
    nota: '',
    activa: 'on',
    esEjemplo: '',
  };
}
