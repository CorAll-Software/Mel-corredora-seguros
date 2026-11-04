import type { QuoteFormField, ServiceDetail } from '../models/insurance-service.model';

export const SERVICES_CATALOG_DATA: ServiceDetail[] = [
  // SEGUROS PARA EMPRESAS
  {
    id: 'cartas-fianza',
    category: 'empresas',
    title: 'Cartas Fianza Express',
    tag: 'Garantías Contractuales',
    badgeTime: 'Emisión ágil',
    summary:
      'Fiel Cumplimiento, Adelanto Directo y Materiales para licitaciones públicas y obras privadas.',
    image: '/assets/images/services/fianzas-obras.svg',
    specs: {
      coberturas: [
        'Fiel Cumplimiento de Contrato (10% del monto adjudicado)',
        'Adelanto Directo de Efectivo para inicio de obra',
        'Adelanto para Adquisición de Materiales e Insumos',
        'Garantía de Seriedad de Oferta',
      ],
      requisitos: [
        'RUC de la empresa adjudicada',
        'Bases integradas o contrato firmado',
        'Estados financieros de los dos últimos ejercicios contables',
      ],
      tiempoEmision: 'Gestión ágil tras aprobación de línea afianzadora',
      entidadesNormativas: 'Válidas para OSCE, SEACE y Contratos Privados',
    },
    mepoTip:
      'Evalúo tu línea de fianza con varias afianzadoras en simultáneo para conseguirte una tasa conveniente sin costo de gestión.',
    mepo: false,
  },
  {
    id: 'seguro-credito',
    category: 'empresas',
    title: 'Seguro de Crédito',
    tag: 'Protección Financiera',
    badgeTime: 'Atención prioritaria',
    summary:
      'Asegura tus cuentas por cobrar comerciales contra morosidad prolongada o quiebra de clientes.',
    image: '/assets/images/services/seguro-credito.svg',
    specs: {
      coberturas: [
        'Indemnización de hasta el 90% del valor de la factura impaga',
        'Monitoreo y calificación continua de la solvencia de tus compradores',
        'Gestión de cobranza judicial y extrajudicial internacional',
      ],
      requisitos: [
        'Facturación comercial anual mínima requerida',
        'Relación de principales clientes con líneas de crédito abiertas',
      ],
      tiempoEmision: 'Evaluación de cartera con atención prioritaria',
    },
    mepoTip:
      'Vende al crédito a 30, 60 o 90 días con total tranquilidad: si tu comprador quiebra o no paga, recuperas tu capital asegurado.',
    mepo: false,
  },
  {
    id: 'sctr-vida-ley',
    category: 'empresas',
    title: 'Planilla Obligatoria (SCTR & Vida Ley)',
    tag: 'Cumplimiento SUNAFIL',
    badgeTime: 'Constancia ágil',
    summary:
      'SCTR Salud, SCTR Pensión y Seguro Vida Ley con constancias inmediatas para acceso a garita.',
    image: '/assets/images/services/sctr-mineria.svg',
    specs: {
      coberturas: [
        'SCTR Salud: Cobertura médica y hospitalaria integral al 100%',
        'SCTR Pensión: Pensiones de invalidez y sobrevivencia por accidentes de trabajo',
        'Vida Ley: Indemnización por muerte natural (16 rem.) e invalidez permanente (32 rem.)',
      ],
      requisitos: [
        'T-Registro de colaboradores en nómina',
        'Planilla mensual en formato Excel con actividades declaradas',
      ],
      tiempoEmision: 'Emisión ágil con código digital',
    },
    mepoTip:
      '¿Tienes una emergencia de ingreso a mina u obra? Emito la constancia provisional validada para que tu personal entre a tiempo.',
    mepo: false,
  },
  {
    id: 'polizas-ingenieria',
    category: 'empresas',
    title: 'Pólizas de Ingeniería & RC',
    tag: 'Obras & Infraestructura',
    badgeTime: 'Todo Riesgo',
    summary:
      'Seguros CAR, EAR, TREC y Responsabilidad Civil para directores (D&O) y obras civiles.',
    image: '/assets/images/services/ingenieria-car.svg',
    specs: {
      coberturas: [
        'Póliza CAR: Daños materiales a la obra civil durante la construcción',
        'Póliza EAR: Montaje y prueba de maquinaria pesada o industrial',
        'Póliza TREC: Daños accidentales o volcadura de maquinaria en campo',
        'Responsabilidad Civil extracontractual frente a terceros y predios colindantes',
      ],
      requisitos: ['Memoria descriptiva y presupuesto de obra', 'Cronograma de ejecución valorizado'],
      tiempoEmision: 'Estructuración técnica con atención prioritaria',
    },
    mepoTip:
      'Reviso las cláusulas exigidas en el contrato de tu mandante para blindar exactamente lo que piden, sin sobrecostos innecesarios.',
    mepo: false,
  },

  // SEGUROS PARA PERSONAS & FAMILIAS
  {
    id: 'vida-devolucion',
    category: 'personas',
    title: 'Vida con Devolución',
    tag: 'Ahorro Inteligente',
    badgeTime: 'Ahorro con respaldo',
    summary:
      'Reemplaza el seguro de desgravamen bancario por una póliza que te devuelve el dinero con rentabilidad.',
    image: '/assets/images/services/vida-ahorro.svg',
    specs: {
      coberturas: [
        'Fondo de ahorro acumulado con rentabilidad garantizada',
        'Indemnización a beneficiarios ante fallecimiento',
        'Póliza totalmente endosable ante entidades bancarias para hipotecas',
      ],
      requisitos: [
        'DNI del asegurado titular',
        'Cronograma o saldo actual del crédito hipotecario/vehicular',
      ],
      tiempoEmision: 'Emisión e informe de endoso bancario con seguimiento directo',
    },
    mepoTip:
      'No regales el desgravamen al banco. Al endosar esta póliza, todo el monto mensual se acumula a tu favor y lo cobras al vencer el plazo.',
    mepo: true,
  },
  {
    id: 'salud-eps',
    category: 'personas',
    title: 'Salud Integral & EPS',
    tag: 'Medicina Privada',
    badgeTime: 'Clínicas Top',
    summary:
      'Atención ambulatoria, cirugías y hospitalización en clínicas privadas de primer nivel nacional.',
    image: '/assets/images/services/salud-clinica.svg',
    specs: {
      coberturas: [
        'Atención médica ambulatoria al 85% - 100% en red clínica',
        'Emergencias médicas accidentales cubiertas al 100%',
        'Cobertura de maternidad, odontología y chequeos preventivos anuales',
      ],
      requisitos: [
        'DNI de titulares y dependientes',
        'Declaración jurada de salud sin preexistencias no declaradas',
      ],
      tiempoEmision: 'Activación ágil',
    },
    mepoTip:
      'Te ayudo a comparar copagos y deducibles entre aseguradoras para elegir la red de clínicas más conveniente.',
    mepo: true,
  },
  {
    id: 'vehicular-todo-riesgo',
    category: 'personas',
    title: 'Vehicular (Soat + Todo Riesgo)',
    tag: 'Protección Vehicular',
    badgeTime: 'Auxilio 24/7',
    summary:
      'Cobertura completa ante choques, robo, volcadura y daños a terceros, más ayuda en carretera las 24 horas.',
    image: '/assets/images/services/seguro-vehicular.svg',
    specs: {
      coberturas: [
        'Daños materiales y pérdida total del vehículo',
        'Robo total del automotor (con y sin localización)',
        'Responsabilidad Civil frente a terceros y ocupantes',
        'Auxilio mecánico, grúa y auto reemplazo según plan',
      ],
      requisitos: [
        'SOAT y revisión técnica vigentes',
        'DNI del asegurado y tarjeta de propiedad',
        'Inspección física del vehículo según caso y antigüedad',
      ],
      tiempoEmision: 'Cotización y emisión ágiles',
    },
    mepoTip:
      'Comparo la prima Todo Riesgo entre aseguradoras según tu modelo y distrito de pernocte, para que no pagues de más.',
    mepo: true,
  },
  {
    id: 'hogar-multirriesgo',
    category: 'personas',
    title: 'Hogar & Multirriesgo',
    tag: 'Patrimonio Familiar',
    badgeTime: 'Incendio + Sismo',
    summary:
      'Protege tu vivienda y su contenido contra incendios, sismos, robo y responsabilidad civil familiar.',
    image: '/assets/images/services/seguro-hogar.svg',
    specs: {
      coberturas: [
        'Incendio y terremoto sobre la edificación (edificio y contenido)',
        'Robo con violencia o intimidación de enseres y joyas',
        'Daños por agua, rotura de tuberías y fenómenos naturales',
        'Responsabilidad Civil familiar frente a terceros',
      ],
      requisitos: [
        'Dirección y características de la vivienda (materiales, m², pisos)',
        'DNI del asegurado y declaración del valor del contenido',
      ],
      tiempoEmision: 'Emisión sin inspección para sumas estándar',
    },
    mepoTip:
      'Suma suficiente: te ayudo a definir la suma asegurada según el valor de reconstrucción de tu vivienda, no según el precio de compra.',
    mepo: true,
  },
  {
    id: 'asistencia-viaje',
    category: 'personas',
    title: 'Asistencia en Viaje',
    tag: 'Viaja Tranquilo',
    badgeTime: 'Cobertura Global',
    summary:
      'Asistencia médica internacional, demoras de equipaje y cancelación de viaje para tus vacaciones o trámites al extranjero.',
    image: '/assets/images/services/asistencia-viaje.svg',
    specs: {
      coberturas: [
        'Gastos médicos y hospitalarios por accidente o enfermedad en el extranjero',
        'Traslado sanitario y repatriación nacional e internacional',
        'Demora, extravío o pérdida de equipaje',
      ],
      requisitos: [
        'Pasaporte o DNI del viajero titular y acompañantes',
        'Fechas de salida y retorno del viaje',
      ],
      tiempoEmision: 'Certificado digital con atención prioritaria',
    },
    mepoTip:
      'Si viajas a Europa revisa que tu póliza cumpla el requisito Schengen (mínimo 30,000 EUR de cobertura médica); la gestiono con atención prioritaria.',
    mepo: true,
// Formulario corto de cotización por seguro (feedback §4: tabla "Datos que pide").
  },
];

