// Exercise templates and difficulty levels.
// A template says WHAT the exercise is (staves, key, metre, figures, timing). Personal preferences
// (language, note names, input, sound, light) live outside templates and never travel with them.

export const TEMPLATE_KEYS = [
  'mode', 'pianoMode', 'hands', 'layoutMode', 'position', 'clef', 'level', 'scale', 'maxAcc', 'accidentals',
  'timeSig', 'figures', 'dotted', 'timing', 'bpm', 'metronome', 'stopOnMiss', 'tolerance',
];

const FIG = (s) => ({ w: s.includes('w'), h: s.includes('h'), q: s.includes('q'), e: s.includes('e'), s: s.includes('s') });

const base = {
  mode: 'melody', pianoMode: false, hands: 'alternate', layoutMode: 'scroll', position: 'five', clef: 'treble', level: 0, scale: 'major', maxAcc: 0, accidentals: false,
  timeSig: '4/4', figures: FIG('q'), dotted: false, timing: 'timed', bpm: 40, metronome: true, stopOnMiss: false, tolerance: 'relaxed',
};

// goal: over the last `notes` first-try results, at least `accuracy` must be right
// Passing takes a real practice session: 80 notes in a row (a good half hour) played right first time.
const wait = (notes = 80, accuracy = 0.92) => ({ notes, accuracy });
const timed = (notes = 80, accuracy = 0.88) => ({ notes, accuracy });

// Ten levels; more can be appended later. Names/descriptions are i18n keys lvlN / lvlNd.
export const LEVELS = [
  { id: 'l1', settings: { ...base }, goal: wait() },
  { id: 'l2', settings: { ...base, figures: FIG('whq'), bpm: 44 }, goal: wait() },
  { id: 'l3', settings: { ...base, clef: 'bass', figures: FIG('whq'), bpm: 44 }, goal: wait() },
  { id: 'l4', settings: { ...base, pianoMode: true, position: 'phrase', figures: FIG('w') }, goal: wait(60) },
  { id: 'l5', settings: { ...base, pianoMode: true, position: 'phrase', maxAcc: 1, figures: FIG('hq'), timeSig: '3/4', bpm: 48 }, goal: wait() },
  { id: 'l6', settings: { ...base, pianoMode: true, position: 'phrase', maxAcc: 1, figures: FIG('hq'), timing: 'timed', bpm: 50 }, goal: timed() },
  { id: 'l7', settings: { ...base, pianoMode: true, position: 'free', maxAcc: 2, figures: FIG('hqe'), timing: 'timed', bpm: 60 }, goal: timed() },
  { id: 'l8', settings: { ...base, pianoMode: true, position: 'free', maxAcc: 2, scale: 'both', figures: FIG('hqe'), dotted: true, timeSig: '3/4', timing: 'timed', bpm: 60, tolerance: 'normal' }, goal: timed() },
  { id: 'l9', settings: { ...base, pianoMode: true, position: 'free', maxAcc: 3, scale: 'both', accidentals: true, level: 1, figures: FIG('qe'), dotted: true, timing: 'timed', bpm: 66, tolerance: 'normal' }, goal: timed() },
  { id: 'l10', settings: { ...base, pianoMode: true, position: 'free', maxAcc: 4, scale: 'both', accidentals: true, level: 1, figures: FIG('qes'), dotted: true, timeSig: '2/4', timing: 'timed', bpm: 60, tolerance: 'normal' }, goal: timed() },
  { id: 'l11', settings: { ...base, pianoMode: true, hands: 'together', position: 'phrase', maxAcc: 1, figures: FIG('whq'), bpm: 44 }, goal: wait() },
];

// Where the on-screen keyboard falls short: both hands at once, or fast passages against the metronome.
export function prefersMidi(s) {
  if (!s) return false;
  if (s.pianoMode && s.hands === 'together') return true;
  const f = s.figures || {};
  return s.timing === 'timed' && (f.s || (f.e && (s.bpm || 60) >= 60));
}

export const levelIndex = (id) => LEVELS.findIndex((l) => l.id === id);
export const isLevel = (id) => levelIndex(id) >= 0;

export function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

// Only the exercise part of a settings object
export function exerciseOf(settings) {
  const out = {};
  for (const k of TEMPLATE_KEYS) if (settings[k] !== undefined) out[k] = clone(settings[k]);
  return out;
}

// ---------- export / import ----------
const FORMAT = 'sightreader-template';

export function exportTemplate(tpl) {
  return JSON.stringify({ [FORMAT]: 1, name: tpl.name, base: tpl.base, settings: exerciseOf(tpl.settings), goal: tpl.goal }, null, 2);
}

const VALID = {
  mode: ['melody', 'notes'], hands: ['alternate', 'together'], layoutMode: ['scroll', 'page'], position: ['five', 'phrase', 'free'], clef: ['treble', 'bass', 'grand'], scale: ['major', 'minor', 'both'],
  timeSig: ['2/4', '3/4', '4/4'], timing: ['wait', 'timed'], tolerance: ['strict', 'normal', 'relaxed'],
};

// Parses exported JSON; throws on anything that is not a template. Unknown keys are dropped.
export function importTemplate(text, makeId) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw new Error('json');
  }
  if (!obj || typeof obj !== 'object' || !obj[FORMAT] || typeof obj.settings !== 'object') throw new Error('format');
  const s = {};
  for (const k of TEMPLATE_KEYS) {
    const v = obj.settings[k];
    if (v === undefined) continue;
    if (VALID[k] && !VALID[k].includes(v)) continue;
    if (k === 'figures') {
      if (typeof v !== 'object') continue;
      s.figures = FIG(['w', 'h', 'q', 'e', 's'].filter((f) => v[f]).join(''));
      continue;
    }
    if (['pianoMode', 'accidentals', 'dotted', 'metronome', 'stopOnMiss'].includes(k)) s[k] = !!v;
    else if (['level', 'maxAcc', 'bpm'].includes(k)) {
      const n = +v;
      if (Number.isFinite(n)) s[k] = k === 'bpm' ? Math.min(160, Math.max(30, n)) : k === 'level' ? Math.min(2, Math.max(0, Math.round(n))) : Math.min(7, Math.max(0, Math.round(n)));
    } else s[k] = v;
  }
  if (!Object.keys(s).length) throw new Error('format');
  const goal = obj.goal && Number.isFinite(+obj.goal.notes) && Number.isFinite(+obj.goal.accuracy)
    ? { notes: Math.min(200, Math.max(5, Math.round(+obj.goal.notes))), accuracy: Math.min(1, Math.max(0.3, +obj.goal.accuracy)) }
    : { notes: 30, accuracy: 0.9 };
  return { id: makeId(), name: String(obj.name || '').slice(0, 40) || 'Template', base: typeof obj.base === 'string' ? obj.base : undefined, settings: { ...clone(base), ...s }, goal };
}

export const DEFAULT_GOAL = { notes: 80, accuracy: 0.95 };
