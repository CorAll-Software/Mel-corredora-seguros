import { defineMiddleware } from 'astro:middleware';
import { readSession } from './server/auth';
import { fail } from './server/http';
import { cuentaDeSesion } from './server/portal';
import { AdminRepository } from './server/repositories/admin.repository';

// Protege las zonas privadas. Las dos se ingresan desde /ingresar:
// - Panel de Melanie (issue #40): /admin/* y /api/admin/* exigen sesión de administradora.
// - Portal de Clientes (#48): /portal/* exige sesión de una cuenta activa y, si
//   tiene clave temporal, solo deja ver /portal/clave hasta cambiarla.
// El resto del sitio pasa sin tocarse.
const PORTAL_PUBLIC = new Set(['/portal/olvide', '/portal/restablecer']);
const PORTAL_CAMBIO_CLAVE = '/portal/clave';

function sinBarraFinal(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');
}

function isPortalPath(pathname: string): boolean {
  return pathname === '/portal' || pathname.startsWith('/portal/');
}

function privateHeaders(response: Response): Response {
  // Las zonas privadas nunca se indexan ni se guardan en cachés compartidas.
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = sinBarraFinal(context.url.pathname);
  if (context.isPrerendered) {
    return next();
  }
  const loginUrl = () => `/ingresar?next=${encodeURIComponent(pathname + context.url.search)}`;

  if (isAdminPath(pathname)) {
    const userId = await readSession(context.cookies, 'admin');
    const admin = userId === null ? undefined : await AdminRepository.findById(userId);
    if (!admin) {
      return pathname.startsWith('/api/') ? fail(401, 'unauthorized') : context.redirect(loginUrl(), 303);
    }
    context.locals.admin = admin;
    return privateHeaders(await next());
  }

  if (isPortalPath(pathname)) {
    if (!PORTAL_PUBLIC.has(pathname)) {
      const cliente = await cuentaDeSesion(context.cookies);
      if (!cliente) {
        return context.redirect(loginUrl(), 303);
      }
      if (cliente.debeCambiarClave && pathname !== PORTAL_CAMBIO_CLAVE && pathname !== '/portal/salir') {
        return context.redirect(PORTAL_CAMBIO_CLAVE, 303);
      }
      context.locals.cliente = cliente;
    }
    return privateHeaders(await next());
  }

  return next();
});
