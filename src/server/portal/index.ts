import type { AstroCookies } from 'astro';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { PORTAL_LIMITES, type CuentaPortal } from '../../core/portal/cuenta';
import { destroyUserSessions, dummyVerify, hashPassword, readSession, verifyPassword } from '../auth';
import { getDb } from '../db/client';
import { sendMail } from '../mail';
import { DrizzlePortalRepository } from './drizzle-portal.repository';
import { PortalService } from './portal.service';

// Punto de composición del portal de clientes: base de datos con Drizzle,
// claves con argon2 (auth.ts), sesiones de ámbito 'portal' y correo (#39).
export const portalService = new PortalService(new DrizzlePortalRepository(getDb), {
  claves: { hash: hashPassword, verificar: verifyPassword, simular: dummyVerify },
  tokens: {
    nuevo: () => randomBytes(32).toString('base64url'),
    hash: (token) => createHash('sha256').update(token).digest('hex'),
  },
  cerrarSesiones: (id) => destroyUserSessions('portal', id),
  enviarEnlace: async (cuenta, path) => {
    if (cuenta.correo) {
      await sendMail(cuenta.correo, 'portal-enlace', {
        ruc: cuenta.ruc,
        razonSocial: cuenta.razonSocial,
        path,
        minutos: PORTAL_LIMITES.enlaceMinutos,
      });
    }
  },
  aleatorio: (max) => randomInt(max),
});

// Cuenta activa de la sesión del portal, o null. Toda ruta privada del portal
// pasa por aquí: una cuenta desactivada pierde el acceso en el acto.
export async function cuentaDeSesion(cookies: AstroCookies): Promise<CuentaPortal | null> {
  const id = await readSession(cookies, 'portal');
  return id === null ? null : portalService.cuentaActiva(id);
}

// Lo que el navegador necesita saber de la cuenta (sin datos internos).
export function datosSesion(cuenta: CuentaPortal) {
  return { ruc: cuenta.ruc, razonSocial: cuenta.razonSocial, contacto: cuenta.contacto, debeCambiarClave: cuenta.debeCambiarClave };
}
