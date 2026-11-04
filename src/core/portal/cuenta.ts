// Dominio de las cuentas del Portal de Clientes (issue #48). Reglas puras, sin
// base de datos: las usan el panel de Melanie, la API del portal y las pruebas.

export interface CuentaPortal {
  id: number;
  ruc: string;
  razonSocial: string;
  contacto: string;
  correo: string | null;
  debeCambiarClave: boolean;
  activo: boolean;
  ultimoIngreso: Date | null;
  createdAt: Date;
}

export interface CuentaInput {
  ruc: string;
  razonSocial: string;
  contacto: string;
  correo: string | null;
}

export type CuentaCampo = keyof CuentaInput;
export type CuentaErrorCode = 'required' | 'invalid' | 'too_long' | 'taken';
export type CuentaErrores = Partial<Record<CuentaCampo, CuentaErrorCode>>;

export type ClaveErrorCode = 'too_short' | 'too_long' | 'weak' | 'mismatch' | 'same_as_old';

export const PORTAL_LIMITES = {
  texto: 120,
  claveMin: 8,
  claveMax: 72,
  // Vigencia del enlace de "Olvidé mi clave".
  enlaceMinutos: 60,
} as const;

// RUC peruano: 11 dígitos; empresas (20), personas con negocio (10) y
// entidades especiales (15, 17).
export function esRucValido(ruc: string): boolean {
  return /^(10|15|17|20)\d{9}$/.test(ruc);
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

// Normaliza y valida los datos de una cuenta nueva.
export function validarCuenta(raw: Record<string, unknown>): { ok: true; cuenta: CuentaInput } | { ok: false; errores: CuentaErrores } {
  const ruc = texto(raw.ruc).replace(/\D/g, '');
  const razonSocial = texto(raw.razonSocial);
  const contacto = texto(raw.contacto);
  const correo = texto(raw.correo).toLowerCase();
  const errores: CuentaErrores = {};

  if (!ruc) errores.ruc = 'required';
  else if (!esRucValido(ruc)) errores.ruc = 'invalid';

  for (const [campo, valor] of [['razonSocial', razonSocial], ['contacto', contacto]] as const) {
    if (!valor) errores[campo] = 'required';
    else if (valor.length > PORTAL_LIMITES.texto) errores[campo] = 'too_long';
  }

  // El correo es opcional, pero sin él no funciona "Olvidé mi clave".
  if (correo.length > PORTAL_LIMITES.texto) errores.correo = 'too_long';
  else if (correo && !CORREO.test(correo)) errores.correo = 'invalid';

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }
  return { ok: true, cuenta: { ruc, razonSocial, contacto, correo: correo || null } };
}

// Clave nueva elegida por el cliente: mínimo 8 caracteres con letras y números.
export function validarClaveNueva(nueva: string, confirmacion: string, anterior?: string): ClaveErrorCode | null {
  if (nueva.length < PORTAL_LIMITES.claveMin) return 'too_short';
  if (nueva.length > PORTAL_LIMITES.claveMax) return 'too_long';
  if (!/[a-zA-ZñÑ]/.test(nueva) || !/\d/.test(nueva)) return 'weak';
  if (nueva !== confirmacion) return 'mismatch';
  if (anterior !== undefined && nueva === anterior) return 'same_as_old';
  return null;
}

// Clave temporal legible para dictar o enviar por WhatsApp: sin caracteres que
// se confundan (0/O, 1/l/I). `aleatorio` devuelve enteros en [0, max).
const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generarClaveTemporal(aleatorio: (max: number) => number, largo = 10): string {
  let clave = '';
  while (!(/[a-zA-Z]/.test(clave) && /\d/.test(clave))) {
    clave = Array.from({ length: largo }, () => ALFABETO[aleatorio(ALFABETO.length)]).join('');
  }
  return clave;
}

export const CLAVE_MENSAJES: Record<ClaveErrorCode, string> = {
  too_short: `La clave debe tener al menos ${PORTAL_LIMITES.claveMin} caracteres.`,
  too_long: `La clave puede tener hasta ${PORTAL_LIMITES.claveMax} caracteres.`,
  weak: 'La clave debe combinar letras y números.',
  mismatch: 'Las dos claves no coinciden.',
  same_as_old: 'La clave nueva debe ser distinta de la actual.',
};
