import { LETTERS, keyAccidentals, makeNote, rangeFor, clampRange, barRhythm, allowedUnits, TIME_SIGS, scaleFingering } from '../music.js';
import { ui } from './locale.js';
import { handRhythm } from './rhythm-levels.js';
import { HANON, warmupLabel, warmupFocus, warmupById, generateWarmupBars } from './warmups.js';

const names = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
const modes = { get major() { return ui('major', 'mayor'); }, get natural() { return ui('natural minor', 'menor natural'); }, get harmonic() { return ui('harmonic minor', 'menor armónica'); }, get dorian() { return ui('Dorian', 'dórico'); } };
const tonics = { major: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'], minor: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'] };
const modalSignatures = { C: 'Bb', D: 'C', E: 'D', F: 'Eb', G: 'F', A: 'G', Bb: 'Ab' };
const pitchLabel = (letter, acc = '') => ui(letter.toUpperCase(), names[letter.toUpperCase()]) + ({ '#': '♯', b: '♭', '##': '𝄪', bb: '𝄫' }[acc] || '');
const raise = { bb: 'b', b: '', '': '#', '#': '##' };
function makeTarget(tonic, mode) {
  const key = mode === 'dorian' ? modalSignatures[tonic] : tonic + (mode === 'major' ? '' : 'm');
  const signature = keyAccidentals(key);
  const root = LETTERS.indexOf(tonic[0].toLowerCase());
  const notes = Array.from({ length: 7 }, (_, degree) => {
    const letter = LETTERS[(root + degree) % 7];
    let acc = signature[letter] || '';
    if (mode === 'harmonic' && degree === 6) acc = raise[acc];
    return { letter, acc, degree, get label() { return pitchLabel(letter, acc); } };
  });
  const degree = mode === 'dorian' ? 5 : mode === 'harmonic' ? 6 : 2;
  return { id: `${tonic}-${mode}`, tonic, mode, key, notes,
    get label() { return `${pitchLabel(tonic[0], tonic.slice(1))} ${modes[mode]}`; },
    get detail() {
      if (mode === 'dorian') return ui(`Dorian has a minor third and a major sixth. Hear ${notes[0].label} as the tonal centre and identify ${notes[5].label}, its sixth degree.`, `El modo dórico tiene tercera menor y sexta mayor. Escucha ${notes[0].label} como centro y reconoce ${notes[5].label}, su sexto grado.`);
      if (mode === 'harmonic') return ui(`Harmonic minor raises the seventh degree of natural minor. Here it is ${notes[6].label}; resolve to ${notes[0].label}.`, `La menor armónica eleva el séptimo grado de la menor natural. Aquí es ${notes[6].label}; resuelve en ${notes[0].label}.`);
      if (mode === 'natural') return ui('Natural minor uses the same seven notes ascending and descending. Recognise the minor third and return to the tonic.', 'La menor natural mantiene sus siete notas tanto al subir como al bajar. Reconoce la tercera menor y vuelve a la tónica.');
      return ui(`Start and finish on ${notes[0].label}. The major scale follows whole, whole, half, whole, whole, whole, half steps.`, `Empieza y termina en ${notes[0].label}. La escala mayor sigue el patrón tono, tono, semitono, tono, tono, tono, semitono.`);
    },
    get question() { return ui(`What is degree ${degree + 1} of ${this.label}?`, `¿Cuál es el ${degree + 1}.º grado de ${this.label}?`); },
    get answer() { return notes[degree].label; },
    get options() { return [notes[degree].label, notes[(degree + 2) % 7].label, notes[(degree + 4) % 7].label].sort(); }
  };
}
export const TARGETS = [
  ...tonics.major.map(t => makeTarget(t, 'major')),
  ...tonics.minor.flatMap(t => ['natural', 'harmonic'].map(m => makeTarget(t, m))),
  ...Object.keys(modalSignatures).map(t => makeTarget(t, 'dorian')),
];
// Hanon warm-ups are in C major; they share the target interface so labels, keys and validation stay uniform.
export const WARMUP_TARGETS = HANON.map(exercise => ({ id: exercise.id, tonic: 'C', mode: 'major', key: 'C', warmup: exercise,
  get notes() { return TARGETS[0].notes; }, get label() { return warmupLabel(exercise); }, get detail() { return warmupFocus(exercise); } }));
export const targetById = id => TARGETS.find(t => t.id === id) || WARMUP_TARGETS.find(t => t.id === id) || TARGETS[0];
export const MODE_NAMES = modes;

