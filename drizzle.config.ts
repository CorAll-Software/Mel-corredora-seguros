import { defineConfig } from 'drizzle-kit';

// Genera las migraciones SQL a partir de src/server/db/schema.ts (`npm run db:generate`).
// Se aplican con `npm run db:migrate`, que usa la misma conexión que la web.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/server/db/schema.ts',
  out: './src/server/db/migrations',
});
