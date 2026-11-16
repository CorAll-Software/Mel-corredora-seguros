# Entorno de producción: variables y quién las entrega

Plantilla sin secretos: `.env.example`. Para producción se usa un `.env.produccion` local (ignorado por Git)
que se carga en el hosting; nunca se sube al repositorio. Contexto del despliegue: `docs/DESPLIEGUE-Y-RAMAS.md`.

## Ya definidas (no cambian)

`NODE_ENV=production`, `HOST`, `PORT`, `MAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
`SESSION_SECRET` (generada), `ADMIN_NAME`, `ADMIN_SESSION_HOURS`, `RETENCION_DESCARTADAS_DIAS`,
`BACKUP_CONSERVAR`.

## Por completar

| Variable | Quién la entrega | Nota |
| --- | --- | --- |
| `ALLOWED_HOSTS`, `SITE_URL` | CorAll (dominio) | Sin `https` en `ALLOWED_HOSTS`; definir antes del build. |
| `DATABASE_URL`, `DATABASE_AUTH_TOKEN` | CorAll (hosting/Turso) | No usar `data/mel.db` si el disco no persiste. |
| `STORAGE_DIR` | CorAll (hosting) | Carpeta persistente para fotos de opiniones. |
| `BACKUP_DIR` | CorAll (hosting) | Carpeta persistente para `npm run db:backup`. |
| `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_TO` | Melanie | Gmail con contraseña de aplicación, sin espacios. |
| `PUBLIC_GOOGLE_CALENDAR_URL` | Melanie | Definir antes del build; vacío = agendador por WhatsApp. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Alfredo | El seed falla en producción si faltan; contraseña de 12+ caracteres y distinta a la de prueba. |

## Orden en cada despliegue

1. Cargar las variables en el hosting y definir `PUBLIC_*` y `SITE_URL` antes del build.
2. `npm ci` y `npm run build`.
3. `npm run db:migrate`; `npm run db:seed` solo la primera vez.
4. `npm run serve` (o `node ./dist/server/entry.mjs`) sobre HTTPS.
