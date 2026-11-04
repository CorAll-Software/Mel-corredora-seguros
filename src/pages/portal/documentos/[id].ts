import type { APIRoute } from 'astro';
import { nombreDescarga } from '../../../core/portal/documento';
import { documentosService } from '../../../server/portal';

export const prerender = false;

// GET /portal/documentos/:id?exp=…&sig=… — descarga de un documento con enlace
// firmado y temporal (issue #49). Además de la firma, el middleware exige la
// sesión de la empresa y aquí se comprueba que el documento sea suyo.
export const GET: APIRoute = async ({ params, url, locals, redirect }) => {
  const cliente = locals.cliente!;
  const archivo = await documentosService.descargar(
    cliente.id,
    Number(params.id),
    Number(url.searchParams.get('exp')),
    url.searchParams.get('sig') ?? '',
  );
  if (!archivo) {
    // Enlace vencido, alterado o de otra empresa: se vuelve al portal con un aviso.
    return redirect('/portal?aviso=enlace', 303);
  }
  return new Response(new Uint8Array(archivo.body), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(nombreDescarga(archivo.documento))}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
