import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { SERVER_ENV } from '../env';
import * as schema from './schema';

export type Database = LibSQLDatabase<typeof schema>;

let client: Client | undefined;
let database: Database | undefined;

// En desarrollo la base es un archivo local: se crea su carpeta si no existe.
function ensureLocalFolder(url: string): void {
  if (!url.startsWith('file:')) {
    return;
  }
  const path = url.slice('file:'.length);
  mkdirSync(dirname(path), { recursive: true });
}

export function getClient(): Client {
  if (!client) {
    ensureLocalFolder(SERVER_ENV.databaseUrl);
    client = createClient({
      url: SERVER_ENV.databaseUrl,
      authToken: SERVER_ENV.databaseAuthToken,
    });
  }
  return client;
}

// Conexión única y perezosa: las páginas prerenderizadas nunca la abren.
export function getDb(): Database {
  if (!database) {
    database = drizzle(getClient(), { schema });
  }
  return database;
}

export { schema };
