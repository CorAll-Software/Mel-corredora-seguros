import type { APIRoute } from 'astro';
import { fail, ok } from '../../../server/http';
import { RecomendacionesRepository } from '../../../server/repositories/recomendaciones.repository';

export const prerender = false;

// GET /api/recomendaciones/aprobadas — lo que muestra la sección pública (issue #43).
// Solo aprobadas, sin datos internos. Caché corta: aprobar en el panel se ve en
// la página en un minuto, sin volver a desplegar.
export const GET: APIRoute = async () => {
  try {
    const rows = await RecomendacionesRepository.listarAprobadas();
    const recomendaciones = rows.map(({ conFoto, fecha, ...rest }) => ({
      ...rest,
      foto: conFoto ? `/api/recomendaciones/${rest.id}/foto` : null,
      fecha: fecha.toISOString(),
    }));
    const response = ok({ recomendaciones });
    response.headers.set('Cache-Control', 'public, max-age=60');
    return response;
  } catch (error) {
    console.error('[recomendaciones] no se pudieron listar las aprobadas:', error);
    return fail(503, 'unavailable');
  }
};
