import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import type { CuentaInput, CuentaPortal } from '../../core/portal/cuenta';
import { schema, type Database } from '../db/client';
import type { CuentaConClave, PortalRepository } from './portal.repository';

// Adaptador de PortalRepository sobre SQLite/libSQL con Drizzle.

type Row = typeof schema.clientesPortal.$inferSelect;
const c = schema.clientesPortal;
const t = schema.portalTokens;

function toDomain(row: Row): CuentaPortal {
  return {
    id: row.id,
    ruc: row.ruc,
    razonSocial: row.razonSocial,
    contacto: row.contacto,
    correo: row.correo,
    debeCambiarClave: row.debeCambiarClave,
    activo: row.activo,
    ultimoIngreso: row.ultimoIngreso,
    createdAt: row.createdAt,
  };
}

function conClave(row: Row | undefined): CuentaConClave | undefined {
  return row && { ...toDomain(row), passwordHash: row.passwordHash };
}

export class DrizzlePortalRepository implements PortalRepository {
  constructor(private readonly db: () => Database) {}

  async crear(datos: CuentaInput, passwordHash: string, adminId: number | null): Promise<CuentaPortal> {
    const [row] = await this.db()
      .insert(c)
      .values({ ...datos, passwordHash, creadoPor: adminId })
      .returning();
    return toDomain(row!);
  }

  async buscarPorRuc(ruc: string) {
    const [row] = await this.db().select().from(c).where(eq(c.ruc, ruc)).limit(1);
    return conClave(row);
  }

  async buscarPorId(id: number) {
    const [row] = await this.db().select().from(c).where(eq(c.id, id)).limit(1);
    return conClave(row);
  }

  async listar() {
    const rows = await this.db().select().from(c).orderBy(desc(c.createdAt), desc(c.id));
    return rows.map(toDomain);
  }

  async guardarClave(id: number, passwordHash: string, debeCambiar: boolean) {
    const rows = await this.db().update(c).set({ passwordHash, debeCambiarClave: debeCambiar }).where(eq(c.id, id)).returning({ id: c.id });
    return rows.length > 0;
  }

  async cambiarActivo(id: number, activo: boolean) {
    const rows = await this.db().update(c).set({ activo }).where(eq(c.id, id)).returning({ id: c.id });
    return rows.length > 0;
  }

  async registrarIngreso(id: number) {
    await this.db().update(c).set({ ultimoIngreso: new Date() }).where(eq(c.id, id));
  }

  async guardarToken(clienteId: number, tokenHash: string, expiraEn: Date) {
    await this.db().delete(t).where(eq(t.clienteId, clienteId));
    await this.db().insert(t).values({ clienteId, tokenHash, expiraEn });
  }

  async consumirToken(tokenHash: string, ahora: Date) {
    const rows = await this.db()
      .update(t)
      .set({ usadoEn: ahora })
      .where(and(eq(t.tokenHash, tokenHash), isNull(t.usadoEn), gt(t.expiraEn, ahora)))
      .returning({ clienteId: t.clienteId });
    return rows[0]?.clienteId ?? null;
  }
}
