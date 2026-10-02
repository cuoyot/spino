import { ui } from './locale.js';
import { makeNote, TIME_SIGS } from '../music.js';
import { rhythmLevel } from './rhythm-levels.js';
import { pianistLevel } from './practice-defaults.js';

// Hanon warm-ups from C.-L. Hanon, "The Virtuoso Pianist", Part I (1873, public domain), checked against the
// Mutopia Project edition. Each bar repeats one 8-note figure a step higher; after an octave the mirrored
// figure comes back down. Steps are diatonic offsets from the bar's first note and fingers follow Hanon.
// `top` is where the descending figure starts, counted in steps above the first note of the exercise.
export const HANON = [
  { id: 'hanon-1', number: 1, top: 11,
    up: { steps: [0, 2, 3, 4, 5, 4, 3, 2], right: [1, 2, 3, 4, 5, 4, 3, 2], left: [5, 4, 3, 2, 1, 2, 3, 4] },
    down: { steps: [0, -2, -3, -4, -5, -4, -3, -2], right: [5, 4, 3, 2, 1, 2, 3, 4], left: [1, 2, 3, 4, 5, 4, 3, 2] },
    focus: ['Stretches fingers 4 and 5 apart.', 'Trabaja la extensión entre los dedos 4 y 5.'] },
  { id: 'hanon-2', number: 2, top: 11,
    up: { steps: [0, 2, 5, 4, 3, 4, 3, 2], right: [1, 2, 5, 4, 3, 4, 3, 2], left: [5, 3, 1, 2, 3, 2, 3, 4] },
    down: { steps: [0, -3, -5, -4, -3, -4, -3, -2], right: [5, 2, 1, 2, 3, 2, 3, 4], left: [1, 3, 5, 4, 3, 4, 3, 2] },
    focus: ['Strengthens the naturally weaker fingers 3 and 4.', 'Fortalece los dedos 3 y 4, que son los más débiles.'] },
  { id: 'hanon-3', number: 3, top: 11,
    up: { steps: [0, 2, 5, 4, 3, 2, 3, 4], right: [1, 2, 5, 4, 3, 2, 3, 4], left: [5, 3, 1, 2, 3, 4, 3, 2] },
    down: { steps: [0, -3, -5, -4, -3, -2, -3, -4], right: [5, 2, 1, 2, 3, 4, 3, 2], left: [1, 3, 5, 4, 3, 2, 3, 4] },
    focus: ['Builds strength and precision in fingers 2, 3 and 4.', 'Da fuerza y precisión a los dedos 2, 3 y 4.'] },
  { id: 'hanon-4', number: 4, top: 11,
    up: { steps: [0, 1, 0, 2, 5, 4, 3, 2], right: [1, 2, 1, 2, 5, 4, 3, 2], left: [5, 4, 5, 3, 1, 2, 3, 4] },
    down: { steps: [0, -1, 0, -3, -5, -4, -3, -2], right: [5, 4, 5, 2, 1, 2, 3, 4], left: [1, 2, 1, 3, 5, 4, 3, 2] },
    focus: ['Independence of fingers 3, 4 and 5.', 'Independencia de los dedos 3, 4 y 5.'] },
  { id: 'hanon-5', number: 5, top: 7,
    up: { steps: [0, 5, 4, 5, 3, 4, 2, 3], right: [1, 5, 4, 5, 3, 4, 2, 3], left: [5, 1, 2, 1, 3, 2, 4, 3] },
    down: { steps: [0, 1, 0, 2, 1, 3, 2, 4], right: [1, 2, 1, 3, 2, 4, 3, 5], left: [5, 4, 5, 3, 4, 2, 3, 1] },
    focus: ['Works all five fingers equally; lift each one high and precisely.', 'Trabaja los cinco dedos por igual; levanta cada uno con precisión.'] },
];
export const WARMUP_IDS = HANON.map(exercise => exercise.id);
export const warmupById = id => HANON.find(exercise => exercise.id === id) || null;
export const warmupLabel = exercise => ui(`Hanon No. ${exercise.number}`, `Hanon n.º ${exercise.number}`);
export const warmupFocus = exercise => ui(...exercise.focus);

