import { useState } from 'preact/hooks';
import { CircleHelp, Hand, Route } from 'lucide-preact';
import { useTranslation } from '../../core/i18n/i18n';
import { WhatsAppService } from '../../core/services/whatsapp.service';

// Bienvenida de Mepo (rediseño del inicio): es lo primero que se ve. Los 3 letreros
// son iconos que se despliegan al pasar el cursor (con un saludo del icono) y el
// globo de Mepo cambia su mensaje según el letrero; el clic lleva a la sección.
// La imagen entregada incluye suricatos prohibidos por el feedback (derechos de
// terceros, ver issue #19): ventana 5:4 anclada a la derecha (Mepo + letreros).
const askUrl = WhatsAppService.buildGenericUrl(
  'quiero saber en qué me puedes servir, Melanie.'
);

const SIGNS = [
  { n: 1, href: '/#sobre-melanie', tone: 'green', Icon: Hand, external: false },
  { n: 2, href: '/#soluciones', tone: 'orange', Icon: Route, external: false },
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
        <svg class="welcome__leaf" aria-hidden="true" width="220" height="260" viewBox="0 0 220 260">
          <path d="M110 0v260" stroke="currentColor" stroke-width="3" />
          <path
            d="M110 40c-50 0-80 30-90 60 40 0 80-20 90-60zM110 90c50 0 80 30 90 60-40 0-80-20-90-60zM110 140c-50 0-80 30-90 60 40 0 80-20 90-60zM110 190c50 0 80 30 90 60-40 0-80-20-90-60z"
            fill="currentColor"
          />
        </svg>

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
              width={1408}
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
