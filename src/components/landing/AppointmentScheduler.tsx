import { useState } from 'preact/hooks';
import { BadgeCheck, Check } from 'lucide-preact';
import { BRAND_CONFIG } from '../../core/config/brand.config';
import { WhatsAppService } from '../../core/services/whatsapp.service';
import { registrarSolicitud } from '../../core/services/solicitudes.client';
import { useTranslation } from '../../core/i18n/i18n';
import { CalendarSelector } from './CalendarSelector';
import { Mepo } from './Mepo';
import { GoogleCalendarBooking } from './GoogleCalendarBooking';
import { GOOGLE_CALENDAR_BOOKING } from '../../core/config/booking.config';
import { useAdvisorPhoto } from './useAdvisorPhoto';

const TIME_SLOTS = ['09:30 AM', '11:00 AM', '03:30 PM', '04:45 PM', '05:30 PM'];

export function AppointmentScheduler() {
  const tr = useTranslation();
  const brand = BRAND_CONFIG;

  const photo = useAdvisorPhoto();

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyOrRuc, setCompanyOrRuc] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  // Ley 29733: la cita se guarda en la bandeja de Melanie, así que pide consentimiento.
  const [consent, setConsent] = useState(false);
  // Se guarda el índice del tema para que siga correcto al cambiar de idioma
  const [topicIndex, setTopicIndex] = useState(0);

  const topics = tr.list('schedule.topics');
  const serviceTopic = topics[topicIndex] ?? topics[0] ?? '';

  const canSubmit =
    selectedDate.length > 0 &&
    selectedSlot.length > 0 &&
    fullName.trim().length > 0 &&
    whatsapp.trim().length > 0 &&
    consent;

  const onSubmit = (event: Event) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dateLabel = dateObj.toLocaleDateString(tr.current.locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const url = WhatsAppService.buildAppointmentUrl({
      date: dateLabel,
      time: selectedSlot,
      fullName,
      companyOrRuc,
      serviceTopic,
    });
    // Primero se guarda en la bandeja de Melanie (issue #47); WhatsApp se abre
    // en el mismo clic aunque el guardado falle.
    registrarSolicitud({
      origen: 'agenda',
      ramo: serviceTopic,
      nombre: fullName,
      telefono: whatsapp,
      datos: [
        { label: 'Fecha', value: dateLabel },
        { label: 'Hora', value: selectedSlot },
        { label: 'Empresa / RUC', value: companyOrRuc },
      ],
      idioma: tr.current.code,
      acepta: true,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <app-appointment-scheduler>
      <section class="section screen scheduler" id="agendar">
        <div class="container">
          <div class="scheduler__head">
            <h2 class="section-title">{tr.t('schedule.title')}</h2>
          </div>

          <div class="scheduler__panel">
            <aside class="scheduler__aside">
              <div class="scheduler__photo-card">
                <img
                  src={photo.src}
                  ref={photo.ref}
                  onError={photo.onError}
                  alt={brand.ownerName}
                  class="scheduler__avatar"
                />
                <span class="scheduler__sbs-badge">
                  <BadgeCheck size={14} />
                  {brand.sbsChipShort}
                </span>
              </div>
              <strong class="scheduler__owner">{brand.ownerName}</strong>
              <span class="scheduler__license">
                {tr.t('why.role')} · {brand.licenseId}
              </span>

              <ul class="scheduler__tags">
                {[1, 2, 3].map((n) => (
                  <li key={n}>
                    <Check size={14} strokeWidth={3} />
                    {tr.t(`schedule.tag${n}`)}
                  </li>
                ))}
              </ul>

              <div class="scheduler__tip">
                <Mepo size={46} />
                <p>{tr.t('schedule.mepoTip')}</p>
              </div>

              <p class="scheduler__privacy">{tr.t('schedule.privacy')}</p>
            </aside>

            {GOOGLE_CALENDAR_BOOKING ? (
              <div class="scheduler__form">
                <GoogleCalendarBooking booking={GOOGLE_CALENDAR_BOOKING} />
              </div>
            ) : (
              <form class="scheduler__form" onSubmit={onSubmit} noValidate>
                <fieldset>
                  <legend>{tr.t('schedule.step1')}</legend>
                  <div class="scheduler__step1">
                    <CalendarSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
                    <div class="scheduler__slots-column">
                      <p class="scheduler__slots-title">{tr.t('schedule.slotsTitle')}</p>
                      <div class="scheduler__slots-grid">
                        {TIME_SLOTS.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            class={`scheduler__slot${selectedSlot === slot ? ' scheduler__slot--active' : ''}`}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </fieldset>

                <fieldset>
                  <legend>{tr.t('schedule.step2')}</legend>
                  <div class="scheduler__fields">
                    <input
                      type="text"
                      placeholder={tr.t('schedule.phName')}
                      autocomplete="name"
                      value={fullName}
                      onInput={(e) => setFullName(e.currentTarget.value)}
                      name="fullName"
                      required
                    />
                    <input
                      type="text"
                      placeholder={tr.t('schedule.phCompany')}
                      autocomplete="organization"
                      value={companyOrRuc}
                      onInput={(e) => setCompanyOrRuc(e.currentTarget.value)}
                      name="companyOrRuc"
                    />
                    <input
                      type="tel"
                      placeholder={tr.t('schedule.phWhats')}
                      autocomplete="tel"
                      value={whatsapp}
                      onInput={(e) => setWhatsapp(e.currentTarget.value)}
                      name="whatsapp"
                      required
                    />
                    <select
                      value={String(topicIndex)}
                      onChange={(e) => setTopicIndex(Number(e.currentTarget.value))}
                      name="serviceTopic"
                      required
                    >
                      {topics.map((topic, index) => (
                        <option key={index} value={String(index)}>
                          {topic}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label class="scheduler__consent">
                    <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.currentTarget.checked)} required />
                    <span>{tr.t('schedule.consent')}</span>
                  </label>
                </fieldset>

                <button type="submit" class="scheduler__confirm" disabled={!canSubmit}>
                  {tr.t('schedule.confirm')}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </app-appointment-scheduler>
  );
}