// Generate only pitches from the selected scale; never remove an accidental to fit a screen.
// Standard scale fingering, looked up by scale degree (0 = tonic … 7 = octave).
const fingeringKey = target => target.mode === 'major' ? target.tonic : target.tonic + 'm';
// The hand moves only at thumb crossings: thumb under after a 3rd/4th finger, or a finger crossing over the thumb.
function markCrossings(list) {
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1].finger, b = list[i].finger;
    list[i].shift = Math.abs(list[i].d - list[i - 1].d) <= 2 && ((b === 1 && a >= 3) || (a === 1 && b >= 3));
  }
  return list;
}
const BARS_PER_POSITION = 8, BARS_AWAY = 4;

// Two-hand reading: the left hand keeps one accompaniment pattern for a whole section, and sections
// follow a small form (AB, AABA, ABBA, AABB) so the bass changes only when the music does.
export const BASS_PATTERNS = ['whole', 'halves', 'arpeggio', 'alberti'];
// Chord-tone order and note length for each accompaniment pattern (unit 0 = one note per bar).
const PATTERN_SHAPES = { whole: { shape: [0], unit: 0 }, halves: { shape: [0, 2], unit: 8 }, arpeggio: { shape: [0, 1, 2, 1], unit: 4 }, alberti: { shape: [0, 2, 1, 2], unit: 2 } };
export const BASS_FORMS = ['AB', 'AABA', 'ABBA', 'AABB'];
export const SECTION_BARS = 4;
// Primary chords inside the left hand's five-finger position on the tonic (degrees from the position's
// lowest note). V7 and IV reach one step outside with a stretch, as in beginner five-finger accompaniments.
const CHORDS = { I: [0, 2, 4], V: [-1, 3, 4], IV: [0, 3, 5] };
// A held bass plays each chord's root, which lies inside the position.
const ROOTS = { I: 0, V: 4, IV: 3 };
const PROGRESSIONS = { A: ['I', 'I', 'V', 'I'], B: ['IV', 'I', 'V', 'I'] };
// Scale degrees (0 = tonic) that sound consonant over each chord; the melody lands on them on strong beats.
export const CHORD_DEGREES = { I: [0, 2, 4], V: [4, 6, 1, 3], IV: [3, 5, 0] };
export const chordAt = (bar, seed = bassSeed) => { const section = bassSection(bar, seed); return PROGRESSIONS[section.label][section.barInSection]; };
let bassSeed = 1;
function seeded(seed) {
  let x = (Math.imul(seed, 2654435761) >>> 0) || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}
// Form, section and pattern for a bar, stable across generated chunks of the same exercise.
export function bassSection(bar, seed = bassSeed, patterns = BASS_PATTERNS) {
  for (let start = 0, piece = 0; ; piece++) {
    const random = seeded(seed + piece * 7919), form = BASS_FORMS[Math.floor(random() * BASS_FORMS.length)];
    const length = form.length * SECTION_BARS;
    if (bar < start + length) {
      const a = patterns[Math.floor(random() * patterns.length)], others = patterns.filter(pattern => pattern !== a);
      const b = others.length ? others[Math.floor(random() * others.length)] : a;
      const index = Math.floor((bar - start) / SECTION_BARS), label = form[index];
      return { form, label, index, pattern: label === 'A' ? a : b, barInSection: (bar - start) % SECTION_BARS };
    }
    start += length;
  }
}
function bassBars(opts, target, phase, candidates) {
  const beats = TIME_SIGS[opts.timeSig] || 4, barUnits = beats * 4;
  const durations = { 2: '8', 4: 'q', 8: 'h', 12: 'hd', 16: 'w' }, patterns = handRhythm(opts.rhythm, 'bass').patterns;
  const minD = candidates[0].d, maxD = candidates.at(-1).d, note = d => candidates[d - minD];
  const tonics = candidates.filter(n => n.letter === target.notes[0].letter).map(n => n.d);
  const span = Math.min(4, maxD - minD), mid = (minD + maxD - span) / 2;
  const pos = tonics.filter(d => d >= minD && d + span <= maxD).sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0] ?? minD;
  const result = [];
  for (let bar = 0; bar < 2; bar++) {
    const section = bassSection(phase + bar, bassSeed, patterns), chord = PROGRESSIONS[section.label][section.barInSection];
    // A chord tone outside the keyboard range falls back to the nearest note of the position.
    const tones = (section.pattern === 'whole' ? [ROOTS[chord]] : CHORDS[chord]).map(step => pos + step).map(d => d < minD || d > maxD ? Math.max(pos, Math.min(pos + span, d)) : d);
    const { shape, unit: length } = PATTERN_SHAPES[section.pattern];
    for (let at = 0, i = 0; at < barUnits; i++) {
      // Half notes in 3/4 end the bar with a quarter.
      const unit = Math.min(length || barUnits, barUnits - at), d = tones[shape[i % shape.length]];
      const n = { ...note(d), dur: durations[unit], units: unit, start: bar * barUnits + at, bar, clef: 'bass', pos, pattern: section.pattern, section: section.label, chord };
      at += unit;
      if (d < pos || d > pos + span) n.finger = d < pos ? 5 : 1;
      result.push(n);
    }
  }
  return result;
}

