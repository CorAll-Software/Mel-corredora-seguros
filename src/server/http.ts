import type { z } from 'zod';

// Respuestas JSON consistentes para todos los endpoints (issue #38):
// éxito → { ok: true, ...datos }; error → { ok: false, error, details? }.

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

export function ok(data: Record<string, unknown> = {}, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, ...data }), { status, headers: JSON_HEADERS });
}

export function fail(status: number, error: string, details?: unknown): Response {
  const body = details === undefined ? { ok: false, error } : { ok: false, error, details };
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

// Errores de zod en un formato simple para el formulario: { campo: mensaje }.
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!(key in result)) {
      result[key] = issue.message;
    }
  }
  return result;
}

// Lee y valida un cuerpo JSON. Devuelve los datos o una respuesta 400 lista.
export async function parseJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { response: fail(400, 'invalid_json') };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { response: fail(400, 'validation_error', fieldErrors(parsed.error)) };
  }
  return { data: parsed.data };
}

// IP del cliente (detrás de un proxy llega en x-forwarded-for).
export function clientIp(request: Request, fallback?: string): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || fallback;
  }
  return request.headers.get('x-real-ip') ?? fallback;
}
