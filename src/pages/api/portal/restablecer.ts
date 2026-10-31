import type { APIRoute } from 'astro';
import { z } from 'zod';
import { fail, ok, parseJson } from '../../../server/http';
import { portalService } from '../../../server/portal';

export const prerender = false;

const restablecerSchema = z.object({
  token: z.string().max(200),
  nueva: z.string().max(200),
  confirmacion: z.string().max(200),
});

// POST /api/portal/restablecer — crea una clave nueva con el enlace del correo.
// El enlace sirve una sola vez y cierra las sesiones abiertas de la cuenta.
export const POST: APIRoute = async ({ request }) => {
  const parsed = await parseJson(request, restablecerSchema);
  if ('response' in parsed) {
    return parsed.response;
  }
  const { token, nueva, confirmacion } = parsed.data;
  const resultado = await portalService.restablecer(token, nueva, confirmacion);
  return resultado.ok ? ok() : fail(400, resultado.error);
};
