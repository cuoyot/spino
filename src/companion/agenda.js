import { ui, getAppLanguage } from './locale.js';
import { ACTIVITIES, CONTEXTS, eventTypeLabel, localDate, addDays, weekOf, summary, daysUntil } from './model.js';
import { targetById } from './curriculum.js';
import { escapeHTML as esc, FACES, MOODS } from './views.js';

const button = (action, label, id = '', css = '') => `<button type="button" data-action="${action}" data-id="${esc(id)}" class="${css}">${label}</button>`;
const minutes = ms => Math.round(ms / 60000);
const dateLabel = (date, options = { day: 'numeric', month: 'short' }) => new Intl.DateTimeFormat(getAppLanguage(), options).format(new Date(date + 'T12:00:00'));
export const weekLabel = start => `${dateLabel(start)} – ${dateLabel(addDays(start, 6))}`;

// A completed plan and its result occupy one card on their shared date. A moved
// plan never hides the session on the date when it was actually practised.
export function agendaEntries(data, date) {
  const plans = data.plans.filter(p => p.date === date);
  const entries = plans.map(plan => ({ kind: 'plan', id: plan.id, plan, session: data.sessions.find(s => s.id === plan.sessionId && s.date === date), time: plan.time || '' }));
  const linked = new Set(entries.map(e => e.session?.id).filter(Boolean));
  for (const session of data.sessions.filter(s => s.date === date && !linked.has(s.id))) entries.push({ kind: 'session', id: session.id, session, time: '' });
  for (const event of data.events.filter(e => e.date === date)) entries.push({ kind: 'event', id: event.id, event, time: event.time || '' });
  return entries.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || a.id.localeCompare(b.id));
}
export function todayPractice(data, today = localDate()) {
  const entries = agendaEntries(data, today)
    .filter(e => !e.plan || e.plan.id !== data.active?.planId)
    .sort((a, b) => Number(Boolean(a.session)) - Number(Boolean(b.session)));
  const next = entries.find(e => e.kind === 'plan' && e.plan.status === 'planned' && !e.session)?.plan;
  return { active: data.active, next, entries };
}
export function agendaCard(entry, { detailed = false, movable = false } = {}) {
  const s = entry.session, p = entry.plan, event = entry.event;
  const type = event ? 'event' : (p || s).blocks[0]?.type || 'free';
  const state = s ? s.status === 'partial' ? ui("Partial", "Parcial") : ui("Completed", "Realizada") : event ? eventTypeLabel(event.type) : p.status === 'partial' ? ui("Partial", "Parcial") : p.status === 'completed' ? ui("Completed", "Realizada") : ui("Planned", "Prevista");
  const title = event?.title || s?.title || p.title;
  const action = event ? 'event-detail' : s ? 'session-detail' : 'plan-detail';
  const id = event?.id || s?.id || p.id;
  const plannedMinutes = p?.blocks.reduce((n, b) => n + b.minutes, 0);
  const detail = event ? event.place || ui("Event", "Evento") : `${ACTIVITIES[type]} · ${CONTEXTS[(s || p).context]}`;
  const timing = s ? `${minutes(s.elapsedMs)} ${ui('min practised', 'min practicados')}${p ? ` · ${plannedMinutes} ${ui('min planned', 'min previstos')}` : ''}` : event ? ui("Preparation and repertoire", "Preparación y repertorio") : `${plannedMinutes} min · ${p.blocks.length} ${p.blocks.length === 1 ? ui("block", "bloque") : ui("blocks", "bloques")}`;
  return `<article class="cp-agenda-card" data-activity="${type}" data-entry-id="${esc(entry.id)}">
    <button type="button" class="cp-entry-open" data-action="${action}" data-id="${esc(id)}">
      <span class="cp-row cp-entry-state"><span>${entry.time ? esc(entry.time) + ' · ' : ''}${esc(state)}</span>${s ? `<span aria-hidden="true">${s.status === 'partial' ? '◐' : '✓'}</span>` : ''}</span>
      <strong>${esc(title)}</strong><span class="muted">${esc(detail)}</span><span>${esc(timing)}</span>
      ${s?.mood ? `<span class="cp-entry-mood">${FACES[s.mood - 1]} ${MOODS[s.mood - 1]}</span>` : ''}
      ${detailed && s?.notes ? `<span class="cp-entry-note">${esc(s.notes)}</span>` : ''}
    </button>
    ${!s && p?.status === 'planned' ? `<div class="cp-entry-actions">${button('start-plan', ui("Start", "Empezar"), p.id, 'primary')}${button('edit-plan', ui("Edit practice", "Editar práctica"), p.id, 'quiet')}${movable ? `<button type="button" class="cp-plan-grip" data-move-plan="${esc(p.id)}" aria-label="${ui("Move practice: drag to a day, or use left and right arrow keys", "Mover práctica: arrastra a un día o usa las flechas izquierda y derecha")}" title="${ui("Drag to another day", "Arrastrar a otro día")}">⠿</button>` : ''}</div>` : ''}
  </article>`;
}
export function weekAgendaMarkup(data, selected) {
  const start = weekOf(selected), current = weekOf(localDate());
  // Two adjacent weeks show continuity without an unbounded list or a large picker.
  return `<div class="cp-week-agenda">${[start, addDays(start, 7)].map(week => {
    const dates = Array.from({ length: 7 }, (_, i) => addDays(week, i));
    const stats = summary(data.sessions.filter(s => s.date >= week && s.date <= dates[6]));
    const planned = data.plans.filter(p => p.date >= week && p.date <= dates[6]).reduce((total, p) => total + p.blocks.reduce((n,b) => n+b.minutes, 0), 0);
    return `<section class="cp-agenda-week ${week === current ? 'current-week' : ''}" data-week-start="${week}">
      <div class="cp-agenda-week-title"><div class="cp-row"><h2>${weekLabel(week)}</h2>${week === current ? `<span class="cp-tag">${ui("This week", "Esta semana")}</span>` : ''}</div><p class="muted"><b>${stats.minutes} min</b> ${ui('practised', 'practicados')} · ${planned} ${ui('min planned', 'min previstos')}</p></div>
      ${dates.map(date => { const entries=agendaEntries(data,date);return `<div class="cp-agenda-day ${date === selected ? 'selected-day' : ''}" data-agenda-date="${date}">
        <time datetime="${date}" ${date === localDate() ? 'aria-current="date"' : ''}><span>${dateLabel(date,{weekday:'short'})}</span><b>${+date.slice(8)}</b></time>
        <div class="cp-day-content">${entries.map(e=>agendaCard(e,{movable:true})).join('')}${!entries.length ? `<span class="cp-unplanned">${ui("No practice planned", "Sin práctica prevista")}</span>` : ''}<button type="button" data-action="add-on-day" data-id="${date}" class="cp-add-day quiet" aria-label="${ui('Add to', 'Añadir al')} ${esc(dateLabel(date,{weekday:'long',day:'numeric',month:'long'}))}">${ui("+ Add", "+ Añadir")}</button></div>
      </div>`; }).join('')}</section>`;
  }).join('')}</div>`;
}
export function practiceMarkup(data, icon) {
  return `<section class="cp-practice-hub"><h1>${ui('Practice', 'Practicar')}</h1><p class="muted">${ui('What would you like to work on?', '¿Qué te apetece trabajar?')}</p>
    ${data.active ? practiceFocus(data.active, 'active') : ''}
    <div class="cp-shortcuts">${['reading','technique','repertoire','free'].map(type=>button('prepare',`<span class="cp-icon">${icon(type)}</span>${ACTIVITIES[type]}`,type)).join('')}</div>
    <section class="cp-section"><div class="cp-row"><h2>${ui('Your routines', 'Tus rutinas')}</h2>${button('routines',ui('Manage', 'Gestionar'),'','quiet')}</div>${data.routines.length ? `<div class="cp-practice-routines">${data.routines.map(r=>button('quick-routine',`<span><strong>${esc(r.title)}</strong><small>${r.blocks.reduce((n,b)=>n+b.minutes,0)} min · ${r.blocks.map(b=>ACTIVITIES[b.type]).join(' · ')}</small></span><span aria-hidden="true">▶</span>`,r.id)).join('')}</div>` : `<p class="muted">${ui('Save a sequence of exercises to use it again.', 'Guarda una secuencia de ejercicios para repetirla.')}</p>${button('new-routine',ui('Create routine', 'Crear rutina'))}`}</section>
  </section>`;
}

