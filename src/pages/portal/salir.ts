import type { APIRoute } from 'astro';
import { destroySession } from '../../server/auth';

export const prerender = false;

// Cierra la sesión del portal y vuelve a la página de ingreso.
export const POST: APIRoute = async ({ cookies, redirect }) => {
  await destroySession(cookies, 'portal');
  return redirect('/ingresar', 303);
};
