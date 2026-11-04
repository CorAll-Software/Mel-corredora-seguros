# Demo para Melanie: despliegue, datos y guion (issue #52)

Objetivo: mostrarle a Melanie una demo que **funcione de verdad**, de punta a punta, en una URL propia y con datos de
prueba claramente marcados.

## 1. Despliegue de la demo

La demo tiene **su propia base y su propio almacenamiento** (volumen Docker `mel-data`), separados de producción.

1. **Servidor:** un VPS o una plataforma con Docker y disco persistente (Railway, Fly.io, Render). En Vercel o Netlify
   no sirve tal como está, porque SQLite necesita disco.
2. **Variables:** en el servidor, copia `.env.example` a `.env.demo` y completa:
   - `SESSION_SECRET` (genera una nueva).
   - `ADMIN_EMAIL` y `ADMIN_PASSWORD` (12 caracteres o más, distinta de la de prueba).
   - El correo: `RESEND_API_KEY` y `MAIL_FROM`. Sin esto, los avisos solo salen en la consola.
   - `MAIL_TO`: el correo de Melanie, que recibe los avisos.

   `.env.demo` no se sube al repositorio.
3. **Levantar** con el dominio de la demo en `ALLOWED_HOSTS`. Sin él, Astro rechaza los formularios con un 403. Las
   migraciones se aplican solas al arrancar:
   ```bash
   ALLOWED_HOSTS=demo.tudominio.com docker compose up -d --build
   docker compose exec web npm run db:seed
   docker compose exec web npm run db:seed:demo
   ```
   `db:seed` crea la cuenta del panel y las tarifas de ejemplo (marcadas "Valor de ejemplo"). `db:seed:demo` crea la
   empresa de prueba del portal con una constancia SCTR de ejemplo y muestra **una vez** su clave temporal.
4. **HTTPS:** ponerlo detrás del proxy del proveedor o de Caddy/nginx con certificado. Las cookies seguras y HSTS lo
   necesitan.
5. **Copias:** programar `docker compose exec web npm run db:backup` cada noche (cron del servidor).

**Credenciales de la demo:** la cuenta del panel y la clave temporal de la empresa de prueba se comparten con Melanie
**por un canal privado** (WhatsApp directo o un gestor de claves). Nunca en el repositorio, en issues ni en PRs.

### Datos de la demo

| Dato | Estado en la demo |
| --- | --- |
| Tarifas del comparador | 35 tarifas **de ejemplo** (`esEjemplo`, con nota "Valor de ejemplo… reemplazar"), vigentes por un año |
| Empresa del portal | "Empresa de Prueba DEMO S.A.C.", RUC `20999999991`, con una constancia "Ejemplo demo" que dice que no tiene validez |
| Recomendaciones | **Ninguna publicada**: se crea una en vivo (recorrido 3). `db:seed:demo` avisa si hubiera alguna |
| Solicitudes | Vacía: se llena en el recorrido 1 |

## 2. Guion de presentación (unos 15 minutos)

Antes de empezar, abre dos ventanas: la página pública y, en otra ventana privada, `/ingresar` con la cuenta del panel.

### Recorrido 1: Mepo → comparador → resultados → "cotízala conmigo"

1. En la página de inicio, mostrar a Mepo y el botón para cotizar. Entrar a **"¿Qué quieres cotizar?"** (`/comparar`).
2. Elegir **Vehicular** (o SCTR / Vida Ley) y completar el asistente: máximo 4 pasos y el contacto al final.
3. Mostrar los **resultados lado a lado por aseguradora** y explicar que son referenciales y salen de las tarifas que
   ella carga en su panel.
4. Pulsar **"Quiero esta, cotízala conmigo"**: se abre WhatsApp con el mensaje armado.

### Recorrido 2: la solicitud llega a la bandeja y al correo

1. En el panel, abrir **Solicitudes**: la del recorrido 1 aparece como **Nueva**, con la aseguradora y la prima elegidas.
2. Mostrar el **correo de aviso** que le llegó a Melanie.
3. Moverla a **Contactada**, escribir una nota y mostrar el historial. Mencionar la búsqueda y la exportación a Excel
   (CSV).
4. Mostrar las **tarifas** (`/admin/tarifas`): las de ejemplo están marcadas y ella las reemplaza por las reales.

### Recorrido 3: recomendación → aprobación → carrusel

1. En la página pública, entrar a **Recomendar** (`/recomendar`) y dejar una recomendación real de prueba: nombre,
   seguro, estrellas y comentario, con la casilla de publicación.
