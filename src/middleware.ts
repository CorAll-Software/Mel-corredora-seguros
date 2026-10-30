import { defineMiddleware } from 'astro:middleware';
import { readSession } from './server/auth';
import { fail } from './server/http';
import { AdminRepository } from './server/repositories/admin.repository';

// Protege el panel de Melanie (issue #40): /admin/* y /api/admin/* exigen una
// sesión de administradora. El resto del sitio pasa sin tocarse.
const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/admin/login/']);

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/');
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  if (context.isPrerendered || !isAdminPath(pathname)) {
    return next();
  }

  if (!PUBLIC_ADMIN_PATHS.has(pathname)) {
    const userId = await readSession(context.cookies, 'admin');
    const admin = userId === null ? undefined : await AdminRepository.findById(userId);
    if (!admin) {
      if (pathname.startsWith('/api/')) {
        return fail(401, 'unauthorized');
      }
      const nextPath = pathname + context.url.search;
      return context.redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`, 303);
    }
    context.locals.admin = admin;
  }

  const response = await next();
  // El panel nunca se indexa ni se guarda en cachés compartidas.
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store');
  return response;
});
