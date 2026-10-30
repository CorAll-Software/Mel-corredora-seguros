import { useState, useRef } from 'preact/hooks';
import { CircleCheck, Plus, ShieldAlert } from 'lucide-preact';
import { useTranslation } from '../../core/i18n/i18n';
import { WhatsAppService } from '../../core/services/whatsapp.service';
import type { AudienceCategory } from '../../core/models/insurance-service.model';

// TODO-PLANES: los detalles de los planes (items por tarjeta) quedan pendientes de
// confirmacion de Melanie (issue #19); los precios S/ 270 y S/ 370 ya estan aprobados.
// Reservado (no publicar): "Seguridad y camaras" con empresas aliadas se sumara aqui
// como tercer bloque cuando Melanie lo apruebe.

// "Area de Riesgos Virtual" (feedback §5, issue #15): bloque destacado de la parte
// Empresas, visible solo con la pestana Empresas activa. CTA expande las tarjetas
// de planes Esencial/Integral y cierra con consulta por WhatsApp prellenada.

// Anclas de los 5 aliados en el espacio del viewBox del mapa (100 x 40)
const ALLY_ANCHORS: Array<[number, number]> = [
  [12, 9],
  [50, 4],
  [88, 9],
  [30, 34],
  [70, 34],
];
export function RiskManagementBlock({ activeTab }: { activeTab: AudienceCategory }) {
  const tr = useTranslation();
  const [open, setOpen] = useState(false);
  // Demo del mapa (TODO-BROKER-IMG): el hub "MEL" es arrastrable y al soltar
  // vuelve a su posicion central con la transicion CSS (efecto de rebote)
  const hubRef = useRef<HTMLSpanElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<SVGLineElement[]>([]);
  const [hubDragging, setHubDragging] = useState(false);
  const hubDrag = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0 });
  const rafRef = useRef(0);

  // Mueve el hub y estira las lineas: el extremo "hub" de cada linea sigue al
  // arrastre (el ancla del aliado queda fija). px -> unidades del viewBox
  const drawHub = (dx: number, dy: number) => {
    if (hubRef.current) {
      hubRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const rect = map.getBoundingClientRect();
    const vx = (dx / rect.width) * 100;
    const vy = (dy / rect.height) * 40;
    for (const line of linesRef.current) {
      line?.setAttribute('x1', String(50 + vx));
      line?.setAttribute('y1', String(20 + vy));
    }
  };

  // Al soltar: hub y lineas vuelven a su lugar animados (tween en JS, easing suave)
  const releaseHub = () => {
    const from = { dx: hubDrag.current.dx, dy: hubDrag.current.dy };
    cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const DURATION = 450;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION);
      const ease = 1 - Math.pow(1 - p, 3);
      drawHub(from.dx * (1 - ease), from.dy * (1 - ease));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  if (activeTab !== 'empresas') {
    return null;
  }

  const planNames = tr.list('risk.planes');
  const planes = [
    { key: 'esencial', name: planNames[0] ?? '', price: tr.t('risk.esencialPrice'), note: '', features: tr.list('risk.esencialFeatures') },
    { key: 'integral', name: planNames[1] ?? '', price: tr.t('risk.integralPrice'), note: tr.t('risk.integralNote'), features: tr.list('risk.integralFeatures') },
  ];

  return (
    <app-risk-management-block>
      <section class="section screen risk" id="area-riesgos">
        <div class="container">
          {/* Rediseño: escena verde bosque (como la bienvenida de Mepo); "Quiero saber
              más" despliega los planes en cascada en la columna derecha */}
          <div class="risk__grid">
            <div class="risk__intro">
              <span class="risk__badge">
                <ShieldAlert size={15} />
                {tr.t('risk.badge')}
              </span>
              <h2 class="section-title">{tr.t('risk.title')}</h2>
              <p class="risk__hook">{tr.t('risk.hook')}</p>
              <p class="risk__text">{tr.t('risk.body')}</p>
              <div class="risk__actions">
                <button
                  type="button"
                  class="btn-chunk btn-chunk--yellow"
                  aria-expanded={open}
                  aria-controls="risk-planes"
                  onClick={() => setOpen(!open)}
                >
                  {open ? tr.t('risk.close') : tr.t('risk.cta')}
                  <Plus size={18} strokeWidth={2.8} class="btn-chunk__plus" />
                </button>
                <a
                  class="risk__whatsapp"
                  href={WhatsAppService.buildGenericUrl('quiero saber más sobre el *Área de Riesgos Virtual*.')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tr.t('risk.whatsapp')}
                </a>
              </div>
            </div>

            <div class="risk__plans-area" id="risk-planes">
              {open ? (
                <div class="risk__plans">
                  {planes.map((plan) => (
                    <article class={`risk__plan risk__plan--${plan.key}`} key={plan.key}>
                      <h3>{plan.name}</h3>
                      <p class="risk__price">
                        {plan.price}
                        <span> {tr.t('risk.perMonth')}</span>
                      </p>
                      {plan.note && <p class="risk__note">{plan.note}</p>}
                      <ul>
                        {plan.features.map((feature) => (
                          <li key={feature}>
                            <CircleCheck size={17} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              ) : (
                <button type="button" class="risk__teaser" onClick={() => setOpen(true)} aria-controls="risk-planes">
                  <b>{tr.t('risk.teaserTitle')}</b>
                  <span>
                    {planes.map((plan) => `${plan.name} ${plan.price}`).join(' · ')}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* "Todo parte de un mismo lugar: tu bróker" (feedback §6, issue #17):
              contenedor con DEMOSTRACIÓN provisional del mapa de conexiones.
              TODO-BROKER-IMG (issue #19): se reemplaza por la imagen oficial
              cuando Melanie la entregue */}
          <div class="risk__broker">
            <p class="risk__broker-title">{tr.t('broker.title')}</p>
            <p class="risk__broker-text">{tr.t('broker.text')}</p>
            <div class="risk__broker-map" role="img" aria-label={tr.t('broker.title')} ref={mapRef}>
              <svg
                class="risk__broker-lines"
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {ALLY_ANCHORS.map((anchor, index) => (
                  <line
                    key={index}
                    ref={(el) => {
                      if (el) {
                        linesRef.current[index] = el;
                      }
                    }}
                    x1="50"
                    y1="20"
                    x2={anchor[0]}
                    y2={anchor[1]}
                    vector-effect="non-scaling-stroke"
                  />
                ))}
              </svg>
              <span
                ref={hubRef}
                class={`risk__broker-node risk__broker-node--hub${hubDragging ? ' risk__broker-node--hub--dragging' : ''}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  cancelAnimationFrame(rafRef.current);
                  hubDrag.current = { active: true, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 };
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  setHubDragging(true);
                }}
                onPointerMove={(e) => {
                  const d = hubDrag.current;
                  if (!d.active) {
                    return;
                  }
                  d.dx = e.clientX - d.startX;
                  d.dy = e.clientY - d.startY;
                  drawHub(d.dx, d.dy);
                }}
                onPointerUp={() => {
                  hubDrag.current.active = false;
                  setHubDragging(false);
                  releaseHub();
                }}
                onPointerCancel={() => {
                  hubDrag.current.active = false;
                  setHubDragging(false);
                  releaseHub();
                }}
              >
                MEL
                <span>{tr.t('broker.hub')}</span>
              </span>
              {tr.list('broker.allies').map((ally, index) => (
                <span
                  key={ally}
                  class={`risk__broker-node risk__broker-node--ally risk__broker-node--${index + 1}`}
                >
                  {ally}
                </span>
              ))}
            </div>
            <span class="risk__broker-note">{tr.t('broker.note')}</span>
          </div>
        </div>
      </section>
    </app-risk-management-block>
  );
}
