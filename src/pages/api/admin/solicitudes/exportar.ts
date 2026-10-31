import type { APIRoute } from 'astro';
import { hoyEnLima } from '../../../../core/comparador/tarifa';
import { isEstado } from '../../../../core/solicitudes/solicitud';
import { solicitudesService } from '../../../../server/solicitudes';

export const prerender = false;

// Descarga las solicitudes en CSV con el mismo filtro de la bandeja
// (?estado=…&q=…). El middleware exige sesión del panel.
export const GET: APIRoute = async ({ url }) => {
  const estado = url.searchParams.get('estado');
  const csv = await solicitudesService.exportarCsv({
    estado: isEstado(estado) ? estado : undefined,
    busqueda: url.searchParams.get('q')?.slice(0, 100) ?? undefined,
  });
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="solicitudes-${hoyEnLima()}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
};
