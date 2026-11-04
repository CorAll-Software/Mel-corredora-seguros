import { and, eq, gt, lt } from 'drizzle-orm';
import { getDb, schema } from './db/client';

// Límite de envíos por IP para los formularios públicos (anti-spam sin captcha).

export interface RateLimitRule {
  ambito: string;
  max: number;
  windowMinutes: number;
}

export const RateLimit = {
  async isLimited(rule: RateLimitRule, key: string): Promise<boolean> {
    const since = new Date(Date.now() - rule.windowMinutes * 60_000);
    const rows = await getDb()
      .select({ id: schema.limitesEnvio.id })
      .from(schema.limitesEnvio)
      .where(and(eq(schema.limitesEnvio.ambito, rule.ambito), eq(schema.limitesEnvio.clave, key), gt(schema.limitesEnvio.createdAt, since)))
      .limit(rule.max);
    return rows.length >= rule.max;
  },

  async record(rule: RateLimitRule, key: string): Promise<void> {
    const db = getDb();
    await db.insert(schema.limitesEnvio).values({ ambito: rule.ambito, clave: key });
    // Limpieza oportunista de registros que ya no cuentan para ninguna ventana.
    const expired = new Date(Date.now() - 24 * 3600_000);
    await db.delete(schema.limitesEnvio).where(lt(schema.limitesEnvio.createdAt, expired));
  },
};
