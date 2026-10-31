import type { APIRoute } from 'astro';
import { fail } from '../../../server/http';
import { MAIL_CONFIG } from '../../../server/mail';
import { renderMail, type MailEvents, type MailType } from '../../../server/mail-templates';

export const prerender = false;

// Solo en desarrollo: vista previa de las plantillas de correo en el navegador.
// /api/dev/correo?tipo=recomendacion (también solicitud, portal, prueba). Datos ficticios de muestra.
const SAMPLES: MailEvents = {
  recomendacion: {
    id: 0,
    nombre: 'Nombre de muestra',
    empresaCargo: 'Empresa de muestra · Gerente',
    seguro: 'SCTR',
    estrellas: 5,
    texto: 'Texto de muestra para ver cómo se ve una recomendación en el correo.',
    conFoto: true,
  },
  solicitud: { id: 0, origen: 'comparador', ramo: 'SOAT', nombre: 'Nombre de muestra', telefono: '999 999 999', correo: 'muestra@example.com', resumen: 'Resumen de muestra.' },
  portal: { ruc: '20000000001', razonSocial: 'Empresa de muestra', accion: 'Solicitud de movimiento de planilla', detalle: 'Detalle de muestra.' },
  'portal-enlace': { ruc: '20000000001', razonSocial: 'Empresa de muestra', path: '/portal/restablecer?token=muestra', minutos: 60 },
  prueba: { nota: 'Vista previa' },
};

export const GET: APIRoute = ({ url }) => {
  if (!import.meta.env.DEV) {
    return fail(404, 'not_found');
  }
  const tipo = (url.searchParams.get('tipo') ?? 'recomendacion') as MailType;
  if (!(tipo in SAMPLES)) {
    return fail(400, 'unknown_type', Object.keys(SAMPLES));
  }
  const mail = renderMail(tipo, SAMPLES[tipo] as never, MAIL_CONFIG.siteUrl);
  return new Response(mail.html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
