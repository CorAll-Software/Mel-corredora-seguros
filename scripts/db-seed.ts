import { getClient, getDb, schema } from '../src/server/db/client';
import { SERVER_ENV } from '../src/server/env';

// Datos iniciales (npm run db:seed). Es idempotente: se puede ejecutar varias veces.
// Cada issue añade aquí lo suyo. Nunca se crean recomendaciones ni datos de
// clientes inventados (regla "nada inventado").
async function main(): Promise<void> {
  console.log(`[db:seed] base de datos: ${SERVER_ENV.databaseUrl}`);
  const db = getDb();

  const now = new Date();
  await db
    .insert(schema.appMeta)
    .values({ key: 'seeded_at', value: now.toISOString(), updatedAt: now })
    .onConflictDoUpdate({ target: schema.appMeta.key, set: { value: now.toISOString(), updatedAt: now } });

  console.log('[db:seed] listo.');
  getClient().close();
}

main().catch((error) => {
  console.error('[db:seed] error:', error);
  process.exit(1);
});
