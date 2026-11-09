import { esRucValido } from '../portal/cuenta';
import { SOLICITUD_LIMITES } from './solicitud';

// Solicitud pública de constancia SCTR: dominio puro, con pruebas en
// tests/constancia.test.ts. Registra el pedido para que Melanie lo gestione con
// la aseguradora; la constancia la emite la aseguradora, no esta página.
// A propósito no pide nombres ni DNI de trabajadores: esa lista va después, cuando
// Melanie la solicite por WhatsApp.

export const CONSTANCIA_CONSENTIMIENTO =
  'Acepto que mis datos y los de mi empresa se usen únicamente para gestionar esta solicitud de constancia SCTR.';

export const POLIZA_OPCIONES = {
  si: 'Sí, ya tengo mi SCTR contigo',
  no: 'Todavía no tengo SCTR contigo',
  nose: 'No estoy seguro',
} as const;
export type PolizaOpcion = keyof typeof POLIZA_OPCIONES;

export const CONSTANCIA_MAX_TRABAJADORES = 9999;

export interface ConstanciaValores {
  razonSocial: string;
  ruc: string;
  contacto: string;
  telefono: string;
  correo: string;
  poliza: string;
  trabajadores: string;
  lugar: string;
  fechaIngreso: string;
}
export type ConstanciaErrores = Partial<Record<keyof ConstanciaValores, string>>;

// Fecha de hoy en Perú (AAAA-MM-DD), sin depender de la zona horaria del servidor.
export function hoyEnLima(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(ahora);
}

function esFechaReal(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

export function validarConstancia(v: ConstanciaValores, hoy: string): ConstanciaErrores {
  const errores: ConstanciaErrores = {};
  const maxNombre = SOLICITUD_LIMITES.nombre;

  if (!v.razonSocial) errores.razonSocial = 'Escribe la razón social de tu empresa.';
  else if (v.razonSocial.length > maxNombre) errores.razonSocial = `Máximo ${maxNombre} caracteres.`;
  if (!esRucValido(v.ruc)) errores.ruc = 'Escribe el RUC de 11 dígitos de tu empresa.';
  if (!v.contacto) errores.contacto = 'Escribe el nombre de la persona de contacto.';
  else if (v.contacto.length > maxNombre) errores.contacto = `Máximo ${maxNombre} caracteres.`;
  if (!/^\+?[\d\s-]{9,15}$/.test(v.telefono)) errores.telefono = 'Escribe un celular válido para responderte.';
  if (v.correo && (v.correo.length > SOLICITUD_LIMITES.correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo))) {
    errores.correo = 'Revisa el correo.';
  }
  if (!(v.poliza in POLIZA_OPCIONES)) errores.poliza = 'Elige una opción.';
  const cantidad = Number(v.trabajadores);
  if (!/^\d+$/.test(v.trabajadores) || cantidad < 1 || cantidad > CONSTANCIA_MAX_TRABAJADORES) {
    errores.trabajadores = 'Escribe cuántos trabajadores necesitan la constancia.';
  }
  if (!v.lugar) errores.lugar = 'Escribe la obra, mina o empresa donde ingresarán.';
  else if (v.lugar.length > SOLICITUD_LIMITES.valor) errores.lugar = `Máximo ${SOLICITUD_LIMITES.valor} caracteres.`;
  if (!esFechaReal(v.fechaIngreso)) errores.fechaIngreso = 'Elige la fecha de ingreso.';
  else if (v.fechaIngreso < hoy) errores.fechaIngreso = 'La fecha de ingreso no puede ser pasada.';

  return errores;
}

// Filas que ve Melanie en el correo y en la bandeja de solicitudes.
export function datosConstancia(v: ConstanciaValores): { label: string; value: string }[] {
  const [anio, mes, dia] = v.fechaIngreso.split('-');
  return [
    { label: 'Empresa', value: v.razonSocial },
    { label: 'RUC', value: v.ruc },
    { label: 'Póliza SCTR', value: POLIZA_OPCIONES[v.poliza as PolizaOpcion] ?? '' },
    { label: 'Trabajadores', value: v.trabajadores },
    { label: 'Lugar de ingreso', value: v.lugar },
    { label: 'Fecha de ingreso', value: `${dia}/${mes}/${anio}` },
  ];
}
