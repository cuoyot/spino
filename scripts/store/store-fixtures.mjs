// Synthetic notebooks for store screenshots: realistic history, plans and repertoire, nothing personal.
import { emptyData, block, beginSession, saveSession, addDays, validateData } from '../../src/companion/model.js';

export const STORE_DATE = '2026-10-01';
export const STORE_NOW = '2026-10-01T10:00:00.000Z';
const now = Date.parse(STORE_NOW);
const exercise = (id, type, values = {}) => block(type, { id, minutes: 10, ...values });

const COPY = {
  en: { name: 'Alex', work: 'Minuet in G · BWV Anh. 114', passage: 'Bars 1–8', routine: 'My 40-minute routine', mobile: 'Reading without a piano', next: 'Reading and repertoire', technique: 'Technique in G major', practice: 'Piano practice', note: 'Steadier pulse. Review the position change.', lesson: 'Lesson with my teacher', audition: 'Autumn recital', lesson2: 'Piano lesson' },
  es: { name: 'Alex', work: 'Minueto en Sol · BWV Anh. 114', passage: 'Compases 1–8', routine: 'Mi rutina de 40 minutos', mobile: 'Lectura sin piano', next: 'Lectura y repertorio', technique: 'Técnica en Sol mayor', practice: 'Práctica de piano', note: 'Pulso más estable. Repasar el cambio de posición.', lesson: 'Clase con mi profesora', audition: 'Audición de otoño', lesson2: 'Clase de piano' },
};

export function storeNotebook(lang = 'es') {
  const t = COPY[lang] || COPY.en, data = emptyData();
  data.preferences = { ...data.preferences, language: lang, name: t.name, context: 'piano', weeklyMinutes: 200, level: 2 };
  const work = { id: 'store-work', title: t.work, composer: 'Christian Petzold', stage: 'En estudio', notes: '', passage: t.passage, target: 'G-major', bpm: 60 };
  data.works.push(work);
  const routine = { id: 'store-routine', title: t.routine, context: 'piano', blocks: [
    exercise('store-technique', 'technique', { target: 'G-major', hand: 'both', figures: '2', level: 1 }),
    exercise('store-reading', 'reading', { target: 'G-major', hand: 'both', figures: '2', level: 1, presentation: 'page' }),
    exercise('store-repertoire', 'repertoire', { minutes: 20, target: work.target, workId: work.id, passage: work.passage }),
  ] };
  data.routines.push(routine, { id: 'store-routine-mobile', title: t.mobile, context: 'mobile', blocks: [exercise('store-mobile', 'reading', { minutes: 20 })] });
  data.plans.push({ ...structuredClone(routine), id: 'store-next', title: t.next, date: STORE_DATE, time: '18:00', status: 'planned', reminder: false },
    { ...structuredClone(routine), id: 'store-tomorrow', title: t.next, date: addDays(STORE_DATE, 1), time: '18:00', status: 'planned', reminder: false });
  for (const [id, date, minutes] of [['store-mon', '2026-09-28', 40], ['store-tue', '2026-09-29', 25], ['store-wed', '2026-09-30', 35]]) {
    const active = beginSession(routine, now);
    active.id = id; active.date = date; active.elapsedMs = active.blockElapsedMs = minutes * 60000;
    active.blocks = [exercise(`${id}-technique`, 'technique', { minutes, target: 'G-major', hand: 'both' })];
    saveSession(data, active, { mood: 4, notes: t.note, title: id === 'store-wed' ? t.technique : t.practice }, now);
  }
  const event = (id, title, type, offset, time) => ({ id, title, type, date: addDays(STORE_DATE, offset), time, place: '', notes: '', workIds: [work.id], reminder: false, milestones: [] });
  data.events.push(event('store-lesson', t.lesson, 'Clase', 0, '19:00'), event('store-audition', t.audition, 'Audición', 9, '17:00'), event('store-lesson-next', t.lesson2, 'Clase', 5, '19:00'));
  return validateData(data);
}