function practiceFocus(session, state) {
  const active = state === 'active';
  const duration = session?.blocks.reduce((n,b)=>n+b.minutes,0);
  return `<article class="cp-today-focus${active ? ' cp-today-resume' : ''}" data-focus-state="${state}">
    <div class="cp-focus-copy"><span class="eyebrow">${active ? ui('Unfinished session', 'Sesión pendiente') : session ? `${session.time ? esc(session.time)+' · ' : ''}${ui('Planned for today', 'Prevista para hoy')}` : ui('Your time at the piano', 'Tu momento al piano')}</span>
    <h2>${session ? esc(session.title) : ui('Make room for music', 'Haz sitio a la música')}</h2>
    <p class="muted">${session ? `${active ? `${minutes(session.elapsedMs)} ${ui('min elapsed', 'min transcurridos')}` : `${duration} min`} · ${CONTEXTS[session.context]}` : ui('Choose an activity or one of your routines.', 'Elige una actividad o una de tus rutinas.')}</p>
    ${session && !active ? `<p class="cp-focus-blocks">${session.blocks.map(b=>`${ACTIVITIES[b.type]} ${b.minutes}′`).join(' · ')}</p>` : ''}</div>
    <div class="cp-focus-actions">${button(active?'resume-session':session?'start-plan':'practice',active?ui('Resume session','Continuar sesión'):session?ui('Start practice','Empezar práctica'):ui('Choose practice','Elegir práctica'),session && !active ? session.id : '','primary')}${session && !active ? button('plan-detail',ui('View plan','Ver plan'),session.id,'quiet') : ''}</div>
  </article>`;
}

