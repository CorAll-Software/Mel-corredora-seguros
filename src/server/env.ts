import { existsSync } from 'node:fs';

// Variables de entorno del servidor (issue #38). Se leen de process.env para que
// funcionen igual en `astro dev`, en el servidor Node ya construido y en los
// scripts de base de datos (tsx). Si existe `.env`, se carga una sola vez sin
// pisar lo que ya venga del sistema.
if (existsSync('.env')) {
  try {
    process.loadEnvFile('.env');
  } catch {
    // .env ilegible: se continúa con las variables del sistema.
  }
}

function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export const SERVER_ENV = {
  // libSQL: `file:` en desarrollo, `libsql://…` (Turso) en la demo publicada.
  databaseUrl: read('DATABASE_URL') ?? 'file:./data/mel.db',
  databaseAuthToken: read('DATABASE_AUTH_TOKEN'),
  isProduction: process.env.NODE_ENV === 'production',
  read,
};
