import { useState } from 'preact/hooks';
import { ArrowRight } from 'lucide-preact';
import { BRAND_CONFIG } from '../../core/config/brand.config';
import { useTranslation } from '../../core/i18n/i18n';
import { WhatsAppService } from '../../core/services/whatsapp.service';

const waUrl = WhatsAppService.buildGenericUrl('tengo otra duda sobre mi seguro.');

// Preguntas frecuentes como conversación (rediseño; reunión 01: a Melanie le gustó
// "conversación" en vez de "contacto"). Se elige una pregunta a la izquierda y en
// el chat aparece como mensaje del visitante y, enseguida, la respuesta de Melanie.
export function FaqChat({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  const tr = useTranslation();
  const [active, setActive] = useState(0);
  const current = faqs[active];

  return (
    <app-faq-chat>
      <div class="container faq-chat">
        <div class="faq-chat__side">
          <p class="eyebrow eyebrow--orange">{tr.t('faq.eyebrow')}</p>
          <h2 class="section-title">{tr.t('faq.title')}</h2>
          <div class="faq-chat__list" role="tablist" aria-label={tr.t('faq.eyebrow')}>
            {faqs.map((faq, index) => (
              <button
                key={faq.question}
                type="button"
                role="tab"
                id={`faq-tab-${index}`}
                aria-selected={active === index}
                aria-controls="faq-chat-panel"
                class={`faq-chat__q${active === index ? ' faq-chat__q--on' : ''}`}
                onClick={() => setActive(index)}
              >
                <span class="faq-chat__q-num">0{index + 1}</span>
                {faq.question}
              </button>
            ))}
          </div>
          <a class="faq-chat__all" href="/preguntas-frecuentes">
            {tr.t('faq.more')}
            <ArrowRight size={16} />
          </a>
        </div>

        <div class="faq-chat__window" id="faq-chat-panel" role="tabpanel" aria-labelledby={`faq-tab-${active}`}>
          <div class="faq-chat__head">
            <img src={BRAND_CONFIG.assets.advisorPhotoReal} alt="" width={48} height={48} loading="lazy" />
            <span>
              <b>{tr.t('faq.chatTitle')}</b>
              <span>{tr.t('faq.chatSub')}</span>
            </span>
          </div>
          {/* key: cada pregunta vuelve a montar los globos para repetir su animación */}
          <div class="faq-chat__thread" key={active} aria-live="polite">
            <p class="faq-chat__bubble faq-chat__bubble--q">{current?.question}</p>
            <div class="faq-chat__answer">
              <img src={BRAND_CONFIG.assets.advisorPhotoReal} alt="" width={36} height={36} loading="lazy" />
              <p class="faq-chat__bubble faq-chat__bubble--a">{current?.answer}</p>
            </div>
          </div>
          <a class="btn-chunk btn-chunk--yellow faq-chat__wa" href={waUrl} target="_blank" rel="noopener noreferrer">
            {tr.t('faq.otherDoubt')}
          </a>
        </div>
      </div>
    </app-faq-chat>
  );
}
