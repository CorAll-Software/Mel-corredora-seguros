import { useEffect, useRef, useState } from 'preact/hooks';
import { CircleCheck, X } from 'lucide-preact';
import { useTranslation } from '../../core/i18n/i18n';
import type { ServiceDetail } from '../../core/models/insurance-service.model';
import {
  QUOTE_FORM_FIELDS,
  SERVICE_NARRATIVES,
  SERVICE_VIDEOS,
  TYPE_CAROUSEL_FIELDS,
} from '../../core/data/landing.data';
import { WhatsAppService } from '../../core/services/whatsapp.service';
import { registrarSolicitud } from '../../core/services/solicitudes.client';
import { ServiceNarrative } from './ServiceNarrative';
import { ServiceTypeCarousel } from './ServiceTypeCarousel';
import { Mepo } from './Mepo';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

interface ServiceDetailModalProps {
  service: ServiceDetail;
  onClose: () => void;
}

// Diálogo modal: capa a pantalla completa que cierra al hacer clic fuera o con Escape,
// enfoca el botón de cierre al abrir, atrapa el foco y lo devuelve al origen al cerrar.
// Estructura de ficha (feedback §4): video 16:9 -> qué es -> qué te protege (3 puntos)
// -> formulario corto por seguro -> botón "Cotizar por WhatsApp".
export function ServiceDetailModal({ service, onClose }: ServiceDetailModalProps) {
  const tr = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !containerRef.current) {
        return;
      }
      const items = Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) {
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !containerRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !containerRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  const key = `services.${service.id}`;
  const coberturas = tr.list(`${key}.coberturas`).slice(0, 3);
  const entidades = tr.tOptional(`${key}.entidades`);
  const extraFields = QUOTE_FORM_FIELDS[service.id] ?? [];
  const carouselField = TYPE_CAROUSEL_FIELDS[service.id];
  const narrative = SERVICE_NARRATIVES[service.id];

  const [form, setForm] = useState<Record<string, string>>({});
  const setField = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = (event: Event) => {
    event.preventDefault();
    const fields = [
      { label: tr.t('form.name'), value: form.name ?? '' },
      { label: tr.t('form.email'), value: form.email ?? '' },
      { label: tr.t('form.phone'), value: form.phone ?? '' },
      ...extraFields.map((f) => ({ label: tr.t(`fields.${f.key}`), value: form[f.key] ?? '' })),
    ];
    const url = WhatsAppService.buildFichaQuoteUrl(tr.t(`${key}.title`), fields);
    // Primero se guarda en la bandeja de Melanie (issue #47); WhatsApp se abre
    // en el mismo clic aunque el guardado falle.
    registrarSolicitud({
      origen: 'ficha',
      ramo: tr.t(`${key}.title`),
      nombre: form.name ?? '',
      telefono: form.phone,
      correo: form.email,
      datos: fields.slice(3),
      idioma: tr.current.code,
      acepta: true,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div class="dialog-overlay">
      <div class="dialog-overlay__backdrop" onClick={onClose}></div>
      <div class="dialog-overlay__pane">
        <div class="dialog-overlay__container" role="dialog" ref={containerRef} tabIndex={-1}>
          <app-service-detail-modal>
            <div class="detail" data-svc={service.id}>
              <button type="button" class="detail__close" onClick={onClose} aria-label={tr.t('modal.close')} ref={closeRef}>
                <X size={18} />
              </button>

              <aside class="detail__visual">
                <img src={service.image} alt={tr.t(`${key}.title`)} class="detail__photo" />
                <div class="detail__visual-top">
                  <span class="detail__tag">{tr.t(`${key}.tag`)}</span>
                  <span class="detail__time">{tr.t(`${key}.badge`)}</span>
                </div>
                {service.mepo && (
                  <div class="detail__tip">
                    <Mepo size={52} />
                    <p>{tr.t(`${key}.tip`)}</p>
                  </div>
                )}
              </aside>

              <div class="detail__content">
                <h2 class="detail__title">{tr.t(`${key}.title`)}</h2>
                {entidades && <p class="detail__regulatory">{entidades}</p>}

                {/* 1. Espacio para el video de Melanie (16:9). Con URL en SERVICE_VIDEOS
                    se embebe el video; sin URL se mantiene la portada "Muy pronto" */}
                <figure class="detail__video">
                  {SERVICE_VIDEOS[service.id] ? (
                    <iframe
                      class="detail__video-frame"
                      src={SERVICE_VIDEOS[service.id]}
                      title={tr.t(`${key}.title`)}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerpolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <>
                      <img src={service.image} alt="" class="detail__video-cover" loading="lazy" />
                      <figcaption class="detail__video-note">
                        <span aria-hidden="true">▶</span>
                        {tr.t('video.placeholder')}
                      </figcaption>
                    </>
                  )}
                </figure>

                {/* Carrusel de tipos (feedback §4, issue #12): solo fichas formales.
                    "Cotizar esta..." preselecciona el campo y baja al formulario. */}
                {carouselField && (
                  <ServiceTypeCarousel
                    serviceId={service.id}
                    onChoose={(value) => {
                      setField(carouselField, value);
                      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                      containerRef.current
                        ?.querySelector('.detail__form')
                        ?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
                    }}
                  />
                )}

                {/* 2. Qué es (2 líneas) */}
                <section class="detail__block">
                  <h3>{tr.t('modal.about')}</h3>
                  <p class="detail__about">{tr.t(`${key}.summary`)}</p>
                </section>

                {/* 3. Qué te protege (3 puntos) */}
                <section class="detail__block">
                  <h3>{tr.t('modal.protection')}</h3>
                  <ul>
                    {coberturas.map((item) => (
                      <li key={item}>
                        <CircleCheck size={18} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Carta fianza en 7 pasos (feedback §6, issue #13), solo en la ficha de fianzas */}
                {narrative === 'pasos' && <ServiceNarrative variant="pasos" />}

                {/* 4. Formulario corto con los datos del seguro */}
                <form class="detail__form" onSubmit={submit}>
                  <h3>{tr.t('form.title')}</h3>
                  <div class="detail__form-grid">
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder={tr.t('form.name')}
                      value={form.name ?? ''}
                      onInput={(e) => setField('name', (e.target as HTMLInputElement).value)}
                    />
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder={tr.t('form.email')}
                      value={form.email ?? ''}
                      onInput={(e) => setField('email', (e.target as HTMLInputElement).value)}
                    />
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder={tr.t('form.phone')}
                      value={form.phone ?? ''}
                      onInput={(e) => setField('phone', (e.target as HTMLInputElement).value)}
                    />
                    {extraFields.map((f) =>
                      f.type === 'select' ? (
                        <select
                          key={f.key}
                          name={f.key}
                          required
                          value={form[f.key] ?? ''}
                          onInput={(e) => setField(f.key, (e.target as HTMLSelectElement).value)}
                        >
                          <option value="" disabled>
                            {tr.t(`fields.${f.key}`)}
                          </option>
                          {tr.list(`fields.${f.key}Options`).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          key={f.key}
                          type="text"
                          name={f.key}
                          placeholder={tr.t(`fields.${f.key}`)}
                          value={form[f.key] ?? ''}
                          onInput={(e) => setField(f.key, (e.target as HTMLInputElement).value)}
                        />
                      ),
                    )}
                  </div>
                  <label class="detail__consent">
                    <input
                      type="checkbox"
                      required
                      checked={form.consent === 'ok'}
                      onInput={(e) => setField('consent', (e.target as HTMLInputElement).checked ? 'ok' : '')}
                    />
                    {tr.t('form.consent')}
                  </label>

                  {/* 5. Botón de cotización por WhatsApp con mensaje prellenado */}
                  <button type="submit" class="detail__cta">
                    {tr.t('form.submit')}
                  </button>
                </form>

                {/* Tres formas de proteger lo que más quieres (feedback §6, issue #13), solo en la ficha de Vida */}
                {narrative === 'casos' && <ServiceNarrative variant="casos" />}
              </div>
            </div>
          </app-service-detail-modal>
        </div>
      </div>
    </div>
  );
}
