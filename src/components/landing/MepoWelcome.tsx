import { useState } from 'preact/hooks';
import { CircleHelp, Hand, Route, Scale } from 'lucide-preact';
import { useTranslation } from '../../core/i18n/i18n';
import { WhatsAppService } from '../../core/services/whatsapp.service';

// Bienvenida de Mepo (rediseño del inicio): es lo primero que se ve. Los letreros
// (con el del comparador, issue #45) son iconos que se despliegan al pasar el
// cursor (con un saludo del icono) y el globo de Mepo cambia su mensaje según el letrero; el clic lleva a la sección.
// La imagen está recortada en el propio archivo a Mepo y los letreros: la original
// traía suricatos, prohibidos por el feedback (derechos de terceros, issue #19).
const askUrl = WhatsAppService.buildGenericUrl(
  'quiero saber en qué me puedes servir, Melanie.'
);

// Hojas de eucalipto del fondo: cada una es [x, y, giro, escala] sobre su rama.
const LEAF = 'M0 0C16-12 50-14 84 0 50 12 16 10 0 0Z';
const BRANCH_TOP: readonly (readonly [number, number, number, number])[] = [
  [60, 46, 35, 1],
  [58, 44, -30, 0.9],
  [132, 74, 50, 1.1],
  [128, 72, -18, 1],
  [204, 94, 58, 1],
  [200, 92, -8, 1.05],
  [278, 102, 62, 0.95],
  [274, 100, 4, 0.9],
  [346, 100, 40, 0.8],
];
const BRANCH_BOTTOM: readonly (readonly [number, number, number, number])[] = [
  [330, 214, 200, 1],
  [326, 212, 145, 0.95],
  [258, 196, 215, 1.05],
  [254, 194, 150, 1],
  [186, 188, 225, 1],
  [182, 186, 165, 0.95],
  [112, 192, 205, 0.85],
];

const SIGNS = [
  { n: 1, href: '/#sobre-melanie', tone: 'green', Icon: Hand, external: false },
  { n: 2, href: '/#soluciones', tone: 'orange', Icon: Route, external: false },
  { n: 4, href: '/comparar', tone: 'yellow', Icon: Scale, external: false },
  { n: 3, href: askUrl, tone: 'blue', Icon: CircleHelp, external: true },
] as const;

export function MepoWelcome() {
  const tr = useTranslation();
  // Letrero activo (0 = ninguno) y contador para re-animar el globo en cada cambio
  const [active, setActive] = useState(0);
  const [tick, setTick] = useState(0);

  const show = (n: number) => {
    if (n !== active) {
      setActive(n);
      setTick((t) => t + 1);
    }
  };

  const bubbleTitle = active ? tr.t(`mepo.sign${active}`) : tr.t('mepo.bubbleTitle');
  const bubbleText = active ? tr.t(`mepo.bubble${active}`) : tr.t('mepo.bubbleText');

  return (
    <app-mepo-welcome>
      <section class="welcome" aria-label={tr.t('mepo.eyebrow')}>
        {/* Fondo decorativo: bosque de eucalipto con colinas, ramas y hojas que caen */}
        <div class="welcome__scene" aria-hidden="true">
          <svg class="welcome__hills" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path class="welcome__hill welcome__hill--far" d="M0 150C220 70 420 90 640 150s420 80 800-30v200H0Z" />
            <path class="welcome__hill welcome__hill--mid" d="M0 220c260-90 500-60 760 0s460 50 680-40v140H0Z" />
            <path class="welcome__hill welcome__hill--near" d="M0 280c300-60 560-40 820 0s420 20 620-30v70H0Z" />
          </svg>
          <svg class="welcome__branch welcome__branch--top" viewBox="0 0 420 200">
            <path d="M0 18C120 40 250 104 400 96" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
            {BRANCH_TOP.map(([x, y, angle, scale]) => (
              <path key={`${x}-${angle}`} d={LEAF} fill="currentColor" transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`} />
            ))}
          </svg>
          <svg class="welcome__branch welcome__branch--bottom" viewBox="0 0 420 280">
            <path d="M420 250C300 210 190 180 80 196" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
            {BRANCH_BOTTOM.map(([x, y, angle, scale]) => (
              <path key={`${x}-${angle}`} d={LEAF} fill="currentColor" transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`} />
            ))}
          </svg>
          {[1, 2, 3, 4].map((n) => (
            <svg key={n} class={`welcome__fall welcome__fall--${n}`} viewBox="-2 -16 90 32">
              <path d={LEAF} fill="currentColor" />
            </svg>
          ))}
        </div>

        <div class="container welcome__grid">
          <div class="welcome__panel">
            <p class="welcome__eyebrow">{tr.t('mepo.eyebrow')}</p>
            <h1 class="welcome__title">{tr.t('mepo.title')}</h1>
            <p class="welcome__text">{tr.t('mepo.text')}</p>

            <nav class="welcome__signs" aria-label={tr.t('mepo.eyebrow')} onMouseLeave={() => show(0)}>
              {SIGNS.map(({ n, href, tone, Icon, external }) => (
                <a
                  key={n}
                  class={`welcome__sign welcome__sign--${tone}`}
                  href={href}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  onMouseEnter={() => show(n)}
                  onFocus={() => show(n)}
                >
                  <span class="welcome__sign-icon" aria-hidden="true">
                    <Icon size={30} />
                  </span>
                  <span class="welcome__sign-label">{tr.t(`mepo.sign${n}`)}</span>
                </a>
              ))}
            </nav>
            <p class="welcome__hint welcome__hint--pointer">{tr.t('mepo.hint')}</p>
            <p class="welcome__hint welcome__hint--touch">{tr.t('mepo.hintTouch')}</p>
          </div>

          <figure class="welcome__media">
            <img
              src="/assets/images/mepo/mepo-bienvenida.jpeg"
              alt={tr.t('mepo.salute')}
              class="welcome__photo"
              width={960}
              height={768}
              loading="eager"
              fetchpriority="high"
              decoding="async"
            />
            <div class="welcome__bubble" key={tick} aria-live="polite">
              <p class="welcome__bubble-title">{bubbleTitle}</p>
              <p class="welcome__bubble-text">{bubbleText}</p>
            </div>
          </figure>
        </div>
      </section>
    </app-mepo-welcome>
  );
}
