import { and, count, desc, eq, getTableColumns } from 'drizzle-orm';
import type { RecomendacionEstado } from '../../core/models/recomendacion.model';
import { getDb, schema } from '../db/client';

export type NuevaRecomendacion = Omit<typeof schema.recomendaciones.$inferInsert, 'id' | 'estado' | 'createdAt'>;
export type Recomendacion = typeof schema.recomendaciones.$inferSelect & { revisadoPorNombre: string | null };
export type AccionModeracion = 'aprobada' | 'rechazada' | 'despublicada' | 'editada';

// Datos de una recomendación aprobada que pueden mostrarse en la página pública
// (sin IP ni datos internos). El texto es el corregido por Melanie si existe.
export interface RecomendacionPublica {
  id: number;
  nombre: string;
  empresaCargo: string | null;
  seguro: string;
  estrellas: number;
  texto: string;
  conFoto: boolean;
  fecha: Date;
}

const r = schema.recomendaciones;

async function registrar(recomendacionId: number, accion: AccionModeracion, adminId: number): Promise<void> {
  await getDb().insert(schema.recomendacionesHistorial).values({ recomendacionId, accion, adminId });
}

// Cambia el estado solo si la recomendación está en el estado esperado; devuelve
// false si no (por ejemplo, otra pestaña ya la había movido).
async function moverEstado(id: number, desde: RecomendacionEstado[], hacia: RecomendacionEstado, adminId: number, accion: AccionModeracion): Promise<boolean> {
  const actual = await RecomendacionesRepository.obtener(id);
  if (!actual || !desde.includes(actual.estado as RecomendacionEstado)) {
    return false;
  }
  await getDb()
    .update(r)
    .set({ estado: hacia, revisadoPor: adminId, revisadoEn: new Date() })
    .where(and(eq(r.id, id), eq(r.estado, actual.estado)));
  await registrar(id, accion, adminId);
  return true;
}

export const RecomendacionesRepository = {
  // Toda recomendación nueva queda pendiente de la aprobación de Melanie.
  async crear(data: NuevaRecomendacion): Promise<number> {
    const [row] = await getDb()
      .insert(r)
      .values({ ...data, estado: 'pendiente' })
      .returning({ id: r.id });
    return row.id;
  },

  async contarPorEstado(estado: RecomendacionEstado): Promise<number> {
    const [row] = await getDb().select({ total: count() }).from(r).where(eq(r.estado, estado));
    return row?.total ?? 0;
  },

  async listar(estado: RecomendacionEstado): Promise<Recomendacion[]> {
    return getDb()
      .select({ ...getTableColumns(r), revisadoPorNombre: schema.adminUsuarios.nombre })
      .from(r)
      .leftJoin(schema.adminUsuarios, eq(schema.adminUsuarios.id, r.revisadoPor))
      .where(eq(r.estado, estado))
      .orderBy(desc(r.createdAt), desc(r.id));
  },

  async obtener(id: number): Promise<Recomendacion | undefined> {
    const [row] = await getDb()
      .select({ ...getTableColumns(r), revisadoPorNombre: schema.adminUsuarios.nombre })
      .from(r)
      .leftJoin(schema.adminUsuarios, eq(schema.adminUsuarios.id, r.revisadoPor))
      .where(eq(r.id, id))
      .limit(1);
    return row;
  },

  aprobar(id: number, adminId: number): Promise<boolean> {
    return moverEstado(id, ['pendiente', 'rechazada'], 'aprobada', adminId, 'aprobada');
  },

  rechazar(id: number, adminId: number): Promise<boolean> {
    return moverEstado(id, ['pendiente'], 'rechazada', adminId, 'rechazada');
  },

  // Quita una aprobada de la página y la devuelve a Pendientes para revisarla otra vez.
  despublicar(id: number, adminId: number): Promise<boolean> {
    return moverEstado(id, ['aprobada'], 'pendiente', adminId, 'despublicada');
  },

  // Guarda la versión corregida sin tocar el texto original. Si queda igual al
  // original, se descarta la edición.
  async editarTexto(id: number, texto: string, adminId: number): Promise<boolean> {
    const actual = await this.obtener(id);
    if (!actual) {
      return false;
    }
    const textoEditado = texto === actual.texto ? null : texto;
    await getDb().update(r).set({ textoEditado, revisadoPor: adminId, revisadoEn: new Date() }).where(eq(r.id, id));
    await registrar(id, 'editada', adminId);
    return true;
  },

  // Solo las aprobadas llegan a la página pública (issue #43 las muestra).
  async listarAprobadas(): Promise<RecomendacionPublica[]> {
    const rows = await getDb()
      .select({
        id: r.id,
        nombre: r.nombre,
        empresaCargo: r.empresaCargo,
        seguro: r.seguro,
        estrellas: r.estrellas,
        texto: r.texto,
        textoEditado: r.textoEditado,
        fotoKey: r.fotoKey,
        fecha: r.createdAt,
      })
      .from(r)
      .where(eq(r.estado, 'aprobada'))
      .orderBy(desc(r.revisadoEn), desc(r.id));
    return rows.map(({ textoEditado, fotoKey, texto, ...rest }) => ({ ...rest, texto: textoEditado ?? texto, conFoto: fotoKey !== null }));
  },
};
