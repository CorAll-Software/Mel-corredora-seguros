import { z } from 'zod';

// Solicitud de cotización o contacto (issue #47). Cada formulario de la página
// (comparador, cotizador, ficha de un seguro, "¿Dudas? Escríbeme" y agenda)
// guarda una antes de abrir WhatsApp, para que Melanie no pierda el contacto
// aunque la persona no envíe el mensaje. Es dominio puro: sin base de datos ni
// framework, con pruebas en tests/solicitudes.test.ts.

// 'portal': movimientos de planilla que pide una empresa desde su portal (#48).
// 'acceso': una empresa pide su cuenta del portal desde /solicitar-acceso.
export const ORIGENES = ['comparador', 'cotizador', 'ficha', 'dudas', 'agenda', 'portal', 'acceso'] as const;
export type Origen = (typeof ORIGENES)[number];

export const ORIGEN_LABELS: Record<Origen, string> = {
  comparador: 'Comparador',
  cotizador: 'Cotizador SCTR / Vida Ley',
  ficha: 'Ficha de un seguro',
  dudas: '¿Dudas? Escríbeme',
  agenda: 'Agenda',
  portal: 'Portal de clientes',
  acceso: 'Pedido de acceso al portal',
};

// Flujo de la bandeja: Nueva → Contactada → Cotizada → Emitida / Descartada.
// Melanie puede mover una solicitud a cualquier estado (p. ej. descartar una
// nueva o reabrir una descartada); cada cambio queda en el historial.
export const ESTADOS = ['nueva', 'contactada', 'cotizada', 'emitida', 'descartada'] as const;
export type EstadoSolicitud = (typeof ESTADOS)[number];

export const ESTADO_LABELS: Record<EstadoSolicitud, string> = {
  nueva: 'Nueva',
  contactada: 'Contactada',
  cotizada: 'Cotizada',
  emitida: 'Emitida',
  descartada: 'Descartada',
};

export function isEstado(value: unknown): value is EstadoSolicitud {
  return typeof value === 'string' && (ESTADOS as readonly string[]).includes(value);
}

export const SOLICITUD_LIMITES = {
  nombre: 120,
  telefono: 30,
  correo: 160,
  ramo: 80,
  etiqueta: 60,
  valor: 500,
  datos: 30,
  aseguradora: 120,
  prima: 60,
  notas: 2000,
} as const;

export interface Dato {
  label: string;
  value: string;
}

export interface Solicitud {
  id: number;
  origen: Origen;
  ramo: string | null;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  // Lo que la persona respondió en el formulario, en el orden en que lo vio.
  datos: Dato[];
  // Solo del comparador: la aseguradora y la prima referencial que eligió.
  aseguradora: string | null;
  prima: string | null;
  estado: EstadoSolicitud;
  notas: string | null;
  idioma: string;
  createdAt: Date;
  estadoActualizadoEn: Date | null;
}

export interface CambioEstado {
  solicitudId: number;
  de: EstadoSolicitud;
  a: EstadoSolicitud;
  adminNombre: string | null;
  fecha: Date;
}

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'too_long')
    .nullish()
    .transform((value) => (value ? value : null));

export const solicitudInputSchema = z
  .object({
    origen: z.enum(ORIGENES, { error: 'invalid' }),
    ramo: opcional(SOLICITUD_LIMITES.ramo),
    nombre: z.string().trim().min(1, 'required').max(SOLICITUD_LIMITES.nombre, 'too_long'),
    telefono: opcional(SOLICITUD_LIMITES.telefono),
    correo: opcional(SOLICITUD_LIMITES.correo).refine(
      (value) => value === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      'email',
    ),
    datos: z
      .array(
        z.object({
          label: z.string().trim().min(1, 'required').max(SOLICITUD_LIMITES.etiqueta, 'too_long'),
          value: z.string().trim().max(SOLICITUD_LIMITES.valor, 'too_long'),
        }),
      )
      .max(SOLICITUD_LIMITES.datos, 'too_many')
      .default([])
      // Las filas vacías no aportan nada en la bandeja.
      .transform((datos) => datos.filter((dato) => dato.value !== '')),
    aseguradora: opcional(SOLICITUD_LIMITES.aseguradora),
    prima: opcional(SOLICITUD_LIMITES.prima),
  })
  // Sin celular ni correo Melanie no tendría cómo responder.
  .refine((s) => s.telefono !== null || s.correo !== null, {
    message: 'contact_required',
    path: ['telefono'],
  });

