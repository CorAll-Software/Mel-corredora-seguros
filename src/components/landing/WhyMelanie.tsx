import { useState } from 'preact/hooks';
import { ArrowRight, Scale, ShieldCheck } from 'lucide-preact';
import { BRAND_CONFIG } from '../../core/config/brand.config';
import { useTranslation } from '../../core/i18n/i18n';
import { useAdvisorPhoto } from './useAdvisorPhoto';

// Sección de Melanie (rediseño): la foto queda fija y el texto avanza en dos pasos.
// 01 "Quién soy": nombre, frase de inicio y lema, con las líneas apareciendo al bajar.
// 02 "Dos perfiles, una sola profesional" (feedback §5, issue #14): texto literal
// aprobado (Abogada | Corredora de seguros) y los 3 bloques de beneficios.
export function WhyMelanie() {
  const tr = useTranslation();
  const brand = BRAND_CONFIG;
  const photo = useAdvisorPhoto();
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <app-why-melanie>
      <section class="section screen why" id="sobre-melanie">
        <div class="container why__grid">
          <figure class="why__photo-card">
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
            <figcaption class="why__sbs-badge">
              <ShieldCheck size={16} />
              {brand.supervisionBadge}
            </figcaption>
          </figure>

          <div class="why__content">
            <div class="why__steps" role="group" aria-label={tr.t('why.stepsAria')}>
              <button
                type="button"
                class={`why__step${step === 1 ? ' why__step--on' : ''}`}
                aria-pressed={step === 1}
                onClick={() => setStep(1)}
              >
                {tr.t('why.stepWho')}
              </button>
              <button
                type="button"
                class={`why__step${step === 2 ? ' why__step--on' : ''}`}
                aria-pressed={step === 2}
                onClick={() => setStep(2)}
              >
                {tr.t('why.stepProfiles')}
              </button>
            </div>

            {step === 1 ? (
              <div class="why__panel" key="who">
                <p class="why__line why__eyebrow">{brand.supervisionBadge}</p>
                <h2 class="why__line why__name">{brand.ownerName}</h2>
                <p class="why__line why__phrase">“{tr.t('why.phrase')}”</p>
                <p class="why__line why__track">
                  {tr.t('why.track')}
                  <span class="why__lema">{brand.lema}.</span>
                </p>
                <div class="why__line why__actions">
                  <button type="button" class="why__btn why__btn--main" onClick={() => setStep(2)}>
                    {tr.t('why.ctaProfiles')}
                    <ArrowRight size={18} class="why__btn-arrow" />
                  </button>
                  <a class="why__btn" href="/#agendar">
                    {tr.t('why.ctaSchedule')}
                  </a>
                </div>
              </div>
            ) : (
              <div class="why__panel" key="profiles">
                <h2 class="section-title why__title">{tr.t('why.title')}</h2>
                <p class="why__intro">{tr.t('why.profilesIntro')}</p>
                <div class="why__profiles">
                  <article class="why__profile-card">
                    <span class="why__profile-icon why__profile-icon--ink" aria-hidden="true">
                      <Scale size={20} />
                    </span>
                    <h3>{tr.t('why.profile1Title')}</h3>
                    <p>{tr.t('why.profile1Text')}</p>
                  </article>
                  <article class="why__profile-card">
                    <span class="why__profile-icon" aria-hidden="true">
                      <ShieldCheck size={20} />
                    </span>
                    <h3>{tr.t('why.profile2Title')}</h3>
                    <p>{tr.t('why.profile2Text')}</p>
                  </article>
                </div>
                {[1, 2, 3].map((n) => (
                  <div key={n} class="why__block">
                    <span class="why__block-num">0{n}</span>
                    <div>
                      <h3>{tr.t(`why.block${n}Title`)}</h3>
                      <p>{tr.t(`why.block${n}Text`)}</p>
                    </div>
                  </div>
                ))}
                <blockquote class="why__quote">“{brand.quote}”</blockquote>
                <div class="why__actions">
                  <a class="why__btn why__btn--main" href="/#agendar">
                    {tr.t('why.cta')}
                  </a>
                  <button type="button" class="why__btn" onClick={() => setStep(1)}>
                    {tr.t('why.back')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </app-why-melanie>
  );
}
