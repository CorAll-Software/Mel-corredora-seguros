export type FaqCategory = 'SCTR' | 'Seguro Vida Ley' | 'Rol del Broker' | 'Pases y Garitas';

export interface FaqItem {
  question: string;
  answer: string;
  category: FaqCategory;
}

export const FAQ_CATEGORIES: (FaqCategory | 'Todos')[] = [
  'Todos',
  'SCTR',
  'Seguro Vida Ley',
  'Rol del Broker',
  'Pases y Garitas',
];

export const FAQS: FaqItem[] = [
  {
    question: '¿El SCTR es obligatorio para mi empresa?',
    answer:
      'Sí, para las unidades de negocio incluidas en la lista del Decreto Supremo DS.009-97-TR (minería, construcción, electricidad y actividades de alto riesgo). La póliza debe estar emitida y vigente antes de que el personal ingrese a labores.',
    category: 'SCTR',
  },
  {
    question: '¿Qué diferencia hay entre SCTR Salud y SCTR Pensión?',
    answer:
      'SCTR Salud cubre la atención médica, hospitalaria y de rehabilitación del accidente o enfermedad profesional. SCTR Pensión ampara la invalidez total o parcial y la sobrevivencia (viudez y orfandad) del trabajador.',
    category: 'SCTR',
  },
  {
    question: '¿En cuánto tiempo puedo acceder a un pase de garita?',
    answer:
      'Trabajo emisiones con gestión ágil: una vez validada la planilla y el pago de prima, la constancia para garitas puede emitirse con las aseguradoras. Utiliza el botón de urgencia WhatsApp si tu ingreso es hoy.',
    category: 'Pases y Garitas',
  },
  {
    question: '¿El seguro Vida Ley es obligatorio para toda empresa en planilla?',
    answer:
      'Sí. El Seguro Vida Ley es obligatorio para todos los trabajadores que se encuentran en planilla desde su primer día de ingreso, incluso para los del régimen de módicos ingresos y los sancionados con suspensión perfecta de labores.',
    category: 'Seguro Vida Ley',
  },
  {
    question: '¿Qué coberturas otorga el Seguro Vida Ley?',
    answer:
      'Cubre muerte por cualquier causa, muerte accidental y expresamente doble indemnización en caso de fallecimiento en accidente, invalidez total y permanente conforme al Decreto Legislativo N° 817 y su reglamento.',
    category: 'Seguro Vida Ley',
  },
  {
    question: '¿Cuál es la ventaja de cotizar con una corredora de seguros persona natural?',
    answer:
      'La corredora persona natural licita tu riesgo ante múltiples aseguradoras, negocia primas y responde ante siniestros como agente del contratante, sin sobrecosto: las aseguradoras pagan la comisión según ley, sin afectar tu prima.',
    category: 'Rol del Broker',
  },
  {
    question: '¿Puedo incluir y excluir trabajadores mes a mes?',
    answer:
      'Sí. El SCTR y el Vida Ley se gestionan por planilla declarada con el T-Registro. Cada mes se movimentan altas y bajas; las delegaciones fluyen a las aseguradoras y los certificados individuales se emiten automáticamente.',
    category: 'Pases y Garitas',
  },
  {
    question: '¿Atiendes a empresas fuera de la lista de alto riesgo?',
    answer:
      'Sí. Para niveles de riesgo menores, el accidente laboral es cubierto por EsSalud, pero puedo cotizar Accidentes Personales y Responsabilidad Civil para contratistas y empresas subcontratistas, ampliando su respaldo contractual.',
    category: 'Rol del Broker',
  },
  {
    question: '¿Qué hago si un operario sufre un accidente en obra y no tenía constancia vigente?',
    answer:
      'Contacta de inmediato por el canal de soporte urgente para garitas. Como corredora activamos el bandejo de póliza, la constancia retroactiva conforme a la declaratoria de pago y el acompañamiento del caso ante la aseguradora.',
    category: 'Pases y Garitas',
  },
  {
    question: '¿Cobras adicional por el uso del portal de autogestión?',
    answer:
      'No. El portal de clientes, la emisión de constancias para garitas y los movimientos de planilla son servicios incluidos para todas las empresas aseguradas con la corredora.',
    category: 'Rol del Broker',
  },
];
