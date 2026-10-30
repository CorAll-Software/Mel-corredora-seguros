# Landing · Mel — Corredora de Seguros

Sitio web de **Melanie O. Calderón Vega**, Corredora de Seguros persona natural · Registro SBS N-4050.

Landing en 4 idiomas (es/en/fr/it) con fichas por seguro, cotización por WhatsApp, agendamiento con Google Calendar y el asistente Mepo. Construida con:

- [Astro 7](https://astro.build) + islas [Preact](https://preactjs.com)
- Estilos en SCSS (tokens en `src/styles/global.scss`)
- Carrusel con [Embla](https://www.embla-carousel.com) · Iconos de [Lucide](https://lucide.dev)
- Diseño según el feedback oficial de Melanie: `.opencode/skills/landing-design/Mejoras para la página web — Melanie Calderón, Asesora de Seguros.md`

## Estado del proyecto

| Hitos | Contenido |
| --- | --- |
| Issues #4–#6 (M1) | Datos maestros SBS, sin promesas exactas, primera persona singular |
| Issues #7–#9 (M2) | Franja de aseguradoras, tarjetas simplificadas, Mepo + bienvenida |
| Issues #10–#13 (M3) | Ambiente de color, nueva ficha, carrusel de tipos, narrativas |
| Issues #14–#18 (M4) | Dos perfiles, Área de Riesgos Virtual, ¿Emergencia?, presentación, footer legal |

- **Bitácora técnica completa:** `docs/bitacora-issues.md` (leer primero en cada sesión)
- **Pendientes externos** (entregables de Melanie: logo MEL/SBS, teléfonos, videos, imágenes): issue [#19](https://github.com/Alfrog7/Landing/issues/19)
- Rama de pruebas con demos provisionales: PR [#35](https://github.com/Alfrog7/Landing/pull/35)

## Requisitos

- Node.js ≥ 22 (probado con Node 24)
- npm ≥ 11

## Desarrollo

```bash
npm install
npm run dev      # o: npm start
```

Abre http://localhost:4321/. La página se recarga sola al guardar cambios.

## Comandos

| Comando | Acción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en `localhost:4321` |
| `npm run build` | Construye la web: páginas prerenderizadas en `dist/client/` y servidor Node en `dist/server/` |
| `npm run preview` | Sirve la build para revisar la versión de producción |
| `npm run serve` | Arranca el servidor Node ya construido (`node ./dist/server/entry.mjs`) |
| `npm run check` | Verifica tipos de los archivos `.astro` y `.tsx` |
| `npm test` | Pruebas unitarias (`tests/*.test.ts`) |
| `npm run db:setup` | Aplica las migraciones y carga el seed (atajo de los dos siguientes) |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run db:seed` | Carga los datos iniciales (idempotente) |
| `npm run db:generate` | Genera una migración nueva tras cambiar `src/server/db/schema.ts` |
| `npm run mail:test` | Envía un correo de prueba con la configuración actual (o lo muestra en consola) |

## Servidor y base de datos

Desde el hito `m5-demo-funcional` la web es **híbrida**: la home y las páginas públicas siguen
prerenderizadas (HTML estático, igual de rápidas), y solo las rutas con `export const prerender = false`
(`/api/*`, `/admin/*` y el portal) se ejecutan en el servidor.

- **Adapter:** `@astrojs/node` en modo `standalone` (`astro.config.mjs`). Para desplegar en Vercel o Netlify
  basta instalar `@astrojs/vercel` o `@astrojs/netlify` y cambiar la línea `adapter:`; el resto no cambia.
- **Base de datos:** SQLite con [libSQL](https://github.com/tursodatabase/libsql) y
  [Drizzle ORM](https://orm.drizzle.team). En desarrollo es un archivo local (`data/mel.db`, fuera del repo);
  en la demo publicada, una base de [Turso](https://turso.tech).
- **Código del servidor:** `src/server/` (conexión y esquema en `db/`, acceso a datos en `repositories/`,
  validaciones con `zod` en `validation/`) y endpoints en `src/pages/api/`.
- **Errores:** todos los endpoints responden JSON: `{ ok: true, … }` o `{ ok: false, error, details? }`.
- **Salud:** `GET /api/health` → `{ "ok": true, "db": "up" }`.

### Primera vez (máquina limpia)

```bash
npm install
cp .env.example .env   # opcional: sin .env se usa file:./data/mel.db
npm run db:setup       # crea data/mel.db, aplica migraciones y carga el seed
npm run dev
```

### Variables de entorno

Todas están documentadas en `.env.example`. Ningún secreto va al repositorio (`.env` está en `.gitignore`).

| Variable | Para qué | Por defecto |
| --- | --- | --- |
| `DATABASE_URL` | Conexión libSQL: `file:./data/mel.db` en local o `libsql://…turso.io` en la demo | `file:./data/mel.db` |
| `DATABASE_AUTH_TOKEN` | Token de Turso (solo en la demo publicada) | — |
| `MAIL_PROVIDER` | `resend`, `smtp` o `console` | automático (ver abajo) |
| `RESEND_API_KEY` | API key de [Resend](https://resend.com) | — (sin ella, consola) |
| `MAIL_TO` | Destinatario de los avisos | `vivefelizviveseguro@gmail.com` |
| `MAIL_FROM` | Remitente | `Mel – Corredora de Seguros <onboarding@resend.dev>` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Envío por SMTP como alternativa a Resend | — |
| `SITE_URL` | URL pública del sitio, para los enlaces al panel en los correos | `http://localhost:4321` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Cuenta del panel que crea `npm run db:seed` (obligatorias en producción) | cuenta de prueba de `.env.example` en desarrollo |
| `SESSION_SECRET` | Clave para firmar las sesiones (obligatoria en producción) | clave de desarrollo |
| `ADMIN_SESSION_HOURS` | Duración de la sesión del panel | `12` |
| `STORAGE_DIR` | Carpeta de los archivos subidos (fotos de recomendaciones) | `./data/uploads` |
| `PUBLIC_GOOGLE_CALENDAR_URL` | Programación de citas de Google Calendar (ver más abajo) | programación de prueba |

### Panel privado de Melanie (`/admin`)

- `npm run db:seed` crea la cuenta administradora con `ADMIN_EMAIL` / `ADMIN_PASSWORD` (en desarrollo, si no
  están definidas, usa la cuenta de prueba que figura en `.env.example`). Volver a ejecutarlo actualiza la contraseña.
- Entra en `http://localhost:4321/admin`: sin sesión redirige a `/admin/login`.
- Contraseñas con hash argon2; sesión por cookie `httpOnly` + `sameSite=lax` (+ `secure` en producción) que
  vence a las `ADMIN_SESSION_HOURS` horas. En la base solo se guarda el HMAC del token.
- `src/middleware.ts` protege `/admin/*` y `/api/admin/*` (esta última responde `401` en JSON).
- Tras 5 intentos fallidos en 15 minutos (por IP o por correo) el login responde `429`.
- El panel lleva `noindex` (meta y cabecera `X-Robots-Tag`) y `robots.txt` lo excluye. Está solo en español:
  es la oficina de Melanie, no una página pública.
- Si añades `src/middleware.ts` con `npm run dev` ya en marcha, reinicia el servidor de desarrollo.

### Recomendaciones de clientes (`/recomendar`)

Formulario del informe de la tercera revisión (§3). La página es estática; el envío va a
`POST /api/recomendaciones` (multipart):

- Valida con `zod` (`src/server/validation/recomendacion.ts`) y comparte límites y lista de seguros con el
  formulario (`src/core/models/recomendacion.model.ts`).
- Guarda la recomendación **siempre como `pendiente`**: nada se publica sin la aprobación de Melanie.
- Registra los dos consentimientos (publicación y Ley 29733) con el texto exacto aceptado, su idioma e IP.
- Foto o logo opcional: se comprueba el formato real (JPG/PNG/WebP, máx. 2 MB), se convierte a WebP de 800 px
  como máximo sin metadatos y se guarda en `STORAGE_DIR` (nunca en `public/`).
- Anti-spam sin captcha: campo trampa y máximo 3 envíos por IP y hora (`429`).
- Avisa a Melanie con `notifyMelanie('recomendacion', …)`; el contador del inicio del panel muestra las pendientes.

**Moderación en el panel (`/admin/recomendaciones`):** pestañas Pendientes / Aprobadas / Rechazadas con
acciones Aprobar, Editar texto, Rechazar y Despublicar (vuelve a Pendientes).

- **Aviso SBS** (`src/core/sbs/sbs-words.ts`): resalta "nosotros", "ustedes", "equipo", "empresa", "S.A.C.",
  "agencia" y "grupo" (con variantes, sin importar tildes). Si aparecen, aprobar exige marcar "Ya revisé que
  se refiere a mí en singular".
- **Editar** guarda la versión corregida en `texto_editado`; el texto del cliente (`texto`) nunca se modifica.
- Cada acción queda en `recomendaciones_historial` (quién y cuándo) y la tarjeta muestra la última revisión.
- La foto se ve solo con sesión, desde `/api/admin/recomendaciones/:id/foto`.
- `RecomendacionesRepository.listarAprobadas()` devuelve solo las aprobadas, sin IP y con el texto corregido:
  es lo que usará la sección pública (#43).
- El enlace del correo (`?id=N`) abre la pestaña donde está esa recomendación y la resalta.

**Sección pública (`Testimonials.tsx`, entre "¿Por qué Melanie?" y la agenda):**

- Pide `GET /api/recomendaciones/aprobadas` al cargar la página (caché de 60 s), así una aprobación en el panel
  aparece sin volver a desplegar. Las fotos salen de `/api/recomendaciones/:id/foto`, que solo responde si la
  recomendación está aprobada.
- Sin aprobadas, solo se ve el botón "Sé el primero en dejar tu recomendación". Nunca hay testimonios de ejemplo.
- Con aprobadas: carrusel (Embla) con avance automático que se pausa con el cursor, el foco o "reducir
  movimiento"; flechas del teclado, puntos y botones; botón "Deja tu recomendación" hacia `/recomendar`.
- Datos estructurados `Review` (JSON-LD) solo cuando hay aprobadas reales.

### Tarifas referenciales del comparador (`/admin/tarifas`)

Las aseguradoras no ofrecen una API pública de precios, así que el comparador usa **tarifas referenciales que
Melanie mantiene** desde el panel (issue #44). Usa la tabla `tarifas` de la misma base SQLite.

**Arquitectura (capas, de adentro hacia afuera):**

| Capa | Dónde | Qué hace |
| --- | --- | --- |
| Dominio | `src/core/comparador/ramos.ts`, `tarifa.ts` | Ramos, aseguradoras por ramo, variables, reglas de validación y vigencia. Sin base de datos ni framework; lo reutiliza el comparador (#45/#46). |
| Casos de uso | `src/server/tarifas/tarifas.service.ts` | Listar, crear, editar, activar/desactivar, `listarVigentes(ramo)`, exportar e importar CSV (atómico). Depende solo del puerto. |
| Puerto | `src/server/tarifas/tarifas.repository.ts` | Interfaz `TarifasRepository`. |
| Infraestructura | `drizzle-tarifas.repository.ts`, `tarifas-csv.ts` | Adaptador Drizzle/libSQL y formato CSV. |
| Composición | `src/server/tarifas/index.ts` | Une servicio y adaptador: el resto del sitio importa `tarifasService`. |
| Presentación | `src/pages/admin/tarifas/*`, `src/components/admin/tarifas/*` | Pantallas del panel y conversión del formulario; sin reglas de negocio. |

- **Ramos v1** (reunión 01): SOAT (Mapfre, La Positiva) · Vehicular (Pacífico, Mapfre, Rímac, La Positiva,
  Quálitas) · Salud / EPS (Rímac, Pacífico, Mapfre, Sanitas; La Positiva solo EPS) · SCTR y Vida Ley (Rímac,
  Pacífico, Mapfre, La Positiva, Crecer; Protecta solo SCTR).
- **Cálculo:** monto fijo, monto por unidad (persona o trabajador) o porcentaje (del valor del vehículo o de la
  planilla mensual), con prima mínima opcional. Las condiciones vacías aplican a todos los casos.
- **Reglas:** toda tarifa tiene vigencia; las vencidas o desactivadas no se usan para cotizar. Se desactivan,
  no se borran.
- **CSV:** exportar → editar en Excel → importar sin pérdida (UTF-8 con BOM; acepta `,` o `;` y decimales con
  coma). Con `id` actualiza, sin `id` crea. Si una fila tiene errores no se importa nada y se indica línea y columna.
- **Seed:** `npm run db:seed` carga 35 tarifas **de ejemplo** (marcadas como tales) si la tabla está vacía; no
  pisa las que Melanie ya cargó.
- **Pruebas:** `npm test` (Node test runner + tsx) prueba reglas, vigencia y el CSV de ida y vuelta con un
  repositorio en memoria.

### Avisos por correo a Melanie

Todo aviso pasa por `notifyMelanie(tipo, datos)` (`src/server/mail.ts`), con plantillas HTML + texto plano en
`src/server/mail-templates.ts` (wordmark MEL + denominación legal; asuntos sin datos personales). Tipos:
`recomendacion`, `solicitud`, `portal` y `prueba`.

- **Proveedor:** Resend si hay `RESEND_API_KEY`; SMTP si hay `SMTP_HOST`; si no, el correo se **escribe en la
  consola** del servidor (modo desarrollo). `MAIL_PROVIDER` fuerza uno.
- **Nunca rompe un formulario:** si el envío falla, se registra en la tabla `envios_correo` (y en consola) y la
  función devuelve el error en vez de lanzarlo.
- **Vista previa (solo en `npm run dev`):** `http://localhost:4321/api/dev/correo?tipo=recomendacion`
  (también `solicitud`, `portal`, `prueba`).
- **Probar el envío real:** pon tu `RESEND_API_KEY` en `.env` y ejecuta `npm run mail:test`. Con el remitente
  `onboarding@resend.dev`, Resend solo entrega al correo de la cuenta; para enviar a Melanie hay que verificar un
  dominio y cambiar `MAIL_FROM`.

## Estructura

```text
src/
├── pages/        # Rutas (un archivo .astro por página)
├── layouts/      # BaseLayout (head, estilos globales) y MainLayout (navbar + footer)
├── components/
│   ├── landing/  # Hero, carrusel, fichas, Mepo, Área de Riesgos…
│   ├── layout/   # Navbar, Footer, EmergencyButton, WhatsAppFloat
│   └── ui/       # Accordion, iconos
├── core/
│   ├── config/   # brand.config, booking.config, emergency.config (fuentes únicas)
│   ├── data/     # landing.data (FAQ, campos de cotización, videos)
│   ├── i18n/     # diccionarios es/en/fr/it
│   ├── models/   # tipos
│   └── services/ # whatsapp.service (builders de mensajes + firma legal)
└── styles/       # global.scss + un .scss por componente
docs/             # Bitácora de issues y documentos de trabajo
public/           # Logos, imágenes, favicon y manifest
```

**Fuentes únicas de datos:** `brand.config.ts` (marca, contacto legal), `landing.data.ts` (FAQ, formularios, videos), `emergency.config.ts` (teléfonos de siniestros), `booking.config.ts` (Google Calendar). Los textos visibles viven en los diccionarios i18n.

## Agendar citas con Google Calendar

Las citas se pueden reservar directo en el Google Calendar de Melanie, con disponibilidad en tiempo real, sin dobles reservas e invitación por correo:

1. En [Google Calendar](https://calendar.google.com) (desde una computadora): **Crear → Programación de citas**. Define duración de **15 minutos**, horarios disponibles y que se cree un enlace de Google Meet.
2. Abre la programación creada → **Compartir** → **Añadir a tu sitio web** (o "Insertar") y copia el valor de `src` del iframe: `https://calendar.google.com/calendar/appointments/schedules/XXXX`.
3. Copia `.env.example` a `.env` y pega esa URL en `PUBLIC_GOOGLE_CALENDAR_URL`. Reinicia `npm run dev` o vuelve a construir.

Mientras se use la programación de prueba, el encabezado con el nombre de la cuenta queda recortado visualmente (`--gcal-crop-top` en `app-google-calendar.scss`). Con `PUBLIC_GOOGLE_CALENDAR_URL=""` se desactiva Google Calendar y se usa el agendador propio con confirmación por WhatsApp. Si solo tienes el enlace corto (`calendar.app.google/…`), ábrelo en el navegador: te lleva a la URL `calendar.google.com/calendar/appointments/schedules/…`, que es la que se usa para incrustar.

La variable se integra al compilar: si cambia, hay que volver a ejecutar `npm run build`.

## Idiomas

El sitio está en español, inglés, francés e italiano. El idioma se elige desde la barra de navegación y se guarda en `localStorage`; los textos viven en `src/core/i18n/dictionaries/`.

## Flujo de trabajo

1. Una issue → una rama `feat/issue-N-*` → PR hacia `develop` con `Closes #N` + etiqueta del milestone.
2. Tras el merge, **cerrar la issue manualmente** (la rama default es `main`; GitHub no auto-cierra contra `develop`).
3. Actualizar la tabla canónica de `docs/bitacora-issues.md`.
4. `develop` se integra a `main` cuando está estable.

Lecciones técnicas y cuidados (UTF-8, PowerShell, CRLF) en la bitácora.