export function generateTargetBars(opts, targetId, technique = false, phase = 0) {
  const target = targetById(targetId);
  if (target.warmup) return generateWarmupBars(opts, opts.warmupSet?.map(warmupById).filter(Boolean).length ? opts.warmupSet.map(warmupById).filter(Boolean) : target.warmup, phase);
  if (!technique && opts.clef === 'grand') {
    // The right hand reads a melody; the left keeps one accompaniment pattern per section. Middle C separates their registers.
    if (phase === 0) bassSeed = Math.floor(Math.random() * 2 ** 31) + 1;
    return [...generateTargetBars({ ...opts, clef: 'treble', splitHands: true }, targetId, false, phase), ...generateTargetBars({ ...opts, clef: 'bass', splitHands: true, accompaniment: true }, targetId, false, phase)]
      .sort((a, b) => a.start - b.start || (a.clef === 'treble' ? -1 : 1));
  }
  if (technique && opts.clef === 'grand') {
    // Parallel one-octave scales: distinct pitches, shared onsets and continuous up/down motion.
    const beats = TIME_SIGS[opts.timeSig] || 4, root = LETTERS.indexOf(target.tonic[0].toLowerCase());
    const notes = [];
    for (let step = 0; step < beats * 2; step++) {
      const cycle = (phase * beats + step) % 16, degree = cycle <= 7 ? cycle : 15 - cycle;
      for (const [clef, octave] of [['treble', 28], ['bass', 21]]) {
        const pitch = target.notes[degree % 7];
        notes.push({ ...makeNote(octave + root + degree, pitch.acc), clef, units: 4, dur: 'q', start: step * 4, bar: Math.floor(step / beats), finger: scaleFingering(fingeringKey(target), clef)[degree] });
      }
    }
    for (const clef of ['treble', 'bass']) markCrossings(notes.filter(n => n.clef === clef));
    return notes;
  }
  const hand = opts.clef === 'bass' ? 'bass' : 'treble';
  const [lo, hi] = clampRange(rangeFor(hand, opts.level || 0, opts.input === 'none'), opts.vis);
  const candidates = [];
  for (let d = lo; d <= hi; d++) {
    const pitch = target.notes.find(n => n.letter === LETTERS[d % 7]);
    const note = makeNote(d, pitch.acc);
    if (opts.splitHands && (hand === 'bass' ? note.midi >= 60 : note.midi < 60)) continue;
    if (!opts.vis || note.midi >= opts.vis.loMidi && note.midi <= opts.vis.hiMidi) candidates.push(note);
  }
  if (!candidates.length) throw new Error(ui('Widen the keyboard range for this scale.', 'Amplía el rango de teclado para esta escala.'));
  if (opts.accompaniment) return bassBars(opts, target, phase, candidates);
  const beats = TIME_SIGS[opts.timeSig] || 4;
  const durations = { 1: '16', 2: '8', 3: '8d', 4: 'q', 6: 'qd', 8: 'h', 12: 'hd', 16: 'w' };
  // Candidates are consecutive scale steps, so a diatonic index d maps straight to a note.
  const minD = candidates[0].d, maxD = candidates.at(-1).d, note = d => candidates[d - minD];
  const tonics = candidates.filter(n => n.letter === target.notes[0].letter).map(n => n.d);
  const nearestTonic = (span, fallback) => {
    const fits = tonics.filter(d => d >= minD && d + span <= maxD), mid = (minD + maxD - span) / 2;
    return fits.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0] ?? fallback;
  };
  const result = [];
  if (technique) {
    // One octave from the tonic and back, with the standard fingering for this key. The turning notes repeat
    // so a scale starting on a black key never needs two thumb crossings in a row.
    const span = Math.min(7, maxD - minD), first = nearestTonic(span, minD), fingers = scaleFingering(fingeringKey(target), hand);
    const top = Math.min(span, maxD - first);
    for (let bar = 0; bar < 2; bar++) for (let beat = 0; beat < beats; beat++) {
      const step = (phase + bar) * beats + beat, cycle = top ? step % (top * 2 + 2) : 0, degree = cycle <= top ? cycle : top * 2 + 1 - cycle;
      result.push({ ...note(first + degree), dur: 'q', units: 4, start: (bar * beats + beat) * 4, bar, clef: hand, finger: fingers[degree] });
    }
    return markCrossings(result);
  }
  // Sight-reading stays in one five-finger position. The hand moves rarely and only at a phrase start:
  // the home position on the tonic holds for 8 bars, then a neighbouring one for 4.
  const span = Math.min(4, maxD - minD), fits = d => d >= minD && d + span <= maxD;
  const home = nearestTonic(span, Math.max(minD, Math.min(maxD - span, Math.round((minD + maxD - span) / 2))));
  let pos = home;
  // Away phrases take turns at the bottom, top and middle of the range so the whole staff gets read.
  const cycle = (BARS_PER_POSITION + BARS_AWAY) / BARS_AWAY, group = Math.floor(phase / BARS_AWAY);
  if (group % cycle === BARS_PER_POSITION / BARS_AWAY) {
    const away = [...new Set([minD, maxD - span, home - 3, home + 3, home + 2, home - 2])].filter(d => fits(d) && d !== home);
    if (away.length) pos = away[Math.floor(group / cycle) % away.length];
  }
  // Stretches: one note beyond the position (thumb or little finger reaching out), then straight back in.
  // At most one per two bars, never two in a row, so the hand keeps its place.
  const edgeFinger = below => hand === 'bass' ? (below ? 5 : 1) : (below ? 1 : 5);
  let cursor = pos, stretched = null, stretches = 0;
  const notes = [];
  // Managed blocks read their rhythm level per hand; the left hand alone reads longer values.
  const rhythm = opts.rhythm ? handRhythm(opts.rhythm, opts.splitHands ? 'treble' : hand) : { figures: opts.figures, dotted: false };
  for (let bar = 0; bar < 2; bar++) for (const units of barRhythm(beats, allowedUnits(rhythm.figures, rhythm.dotted), false)) notes.push({ bar, units });
  // With the accompaniment, strong beats take a tone of the bar's chord; the steps between act as passing notes.
  const root = LETTERS.indexOf(target.tonic[0].toLowerCase()), degreeOf = d => ((d - root) % 7 + 7) % 7;
  const harmony = opts.splitHands && hand === 'treble' && !opts.accompaniment ? bar => CHORD_DEGREES[chordAt(phase + bar)] : null;
  let position = 0, lastBar = 0;
  notes.forEach(({ bar, units }, i) => {
    if (bar !== lastBar) { position = 0; lastBar = bar; }
    if (harmony && (position === 0 || beats === 4 && position === 8)) {
      const tones = harmony(bar);
      if (!tones.includes(degreeOf(cursor))) {
        const options = []; for (let d = pos; d <= pos + span; d++) if (tones.includes(degreeOf(d))) options.push(d);
        if (options.length) cursor = options.sort((a, b) => Math.abs(a - cursor) - Math.abs(b - cursor) || Math.random() - .5)[0];
      }
    }
    const n = { ...note(cursor), dur: durations[units], units, start: bar * beats * 4 + position, bar, clef: hand, pos };
    if (cursor < pos || cursor > pos + span) n.finger = edgeFinger(cursor < pos);
    result.push(n); position += units;
    if (stretched != null) { cursor = stretched ? pos + 1 : pos + span - 1; stretched = null; return; }
    const lower = cursor === pos + 1 && fits(pos) && pos - 1 >= minD, upper = cursor === pos + span - 1 && pos + span + 1 <= maxD;
    if (!stretches && span === 4 && i < notes.length - 1 && (lower || upper) && Math.random() < .2) {
      const below = lower && (!upper || Math.random() < .5);
      cursor = below ? pos - 1 : pos + span + 1; stretched = below; stretches++; return;
    }
    const step = [-2, -1, 1, 2][Math.floor(Math.random() * 4)];
    let next = cursor + step;
    if (next < pos || next > pos + span) next = cursor - step;
    cursor = Math.max(pos, Math.min(pos + span, next));
  });
  return result;
}
