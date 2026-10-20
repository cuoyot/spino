import {beginSession, block, saveSession, adjustPracticeTime, localDate, pause} from './model.js';
import {findEvent, saveEventOccurrence, validEventDate} from './event-recurrence.js';
import {ui} from './locale.js';

export const lessonResult = (data, eventId) => data.sessions.find(s => s.lessonEventId === eventId);

// Paused score practices belong to the appointment until the lesson is completed.
export function beginLessonPractice(data, eventId, workId, now = Date.now()) {
  const event = findEvent(data.events, eventId);
  const work = data.works.find(w => w.id === workId);
  if (!event || event.type !== 'Clase' || !event.workIds.includes(workId) || !work || lessonResult(data, eventId)) throw Error('This lesson score is no longer available.');
  if (data.active?.lessonPracticeEventId === eventId) {
    if (data.active.blocks[0].workId === workId) {
      data.active.runningSince ??= now;
      return data.active;
    }
    pauseLessonPractice(data, now);
  }
  if (data.active) throw Error('Continue or finish your pending practice first.');
  const currentEvent = findEvent(data.events, eventId);
  const active = structuredClone(currentEvent.scorePractices?.find(s => s.blocks[0].workId === workId)) || beginSession({title:work.title, context:'piano', blocks:[block('repertoire', {workId, bpm:work.bpm || 60, passage:work.passage || ''})]}, now);
  active.lessonPracticeEventId = eventId;
  active.runningSince = now;
  data.active = active;
  return active;
}

export function pauseLessonPractice(data, now = Date.now()) {
  const active = data.active;
  if (!active?.lessonPracticeEventId) return;
  const event = findEvent(data.events, active.lessonPracticeEventId);
  if (!event) throw Error('This lesson is no longer available.');
  pause(active, now);
  const practices = (event.scorePractices || []).filter(s => s.id !== active.id);
  practices.push(structuredClone(active));
  data.events = saveEventOccurrence(data.events, {...event, scorePractices:practices});
  data.active = null;
  return event.id;
}

// The occurrence ID links a result to one appointment, including recurring lessons.
export function completeLesson(data, eventId, values, now = Date.now()) {
  const event = findEvent(data.events, eventId);
  if (!event || event.type !== 'Clase') throw Error(ui('This lesson is no longer available.', 'Esta clase ya no está disponible.'));
  const existing = lessonResult(data, eventId);
  const minutes = Number(values.minutes);
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 720 || !validEventDate(values.date) || values.date > localDate(new Date(now))) throw Error(ui('Enter a valid date and a duration between 1 and 720 minutes.', 'Indica una fecha válida y una duración entre 1 y 720 minutos.'));
  if (values.mood != null && (!Number.isInteger(values.mood) || values.mood < 1 || values.mood > 5)) throw Error(ui('Choose a rating between 1 and 5.', 'Elige una valoración entre 1 y 5.'));
  const workIds = [...new Set(values.workIds || [])];
  if (workIds.some(id => !data.works.some(w => w.id === id))) throw Error(ui('A selected piece is no longer available.', 'Una de las obras seleccionadas ya no está disponible.'));
  if (data.active?.lessonPracticeEventId === eventId) pauseLessonPractice(data, now);
  const practices = findEvent(data.events, eventId).scorePractices || [];
  const measuredMs = practices.reduce((sum, s) => sum + s.elapsedMs, 0);
  const elapsedMs = Math.max(Math.round(minutes * 60000), measuredMs);
  const feedback = {title:String(values.title || event.title).trim() || event.title, date:values.date, mood:values.mood ?? null, workIds, notes:values.notes || '', next:values.next || ''};
  if (existing) {
    const updated = Object.assign(structuredClone(existing), feedback);
    adjustPracticeTime(updated, elapsedMs);
    data.sessions[data.sessions.indexOf(existing)] = updated;
    return updated;
  }
  // A lesson's total does not establish how much time each selected score took.
  const active = beginSession({title:feedback.title, context:'piano', blocks:[block('free', {minutes:Math.min(600,minutes), target:null})]}, now);
  active.date = feedback.date;
  active.elapsedMs = active.blockElapsedMs = elapsedMs;
  const saved = saveSession(data, active, feedback, now);
  if (practices.length) {
    saved.results = practices.filter(s => s.elapsedMs > 0).map(s => ({block:structuredClone(s.blocks[0]), context:s.context, elapsedMs:s.elapsedMs, measurement:s.currentMeasurement || null, material:null}));
    if (elapsedMs > measuredMs) saved.results.push({block:block('free'), context:'piano', elapsedMs:elapsedMs-measuredMs, measurement:null, material:null});
    saved.blocks = saved.results.map(r => structuredClone(r.block));
    saved.blockIndex = saved.blocks.length;
    saved.blockElapsedMs = 0;
    saved.workIds = [...new Set([...workIds, ...saved.results.map(r => r.block.workId).filter(Boolean)])];
    data.events = saveEventOccurrence(data.events, {...findEvent(data.events,eventId), scorePractices:[]});
  }
  saved.manual = !practices.length;
  saved.lessonEventId = eventId;
  return saved;
}

export function linkLessonRecordings(data, eventId, recordingIds) {
  const event = findEvent(data.events, eventId);
  if (!event || event.type !== 'Clase') throw Error(ui('This lesson is no longer available.', 'Esta clase ya no está disponible.'));
  data.events = saveEventOccurrence(data.events, {...event, recordingIds:[...new Set(recordingIds)]});
}