// Right hand from middle C, left hand an octave lower, as in Hanon's own layout.
export const HAND_BASE = { treble: 28, bass: 21 };
const BARS_UP = 7; // one octave up, then the mirrored figure one octave down
export const warmupUnit = rhythm => ({ 1: 4, 2: 2, 3: 2, 4: 1 })[rhythmLevel(rhythm)];
const DURATIONS = { 1: '16', 2: '8', 4: 'q', 8: 'h', 12: 'hd', 16: 'w' };

// One full cycle (up, down, final tonic) for each hand, as absolute note starts in units (4 = quarter note).
export function warmupCycle(exercise, { unit = 2, hands = ['treble', 'bass'], barUnits = 16 } = {}) {
  const notes = [], groupUnits = 8 * unit;
  for (const clef of hands) {
    const base = HAND_BASE[clef], fingers = clef === 'bass' ? 'left' : 'right';
    for (let group = 0; group < BARS_UP * 2; group++) {
      const down = group >= BARS_UP, figure = down ? exercise.down : exercise.up;
      const first = down ? base + exercise.top - (group - BARS_UP) : base + group;
      figure.steps.forEach((step, k) => notes.push({ d: first + step, finger: figure[fingers][k], start: group * groupUnits + k * unit, units: unit, clef, section: down ? 'down' : 'up' }));
    }
    notes.push({ d: base, finger: clef === 'bass' ? 5 : 1, start: BARS_UP * 2 * groupUnits, units: barUnits, clef, section: 'end' });
  }
  return { notes, length: BARS_UP * 2 * groupUnits + barUnits };
}

// Two bars of the endless warm-up stream starting at bar `phase`, in the reader's chunk format.
export function generateWarmupBars(opts, exercise, phase = 0) {
  const beats = TIME_SIGS[opts.timeSig] || 4, barUnits = beats * 4, unit = warmupUnit(opts.rhythm || '2');
  const hands = opts.clef === 'grand' ? ['treble', 'bass'] : [opts.clef === 'bass' ? 'bass' : 'treble'];
  const { notes, length } = warmupCycle(exercise, { unit, hands, barUnits });
  const from = phase * barUnits, to = from + 2 * barUnits, result = [];
  for (let cycle = Math.floor(from / length); cycle * length < to; cycle++) {
    for (const n of notes) {
      const start = cycle * length + n.start - from;
      if (start < 0 || start >= 2 * barUnits) continue;
      result.push({ ...makeNote(n.d, ''), dur: DURATIONS[n.units], units: n.units, start, bar: Math.floor(start / barUnits), clef: n.clef, finger: n.finger, warmup: n.section });
    }
  }
  return result.sort((a, b) => a.start - b.start || (a.clef === 'treble' ? -1 : 1));
}

// Warm-up settings live in the notebook preferences: on by default for piano and MIDI sessions.
export const WARMUP_DEFAULTS = { enabled: true, minutes: 3, exercise: 'rotate' };
export const warmupPreferences = preferences => ({ ...WARMUP_DEFAULTS, ...preferences?.warmup });
export function validWarmupPreferences(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value) && typeof value.enabled === 'boolean'
    && Number.isInteger(value.minutes) && value.minutes >= 1 && value.minutes <= 30
    && (value.exercise === 'rotate' || WARMUP_IDS.includes(value.exercise));
}
// "Rotate" moves to the next exercise after each saved session that included a warm-up.
export function nextWarmupId(data) {
  const prefs = warmupPreferences(data.preferences);
  if (prefs.exercise !== 'rotate') return prefs.exercise;
  const done = data.sessions.filter(session => session.results?.some(result => result.block.type === 'warmup')).length;
  return WARMUP_IDS[done % WARMUP_IDS.length];
}
export function warmupBlockValues(data, exerciseId = nextWarmupId(data)) {
  return { target: exerciseId, minutes: warmupPreferences(data.preferences).minutes, bpm: 60, hand: 'both', figures: String(pianistLevel(data.preferences)), level: 0, presentation: 'auto', timing: 'timed', input: 'piano', passage: '', workId: '' };
}
