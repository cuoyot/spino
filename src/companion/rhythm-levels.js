import { ui } from './locale.js';

// A block's rhythm level means different things for each hand: the right hand reads the melody while the
// left hand starts with long notes and only later moves to patterns in quarters and eighths.
// Blocks store the level in `figures`; older notebooks used 'q', 'hq' and 'hqe', which map to levels 1–3.
const LEGACY = { q: '1', hq: '2', hqe: '3' };
export const RHYTHM_IDS = ['1', '2', '3', '4'];
export const RHYTHM_VALUES = [...RHYTHM_IDS, ...Object.keys(LEGACY)];
export const rhythmLevel = value => LEGACY[value] || (RHYTHM_IDS.includes(String(value)) ? String(value) : '1');

const FIG = list => ({ w: list.includes('w'), h: list.includes('h'), q: list.includes('q'), e: list.includes('e'), s: false });
const LEVELS = {
  1: { right: FIG('q'), left: FIG('wh'), bass: ['whole'] },
  2: { right: FIG('hq'), left: FIG('hq'), bass: ['whole', 'halves'] },
  3: { right: FIG('hqe'), left: FIG('hq'), bass: ['halves', 'arpeggio'] },
  4: { right: FIG('hqe'), left: FIG('qe'), bass: ['arpeggio', 'alberti'], dotted: true },
};
// Note values a hand may read as a melody at this level, and the accompaniment patterns for two hands.
export function handRhythm(value, hand) {
  const level = LEVELS[rhythmLevel(value)];
  return { figures: hand === 'bass' ? level.left : level.right, dotted: !!level.dotted && hand !== 'bass', patterns: level.bass };
}
// Every value used by either hand, so the score spacing accounts for the shortest one.
export function rhythmFigures(value) {
  const level = LEVELS[rhythmLevel(value)], all = { ...level.right };
  for (const [key, on] of Object.entries(level.left)) all[key] ||= on;
  if (level.bass.includes('alberti')) all.e = true;
  return { figures: all, dotted: !!level.dotted };
}
export const rhythmOptions = () => [
  ['1', ui('1 · First steps (RH quarters · LH whole notes)', '1 · Inicial (MD negras · MI redondas)')],
  ['2', ui('2 · Basic (RH halves and quarters · LH whole and half notes)', '2 · Básico (MD blancas y negras · MI redondas y blancas)')],
  ['3', ui('3 · Intermediate (RH up to eighths · LH quarter-note arpeggios)', '3 · Intermedio (MD hasta corcheas · MI arpegios en negras)')],
  ['4', ui('4 · Advanced (RH dotted rhythms · LH Alberti in eighths)', '4 · Avanzado (MD con puntillo · MI bajo Alberti en corcheas)')],
];

// The pianist level in the profile (1–4) sets the default rhythm level and reading range of new practices.
export const PIANIST_LEVELS = ['1', '2', '3', '4'];
export const PIANIST_RANGE = { 1: 0, 2: 1, 3: 1, 4: 2 };
export const pianistLevelName = level => ui(['Beginner', 'Basic', 'Intermediate', 'Advanced'][level - 1] || 'Beginner', ['Inicial', 'Básico', 'Intermedio', 'Avanzado'][level - 1] || 'Inicial');
export const pianistLevelOptions = () => [
  ['1', ui('1 · Beginner — quarter notes, focused range', '1 · Inicial — negras, registro reducido')],
  ['2', ui('2 · Basic — half and quarter notes, standard range', '2 · Básico — blancas y negras, registro estándar')],
  ['3', ui('3 · Intermediate — up to eighth notes, standard range', '3 · Intermedio — hasta corcheas, registro estándar')],
  ['4', ui('4 · Advanced — dotted rhythms, wide range', '4 · Avanzado — ritmos con puntillo, registro amplio')],
];
