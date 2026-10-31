import type { APIRoute } from 'astro';
import { destroySession } from '../../server/auth';

export const prerender = false;

// Cierra la sesión del panel: borra la sesión en la base e invalida la cookie.
export const POST: APIRoute = async ({ cookies, redirect }) => {
  await destroySession(cookies, 'admin');
  return redirect('/ingresar', 303);
};
