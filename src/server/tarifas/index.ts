import { getDb } from '../db/client';
import { DrizzleTarifasRepository } from './drizzle-tarifas.repository';
import { TarifasService } from './tarifas.service';

// Punto de composición del módulo de tarifas: une el caso de uso con su
// adaptador de base de datos. El resto del sitio importa solo `tarifasService`.
export const tarifasService = new TarifasService(new DrizzleTarifasRepository(getDb));

export type { TarifaConEstado, ResultadoImportacion, ErrorImportacion } from './tarifas.service';
