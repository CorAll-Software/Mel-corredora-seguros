import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentType } from 'preact';
import type { ResultadoAseguradora } from '../../core/comparador/calculo';
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Building2,
  Car,
  CarTaxiFront,
  Check,
  Loader,
  HardHat,
  HeartHandshake,
  HeartPulse,
  Plus,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
  Truck,
  X,
} from 'lucide-preact';
import { useTranslation } from '../../core/i18n/i18n';
import { RAMOS, RAMO_IDS, type RamoId } from '../../core/comparador/ramos';
import {
  CONSULTA_LIMITES,
  PASOS,
  anioMaximo,
  borradorVacio,
  pideActividad,
  resumenConsulta,
  validarConsulta,
  validarPaso,
  type Borrador,
  type Campo,
  type Consulta,
  type ConsultaErrores,
  type PasoId,
} from '../../core/comparador/consulta';
import { WhatsAppService } from '../../core/services/whatsapp.service';
import { Stepper } from '../ui/Stepper';
import { Mepo } from '../landing/Mepo';

// Comparador "¿Qué quieres cotizar?" (issue #45, reunión 01): Mepo saluda, la
// persona elige un ícono por ramo y un asistente corto pide solo los datos que
// usa la tarifa. El contacto va al final y abre los precios lado a lado por
// aseguradora (issue #46), calculados en POST /api/comparar.

type Icono = ComponentType<{ size?: number; strokeWidth?: number }>;

const RAMO_ICONOS: Record<RamoId, Icono> = {
  soat: ShieldCheck,
  vehicular: Car,
  salud: HeartPulse,
  'sctr-vida-ley': HardHat,
};

const OPCION_ICONOS: Record<string, Icono> = {
  particular: Car,
  taxi: CarTaxiFront,
  carga: Truck,
  moto: Bike,
  comercial: Truck,
  salud: Stethoscope,
  eps: Building2,
  sctr: HardHat,
  'vida-ley': HeartHandshake,
};

type Resultado = ResultadoAseguradora & { nombre: string; logo: string | null };
type Orden = 'precio' | 'precio-desc' | 'nombre';
type Estado = 'cargando' | 'error' | 'listo';

const soloDigitos = (valor: string, max?: number) => {
  const limpio = valor.replace(/\D/g, '');
  return max ? limpio.slice(0, max) : limpio;
};

// Montos: dígitos con hasta dos decimales (acepta coma como separador decimal).
const soloMonto = (valor: string) => {
  const limpio = valor.replace(',', '.').replace(/[^\d.]/g, '');
  const [entero, ...resto] = limpio.split('.');
  return resto.length ? `${entero}.${resto.join('').slice(0, 2)}` : entero;
};

