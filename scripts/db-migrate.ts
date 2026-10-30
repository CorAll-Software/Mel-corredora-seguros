import { migrate } from 'drizzle-orm/libsql/migrator';
import { getClient, getDb } from '../src/server/db/client';
import { SERVER_ENV } from '../src/server/env';

// Aplica las migraciones pendientes de src/server/db/migrations (npm run db:migrate).
async function main(): Promise<void> {
  console.log(`[db:migrate] base de datos: ${SERVER_ENV.databaseUrl}`);
  await migrate(getDb(), { migrationsFolder: './src/server/db/migrations' });
  console.log('[db:migrate] migraciones aplicadas.');
  getClient().close();
}

main().catch((error) => {
  console.error('[db:migrate] error:', error);
  process.exit(1);
});
