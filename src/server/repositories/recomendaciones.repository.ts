import { count, eq } from 'drizzle-orm';
import type { RecomendacionEstado } from '../../core/models/recomendacion.model';
import { getDb, schema } from '../db/client';

export type NuevaRecomendacion = Omit<typeof schema.recomendaciones.$inferInsert, 'id' | 'estado' | 'createdAt'>;

export const RecomendacionesRepository = {
  // Toda recomendación nueva queda pendiente de la aprobación de Melanie.
  async crear(data: NuevaRecomendacion): Promise<number> {
    const [row] = await getDb()
      .insert(schema.recomendaciones)
      .values({ ...data, estado: 'pendiente' })
      .returning({ id: schema.recomendaciones.id });
    return row.id;
  },

  async contarPorEstado(estado: RecomendacionEstado): Promise<number> {
    const [row] = await getDb().select({ total: count() }).from(schema.recomendaciones).where(eq(schema.recomendaciones.estado, estado));
    return row?.total ?? 0;
  },
};
