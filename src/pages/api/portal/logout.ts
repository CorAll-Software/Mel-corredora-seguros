import type { APIRoute } from 'astro';
import { destroySession } from '../../../server/auth';
import { ok } from '../../../server/http';

export const prerender = false;

// POST /api/portal/logout — cierra la sesión del portal.
export const POST: APIRoute = async ({ cookies }) => {
  await destroySession(cookies, 'portal');
  return ok();
};
