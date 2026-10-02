import { ui } from './locale.js';
import { RHYTHM_VALUES, PIANIST_RANGE, rhythmLevel } from './rhythm-levels.js';
const choice = (id, en, es) => Object.defineProperty([id], 1, { enumerable: true, get: () => ui(en, es) });
export const RANGE_LEVELS = [choice(0, 'Focused range', 'Registro reducido'), choice(1, 'Standard range', 'Registro estándar'), choice(2, 'Wide range', 'Registro amplio')];
export const HANDS = [choice('right', 'Right hand · treble', 'Mano derecha · clave de sol'), choice('left', 'Left hand · bass', 'Mano izquierda · clave de fa'), choice('both', 'Both hands together', 'Las dos manos juntas')];
// The pianist level chosen in the profile (1–4). Notebooks from before it keep the rhythm level they had set for reading.
export function pianistLevel(preferences) {
  const level = preferences?.level;
  if (Number.isInteger(level) && level >= 1 && level <= 4) return level;
  return Number(rhythmLevel(preferences?.practiceDefaults?.reading?.figures ?? '1'));
}
// Defaults for a new block: hands and tempo per activity; rhythm level and reading range from the pianist level.
export function practiceDefaults(preferences, type) {
  const level = pianistLevel(preferences);
  return { hand: 'right', bpm: 60, ...preferences.practiceDefaults?.[type], level: PIANIST_RANGE[level], figures: String(level) };
}
export function validPracticeDefaults(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([type, v]) => ['reading', 'technique'].includes(type) && v &&
    (v.level === undefined || Number.isInteger(v.level) && v.level >= 0 && v.level <= 2) && HANDS.some(([hand]) => hand === v.hand) &&
    Number.isFinite(v.bpm) && v.bpm >= 30 && v.bpm <= 160 && (v.figures === undefined || RHYTHM_VALUES.includes(v.figures)));
}
