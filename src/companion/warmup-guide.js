import { ui } from './locale.js';
import { makeNote } from '../music.js';
import { HAND_BASE, warmupLabel, warmupFocus } from './warmups.js';

// Visual explanation of a Hanon warm-up: a keyboard with both hands drawn on their starting keys, the 8-note
// figure for each hand, the steps to follow and an animated demonstration with sound.
const KEY_W = 22, KEY_H = 86, BLACK_W = 13, BLACK_H = 54, KEYS_TOP = 104, FIRST = 21, LAST = 36; // C3 … D5
const COLORS = { bass: '#4f8cff', treble: '#ff8a3d' };
const LETTERS = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
const noteName = d => ui('CDEFGAB'[((d % 7) + 7) % 7], ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'][((d % 7) + 7) % 7]);
const keyX = d => (d - FIRST) * KEY_W;
const keyCentre = d => keyX(d) + KEY_W / 2;
const handsFor = hand => hand === 'both' ? ['bass', 'treble'] : [hand === 'left' ? 'bass' : 'treble'];
const fingersOf = (figure, clef) => figure[clef === 'bass' ? 'left' : 'right'];

// The key each finger rests on at the start: its first note in the opening figure.
function restingKeys(exercise, clef) {
  const keys = {}, fingers = fingersOf(exercise.up, clef);
  exercise.up.steps.forEach((step, k) => { keys[fingers[k]] ??= HAND_BASE[clef] + step; });
  return keys;
}

// The keyboard as seen from the bench: black keys at the back, white key fronts nearest the player.
function keyboard() {
  let white = '', black = '', labels = '';
  for (let d = FIRST; d <= LAST; d++) {
    white += `<rect class="wg-key" data-d="${d}" x="${keyX(d)}" y="${KEYS_TOP}" width="${KEY_W}" height="${KEY_H}" rx="2"/>`;
    if (d % 7 === 0) labels += `<text class="wg-octave" x="${keyCentre(d)}" y="${KEYS_TOP - 9}">${noteName(d)}${Math.floor(d / 7)}</text>`;
    if (d < LAST && ![2, 6].includes(d % 7)) black += `<rect class="wg-black" x="${keyX(d + 1) - BLACK_W / 2}" y="${KEYS_TOP}" width="${BLACK_W}" height="${BLACK_H}" rx="2"/>`;
  }
  const felt = `<rect class="wg-felt" x="${keyX(FIRST) - 6}" y="${KEYS_TOP - 4}" width="${keyX(LAST + 1) - keyX(FIRST) + 12}" height="4"/>`;
  return `<g class="wg-keys">${felt}${white}${black}${labels}</g>`;
}

// Hands are drawn the way the player sees them: wrists nearest the player, fingers reaching up the keys.
// Proportions follow a hand seen from above, in keyboard units (one white key = 22 ≈ 2.3 cm): the palm keeps its
// anatomical width whatever keys the fingers reach, so a stretched finger splays from its knuckle instead of
// widening the hand.
const HAND = {
  tipY: KEYS_TOP + BLACK_H + 14,            // fingers 2–5 rest just below the black keys
  thumbTipY: KEYS_TOP + KEY_H - 6,          // the thumb plays near the front edge of its key
  reach: { 2: 50, 3: 46, 4: 51, 5: 58 },    // knuckle to tip as seen from above: the longer fingers curve more
  knuckle: { 2: -21, 3: 0, 4: 20, 5: 38 },  // knuckle offsets from the middle finger; the thumb side is negative
  width: { 1: 21, 2: 15.5, 3: 16, 4: 15, 5: 13 },
  palm: 74,                                 // middle knuckle to wrist crease
  wrist: 30,                                // half width at the wrist
};
const CUFF_Y = HAND.tipY + HAND.reach[3] + HAND.palm + 24;
const P = p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;

// One digit as a tapered shape through three centre points (root, joint, tip), with a nail and joint creases.
function digit([p0, p1, p2], w, f) {
  const unit = (a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l }; };
  const u01 = unit(p0, p1), u12 = unit(p1, p2), uj = unit({ x: 0, y: 0 }, { x: u01.x + u12.x, y: u01.y + u12.y });
  const side = (p, u, k) => ({ x: p.x - u.y * k, y: p.y + u.x * k }), along = (p, u, k) => ({ x: p.x + u.x * k, y: p.y + u.y * k });
  const w1 = w * .95, w2 = w * .86, cap = along(p2, u12, -w2 / 2), k = w2 * .56;
  const L0 = side(p0, u01, w / 2), R0 = side(p0, u01, -w / 2), L1 = side(p1, uj, w1 / 2), R1 = side(p1, uj, -w1 / 2), L2 = side(cap, u12, w2 / 2), R2 = side(cap, u12, -w2 / 2);
  const d = `M${P(L0)} Q${P(L1)} ${P(L2)} C${P(along(L2, u12, k))} ${P(along(R2, u12, k))} ${P(R2)} Q${P(R1)} ${P(R0)} Z`;
  const crease = (p, u, k) => `<path class="wg-crease" d="M${P(side(p, u, -k))} Q${P(along(p, u, 2.5))} ${P(side(p, u, k))}"/>`;
  const nail = along(p2, u12, -w2 * .5), angle = Math.atan2(u12.y, u12.x) * 180 / Math.PI + 90;
  const badge = along(p2, u12, -(w2 * .5 + 10));
  return { shape: `<g class="wg-digit" data-finger="${f}"><path class="wg-skin" d="${d}"/>${crease(p1, uj, w1 * .3)}${crease(along(p2, u12, -w2 * 1.35), u12, w2 * .28)}<ellipse class="wg-nail" rx="${(w2 * .3).toFixed(1)}" ry="${(w2 * .4).toFixed(1)}" transform="translate(${P(nail)}) rotate(${angle.toFixed(1)})"/></g>`,
    badge: `<g class="wg-tip" data-finger="${f}"><circle cx="${badge.x.toFixed(1)}" cy="${badge.y.toFixed(1)}" r="8.5"/><text x="${badge.x.toFixed(1)}" y="${(badge.y + 4).toFixed(1)}">${f}</text></g>` };
}

