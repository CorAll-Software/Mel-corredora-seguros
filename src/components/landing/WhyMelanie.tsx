import { useState } from 'preact/hooks';
import { Plus, Scale, ShieldCheck } from 'lucide-preact';
import { BRAND_CONFIG } from '../../core/config/brand.config';
import { useTranslation } from '../../core/i18n/i18n';
import { useAdvisorPhoto } from './useAdvisorPhoto';

const REASONS = [1, 2, 3] as const;

// "¿Por qué Melanie?" (rediseño con revelado progresivo, reunión 01: "si uno quiere
// ver algo más, entra a ese botoncito y aprende más"). Quién es va escrito sobre la
// foto para que la columna de texto no la supere en alto. "Conoce mis dos perfiles"
// cambia, en el mismo lugar, las razones por "Dos perfiles, una sola profesional"
// (texto literal aprobado, feedback §5, issue #14); cada razón se abre con su (+).
export function WhyMelanie() {
  const tr = useTranslation();
  const brand = BRAND_CONFIG;
  const photo = useAdvisorPhoto();
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [reason, setReason] = useState(1);

  return (
    <app-why-melanie>
      <section class="section screen why" id="sobre-melanie">
        <div class="container why__grid">
          <figure class="why__photo-card">
            <div class="why__photo-frame">
              <img
                src={photo.src}
                ref={photo.ref}
                onError={photo.onError}
                alt={`${brand.ownerName}, ${brand.roleTitle}`}
                class="why__photo"
                width={480}
                height={600}
                loading="lazy"
                decoding="async"
              />
              <div class="why__overlay">
                <p class="why__line why__eyebrow">{tr.t('navbar.linksWhy')}</p>
                <h2 class="why__line why__name">{brand.ownerName}</h2>
                <p class="why__line why__phrase">“{tr.t('why.phrase')}”</p>
              </div>
            </div>
            <figcaption class="why__sbs-badge">
              <ShieldCheck size={16} />
              {brand.supervisionBadge}
            </figcaption>
          </figure>

          <div class="why__content">
            {/* Primero el lema y la trayectoria; el botón de perfiles va a la derecha,
                justo encima de "¿Por qué trabajar conmigo?" */}
            <p class="why__line why__lema">{brand.lema}.</p>
            <p class="why__line why__track">{tr.t('why.track')}</p>

            <div class="why__line why__pill-row">
              <button
                type="button"
                class="btn-chunk btn-chunk--orange why__pill"
                aria-expanded={profilesOpen}
                aria-controls="why-profiles"
                onClick={() => setProfilesOpen(!profilesOpen)}
              >
                <Plus size={18} strokeWidth={2.8} class="btn-chunk__plus" />
                <span class="why__pill-label">
                  {profilesOpen ? tr.t('why.ctaProfilesHide') : tr.t('why.ctaProfiles')}
                </span>
              </button>
            </div>

            <div id="why-profiles" class="why__profiles-area">
              {profilesOpen && (
                <div class="why__reveal">
                  <h3 class="why__title">{tr.t('why.title')}</h3>
                  <p class="why__intro">{tr.t('why.profilesIntro')}</p>
                  <div class="why__profiles">
                    <article class="why__profile-card">
                      <span class="why__profile-icon why__profile-icon--ink" aria-hidden="true">
                        <Scale size={22} />
                      </span>
                      <h4>{tr.t('why.profile1Title')}</h4>
                      <p>{tr.t('why.profile1Text')}</p>
                    </article>
                    <article class="why__profile-card">
                      <span class="why__profile-icon" aria-hidden="true">
                        <ShieldCheck size={22} />
                      </span>
                      <h4>{tr.t('why.profile2Title')}</h4>
                      <p>{tr.t('why.profile2Text')}</p>
                    </article>
                  </div>
                </div>
              )}
            </div>

            {!profilesOpen && (
              <div class="why__reasons">
                <h3 class="why__reasons-title">{tr.t('why.reasonsTitle')}</h3>
                {REASONS.map((n) => (
                  <div key={n} class={`why__reason${reason === n ? ' why__reason--open' : ''}`}>
                    <button
                      type="button"
                      class="why__reason-btn"
                      aria-expanded={reason === n}
                      aria-controls={`why-reason-${n}`}
                      onClick={() => setReason(reason === n ? 0 : n)}
                    >
                      <span class="why__reason-num">0{n}</span>
                      {tr.t(`why.block${n}Title`)}
                      <span class="why__reason-ico" aria-hidden="true">
                        <Plus size={16} strokeWidth={2.8} />
                      </span>
                    </button>
                    {reason === n && (
                      <p class="why__reason-body" id={`why-reason-${n}`}>
                        {tr.t(`why.block${n}Text`)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <blockquote class="why__quote">“{brand.quote}”</blockquote>
            <div>
              <a class="btn-chunk btn-chunk--ink" href="/#agendar">
                {tr.t('why.cta')}
              </a>
            </div>
          </div>
        </div>
      </section>
    </app-why-melanie>
  );
}
