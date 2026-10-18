import {beginSession, block, saveSession, adjustPracticeTime, localDate} from './model.js';
import {findEvent, saveEventOccurrence, validEventDate} from './event-recurrence.js';
import {ui} from './locale.js';

export const lessonResult = (data, eventId) => data.sessions.find(s => s.lessonEventId === eventId);

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
  const elapsedMs = Math.round(minutes * 60000);
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
  saved.manual = true;
  saved.lessonEventId = eventId;
  return saved;
}

export function linkLessonRecordings(data, eventId, recordingIds) {
  const event = findEvent(data.events, eventId);
  if (!event || event.type !== 'Clase') throw Error(ui('This lesson is no longer available.', 'Esta clase ya no está disponible.'));
  data.events = saveEventOccurrence(data.events, {...event, recordingIds:[...new Set(recordingIds)]});
}
