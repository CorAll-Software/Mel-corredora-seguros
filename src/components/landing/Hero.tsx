import { ArrowDown, ArrowRight, Building2, Check, Users } from 'lucide-preact';
import { BRAND_CONFIG } from '../../core/config/brand.config';
import { useTranslation } from '../../core/i18n/i18n';
import type { AudienceCategory } from '../../core/models/insurance-service.model';
import { Mepo } from './Mepo';

interface HeroProps {
  activeTab: AudienceCategory;
  onTabChange: (tab: AudienceCategory) => void;
}

// "Cuidar de tu empresa…" (rediseño): selector de público como dos tarjetas grandes
// con relieve y la constancia de ejemplo inclinada sobre una segunda hoja.
const AUDIENCES = [
  { tab: 'empresas', Icon: Building2, tone: 'green' },
  { tab: 'personas', Icon: Users, tone: 'orange' },
] as const;

export function Hero({ activeTab, onTabChange }: HeroProps) {
  const tr = useTranslation();

  return (
    <app-hero>
      <section class="hero screen">
        <div class="container hero__grid">
          <div class="hero__copy">
            <p class="eyebrow hero__eyebrow">{BRAND_CONFIG.supervisionBadge}</p>
            <h1 class="hero__title">{tr.t('hero.title')}</h1>
            <p class="hero__lead">{tr.t('hero.lead')}</p>

            <div class="hero__tabs" role="tablist" aria-label={tr.t('hero.tabsAria')}>
              {AUDIENCES.map(({ tab, Icon, tone }) => {
                const key = tab === 'empresas' ? 'Empresas' : 'Personas';
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    class={`hero__tab${activeTab === tab ? ' hero__tab--active' : ''}`}
                    aria-selected={activeTab === tab}
                    onClick={() => onTabChange(tab)}
                  >
                    <span class={`hero__tab-icon hero__tab-icon--${tone}`} aria-hidden="true">
                      <Icon size={22} />
                    </span>
                    <span class="hero__tab-text">
                      <b>{tr.t(`hero.tab${key}`)}</b>
                      <span>{tr.t(`hero.tab${key}Sub`)}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div class="hero__ctas">
              <a href="/cotizador" class="btn-chunk btn-chunk--orange">
                {tr.t('hero.ctaPrimary')}
                <ArrowRight size={18} />
              </a>
              <a href="/#como-funciona" class="hero__cta-secondary">
                {tr.t('hero.ctaSecondary')}
                <ArrowDown size={18} />
              </a>
            </div>

            <ul class="hero__trust">
              {[1, 2, 3].map((n) => (
                <li key={n}>
                  <Check size={16} strokeWidth={3} />
                  {tr.t(`hero.trust${n}`)}
                </li>
              ))}
            </ul>
          </div>

          <figure class="hero__doc-wrap">
            <span class="hero__doc-sheet" aria-hidden="true" />
            <div class="hero__doc" role="img" aria-label={tr.t('hero.docTitle')}>
              <div class="hero__doc-head">
                <span class="hero__doc-title">{tr.t('hero.docTitle')}</span>
                <span class="hero__doc-status">
                  <i aria-hidden="true"></i>
                  {tr.t('hero.docStatus')}
                </span>
              </div>
              <dl class="hero__doc-fields">
                <div>
                  <dt>{tr.t('hero.docCompany')}</dt>
                  <dd>Constructora Andina S.A.C.</dd>
                </div>
                <div>
                  <dt>{tr.t('hero.docRuc')}</dt>
                  <dd>20 ••••••• 89</dd>
                </div>
                <div>
                  <dt>{tr.t('hero.docCover')}</dt>
                  <dd>SCTR Salud + Pensión</dd>
                </div>
                <div>
                  <dt>{tr.t('hero.docValidity')}</dt>
                  <dd>16/10/2026 – 15/11/2026</dd>
                </div>
                <div>
                  <dt>{tr.t('hero.docIssued')}</dt>
                  <dd>1 h 38 min</dd>
                </div>
              </dl>
              <div class="hero__doc-foot">
                <span class="hero__doc-bars" aria-hidden="true"></span>
                <span class="hero__doc-stamp" aria-hidden="true">
                  <Check size={18} />
                  <b>SBS</b>
                  <em>N-4050</em>
                </span>
              </div>
            </div>
            <Mepo size={130} class="hero__mepo" />
            <figcaption class="hero__doc-note">{tr.t('hero.docExample')}</figcaption>
          </figure>
        </div>
      </section>
    </app-hero>
  );
}