export default function ComparadorWizard() {
  const tr = useTranslation();
  const [ramo, setRamo] = useState<RamoId | null>(null);
  const [paso, setPaso] = useState(0);
  const [b, setB] = useState<Borrador>(borradorVacio);
  const [errores, setErrores] = useState<ConsultaErrores>({});
  const [consulta, setConsulta] = useState<Consulta | null>(null);
  const [estado, setEstado] = useState<Estado>('cargando');
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [orden, setOrden] = useState<Orden>('precio');
  const [ocultas, setOcultas] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const pasos: PasoId[] = ramo ? PASOS[ramo] : [];
  const pasoId = pasos[paso];

  // Mepo saluda al entrar a la página.
  useEffect(() => {
    window.dispatchEvent(new Event('mepo-wave'));
  }, []);

  // Al cambiar de pantalla: subir al inicio del asistente y enfocar la pregunta.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    headingRef.current?.focus({ preventScroll: true });
  }, [ramo, paso, consulta]);

  const t = (key: string) => tr.t(`comparador.${key}`);
  const errorDe = (campo: Campo) => {
    const code = errores[campo];
    if (!code) return undefined;
    const texto = t(`errors.${code}`);
    return code === 'year_range' ? texto.replace('{min}', String(CONSULTA_LIMITES.anioMin)).replace('{max}', String(anioMaximo())) : texto;
  };

  const set = <K extends keyof Borrador>(campo: K, valor: Borrador[K]) => {
    setB((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: undefined }));
  };

  const elegirRamo = (id: RamoId) => {
    // Cambiar de ramo descarta las respuestas del anterior, pero no el contacto.
    if (id !== ramo) {
      setB((actual) => ({ ...borradorVacio(), nombre: actual.nombre, celular: actual.celular, correo: actual.correo, acepta: actual.acepta }));
    }
    setRamo(id);
    setPaso(0);
    setErrores({});
    setConsulta(null);
  };

  const enfocarPrimerError = (found: ConsultaErrores) => {
    const primero = Object.keys(found)[0];
    if (primero) {
      requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>(`[data-field="${primero}"]`)?.focus());
    }
  };

  const continuar = (event: Event) => {
    event.preventDefault();
    if (!ramo || !pasoId) return;
    const found = validarPaso(ramo, pasoId, b);
    if (Object.keys(found).length > 0) {
      setErrores(found);
      enfocarPrimerError(found);
      return;
    }
    setErrores({});
    if (paso < pasos.length - 1) {
      setPaso(paso + 1);
      return;
    }
    const resultado = validarConsulta(ramo, b);
    if (resultado.ok) {
      setConsulta(resultado.consulta);
      void calcular(ramo, b);
    } else {
      setErrores(resultado.errores);
      enfocarPrimerError(resultado.errores);
    }
  };

  const calcular = async (id: RamoId, borrador: Borrador) => {
    setEstado('cargando');
    setResultados([]);
    setOrden('precio');
    setOcultas([]);
    try {
      const res = await fetch('/api/comparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ramo: id, borrador }),
      });
      const data = (await res.json()) as { ok: boolean; resultados?: Resultado[] };
      if (!res.ok || !data.ok || !data.resultados) throw new Error(String(res.status));
      setResultados(data.resultados);
      setEstado('listo');
    } catch {
      setEstado('error');
    }
  };

  const atras = () => {
    setErrores({});
    if (paso === 0) {
      setRamo(null);
    } else {
      setPaso(paso - 1);
    }
  };

  const reiniciar = () => {
    setConsulta(null);
    setRamo(null);
    setPaso(0);
  };

  // ── Pantalla 1: "¿Qué quieres cotizar?" ─────────────────────────────────────
  if (!ramo) {
    return (
      <div class="cmp" ref={rootRef}>
        <div class="cmp-hello">
          <Mepo size={120} class="cmp-hello__mepo" />
          <p class="cmp-bubble cmp-bubble--big">{t('mepoHello')}</p>
        </div>
        <h1 class="cmp-title" ref={headingRef} tabIndex={-1}>
          {t('title')}
        </h1>
        <p class="cmp-lead">{t('lead')}</p>
        <ul class="cmp-ramos" aria-label={t('ramosAria')}>
          {RAMO_IDS.map((id) => {
            const Icon = RAMO_ICONOS[id];
            return (
              <li key={id}>
                <button type="button" class={`cmp-ramo cmp-ramo--${id}`} onClick={() => elegirRamo(id)}>
                  <span class="cmp-ramo__icon" aria-hidden="true">
                    <Icon size={40} strokeWidth={2.2} />
                  </span>
                  <span class="cmp-ramo__title">{t(`ramos.${id}.title`)}</span>
                  <span class="cmp-ramo__hint">{t(`ramos.${id}.hint`)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // ── Resultados lado a lado por aseguradora ──────────────────────────────────
  if (consulta) {
    const filas = resumenConsulta(consulta);
    const titulo = RAMOS[ramo].label;
    const precio = (r: Pick<Resultado, 'prima' | 'moneda'>) =>
      `${r.moneda === 'USD' ? 'US$' : 'S/'} ${r.prima.toLocaleString(tr.current.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const whatsappGeneral = WhatsAppService.buildFichaQuoteUrl(`${titulo} (comparador)`, filas);
    const whatsappDe = (r: Resultado) =>
      WhatsAppService.buildFichaQuoteUrl(`${titulo} con ${r.nombre}`, [
        { label: 'Aseguradora', value: `${r.nombre} · ${r.plan}` },
        { label: 'Prima referencial', value: `${precio(r)} (${r.periodo})` },
        ...filas,
      ]);
    // Los resultados llegan ordenados por precio (menor a mayor) desde el servidor.
    const visibles = resultados.filter((r) => !ocultas.includes(r.aseguradora));
    if (orden === 'nombre') visibles.sort((x, y) => x.nombre.localeCompare(y.nombre));
    if (orden === 'precio-desc') visibles.reverse();
    const conEjemplo = resultados.some((r) => r.esEjemplo);
    const alternar = (id: string) => setOcultas((actual) => (actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]));

    return (
      <div class={`cmp cmp--${ramo}`} ref={rootRef}>
        <div class="cmp-hello">
          <Mepo size={80} class="cmp-hello__mepo" />
          <p class="cmp-bubble">{t('results.mepo').replace('{name}', consulta.contacto.nombre.split(' ')[0])}</p>
        </div>
        <h2 class="cmp-title" ref={headingRef} tabIndex={-1}>
          {t('results.title').replace('{ramo}', t(`ramos.${ramo}.title`))}
        </h2>

        {/* Aviso fijo junto a los precios (lineamiento SBS) */}
        <p class="cmp-notice cmp-notice--sticky" role="note">
          {t('notice')}
        </p>

        {estado === 'cargando' && (
          <p class="cmp-loading" role="status">
            <Loader size={20} class="cmp-loading__icon" />
            {t('results.loading')}
          </p>
        )}

        {estado === 'error' && (
          <div class="cmp-card cmp-empty" role="alert">
            <p>{t('results.error')}</p>
            <div class="cmp-actions">
              <button type="button" class="btn-chunk" onClick={() => void calcular(ramo, b)}>
                <RotateCcw size={18} />
                {t('results.retry')}
              </button>
              <a class="btn-chunk btn-chunk--orange" href={whatsappGeneral} target="_blank" rel="noopener noreferrer">
                {t('whatsapp')}
              </a>
            </div>
          </div>
        )}

        {estado === 'listo' && resultados.length === 0 && (
          <div class="cmp-card cmp-empty">
            <p>{t('results.empty')}</p>
            <div class="cmp-actions">
              <a class="btn-chunk btn-chunk--orange" href={whatsappGeneral} target="_blank" rel="noopener noreferrer">
                {t('whatsapp')}
                <ArrowRight size={18} />
              </a>
            </div>
          </div>
        )}

        {estado === 'listo' && resultados.length > 0 && (
          <>
            <div class="cmp-tools">
              <label class="cmp-tools__order">
                <span>{t('results.order')}</span>
                <select class="cmp-input" value={orden} onChange={(e) => setOrden(e.currentTarget.value as Orden)}>
                  <option value="precio">{t('results.orderPrice')}</option>
                  <option value="precio-desc">{t('results.orderPriceDesc')}</option>
                  <option value="nombre">{t('results.orderName')}</option>
                </select>
              </label>
              {resultados.length > 1 && (
                <fieldset class="cmp-tools__filter">
                  <legend>{t('results.filter')}</legend>
                  {resultados.map((r) => (
                    <label key={r.aseguradora} class={`cmp-chip${ocultas.includes(r.aseguradora) ? '' : ' cmp-chip--on'}`}>
                      <input type="checkbox" checked={!ocultas.includes(r.aseguradora)} onChange={() => alternar(r.aseguradora)} />
                      {r.nombre}
                    </label>
                  ))}
                </fieldset>
              )}
            </div>

            <p class="cmp-count" aria-live="polite">
              {t('results.count').replace('{n}', String(visibles.length))}
            </p>

            <ul class="cmp-results">
              {visibles.map((r) => (
                <li key={r.aseguradora} class="cmp-result">
                  <div class="cmp-result__logo">
                    {r.logo ? <img src={r.logo} alt="" loading="lazy" decoding="async" /> : <b>{r.nombre}</b>}
                  </div>
                  <p class="cmp-result__name">
                    {r.nombre}
                    <span>{r.plan}</span>
                  </p>
                  <p class="cmp-result__price">
                    <b>{precio(r)}</b>
                    <span>{t(`results.period.${r.periodo}`)}</span>
                  </p>
                  {r.coberturas.length > 0 && (
                    <ul class="cmp-result__covers" aria-label={t('results.covers')}>
                      {r.coberturas.map((c) => (
                        <li key={c}>
                          <Check size={15} strokeWidth={3} />
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                  <a class="btn-chunk btn-chunk--orange cmp-result__cta" href={whatsappDe(r)} target="_blank" rel="noopener noreferrer">
                    {t('results.want')}
                  </a>
                </li>
              ))}
            </ul>
            {conEjemplo && <p class="cmp-sample">{t('results.sample')}</p>}
          </>
        )}

        <div class="cmp-actions">
          <button type="button" class="btn-chunk" onClick={() => setConsulta(null)}>
            <ArrowLeft size={18} />
            {t('results.edit')}
          </button>
          <button type="button" class="btn-chunk" onClick={reiniciar}>
            <RotateCcw size={18} />
            {t('another')}
          </button>
        </div>
      </div>
    );
  }

  // ── Asistente por pasos ─────────────────────────────────────────────────────
  const RamoIcon = RAMO_ICONOS[ramo];
  const ultimo = paso === pasos.length - 1;
  const progreso = Math.round(((paso + 1) / pasos.length) * 100);

  const opciones = (campo: 'uso' | 'producto' | 'actividad', lista: { id: string }[] | undefined, conHint = false) => (
    <fieldset class="cmp-field">
      <legend class="cmp-field__label">{t(`fields.${campo}`)}</legend>
      <div class={`cmp-options${lista && lista.length > 3 ? ' cmp-options--four' : ''}`}>
        {lista?.map((o, i) => {
          const Icon = OPCION_ICONOS[o.id];
          const activo = b[campo] === o.id;
          return (
            <label key={o.id} class={`cmp-option${activo ? ' cmp-option--active' : ''}`}>
              <input
                type="radio"
                name={campo}
                value={o.id}
                checked={activo}
                onChange={() => set(campo, o.id)}
                data-field={i === 0 ? campo : undefined}
                aria-describedby={errores[campo] ? `err-${campo}` : undefined}
              />
              {Icon ? (
                <span class="cmp-option__icon" aria-hidden="true">
                  <Icon size={30} />
                </span>
              ) : (
                <span class={`cmp-option__level cmp-option__level--${o.id}`} aria-hidden="true" />
              )}
              <span class="cmp-option__label">{t(`options.${campo}.${o.id}`)}</span>
              {conHint && <span class="cmp-option__hint">{t(`options.${campo}Hint.${o.id}`)}</span>}
            </label>
          );
        })}
      </div>
      {errorDe(campo) && (
        <p class="cmp-field__error" id={`err-${campo}`}>
          {errorDe(campo)}
        </p>
      )}
    </fieldset>
  );

  const input = (
    campo: 'marca' | 'anio' | 'valor' | 'trabajadores' | 'planilla' | 'nombre' | 'celular' | 'correo',
    props: { type?: 'text' | 'tel' | 'email'; inputMode?: 'numeric' | 'decimal' | 'email' | 'tel' | 'text'; maxLength?: number; autoComplete?: string; filtro?: (v: string) => string },
  ) => (
    <div class="cmp-field">
      <label class="cmp-field__label" for={`cmp-${campo}`}>
        {t(`fields.${campo}`)}
      </label>
      <input
        id={`cmp-${campo}`}
        class={`cmp-input${errores[campo] ? ' cmp-input--error' : ''}`}
        // El tipado de Preact separa cada type de input: se fija como uno solo.
        type={(props.type ?? 'text') as 'text'}
        inputMode={props.inputMode}
        maxLength={props.maxLength}
        autoComplete={props.autoComplete}
        placeholder={tr.tOptional(`comparador.fields.${campo}Placeholder`)}
        value={b[campo]}
        data-field={campo}
        aria-invalid={errores[campo] ? true : undefined}
        aria-describedby={errores[campo] ? `err-${campo}` : undefined}
        onInput={(e) => {
          const el = e.currentTarget;
          const valor = props.filtro ? props.filtro(el.value) : el.value;
          el.value = valor;
          set(campo, valor);
        }}
      />
      {errorDe(campo) && (
        <p class="cmp-field__error" id={`err-${campo}`}>
          {errorDe(campo)}
        </p>
      )}
    </div>
  );

  const setEdad = (i: number, valor: string) => {
    setB((actual) => ({ ...actual, edades: actual.edades.map((e, j) => (j === i ? valor : e)) }));
    setErrores((actual) => ({ ...actual, [`edades.${i}`]: undefined, edades: undefined }));
  };
  const agregarPersona = () => {
    setB((actual) => ({ ...actual, edades: [...actual.edades, ''] }));
    requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>(`[data-field="edades.${b.edades.length}"]`)?.focus());
  };
  const quitarPersona = (i: number) => {
    setB((actual) => ({ ...actual, edades: actual.edades.filter((_, j) => j !== i) }));
    setErrores({});
  };

  return (
    <div class={`cmp cmp--${ramo}`} ref={rootRef}>
      <div class="cmp-card">
        <div class="cmp-head">
          <span class="cmp-head__ramo">
            <span class="cmp-head__icon" aria-hidden="true">
              <RamoIcon size={22} />
            </span>
            {t(`ramos.${ramo}.title`)}
          </span>
          <span class="cmp-head__count">
            {t('progress').replace('{n}', String(paso + 1)).replace('{total}', String(pasos.length))}
          </span>
        </div>
        <div
          class="cmp-progress"
          role="progressbar"
          aria-label={t('progressAria')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progreso}
        >
          <span style={{ width: `${progreso}%` }} />
        </div>
        <Stepper steps={pasos.map((id) => ({ label: t(`steps.${id}`) }))} current={paso} ariaLabel={t('progressAria')} />

        <div class="cmp-hello cmp-hello--small">
          <Mepo size={56} class="cmp-hello__mepo" />
          <p class="cmp-bubble">{t(`tips.${pasoId}`)}</p>
        </div>

        <form class="cmp-form" onSubmit={continuar} noValidate key={`${ramo}-${paso}`}>
          <h2 class="cmp-question" ref={headingRef} tabIndex={-1}>
            {t(`questions.${pasoId}`)}
          </h2>

          {pasoId === 'uso' && opciones('uso', RAMOS[ramo].usos)}

          {pasoId === 'vehiculo' && (
            <div class="cmp-grid">
              {input('marca', { maxLength: CONSULTA_LIMITES.texto, autoComplete: 'off' })}
              {input('anio', { inputMode: 'numeric', maxLength: 4, filtro: (v) => soloDigitos(v, 4) })}
            </div>
          )}

          {pasoId === 'valor' && (
            <>
              <fieldset class="cmp-field">
                <legend class="cmp-field__label">{t('fields.moneda')}</legend>
                <div class="cmp-toggle">
                  {(['USD', 'PEN'] as const).map((m) => (
                    <label key={m} class={`cmp-toggle__item${b.moneda === m ? ' cmp-toggle__item--active' : ''}`}>
                      <input type="radio" name="moneda" value={m} checked={b.moneda === m} onChange={() => set('moneda', m)} />
                      {t(`fields.${m === 'USD' ? 'usd' : 'pen'}`)}
                    </label>
                  ))}
                </div>
              </fieldset>
              {input('valor', { inputMode: 'decimal', maxLength: 10, filtro: soloMonto })}
            </>
          )}

          {pasoId === 'producto' && opciones('producto', RAMOS[ramo].productos)}

          {pasoId === 'edades' && (
            <fieldset class="cmp-field">
              <legend class="cmp-field__label">{t('fields.edades')}</legend>
              <ul class="cmp-ages">
                {b.edades.map((edad, i) => {
                  const campo = `edades.${i}` as Campo;
                  const etiqueta = t('fields.edad').replace('{n}', String(i + 1));
                  return (
                    <li key={i} class="cmp-age">
                      <label class="cmp-age__label" for={`cmp-edad-${i}`}>
                        {etiqueta}
                      </label>
                      <div class="cmp-age__row">
                        <input
                          id={`cmp-edad-${i}`}
                          class={`cmp-input${errores[campo] ? ' cmp-input--error' : ''}`}
                          inputMode="numeric"
                          maxLength={2}
                          value={edad}
                          data-field={campo}
                          aria-invalid={errores[campo] ? true : undefined}
                          aria-describedby={errores[campo] ? `err-edad-${i}` : undefined}
                          onInput={(e) => {
                            const valor = soloDigitos(e.currentTarget.value, 2);
                            e.currentTarget.value = valor;
                            setEdad(i, valor);
                          }}
                        />
                        {b.edades.length > 1 && (
                          <button
                            type="button"
                            class="cmp-age__remove"
                            aria-label={t('fields.removePerson').replace('{n}', String(i + 1))}
                            onClick={() => quitarPersona(i)}
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                      {errorDe(campo) && (
                        <p class="cmp-field__error" id={`err-edad-${i}`}>
                          {errorDe(campo)}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              {b.edades.length < CONSULTA_LIMITES.personasMax && (
                <button type="button" class="cmp-add" onClick={agregarPersona}>
                  <Plus size={18} />
                  {t('fields.addPerson')}
                </button>
              )}
              {errorDe('edades') && <p class="cmp-field__error">{errorDe('edades')}</p>}
            </fieldset>
          )}

          {pasoId === 'empresa' && (
            <>
              {pideActividad(b.producto) && opciones('actividad', RAMOS[ramo].actividades, true)}
              <div class="cmp-grid">
                {input('trabajadores', { inputMode: 'numeric', maxLength: 4, filtro: (v) => soloDigitos(v, 4) })}
                {input('planilla', { inputMode: 'decimal', maxLength: 11, filtro: soloMonto })}
              </div>
            </>
          )}

          {pasoId === 'contacto' && (
            <>
              <p class="cmp-note">{t('contactNote')}</p>
              {input('nombre', { maxLength: CONSULTA_LIMITES.texto, autoComplete: 'name' })}
              <div class="cmp-grid">
                {input('celular', { type: 'tel', inputMode: 'numeric', maxLength: 9, autoComplete: 'tel-national', filtro: (v) => soloDigitos(v, 9) })}
                {input('correo', { type: 'email', inputMode: 'email', maxLength: CONSULTA_LIMITES.texto, autoComplete: 'email' })}
              </div>
              <label class={`cmp-check${errores.acepta ? ' cmp-check--error' : ''}`}>
                <input
                  type="checkbox"
                  checked={b.acepta}
                  data-field="acepta"
                  aria-describedby={errores.acepta ? 'err-acepta' : undefined}
                  onChange={(e) => set('acepta', e.currentTarget.checked)}
                />
                <span>{t('fields.acepta')}</span>
              </label>
              {errorDe('acepta') && (
                <p class="cmp-field__error" id="err-acepta">
                  {errorDe('acepta')}
                </p>
              )}
            </>
          )}

          {Object.keys(errores).some((k) => errores[k as Campo]) && (
            <p class="cmp-alert" role="alert">
              {t('errors.review')}
            </p>
          )}

          <div class="cmp-nav">
            <button type="button" class="btn-chunk" onClick={atras}>
              <ArrowLeft size={18} />
              {paso === 0 ? t('changeRamo') : t('back')}
            </button>
            <button type="submit" class="btn-chunk btn-chunk--orange">
              {ultimo ? t('seeResult') : t('next')}
              {ultimo ? <Check size={18} strokeWidth={3} /> : <ArrowRight size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
