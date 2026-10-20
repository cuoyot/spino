import { ui } from './locale.js';
import { HAND_BASE, warmupLabel, warmupFocus } from './warmups.js';
import { bindHanonAnimation, hanonNoteName, warmupAnimationMarkup } from './hanon-animation.js';

const noteName = hanonNoteName;
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
    ${warmupAnimationMarkup(exercise, { hand })}
    <div class="wg-figures">${clefs.slice().reverse().map(clef => figureRow(exercise, clef)).join('')}</div>
    <ol class="wg-steps">
      <li><b>${ui('Place your hands', 'Coloca las manos')}</b><span>${place}</span></li>
      <li><b>${ui('Play the 8-note figure', 'Toca la figura de 8 notas')}</b><span>${both ? ui('Both hands together, one octave apart', 'Las dos manos a la vez, a una octava') : ui('Follow the written fingering', 'Sigue la digitación indicada')}: ${names}.</span></li>
      <li><b>${ui('Gather, shift and reopen', 'Recoge, desplaza y vuelve a abrir')}</b><span>${ui('Let released fingers gather and prepare the next position while the playing finger stays on its key. Gradually reopen the spaces between fingers 1–2 and 5–4. Let the wrist follow, moving slightly toward the back of the keys when the thumb needs room.', 'Deja que los dedos libres se recojan y preparen la siguiente posición mientras el dedo que toca permanece en su tecla. Vuelve a abrir poco a poco los espacios entre los dedos 1–2 y 5–4. Deja que la muñeca acompañe y avance un poco hacia el fondo del teclado cuando el pulgar necesite espacio.')}</span></li>
      <li><b>${ui('Return', 'Vuelve')}</b><span>${ui('After an octave, follow the descending pattern back to C.', 'Después de una octava, sigue el patrón descendente para volver al Do.')}</span></li>
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

export function bindWarmupGuide(root, exercise, { hand = 'both' } = {}) {
  let lastEvent = -1;
  return bindHanonAnimation(root.querySelector('[data-hanon-animation]'), exercise, { hand, onEvent({ event, eventIndex, pressed }) {
    const k = eventIndex % 8, end = event[4] === 2;
    if (eventIndex !== lastEvent) {
      const figure = event[4] === 1 ? exercise.down : exercise.up;
      for (const row of root.querySelectorAll('.wg-figure')) {
        const clef = row.dataset.hand, e = clef === 'bass' ? 0 : 2, base = event[e] - (end ? 0 : figure.steps[k]);
        row.querySelectorAll('li').forEach((li, i) => {
          li.hidden = end && i > 0;
          li.querySelector('b').textContent = end ? event[e + 1] : fingersOf(figure, clef)[i];
          li.querySelector('small').textContent = noteName(base + (end ? 0 : figure.steps[i]));
        });
      }
      lastEvent = eventIndex;
    }
    root.querySelectorAll('.wg-figure li').forEach(li => li.classList.toggle('is-playing', pressed && Number(li.dataset.k) === (end ? 0 : k)));
  } });
}
