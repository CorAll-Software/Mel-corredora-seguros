import { useTranslation } from '../../core/i18n/i18n';

export interface StripInsurer {
  id: string;
  name: string;
  logo: string;
}

// Franja de aseguradoras (reemplaza a la Matriz Multiaseguradora).
// Logos oficiales disponibles + wordmarks provisionales (TODO-LOGOS: issue #19).
// Exportada también para el footer: misma lista, una sola fuente (issue #18).
export const STRIP_INSURERS: StripInsurer[] = [
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

// Dos filas que giran en sentidos opuestos (rediseño: carrusel rotativo). Cada fila
// repite la lista para que el bucle sea continuo; la copia queda oculta a lectores
// de pantalla y el movimiento se detiene al pasar el cursor.
const ROWS: StripInsurer[][] = [STRIP_INSURERS, [...STRIP_INSURERS].reverse()];

export function InsurerLogoStrip() {
  const tr = useTranslation();

  return (
    <app-insurer-strip>
      <section class="insurer-strip" id="aseguradoras" aria-label={tr.t('strip.title')}>
        <div class="container insurer-strip__head">
          <h2 class="insurer-strip__title">{tr.t('strip.title')}</h2>
          <p class="insurer-strip__lead">{tr.t('strip.lead')}</p>
        </div>
        <div class="insurer-strip__rows">
          {ROWS.map((row, r) => (
            <div key={r} class="insurer-strip__marquee">
              <ul class={`insurer-strip__track${r === 1 ? ' insurer-strip__track--rev' : ''}`}>
                {[...row, ...row].map((insurer, i) => (
                  <li key={`${insurer.id}-${i}`} class="insurer-strip__item" aria-hidden={r === 1 || i >= row.length}>
                    <img
                      src={insurer.logo}
                      alt={r === 1 || i >= row.length ? '' : insurer.name}
                      title={insurer.name}
                      class="insurer-strip__logo"
                      loading="lazy"
                      width={140}
                      height={40}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </app-insurer-strip>
  );
}
