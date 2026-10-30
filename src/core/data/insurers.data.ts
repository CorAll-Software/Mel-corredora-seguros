// Aseguradoras con las que trabaja Melanie: una sola fuente para la franja, el
// footer (issue #18) y el comparador (issue #44). El id es el que usan las tarifas.
// Logos oficiales disponibles + wordmarks provisionales (TODO-LOGOS: issue #19).

export interface Insurer {
  id: string;
  name: string;
  logo: string;
}

export const INSURERS: Insurer[] = [
  { id: 'mapfre', name: 'Mapfre', logo: '/assets/images/insurers/mapfre.svg' },
  { id: 'pacifico', name: 'Pacífico Seguros', logo: '/assets/images/insurers/pacifico.svg' },
  { id: 'rimac', name: 'Rímac Seguros', logo: '/assets/images/insurers/rimac.svg' },
  { id: 'positiva', name: 'La Positiva', logo: '/assets/images/insurers/positiva.svg' },
  { id: 'chubb', name: 'Chubb', logo: '/assets/images/insurers/chubb.svg' },
  { id: 'crecer', name: 'Crecer', logo: '/assets/images/insurers/crecer.svg' },
  { id: 'protecta', name: 'Protecta Security', logo: '/assets/images/insurers/protecta.svg' },
  { id: 'secrex', name: 'Secrex Cesce', logo: '/assets/images/insurers/secrex.svg' },
  { id: 'insur', name: 'InSur', logo: '/assets/images/insurers/insur.svg' },
  { id: 'avla', name: 'Avla', logo: '/assets/images/insurers/avla.svg' },
  { id: 'augustar', name: 'AuguStar', logo: '/assets/images/insurers/augustar.svg' },
  { id: 'sanitas', name: 'Sanitas', logo: '/assets/images/insurers/sanitas.svg' },
  { id: 'qualitas', name: 'Quálitas', logo: '/assets/images/insurers/qualitas.svg' },
  // Entregada por Melanie (wordmark "solunion · SOMOS IMPULSO"); pendiente versión
  // vectorial oficial en issue #19
  { id: 'solunion', name: 'SolUnion', logo: '/assets/images/insurers/solunion.jpeg' },
];

export function insurerById(id: string): Insurer | undefined {
  return INSURERS.find((insurer) => insurer.id === id);
}