export type SolicitudInput = z.infer<typeof solicitudInputSchema>;
export type SolicitudErrores = Record<string, string>;

export function validarSolicitud(
  raw: unknown,
): { ok: true; data: SolicitudInput } | { ok: false; errores: SolicitudErrores } {
  const parsed = solicitudInputSchema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  const errores: SolicitudErrores = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join('.') || '_';
    errores[key] ??= issue.message;
  }
  return { ok: false, errores };
}

// Resumen en texto para el correo a Melanie y la exportación.
export function resumenSolicitud(s: Pick<Solicitud, 'datos' | 'aseguradora' | 'prima'>): string {
  return [
    ...(s.aseguradora ? [`Aseguradora elegida: ${s.aseguradora}`] : []),
    ...(s.prima ? [`Prima referencial: ${s.prima}`] : []),
    ...s.datos.map((dato) => `${dato.label}: ${dato.value}`),
  ].join('\n');
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Búsqueda de la bandeja: sin distinguir mayúsculas ni tildes, en nombre,
// contacto, ramo, aseguradora, respuestas y notas.
export function coincideBusqueda(s: Solicitud, consulta: string): boolean {
  const q = normalizar(consulta.trim());
  if (!q) return true;
  const campos = [
    s.nombre,
    s.correo,
    s.ramo,
    s.aseguradora,
    s.notas,
    ORIGEN_LABELS[s.origen],
    ...s.datos.map((d) => d.value),
  ];
  if (campos.some((campo) => campo && normalizar(campo).includes(q))) return true;
  // Un número con o sin espacios ("988 983 710") encuentra el celular guardado.
  const numero = q.replace(/[\s()+-]/g, '');
  return /^\d{3,}$/.test(numero) && (s.telefono ?? '').replace(/\D/g, '').includes(numero);
}

// Número para wa.me: los celulares peruanos (9 dígitos que empiezan en 9)
// reciben el código 51; los que ya traen código se respetan. null si no sirve.
export function numeroWhatsapp(telefono: string | null): string | null {
  const digitos = (telefono ?? '').replace(/\D/g, '');
  if (/^9\d{8}$/.test(digitos)) return `51${digitos}`;
  if (digitos.length >= 10 && digitos.length <= 15) return digitos;
  return null;
}

// ── CSV ────────────────────────────────────────────────────────────────────────
// UTF-8 con BOM (Excel respeta las tildes). Las celdas que empiezan con = + - @
// se prefijan con ' para que Excel no las ejecute como fórmula.

const COLUMNAS: Array<{ header: string; get: (s: Solicitud) => string | number | null }> = [
  { header: 'id', get: (s) => s.id },
  { header: 'fecha', get: (s) => fechaHoraLima(s.createdAt) },
  { header: 'origen', get: (s) => ORIGEN_LABELS[s.origen] },
  { header: 'estado', get: (s) => ESTADO_LABELS[s.estado] },
  { header: 'ramo', get: (s) => s.ramo },
  { header: 'nombre', get: (s) => s.nombre },
  { header: 'celular', get: (s) => s.telefono },
  { header: 'correo', get: (s) => s.correo },
  { header: 'aseguradora', get: (s) => s.aseguradora },
  { header: 'prima_referencial', get: (s) => s.prima },
  { header: 'datos', get: (s) => s.datos.map((d) => `${d.label}: ${d.value}`).join(' | ') },
  { header: 'notas', get: (s) => s.notas },
  {
    header: 'estado_actualizado',
    get: (s) => (s.estadoActualizadoEn ? fechaHoraLima(s.estadoActualizadoEn) : null),
  },
];

function celda(value: string | number | null): string {
  if (value === null) return '';
  let texto = String(value);
  if (typeof value === 'string' && /^[=+\-@]/.test(texto)) texto = `'${texto}`;
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function solicitudesToCsv(lista: Solicitud[]): string {
  const filas = [
    COLUMNAS.map((c) => c.header).join(','),
    ...lista.map((s) => COLUMNAS.map((c) => celda(c.get(s))).join(',')),
  ];
  return `﻿${filas.join('\r\n')}\r\n`;
}

// AAAA-MM-DD HH:mm en hora de Lima.
export function fechaHoraLima(fecha: Date): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(fecha)
      .map((p) => [p.type, p.value]),
  );
  return `${partes.year}-${partes.month}-${partes.day} ${partes.hour}:${partes.minute}`;
}
