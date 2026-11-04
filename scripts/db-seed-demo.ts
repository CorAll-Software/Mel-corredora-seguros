import { getClient, getDb, schema } from '../src/server/db/client';
import { SERVER_ENV } from '../src/server/env';
import { documentosService, portalService } from '../src/server/portal';
import { eq } from 'drizzle-orm';

// Datos de la DEMO (issue #52, npm run db:seed:demo). Se corre después de
// npm run db:setup y solo en la base de la demo, nunca en producción:
// - Una empresa de prueba del portal, marcada como tal, con una constancia SCTR
//   de ejemplo. Su clave temporal se muestra UNA vez en la consola para pasarla
//   por un canal privado; no queda en el repositorio.
// - Comprueba que no haya recomendaciones publicadas: en la demo se crea una en vivo.
// Es idempotente: si la empresa ya existe, no la vuelve a crear.

const EMPRESA = {
  ruc: '20999999991',
  razonSocial: 'Empresa de Prueba DEMO S.A.C.',
  contacto: 'Cliente de prueba (demo)',
  correo: '',
};

// PDF mínimo válido (una página con texto) para la constancia de ejemplo.
function pdfDeEjemplo(lineas: string[]): Uint8Array {
  const texto = lineas
    .map((l, i) => `BT /F1 ${i === 0 ? 18 : 12} Tf 72 ${760 - i * 28} Td (${l.replace(/[()\\]/g, '')}) Tj ET`)
    .join('\n');
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(texto, 'latin1')} >>\nstream\n${texto}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objetos.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf, 'latin1'));
}

function fechaLima(desplazamientoDias = 0): string {
  const fecha = new Date(Date.now() + desplazamientoDias * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(fecha);
}

async function main(): Promise<void> {
  if (SERVER_ENV.isProduction && SERVER_ENV.read('DEMO_MODE') !== '1') {
    throw new Error('Esto carga datos de prueba: solo en la base de la demo (DEMO_MODE=1).');
  }
  console.log(`[db:seed:demo] base de datos: ${SERVER_ENV.databaseUrl}`);

  const existente = (await portalService.listar()).find((c) => c.ruc === EMPRESA.ruc);
  if (existente) {
    console.log(`[db:seed:demo] la empresa de prueba ya existe (RUC ${EMPRESA.ruc}). Para otra clave temporal: panel → Clientes del portal.`);
  } else {
    const cuenta = await portalService.crear(EMPRESA, null);
    if (!cuenta.ok) {
      throw new Error(`Empresa de prueba inválida: ${JSON.stringify(cuenta.errores)}`);
    }
    const desde = fechaLima();
    const hasta = fechaLima(365);
    const pdf = pdfDeEjemplo([
      'CONSTANCIA SCTR - DOCUMENTO DE EJEMPLO',
      'Solo para la demostracion del portal de clientes.',
      `Empresa: ${EMPRESA.razonSocial}  -  RUC ${EMPRESA.ruc}`,
      `Vigencia: ${desde} al ${hasta}`,
      'No tiene validez ante ninguna aseguradora ni garita.',
    ]);
    const doc = await documentosService.subir(
      cuenta.cuenta.id,
      { tipo: 'constancia-sctr', nombre: 'Ejemplo demo', vigenciaDesde: desde, vigenciaHasta: hasta },
      { bytes: pdf },
      null,
    );
    if (!doc.ok) {
      throw new Error(`Constancia de ejemplo inválida: ${JSON.stringify(doc.errores)}`);
    }
    console.log(`[db:seed:demo] empresa de prueba creada: ${EMPRESA.razonSocial} (RUC ${EMPRESA.ruc}) con una constancia de ejemplo.`);
    console.log(`[db:seed:demo] clave temporal (compártela por un canal privado; se cambia al primer ingreso): ${cuenta.claveTemporal}`);
  }

  const publicadas = await getDb()
    .select({ id: schema.recomendaciones.id })
    .from(schema.recomendaciones)
    .where(eq(schema.recomendaciones.estado, 'aprobada'));
  console.log(
    publicadas.length === 0
      ? '[db:seed:demo] recomendaciones publicadas: ninguna (correcto: se crea una en vivo).'
      : `[db:seed:demo] ATENCIÓN: hay ${publicadas.length} recomendación(es) publicada(s); revisa que sean reales.`,
  );
  getClient().close();
}

main().catch((error) => {
  console.error('[db:seed:demo] error:', error);
  process.exit(1);
});
