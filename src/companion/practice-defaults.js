import { ui } from './locale.js';
const choice = (id, en, es) => Object.defineProperty([id], 1, { enumerable: true, get: () => ui(en, es) });
export const RANGE_LEVELS = [choice(0, 'Focused range', 'Registro reducido'), choice(1, 'Standard range', 'Registro estándar'), choice(2, 'Wide range', 'Registro amplio')];
export const HANDS = [choice('right', 'Right hand · treble', 'Mano derecha · clave de sol'), choice('left', 'Left hand · bass', 'Mano izquierda · clave de fa'), choice('both', 'Both hands together', 'Las dos manos juntas')];
export function practiceDefaults(preferences, type) {
  return { level: 0, hand: 'right', bpm: 60, figures: 'q', ...preferences.practiceDefaults?.[type] };
}
export function validPracticeDefaults(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([type, v]) => ['reading', 'technique'].includes(type) && v &&
    Number.isInteger(v.level) && v.level >= 0 && v.level <= 2 && HANDS.some(([hand]) => hand === v.hand) &&
    Number.isFinite(v.bpm) && v.bpm >= 30 && v.bpm <= 160 && ['q', 'hq', 'hqe'].includes(v.figures));
}
