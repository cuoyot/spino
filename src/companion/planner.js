import { ui, getAppLanguage } from './locale.js';
import { DEFAULT_PRACTICE_MINUTES } from './practice-duration.js';
import { CONTEXTS, ACTIVITIES, uid, copy, block, localDate, addDays, weekOf } from './model.js';
import { escapeHTML as esc } from './views.js';
import { weekLabel } from './agenda.js';

const weekdays = () => ui(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']);
const options = entries => entries.map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join('');

// Build one week without altering existing appointments or practice history.
export function proposeWeek(data, settings, today = localDate()) {
  const { week, days, minutes, context, routineId, tutor, tutorDay, tutorTime } = settings;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || localDate(week) !== week) throw Error(ui("Choose a valid week.", "Elige una semana válida."));
  if (!Array.isArray(days) || days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw Error(ui("Choose practice days.", "Elige los días de práctica."));
  if (!Object.hasOwn(CONTEXTS, context) || !Number.isInteger(minutes) || minutes < 5 || minutes > 90) throw Error(ui("Check the context and duration.", "Revisa el contexto y la duración."));
  const routine = routineId ? data.routines.find(r => r.id === routineId) : null;
  if (routineId && !routine) throw Error(ui("This routine is no longer available. Choose another practice.", "La rutina ya no está disponible. Elige otra práctica."));
  const start = weekOf(week), plans = [], events = [], skipped = [];
  const type = context === 'mobile' ? 'reading' : 'free';
  for (const day of [...new Set(days)].sort((a,b) => a-b)) {
    const date = addDays(start, day);
    if (date < today) { skipped.push({ date, reason: ui("Past date", "Día pasado") }); continue; }
    if (data.plans.some(p => p.date === date) || data.sessions.some(s => s.date === date)) {
      skipped.push({ date, reason: ui("Practice already planned", "Ya tienes práctica") }); continue;
    }
    plans.push({ id: uid(), title: routine?.title || ACTIVITIES[type], context: routine?.context || context,
      blocks: routine ? copy(routine.blocks) : [block(type, { minutes })], date, time: '', status: 'planned', reminder: false });
  }
  if (tutor) {
    if (!Number.isInteger(tutorDay) || tutorDay < 0 || tutorDay > 6 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(tutorTime)) throw Error(ui("Choose the lesson day and time.", "Indica el día y la hora de la clase."));
    const date = addDays(start, tutorDay);
    if (date < today) skipped.push({ date, reason: ui("Lesson on a past date", "Clase en un día pasado") });
    else if (data.events.some(e => e.date === date && e.type === 'Clase')) skipped.push({ date, reason: ui("Lesson already planned", "Ya tienes una clase") });
    else events.push({ id: uid(), title: ui("Lesson with a tutor", "Clase con tutor"), type: 'Clase', date, time: tutorTime, place: '', notes: '', workIds: [], milestones: [], reminder: false });
  }
  return { start, plans, events, skipped, minutes: plans.reduce((sum,p) => sum+p.blocks.reduce((n,b) => n+b.minutes,0),0) };
}

export function proposeSchedule(data, settings, today = localDate()) {
  const weeks = settings.weeks ?? 1;
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) throw Error(ui("Choose between 1 and 52 weeks.", "Elige entre 1 y 52 semanas."));
  const first = proposeWeek(data, settings, today);
  const result = { ...first, weeks, until: addDays(first.start, weeks * 7 - 1) };
  for (let i = 1; i < weeks; i++) {
    const next = proposeWeek(data, { ...settings, week: addDays(first.start, i * 7) }, today);
    result.plans.push(...next.plans); result.events.push(...next.events); result.skipped.push(...next.skipped); result.minutes += next.minutes;
  }
  if (weeks > 1) {
    // Practice and tutor series can be stopped independently.
    for (const items of [result.plans, result.events]) {
      const id = uid();
      for (const item of items) item.recurrence = { id, frequency: 'weekly', until: result.until };
    }
  }
  if (data.plans.length + result.plans.length > 20000 || data.events.length + result.events.length > 20000) throw Error(ui("The notebook appointment limit would be exceeded. Choose fewer weeks.", "Se superaría el límite de citas del cuaderno. Elige menos semanas."));
  return result;
}

