import { useEffect, useRef, useState } from 'preact/hooks';
import { Siren } from 'lucide-preact';
import { WhatsAppIcon } from '../ui/WhatsAppIcon';
import { EMERGENCY_CONTACTS } from '../../core/config/emergency.config';
import { WhatsAppService } from '../../core/services/whatsapp.service';
import { useTranslation } from '../../core/i18n/i18n';

const FOCUSABLE = 'a[href], button:not([disabled])';

// Canal principal mientras llegan los telefonos (TODO-EMERGENCIAS, issue #19)
const waUrl = WhatsAppService.buildGenericUrl(
  'tengo una emergencia de siniestro y necesito ayuda.'
);

// Boton "¿Emergencia?" (feedback §5, issue #16): popover accesible en la navbar
// con el WhatsApp de Melanie como canal principal y la lista de telefonos de
// siniestros por aseguradora (tel: clicable). Escape/clic fuera cierran y el
// foco queda atrapado entre el disparador y el panel.
export function EmergencyButton() {
  const tr = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) {
        return;
      }
      const items = [btnRef.current, ...Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))].filter(
        (el): el is HTMLElement => el !== null
      );
      if (!items.length) {
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panelRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <app-emergency-button>
      <div class="emg" ref={wrapRef} onClick={(e) => e.stopPropagation()}>
        {/* Solo icono (rediseño de navbar): el nombre aparece como tooltip */}
        <button
          type="button"
          ref={btnRef}
          class={`ico-btn ico-btn--emg${open ? ' ico-btn--emg-on' : ''}`}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={tr.t('emergency.button')}
          onClick={() => setOpen(!open)}
        >
          <Siren size={20} />
          <span class="emg__pulse" aria-hidden="true" />
          <span class="ico-tip" aria-hidden="true">
            {tr.t('emergency.button')}
          </span>
        </button>
        {open && (
          <div class="emg__panel" role="dialog" aria-label={tr.t('emergency.title')} ref={panelRef} tabIndex={-1}>
            <p class="emg__title">{tr.t('emergency.title')}</p>
            <a class="emg__wa" href={waUrl} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon size={16} />
              {tr.t('emergency.whatsapp')}
            </a>
            <ul class="emg__list">
              {EMERGENCY_CONTACTS.map((contact) => (
                <li key={contact.name}>
                  <span class="emg__insurer">{contact.name}</span>
                  {contact.phone ? (
                    <a class="emg__phone" href={`tel:${contact.phone.replace(/\s+/g, '')}`}>
                      {contact.phone}
                    </a>
                  ) : (
                    <span class="emg__phone emg__phone--pending">{tr.t('emergency.pending')}</span>
                  )}
                </li>
              ))}
            </ul>
            <p class="emg__hint">{tr.t('emergency.hint')}</p>
          </div>
        )}
      </div>
    </app-emergency-button>
  );
}
