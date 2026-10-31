import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import type {
  CambioEstado,
  Dato,
  EstadoSolicitud,
  Solicitud,
  SolicitudInput,
} from '../../core/solicitudes/solicitud';
import { schema, type Database } from '../db/client';
import type { SolicitudesRepository, SolicitudMeta } from './solicitudes.repository';

// Adaptador de SolicitudesRepository sobre SQLite/libSQL con Drizzle.

type Row = typeof schema.solicitudes.$inferSelect;
const s = schema.solicitudes;
const h = schema.solicitudesHistorial;

function toDomain(row: Row): Solicitud {
  return {
    id: row.id,
    origen: row.origen as Solicitud['origen'],
    ramo: row.ramo,
    nombre: row.nombre,
    telefono: row.telefono,
    correo: row.correo,
    datos: parseDatos(row.datos),
    aseguradora: row.aseguradora,
    prima: row.prima,
    estado: row.estado as EstadoSolicitud,
    notas: row.notas,
    idioma: row.idioma,
    createdAt: row.createdAt,
    estadoActualizadoEn: row.estadoActualizadoEn,
  };
}

function parseDatos(value: string): Dato[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(
          (d): d is Dato => typeof d?.label === 'string' && typeof d?.value === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

export class DrizzleSolicitudesRepository implements SolicitudesRepository {
  constructor(private readonly db: () => Database) {}

  async crear(datos: SolicitudInput, meta: SolicitudMeta): Promise<Solicitud> {
    const [row] = await this.db()
      .insert(s)
      .values({ ...datos, datos: JSON.stringify(datos.datos), idioma: meta.idioma, ip: meta.ip })
      .returning();
    return toDomain(row);
  }

  async obtener(id: number): Promise<Solicitud | undefined> {
    const [row] = await this.db().select().from(s).where(eq(s.id, id)).limit(1);
    return row ? toDomain(row) : undefined;
  }

  async listar(filtro: { estado?: EstadoSolicitud } = {}): Promise<Solicitud[]> {
    const query = this.db().select().from(s);
    const rows = await (filtro.estado ? query.where(eq(s.estado, filtro.estado)) : query).orderBy(
      desc(s.createdAt),
      desc(s.id),
    );
    return rows.map(toDomain);
  }

  async contarPorEstado(): Promise<Partial<Record<EstadoSolicitud, number>>> {
    const rows = await this.db()
      .select({ estado: s.estado, total: count() })
      .from(s)
      .groupBy(s.estado);
    return Object.fromEntries(rows.map((row) => [row.estado, row.total]));
  }

  async cambiarEstado(
    id: number,
    de: EstadoSolicitud,
    a: EstadoSolicitud,
    adminId: number | null,
  ): Promise<boolean> {
    return this.db().transaction(async (tx) => {
      const rows = await tx
        .update(s)
        .set({ estado: a, estadoActualizadoEn: new Date() })
        .where(and(eq(s.id, id), eq(s.estado, de)))
        .returning({ id: s.id });
      if (rows.length === 0) {
        return false;
      }
      await tx.insert(h).values({ solicitudId: id, estadoAnterior: de, estadoNuevo: a, adminId });
      return true;
    });
  }

  async guardarNotas(id: number, notas: string | null): Promise<boolean> {
    const rows = await this.db()
      .update(s)
      .set({ notas })
      .where(eq(s.id, id))
      .returning({ id: s.id });
    return rows.length > 0;
  }

  async historial(ids: number[]): Promise<CambioEstado[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.db()
      .select({
        solicitudId: h.solicitudId,
        de: h.estadoAnterior,
        a: h.estadoNuevo,
        adminNombre: schema.adminUsuarios.nombre,
        fecha: h.createdAt,
      })
      .from(h)
      .leftJoin(schema.adminUsuarios, eq(schema.adminUsuarios.id, h.adminId))
      .where(inArray(h.solicitudId, ids))
      .orderBy(asc(h.createdAt), asc(h.id));
    return rows.map((row) => ({
      ...row,
      de: row.de as EstadoSolicitud,
      a: row.a as EstadoSolicitud,
    }));
  }
}
