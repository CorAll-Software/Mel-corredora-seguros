import { useState } from 'preact/hooks';
import { CalendarCheck } from 'lucide-preact';
import type { CalendarBooking } from '../../core/config/booking.config';
import { useTranslation } from '../../core/i18n/i18n';

// Reservas conectadas a Google Calendar: las citas se agendan directo en el calendario de
// Melanie, con disponibilidad en tiempo real, sin dobles reservas e invitación por correo.
// En móvil el calendario (muy alto) queda tras un botón para no alargar la página.
export function GoogleCalendarBooking({ booking }: { booking: NonNullable<CalendarBooking> }) {
  const tr = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <app-google-calendar>
      <div class={`gcal${open ? ' gcal--open' : ''}`}>
        {booking.mode === 'embed' ? (
          <>
            <div class="gcal__intro">
              <CalendarCheck size={30} />
              <p>{tr.t('schedule.pickHint')}</p>
              <button type="button" class="gcal__open" onClick={() => setOpen(true)}>
                {tr.t('schedule.pickSlot')}
              </button>
            </div>
            {/* .gcal__viewport recorta el encabezado interno de Google (nombre
                de la cuenta del calendario de prueba) y la scrollbar interna */}
            <div class="gcal__viewport">
              <iframe
                class="gcal__frame"
                src={booking.url}
                title="Agendar una cita con Melanie O. Calderón Vega"
                loading="lazy"
                referrerpolicy="strict-origin-when-cross-origin"
                // storage-access: reduce el error "requestStorageAccess:
                // Permission denied" del reCAPTCHA interno de Google
                allow="storage-access"
              ></iframe>
            </div>
          </>
        ) : (
          <div class="gcal__link">
            <CalendarCheck size={34} />
            <p>{tr.t('schedule.pickHint')}</p>
            <a class="gcal__btn" href={booking.url} target="_blank" rel="noopener noreferrer">
              {tr.t('schedule.pickSlot')}
            </a>
          </div>
        )}
      </div>
    </app-google-calendar>
  );
}
