import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createSession, LoginThrottle } from '../../../server/auth';
import { SERVER_ENV } from '../../../server/env';
import { clientIp, fail, ok, parseJson } from '../../../server/http';
import { datosSesion, portalService } from '../../../server/portal';

export const prerender = false;

const loginSchema = z.object({
  ruc: z.string().max(20),
  clave: z.string().max(200),
});

// POST /api/portal/login — ingreso de un cliente empresa con RUC + clave. Ante
// cualquier fallo (RUC sin cuenta, clave incorrecta o cuenta desactivada) la
// respuesta es la misma: no revela cuál falló.
export const POST: APIRoute = async ({ request, cookies, clientAddress, url }) => {
  const parsed = await parseJson(request, loginSchema);
  if ('response' in parsed) {
    return parsed.response;
  }
  const ruc = parsed.data.ruc.replace(/\D/g, '');
  const ip = clientIp(request, clientAddress) ?? 'desconocida';
  const keys = [`ip:${ip}`, `ruc:${ruc}`];

  if (await LoginThrottle.isBlocked('portal', keys)) {
    return fail(429, 'rate_limited', { minutos: LoginThrottle.windowMinutes });
  }
  const cuenta = ruc && parsed.data.clave ? await portalService.autenticar(ruc, parsed.data.clave) : null;
  if (!cuenta) {
    await LoginThrottle.recordFailure('portal', keys);
    return fail(401, 'invalid_credentials');
  }
  await LoginThrottle.clear('portal', keys);
  const secure = SERVER_ENV.isProduction || url.protocol === 'https:';
  await createSession(cookies, 'portal', cuenta.id, secure);
  return ok({ cuenta: datosSesion(cuenta) });
};
