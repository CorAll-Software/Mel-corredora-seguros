import { useEffect, useRef, useState } from 'preact/hooks';
import { ImagePlus, Send, Star, X } from 'lucide-preact';
import { useTranslation } from '../../core/i18n/i18n';
import {
  RECOMENDACION_LIMITES,
  RECOMENDACION_SEGUROS,
  type RecomendacionErrorCode,
} from '../../core/models/recomendacion.model';
import { Mepo } from '../landing/Mepo';

// Formulario "Deja tu recomendación" (issue #41, informe tercera revisión §3).
// Guarda la recomendación como pendiente: nada se publica sin que Melanie la apruebe.

type Field = 'nombre' | 'empresaCargo' | 'seguro' | 'estrellas' | 'texto' | 'foto' | 'autorizaPublicacion' | 'aceptaDatos';
type Errors = Partial<Record<Field, RecomendacionErrorCode>>;

const FIELD_ORDER: Field[] = ['nombre', 'empresaCargo', 'seguro', 'estrellas', 'texto', 'foto', 'autorizaPublicacion', 'aceptaDatos'];

function checkPhoto(file: File): RecomendacionErrorCode | undefined {
  if (!(RECOMENDACION_LIMITES.fotoTipos as readonly string[]).includes(file.type)) {
    return 'photo_type';
  }
  if (file.size > RECOMENDACION_LIMITES.fotoBytes) {
    return 'photo_size';
  }
  return undefined;
}

