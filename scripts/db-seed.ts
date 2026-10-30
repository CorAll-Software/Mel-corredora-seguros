import { hashPassword } from '../src/server/auth';
import { getClient, getDb, schema } from '../src/server/db/client';
import { SERVER_ENV } from '../src/server/env';
import { AdminRepository } from '../src/server/repositories/admin.repository';

// Cuenta de prueba del panel para desarrollo: los mismos valores que .env.example.
// En producción no se usan: ADMIN_EMAIL y ADMIN_PASSWORD son obligatorios.
const DEV_ADMIN = { email: 'admin@mel.test', password: 'demo-mel-2026', nombre: 'Melanie O. Calderón Vega' };

async function seedAdmin(): Promise<void> {
  const email = SERVER_ENV.read('ADMIN_EMAIL') ?? (SERVER_ENV.isProduction ? undefined : DEV_ADMIN.email);
  const password = SERVER_ENV.read('ADMIN_PASSWORD') ?? (SERVER_ENV.isProduction ? undefined : DEV_ADMIN.password);
  const nombre = SERVER_ENV.read('ADMIN_NAME') ?? DEV_ADMIN.nombre;
  if (!email || !password) {
    throw new Error('Define ADMIN_EMAIL y ADMIN_PASSWORD para crear la cuenta del panel.');
  }
  if (SERVER_ENV.isProduction && (password === DEV_ADMIN.password || password.length < 12)) {
    throw new Error('En producción ADMIN_PASSWORD debe tener al menos 12 caracteres y no ser la de prueba.');
  }
  await AdminRepository.upsert(email, nombre, await hashPassword(password));
  console.log(`[db:seed] cuenta del panel lista: ${email}`);
}

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

  await seedAdmin();

  console.log('[db:seed] listo.');
  getClient().close();
}

main().catch((error) => {
  console.error('[db:seed] error:', error);
  process.exit(1);
});
