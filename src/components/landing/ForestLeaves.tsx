// Hojas de eucalipto que caen despacio y una rama que se mece, como en la bienvenida
// de Mepo. Decorativo: va detrás del contenido y sin interacción.
const LEAF = 'M0 0C16-12 50-14 84 0 50 12 16 10 0 0Z';
const BRANCH: readonly (readonly [number, number, number, number])[] = [
  [60, 46, 35, 1],
  [58, 44, -30, 0.9],
  [132, 74, 50, 1.1],
  [130, 72, -25, 1],
  [214, 92, 40, 1.1],
  [212, 90, -35, 1],
  [300, 100, 30, 0.9],
  [298, 98, -30, 0.9],
];

export function ForestLeaves() {
  return (
    <div class="forest-leaves" aria-hidden="true">
      <svg class="forest-leaves__branch" viewBox="0 0 420 200">
        <path d="M0 18C120 40 250 104 400 96" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
        {BRANCH.map(([x, y, angle, scale]) => (
          <path key={`${x}-${angle}`} d={LEAF} fill="currentColor" transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`} />
        ))}
      </svg>
      {[1, 2, 3, 4].map((n) => (
        <svg key={n} class={`forest-leaves__fall forest-leaves__fall--${n}`} viewBox="-2 -16 90 32">
          <path d={LEAF} fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}
