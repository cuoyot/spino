import { LETTERS, keyAccidentals, makeNote, rangeFor, clampRange, barRhythm, allowedUnits, TIME_SIGS } from '../music.js';
import { ui } from './locale.js';

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
export const targetById = id => TARGETS.find(t => t.id === id) || TARGETS[0];
export const MODE_NAMES = modes;

// Generate only pitches from the selected scale; never remove an accidental to fit a screen.
export function generateTargetBars(opts, targetId, technique = false, phase = 0) {
  const target = targetById(targetId);
  if (!technique && opts.clef === 'grand') {
    // Each hand reads its own rhythm and melody; middle C separates their registers.
    return ['treble', 'bass'].flatMap(clef => generateTargetBars({ ...opts, clef, splitHands: true }, targetId, false, phase))
      .sort((a, b) => a.start - b.start || (a.clef === 'treble' ? -1 : 1));
  }
  if (technique && opts.clef === 'grand') {
    // Parallel one-octave scales: distinct pitches, shared onsets and continuous up/down motion.
    const beats = TIME_SIGS[opts.timeSig] || 4, root = LETTERS.indexOf(target.tonic[0].toLowerCase());
    const notes = [];
    for (let step = 0; step < beats * 2; step++) {
      const cycle = (phase * beats + step) % 14, degree = cycle <= 7 ? cycle : 14 - cycle;
      for (const [clef, octave] of [['treble', 28], ['bass', 21]]) {
        const pitch = target.notes[degree % 7];
        notes.push({ ...makeNote(octave + root + degree, pitch.acc), clef, units: 4, dur: 'q', start: step * 4, bar: Math.floor(step / beats) });
      }
    }
    return notes;
  }
  const hand = opts.clef === 'bass' ? 'bass' : 'treble';
  const [lo, hi] = clampRange(rangeFor(hand, opts.level || 0), opts.vis);
  const candidates = [];
  for (let d = lo; d <= hi; d++) {
    const pitch = target.notes.find(n => n.letter === LETTERS[d % 7]);
    const note = makeNote(d, pitch.acc);
    if (opts.splitHands && (hand === 'bass' ? note.midi >= 60 : note.midi < 60)) continue;
    if (!opts.vis || note.midi >= opts.vis.loMidi && note.midi <= opts.vis.hiMidi) candidates.push(note);
  }
  if (!candidates.length) throw new Error(ui('Widen the keyboard range for this scale.', 'Amplía el rango de teclado para esta escala.'));
  const beats = TIME_SIGS[opts.timeSig] || 4;
  const durations = { 1: '16', 2: '8', 3: '8d', 4: 'q', 6: 'qd', 8: 'h', 12: 'hd', 16: 'w' };
  const result = []; let cursor = phase % candidates.length; let direction = phase % 2 ? -1 : 1;
  const tonicIndex = candidates.findIndex(n => n.letter === target.notes[0].letter);
  if (!technique && tonicIndex >= 0) cursor = tonicIndex;
  for (let bar = 0; bar < 2; bar++) {
    let position = 0;
    for (const units of barRhythm(beats, technique ? [4] : allowedUnits(opts.figures), false)) {
      const n = candidates[cursor];
      result.push({ ...n, dur: durations[units], units, start: bar * beats * 4 + position, bar, clef: hand });
      position += units;
      if (technique) {
        if (cursor + direction >= candidates.length || cursor + direction < 0) direction *= -1;
        cursor = Math.max(0, Math.min(candidates.length - 1, cursor + direction));
      } else {
        const next = cursor + [-2, -1, 1, 2][Math.floor(Math.random() * 4)];
        cursor = Math.max(0, Math.min(candidates.length - 1, next));
      }
    }
  }
  return result;
}
