import type { APIRoute } from 'astro';
import { z } from 'zod';
import { clientIp, fail, ok, parseJson } from '../../../server/http';
import { portalService } from '../../../server/portal';
import { RateLimit } from '../../../server/rate-limit';

export const prerender = false;

// Máximo 5 pedidos de enlace por IP y hora: evita usar el formulario para
// llenar de correos a un cliente.
const LIMIT = { ambito: 'portal-olvide', max: 5, windowMinutes: 60 };

const olvideSchema = z.object({ ruc: z.string().max(20) });

// POST /api/portal/olvide — envía un enlace de un solo uso al correo de la
// cuenta. Responde igual exista o no el RUC.
export const POST: APIRoute = async ({ request, clientAddress }) => {
  const parsed = await parseJson(request, olvideSchema);
  if ('response' in parsed) {
    return parsed.response;
  }
  const ip = clientIp(request, clientAddress) ?? 'desconocida';
  if (await RateLimit.isLimited(LIMIT, ip)) {
    return fail(429, 'rate_limited');
  }
  await RateLimit.record(LIMIT, ip);
  try {
    await portalService.solicitarEnlace(parsed.data.ruc);
  } catch (error) {
    console.error('[portal] no se pudo generar el enlace:', error);
  }
  return ok();
};
