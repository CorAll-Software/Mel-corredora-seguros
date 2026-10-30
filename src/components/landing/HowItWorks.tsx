import { useState } from 'preact/hooks';
import { ArrowRight } from 'lucide-preact';
import { useTranslation } from '../../core/i18n/i18n';

const STEPS = [1, 2, 3, 4] as const;
const TONES = ['green', 'orange', 'blue', 'yellow'] as const;

// "Sigue el camino" (rediseño): los 4 pasos son paradas sobre un camino punteado
// (guiño a los letreros de Mepo). Cada parada abre su explicación en el panel de
// abajo; en celular el camino es vertical y el texto se abre bajo cada parada.
export function HowItWorks() {
  const tr = useTranslation();
  const [active, setActive] = useState<number>(1);
  const isLast = active === STEPS.length;

  return (
    <app-how-it-works>
      <section class="section screen how" id="como-funciona">
        <div class="container how__layout">
          <div class="how__head">
            <p class="eyebrow eyebrow--blue">{tr.t('how.eyebrow')}</p>
            <h2 class="section-title how__title">{tr.t('how.title')}</h2>
          </div>

          <div class="how__path">
            <svg class="how__road" viewBox="0 0 1000 80" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 38 C 120 -10, 210 90, 333 38 S 560 -10, 666 38 S 880 90, 1000 38" />
            </svg>
            <ol class="how__steps" role="tablist" aria-label={tr.t('how.stepsAria')}>
              {STEPS.map((n, i) => (
                <li key={n} class="how__step">
                  <button
                    type="button"
                    role="tab"
                    id={`how-tab-${n}`}
                    aria-selected={active === n}
                    aria-controls="how-detail"
                    class={`how__stop${active === n ? ' how__stop--on' : ''}`}
                    onClick={() => setActive(n)}
                  >
                    <span class={`how__number how__number--${TONES[i]}`}>{n}</span>
                    <span class="how__stop-title">{tr.t(`how.s${n}Title`)}</span>
                  </button>
                  {/* Celular: el detalle se abre bajo la parada activa */}
                  {active === n && <p class="how__inline">{tr.t(`how.s${n}Text`)}</p>}
                </li>
              ))}
            </ol>
          </div>

          <div class="how__detail" id="how-detail" role="tabpanel" aria-labelledby={`how-tab-${active}`} key={active}>
            <span class="how__detail-num" aria-hidden="true">
              {active}
            </span>
            <div class="how__detail-body">
              <p class="how__detail-label">
                {tr.t('how.stepLabel')} {active} / {STEPS.length}
              </p>
              <h3>{tr.t(`how.s${active}Title`)}</h3>
              <p>{tr.t(`how.s${active}Text`)}</p>
            </div>
            <button type="button" class="btn-chunk" onClick={() => setActive(isLast ? 1 : active + 1)}>
              {isLast ? tr.t('how.restart') : tr.t('how.next')}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
    </app-how-it-works>
  );
}
