// Dominio de los documentos del Portal de Clientes (issue #49): reglas puras de
// tipos, vigencia y validación del PDF. Sin base de datos ni archivos.

export const TIPOS_DOCUMENTO = ['constancia-sctr', 'poliza', 'endoso'] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const TIPO_LABELS: Record<TipoDocumento, string> = {
  'constancia-sctr': 'Constancia SCTR',
  poliza: 'Póliza',
  endoso: 'Endoso',
};

export interface Documento {
  id: number;
  clienteId: number;
  tipo: TipoDocumento;
  nombre: string;
  // Fechas como YYYY-MM-DD (día calendario de Lima, sin hora).
  vigenciaDesde: string | null;
  vigenciaHasta: string;
  archivoKey: string;
  tamano: number;
  createdAt: Date;
}

export interface DocumentoInput {
  tipo: TipoDocumento;
  nombre: string;
  vigenciaDesde: string | null;
  vigenciaHasta: string;
}

export type DocumentoCampo = keyof DocumentoInput | 'archivo';
export type DocumentoErrorCode = 'required' | 'invalid' | 'too_long' | 'range' | 'not_pdf' | 'too_big';
export type DocumentoErrores = Partial<Record<DocumentoCampo, DocumentoErrorCode>>;

export const DOCUMENTO_LIMITES = {
  nombre: 120,
  // 10 MB: suficiente para una póliza escaneada.
  bytes: 10 * 1024 * 1024,
} as const;

export type EstadoDocumento = 'vigente' | 'futuro' | 'vencido';

export const ESTADO_DOCUMENTO_LABELS: Record<EstadoDocumento, string> = {
  vigente: 'Vigente',
  futuro: 'Aún no vigente',
  vencido: 'Vencido',
};

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function esFecha(value: string): boolean {
  if (!FECHA.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// Día de hoy en Lima (UTC-5, sin horario de verano) como YYYY-MM-DD.
export function hoyLima(ahora = new Date()): string {
  return new Date(ahora.getTime() - 5 * 3600_000).toISOString().slice(0, 10);
}

// Un documento vence al terminar el día de su vigencia "hasta".
export function estadoDocumento(doc: Pick<Documento, 'vigenciaDesde' | 'vigenciaHasta'>, hoy: string): EstadoDocumento {
  if (doc.vigenciaHasta < hoy) return 'vencido';
  if (doc.vigenciaDesde && doc.vigenciaDesde > hoy) return 'futuro';
  return 'vigente';
}

// Todo PDF empieza con "%PDF-": así se rechaza un archivo renombrado.
export function esPdf(bytes: Uint8Array): boolean {
  return bytes.length > 4 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
}

export function validarDocumento(
  raw: Record<string, unknown>,
  archivo: { bytes: Uint8Array } | null,
): { ok: true; documento: DocumentoInput } | { ok: false; errores: DocumentoErrores } {
  const texto = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');
  const tipo = texto(raw.tipo);
  const nombre = texto(raw.nombre);
  const vigenciaDesde = texto(raw.vigenciaDesde);
  const vigenciaHasta = texto(raw.vigenciaHasta);
  const errores: DocumentoErrores = {};

  if (!(TIPOS_DOCUMENTO as readonly string[]).includes(tipo)) errores.tipo = 'invalid';
  if (!nombre) errores.nombre = 'required';
  else if (nombre.length > DOCUMENTO_LIMITES.nombre) errores.nombre = 'too_long';

  if (vigenciaDesde && !esFecha(vigenciaDesde)) errores.vigenciaDesde = 'invalid';
  if (!vigenciaHasta) errores.vigenciaHasta = 'required';
  else if (!esFecha(vigenciaHasta)) errores.vigenciaHasta = 'invalid';
  else if (vigenciaDesde && esFecha(vigenciaDesde) && vigenciaHasta < vigenciaDesde) errores.vigenciaHasta = 'range';

  if (!archivo || archivo.bytes.length === 0) errores.archivo = 'required';
  else if (archivo.bytes.length > DOCUMENTO_LIMITES.bytes) errores.archivo = 'too_big';
  else if (!esPdf(archivo.bytes)) errores.archivo = 'not_pdf';

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }
  return {
    ok: true,
    documento: { tipo: tipo as TipoDocumento, nombre, vigenciaDesde: vigenciaDesde || null, vigenciaHasta },
  };
}

// Nombre de archivo para la descarga: "Constancia SCTR - Marzo 2026.pdf".
export function nombreDescarga(doc: Pick<Documento, 'tipo' | 'nombre'>): string {
  const base = `${TIPO_LABELS[doc.tipo]} - ${doc.nombre}`.replace(/[\\/:*?"<>|]+/g, ' ').trim();
  return `${base}.pdf`;
}
