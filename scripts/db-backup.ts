import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getClient } from '../src/server/db/client';
import { SERVER_ENV } from '../src/server/env';

// Copia de seguridad (issue #51): la base SQLite y los PDF del portal en
// BACKUP_DIR/<fecha-hora>/ (por defecto ./data/backups). Conserva las últimas
// BACKUP_CONSERVAR (14). Uso: npm run db:backup (programable con cron).
const destino = resolve(SERVER_ENV.read('BACKUP_DIR') ?? './data/backups');
const conservar = Math.max(1, Number(SERVER_ENV.read('BACKUP_CONSERVAR') ?? 14) || 14);
const uploads = resolve(SERVER_ENV.read('STORAGE_DIR') ?? './data/uploads');

function sello(fecha: Date): string {
  return fecha.toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
}

async function main(): Promise<void> {
  if (!SERVER_ENV.databaseUrl.startsWith('file:')) {
    console.log('[db:backup] la base no es un archivo local (Turso): usa las copias del proveedor.');
    return;
  }
  const carpeta = join(destino, sello(new Date()));
  mkdirSync(carpeta, { recursive: true });

  // VACUUM INTO genera una copia consistente aunque el servidor esté escribiendo.
  const archivo = join(carpeta, 'mel.db').split('\\').join('/');
  await getClient().execute({ sql: 'VACUUM INTO ?', args: [archivo] });
  getClient().close();
  if (existsSync(uploads)) {
    cpSync(uploads, join(carpeta, 'uploads'), { recursive: true });
  }

  const copias = readdirSync(destino).sort();
  for (const vieja of copias.slice(0, Math.max(0, copias.length - conservar))) {
    rmSync(join(destino, vieja), { recursive: true, force: true });
  }
  console.log(`[db:backup] copia en ${carpeta} (se conservan las últimas ${conservar}).`);
}

main().catch((error) => {
  console.error('[db:backup] error:', error);
  process.exit(1);
});
