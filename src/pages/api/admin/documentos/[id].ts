import type { APIRoute } from 'astro';
import { nombreDescarga } from '../../../../core/portal/documento';
import { fail } from '../../../../server/http';
import { documentosService } from '../../../../server/portal';

export const prerender = false;

// GET /api/admin/documentos/:id — vista del PDF para Melanie (el middleware
// exige la sesión de administradora en /api/admin/*).
export const GET: APIRoute = async ({ params }) => {
  const archivo = await documentosService.archivo(Number(params.id));
  if (!archivo) {
    return fail(404, 'not_found');
  }
  return new Response(new Uint8Array(archivo.body), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(nombreDescarga(archivo.documento))}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
