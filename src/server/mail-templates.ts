import { BRAND_CONFIG } from '../core/config/brand.config';

// Plantillas de los avisos a Melanie (issue #39). Cada tipo define su asunto
// (sin datos personales), un titular y las filas de datos. La envoltura con la
// marca es común: wordmark MEL + denominación legal (lineamiento SBS).
// TODO-LOGO-MEL: cambiar el wordmark por el archivo del logo oficial cuando llegue (issue #19).

export interface MailEvents {
  recomendacion: {
    id: number;
    nombre: string;
    empresaCargo?: string | null;
    seguro: string;
    estrellas: number;
    texto: string;
    conFoto: boolean;
  };
  solicitud: {
    id: number;
    origen: string;
    ramo?: string | null;
    nombre: string;
    telefono?: string | null;
    correo?: string | null;
    resumen?: string | null;
  };
  portal: {
    ruc: string;
    razonSocial: string;
    accion: string;
    detalle?: string | null;
  };
  // Para el cliente: enlace de un solo uso para crear una clave nueva (#48).
  'portal-enlace': {
    ruc: string;
    razonSocial: string;
    path: string;
    minutos: number;
  };
  prueba: {
    nota?: string;
  };
}

export type MailType = keyof MailEvents;

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

interface Row {
  label: string;
  value: string;
}

interface Content {
  subject: string;
  heading: string;
  intro: string;
  rows: Row[];
  quote?: string;
  action?: { label: string; path: string };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function rowsOf(entries: Array<[string, string | number | null | undefined]>): Row[] {
  return entries
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([label, value]) => ({ label, value: String(value) }));
}

const CONTENT: { [K in MailType]: (data: MailEvents[K]) => Content } = {
  recomendacion: (data) => ({
    subject: 'Nueva recomendación por revisar',
    heading: 'Tienes una recomendación nueva',
    intro: 'Un cliente dejó su recomendación en la página. No se publica hasta que la apruebes.',
    rows: rowsOf([
      ['Nombre', data.nombre],
      ['Empresa y cargo', data.empresaCargo],
      ['Seguro', data.seguro],
      ['Calificación', `${'★'.repeat(data.estrellas)}${'☆'.repeat(5 - data.estrellas)} (${data.estrellas}/5)`],
      ['Foto o logo', data.conFoto ? 'Sí, adjuntó una imagen' : 'No'],
    ]),
    quote: data.texto,
    action: { label: 'Revisar en el panel', path: `/admin/recomendaciones?id=${data.id}` },
  }),
  solicitud: (data) => ({
    subject: 'Nueva solicitud desde la página',
    heading: 'Llegó una solicitud nueva',
    intro: 'Alguien dejó sus datos en la página. Ya quedó guardada en tu bandeja.',
    rows: rowsOf([
      ['Origen', data.origen],
      ['Ramo', data.ramo],
      ['Nombre', data.nombre],
      ['Celular', data.telefono],
      ['Correo', data.correo],
    ]),
    quote: data.resumen ?? undefined,
    action: { label: 'Abrir la bandeja', path: `/admin/solicitudes?id=${data.id}` },
  }),
  portal: (data) => ({
    subject: 'Movimiento en el portal de clientes',
    heading: 'Un cliente del portal hizo un movimiento',
    intro: 'Registro de actividad del portal de clientes empresa.',
    rows: rowsOf([
      ['Empresa', data.razonSocial],
      ['RUC', data.ruc],
      ['Acción', data.accion],
    ]),
    quote: data.detalle ?? undefined,
    action: { label: 'Ver clientes del portal', path: '/admin/clientes' },
  }),
  'portal-enlace': (data) => ({
    subject: 'Crea una nueva clave para el Portal de Clientes',
    heading: 'Restablece tu clave',
    intro: `Recibí una solicitud para restablecer la clave del Portal de Clientes. El enlace sirve una sola vez y vence en ${data.minutos} minutos. Si no lo pediste, ignora este correo: tu clave actual sigue igual.`,
    rows: rowsOf([
      ['Empresa', data.razonSocial],
      ['RUC', data.ruc],
    ]),
    action: { label: 'Crear nueva clave', path: data.path },
  }),
  prueba: (data) => ({
    subject: 'Correo de prueba de la página',
    heading: 'El envío de correos funciona',
    intro: 'Este es un correo de prueba enviado desde la página para confirmar la configuración.',
    rows: rowsOf([['Nota', data.nota]]),
  }),
};

export function renderMail<K extends MailType>(type: K, data: MailEvents[K], siteUrl: string): RenderedMail {
  const content = CONTENT[type](data);
  const actionUrl = content.action ? new URL(content.action.path, siteUrl).toString() : undefined;

  const text = [
    content.heading,
    '',
    content.intro,
    '',
    ...content.rows.map((row) => `${row.label}: ${row.value}`),
    ...(content.quote ? ['', `"${content.quote}"`] : []),
    ...(actionUrl ? ['', `${content.action!.label}: ${actionUrl}`] : []),
    '',
    '—',
    BRAND_CONFIG.legalLine,
  ].join('\n');

  const rowsHtml = content.rows
    .map(
      (row) => `<tr>
          <td style="padding:6px 12px 6px 0;color:#5b6b64;font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(row.label)}</td>
          <td style="padding:6px 0;color:#10201b;font-size:14px;font-weight:600;">${escapeHtml(row.value)}</td>
        </tr>`,
    )
    .join('');

  const quoteHtml = content.quote
    ? `<blockquote style="margin:18px 0 0;padding:14px 16px;background:#fff8e1;border:2px solid #10201b;border-radius:12px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:15px;line-height:1.5;color:#10201b;">${escapeHtml(content.quote).replace(/\n/g, '<br />')}</blockquote>`
    : '';

  const actionHtml = actionUrl
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:12px 20px;background:#0b7a57;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border:2px solid #10201b;border-radius:12px;box-shadow:0 4px 0 #10201b;">${escapeHtml(content.action!.label)}</a></p>`
    : '';

  const html = `<!doctype html>
<html lang="es">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(content.subject)}</title></head>
  <body style="margin:0;padding:0;background:#f6f2ec;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2ec;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:2px solid #10201b;border-radius:16px;box-shadow:6px 6px 0 #f5b50a;">
          <tr><td style="padding:20px 24px;border-bottom:2px solid #10201b;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:26px;font-weight:800;letter-spacing:0.18em;color:#10201b;padding-right:12px;">MEL</td>
              <td style="border-left:1.5px solid #10201b;padding-left:12px;">
                <div style="font-size:13px;font-weight:800;color:#10201b;">${escapeHtml(BRAND_CONFIG.ownerName)}</div>
                <div style="font-size:11px;font-weight:600;color:#5b6b64;">${escapeHtml(BRAND_CONFIG.sbsChip)} · ${escapeHtml(BRAND_CONFIG.licenseId)}</div>
              </td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:24px;">
            <h1 style="margin:0 0 8px;font-size:20px;color:#10201b;">${escapeHtml(content.heading)}</h1>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#3d4b45;">${escapeHtml(content.intro)}</p>
            <table role="presentation" cellpadding="0" cellspacing="0">${rowsHtml}</table>
            ${quoteHtml}
            ${actionHtml}
          </td></tr>
          <tr><td style="padding:14px 24px;border-top:2px solid #10201b;background:#0f3a2c;border-radius:0 0 14px 14px;color:#f6f2ec;font-size:11px;line-height:1.5;">
            ${escapeHtml(BRAND_CONFIG.legalLine)}<br />Aviso automático de la página ${escapeHtml(BRAND_CONFIG.brandTitle)}.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject: content.subject, html, text };
}
