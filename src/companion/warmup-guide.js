import { ui } from './locale.js';
import { HAND_BASE, warmupLabel, warmupFocus } from './warmups.js';
import { warmupSnapshotsMarkup } from './warmup-snapshots.js';

const noteName = diatonic => ui('CDEFGAB'[((diatonic % 7) + 7) % 7], ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'][((diatonic % 7) + 7) % 7]);
const handsFor = hand => hand === 'both' ? ['bass', 'treble'] : [hand === 'left' ? 'bass' : 'treble'];
const fingersOf = (figure, clef) => figure[clef === 'bass' ? 'left' : 'right'];

function figureRow(exercise, clef) {
  const fingers = fingersOf(exercise.up, clef), base = HAND_BASE[clef];
  return `<div class="wg-figure" data-hand="${clef}" style="--hand:${clef === 'bass' ? '#4f8cff' : '#ff8a3d'}"><span>${clef === 'bass' ? ui('Left hand', 'Mano izquierda') : ui('Right hand', 'Mano derecha')}</span><ol>${exercise.up.steps.map((step, index) => `<li data-k="${index}"><b>${fingers[index]}</b><small>${noteName(base + step)}</small></li>`).join('')}</ol></div>`;
}

export function warmupGuideMarkup(exercise, { hand = 'both', start = false, set = null } = {}) {
  const both = hand === 'both', clefs = handsFor(hand);
  const names = exercise.up.steps.map(step => noteName(HAND_BASE[clefs.at(-1)] + step)).join(' – ');
  const place = both
    ? ui('Right thumb on middle C and left little finger on the C one octave lower. Keep both wrists relaxed.', 'Pulgar derecho en el Do central y meñique izquierdo en el Do una octava más abajo. Mantén ambas muñecas relajadas.')
    : clefs[0] === 'bass'
      ? ui('Left little finger on the C below middle C. Keep the wrist relaxed.', 'Meñique izquierdo en el Do por debajo del Do central. Mantén la muñeca relajada.')
      : ui('Right thumb on middle C. Keep the wrist relaxed.', 'Pulgar derecho en el Do central. Mantén la muñeca relajada.');
  const steps = set?.exercises.length > 1 ? `<nav class="wg-set" aria-label="${ui('Exercises in this warm-up', 'Ejercicios de este calentamiento')}"><b>${ui(`Exercise ${set.index + 1} of ${set.exercises.length}`, `Ejercicio ${set.index + 1} de ${set.exercises.length}`)}</b><span>${set.exercises.map((item, index) => `<button type="button" data-warmup-step="${index}"${index === set.index ? ' aria-current="step"' : ''}>${ui('No.', 'n.º')} ${item.number}</button>`).join('')}</span></nav>` : '';
  return `<div class="cp-warmup-guide" data-exercise="${exercise.id}" data-hand="${hand}">${steps}
    <p class="wg-focus"><b>${warmupLabel(exercise)}</b> · ${warmupFocus(exercise)}</p>
    ${warmupSnapshotsMarkup()}
    <div class="wg-figures">${clefs.slice().reverse().map(clef => figureRow(exercise, clef)).join('')}</div>
    <ol class="wg-steps">
      <li><b>${ui('Place your hands', 'Coloca las manos')}</b><span>${place}</span></li>
      <li><b>${ui('Play the 8-note figure', 'Toca la figura de 8 notas')}</b><span>${both ? ui('Both hands together, one octave apart', 'Las dos manos a la vez, a una octava') : ui('One note per finger', 'Una nota con cada dedo')}: ${names}.</span></li>
      <li><b>${ui('Gather, shift and reopen', 'Recoge, desplaza y vuelve a abrir')}</b><span>${ui('After each figure, move both hands one white key together. For a wider reach, advance the hand toward the back of the keys so the thumb and little finger can meet their keys more perpendicularly; do not twist the wrist.', 'Después de cada figura, mueve las dos manos juntas una tecla blanca. Si necesitas abarcar más, avanza la mano hacia el fondo de las teclas para que pulgar y meñique lleguen más perpendiculares; no tuerzas la muñeca.')}</span></li>
      <li><b>${ui('Return', 'Vuelve')}</b><span>${ui('After an octave, use the mirrored figure to come back down to C.', 'Después de una octava, usa la figura invertida para volver hasta el Do.')}</span></li>
      ${set?.exercises.length > 1 ? `<li><b>${ui('Then the next exercise', 'Después, el siguiente ejercicio')}</b><span>${set.index + 1 < set.exercises.length ? ui(`Back on C, Hanon No. ${set.exercises[set.index + 1].number} follows without a break.`, `De vuelta en el Do, sigue el Hanon n.º ${set.exercises[set.index + 1].number} sin pausa.`) : ui('After the last exercise the set starts again from the first one.', 'Tras el último ejercicio, la serie vuelve a empezar por el primero.')}</span></li>` : ''}
    </ol>
    <ul class="wg-tips">
      <li>${ui('Keep the fingers curved and lift each one clearly.', 'Mantén los dedos curvados y levanta cada uno con claridad.')}</li>
      <li>${ui('Slow and even first: speed up only when every note sounds the same.', 'Primero lento y regular: acelera solo cuando todas las notas suenen igual.')}</li>
      <li>${ui('Use position, not lateral strain, to open the hand.', 'Usa la posición, no la tensión lateral, para abrir la mano.')}</li>
    </ul>
    <p class="wg-source">${ui('From C.-L. Hanon, The Virtuoso Pianist (1873).', 'De C.-L. Hanon, El pianista virtuoso (1873).')}</p>
    <div class="cp-actions">${start ? `<button type="button" data-action="close-dialog">${ui('Not now', 'Ahora no')}</button><button type="button" class="primary" data-warmup-start>${ui('Start warm-up', 'Empezar calentamiento')}</button>` : `<button type="button" class="primary" data-action="close-dialog">${ui('Close', 'Cerrar')}</button>`}</div>
  </div>`;
}

export function bindWarmupGuide() {
  return () => {};
}
