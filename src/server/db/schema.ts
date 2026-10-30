import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Esquema de la base de datos (SQLite / libSQL + Drizzle). Cada issue del hito
// m5-demo-funcional añade aquí sus tablas y genera su migración con
// `npm run db:generate`.

const createdAt = () =>
  integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`);

// Datos internos de la aplicación (por ejemplo, cuándo se ejecutó el seed).
export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Ley 29733: cada formulario que guarda datos registra aquí el consentimiento
// aceptado (texto exacto, fecha e IP) y a qué registro corresponde.
export const consentimientos = sqliteTable('consentimientos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Formulario de origen: 'recomendacion', 'solicitud', 'portal'…
  origen: text('origen').notNull(),
  // Id del registro guardado en la tabla del formulario.
  referenciaId: integer('referencia_id'),
  // Clave del consentimiento ('datos-personales', 'publicacion'…).
  tipo: text('tipo').notNull(),
  textoAceptado: text('texto_aceptado').notNull(),
  ip: text('ip'),
  createdAt: createdAt(),
});

// Registro de cada aviso por correo (issue #39): permite ver en el panel si un
// envío falló sin que el fallo rompa el guardado del formulario.
export const enviosCorreo = sqliteTable('envios_correo', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tipo: text('tipo').notNull(),
  destinatario: text('destinatario').notNull(),
  asunto: text('asunto').notNull(),
  proveedor: text('proveedor').notNull(),
  // 'enviado' | 'consola' | 'error'
  estado: text('estado').notNull(),
  error: text('error'),
  createdAt: createdAt(),
});
