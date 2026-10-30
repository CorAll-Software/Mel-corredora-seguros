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

// Cuenta administradora del panel /admin (issue #40). Se crea con el seed.
export const adminUsuarios = sqliteTable('admin_usuarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  nombre: text('nombre').notNull(),
  passwordHash: text('password_hash').notNull(),
  ultimoIngreso: integer('ultimo_ingreso', { mode: 'timestamp' }),
  createdAt: createdAt(),
});

// Sesiones por cookie. `ambito` separa las del panel ('admin') de las del portal
// de clientes ('portal'). Se guarda solo el hash del token, nunca el token.
export const sesiones = sqliteTable('sesiones', {
  id: text('id').primaryKey(),
  ambito: text('ambito').notNull(),
  usuarioId: integer('usuario_id').notNull(),
  expiraEn: integer('expira_en', { mode: 'timestamp' }).notNull(),
  createdAt: createdAt(),
});

// Intentos fallidos de inicio de sesión, para limitar ataques de fuerza bruta.
export const intentosLogin = sqliteTable('intentos_login', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ambito: text('ambito').notNull(),
  // IP o identificador (correo/RUC) que falló.
  clave: text('clave').notNull(),
  createdAt: createdAt(),
});

// Recomendaciones de clientes (issue #41). Nada se publica sin aprobación:
// toda recomendación nueva entra como 'pendiente'.
export const recomendaciones = sqliteTable('recomendaciones', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  empresaCargo: text('empresa_cargo'),
  // Clave de RECOMENDACION_SEGUROS (src/core/models/recomendacion.model.ts).
  seguro: text('seguro').notNull(),
  estrellas: integer('estrellas').notNull(),
  texto: text('texto').notNull(),
  // Clave del archivo WebP en el almacenamiento (src/server/storage.ts).
  fotoKey: text('foto_key'),
  // 'pendiente' | 'aprobada' | 'rechazada'
  estado: text('estado').notNull().default('pendiente'),
  idioma: text('idioma').notNull().default('es'),
  ip: text('ip'),
  createdAt: createdAt(),
});

// Envíos de formularios públicos por IP, para el límite anti-spam.
export const limitesEnvio = sqliteTable('limites_envio', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ambito: text('ambito').notNull(),
  clave: text('clave').notNull(),
  createdAt: createdAt(),
});
