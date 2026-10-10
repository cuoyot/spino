import { ui } from './locale.js';

const ASSET = './warmups/hanon-soft-snapshots.png';

const snapshots = () => [
  {
    title: ui('1. Place', '1. Coloca'),
    body: ui('Relax both wrists. Start one octave apart with the same open hand shape.', 'Relaja ambas muñecas. Empieza con una octava de separación y la misma forma abierta en las dos manos.'),
  },
  {
    title: ui('2. Play the figure', '2. Toca la figura'),
    body: ui('Keep the fingers curved and let each playing finger settle into its key.', 'Mantén los dedos curvados y deja que cada dedo que toca se apoye en su tecla.'),
  },
  {
    title: ui('3. Gather', '3. Recoge'),
    body: ui('After the eighth note, bring the fingers closer and advance the hand slightly toward the back of the keys.', 'Después de la octava nota, acerca los dedos y avanza un poco la mano hacia el fondo de las teclas.'),
  },
  {
    title: ui('4. Shift and reopen', '4. Desplaza y abre'),
    body: ui('Shift one white key and reopen higher on the keys, so thumb and little finger approach more perpendicularly.', 'Desplaza una tecla y vuelve a abrir más arriba, para que pulgar y meñique lleguen más perpendiculares.'),
  },
];

const picture = (index, label) => `<div class="ws-picture snapshot-${index}"><img src="${ASSET}" alt="${label}" draggable="false"></div>`;

export function warmupSnapshotsMarkup({ compact = false } = {}) {
  const items = snapshots();
  if (compact) return `<div class="ws-snapshots is-compact" data-warmup-snapshots>${picture(0, ui('Soft hand placement for the Hanon warm-up', 'Colocación suave de las manos para el calentamiento de Hanon'))}</div>`;
  return `<section class="ws-snapshots" data-warmup-snapshots aria-label="${ui('Hanon movement in four snapshots', 'Movimiento de Hanon en cuatro imágenes')}">
    <div class="ws-grid">${items.map((item, index) => `<article class="ws-frame">${picture(index, `${item.title}. ${item.body}`)}<div><b>${item.title}</b><p>${item.body}</p></div></article>`).join('')}</div>
  </section>`;
}