export function cancelSeries(data, recurrenceId, from, today = localDate()) {
  const next = copy(data), cutoff = from > today ? from : today;
  const recorded = new Set(data.sessions.map(s => s.planId));
  next.plans = next.plans.filter(p => p.recurrence?.id !== recurrenceId || p.date < cutoff || p.status !== 'planned' || p.sessionId || recorded.has(p.id) || data.active?.planId === p.id);
  next.events = next.events.filter(e => e.recurrence?.id !== recurrenceId || e.date < cutoff);
  return next;
}

export function plannerMarkup(data, selected) {
  return `<section class="cp-planner"><h1>${ui("Plan your week", "Organiza tu semana")}</h1><p class="muted">${ui("Choose practice days and a tutor class, for one week or a weekly series.", "Elige días de práctica y una clase, para una semana o una serie semanal.")}</p>
    <form id="weekly-plan-form">
      <label>${ui("Week of", "Semana del")}<input name="week" type="date" value="${weekOf(selected)}" required /></label>
      <label>${ui("Repeat", "Repetir")}<select name="weeks">${[1,4,8,12,26,52].map(n => `<option value="${n}">${n === 1 ? ui("This week only", "Solo esta semana") : ui(`Every week for ${n} weeks`, `Cada semana durante ${n} semanas`)}</option>`).join('')}</select></label>
      <fieldset class="cp-planner-days"><legend>${ui("Practice days", "Días de práctica")}</legend><div>${weekdays().map((day,i) => `<label><input type="checkbox" name="days" value="${i}" ${[0,2,4].includes(i)?'checked':''} /><span><abbr title="${day}">${ui(['M','T','W','T','F','S','S'], ['L','M','X','J','V','S','D'])[i]}</abbr></span><span class="sr-only">${day}</span></label>`).join('')}</div></fieldset>
      ${data.routines.length ? `<label>${ui("Practice", "Práctica")}<select name="routineId"><option value="">${ui("Simple practice", "Práctica sencilla")}</option>${options(data.routines.map(r => [r.id,r.title]))}</select></label>` : ''}
      <div class="cp-planner-custom cp-fields"><label>${ui("Where?", "¿Dónde?")}<select name="context">${Object.entries(CONTEXTS).map(([id,label])=>`<option value="${id}" ${id===data.preferences.context?'selected':''}>${label}</option>`).join('')}</select></label><label class="cp-tempo"><span><output for="weekly-minutes">${DEFAULT_PRACTICE_MINUTES}</output> ${ui('min per day', 'min por día')}</span><input type="range" name="minutes" id="weekly-minutes" min="5" max="90" step="5" value="${DEFAULT_PRACTICE_MINUTES}" /></label></div>
      <p class="cp-planner-material muted"></p>
      <label class="check"><input type="checkbox" name="tutor" />${ui(" I have a tutor lesson", " Tengo clase con tutor")}</label>
      <div class="cp-fields cp-planner-tutor" hidden><label>${ui("Lesson day", "Día de la clase")}<select name="tutorDay">${options(weekdays().map((day,i)=>[String(i),day]))}</select></label><label>${ui("Time", "Hora")}<input type="time" name="tutorTime" value="18:00" /></label></div>
      <div class="cp-planner-preview" aria-live="polite"></div><p id="weekly-plan-error" role="alert"></p>
      <div class="cp-start-row"><button type="submit" class="primary">${ui("Save week", "Guardar semana")}</button><button type="button" data-action="calendar" class="quiet">${ui("Cancel", "Cancelar")}</button></div>
    </form></section>`;
}

