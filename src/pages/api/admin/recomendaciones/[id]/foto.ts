import type { APIRoute } from 'astro';
import { fail } from '../../../../../server/http';
import { RecomendacionesRepository } from '../../../../../server/repositories/recomendaciones.repository';
import { getStorage } from '../../../../../server/storage';

export const prerender = false;

// Foto o logo de una recomendación, solo para el panel (el middleware exige sesión).
export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return fail(400, 'invalid_id');
  }
  const recomendacion = await RecomendacionesRepository.obtener(id);
  const file = recomendacion?.fotoKey ? await getStorage().get(recomendacion.fotoKey) : null;
  if (!file) {
    return fail(404, 'not_found');
  }
  return new Response(new Uint8Array(file.body), {
    headers: { 'Content-Type': file.contentType, 'Cache-Control': 'private, max-age=300' },
  });
};
