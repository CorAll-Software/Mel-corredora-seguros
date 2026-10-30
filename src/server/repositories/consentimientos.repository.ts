import { getDb, schema } from '../db/client';

export interface ConsentimientoInput {
  origen: string;
  referenciaId?: number;
  tipo: string;
  textoAceptado: string;
  ip?: string;
}

// Registro del consentimiento (Ley 29733) con el texto exacto que la persona aceptó.
export const ConsentimientosRepository = {
  async registrar(entries: ConsentimientoInput[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }
    await getDb().insert(schema.consentimientos).values(entries);
  },
};
