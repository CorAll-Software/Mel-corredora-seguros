import { useEffect, useRef, useState } from 'preact/hooks';
import { Send, X } from 'lucide-preact';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { WhatsAppService } from '../../core/services/whatsapp.service';
import { registrarSolicitud } from '../../core/services/solicitudes.client';
import { useTranslation } from '../../core/i18n/i18n';

const directUrl = WhatsAppService.buildGenericUrl('quisiera cotizar un seguro con asesoría personalizada.');

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Botón flotante de WhatsApp: al pulsarlo ya no salta directo al chat, abre la
// modal "¿Tienes dudas? Escríbeme" con nombre, número y consulta obligatorios
// (el mensaje llega a Melanie con los datos del visitante, sin firma legal).
export default function WhatsAppFloat() {
  const tr = useTranslation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  // Errores por campo + contador de intento (remonta los mensajes para que la
  // animacion "salte" de nuevo en cada intento fallido)
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    firstFieldRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
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
      document.querySelector<HTMLElement>('.wafloat')?.focus();
    };
  }, [open]);

  const setField = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    // Al corregir un campo se limpia su error
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined as unknown as string } : prev));
  };

  const submit = (event: Event) => {
    event.preventDefault();
    const name = (form.name ?? '').trim();
    const phoneRaw = (form.phone ?? '').trim();
    const consulta = (form.consulta ?? '').trim();
    const consent = form.consent === 'ok';
    const phoneOk = phoneRaw.replace(/\D/g, '').length >= 9 && /^[+\d][\d\s()-]*$/.test(phoneRaw);

    const next: Record<string, string> = {};
    if (!name) {
      next.name = tr.t('ask.errRequired');
    }
    if (!phoneOk) {
      next.phone = tr.t('ask.errRequired');
    }
    if (!consulta) {
      next.consulta = tr.t('ask.errConsulta');
    }
    if (!consent) {
      next.consent = tr.t('ask.errConsent');
    }
    setErrors(next);
    setAttempt((a) => a + 1);

    if (Object.keys(next).length > 0) {
      containerRef.current
        ?.querySelector<HTMLElement>('.wask__field--error input, .wask__consent input')
        ?.focus();
      return;
    }

    const url = WhatsAppService.buildAskUrl(name, consulta);
    // Primero se guarda en la bandeja de Melanie (issue #47); WhatsApp se abre
    // en el mismo clic aunque el guardado falle.
    registrarSolicitud({
      origen: 'dudas',
      nombre: name,
      telefono: phoneRaw,
      datos: [{ label: 'Consulta', value: consulta }],
      idioma: tr.current.code,
      acepta: true,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    setOpen(false);
    setForm({});
    setErrors({});
  };

  return (
    <app-whatsapp-float>
      <a
        class="wafloat"
        href={directUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={tr.t('navbar.waFloatAria')}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <WhatsAppIcon size={30} />
        <span class="wafloat__tooltip">{tr.t('navbar.waChat')}</span>
      </a>

      {open && (
        <app-whatsapp-ask>
          <div class="dialog-overlay">
            <div class="dialog-overlay__backdrop" onClick={() => setOpen(false)}></div>
            <div class="dialog-overlay__pane">
              <div
                class="dialog-overlay__container"
                role="dialog"
                aria-modal="true"
                aria-labelledby="wask-title"
                ref={containerRef}
                tabIndex={-1}
              >
                <div class="wask">
                  <button
                    type="button"
                    class="wask__close"
                    onClick={() => setOpen(false)}
                    aria-label={tr.t('ask.close')}
                  >
                    <X size={18} />
                  </button>

                  <h2 class="wask__title" id="wask-title">{tr.t('ask.title')}</h2>
                  <p class="wask__intro">{tr.t('ask.intro')}</p>

                  <form class="wask__form" onSubmit={submit} noValidate>
                    <p class="wask__required">{tr.t('ask.required')}</p>

                    <label class={`wask__field${errors.name ? ' wask__field--error' : ''}`}>
                      <span>{tr.t('ask.name')} *</span>
                      <input
                        ref={firstFieldRef}
                        type="text"
                        name="name"
                        required
                        value={form.name ?? ''}
                        onInput={(e) => setField('name', (e.target as HTMLInputElement).value)}
                      />
                      {errors.name && (
                        <span class="wask__error" role="alert" key={`name-${attempt}`}>
                          {errors.name}
                        </span>
                      )}
                    </label>

                    <label class={`wask__field${errors.phone ? ' wask__field--error' : ''}`}>
                      <span>{tr.t('ask.phone')} *</span>
                      <input
                        type="tel"
                        name="phone"
                        required
                        minLength={9}
                        placeholder="+51"
                        pattern="[+\d][\d\s()-]{7,}"
                        value={form.phone ?? ''}
                        onInput={(e) => setField('phone', (e.target as HTMLInputElement).value)}
                      />
                      {errors.phone && (
                        <span class="wask__error" role="alert" key={`phone-${attempt}`}>
                          {errors.phone}
                        </span>
                      )}
                    </label>

                    <label class={`wask__field${errors.consulta ? ' wask__field--error' : ''}`}>
                      <span>{tr.t('ask.consulta')} *</span>
                      <textarea
                        name="consulta"
                        rows={4}
                        required
                        value={form.consulta ?? ''}
                        onInput={(e) => setField('consulta', (e.target as HTMLTextAreaElement).value)}
                      ></textarea>
                      {errors.consulta && (
                        <span class="wask__error" role="alert" key={`consulta-${attempt}`}>
                          {errors.consulta}
                        </span>
                      )}
                    </label>

                    <div class="wask__consent-wrap">
                      <label class="wask__consent">
                        <input
                          type="checkbox"
                          required
                          checked={form.consent === 'ok'}
                          onInput={(e) => setField('consent', (e.target as HTMLInputElement).checked ? 'ok' : '')}
                        />
                        {tr.t('ask.consent')} *
                      </label>
                      {errors.consent && (
                        <span class="wask__error" role="alert" key={`consent-${attempt}`}>
                          {errors.consent}
                        </span>
                      )}
                    </div>

                    <button type="submit" class="wask__submit">
                      <Send size={17} />
                      {tr.t('ask.submit')}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </app-whatsapp-ask>
      )}
    </app-whatsapp-float>
  );
}
