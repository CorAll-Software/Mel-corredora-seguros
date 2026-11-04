import type { APIRoute } from 'astro';
import { fail } from '../../server/http';

export const prerender = false;

// Cualquier ruta /api/* inexistente responde en JSON, no con la página 404.
export const ALL: APIRoute = () => fail(404, 'not_found');
