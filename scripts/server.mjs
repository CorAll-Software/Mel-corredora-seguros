import http from 'node:http';

// Servidor de producción (issue #51): el mismo handler del adapter de Node
// (archivos estáticos + páginas del servidor), con cabeceras de seguridad en
// TODAS las respuestas. El middleware de Astro no pasa por las páginas
// prerenderizadas, por eso se ponen aquí. Uso: npm run build && npm run serve.
process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const { handler } = await import('../dist/server/entry.mjs');

// 'unsafe-inline' en scripts y estilos: Astro hidrata las islas con scripts en
// línea y el panel usa confirmaciones en línea. El resto queda restringido.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https:",
  "connect-src 'self'",
  // Agenda de Google Calendar y videos de los servicios.
  'frame-src https://calendar.google.com https://www.youtube.com https://www.youtube-nocookie.com',
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

export const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  // Los navegadores solo la aplican por HTTPS; por HTTP se ignora.
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

// Igual que bodySizeLimit en astro.config.mjs (PDF de 10 MB + formulario).
const MAX_BODY = 12 * 1024 * 1024;

const port = Number(process.env.PORT ?? 4321);
const host = process.env.HOST ?? '0.0.0.0';

http
  .createServer((req, res) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      res.setHeader(name, value);
    }
    // Un envío más grande que el tope del adapter se corta aquí con 413.
    if (Number(req.headers['content-length'] ?? 0) > MAX_BODY) {
      res.writeHead(413, { 'Content-Type': 'text/plain; charset=utf-8', Connection: 'close' });
      res.end('El archivo es demasiado grande.');
      req.resume();
      return;
    }
    handler(req, res);
  })
  .listen(port, host, () => {
    console.log(`[server] escuchando en http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  });
