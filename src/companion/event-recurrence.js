export const EVENT_FREQUENCIES = ['daily', 'weekly', 'fortnightly', 'monthly', 'yearly'];
const dayMs = 86400000;
const timestamp = date => Date.parse(`${date}T12:00:00Z`);
const iso = value => new Date(value).toISOString().slice(0, 10);
export const validEventDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(timestamp(value)) && iso(timestamp(value)) === value;

export function eventDateAt(start, frequency, index) {
  if (['daily', 'weekly', 'fortnightly'].includes(frequency)) return iso(timestamp(start) + index * ({daily:1,weekly:7,fortnightly:14}[frequency]) * dayMs);
  const [year, month, day] = start.split('-').map(Number);
  const target = new Date(timestamp(`${start.slice(0,7)}-01`));
  target.setUTCFullYear(year + (frequency === 'yearly' ? index : 0));
  target.setUTCMonth(month - 1 + (frequency === 'monthly' ? index : 0));
  const end = new Date(target); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0);
  target.setUTCDate(Math.min(day, end.getUTCDate()));
  return iso(target);
}

// Rule records remain finite even without an end date. Occurrence IDs are
// deterministic across devices; exceptions keep their own stable record IDs.
export function eventsBetween(events, from, to) {
  const result = [];
  for (const event of events) {
    const r = event.recurrence;
    if (!r?.rule) { if (event.date >= from && event.date <= to) result.push(event); continue; }
    const end = r.until && r.until < to ? r.until : to;
    if (end < event.date || end < from) continue;
    const step = {daily:1,weekly:7,fortnightly:14}[r.frequency];
    const delta = step ? (timestamp(from) - timestamp(event.date)) / (dayMs * step)
      : r.frequency === 'monthly' ? (Number(from.slice(0,4)) - Number(event.date.slice(0,4))) * 12 + Number(from.slice(5,7)) - Number(event.date.slice(5,7))
        : Number(from.slice(0,4)) - Number(event.date.slice(0,4));
    const excluded = new Set(r.excluded || []);
    for (let i = Math.max(0, Math.floor(delta)); ; i++) {
      const date = eventDateAt(event.date, r.frequency, i);
      if (date > end || date.length !== 10) break;
      if (date < from || excluded.has(date)) continue;
      result.push({...structuredClone(event), id:`${event.id}@${date}`, date, occurrenceDate:date});
    }
  }
  return result.sort((a,b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '') || a.id.localeCompare(b.id));
}

export function findEvent(events, id) {
  const stored = events.find(e => e.id === id);
  if (stored) return stored;
  const split = id.lastIndexOf('@'), date = id.slice(split + 1);
  if (split < 0 || !validEventDate(date)) return undefined;
  return eventsBetween(events.filter(e => e.id === id.slice(0,split)), date, date).find(e => e.id === id);
}

export function removeEventOccurrence(events, id) {
  const event = findEvent(events,id);
  if (!event?.occurrenceDate) return events.filter(e => e.id !== id);
  return events.map(e => e.id === event.recurrence.id ? {...e, recurrence:{...e.recurrence, excluded:[...new Set([...(e.recurrence.excluded || []),event.occurrenceDate])]}} : e);
}

export function saveEventOccurrence(events, value) {
  if (!value.occurrenceDate) return events.some(e => e.id === value.id) ? events.map(e => e.id === value.id ? value : e) : [...events,value];
  const updated = removeEventOccurrence(events,value.id);
  const exception = {...value, recurrence:{id:value.recurrence.id, frequency:value.recurrence.frequency, until:value.recurrence.until || null}};
  delete exception.occurrenceDate;
  return [...updated,exception];
}

export function cancelEventSeries(events, id, cutoff) {
  return events.flatMap(e => {
    if (e.recurrence?.id !== id) return [e];
    if (!e.recurrence.rule) return e.date < cutoff ? [e] : [];
    if (e.date >= cutoff) return [];
    const until = iso(timestamp(cutoff) - dayMs);
    return [{...e,recurrence:{...e.recurrence,until:e.recurrence.until && e.recurrence.until < until ? e.recurrence.until : until}}];
  });
}

export function reminderEvents(events, now = Date.now()) {
  const date = new Date(now), from = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  // Refreshed whenever reminders are synchronized; never enumerate an infinite series.
  return [...events.filter(e => !e.recurrence?.rule), ...eventsBetween(events.filter(e => e.recurrence?.rule),from,iso(timestamp(from)+366*dayMs))];
}

export function upcomingEvents(events, from) {
  return events.flatMap(e => {
    if (!e.recurrence?.rule) return e.date > from ? [e] : [];
    const start = e.date > from ? e.date : iso(timestamp(from)+dayMs);
    // Skip explicit exceptions without imposing a cutoff on a future series.
    const count = (e.recurrence.excluded?.length || 0) + 2;
    const last = eventDateAt(start,e.recurrence.frequency,count);
    const end = last.length === 10 ? last : '9999-12-31';
    return eventsBetween([e],start,end).slice(0,2);
  })
    .sort((a,b)=>a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')).slice(0,2);
}
