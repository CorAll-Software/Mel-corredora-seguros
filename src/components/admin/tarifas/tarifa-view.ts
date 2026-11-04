import { insurerById } from '../../../core/data/insurers.data';
import { opcionLabel, RAMOS } from '../../../core/comparador/ramos';
import type { Tarifa, TarifaEstado } from '../../../core/comparador/tarifa';

// Textos con los que el panel muestra una tarifa (capa de presentación).

export const FORMULA_LABELS = {
  fija: 'Monto fijo por póliza',
  'por-unidad': 'Monto por unidad',
  porcentaje: 'Porcentaje (tasa)',
} as const;

export const ESTADO_LABELS: Record<TarifaEstado, string> = {
  vigente: 'Vigente',
  futura: 'Aún no vigente',
  vencida: 'Vencida',
  inactiva: 'Desactivada',
};

export function aseguradoraNombre(id: string): string {
  return insurerById(id)?.name ?? id;
}

export function aseguradoraLogo(id: string): string | undefined {
  return insurerById(id)?.logo;
}

export function dinero(monto: number, moneda: string): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda, minimumFractionDigits: 2 }).format(monto);
}

const fecha = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeZone: 'UTC' });
export function fechaCorta(iso: string): string {
  return fecha.format(new Date(`${iso}T00:00:00Z`));
}

function rango(min: number | null, max: number | null, sufijo: string): string | undefined {
  if (min === null && max === null) return undefined;
  if (min !== null && max !== null) return `${min}–${max} ${sufijo}`;
  return min !== null ? `desde ${min} ${sufijo}` : `hasta ${max} ${sufijo}`;
}

// Resumen de a qué casos aplica la tarifa.
export function resumenCondiciones(t: Tarifa): string {
  const ramo = RAMOS[t.ramo];
  const partes = [
    opcionLabel(ramo.productos, t.producto),
    opcionLabel(ramo.usos, t.uso) && `Uso ${opcionLabel(ramo.usos, t.uso)?.toLowerCase()}`,
    rango(t.anioMin, t.anioMax, '(año del vehículo)'),
    rango(t.edadMin, t.edadMax, 'años de edad'),
    opcionLabel(ramo.actividades, t.actividad),
    rango(t.trabajadoresMin, t.trabajadoresMax, 'trabajadores'),
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : 'Aplica a todos los casos';
}

// Resumen de cómo se calcula la prima referencial.
export function resumenPrima(t: Tarifa): string {
  const ramo = RAMOS[t.ramo];
  const periodo = t.periodo === 'mensual' ? 'mensual' : 'anual';
  let base: string;
  if (t.formula === 'porcentaje') {
    base = `${t.valor.toLocaleString('es-PE', { maximumFractionDigits: 4 })} % ${ramo.base ?? ''}`.trim();
  } else if (t.formula === 'por-unidad') {
    base = `${dinero(t.valor, t.moneda)} por ${ramo.unidad ?? 'unidad'}`;
  } else {
    base = dinero(t.valor, t.moneda);
  }
  const minimo = t.primaMinima !== null ? ` · mínimo ${dinero(t.primaMinima, t.moneda)}` : '';
  return `${base}${minimo} · ${periodo}`;
}
