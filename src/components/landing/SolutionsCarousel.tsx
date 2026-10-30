import { useEffect, useRef, useState } from 'preact/hooks';
import EmblaCarousel, { type EmblaCarouselType } from 'embla-carousel';
import { ArrowRight, ChevronLeft, ChevronRight, Plus } from 'lucide-preact';
import { useTranslation } from '../../core/i18n/i18n';
import type { AudienceCategory, ServiceDetail } from '../../core/models/insurance-service.model';
import { SERVICES_CATALOG_DATA } from '../../core/data/landing.data';

interface SolutionCardProps {
  service: ServiceDetail;
  onDetailPressed: (service: ServiceDetail) => void;
}

function SolutionCard({ service, onDetailPressed }: SolutionCardProps) {
  const tr = useTranslation();
  const open = (event?: Event) => {
    event?.stopPropagation();
    onDetailPressed(service);
  };

  return (
    <app-solution-card>
      <article class="card" data-svc={service.id} onClick={() => onDetailPressed(service)}>
        <div class="card__media">
          <img
            class="card__bg"
            src={service.image}
            alt={tr.t(`services.${service.id}.title`)}
            loading="lazy"
          />
          <span class="card__badge">{tr.t(`services.${service.id}.badge`)}</span>
          <button
            type="button"
            class="card__plus"
            aria-label={tr.t('carousel.cardCta')}
            onClick={open}
          >
            <Plus size={18} />
          </button>
        </div>

        <div class="card__body">
          <h3 class="card__title">{tr.t(`services.${service.id}.title`)}</h3>
          <p class="card__summary">{tr.t(`services.${service.id}.summary`)}</p>
          <button type="button" class="card__cta" onClick={open}>
            {tr.t('carousel.cardCta')}
            <ArrowRight size={16} />
          </button>
        </div>
      </article>
    </app-solution-card>
  );
}

// Embla solo puede desplazar/loopear si el contenido ancho total supera el
// viewport: repetimos la lista hasta garantizarlo sin importar cuántas
// tarjetas haya en el catálogo.
function computeRepeat(baseCount: number, viewportWidth: number): number {
  if (!viewportWidth || !baseCount) {
    return 1;
  }
  // Ancho mínimo estimado por slide (tarjeta de 290px + 24px de separación).
  const stride = 314;
  const target = viewportWidth + stride;
  const needed = Math.ceil(target / stride);
  return Math.max(1, Math.min(6, Math.ceil(needed / baseCount)));
}

// Tiempo que cada tarjeta queda en primer plano antes de pasar a la siguiente
const AUTOPLAY_MS = 4000;

interface SolutionsCarouselProps {
  activeTab: AudienceCategory;
  onDetailPressed: (service: ServiceDetail) => void;
}

