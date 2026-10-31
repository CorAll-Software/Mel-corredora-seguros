import type { APIRoute } from 'astro';
import { fail, ok } from '../../../server/http';
import { cuentaDeSesion, datosSesion } from '../../../server/portal';

export const prerender = false;

// GET /api/portal/sesion — cuenta de la sesión abierta del portal (issue #48).
export const GET: APIRoute = async ({ cookies }) => {
  const cuenta = await cuentaDeSesion(cookies);
  return cuenta ? ok({ cuenta: datosSesion(cuenta) }) : fail(401, 'unauthorized');
};
