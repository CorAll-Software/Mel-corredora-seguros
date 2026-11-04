import type { APIRoute } from 'astro';
import { hoyEnLima } from '../../../../core/comparador/tarifa';
import { tarifasService } from '../../../../server/tarifas';

export const prerender = false;

// Descarga todas las tarifas en CSV (el middleware exige sesión del panel).
export const GET: APIRoute = async () => {
  const csv = await tarifasService.exportarCsv();
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tarifas-${hoyEnLima()}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
};