2. En el panel, **Recomendaciones**: aparece pendiente. Revisar el texto y **aprobarla**.
3. Volver a la página de inicio: la recomendación aparece en el **carrusel**.
4. Al terminar la demo, **eliminarla o rechazarla** para no dejar contenido de prueba publicado.

### Recorrido 4: el cliente entra al portal y descarga su constancia

1. En `/ingresar`, entrar con el **RUC `20999999991`** y la clave temporal. El portal pide crear una clave propia.
2. En **Mis documentos** aparece la constancia SCTR de ejemplo, vigente. Pulsar **Descargar**: el enlace es privado y
   vence a los 15 minutos.
3. Mostrar **Movimiento de planilla**: el pedido entra a la bandeja de Solicitudes del panel.
4. En el panel, **Clientes del portal → Documentos**: cómo sube ella una constancia nueva con su vigencia.
5. Opcional: `/solicitar-acceso` → el pedido llega a la bandeja con **"Crear cuenta"** y los datos ya cargados.

## 3. Checklist de QA (antes de la demo)

Probar en **celular** (Android o iPhone, unos 375 px) y en **computadora** (Chrome o Edge, 1280 px o más). Marcar con ✓.

| Revisión | Celular | Computadora |
| --- | :---: | :---: |
| La página de inicio carga sin errores y Mepo se ve bien | | |
| Selector de idioma: **ES, EN, FR, IT** cambian menú, secciones, pie y formularios | | |
| Recorrido 1 completo (comparador y WhatsApp) en ES | | |
| Comparador en EN, FR e IT: textos traducidos, sin claves sueltas tipo `comparador.fields…` | | |
| Formularios: errores visibles, la casilla de consentimiento es obligatoria, mensaje si se envía demasiado | | |
| Recorrido 2: bandeja y correo recibido | | |
| Recorrido 3: recomendación creada, aprobada y visible en el carrusel | | |
| Recorrido 4: ingreso con RUC, cambio de clave, descarga del PDF | | |
| `/ingresar`, panel y portal usables en pantalla chica (menús, tablas, botones) | | |
| Agenda de Google Calendar abre o se embebe bien | | |
| Pie: política de privacidad, portal y datos legales SBS visibles | | |
| HTTPS activo (candado) y `/admin` no accesible sin sesión | | |

Las páginas privadas (`/ingresar`, panel y portal) están solo en español. El selector de idioma aplica a la página
pública.

## 4. Lo que falta de Melanie para pasar a producción

Seguimiento central en la issue **#19**. Cada punto tiene su marca `TODO-*` en el código:

| Pendiente | Marca en el código | Issue |
| --- | --- | --- |
| Tarifas reales de cada aseguradora (reemplazar las de ejemplo) | `esEjemplo` en `/admin/tarifas` | #44 |
| Archivo del logo MEL | `TODO-LOGO-MEL` | #19, #14 |
| Logo oficial SBS para el pie | `TODO-LOGO-SBS` | #19 |
| Logos de aseguradoras faltantes | `TODO-LOGOS` | #19, #4 |
| URL de su LinkedIn (hoy es provisional) | `TODO-LINKEDIN` | #19, #15 |
| Videos por seguro (16:9) | `TODO-VIDEO` | #19, #8 |
| Detalles de los planes Esencial / Integral | `TODO-PLANES` | #19, #12 |
| Teléfonos de siniestros por aseguradora | `TODO-EMERGENCIAS` | #19, #13 |
| Imagen "Todo parte de un mismo lugar: tu bróker" | `TODO-BROKER-IMG` | #19, #14 |
| Texto literal de su presentación | `TODO-PRESENTACION` | #19, #14 |
| Perfil de Google para reseñas (opcional) | `TODO-GOOGLE-PERFIL` | #19 |
| Programación de citas de Google Calendar (URL en `PUBLIC_GOOGLE_CALENDAR_URL`) | `TODO-AGENDA` | #19 |
| Libro de Reclamaciones (página o enlace) | `TODO-LIBRO-RECLAMOS` | #19 |
| Tipo de cambio para la prima mínima | `TODO-TIPO-CAMBIO` | #46 |
| N° de inscripción del banco de datos ante la ANPD | `TODO-ANPD` | #51 |
| Dominio propio y correo verificado en Resend (para que los avisos le lleguen) | — | #39 |
| Clientes reales del portal y sus constancias | — | #48, #49 |
