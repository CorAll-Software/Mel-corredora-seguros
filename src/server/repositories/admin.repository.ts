import { eq } from 'drizzle-orm';
import { getDb, schema } from '../db/client';

export type AdminUser = Pick<typeof schema.adminUsuarios.$inferSelect, 'id' | 'email' | 'nombre'>;

const PUBLIC_FIELDS = {
  id: schema.adminUsuarios.id,
  email: schema.adminUsuarios.email,
  nombre: schema.adminUsuarios.nombre,
};

export const AdminRepository = {
  async findByEmail(email: string) {
    const [row] = await getDb().select().from(schema.adminUsuarios).where(eq(schema.adminUsuarios.email, email.toLowerCase())).limit(1);
    return row;
  },

  async findById(id: number): Promise<AdminUser | undefined> {
    const [row] = await getDb().select(PUBLIC_FIELDS).from(schema.adminUsuarios).where(eq(schema.adminUsuarios.id, id)).limit(1);
    return row;
  },

  async touchLogin(id: number): Promise<void> {
    await getDb().update(schema.adminUsuarios).set({ ultimoIngreso: new Date() }).where(eq(schema.adminUsuarios.id, id));
  },

  // Crea la cuenta o actualiza su nombre y contraseña (usado por el seed).
  async upsert(email: string, nombre: string, passwordHash: string): Promise<void> {
    await getDb()
      .insert(schema.adminUsuarios)
      .values({ email: email.toLowerCase(), nombre, passwordHash })
      .onConflictDoUpdate({ target: schema.adminUsuarios.email, set: { nombre, passwordHash } });
  },
};