export function bindPlanner(form, getData, save) {
  const error = form.querySelector('[role=alert]'), submit = form.querySelector('[type=submit]');
  const read = () => {
    const f = new FormData(form);
    return { week: String(f.get('week')), weeks: Number(f.get('weeks')), days: f.getAll('days').map(Number), minutes: Number(f.get('minutes')), context: f.get('context'), routineId: f.get('routineId') || '', tutor: f.has('tutor'), tutorDay: Number(f.get('tutorDay')), tutorTime: f.get('tutorTime') };
  };
  const dateLabel = date => new Intl.DateTimeFormat(getAppLanguage(), { weekday: 'short', day: 'numeric' }).format(new Date(date+'T12:00:00'));
  let saving = false;
  function preview() {
    if (saving) return;
    const settings = read(), routine = getData().routines.find(r=>r.id===settings.routineId);
    form.querySelector('.cp-planner-custom').hidden = !!routine;
    form.querySelector('.cp-planner-tutor').hidden = !settings.tutor;
    form.querySelector('[name=tutorTime]').required = settings.tutor;
    form.querySelector('output').value = settings.minutes;
    form.querySelector('.cp-planner-material').textContent = routine
      ? `${routine.blocks.reduce((n,b)=>n+b.minutes,0)} ${ui('min per day', 'min por día')} · ${CONTEXTS[routine.context]}. ${ui('Keeps the routine blocks.', 'Se conservan los bloques de la rutina.')}`
      : settings.context === 'mobile' ? ui("C major reading with on-screen answers.", "Lectura en Do mayor con respuesta en pantalla.") : ui("Free practice with a timer and manual tracking.", "Práctica libre con temporizador y seguimiento manual.");
    const panel = form.querySelector('.cp-planner-preview');
    try {
      const proposal = proposeSchedule(getData(), settings);
      error.textContent = '';
      panel.innerHTML = `<b>${weekLabel(proposal.start)}</b><p>${proposal.plans.length} ${ui('practices', 'prácticas')} · ${proposal.minutes} min${proposal.events.length?ui(" + tutor lesson", " + clase con tutor"):''}</p><div class="cp-planner-dates">${proposal.plans.map(p=>`<span>${esc(dateLabel(p.date))}</span>`).join('')}${proposal.events.map(e=>`<span>${ui('Lesson', 'Clase')}: ${esc(dateLabel(e.date))} · ${e.time}</span>`).join('')}</div>${proposal.skipped.length?`<p class="muted cp-planner-skipped">${proposal.skipped.map(s=>`${esc(dateLabel(s.date))}: ${esc(s.reason)}`).join(' · ')}</p>`:''}`;
      submit.disabled = !proposal.plans.length && !proposal.events.length;
      submit.textContent = settings.weeks > 1 ? ui("Save weekly series", "Guardar serie semanal") : ui("Save week", "Guardar semana");
      if (settings.weeks > 1) panel.innerHTML = `<b>${ui('Weekly through', 'Semanalmente hasta')} ${esc(dateLabel(proposal.until))}</b><p>${proposal.plans.length} ${ui('practices', 'prácticas')} · ${proposal.events.length} ${ui('tutor lessons', 'clases con tutor')} · ${proposal.minutes} min</p><p class="muted">${proposal.skipped.length} ${ui('past or occupied dates skipped. Edit each appointment separately or cancel future occurrences together.', 'fechas pasadas u ocupadas omitidas. Edita cada cita por separado o cancela las futuras juntas.')}</p>`;
    } catch (e) { error.textContent = e.message; panel.textContent = ''; submit.disabled = true; }
  }
  form.addEventListener('input', preview);
  form.addEventListener('change', e => {
    if (e.target.name === 'week' && /^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) e.target.value = weekOf(e.target.value);
    preview();
  });
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (saving) return;
    saving = true; submit.disabled = true;
    try {
      const proposal = proposeSchedule(getData(), read());
      if (!proposal.plans.length && !proposal.events.length) throw Error(ui("Choose at least one available day or a lesson.", "Elige al menos un día disponible o una clase."));
      await save(proposal);
    } catch (e) { error.textContent = e.message; }
    finally { saving = false; submit.disabled = false; }
  });
  preview();
}