export function todayMarkup(data, icon, today = localDate()) {
  const start = weekOf(today), dates = Array.from({length:7},(_,i)=>addDays(start,i));
  const {active,next,entries} = todayPractice(data,today);
  const remaining = entries.filter(e=>active || !next || e.plan?.id !== next.id);
  const events = data.events.filter(e=>e.date>today).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,2);
  return `<div class="cp-today">
    <div class="cp-row cp-today-title"><div><h1>${ui("Today", "Hoy")}</h1><p class="muted">${data.preferences.name ? `${ui('Hello', 'Hola')}, ${esc(data.preferences.name)} · ` : ''}${dateLabel(today,{weekday:'long',day:'numeric',month:'long'})}</p></div></div>
    ${practiceFocus(active || next,active?'active':next?'planned':'empty')}
    <section class="cp-today-week" aria-label="${ui("Your week", "Tu semana")}"><div class="cp-row"><span>${weekLabel(start)}</span>${button('today-calendar',ui('View calendar', 'Ver calendario'),'','quiet')}</div>
      <div class="cp-today-days">${dates.map((date,i)=>{const day=agendaEntries(data,date);const types=[...new Set(day.map(e=>e.event?'event':(e.plan||e.session).blocks[0]?.type||'free'))];return `<button type="button" data-action="calendar-day" data-id="${date}" ${date===today?'aria-current="date"':''} aria-label="${esc(dateLabel(date,{weekday:'long',day:'numeric',month:'long'}))}, ${day.length} ${ui('activities', 'actividades')}"><small>${ui(['M','T','W','T','F','S','S'], ['L','M','X','J','V','S','D'])[i]}</small><b>${+date.slice(8)}</b><span class="cp-today-marks">${types.map(type=>`<i data-activity="${type}"></i>`).join('')}</span></button>`;}).join('')}</div>
    </section>
    ${remaining.length ? `<section class="cp-section"><h2>${ui('Also today', 'También hoy')}</h2><div class="cp-today-sessions">${remaining.map(e=>agendaCard(e,{detailed:true})).join('')}</div></section>` : ''}
    <div class="cp-section">
    <section class="cp-card"><div class="cp-row"><h2>${ui("Coming up", "Próximos compromisos")}</h2>${button('new-event',ui("+ Event", "+ Evento"),'','quiet')}</div>${events.length?events.map(e=>`<button type="button" data-action="event-detail" data-id="${esc(e.id)}" class="cp-upcoming-event"><span class="cp-countdown"><b>${daysUntil(e.date,today)}</b><small>${ui("days", "días")}</small></span><span><strong>${esc(e.title)}</strong><small>${esc(dateLabel(e.date))} · ${esc(eventTypeLabel(e.type))}</small></span></button>`).join(''):`<p class="muted">${ui("Add a lesson or audition to keep track of your preparation time.", "Añade una clase o audición y ten presente cuánto queda para prepararla.")}</p>`}</section></div>
  </div>`;
}