export function RecommendationForm() {
  const tr = useTranslation();
  const [nombre, setNombre] = useState('');
  const [empresaCargo, setEmpresaCargo] = useState('');
  const [seguro, setSeguro] = useState('');
  const [estrellas, setEstrellas] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [texto, setTexto] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [autorizaPublicacion, setAutorizaPublicacion] = useState(false);
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const thanksRef = useRef<HTMLHeadingElement>(null);

  // Libera la vista previa al cambiar de imagen o al salir.
  useEffect(() => {
    if (!foto) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(foto);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  useEffect(() => {
    if (sent) {
      thanksRef.current?.focus();
    }
  }, [sent]);

  const errorText = (field: Field) => (errors[field] ? tr.t(`recommend.errors.${errors[field]}`) : undefined);
  const clearError = (field: Field) => setErrors((current) => ({ ...current, [field]: undefined }));

  const focusFirstError = (found: Errors) => {
    const first = FIELD_ORDER.find((field) => found[field]);
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
    }
  };

  const validate = (): Errors => {
    const found: Errors = {};
    if (!nombre.trim()) found.nombre = 'required';
    if (!seguro) found.seguro = 'required';
    if (estrellas < 1 || estrellas > 5) found.estrellas = 'rating';
    if (!texto.trim()) found.texto = 'required';
    if (foto) found.foto = checkPhoto(foto);
    if (!autorizaPublicacion) found.autorizaPublicacion = 'consent_required';
    if (!aceptaDatos) found.aceptaDatos = 'consent_required';
    return Object.fromEntries(Object.entries(found).filter(([, code]) => code)) as Errors;
  };

  const onPhoto = (event: Event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;
    if (!file) {
      return;
    }
    const problem = checkPhoto(file);
    setErrors((current) => ({ ...current, foto: problem }));
    setFoto(problem ? null : file);
    if (problem && fileRef.current) {
      fileRef.current.value = '';
    }
  };

  const removePhoto = () => {
    setFoto(null);
    clearError('foto');
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  const onSubmit = async (event: Event) => {
    event.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError(tr.t('recommend.errors.review'));
      focusFirstError(found);
      return;
    }

    const body = new FormData();
    body.set('nombre', nombre);
    body.set('empresaCargo', empresaCargo);
    body.set('seguro', seguro);
    body.set('estrellas', String(estrellas));
    body.set('texto', texto);
    body.set('autorizaPublicacion', String(autorizaPublicacion));
    body.set('aceptaDatos', String(aceptaDatos));
    body.set('idioma', tr.lang);
    body.set('website', website);
    if (foto) {
      body.set('foto', foto);
    }

    setSending(true);
    try {
      const response = await fetch('/api/recomendaciones', { method: 'POST', body });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; details?: Errors };
      if (response.ok && result.ok) {
        setSent(true);
        return;
      }
      if (result.error === 'validation_error' && result.details) {
        setErrors(result.details);
        setFormError(tr.t('recommend.errors.review'));
        focusFirstError(result.details);
      } else if (result.error === 'rate_limited') {
        setFormError(tr.t('recommend.errors.rate_limited'));
      } else {
        setFormError(tr.t('recommend.errors.generic'));
      }
    } catch {
      setFormError(tr.t('recommend.errors.generic'));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <app-recommendation-form>
        <div class="rec-thanks" role="status">
          <Mepo size={150} class="rec-thanks__mepo" />
          <h2 class="rec-thanks__title" tabIndex={-1} ref={thanksRef}>
            {tr.t('recommend.thanksTitle')}
          </h2>
          <p class="rec-thanks__text">{tr.t('recommend.thanksText')}</p>
          <a class="btn-chunk btn-chunk--yellow" href="/">
            {tr.t('recommend.backHome')}
          </a>
        </div>
      </app-recommendation-form>
    );
  }

  const shownStars = hoverStars || estrellas;
  const remaining = texto.length;

  return (
    <app-recommendation-form>
      <div class="rec-form">
        <header class="rec-form__head">
          <div class="rec-form__mepo">
            <Mepo size={96} />
            <p class="rec-form__bubble">{tr.t('recommend.mepoSays')}</p>
          </div>
          <p class="eyebrow eyebrow--orange">{tr.t('recommend.eyebrow')}</p>
          <h1 class="rec-form__title">{tr.t('recommend.title')}</h1>
          <p class="rec-form__lead">{tr.t('recommend.lead')}</p>
          <p class="rec-form__required">{tr.t('recommend.required')}</p>
        </header>

        <form ref={formRef} class="rec-form__body" noValidate onSubmit={onSubmit}>
          {formError && (
            <p class="rec-form__alert" role="alert">
              {formError}
            </p>
          )}

          <div class={`rec-field${errors.nombre ? ' rec-field--error' : ''}`}>
            <label class="rec-field__label" for="rec-nombre">
              {tr.t('recommend.name')} *
            </label>
            <input
              id="rec-nombre"
              data-field="nombre"
              class="rec-field__input"
              type="text"
              autoComplete="name"
              maxLength={RECOMENDACION_LIMITES.nombre}
              value={nombre}
              aria-invalid={errors.nombre ? 'true' : undefined}
              aria-describedby={errors.nombre ? 'rec-nombre-error' : undefined}
              onInput={(e) => {
                setNombre(e.currentTarget.value);
                clearError('nombre');
              }}
            />
            {errors.nombre && (
              <p id="rec-nombre-error" class="rec-field__error">
                {errorText('nombre')}
              </p>
            )}
          </div>

          <div class={`rec-field${errors.empresaCargo ? ' rec-field--error' : ''}`}>
            <label class="rec-field__label" for="rec-empresa">
              {tr.t('recommend.company')} <span class="rec-field__optional">{tr.t('recommend.optional')}</span>
            </label>
            <input
              id="rec-empresa"
              data-field="empresaCargo"
              class="rec-field__input"
              type="text"
              autoComplete="organization-title"
              maxLength={RECOMENDACION_LIMITES.empresaCargo}
              placeholder={tr.t('recommend.companyPlaceholder')}
              value={empresaCargo}
              onInput={(e) => {
                setEmpresaCargo(e.currentTarget.value);
                clearError('empresaCargo');
              }}
            />
            {errors.empresaCargo && <p class="rec-field__error">{errorText('empresaCargo')}</p>}
          </div>

          <div class={`rec-field${errors.seguro ? ' rec-field--error' : ''}`}>
            <label class="rec-field__label" for="rec-seguro">
              {tr.t('recommend.insurance')} *
            </label>
            <select
              id="rec-seguro"
              data-field="seguro"
              class="rec-field__input rec-field__select"
              value={seguro}
              aria-invalid={errors.seguro ? 'true' : undefined}
              aria-describedby={errors.seguro ? 'rec-seguro-error' : undefined}
              onChange={(e) => {
                setSeguro(e.currentTarget.value);
                clearError('seguro');
              }}
            >
              <option value="" disabled>
                {tr.t('recommend.insurancePlaceholder')}
              </option>
              {RECOMENDACION_SEGUROS.map((key) => (
                <option value={key}>{tr.t(`recommend.insurances.${key}`)}</option>
              ))}
            </select>
            {errors.seguro && (
              <p id="rec-seguro-error" class="rec-field__error">
                {errorText('seguro')}
              </p>
            )}
          </div>

          {/* Estrellas: grupo de radios nativo, se maneja con flechas del teclado */}
          <fieldset
            class={`rec-field rec-stars${errors.estrellas ? ' rec-field--error' : ''}`}
            aria-describedby={errors.estrellas ? 'rec-stars-error' : undefined}
          >
            <legend class="rec-field__label">{tr.t('recommend.rating')} *</legend>
            <div class="rec-stars__row" onMouseLeave={() => setHoverStars(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <label class={`rec-stars__star${n <= shownStars ? ' rec-stars__star--on' : ''}`} onMouseEnter={() => setHoverStars(n)}>
                  <input
                    type="radio"
                    name="estrellas"
                    value={n}
                    class="rec-stars__input"
                    data-field={n === 1 ? 'estrellas' : undefined}
                    checked={estrellas === n}
                    onChange={() => {
                      setEstrellas(n);
                      clearError('estrellas');
                    }}
                  />
                  <Star size={34} aria-hidden="true" />
                  <span class="rec-sr">{tr.t('recommend.ratingStar').replace('{n}', String(n))}</span>
                </label>
              ))}
            </div>
            {errors.estrellas && (
              <p id="rec-stars-error" class="rec-field__error">
                {errorText('estrellas')}
              </p>
            )}
          </fieldset>

          <div class={`rec-field${errors.texto ? ' rec-field--error' : ''}`}>
            <label class="rec-field__label" for="rec-texto">
              {tr.t('recommend.text')} *
            </label>
            <textarea
              id="rec-texto"
              data-field="texto"
              class="rec-field__input rec-field__textarea"
              rows={5}
              maxLength={RECOMENDACION_LIMITES.texto}
              placeholder={tr.t('recommend.textPlaceholder')}
              value={texto}
              aria-invalid={errors.texto ? 'true' : undefined}
              aria-describedby={`rec-texto-counter${errors.texto ? ' rec-texto-error' : ''}`}
              onInput={(e) => {
                setTexto(e.currentTarget.value);
                clearError('texto');
              }}
            />
            <p
              id="rec-texto-counter"
              class={`rec-field__counter${remaining >= RECOMENDACION_LIMITES.texto - 50 ? ' rec-field__counter--warn' : ''}`}
              aria-live="polite"
            >
              {tr.t('recommend.counter').replace('{n}', String(remaining))}
            </p>
            {errors.texto && (
              <p id="rec-texto-error" class="rec-field__error">
                {errorText('texto')}
              </p>
            )}
          </div>

          <div class={`rec-field${errors.foto ? ' rec-field--error' : ''}`}>
            <span class="rec-field__label" id="rec-foto-label">
              {tr.t('recommend.photo')} <span class="rec-field__optional">{tr.t('recommend.optional')}</span>
            </span>
            <div class="rec-photo">
              {preview && <img class="rec-photo__preview" src={preview} alt={tr.t('recommend.photoPreview')} />}
              <label class="rec-photo__choose">
                <input
                  ref={fileRef}
                  data-field="foto"
                  class="rec-photo__input"
                  type="file"
                  accept={RECOMENDACION_LIMITES.fotoTipos.join(',')}
                  aria-labelledby="rec-foto-label"
                  aria-describedby={`rec-foto-hint${errors.foto ? ' rec-foto-error' : ''}`}
                  onChange={onPhoto}
                />
                <ImagePlus size={20} aria-hidden="true" />
                <span>{foto ? tr.t('recommend.photoChange') : tr.t('recommend.photoChoose')}</span>
              </label>
              {foto && (
                <button type="button" class="rec-photo__remove" onClick={removePhoto}>
                  <X size={18} aria-hidden="true" />
                  <span>{tr.t('recommend.photoRemove')}</span>
                </button>
              )}
            </div>
            <p id="rec-foto-hint" class="rec-field__hint">
              {tr.t('recommend.photoHint')}
            </p>
            {errors.foto && (
              <p id="rec-foto-error" class="rec-field__error">
                {errorText('foto')}
              </p>
            )}
          </div>

          {/* Campo trampa anti-bots: invisible para las personas */}
          <div class="rec-trap" aria-hidden="true">
            <label>
              {tr.t('recommend.honeypot')}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onInput={(e) => setWebsite(e.currentTarget.value)} />
            </label>
          </div>

          <div class="rec-consents">
            <label class={`rec-check${errors.autorizaPublicacion ? ' rec-check--error' : ''}`}>
              <input
                type="checkbox"
                data-field="autorizaPublicacion"
                checked={autorizaPublicacion}
                aria-invalid={errors.autorizaPublicacion ? 'true' : undefined}
                onChange={(e) => {
                  setAutorizaPublicacion(e.currentTarget.checked);
                  clearError('autorizaPublicacion');
                }}
              />
              <span>{tr.t('recommend.consentPublish')} *</span>
            </label>
            {errors.autorizaPublicacion && <p class="rec-field__error">{errorText('autorizaPublicacion')}</p>}

            <label class={`rec-check${errors.aceptaDatos ? ' rec-check--error' : ''}`}>
              <input
                type="checkbox"
                data-field="aceptaDatos"
                checked={aceptaDatos}
                aria-invalid={errors.aceptaDatos ? 'true' : undefined}
                onChange={(e) => {
                  setAceptaDatos(e.currentTarget.checked);
                  clearError('aceptaDatos');
                }}
              />
              <span>{tr.t('recommend.consentData')} *</span>
            </label>
            {errors.aceptaDatos && <p class="rec-field__error">{errorText('aceptaDatos')}</p>}
          </div>

          <button type="submit" class="btn-chunk btn-chunk--orange rec-form__submit" disabled={sending} aria-busy={sending ? 'true' : undefined}>
            <Send size={18} aria-hidden="true" />
            {sending ? tr.t('recommend.sending') : tr.t('recommend.submit')}
          </button>
        </form>
      </div>
    </app-recommendation-form>
  );
}
