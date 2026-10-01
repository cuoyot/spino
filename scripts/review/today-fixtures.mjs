import { emptyData, block, beginSession, saveSession, addDays, validateData } from '../../src/companion/model.js';

export const REVIEW_DATE = '2026-10-01';
export const REVIEW_NOW = '2026-10-01T10:00:00.000Z';
const now = Date.parse(REVIEW_NOW);
const exercise = (id, type, values = {}) => block(type, { id, minutes: 10, ...values });
const work = { id: 'review-work', title: 'Minuet in G · BWV Anh. 114', composer: 'Christian Petzold', stage: 'En estudio', notes: '', passage: 'Compases 1–8', target: 'G-major', bpm: 60 };

export function todayFixtures() {
  const empty = emptyData();
  empty.preferences.language = 'es';
  const typical = structuredClone(empty);
  typical.preferences = { ...typical.preferences, name: 'Alex', context: 'piano', weeklyMinutes: 200 };
  typical.works.push(work);
  const routine = { id: 'review-routine', title: 'Mi rutina de 40 minutos', context: 'piano', blocks: [
    exercise('routine-technique', 'technique', { target: 'G-major', hand: 'both' }),
    exercise('routine-reading', 'reading', { target: 'G-major', hand: 'both' }),
    exercise('routine-repertoire', 'repertoire', { minutes: 20, target: work.target, workId: work.id, passage: work.passage }),
  ] };
  typical.routines.push(routine, { id: 'review-routine-mobile', title: 'Lectura sin piano', context: 'mobile', blocks: [exercise('routine-mobile', 'reading', { minutes: 20, timing: 'wait' })] });
  typical.plans.push({ ...structuredClone(routine), id: 'review-next', title: 'Lectura y repertorio', date: REVIEW_DATE, time: '18:00', status: 'planned', reminder: false },
    { id: 'review-completed', title: 'Técnica en Sol mayor', context: 'piano', blocks: [exercise('done-technique', 'technique', { minutes: 20, target: 'G-major', hand: 'both' })], date: REVIEW_DATE, time: '08:30', status: 'planned', reminder: false },
    { ...structuredClone(routine), id: 'review-tomorrow', date: addDays(REVIEW_DATE, 1), time: '18:00', status: 'planned', reminder: false });
  for (const [id, date, minutes, planId] of [['review-mon', '2026-09-28', 40, null], ['review-wed', '2026-09-30', 35, null], ['review-today-result', REVIEW_DATE, 20, 'review-completed']]) {
    const source = planId ? typical.plans.find(p => p.id === planId) : routine;
    const active = beginSession({ ...source, planId }, now);
    active.id = id; active.date = date; active.elapsedMs = active.blockElapsedMs = minutes * 60000;
    // Historical fixture totals are illustrative; no measurements or downloaded scores are invented.
    active.blocks = [exercise(`${id}-technique`, 'technique', { minutes, target: 'G-major', hand: 'both' })];
    saveSession(typical, active, { mood: 4, notes: planId ? 'Pulso más estable. Repasar el cambio de posición.' : '', title: planId ? 'Técnica en Sol mayor' : 'Práctica de piano' }, now);
  }
  const event = (id, title, type, offset, time) => ({ id, title, type, date: addDays(REVIEW_DATE, offset), time, place: '', notes: '', workIds: [work.id], reminder: false, milestones: [] });
  typical.events.push(event('review-tutor-today', 'Clase con mi profesora', 'Clase', 0, '19:00'), event('review-audition', 'Audición de otoño', 'Audición', 9, '17:00'), event('review-tutor-next', 'Clase de piano', 'Clase', 5, '19:00'));
  const pending = structuredClone(typical);
  pending.active = beginSession({ ...pending.plans[0], planId: 'review-next' }, now);
  pending.active.id = 'review-active'; pending.active.date = REVIEW_DATE;
  pending.active.elapsedMs = pending.active.blockElapsedMs = 8 * 60000;
  return Object.fromEntries(Object.entries({ typical, empty, pending }).map(([id, data]) => [id, validateData(data)]));
}
