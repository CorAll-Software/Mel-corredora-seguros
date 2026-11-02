// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import node from '@astrojs/node';

export default defineConfig({
  integrations: [preact()],
  // Renderizado híbrido (issue #38): todo sigue prerenderizado por defecto; solo
  // las rutas con `export const prerender = false` (/api/*, /admin/*, portal) se
  // renderizan en servidor. Para Vercel o Netlify basta cambiar este adapter.
  // Tope del cuerpo de cada petición (#51): el PDF más grande del portal pesa
  // 10 MB; por defecto el adapter acepta hasta 1 GB.
  adapter: node({ mode: 'standalone', bodySizeLimit: 12 * 1024 * 1024 }),
  server: { port: 4321 },
  // Toolbar de desarrollo desactivada: su panel inyecta overhead y retrasa
  // cada visita en dev (no aporta al flujo de trabajo de este proyecto)
  devToolbar: { enabled: false },
  // Precalienta la transformacion de los modulos de cliente apenas arranca el
  // servidor: la primera visita ya no espera la compilacion on-demand
  vite: {
    // Pre-bundleo de dependencias al arrancar el servidor (no on-demand en la
    // primera visita): la primera carga en dev no espera a esbuild.
    optimizeDeps: {
      include: ['lucide-preact', 'embla-carousel', 'preact', 'preact/hooks'],
    },
    server: {
      warmup: {
        clientFiles: ['./src/**/*.{ts,tsx,scss,astro}'],
      },
    },
  },
  // Pǭginas que pasaron a ser secciones de la Home: las URLs antiguas siguen funcionando
  redirects: {
    '/agendar-cita': '/#agendar',
    '/asesoria': '/#sobre-melanie',
    '/coberturas-sctr': '/#aseguradoras',
  },
});
