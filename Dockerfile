# Imagen de la demo y de producción (issue #52): un solo servidor Node con la
# página, el panel y el portal. La base SQLite y los archivos subidos viven en
# el volumen /app/data, así sobreviven a cada actualización de la imagen.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Dominio(s) de la demo, separados por coma (ver astro.config.mjs).
ARG ALLOWED_HOSTS=""
ENV ALLOWED_HOSTS=$ALLOWED_HOSTS
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
# node_modules completo: los scripts de base de datos (migrar, seed, backup) usan tsx.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src ./src
VOLUME /app/data
EXPOSE 4321
# Aplica las migraciones pendientes y arranca el servidor con cabeceras de seguridad.
CMD ["sh", "-c", "npx tsx scripts/db-migrate.ts && node scripts/server.mjs"]
