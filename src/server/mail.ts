import { BRAND_CONFIG } from '../core/config/brand.config';
import { getDb, schema } from './db/client';
import { SERVER_ENV } from './env';
import { renderMail, type MailEvents, type MailType, type RenderedMail } from './mail-templates';

// Avisos por correo a Melanie (issue #39) y correos a clientes del portal
// (#48). Un solo punto de envío para todo el sitio.
//
// Proveedor (MAIL_PROVIDER): 'resend' | 'smtp' | 'console'. Si no se indica, se
// usa Resend cuando hay RESEND_API_KEY, SMTP cuando hay SMTP_HOST y, si no hay
// ninguno, el correo se escribe en la consola (modo desarrollo).

export type MailProvider = 'resend' | 'smtp' | 'console';

export interface MailResult {
  sent: boolean;
  provider: MailProvider;
  error?: string;
}

const env = SERVER_ENV.read;

function resolveProvider(): MailProvider {
  const explicit = env('MAIL_PROVIDER')?.toLowerCase();
  if (explicit === 'resend' || explicit === 'smtp' || explicit === 'console') {
    return explicit;
  }
  if (env('RESEND_API_KEY')) {
    return 'resend';
  }
  if (env('SMTP_HOST')) {
    return 'smtp';
  }
  return 'console';
}

export const MAIL_CONFIG = {
  get provider(): MailProvider {
    return resolveProvider();
  },
  // Destinatario por defecto: correo oficial de Melanie (informe, tercera revisión).
  get to(): string {
    return env('MAIL_TO') ?? BRAND_CONFIG.contact.email;
  },
  get from(): string {
    // onboarding@resend.dev sirve para probar Resend sin dominio verificado.
    return env('MAIL_FROM') ?? `${BRAND_CONFIG.brandTitle} <onboarding@resend.dev>`;
  },
  // URL pública del sitio, para los enlaces al panel dentro del correo.
  get siteUrl(): string {
    return env('SITE_URL') ?? 'http://localhost:4321';
  },
};

async function sendWithResend(to: string, mail: RenderedMail): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('RESEND_API_KEY') ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: MAIL_CONFIG.from, to: [to], subject: mail.subject, html: mail.html, text: mail.text }),
  });
  if (!response.ok) {
    throw new Error(`Resend respondió ${response.status}: ${await response.text()}`);
  }
}

async function sendWithSmtp(to: string, mail: RenderedMail): Promise<void> {
  // Import perezoso: nodemailer solo se carga si se usa SMTP.
  const { createTransport } = await import('nodemailer');
  const port = Number(env('SMTP_PORT') ?? 587);
  const transport = createTransport({
    host: env('SMTP_HOST'),
    port,
    secure: (env('SMTP_SECURE') ?? (port === 465 ? 'true' : 'false')) === 'true',
    auth: env('SMTP_USER') ? { user: env('SMTP_USER'), pass: env('SMTP_PASS') } : undefined,
  });
  await transport.sendMail({ from: MAIL_CONFIG.from, to, subject: mail.subject, html: mail.html, text: mail.text });
}

function printToConsole(to: string, mail: RenderedMail): void {
  const line = '─'.repeat(60);
  console.info(`\n${line}\n[correo · modo consola] Para: ${to}\nAsunto: ${mail.subject}\n${line}\n${mail.text}\n${line}\n`);
}

async function logDelivery(entry: typeof schema.enviosCorreo.$inferInsert): Promise<void> {
  try {
    await getDb().insert(schema.enviosCorreo).values(entry);
  } catch (error) {
    console.error('[correo] no se pudo registrar el envío:', error);
  }
}

// Envía un correo a cualquier destinatario. Nunca lanza: un fallo de envío se
// registra y se devuelve en el resultado, para que el formulario que lo llama
// siga adelante.
export async function sendMail<K extends MailType>(to: string, type: K, data: MailEvents[K]): Promise<MailResult> {
  const provider = MAIL_CONFIG.provider;
  let mail: RenderedMail | undefined;

  try {
    mail = renderMail(type, data, MAIL_CONFIG.siteUrl);
    if (provider === 'resend') {
      await sendWithResend(to, mail);
    } else if (provider === 'smtp') {
      await sendWithSmtp(to, mail);
    } else {
      printToConsole(to, mail);
    }
    await logDelivery({ tipo: type, destinatario: to, asunto: mail.subject, proveedor: provider, estado: provider === 'console' ? 'consola' : 'enviado' });
    return { sent: provider !== 'console', provider };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[correo] falló el envío "${type}" vía ${provider}:`, message);
    await logDelivery({ tipo: type, destinatario: to, asunto: mail?.subject ?? type, proveedor: provider, estado: 'error', error: message.slice(0, 1000) });
    return { sent: false, provider, error: message };
  }
}

// Envía un aviso a Melanie (destinatario MAIL_TO).
export function notifyMelanie<K extends MailType>(type: K, data: MailEvents[K]): Promise<MailResult> {
  return sendMail(MAIL_CONFIG.to, type, data);
}
