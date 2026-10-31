import { count, desc, eq } from 'drizzle-orm';
import type { Documento, DocumentoInput, TipoDocumento } from '../../core/portal/documento';
import { schema, type Database } from '../db/client';
import type { DocumentosRepository } from './documentos.repository';

// Adaptador de DocumentosRepository sobre SQLite/libSQL con Drizzle.

type Row = typeof schema.documentosPortal.$inferSelect;
const d = schema.documentosPortal;

function toDomain(row: Row): Documento {
  return {
    id: row.id,
    clienteId: row.clienteId,
    tipo: row.tipo as TipoDocumento,
    nombre: row.nombre,
    vigenciaDesde: row.vigenciaDesde,
    vigenciaHasta: row.vigenciaHasta,
    archivoKey: row.archivoKey,
    tamano: row.tamano,
    createdAt: row.createdAt,
  };
}

export class DrizzleDocumentosRepository implements DocumentosRepository {
  constructor(private readonly db: () => Database) {}

  async crear(clienteId: number, datos: DocumentoInput, archivo: { key: string; tamano: number }, adminId: number | null) {
    const [row] = await this.db()
      .insert(d)
      .values({ ...datos, clienteId, archivoKey: archivo.key, tamano: archivo.tamano, subidoPor: adminId })
      .returning();
    return toDomain(row!);
  }

  async obtener(id: number) {
    const [row] = await this.db().select().from(d).where(eq(d.id, id)).limit(1);
    return row && toDomain(row);
  }

  async listarPorCliente(clienteId: number) {
    const rows = await this.db().select().from(d).where(eq(d.clienteId, clienteId)).orderBy(desc(d.vigenciaHasta), desc(d.id));
    return rows.map(toDomain);
  }

  async contarPorCliente() {
    const rows = await this.db().select({ clienteId: d.clienteId, total: count() }).from(d).groupBy(d.clienteId);
    return Object.fromEntries(rows.map((r) => [r.clienteId, r.total]));
  }

  async eliminar(id: number) {
    const rows = await this.db().delete(d).where(eq(d.id, id)).returning({ id: d.id });
    return rows.length > 0;
  }
}
