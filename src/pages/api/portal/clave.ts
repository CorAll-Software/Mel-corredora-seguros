import type { APIRoute } from 'astro';
import { z } from 'zod';
import { fail, ok, parseJson } from '../../../server/http';
import { cuentaDeSesion, portalService } from '../../../server/portal';

export const prerender = false;

const claveSchema = z.object({
  actual: z.string().max(200).optional(),
  nueva: z.string().max(200),
  confirmacion: z.string().max(200),
});

// POST /api/portal/clave — cambio de clave del cliente con sesión abierta
// (obligatorio en el primer ingreso).
export const POST: APIRoute = async ({ request, cookies }) => {
  const cuenta = await cuentaDeSesion(cookies);
  if (!cuenta) {
    return fail(401, 'unauthorized');
  }
  const parsed = await parseJson(request, claveSchema);
  if ('response' in parsed) {
    return parsed.response;
  }
  const resultado = await portalService.cambiarClave(cuenta.id, parsed.data);
  return resultado.ok ? ok() : fail(400, resultado.error);
};