// A cartoon hand: thumb and fingers first, then the back of the hand over their roots, then the cuff.
function handShape(exercise, clef) {
  const keys = restingKeys(exercise, clef), color = COLORS[clef], right = clef === 'treble', s = right ? 1 : -1;
  const tipX = f => keyCentre(keys[f]), xk3 = tipX(3);
  const xk = f => xk3 + s * HAND.knuckle[f], yk = f => HAND.tipY + HAND.reach[f];
  const wristY = yk(3) + HAND.palm, cx = xk3 + s * 10;
  const bows = { 2: -2, 3: 0, 4: 2, 5: 4 };
  const digits = [digit([{ x: xk(2) - s * 4, y: wristY - 20 }, { x: xk(2) - s * 20, y: yk(2) + 24 }, { x: tipX(1), y: HAND.thumbTipY }], HAND.width[1], 1)];
  for (const f of [5, 4, 3, 2]) {
    const base = { x: xk(f), y: yk(f) + 8 }, tip = { x: tipX(f), y: HAND.tipY };
    digits.push(digit([base, { x: (base.x + tip.x) / 2 + s * bows[f], y: (base.y + tip.y) / 2 }, tip], HAND.width[f], f));
  }
  // Back of the hand: up the thumb side with its bulge, over the knuckles, down the little-finger side.
  let palm = `M${cx - s * HAND.wrist} ${wristY}`;
  palm += ` C${cx - s * 42} ${wristY - 18} ${xk(2) - s * 30} ${yk(2) + 54} ${xk(2) - s * 22} ${yk(2) + 38}`;
  palm += ` C${xk(2) - s * 17} ${yk(2) + 26} ${xk(2) - s * 13} ${yk(2) + 12} ${xk(2) - s * 10} ${yk(2) + 3}`;
  for (const f of [2, 3, 4]) palm += ` Q${xk(f)} ${yk(f) - 6} ${(xk(f) + xk(f + 1)) / 2} ${(yk(f) + yk(f + 1)) / 2 + 4}`;
  palm += ` Q${xk(5)} ${yk(5) - 6} ${xk(5) + s * 10} ${yk(5) + 4}`;
  palm += ` C${xk(5) + s * 13} ${yk(5) + 26} ${cx + s * 34} ${wristY - 30} ${cx + s * HAND.wrist} ${wristY} Z`;
  const cuffX = cx - HAND.wrist, cuffW = HAND.wrist * 2;
  const cuff = `<rect class="wg-cuff" x="${cuffX}" y="${wristY - 2}" width="${cuffW}" height="${CUFF_Y - wristY + 2}" rx="8"/><rect class="wg-cuff-stripe" x="${cuffX + 4}" y="${wristY + 5}" width="${cuffW - 8}" height="2.5" rx="1"/>`;
  const label = `<text class="wg-hand-label" x="${cx}" y="${wristY + 16}">${right ? ui('Right', 'Derecha') : ui('Left', 'Izquierda')}</text>`;
  return `<g class="wg-hand" data-hand="${clef}" style="--hand:${color}" filter="url(#wg-shadow)">${digits.map(d => d.shape).join('')}<path class="wg-skin wg-palm" d="${palm}"/>${cuff}${label}${digits.map(d => d.badge).join('')}</g>`;
}

