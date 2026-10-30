import { useTranslation } from '../../core/i18n/i18n';
import { INSURERS, type Insurer } from '../../core/data/insurers.data';

// Franja de aseguradoras (reemplaza a la Matriz Multiaseguradora).
// La lista vive en core/data/insurers.data.ts; se reexporta para el footer (issue #18).
export type StripInsurer = Insurer;
export const STRIP_INSURERS: StripInsurer[] = INSURERS;

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
