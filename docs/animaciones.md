# Animaciones y lenguaje visual de la landing

Rediseño de octubre de 2026. Todas las secciones de la página de inicio siguen el mismo
lenguaje que la bienvenida de Mepo, que Melanie aprobó. La idea viene de la reunión 01:
una página tranquila, con colores vivos, que no abrume, y que muestre más información
solo cuando la persona la pide ("entras a ese botoncito y aprendes más").

**No se instaló ninguna librería.** Todo está hecho con CSS (transiciones, `@keyframes`)
y un poco de estado en Preact. Así la página sigue liviana en celular.

## Piezas comunes (`src/styles/global.scss`)

| Clase / keyframe | Qué hace |
| --- | --- |
| `.eyebrow` (`--orange`, `--blue`, `--yellow`) | Antetítulo en mayúsculas con un filete a la izquierda. |
| `.btn-chunk` (`--orange`, `--yellow`, `--ink`) | Botón-píldora con borde de tinta y relieve (`box-shadow` inferior). Sube al pasar el cursor y se hunde al pulsar. |
| `.btn-chunk__plus` | Icono "+" del botón. Gira 45° (se vuelve "x") cuando el botón tiene `aria-expanded="true"`. |
| `@keyframes chunk-cascade` | Entrada con fundido, subida y leve escala. Se usa para todo lo que se despliega (planes, perfiles, respuestas, detalle de pasos). |
| `@keyframes chunk-pop` | Entrada con rebote para los globos de diálogo (preguntas). |
| `.reveal` / `.reveal--visible` | Aparición de cada sección al bajar. Ya existía: la activa el `IntersectionObserver` de `LandingPage.tsx`. |

Paleta del rediseño: tinta `#10201b`, verde `#0b7a57`, naranja `#c2410c` / `#f26b21`,
azul `#0369a1`, amarillo `#f5b50a`, verde bosque `#0f3a2c` y fondo cálido `#f6f2ec`.
Las sombras duras desplazadas (por ejemplo `12px 12px 0` en amarillo) marcan el elemento
principal de cada bloque.

## Por sección

| Sección | Archivo(s) | Animación / interacción |
| --- | --- | --- |
| Navbar | `Navbar.tsx`, `EmergencyButton.tsx`, `app-top-navbar.scss` | Emergencia, idioma y agendar son iconos con tooltip al pasar el cursor. El punto de emergencia late (`emg-pulse`). |
| Bienvenida de Mepo | `MepoWelcome.tsx`, `app-mepo-welcome.scss` | Los letreros se despliegan al pasar el cursor y el icono saluda (`welcome-wave`). El globo de Mepo cambia de mensaje con rebote (`welcome-pop`, se re-monta con `key`). La hoja de eucalipto se mece (`welcome-sway`). |
| Cuidar de tu empresa | `Hero.tsx`, `app-hero.scss` | Las tarjetas Empresas / Personas cambian de fondo y de sombra con transición. La constancia está inclinada (-2°) y se endereza al pasar el cursor. El sello SBS cae una vez (`hero-stamp`). |
| Soluciones | `SolutionsCarousel.tsx`, `app-solutions-carousel.scss`, `app-solution-card.scss` | Avance automático cada `AUTOPLAY_MS` (4 s). Se pausa con el cursor encima, con el foco dentro, fuera de pantalla o con la pestaña oculta. La barra activa se llena en ese tiempo (`solutions-progress`) y se reinicia en cada cambio. Las tarjetas se elevan al pasar el cursor y el (+) gira 90°. |
| Área de Riesgos Virtual | `RiskManagementBlock.tsx`, `app-risk-management-block.scss` | "Quiero saber más" despliega los dos planes uno tras otro (`chunk-cascade` con 0.14 s de retraso). Cerrado, muestra un adelanto clicable. |
| Tu bróker | mismo archivo | El nodo MEL late con un halo amarillo (`broker-pulse`). Sigue siendo arrastrable y vuelve a su lugar con un tween en JS. |
| Cómo funciona | `HowItWorks.tsx`, `app-how-it-works.scss` | El camino punteado "se dibuja" al cargar (`how-road`). Cada parada se agranda al elegirla y el panel de detalle entra con `chunk-cascade`. En celular el camino es vertical y el texto se abre bajo la parada. |
| Aseguradoras | `InsurerLogoStrip.tsx`, `app-insurer-logo-strip.scss` | Dos filas que giran en sentidos opuestos (`insurer-marquee`) y se detienen con el cursor encima. |
| ¿Por qué Melanie? | `WhyMelanie.tsx`, `app-why-melanie.scss` | Las primeras líneas entran escalonadas al aparecer la sección. "Conoce mis dos perfiles" despliega título, texto y las dos tarjetas en cascada. Cada razón se abre con su (+), que gira a (x). |
| Preguntas | `FaqChat.tsx`, `app-faq-chat.scss` | Al elegir una pregunta aparece como mensaje del visitante y, 0.35 s después, la respuesta de Melanie (`chunk-pop`). |
| Recomendaciones (home) | `Testimonials.tsx`, `app-testimonials.scss` | Carrusel con avance automático cada 6 s (pausa con cursor, foco, fuera de pantalla, pestaña oculta y `prefers-reduced-motion`). Las tarjetas suben y toman la sombra amarilla al pasar el cursor; el punto activo se alarga en amarillo. |
| Deja tu recomendación (`/recomendar`) | `RecommendationForm.tsx`, `app-recommendation-form.scss` | La tarjeta entra con `chunk-pop`. Las estrellas se iluminan al pasar el cursor y suben levemente; los botones de imagen tienen el relieve de `.btn-chunk`. La confirmación muestra a Mepo con el globo de agradecimiento. |
| Moderación `/admin/recomendaciones` | `recomendaciones.astro`, `src/styles/admin.scss` | Botones `.mod-btn` con el relieve de `.btn-chunk` (suben al pasar el cursor y se hunden al pulsar; sin movimiento con `prefers-reduced-motion`). La tarjeta que llega desde el correo lleva la sombra amarilla desplazada. |
| Panel `/admin` | `AdminLayout.astro`, `src/styles/admin.scss` | La tarjeta de ingreso entra con `chunk-pop` y los contadores del inicio con `chunk-cascade` escalonado. Solo respeta `prefers-reduced-motion: no-preference`. |

## Accesibilidad

- Todas las animaciones tienen su bloque `@media (prefers-reduced-motion: reduce)`, que las
  quita o las deja en su estado final. El avance automático de Soluciones tampoco arranca
  en ese caso.
- Lo que se despliega usa `<button>` reales con `aria-expanded` y `aria-controls`. Los
  selectores (público, pasos, preguntas) usan `role="tab"` y `aria-selected`.
- Los globos que cambian (Mepo, chat de preguntas) tienen `aria-live="polite"`.