const DEFS = `<defs><filter id="wg-shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".45"/></filter>
  <linearGradient id="wg-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8dcc2"/><stop offset="1" stop-color="#e9b893"/></linearGradient>
  <linearGradient id="wg-white" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9e9e4"/><stop offset=".6" stop-color="#fbfbf8"/><stop offset="1" stop-color="#f1f1ec"/></linearGradient>
  <linearGradient id="wg-blackkey" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a505a"/><stop offset=".15" stop-color="#262a31"/><stop offset="1" stop-color="#15171b"/></linearGradient></defs>`;

export function warmupDiagram(exercise, hand = 'both') {
  const used = handsFor(hand).flatMap(clef => Object.values(restingKeys(exercise, clef)).map(d => `<rect class="wg-used" data-hand="${clef}" data-used="${d}" x="${keyX(d) + 2}" y="${KEYS_TOP + BLACK_H + 2}" width="${KEY_W - 4}" height="${KEY_H - BLACK_H - 5}" rx="3" style="--hand:${COLORS[clef]}"/>`)).join('');
  const top = KEYS_TOP - 22, bottom = CUFF_Y + 8;
  return `<svg class="wg-diagram" viewBox="-6 ${top} ${keyX(LAST + 1) + 12} ${bottom - top}" role="img" aria-label="${ui('Hand position on the keyboard with finger numbers, as the player sees it', 'Posición de las manos en el teclado con los números de los dedos, tal como las ve el pianista')}">${DEFS}${keyboard()}<g class="wg-used-keys">${used}</g>${handsFor(hand).map(clef => handShape(exercise, clef)).join('')}</svg>`;
}

function figureRow(exercise, clef) {
  const base = HAND_BASE[clef], fingers = fingersOf(exercise.up, clef);
  return `<div class="wg-figure" data-hand="${clef}" style="--hand:${COLORS[clef]}"><span>${clef === 'bass' ? ui('Left hand', 'Mano izquierda') : ui('Right hand', 'Mano derecha')}</span><ol>${exercise.up.steps.map((step, k) => `<li data-k="${k}" style="--step:${step}"><b>${fingers[k]}</b><small>${noteName(base + step)}</small></li>`).join('')}</ol></div>`;
}

export function warmupGuideMarkup(exercise, { hand = 'both', start = false } = {}) {
  const both = hand === 'both', clefs = handsFor(hand);
  const names = exercise.up.steps.map(step => noteName(HAND_BASE[clefs.at(-1)] + step)).join(' – ');
  const place = both ? ui('Right thumb on middle C, left little finger on the C one octave lower. Rest each finger on its key as in the picture.', 'Pulgar derecho en el Do central y meñique izquierdo en el Do una octava más abajo. Apoya cada dedo en su tecla, como en el dibujo.')
    : clefs[0] === 'bass' ? ui('Left little finger on the C below middle C. Rest each finger on its key as in the picture.', 'Meñique izquierdo en el Do por debajo del Do central. Apoya cada dedo en su tecla, como en el dibujo.')
    : ui('Right thumb on middle C. Rest each finger on its key as in the picture.', 'Pulgar derecho en el Do central. Apoya cada dedo en su tecla, como en el dibujo.');
  return `<div class="cp-warmup-guide" data-exercise="${exercise.id}" data-hand="${hand}">
    <p class="wg-focus"><b>${warmupLabel(exercise)}</b> · ${warmupFocus(exercise)}</p>
    <div class="wg-stage">${warmupDiagram(exercise, hand)}</div>
    <div class="wg-figures">${clefs.slice().reverse().map(clef => figureRow(exercise, clef)).join('')}</div>
    <div class="wg-demo-row"><button type="button" data-warmup-demo aria-pressed="false">${ui('▶ Watch how it goes', '▶ Ver cómo se toca')}</button><span class="wg-demo-state" role="status"></span></div>
    <ol class="wg-steps">
      <li><b>${ui('Place your hands', 'Coloca las manos')}</b><span>${place}</span></li>
      <li><b>${ui('Play the 8-note figure', 'Toca la figura de 8 notas')}</b><span>${both ? ui('Both hands together, one octave apart', 'Las dos manos a la vez, a una octava') : ui('One note per finger', 'Una nota con cada dedo')}: ${names}.</span></li>
      <li><b>${ui('Move up one key every bar', 'Sube una tecla en cada compás')}</b><span>${ui('Start the same figure one white key higher. After an octave, the mirrored figure brings you back down to C.', 'Empieza la misma figura una tecla blanca más arriba. Tras una octava, la figura invertida te devuelve hasta el Do.')}</span></li>
    </ol>
    <ul class="wg-tips">
      <li>${ui('Keep your fingers curved and lift each one clearly.', 'Mantén los dedos curvados y levanta cada uno con claridad.')}</li>
      <li>${ui('Slow and even first: speed up only when every note sounds the same.', 'Primero lento y regular: acelera solo cuando todas las notas suenen igual.')}</li>
      <li>${ui('Keep your wrists relaxed and still; only the fingers move.', 'Muñecas relajadas y quietas: solo trabajan los dedos.')}</li>
    </ul>
    <p class="wg-source">${ui('From C.-L. Hanon, The Virtuoso Pianist (1873).', 'De C.-L. Hanon, El pianista virtuoso (1873).')}</p>
    <div class="cp-actions">${start ? `<button type="button" data-action="close-dialog">${ui('Not now', 'Ahora no')}</button><button type="button" class="primary" data-warmup-start>${ui('Start warm-up', 'Empezar calentamiento')}</button>` : `<button type="button" class="primary" data-action="close-dialog">${ui('Close', 'Cerrar')}</button>`}</div>
  </div>`;
}

