import { getClient } from '../src/server/db/client';
import { SERVER_ENV } from '../src/server/env';
import { solicitudesService } from '../src/server/solicitudes';

// Retención (issue #51): borra las solicitudes descartadas que superan
// RETENCION_DESCARTADAS_DIAS (180 por defecto). La bandeja lo hace sola al
// abrirse; esto sirve para programarlo en el servidor (npm run db:purgar).
async function main(): Promise<void> {
  const dias = SERVER_ENV.retencionDescartadasDias;
  const borradas = await solicitudesService.purgarDescartadas(dias);
  console.log(`[db:purgar] ${borradas} solicitud(es) descartada(s) con más de ${dias} días borrada(s).`);
  getClient().close();
}

main().catch((error) => {
  console.error('[db:purgar] error:', error);
  process.exit(1);
});
