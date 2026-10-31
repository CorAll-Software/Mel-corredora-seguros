import { BRAND_CONFIG } from './brand.config';

// Secciones de la Home, en el orden de la página
export const HOME_SECTIONS = [
  { id: 'soluciones', path: '/#soluciones' },
  { id: 'como-funciona', path: '/#como-funciona' },
  { id: 'aseguradoras', path: '/#aseguradoras' },
  { id: 'sobre-melanie', path: '/#sobre-melanie' },
  { id: 'agendar', path: '/#agendar' },
  { id: 'faq', path: '/#faq' },
] as const;

// Páginas que se mantienen aparte
export const PAGES = {
  quote: '/cotizador',
  compare: '/comparar',
  faq: '/preguntas-frecuentes',
  portal: '/portal-clientes',
} as const;

export const BRAND = BRAND_CONFIG;
