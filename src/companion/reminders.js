import { localize } from './locale.js';
import { localDate, weekOf, addDays } from './model.js';
import { progressMetrics } from './progress-metrics.js';
import { reminderEvents } from './event-recurrence.js';
const MAX_PENDING = 64;
const owned = notification => notification.extra?.spinoReminder === true;

export function reminderNotifications(data, language, now = Date.now()) {
  if (data.preferences?.notificationsEnabled === false) return [];
  const records = [
    ...data.plans.filter(plan => plan.status === 'planned').map(record => ({ record, type: 'plan' })),
    ...reminderEvents(data.events, now).filter(e=>!data.sessions?.some(s=>s.lessonEventId===e.id)).map(record => ({ record, type: 'event' })),
  ].filter(({ record }) => record.reminder && record.time)
    .sort((a, b) => `${a.type}:${a.record.id}`.localeCompare(`${b.type}:${b.record.id}`));
  const used = new Set();
  const appointments = records.map(({ record, type }) => {
    let hash = 2166136261;
    for (const character of `${type}:${record.id}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    let id = (hash >>> 0) % 2147483646 + 1;
    while (used.has(id)) id = id % 2147483646 + 1;
    used.add(id);
    return { id, title: record.title,
      body: localize('Starts in 15 minutes.', 'Empieza en 15 minutos.', language),
      schedule: { at: new Date(new Date(`${record.date}T${record.time}:00`).getTime() - 15 * 60000) },
      extra: { spinoReminder: true, recordId: record.id, recordType: type } };
  }).filter(notification => Number.isFinite(notification.schedule.at.getTime()) && notification.schedule.at.getTime() > now)
    .sort((a, b) => a.schedule.at - b.schedule.at || a.id - b.id);
  return [...appointments, ...practiceSuggestions(data, language, now).filter(n => !appointments.some(a => localDate(a.schedule.at) === localDate(n.schedule.at)))].sort((a,b) => a.schedule.at - b.schedule.at);
}

export function practiceSuggestions(data, language, now = Date.now()) {
  if (data.preferences?.notificationsEnabled !== true || data.preferences?.practiceSuggestions !== true) return [];
  const today = localDate(new Date(now));
  const sessions = (data.sessions || []).filter(s => s.elapsedMs > 0 && s.date <= today);
  const last = sessions.map(s => s.date).sort().at(-1);
  const result = [];
  // A short horizon avoids indefinite prompts from a stale notebook snapshot.
  for (let offset = 0; offset < 7; offset++) {
    const date = addDays(today, offset), at = new Date(`${date}T18:00:00`);
    if (at.getTime() <= now || date === last || date === data.active?.date) continue;
    const week = weekOf(date), lateWeek = date >= addDays(week, 4);
    const minutes = sessions.filter(s => s.date >= week && s.date <= date).reduce((sum,s) => sum + s.elapsedMs / 60000, 0);
    const metrics = progressMetrics({...data, sessions}, date);
    let body, reason;
    if (lateWeek && minutes === 0 && metrics.practiceStreak > 0) {
      reason = 'streak';
      body = localize('A little practice before Sunday will keep your weekly streak going.', 'Un poco de práctica antes del domingo mantendrá tu racha semanal.', language);
    } else if (lateWeek && metrics.goal > 0 && minutes < metrics.goal) {
      reason = 'goal';
      body = localize('There is still time for your weekly goal. Shall we practise a little?', 'Aún hay tiempo para tu objetivo semanal. ¿Practicamos un poco?', language);
    } else if (date > addDays(last || today, 1)) {
      reason = 'return';
      body = localize('A few minutes at the piano can be a good start. Shall we practise?', 'Unos minutos al piano pueden ser un buen comienzo. ¿Practicamos?', language);
    }
    if (body) result.push({id: 2100000000 + Math.floor(Date.UTC(...date.split('-').map((v,i)=>Number(v)-(i===1?1:0))) / 86400000), title: localize('Your piano is waiting', 'Tu piano te espera', language), body, schedule: {at}, extra: {spinoReminder:true, recordType:'suggestion', recordId:date, reason}});
  }
  return result;
}

export function createReminderScheduler(api) {
  let pending = Promise.resolve();
  return (data, requestPermission, language) => {
    const snapshot = structuredClone(data);
    const sync = async () => {
      if (snapshot.preferences?.notificationsEnabled === false) {
        const existing = (await api.getPending()).notifications.filter(owned).map(({id})=>({id}));
        if (existing.length) await api.cancel({notifications:existing});
        return {enabled:false, scheduled:0};
      }
      const permission = await (requestPermission ? api.requestPermissions() : api.checkPermissions());
      if (permission.display !== 'granted') return { enabled: false, permission: permission.display };
      const existing = (await api.getPending()).notifications;
      const capacity = Math.max(0, MAX_PENDING - existing.filter(notification => !owned(notification)).length);
      const desired = reminderNotifications(snapshot, language);
      const notifications = desired.slice(0, capacity);
      // Do not overwrite unrelated local notifications, even if their IDs collide.
      const reserved = new Set(existing.filter(notification => !owned(notification)).map(notification => notification.id));
      for (const notification of notifications) {
        while (reserved.has(notification.id)) notification.id = notification.id % 2147483646 + 1;
        reserved.add(notification.id);
      }
      if (notifications.length) await api.schedule({ notifications });
      const keep = new Set(notifications.map(notification => notification.id));
      const obsolete = existing.filter(notification => owned(notification) && !keep.has(notification.id)).map(({ id }) => ({ id }));
      if (obsolete.length) await api.cancel({ notifications: obsolete });
      return { enabled: true, scheduled: notifications.length, deferred: desired.length - notifications.length };
    };
    const result = pending.then(sync);
    pending = result.catch(() => {});
    return result;
  };
}
