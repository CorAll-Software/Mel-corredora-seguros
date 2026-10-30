import { useEffect, useRef, useState } from 'preact/hooks';
import EmblaCarousel, { type EmblaCarouselType } from 'embla-carousel';
import { ChevronLeft, ChevronRight, MessageSquareHeart, Star } from 'lucide-preact';
import { useTranslation } from '../../core/i18n/i18n';
import { BRAND_CONFIG } from '../../core/config/brand.config';

// Recomendaciones de clientes (issue #43, informe tercera revisión §3). Solo
// muestra las que Melanie aprobó en el panel; se piden al cargar la página, así
// una aprobación aparece sin volver a desplegar. Sin aprobadas, la sección no se
// muestra vacía: solo el botón "Sé el primero…". Nunca hay testimonios de ejemplo.
// TODO-GOOGLE-PERFIL (issue #19): enlace opcional a su perfil de Google para reseñas.

interface RecomendacionPublica {
  id: number;
  nombre: string;
  empresaCargo: string | null;
  seguro: string;
  estrellas: number;
  texto: string;
  foto: string | null;
  fecha: string;
}

const FORM_URL = '/recomendar';
// Mismo ritmo que el carrusel de Soluciones.
const AUTOPLAY_MS = 6000;

// Datos estructurados Review solo con recomendaciones reales aprobadas.
function reviewJsonLd(items: RecomendacionPublica[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: BRAND_CONFIG.ownerName,
    jobTitle: BRAND_CONFIG.roleTitle,
    review: items.map((item) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: item.nombre },
      datePublished: item.fecha.slice(0, 10),
      reviewBody: item.texto,
      reviewRating: { '@type': 'Rating', ratingValue: item.estrellas, bestRating: 5, worstRating: 1 },
    })),
  });
}

