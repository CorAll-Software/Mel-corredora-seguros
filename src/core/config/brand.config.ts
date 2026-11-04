// TODO-LOGO-MEL: archivo del logo oficial MEL pendiente; mientras se usa el wordmark "Mel".
export const BRAND_CONFIG = {
  // Nombre de la página según lineamientos SBS: "Mel – Corredora de Seguros"
  brandName: 'Mel',
  brandTitle: 'Mel – Corredora de Seguros',
  brandSubtitle: 'Corredora de Seguros',
  // Nombre de pila para mensajes conversacionales de WhatsApp
  firstName: 'Melanie',
  ownerName: 'Melanie O. Calderón Vega',
  roleTitle: 'Corredora de seguros persona natural – seguros generales y de vida',
  licenseId: 'Registro SBS N-4050',
  // Lineamiento SBS (Oficio Múltiple N° 61029-2026-SBS): denominación persistente de persona natural
  legalLine: 'Melanie O. Calderón Vega · Corredora de Seguros persona natural · Registro SBS N-4050',
  sbsChip: 'Corredora de Seguros persona natural',
  sbsChipShort: 'Registro SBS N-4050',
  supervisionBadge: 'Corredora de Seguros persona natural · Registro SBS N-4050',
  experience: 'Más de 15 años de experiencia · Registrada en la SBS desde el 7 de julio de 2011',
  // Lema de marca (presentación de Melanie, feedback §6)
  lema: 'Protección y Trascendencia',
  quote:
    'Mi compromiso no es venderte una póliza, sino defender tus intereses y agilizar tus constancias para que nunca pares operaciones.',
  contact: {
    // Numero oficial de trabajo de Melanie (informe tercera revision): pantalla y todos los enlaces wa.me.
    phone: '+51 988 983 710',
    // Misma cifra que phone, sin '+' ni espacios (formato wa.me).
    whatsappNumber: '51988983710',
    email: 'vivefelizviveseguro@gmail.com',
    schedule: 'Lunes a Viernes: 8:30 AM - 6:30 PM',
    location: 'Perú',
  },
  // TODO-LINKEDIN (issue #19): URL PROVISIONAL de prueba (Alfredo). Reemplazar
  // por el perfil de Melanie cuando lo entregue, igual que los videos y demás pendientes.
  linkedin: 'https://www.linkedin.com/in/alfredo-rogger-guzman-moscol-33b340331/',
  assets: {
    logoLight: '/assets/images/brand/logo.svg',
    logoDark: '/assets/images/brand/logo-dark.svg',
    logoStacked: '/assets/images/brand/logo-apilado.svg',
    logoIcon: '/assets/images/brand/icono.svg',
    // Fotografía real de Melanie (entregada en mepo/ICON.png; optimizada a JPEG
    // ICON.jpg) con fallback al placeholder.
    advisorPhotoReal: '/assets/images/mepo/ICON.jpg',
    advisorPhoto: '/assets/images/advisor/profile.svg',
  },
  // Las aseguradoras viven en STRIP_INSURERS (landing/InsurerLogoStrip.tsx):
  // franja y footer comparten la misma lista de 13 (issue #18).
} as const;
