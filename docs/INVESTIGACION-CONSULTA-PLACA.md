# Investigación: datos del vehículo por placa (issue #50)

Fecha: 2026-11-02 · Rama: `feat/50-consulta-placa`

## Pregunta

En la reunión 01, Melanie mostró una página de referencia donde "pones la placa del carro y te saca todos los datos"
(consulta vehicular de SUNARP). La pregunta es si el comparador puede autocompletar el ramo Vehicular/SOAT a partir de
la placa por una vía **oficial y permitida**, sin scraping y sin saltar captchas.

Hoy el comparador pide a mano lo que usa la tarifa: uso, marca, año y valor comercial
(`src/core/comparador/consulta.ts`, paso `vehiculo`).

## Opciones revisadas

| # | Vía | Qué ofrece | Costo | ¿Permitida para nosotros? |
|---|-----|-----------|-------|---------------------------|
| 1 | **Consulta Vehicular SUNARP** (consultavehicular.sunarp.gob.pe) | Marca, modelo, color, serie, motor, estado y propietarios, como imagen | Gratis | Solo para una persona que la usa a mano. Tiene captcha y no es una API: automatizarla es scraping. **No.** |
| 2 | **Boleta Informativa Vehicular SUNARP** (SPRL o App Sunarp) | Reporte registral completo en PDF | Unos S/ 5–6 por boleta (verificar la tasa vigente en sprl.sunarp.gob.pe) | Oficial, pero es un trámite por vehículo con cuenta y pago. No es una API. **No sirve para autocompletar.** |
| 3 | **Convenio de interoperabilidad (PIDE / SUNARP)** | Servicio web oficial | — | Está pensado para entidades públicas. No encontré un canal ni una tarifa para una corredora privada. **No disponible.** |
| 4 | **APIs de terceros** (VerificaID, JSON.pe, API Perú, Consulta Datos, Apitude, etc.) | JSON con marca, modelo, serie, motor y, a veces, propietario, SOAT o papeletas | Por créditos o bolsas. Ej.: un plan de S/ 100 al mes por unas 3 900 consultas; JSON.pe cobra 5 créditos por consulta | Ninguno declara un convenio con SUNARP. VerificaID dice que automatiza la consulta pública y lee la imagen con IA, es decir, supera el captcha de un servicio público. **No cumple el criterio de la issue y tiene riesgo legal.** |
| 5 | **SOAT por placa** (SBS reportesoat, APESEG, SMS 90900) | Vigencia del SOAT y aseguradora | Gratis | Son consultas para personas, sin API pública. Melanie puede usarlas a mano al atender. **No para integrar.** |
| 6 | **Cotizadores de aseguradoras** (Rimac, Pacífico, etc.) | — | — | Según lo revisado, también piden marca, modelo, año y valor a mano. La placa y el motor se piden recién al emitir la póliza. |

## Requisitos legales

- **Ley 29733 (datos personales):** la placa vincula al vehículo con su propietario, que es un dato personal. Guardar o
  mostrar al propietario exige una finalidad clara y consentimiento. Para cotizar no se necesita al propietario, solo
  marca, modelo y año.
- **Términos de uso de SUNARP:** la consulta gratuita es informativa y para uso manual. Automatizarla (bots o resolver
  el captcha) va contra su finalidad, y la issue lo prohíbe expresamente.
- **Proveedores de terceros:** antes de integrar cualquiera habría que exigir por escrito la fuente de los datos (un
  convenio con SUNARP o con el MTC), los términos, un contrato de encargo de tratamiento y su registro ante la ANPD.
  Ninguno lo publica.
- **Lineamientos SBS:** la cotización es referencial y la emisión la hace la aseguradora con los documentos del
  vehículo. Autocompletar no cambia eso.

## Recomendación y decisión

**Decisión: no se integra para la demo. Se deja preparado para más adelante.**

1. **Ahora:** el comparador sigue pidiendo marca, año y valor a mano. Son pocos campos y ya están contemplados.
2. **Preparado:** se agregó la interfaz `VehicleLookup` (`src/server/comparador/vehicle-lookup.ts`) con la
   implementación `SinConsultaVehicular`, que responde "sin datos". Si más adelante aparece una vía permitida, se cambia
   solo la implementación en `src/server/comparador/index.ts`, sin tocar el comparador.
   - La placa se valida y normaliza en el dominio (`src/core/comparador/vehiculo.ts`).
   - La interfaz solo devuelve los datos del vehículo, nunca al propietario.
3. **Más adelante (opcional):** retomar la integración solo si se cumple todo esto:
   - Un proveedor con convenio oficial demostrable (o un servicio web de SUNARP o el MTC abierto a privados).
   - Contrato y términos que permitan el uso comercial.
   - Un costo por consulta razonable para el volumen de Melanie.
4. **Mientras tanto:** Melanie puede usar a mano la Consulta Vehicular de SUNARP o la de SOAT al atender una solicitud,
   que es el uso permitido.

## Fuentes

- SUNARP, servicios en línea: https://www.sunarp.gob.pe/Servicios.asp
- Boleta informativa vehicular (SUNARP / gob.pe): https://scr.sunarp.gob.pe/boleta-informativa-vehicular/ ·
  https://www.gob.pe/22911-solicitar-boleta-informativa-vehicular
- Consulta vehicular gratuita, alcance informativo: https://tramitesperu.com/sunarp/consulta-vehicular/
- VerificaID, API que automatiza la consulta pública: https://verifica.id/consulta-vehicular-api/
- JSON.pe, API de placa por créditos: https://json.pe/api-placa
- API Perú, catálogo: https://apiperu.pe/apis/ · Consulta Datos, planes: https://www.consultadatos.com/
- SOAT por placa (APESEG, SBS): https://tramitesperu.com/sbs/consulta-soat/
- Cotizar seguro vehicular, datos que se piden: https://comparabien.com.pe/blog-consejos/como-cotizar-seguro-vehicular-online-y-ahorrar-realmente

*Los costos de terceros salen de sus páginas públicas al 2026-11-02 y pueden cambiar.*
