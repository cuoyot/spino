import { reminderEvents } from './event-recurrence.js';
const MAX_PENDING = 64;
const owned = notification => notification.extra?.spinoReminder === true;

export function reminderNotifications(data, language, now = Date.now()) {
  const records = [
    ...data.plans.filter(plan => plan.status === 'planned').map(record => ({ record, type: 'plan' })),
    ...reminderEvents(data.events, now).map(record => ({ record, type: 'event' })),
  ].filter(({ record }) => record.reminder && record.time)
    .sort((a, b) => `${a.type}:${a.record.id}`.localeCompare(`${b.type}:${b.record.id}`));
  const used = new Set();
  return records.map(({ record, type }) => {
    let hash = 2166136261;
    for (const character of `${type}:${record.id}`) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    let id = (hash >>> 0) % 2147483646 + 1;
    while (used.has(id)) id = id % 2147483646 + 1;
    used.add(id);
    return { id, title: record.title,
      body: language === 'es' ? 'Empieza en 15 minutos.' : language === 'ca' ? 'Comença d’aquí a 15 minuts.' : 'Starts in 15 minutes.',
      schedule: { at: new Date(new Date(`${record.date}T${record.time}:00`).getTime() - 15 * 60000) },
      extra: { spinoReminder: true, recordId: record.id, recordType: type } };
  }).filter(notification => Number.isFinite(notification.schedule.at.getTime()) && notification.schedule.at.getTime() > now)
    .sort((a, b) => a.schedule.at - b.schedule.at || a.id - b.id);
}

export function createReminderScheduler(api) {
  let pending = Promise.resolve();
  return (data, requestPermission, language) => {
    const snapshot = structuredClone(data);
    const sync = async () => {
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
