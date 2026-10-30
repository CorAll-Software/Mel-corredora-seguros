import { getClient } from '../src/server/db/client';
import { MAIL_CONFIG, notifyMelanie } from '../src/server/mail';

// Envía un correo de prueba con la configuración actual (npm run mail:test).
// Sin RESEND_API_KEY ni SMTP_HOST, el correo se muestra en la consola.
async function main(): Promise<void> {
  console.log(`[mail:test] proveedor: ${MAIL_CONFIG.provider} · para: ${MAIL_CONFIG.to}`);
  const result = await notifyMelanie('prueba', { nota: process.argv[2] ?? 'Prueba manual desde npm run mail:test' });
  console.log('[mail:test] resultado:', result);
  getClient().close();
  process.exit(result.error ? 1 : 0);
}

main();
