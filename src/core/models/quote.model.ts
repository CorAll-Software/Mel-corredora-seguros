export type InsuranceType = 'sctr_salud' | 'sctr_pension' | 'sctr_integral' | 'vida_ley';

export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  sctr_salud: 'SCTR Salud',
  sctr_pension: 'SCTR Pensión',
  sctr_integral: 'SCTR Integral',
  vida_ley: 'Seguro Vida Ley',
};

export interface QuoteDraft {
  productType: InsuranceType;
  ruc: string;
  businessName: string;
  actividad: string;
  workersCount: number;
  planillaMensual: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  urgencyForCheckpoint: boolean;
}

// Texto de la casilla de consentimiento del cotizador (solo en español). El
// servidor registra este mismo texto al guardar la solicitud (Ley 29733).
export const COTIZADOR_CONSENTIMIENTO =
  'Acepto que mis datos personales se usen únicamente para responder esta cotización, conforme a la política de privacidad de la corredora.';
