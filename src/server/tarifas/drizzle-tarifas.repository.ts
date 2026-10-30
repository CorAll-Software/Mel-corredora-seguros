import { asc, count, eq, inArray } from 'drizzle-orm';
import type { RamoId } from '../../core/comparador/ramos';
import type { Tarifa, TarifaInput } from '../../core/comparador/tarifa';
import { schema, type Database } from '../db/client';
import type { TarifaGuardada, TarifasRepository } from './tarifas.repository';

// Adaptador de TarifasRepository sobre SQLite/libSQL con Drizzle.

type Row = typeof schema.tarifas.$inferSelect;
const t = schema.tarifas;

function toDomain(row: Row): Tarifa {
  return {
    id: row.id,
    ramo: row.ramo as Tarifa['ramo'],
    aseguradora: row.aseguradora,
    plan: row.plan,
    uso: row.uso,
    anioMin: row.anioMin,
    anioMax: row.anioMax,
    producto: row.producto,
    edadMin: row.edadMin,
    edadMax: row.edadMax,
    actividad: row.actividad,
    trabajadoresMin: row.trabajadoresMin,
    trabajadoresMax: row.trabajadoresMax,
    formula: row.formula as Tarifa['formula'],
    valor: row.valor,
    primaMinima: row.primaMinima,
    moneda: row.moneda as Tarifa['moneda'],
    periodo: row.periodo as Tarifa['periodo'],
    coberturas: parseCoberturas(row.coberturas),
    vigenciaDesde: row.vigenciaDesde,
    vigenciaHasta: row.vigenciaHasta,
    activa: row.activa,
    esEjemplo: row.esEjemplo,
    nota: row.nota,
    actualizadoEn: row.updatedAt,
  };
}

function parseCoberturas(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function toRow(datos: TarifaInput, adminId: number | null) {
  return { ...datos, coberturas: JSON.stringify(datos.coberturas), actualizadoPor: adminId, updatedAt: new Date() };
}

export class DrizzleTarifasRepository implements TarifasRepository {
  constructor(private readonly db: () => Database) {}

  async listar(filtro: { ramo?: RamoId } = {}): Promise<Tarifa[]> {
    const query = this.db().select().from(t);
    const rows = await (filtro.ramo ? query.where(eq(t.ramo, filtro.ramo)) : query).orderBy(asc(t.ramo), asc(t.aseguradora), asc(t.plan), asc(t.id));
    return rows.map(toDomain);
  }

  async obtener(id: number): Promise<Tarifa | undefined> {
    const [row] = await this.db().select().from(t).where(eq(t.id, id)).limit(1);
    return row ? toDomain(row) : undefined;
  }

  async existen(ids: number[]): Promise<Set<number>> {
    if (ids.length === 0) {
      return new Set();
    }
    const rows = await this.db().select({ id: t.id }).from(t).where(inArray(t.id, ids));
    return new Set(rows.map((row) => row.id));
  }

  async crear(datos: TarifaInput, adminId: number | null): Promise<Tarifa> {
    const [row] = await this.db().insert(t).values(toRow(datos, adminId)).returning();
    return toDomain(row);
  }

  async actualizar(id: number, datos: TarifaInput, adminId: number | null): Promise<Tarifa | undefined> {
    const [row] = await this.db().update(t).set(toRow(datos, adminId)).where(eq(t.id, id)).returning();
    return row ? toDomain(row) : undefined;
  }

  async cambiarActiva(id: number, activa: boolean, adminId: number | null): Promise<boolean> {
    const rows = await this.db().update(t).set({ activa, actualizadoPor: adminId, updatedAt: new Date() }).where(eq(t.id, id)).returning({ id: t.id });
    return rows.length > 0;
  }

  async guardarVarias(items: TarifaGuardada[], adminId: number | null): Promise<{ creadas: number; actualizadas: number }> {
    let creadas = 0;
    let actualizadas = 0;
    await this.db().transaction(async (tx) => {
      for (const item of items) {
        if (item.id === undefined) {
          await tx.insert(t).values(toRow(item.datos, adminId));
          creadas++;
        } else {
          await tx.update(t).set(toRow(item.datos, adminId)).where(eq(t.id, item.id));
          actualizadas++;
        }
      }
    });
    return { creadas, actualizadas };
  }

  async contar(): Promise<number> {
    const [row] = await this.db().select({ total: count() }).from(t);
    return row?.total ?? 0;
  }
}
