import { createHmac, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import type { AstroCookies } from 'astro';
import { and, eq, gt, lt } from 'drizzle-orm';
import { getDb, schema } from './db/client';
import { SERVER_ENV } from './env';

// Autenticación por sesión con cookie (issue #40). El panel y el portal usan
// ámbitos y cookies distintos, así una sesión nunca sirve para el otro lado.

export type SessionScope = 'admin' | 'portal';

const COOKIE_NAMES: Record<SessionScope, string> = {
  admin: 'mel_admin',
  portal: 'mel_portal',
};

const DEV_SECRET = 'solo-para-desarrollo-cambiar-en-produccion';

function sessionSecret(): string {
  const secret = SERVER_ENV.read('SESSION_SECRET');
  if (!secret && SERVER_ENV.isProduction) {
    throw new Error('Falta SESSION_SECRET en producción.');
  }
  return secret ?? DEV_SECRET;
}

function sessionHours(): number {
  const hours = Number(SERVER_ENV.read('ADMIN_SESSION_HOURS') ?? 12);
  return Number.isFinite(hours) && hours > 0 ? hours : 12;
}

// En la base solo se guarda el HMAC del token: una copia de la base no permite
// suplantar sesiones.
function tokenId(token: string): string {
  return createHmac('sha256', sessionSecret()).update(token).digest('hex');
}

export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

// Hash fijo para comparar cuando el usuario no existe: el tiempo de respuesta no
// revela si un correo está registrado.
let dummyHash: Promise<string> | undefined;
export function dummyVerify(password: string): Promise<boolean> {
  dummyHash ??= hash('contraseña-inexistente');
  return dummyHash.then((value) => verifyPassword(value, password));
}

export async function createSession(cookies: AstroCookies, scope: SessionScope, userId: number, secure: boolean): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionHours() * 3600_000);
  await getDb().insert(schema.sesiones).values({ id: tokenId(token), ambito: scope, usuarioId: userId, expiraEn: expiresAt });
  cookies.set(COOKIE_NAMES[scope], token, {
    path: '/',
    httpOnly: true,
    secure,
    sameSite: 'lax',
    expires: expiresAt,
  });
}

// Devuelve el id del usuario de una sesión vigente, o null.
export async function readSession(cookies: AstroCookies, scope: SessionScope): Promise<number | null> {
  const token = cookies.get(COOKIE_NAMES[scope])?.value;
  if (!token) {
    return null;
  }
  const [row] = await getDb()
    .select({ usuarioId: schema.sesiones.usuarioId })
    .from(schema.sesiones)
    .where(and(eq(schema.sesiones.id, tokenId(token)), eq(schema.sesiones.ambito, scope), gt(schema.sesiones.expiraEn, new Date())))
    .limit(1);
  return row?.usuarioId ?? null;
}

export async function destroySession(cookies: AstroCookies, scope: SessionScope): Promise<void> {
  const token = cookies.get(COOKIE_NAMES[scope])?.value;
  if (token) {
    await getDb().delete(schema.sesiones).where(eq(schema.sesiones.id, tokenId(token)));
  }
  cookies.delete(COOKIE_NAMES[scope], { path: '/' });
  // Limpieza oportunista de sesiones vencidas.
  await getDb().delete(schema.sesiones).where(lt(schema.sesiones.expiraEn, new Date()));
}

// Límite de intentos: más de LOGIN_MAX_ATTEMPTS fallos en LOGIN_WINDOW_MINUTES
// desde la misma IP o para la misma cuenta bloquea temporalmente el ingreso.
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 15;

export const LoginThrottle = {
  windowMinutes: LOGIN_WINDOW_MINUTES,

  async isBlocked(scope: SessionScope, keys: string[]): Promise<boolean> {
    const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000);
    for (const key of keys) {
      const rows = await getDb()
        .select({ id: schema.intentosLogin.id })
        .from(schema.intentosLogin)
        .where(and(eq(schema.intentosLogin.ambito, scope), eq(schema.intentosLogin.clave, key), gt(schema.intentosLogin.createdAt, since)))
        .limit(LOGIN_MAX_ATTEMPTS);
      if (rows.length >= LOGIN_MAX_ATTEMPTS) {
        return true;
      }
    }
    return false;
  },

  async recordFailure(scope: SessionScope, keys: string[]): Promise<void> {
    await getDb()
      .insert(schema.intentosLogin)
      .values(keys.map((clave) => ({ ambito: scope, clave })));
  },

  async clear(scope: SessionScope, keys: string[]): Promise<void> {
    for (const key of keys) {
      await getDb().delete(schema.intentosLogin).where(and(eq(schema.intentosLogin.ambito, scope), eq(schema.intentosLogin.clave, key)));
    }
  },
};