export function Testimonials() {
  const tr = useTranslation();
  const [items, setItems] = useState<RecomendacionPublica[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [snapCount, setSnapCount] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const emblaRef = useRef<EmblaCarouselType | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/recomendaciones/aprobadas')
      .then((response) => (response.ok ? response.json() : { recomendaciones: [] }))
      .then((data: { recomendaciones?: RecomendacionPublica[] }) => {
        if (!cancelled) {
          setItems(data.recomendaciones ?? []);
        }
      })
      // Sin conexión con el servidor se comporta como "sin aprobadas": solo el botón.
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const hasItems = items !== null && items.length > 0;

  // Datos estructurados para buscadores, solo si hay aprobadas reales.
  useEffect(() => {
    if (!hasItems) {
      return;
    }
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = reviewJsonLd(items!);
    document.head.appendChild(script);
    return () => script.remove();
  }, [items]);

  // Carrusel (Embla) cuando ya hay tarjetas en el DOM.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!hasItems || !viewport) {
      return;
    }
    const api = EmblaCarousel(viewport, { loop: true, align: 'start' });
    emblaRef.current = api;
    const sync = () => {
      setSelectedIndex(api.selectedScrollSnap());
      setSnapCount(api.scrollSnapList().length);
    };
    api.on('init', sync).on('reInit', sync).on('select', sync);
    sync();
    return () => {
      api.destroy();
      emblaRef.current = null;
    };
  }, [items]);

  // Avance automático: se pausa con el cursor o el dedo encima, con el foco dentro,
  // fuera de pantalla, con la pestaña oculta o con "reducir movimiento".
  useEffect(() => {
    const viewport = viewportRef.current;
    const api = emblaRef.current;
    if (!viewport || !api || snapCount < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    let timer: number | null = null;
    let paused = false;
    let visible = false;
    const stop = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };
    const schedule = () => {
      stop();
      if (!paused && visible && !document.hidden) {
        timer = window.setTimeout(() => api.scrollNext(), AUTOPLAY_MS);
      }
    };
    const pause = () => {
      paused = true;
      stop();
    };
    const resume = () => {
      paused = false;
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
  }, [snapCount]);

  // Mientras carga no se pinta nada (evita mostrar un estado que luego cambia).
  if (items === null) {
    return null;
  }

  if (!hasItems) {
    return (
      <app-testimonials>
        <section class="testimonials testimonials--empty" id="recomendaciones" aria-label={tr.t('testimonials.title')}>
          <div class="container">
            <a class="btn-chunk btn-chunk--yellow testimonials__first" href={FORM_URL}>
              <MessageSquareHeart size={20} aria-hidden="true" />
              {tr.t('testimonials.first')}
            </a>
          </div>
        </section>
      </app-testimonials>
    );
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      emblaRef.current?.scrollPrev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      emblaRef.current?.scrollNext();
    }
  };

  return (
    <app-testimonials>
      <section class="section screen testimonials" id="recomendaciones" aria-labelledby="testimonials-title">
        <div class="container testimonials__head">
          <p class="eyebrow eyebrow--orange">{tr.t('testimonials.eyebrow')}</p>
          <h2 id="testimonials-title" class="section-title">
            {tr.t('testimonials.title')}
          </h2>
        </div>

        <div class="container">
          <div
            class="testimonials__viewport"
            ref={viewportRef}
            role="region"
            aria-roledescription="carousel"
            aria-label={tr.t('testimonials.carouselAria')}
            tabIndex={0}
            onKeyDown={onKeyDown}
          >
            <ul class="testimonials__track">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  class="testimonials__slide"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={tr.t('testimonials.slideAria').replace('{n}', String(index + 1)).replace('{total}', String(items.length))}
                >
                  <article class="testimonial">
                    <div class="testimonial__stars" role="img" aria-label={tr.t('testimonials.starsAria').replace('{n}', String(item.estrellas))}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={20} class={n <= item.estrellas ? 'is-on' : ''} aria-hidden="true" />
                      ))}
                    </div>
                    <blockquote class="testimonial__text">{item.texto}</blockquote>
                    <footer class="testimonial__who">
                      {item.foto ? (
                        <img
                          class="testimonial__photo"
                          src={item.foto}
                          alt={tr.t('testimonials.photoAlt').replace('{name}', item.nombre)}
                          width={56}
                          height={56}
                          loading="lazy"
                        />
                      ) : (
                        <span class="testimonial__photo testimonial__photo--initial" aria-hidden="true">
                          {item.nombre.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span class="testimonial__name-wrap">
                        <strong class="testimonial__name">{item.nombre}</strong>
                        {item.empresaCargo && <span class="testimonial__company">{item.empresaCargo}</span>}
                        <span class="testimonial__chip">{tr.t(`recommend.insurances.${item.seguro}`)}</span>
                      </span>
                    </footer>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div class="container testimonials__controls">
          {snapCount > 1 && (
            <div class="testimonials__nav">
              <div class="testimonials__dots" aria-label={tr.t('testimonials.carouselAria')}>
                {Array.from({ length: snapCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    class={`testimonials__dot${selectedIndex === index ? ' testimonials__dot--active' : ''}`}
                    aria-label={tr.t('testimonials.slideAria').replace('{n}', String(index + 1)).replace('{total}', String(snapCount))}
                    aria-current={selectedIndex === index}
                    onClick={() => emblaRef.current?.scrollTo(index)}
                  />
                ))}
              </div>
              <div class="testimonials__arrows">
                <button type="button" class="testimonials__arrow" onClick={() => emblaRef.current?.scrollPrev()} aria-label={tr.t('testimonials.prev')}>
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <button type="button" class="testimonials__arrow" onClick={() => emblaRef.current?.scrollNext()} aria-label={tr.t('testimonials.next')}>
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
          <a class="btn-chunk btn-chunk--yellow testimonials__cta" href={FORM_URL}>
            <MessageSquareHeart size={20} aria-hidden="true" />
            {tr.t('testimonials.cta')}
          </a>
        </div>
      </section>
    </app-testimonials>
  );
}
