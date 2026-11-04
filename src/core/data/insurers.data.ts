// Aseguradoras con las que trabaja Melanie: una sola fuente para la franja, el
// footer (issue #18) y el comparador (issue #44). El id es el que usan las tarifas.

export interface Insurer {
  id: string;
  name: string;
  logo: string;
  // Ancho / alto del logo: la franja lo usa para que todos se vean del mismo
  // tamaño aunque unos sean anchos y otros casi cuadrados.
  ratio: number;
}

// Mapfre, Pacífico, Rímac y La Positiva: SVG oficiales. El resto: PNG
// transparentes y recortados, provisionales hasta que Melanie entregue los
// oficiales (TODO-LOGOS: issue #19). Nunca JPG (fondo blanco).
export const INSURERS: Insurer[] = [
  { id: 'mapfre', name: 'Mapfre', logo: '/assets/images/insurers/mapfre.svg', ratio: 2.72 },
  { id: 'pacifico', name: 'Pacífico Seguros', logo: '/assets/images/insurers/pacifico.svg', ratio: 2.8 },
  { id: 'rimac', name: 'Rímac Seguros', logo: '/assets/images/insurers/rimac.svg', ratio: 2.0 },
  { id: 'positiva', name: 'La Positiva', logo: '/assets/images/insurers/positiva.svg', ratio: 2.49 },
  { id: 'chubb', name: 'Chubb', logo: '/assets/images/insurers/chubb.png', ratio: 8.21 },
  { id: 'crecer', name: 'Crecer', logo: '/assets/images/insurers/crecer.png', ratio: 3.25 },
  { id: 'protecta', name: 'Protecta Security', logo: '/assets/images/insurers/protecta.png', ratio: 1.74 },
  { id: 'secrex', name: 'Secrex Cesce', logo: '/assets/images/insurers/secrex.png', ratio: 3.39 },
  { id: 'insur', name: 'InSur', logo: '/assets/images/insurers/insur.png', ratio: 2.41 },
  { id: 'avla', name: 'Avla', logo: '/assets/images/insurers/avla.png', ratio: 4.1 },
  { id: 'augustar', name: 'AuguStar', logo: '/assets/images/insurers/augustar.png', ratio: 2.25 },
  { id: 'sanitas', name: 'Sanitas', logo: '/assets/images/insurers/sanitas.png', ratio: 4.26 },
  { id: 'qualitas', name: 'Quálitas', logo: '/assets/images/insurers/qualitas.png', ratio: 3.27 },
  { id: 'solunion', name: 'SolUnion', logo: '/assets/images/insurers/solunion.png', ratio: 3.86 },
];

export function insurerById(id: string): Insurer | undefined {
  return INSURERS.find((insurer) => insurer.id === id);
}