// Carrusel de tipos en las fichas formales (feedback §4, issue #12):
// servicio -> campo del formulario que se preselecciona con "Cotizar esta...".
export const TYPE_CAROUSEL_FIELDS: Record<string, string> = {
  'cartas-fianza': 'tipoFianza',
  'seguro-credito': 'canal',
  'polizas-ingenieria': 'tipoObra',
};

// Narrativas de marca dentro de fichas (feedback §6, issue #13):
// servicio -> tipo de narrativa ('pasos' = linea de 7 pasos; 'casos' = 3 tarjetas de casos).
export const SERVICE_NARRATIVES: Record<string, 'pasos' | 'casos'> = {
  'cartas-fianza': 'pasos',
  'vida-devolucion': 'casos',
};

// TODO-VIDEO (issue #19): videos de Melanie por seguro (16:9). Servicio -> URL embed (iframe).
// Sin entrada, la ficha muestra la portada "Muy pronto: Melanie te lo explica en 1 minuto".
export const SERVICE_VIDEOS: Record<string, string> = {};

// A los campos específicos se suman nombre, correo, celular y aceptación de datos.
export const QUOTE_FORM_FIELDS: Record<string, QuoteFormField[]> = {
  'cartas-fianza': [
    { key: 'ruc' },
    { key: 'tipoFianza', type: 'select' },
    { key: 'monto' },
    { key: 'plazo' },
    { key: 'entidad' },
  ],
  'seguro-credito': [
    { key: 'ruc' },
    { key: 'ventas' },
    { key: 'clientes' },
    { key: 'canal', type: 'select' },
  ],
  'polizas-ingenieria': [
    { key: 'ruc' },
    { key: 'tipoObra' },
    { key: 'montoObra' },
    { key: 'plazoObra' },
  ],
  'sctr-vida-ley': [
    { key: 'ruc' },
    { key: 'actividad' },
    { key: 'trabajadores' },
    { key: 'planilla' },
  ],
  'salud-eps': [
    { key: 'edades' },
    { key: 'distrito' },
  ],
  'vida-devolucion': [
    { key: 'edad' },
    { key: 'ocupacion' },
    { key: 'montoVida' },
  ],
  'vehicular-todo-riesgo': [
    { key: 'marca' },
    { key: 'modelo' },
    { key: 'anio' },
    { key: 'valorAuto' },
  ],
  'hogar-multirriesgo': [
    { key: 'condicion', type: 'select' },
    { key: 'distrito' },
    { key: 'valorCasa' },
    { key: 'valorContenidos' },
  ],
  'asistencia-viaje': [
    { key: 'destino' },
    { key: 'fechas' },
    { key: 'edadesViajeros' },
  ],
};

