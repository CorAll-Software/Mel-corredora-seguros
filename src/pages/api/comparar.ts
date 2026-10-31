import type { APIRoute } from 'astro';
import { z } from 'zod';
import { RAMO_IDS } from '../../core/comparador/ramos';
import { MONEDAS_VALOR } from '../../core/comparador/consulta';
import { insurerById } from '../../core/data/insurers.data';
import { comparadorService } from '../../server/comparador';
import { fail, ok, parseJson } from '../../server/http';

export const prerender = false;

// POST /api/comparar — prima referencial por aseguradora (issue #46).
// Recibe el ramo y el borrador del asistente de /comparar; las reglas de cada
// campo las aplica el dominio (consulta.ts) y devuelven códigos por campo.
const texto = z.string().max(200).default('');
const bodySchema = z.object({
  ramo: z.enum(RAMO_IDS),
  borrador: z.object({
    uso: texto,
    marca: texto,
    anio: texto,
    valor: texto,
    moneda: z.enum(MONEDAS_VALOR).default('USD'),
    producto: texto,
    edades: z.array(z.string().max(3)).max(20).default([]),
    actividad: texto,
    trabajadores: texto,
    planilla: texto,
    nombre: texto,
    celular: texto,
    correo: texto,
    acepta: z.boolean().default(false),
  }),
});

export const POST: APIRoute = async ({ request }) => {
  const parsed = await parseJson(request, bodySchema);
  if ('response' in parsed) {
    return parsed.response;
  }
  try {
    const resultado = await comparadorService.comparar(parsed.data.ramo, parsed.data.borrador);
    if (!resultado.ok) {
      return fail(400, 'validation_error', resultado.errores);
    }
    const resultados = resultado.resultados.map((r) => {
      const insurer = insurerById(r.aseguradora);
      return { ...r, nombre: insurer?.name ?? r.aseguradora, logo: insurer?.logo ?? null };
    });
    return ok({ resultados });
  } catch (error) {
    console.error('[comparar] no se pudo calcular:', error);
    return fail(503, 'unavailable');
  }
};