// Demonstration: light each key and fingertip in turn for three bars, moving both hands up a key per bar.
export function bindWarmupGuide(root, exercise, { hand = 'both' } = {}) {
  const button = root.querySelector('[data-warmup-demo]'), state = root.querySelector('.wg-demo-state');
  const clefs = handsFor(hand), timers = [];
  let audio = null;
  const tone = (midi, at) => {
    try {
      audio ||= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      const osc = audio.createOscillator(), gain = audio.createGain(), time = audio.currentTime + at;
      osc.type = 'triangle'; osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      gain.gain.setValueAtTime(0.0001, time); gain.gain.exponentialRampToValueAtTime(0.18, time + 0.01); gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
      osc.connect(gain).connect(audio.destination); osc.start(time); osc.stop(time + 0.35);
    } catch { /* Sound is optional; the animation still explains the figure. */ }
  };
  const clear = () => {
    root.querySelectorAll('.wg-key.active, .wg-tip.active, .wg-figure li.active').forEach(el => el.classList.remove('active'));
    root.querySelectorAll('.wg-key[data-active]').forEach(el => el.removeAttribute('data-active'));
  };
  const place = shift => {
    root.querySelectorAll('.wg-hand').forEach(el => { el.style.transform = `translateX(${shift * KEY_W}px)`; });
    root.querySelectorAll('.wg-used').forEach(el => { el.style.transform = `translateX(${shift * KEY_W}px)`; });
  };
  const stop = () => {
    timers.splice(0).forEach(clearTimeout); clear(); place(0);
    button.setAttribute('aria-pressed', 'false'); button.textContent = ui('▶ Watch how it goes', '▶ Ver cómo se toca'); state.textContent = '';
  };
  const play = () => {
    stop(); button.setAttribute('aria-pressed', 'true'); button.textContent = ui('■ Stop', '■ Parar');
    const step = 420, bars = 3;
    for (let bar = 0; bar < bars; bar++) for (let k = 0; k < 8; k++) {
      const at = (bar * 8 + k) * step;
      if (k === 0) timers.push(setTimeout(() => { place(bar); state.textContent = ui(`Bar ${bar + 1}: starting on ${noteName(HAND_BASE.treble + bar)}`, `Compás ${bar + 1}: empieza en ${noteName(HAND_BASE.treble + bar)}`); }, at));
      timers.push(setTimeout(() => {
        clear();
        for (const clef of clefs) {
          const d = HAND_BASE[clef] + bar + exercise.up.steps[k], finger = fingersOf(exercise.up, clef)[k];
          root.querySelector(`.wg-key[data-d="${d}"]`)?.setAttribute('data-active', clef);
          root.querySelector(`.wg-hand[data-hand="${clef}"] .wg-tip[data-finger="${finger}"]`)?.classList.add('active');
          root.querySelector(`.wg-figure[data-hand="${clef}"] li[data-k="${k}"]`)?.classList.add('active');
          tone(makeNote(d, '').midi, 0);
        }
      }, at));
    }
    timers.push(setTimeout(() => { stop(); state.textContent = ui('Then keep climbing one key per bar.', 'Y así sigues subiendo una tecla por compás.'); }, bars * 8 * step + 200));
  };
  button.addEventListener('click', () => button.getAttribute('aria-pressed') === 'true' ? stop() : play());
  return () => { timers.splice(0).forEach(clearTimeout); audio?.close?.().catch(() => {}); };
}