export const LANDING_FAQS_DATA = [
  {
    question:
      '¿Tiene algún costo adicional contratar mis seguros a través de una corredora de seguros persona natural?',
    answer:
      'No. La asesoría, comparativa y gestión son 100% gratuitas para el asegurado: la aseguradora reconoce la comisión según ley, sin afectar tu prima. Además, al ser independiente, cotizo en simultáneo con todas las entidades reguladas por la SBS para darte la mejor alternativa.',
  },
  {
    question:
      '¿En cuánto tiempo obtengo una Carta Fianza o una constancia SCTR urgente?',
    answer:
      'Cartas Fianza con gestión ágil y constancias SCTR con código de barras digital y atención prioritaria, listas para pases de garita mineros, de obra y firmas con el Estado.',
  },
  {
    question:
      '¿Cómo funciona el reemplazo del seguro de desgravamen con una póliza de vida?',
    answer:
      'En lugar de pagar el desgravamen al banco, traslado ese costo a una póliza de Vida con Devolución endosada a tu crédito: mantienes la cobertura exigida y al término del préstamo recuperas las primas aportadas como ahorro.',
  },
  {
    // Texto provisional (TODO-PRESENTACION): reemplazar por el literal de la
    // presentación de Melanie cuando lo entregue (issue #19).
    question: '¿Qué es un corredor de seguros?',
    answer:
      'Un corredor de seguros es un intermediario autorizado y supervisado por la SBS que te asesora de forma independiente: cotizo con varias aseguradoras, comparo coberturas y te acompaño desde la contratación hasta el siniestro, sin costo adicional para ti.',
  },
];
