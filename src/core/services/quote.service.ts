import { INSURANCE_TYPE_LABELS, type QuoteDraft } from '../models/quote.model';
import { registrarSolicitud } from './solicitudes.client';

let lastQuote: QuoteDraft | null = null;

export const QuoteService = {
  // Guarda la cotización en la bandeja de Melanie (issue #47) antes de mostrar
  // el botón de WhatsApp. No espera la respuesta: si falla, el flujo sigue igual.
  submitQuote(draft: QuoteDraft): void {
    lastQuote = draft;
    registrarSolicitud({
      origen: 'cotizador',
      ramo: INSURANCE_TYPE_LABELS[draft.productType],
      nombre: draft.contactName,
      telefono: draft.contactPhone,
      correo: draft.contactEmail,
      datos: [
        { label: 'RUC', value: draft.ruc },
        { label: 'Empresa', value: draft.businessName },
        { label: 'Actividad', value: draft.actividad },
        { label: 'Trabajadores', value: String(draft.workersCount) },
        { label: 'Planilla mensual', value: `S/ ${draft.planillaMensual.toLocaleString('es-PE')}` },
        ...(draft.urgencyForCheckpoint ? [{ label: 'Pase de garita urgente', value: 'Sí, emisión express para hoy' }] : []),
      ],
      idioma: 'es',
      acepta: true,
    });
  },

  getLastQuote(): QuoteDraft | null {
    return lastQuote;
  },
};