export function SolutionsCarousel({ activeTab, onDetailPressed }: SolutionsCarouselProps) {
  const tr = useTranslation();
  const [viewportWidth, setViewportWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const base = SERVICES_CATALOG_DATA.filter((s) => s.category === activeTab);
  const repeat = computeRepeat(base.length, viewportWidth);
  const displayServices: ServiceDetail[] = Array.from(
    { length: base.length * repeat },
    (_, i) => base[i % base.length],
  );
  const dots = Array.from({ length: base.length }, (_, i) => i);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstTab = useRef(true);
  const emblaRef = useRef<EmblaCarouselType | null>(null);
  const baseCountRef = useRef(base.length);
  baseCountRef.current = base.length;
  // Inicialización de Embla
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const api = EmblaCarousel(viewport, { loop: true, align: 'start', dragFree: false });
    emblaRef.current = api;
    const sync = () => setSelectedIndex(api.selectedScrollSnap() % (baseCountRef.current || 1));
    api.on('init', sync).on('reInit', sync).on('select', sync);
    sync();
    setViewportWidth(viewport.clientWidth);

    let resizeTimer: number | null = null;
    const onResize = () => {
      if (resizeTimer !== null) {
        window.clearTimeout(resizeTimer);
      }
      resizeTimer = window.setTimeout(() => setViewportWidth(viewport.clientWidth), 200);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeTimer !== null) {
        window.clearTimeout(resizeTimer);
      }
      api.destroy();
      emblaRef.current = null;
    };
  }, []);

  // Avance automático cada AUTOPLAY_MS: se pausa con el cursor/dedo encima, con el
  // foco dentro, fuera de pantalla o con "reducir movimiento"; cada cambio de tarjeta
  // (también los manuales) reinicia la cuenta para no saltar justo después de un clic.
  useEffect(() => {
    const viewport = viewportRef.current;
    const api = emblaRef.current;
    if (!viewport || !api || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    let timer: number | null = null;
    let hovering = false;
    let visible = false;
    const stop = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };
    const schedule = () => {
      stop();
      if (!hovering && visible && !document.hidden) {
        timer = window.setTimeout(() => api.scrollNext(), AUTOPLAY_MS);
      }
    };
    const pause = () => {
      hovering = true;
      stop();
    };
    const resume = () => {
      hovering = false;
      schedule();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    observer.observe(viewport);
    api.on('select', schedule).on('pointerDown', pause).on('pointerUp', resume);
    viewport.addEventListener('mouseenter', pause);
    viewport.addEventListener('mouseleave', resume);
    viewport.addEventListener('focusin', pause);
    viewport.addEventListener('focusout', resume);
    document.addEventListener('visibilitychange', schedule);

    return () => {
      stop();
      observer.disconnect();
      api.off('select', schedule).off('pointerDown', pause).off('pointerUp', resume);
      viewport.removeEventListener('mouseenter', pause);
      viewport.removeEventListener('mouseleave', resume);
      viewport.removeEventListener('focusin', pause);
      viewport.removeEventListener('focusout', resume);
      document.removeEventListener('visibilitychange', schedule);
    };
  }, []);

  // Al cambiar de pestaña las tarjetas nuevas entran con un fundido corto (no en la primera carga)
  useEffect(() => {
    if (firstTab.current) {
      firstTab.current = false;
      return;
    }
    const track = trackRef.current;
    if (!track) {
      return;
    }
    track.classList.remove('solutions__track--swap');
    void track.offsetWidth;
    track.classList.add('solutions__track--swap');
  }, [activeTab]);

  // Al cambiar de pestaña o de repetición se recalcula el carrusel con el DOM ya actualizado
  useEffect(() => {
    const timer = window.setTimeout(() => emblaRef.current?.reInit());
    return () => window.clearTimeout(timer);
  }, [activeTab, repeat]);

  return (
    <app-solutions-carousel>
      <section class="section screen solutions" id="soluciones">
        <div class="container">
          <div class="solutions__head">
            <p class="eyebrow eyebrow--orange solutions__eyebrow">{tr.t('carousel.eyebrow')}</p>
            <h2 class="section-title">
              {activeTab === 'empresas'
                ? tr.t('carousel.titleEmpresas')
                : tr.t('carousel.titlePersonas')}
            </h2>
            <p class="solutions__hint">{tr.t('carousel.hint')}</p>
          </div>
        </div>
        <div class="solutions__viewport-wrap container">
          <div class="solutions__viewport" ref={viewportRef}>
            <div class="solutions__track" ref={trackRef}>
              {displayServices.map((service, index) => (
                <div key={index} class="solutions__slide">
                  <SolutionCard service={service} onDetailPressed={onDetailPressed} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div class="container solutions__controls">
          {/* Barras de progreso: la activa se llena en AUTOPLAY_MS (key: se reinicia en cada cambio) */}
          <div class="solutions__dots" aria-label={tr.t('carousel.dotsAria')}>
            {dots.map((index) => (
              <button
                key={index}
                type="button"
                class={`solutions__dot${selectedIndex === index ? ' solutions__dot--active' : ''}${index < selectedIndex ? ' solutions__dot--done' : ''}`}
                aria-label={`${tr.t('carousel.pageAria')} ${index + 1}`}
                aria-current={selectedIndex === index}
                onClick={() => emblaRef.current?.scrollTo(index)}
              >
                <span
                  key={selectedIndex === index ? `on-${selectedIndex}` : 'off'}
                  class="solutions__dot-fill"
                  style={{ animationDuration: `${AUTOPLAY_MS}ms` }}
                />
              </button>
            ))}
          </div>
          <div class="solutions__arrows">
            <button
              type="button"
              class="solutions__nav"
              onClick={() => emblaRef.current?.scrollPrev()}
              aria-label={tr.t('carousel.prev')}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              class="solutions__nav"
              onClick={() => emblaRef.current?.scrollNext()}
              aria-label={tr.t('carousel.next')}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </section>
    </app-solutions-carousel>
  );
}
