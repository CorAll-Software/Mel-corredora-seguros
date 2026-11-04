import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { getDb } from '../../server/db/client';
import { fail, ok } from '../../server/http';

export const prerender = false;

// Endpoint de salud: confirma que el servidor responde y que la base de datos está accesible.
export const GET: APIRoute = async () => {
  try {
    await getDb().run(sql`select 1`);
    return ok({ db: 'up' });
  } catch (error) {
    console.error('[health] base de datos no disponible:', error);
    return fail(503, 'db_unavailable');
  }
};
