import { eventsBetween } from './event-recurrence.js';
import { ui, getAppLanguage } from './locale.js';
import { practiceMinutes } from './practice-duration.js';
import { RANGE_LEVELS, HANDS } from './practice-defaults.js';
import { rhythmOptions, rhythmLevel } from './rhythm-levels.js';
import { HANON, warmupLabel } from './warmups.js';
import { preparationWarmup } from './preparation-warmup.js';
import { scalePreviewMarkup } from './scale-preview.js';
import { ACTIVITIES, CONTEXTS, stageLabel, localDate, addDays, weekOf, summary, repertoireParts } from './model.js';
import { isOnStand } from './repertoire.js';
import { TARGETS, targetById } from './curriculum.js';

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const esc = escapeHTML;
const button = (action, label, id = '', css = '') => `<button type="button" data-action="${action}" data-id="${esc(id)}" class="${css}">${label}</button>`;
const options = (entries, selected) => entries.map(([id, label]) => `<option value="${esc(id)}" ${id === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
const moodLabels = [['Very difficult', 'Muy difícil'], ['Difficult', 'Difícil'], ['Okay', 'Regular'], ['Good', 'Bien'], ['Very good', 'Muy bien']];
export const MOODS = moodLabels.map(() => '');
for (let index = 0; index < MOODS.length; index++) Object.defineProperty(MOODS, index, { get: () => ui(...moodLabels[index]) });
export const FACES = ['😞', '🙁', '😐', '🙂', '😄'];
export function feedbackFields(session, works) {
  const ids = session.workIds || [...new Set([...(session.results || []).map(r => r.block.workId), ...(session.blocks || []).map(b => b.workId)].filter(Boolean))];
  const parts = repertoireParts(session), title = id => works.find(w => w.id === id)?.title || ui('Piece', 'Obra');
  works = works.filter(w=>!w.trashedAt || ids.includes(w.id));
  return `<label>${ui("Session name", "Nombre de la sesión")}<input name="title" maxlength="200" value="${esc(session.title)}" required /></label>
    <fieldset class="cp-rating"><legend>${ui("How did it feel? ", "¿Cómo te has sentido? ")}<small>${ui("Optional", "Opcional")}</small></legend><div>${MOODS.map((label, i) => `<label><input type="radio" name="mood" value="${i + 1}" ${session.mood === i + 1 ? 'checked' : ''} /><span aria-hidden="true">${FACES[i]}</span><small>${label}</small></label>`).join('')}</div></fieldset>
    <label>${ui("Comments and notes", "Comentarios y anotaciones")}<textarea name="notes" maxlength="10000" placeholder="${ui("What went well, difficult passages…", "Qué ha salido bien, pasajes difíciles…")}">${esc(session.notes)}</textarea></label>
    ${parts.length ? `<fieldset class="cp-work-parts"><legend>${ui("Part of the piece you worked on", "Parte de la obra que has trabajado")}</legend>${parts.map((b, n) => `<label>${esc(title(b.workId))}<input name="part-${n}" maxlength="1000" value="${esc(b.passage)}" placeholder="${ui("E.g. bars 1–16, section B, coda", "Ej.: c. 1–16, sección B, coda")}" /></label>`).join('')}</fieldset>` : ''}
    <details class="cp-details"><summary>${ui("Pieces practised and next step", "Obras practicadas y próximo paso")}</summary>
      ${works.length ? works.map(w => `<label class="check"><input name="workIds" type="checkbox" value="${esc(w.id)}" ${ids.includes(w.id) ? 'checked' : ''} />${esc(w.title)}</label>`).join('') : `<p class="muted">${ui("List pieces in your notes or add them to your repertoire.", "Puedes anotar las piezas en los comentarios o añadirlas a tu repertorio.")}</p>`}
      <label>${ui("Next step", "Próximo paso")}<textarea name="next" maxlength="10000">${esc(session.next)}</textarea></label>
    </details>`;
}
export const readFeedback = form => ({ title: String(form.get('title')).trim(), mood: form.has('mood') ? Number(form.get('mood')) : null, notes: String(form.get('notes') || ''), next: String(form.get('next') || ''), workIds: form.getAll('workIds').map(String), parts: [...form.keys()].filter(key => /^part-\d+$/.test(key)).map(key => [Number(key.slice(5)), String(form.get(key))]).reduce((list, [n, value]) => { list[n] = value; return list; }, []) });

export function calendarDates(date, mode) {
  if (mode === 'week') return Array.from({ length: 7 }, (_, i) => addDays(weekOf(date), i));
  const first = date.slice(0, 8) + '01';
  const last = new Date(first + 'T12:00:00'); last.setMonth(last.getMonth() + 1); last.setDate(0);
  const start = weekOf(first), end = addDays(weekOf(localDate(last)), 6);
  const days = []; for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}
export function shiftCalendar(date, amount, mode) {
  if (mode === 'week') return addDays(date, amount * 7);
  const d = new Date(date + 'T12:00:00'), day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + amount);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last)); return localDate(d);
}
export function calendarMarkup(data, selected, mode) {
  const month = new Intl.DateTimeFormat(getAppLanguage(), { month: 'long', year: 'numeric' }).formatToParts(new Date(selected + 'T12:00:00')).filter(part => part.type === 'month' || part.type === 'year').map(part => part.value).join(' ');
  const heading = `<h1>${ui("Calendar", "Calendario")}</h1><div class="cp-row cp-agenda-toolbar"><div class="cp-segment cp-choice-group" role="group" aria-label="${ui('Calendar view','Vista del calendario')}">${['week', 'month'].map(m => `<button type="button" data-action="calendar-mode" data-id="${m}" aria-pressed="${mode === m}">${m === 'month' ? ui("Month", "Mes") : ui("Week", "Semana")}</button>`).join('')}</div>${button('weekly-planner',ui("Plan your week", "Organizar semana"),'','primary')}</div>`;
  if (mode === 'week') return heading;
  return `${heading}
    <section class="cp-calendar"><div class="cp-row cp-calendar-heading"><button type="button" data-action="calendar-prev" aria-label="${mode === 'month' ? ui('Previous month', 'Mes anterior') : ui('Previous week', 'Semana anterior')}">‹</button><h2>${esc(month)}</h2><button type="button" data-action="calendar-next" aria-label="${mode === 'month' ? ui('Next month', 'Mes siguiente') : ui('Next week', 'Semana siguiente')}">›</button></div>
    <div class="cp-calendar-grid">${ui(['M','T','W','T','F','S','S'], ['L','M','X','J','V','S','D']).map(d => `<span class="cp-weekday" aria-hidden="true">${d}</span>`).join('')}
    ${calendarDates(selected, mode).map(date => {
      const planned = data.plans.filter(p => p.date === date && p.status === 'planned').length;
      const done = data.sessions.filter(s => s.date === date).length;
      const events = eventsBetween(data.events,date,date).length;
      const label = ui(`${date}, ${planned} planned, ${done} completed, ${events} events`, `${date}, ${planned} previstas, ${done} realizadas, ${events} eventos`);
      return `<button type="button" data-action="select-day" data-id="${date}" class="cp-day ${date.slice(0,7) !== selected.slice(0,7) ? 'outside' : ''}" aria-pressed="${date === selected}" ${date === localDate() ? 'aria-current="date"' : ''} aria-label="${label}"><b>${+date.slice(8)}</b><span class="cp-day-marks">${planned ? `<i class="planned"></i>` : ''}${done ? `<i class="done"></i>` : ''}${events ? `<i class="event"></i>` : ''}</span></button>`;
    }).join('')}</div><div class="cp-row cp-calendar-footer"><div class="cp-legend"><span><i class="planned"></i>${ui(" Planned", " Prevista")}</span><span><i class="done"></i>${ui(" Completed", " Realizada")}</span><span><i class="event"></i>${ui(" Event", " Evento")}</span></div>${button('today', ui("Today", "Hoy"), '', 'quiet')}</div></section>
    <div class="cp-row cp-day-heading"><h2>${new Intl.DateTimeFormat(getAppLanguage(), { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(selected + 'T12:00:00'))}</h2><div class="cp-actions">${button('plan-practice', ui("+ Practice", "+ Práctica"), '', 'primary')}${button('calendar-add', '+', '', 'cp-square')}</div></div>`;
}

export function weeklyProgressMarkup(data) {
  const today = localDate(), start = weekOf(today);
  const stats = summary(data.sessions.filter(s => s.date >= start && s.date <= addDays(start, 6)));
  const goal = data.preferences.weeklyMinutes, percent = goal > 0 ? Math.min(100, Math.round(stats.minutes / goal * 100)) : 0;
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { date, minutes: summary(data.sessions.filter(s => s.date === date)).minutes };
  });
  const chartMax = Math.max(1, ...days.map(day => day.minutes));
  const dateLabel = date => new Intl.DateTimeFormat(getAppLanguage(), { day: 'numeric', month: 'short' }).format(new Date(date + 'T12:00:00'));
  return `<section class="cp-dashboard-week" aria-labelledby="dashboard-week-title"><div class="cp-dashboard-section-heading"><div><h2 id="dashboard-week-title">${ui("This week", "Esta semana")}</h2><small>${dateLabel(start)} – ${dateLabel(addDays(start, 6))}</small></div></div>
      <div class="cp-dashboard-week-body"><div><div class="cp-dashboard-totals"><div class="cp-dashboard-minutes"><strong>${stats.minutes}</strong><span>${ui("minutes", "minutos")}</span></div><div class="cp-dashboard-secondary-stats"><span><b>${stats.count}</b> ${stats.count === 1 ? ui("session", "sesión") : ui('sessions', 'sesiones')}</span><span><b>${stats.days}</b> ${stats.days === 1 ? ui('day', 'día') : ui("days", "días")} ${ui('of practice', 'de práctica')}</span></div></div>
        ${goal > 0 ? `<div class="cp-dashboard-goal"><span>${ui("Weekly goal ", "Objetivo semanal ")}<b>${goal} min</b></span><strong>${percent}%</strong></div><div class="cp-dashboard-meter" role="progressbar" aria-label="${ui("Weekly goal", "Objetivo semanal")}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-valuetext="${ui(`${stats.minutes} of ${goal} minutes`, `${stats.minutes} de ${goal} minutos`)}"><span style="width:${percent}%"></span></div>` : `<p class="muted cp-dashboard-no-goal">${ui("No weekly goal", "Sin objetivo semanal")}</p>`}</div>
        <div class="cp-dashboard-days" aria-label="${ui("Minutes practised each day", "Minutos practicados cada día")}">${days.map((day, i) => `<div class="cp-dashboard-day${day.date === today ? ' is-today' : ''}" aria-label="${day.date}: ${day.minutes} min" title="${day.date}: ${day.minutes} min"><span class="cp-dashboard-day-minutes">${day.minutes || `–`}</span><span class="cp-dashboard-bar-track"><i style="height:${day.minutes / chartMax * 100}%"></i></span><small>${ui(['M','T','W','T','F','S','S'], ['L','M','X','J','V','S','D'])[i]}</small></div>`).join('')}</div>
      </div>
    </section>`;
}

export function dashboardMarkup(data) {
  const repertoire = data.works.filter(w => !w.trashedAt), works = repertoire.filter(isOnStand);
  const glyph = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
    score: `<path d="M6 3h9l3 3v15H6zM14 3v5h4M9 11h6M9 14h6M9 17h4"/>`,
    play: `<path d="m9 6 9 6-9 6z" fill="currentColor" stroke="none"/>`,
    book: `<path d="M12 5v15M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z"/>`,
    arrow: `<path d="m9 5 7 7-7 7"/>`
  }[name]}</svg>`;
  return `<div class="cp-dashboard"><div class="cp-dashboard-heading"><h1>${ui("Library", "Biblioteca")}</h1><span>${ui("Scores, repertoire and routines", "Partituras, repertorio y rutinas")}</span></div>
    <div class="cp-dashboard-collections"><section class="cp-dashboard-collection" aria-labelledby="dashboard-repertoire-title"><div class="cp-dashboard-section-heading"><div><h2 id="dashboard-repertoire-title">${ui("On the music stand ", "En el atril ")}<span class="cp-dashboard-count">${works.length}</span></h2></div>${button('new-work', ui("+ Piece", "+ Obra"), '', 'quiet cp-dashboard-link')}</div>
      <div class="cp-dashboard-entries">${works.length ? works.slice(0, 4).map(w => `<button type="button" data-action="work-detail" data-id="${esc(w.id)}" class="cp-dashboard-work"><span class="cp-dashboard-score-icon">${glyph('score')}</span><span class="cp-dashboard-entry-copy"><b>${esc(w.title)}</b>${w.composer ? `<small>${esc(w.composer)}</small>` : ``}<span class="cp-dashboard-stage">${esc(stageLabel(w.stage))}</span></span><span class="cp-dashboard-chevron">${glyph('arrow')}</span></button>`).join('') : `<div class="cp-dashboard-empty"><span class="cp-dashboard-empty-icon">${glyph('score')}</span><b>${ui("Your next piece starts here", "Tu próxima obra empieza aquí")}</b><span>${ui("Add a piece or import its PDF.", "Añade una pieza o importa su PDF.")}</span></div>`}</div>
      ${button('repertoire', `${ui('View repertoire', 'Ver repertorio')} <span>${repertoire.length}</span>${glyph('arrow')}`, '', 'cp-dashboard-footer')}
    </section>
    <section class="cp-dashboard-collection" aria-labelledby="dashboard-routines-title"><div class="cp-dashboard-section-heading"><div><h2 id="dashboard-routines-title">${ui("Your routines ", "Tus rutinas ")}<span class="cp-dashboard-count">${data.routines.length}</span></h2></div>${button('new-routine', ui("+ Routine", "+ Rutina"), '', 'quiet cp-dashboard-link')}</div>
      <div class="cp-dashboard-entries">${data.routines.slice(0, 3).map(r => `<div class="cp-dashboard-routine"><div class="cp-dashboard-entry-copy"><b>${esc(r.title)}</b><small>${practiceMinutes(r.blocks)} min <span aria-hidden="true">·</span> ${r.blocks.length} ${r.blocks.length === 1 ? ui("block", "bloque") : ui('blocks', 'bloques')}</small></div><button type="button" data-action="quick-routine" data-id="${esc(r.id)}" class="cp-dashboard-play" aria-label="${ui('Start', 'Empezar')} ${esc(r.title)}">${glyph('play')}</button></div>`).join('') || `<div class="cp-dashboard-empty"><span class="cp-dashboard-empty-icon">${glyph('play')}</span><b>${ui("Your practice, ready to begin", "Tu práctica, lista para empezar")}</b><span>${ui("Save your exercises as a routine.", "Guarda tus ejercicios en una rutina.")}</span></div>`}</div>
      ${button('routines', `${ui('View routines', 'Ver rutinas')}${glyph('arrow')}`, '', 'cp-dashboard-footer')}
    </section></div>
    <button type="button" data-action="catalog" class="cp-dashboard-library"><span class="cp-dashboard-library-icon">${glyph('book')}</span><span><b>${ui("Catalogue", "Catálogo")}</b><small>${ui("Scales, modes and pieces", "Escalas, modos y piezas")}</small></span><span class="cp-dashboard-chevron">${glyph('arrow')}</span></button>
    </div>`;
}

export function practiceModeMarkup(draft) {
  const mobile = draft.blocks.every(b => ['reading','technique'].includes(b.type));
  return `<section class="cp-prepare cp-practice-mode"><h1>${ui('Choose practice mode','Elige el modo de práctica')}</h1><article class="cp-card"><h2>${ACTIVITIES[draft.blocks[0].type]}</h2><div class="cp-mode-choices"><button type="button" data-action="prepare-mode" data-id="mobile" data-default-mode="${draft.context==='mobile'&&mobile}" ${mobile?'':'disabled'}><strong>${ui('Mobile','Móvil')}</strong><span>${mobile?ui('On-screen keyboard or note names','Teclado en pantalla o nombres de notas'):ui('Available for reading and technique','Disponible para lectura y técnica')}</span></button><button type="button" data-action="prepare-mode" data-id="piano" data-default-mode="${draft.context!=='mobile'||!mobile}"><strong>${ui('With piano','Con piano')}</strong><span>${ui('Connect MIDI whenever you want','Conecta MIDI cuando quieras')}</span></button></div></article></section>`;
}

export function repertoirePickerMarkup(draft, data) {
  const selected = new Set(draft.blocks.map(b => b.workId).filter(Boolean));
  const works = data.works.filter(w => !w.trashedAt && (isOnStand(w) || selected.has(w.id)));
  return `<section class="cp-block cp-repertoire-picker" aria-labelledby="repertoire-picker-title"><div class="cp-practice-piece-heading"><h2 id="repertoire-picker-title">${ui('Choose pieces','Elige las piezas')}</h2>${button('prepare-browse-repertoire',ui('Search your repertoire','Buscar en tu repertorio'),'','quiet')}</div><p class="muted">${ui('Select one or more pieces. Practice time is shared automatically.','Selecciona una o varias piezas. El tiempo de práctica se reparte automáticamente.')}</p><p class="cp-repertoire-stand-label">${ui('On your stand','En tu atril')}</p><div class="cp-practice-stand" role="group" aria-label="${ui('Choose pieces','Elige las piezas')}" tabindex="0">${works.map(w=>`<button type="button" data-action="prepare-toggle-piece" data-id="${esc(w.id)}" aria-pressed="${selected.has(w.id)}" title="${esc(w.title+(w.composer?' · '+w.composer:''))}"><span class="cp-practice-piece-check" aria-hidden="true">✓</span><b>${esc(w.title)}</b><small>${esc(w.composer)}${!isOnStand(w)?' · '+ui('Repertoire','Repertorio'):''}</small></button>`).join('') || `<span class="muted">${ui('No pieces on your stand yet.','Todavía no hay obras en tu atril.')}</span>`}</div><p class="cp-practice-selected" aria-live="polite">${selected.size ? ui('Selected pieces','Piezas seleccionadas')+': '+selected.size : ui('Choose pieces from your stand or search your repertoire.','Elige piezas del atril o busca en tu repertorio.')}</p></section>`;
}

export function preparationMarkup(draft, purpose, data, {simpleRepertoire = false} = {}) {
  const d = draft;
  const hasTimingChoice = b => d.context === 'mobile' && ['reading', 'technique'].includes(b.type);
  const waitsForAnswers = b => hasTimingChoice(b) && b.timing === 'wait';
  const warm = preparationWarmup(d, data);
  const blockFields = (b,i) => `<label>${ui('Practice block', 'Bloque de práctica')}<select name="type-${i}">${options(Object.entries(ACTIVITIES).filter(([type])=>type!=='theory' && (type!=='warmup' || b.type==='warmup')), b.type)}${b.type==='theory'?`<option value="theory" selected disabled>${ui('Archived learning block', 'Bloque de aprendizaje archivado')}</option>`:''}</select></label><label>${ui('Duration (min)', 'Duración (min)')}<input type="number" name="minutes-${i}" min="1" max="600" value="${b.minutes}" required /></label>`;
  const warmup = !d.routinePolicy && d.context !== 'mobile' && !d.blocks.some(b=>b.type==='warmup'||b.warmupKind) ? `<section class="cp-block cp-preparation-warmup ${d.includeWarmup?'':'is-disabled'}"><label class="check"><input type="checkbox" name="include-warmup" ${practiceMinutes(d.blocks)<=d.blocks.length&&!d.includeWarmup?'disabled':''} ${d.includeWarmup?'checked':''} />${simpleRepertoire?ui('Warm-up','Calentamiento'):ui('Warm-up block','Bloque de calentamiento')}</label><fieldset ${d.includeWarmup?'':'disabled'}><div class="cp-fields"><label>${ui('Warm-up type','Tipo de calentamiento')}<select name="warmup-kind">${options([['free',ui('Free','Libre')],['hanon','Hanon'],['reading',ui('Sight-reading','Lectura')],['scales',ui('Scales','Escalas')]],warm.kind)}</select></label><label>${ui('Duration (min)','Duración (min)')}<input name="warmup-duration" type="number" min="1" max="${Math.max(1,Math.min(30,practiceMinutes(d.blocks)+(d.includeWarmup?warm.minutes:0)-d.blocks.length))}" required value="${warm.minutes}" /></label>${warm.kind==='hanon'?`<label class="wide">${ui('Exercise','Ejercicio')}<select name="warmup-exercise">${options([['rotate',ui('Next exercises','Siguientes ejercicios')],...HANON.map(e=>[e.id,warmupLabel(e)])],warm.exercise)}</select></label>`:''}${['reading','scales'].includes(warm.kind)?`<label class="wide">${ui('Scale or mode','Escala o modo')}<select name="warmup-target">${options(TARGETS.map(t=>[t.id,t.label]),warm.target)}</select></label>`:''}</div>${warm.kind==='scales'?scalePreviewMarkup(warm.target):''}</fieldset></section>` : '';
  const totalMinutes = practiceMinutes(d.blocks) + (warmup && d.includeWarmup ? warm.minutes : 0);
  return `<div class="cp-prepare"><h1>${purpose === 'edit-plan' ? ui("Edit planned practice", "Editar práctica prevista") : purpose === 'plan' ? ui("Plan practice", "Planificar práctica") : ui("Prepare your practice", "Prepara tu práctica")}</h1>
    ${purpose !== 'start' && data.routines.length ? `<div class="cp-quick-routines" aria-label="${ui("Apply a routine", "Aplicar una rutina")}">${data.routines.map(r=>button('apply-plan-routine',esc(r.title),r.id)).join('')}</div>` : ''}
    ${purpose === 'edit-plan' ? `<p class="muted">${ui("Changes apply to this appointment only. Your saved routine and other recurring dates stay unchanged.", "Los cambios se aplican solo a esta cita. Tu rutina guardada y las otras fechas recurrentes no cambian.")}</p>` : ''}
    ${data.routines.length && purpose === 'start' ? `<div class="cp-quick-routines" aria-label="${ui("Your routines", "Tus rutinas")}">${data.routines.slice(0,3).map(r => button('quick-routine', `▶ ${esc(r.title)}`, r.id)).join('')}</div>` : ''}
    <form id="prepare-form"><div class="cp-preparation-mode"><span>${ui('Mode','Modo')}: <b>${d.context==='mobile'?ui('Mobile','Móvil'):ui('With piano','Con piano')}</b></span>${button('prepare-change-mode',ui('Change','Cambiar'),'','quiet')}</div><input type="hidden" name="context" id="practice-context" value="${esc(d.context)}" /><label class="cp-total-duration"><span>${ui("Total duration ", "Duración total ")}<output for="practice-duration">${totalMinutes}</output> min</span><input id="practice-duration" type="range" min="${d.blocks.length + (warmup && d.includeWarmup ? warm.minutes : 0)}" max="${Math.max(180,totalMinutes)}" step="1" value="${totalMinutes}" aria-label="${ui("Total practice duration in minutes", "Duración total de la práctica en minutos")}" /></label>${warmup}
    ${simpleRepertoire ? repertoirePickerMarkup(d,data) : d.blocks.map((b,i) => `<${d.blocks.length > 1 ? 'details' : 'section'} class="cp-block" ${d.blocks.length > 1 && i === 0 ? 'open' : ''}>
      ${d.blocks.length > 1 ? `<summary data-block-summary="${i}">${i+1}. ${ACTIVITIES[b.type]} · ${b.minutes} min</summary>` : ''}
      <div class="cp-fields cp-compact-fields">${blockFields(b,i)}
      ${b.type!=='repertoire'?`<div class="wide">${button('choose-catalogue',ui('+ Catalogue','+ Catálogo'),String(i),'quiet')}</div>`:''}
      ${['reading','technique','theory'].includes(b.type) ? `<label>${ui("Scale or mode", "Escala o modo")}<select name="target-${i}">${options(TARGETS.map(t => [t.id,t.label]), b.target)}</select></label>` : ''}
      ${b.type === 'repertoire' ? `<div class="wide cp-practice-pieces" data-practice-pieces="${i}"><div class="cp-practice-piece-heading"><p>${ui('On your stand','En tu atril')}</p>${button('prepare-other-pieces',ui('Other pieces','Otras piezas'),String(i),'quiet')}</div><input type="hidden" name="workId-${i}" value="${esc(b.workId || '')}" /><div class="cp-practice-stand" role="group" aria-label="${ui('On your stand','En tu atril')}" tabindex="0">${data.works.filter(isOnStand).map(w=>`<button type="button" data-action="prepare-select-work" data-id="${esc(JSON.stringify([i,w.id]))}" aria-pressed="${b.workId===w.id}" title="${esc(w.title+(w.composer?' · '+w.composer:''))}"><span class="cp-practice-piece-check" aria-hidden="true">✓</span><b>${esc(w.title)}</b><small>${esc(w.composer)}</small></button>`).join('') || `<span class="muted">${ui('No pieces on your stand yet.','Todavía no hay obras en tu atril.')}</span>`}</div><p class="cp-practice-selected" data-practice-selected="${i}" aria-live="polite">${esc(data.works.find(w=>w.id===b.workId)?.title || ui('Choose when practising','Elegir al practicar'))}</p></div>` : ''}
      ${['reading','technique'].includes(b.type) ? `<label>${ui("Hands", "Manos")}<select name="hand-${i}">${options(HANDS.filter(([hand]) => hand !== 'both' || d.context !== 'mobile'),b.hand)}${d.context === 'mobile' ? `<option disabled>${ui("Both hands: choose piano or MIDI", "Dos manos: elige piano o MIDI")}</option>` : ''}</select></label>` : ''}
      ${hasTimingChoice(b) ? `<label class="${waitsForAnswers(b) ? 'wide' : ''}">${ui("Timing", "Ritmo")}<select name="timing-${i}">${options([['timed',ui("With tempo", "Con tempo")],['wait',ui("No tempo", "Sin tempo")]],b.timing || 'timed')}</select></label>` : ''}
      ${!['theory','repertoire'].includes(b.type) && !waitsForAnswers(b) ? `<label class="${hasTimingChoice(b) ? '' : 'wide'} cp-tempo"><span>Tempo <output for="tempo-${i}">${b.bpm}</output> BPM</span><input id="tempo-${i}" name="bpm-${i}" type="range" min="30" max="160" value="${b.bpm}" /></label>` : ''}
      </div>${b.type==='technique'?scalePreviewMarkup(b.target):''}<${['reading','technique'].includes(b.type)?'details':'div'} class="${['reading','technique'].includes(b.type)?'cp-details':'cp-block-goal'}">${['reading','technique'].includes(b.type)?`<summary>${ui("Options", "Opciones")}${d.context === "mobile" ? b.input === "names" ? ui(" · note names", " · nombres de notas") : ui(" · on-screen keyboard", " · teclado en pantalla") : ui(" for this exercise", " del ejercicio")}</summary>`:''}<div class="cp-fields">
      ${d.context === 'mobile' && ['reading','technique'].includes(b.type) ? `<label class="wide">${ui("Answer", "Respuesta")}<select name="input-${i}">${options([['piano',ui("On-screen keyboard", "Teclado en pantalla")],['names',ui("Note names", "Nombres de notas")]],b.input)}</select></label>` : ''}
      ${['reading','technique'].includes(b.type) ? `<label>${ui("Reading range", "Rango de lectura")}<select name="level-${i}">${options(RANGE_LEVELS,b.level ?? 0)}</select></label><label>${ui("Rhythm level", "Nivel de ritmo")}<select name="figures-${i}">${options(rhythmOptions(),rhythmLevel(b.figures))}</select></label>${!waitsForAnswers(b) ? `<label class="wide">${ui("Score", "Partitura")}<select name="presentation-${i}">${options([['auto',ui("Match device", "Según dispositivo")],['scroll',ui("Continuous scrolling", "Desplazamiento continuo")],['page',ui("Fixed page", "Página fija")]],b.presentation || 'auto')}</select></label>` : ''}` : ''}
      <label class="wide">${ui("Passage or goal", "Pasaje u objetivo")}<input name="passage-${i}" maxlength="1000" value="${esc(b.passage)}" placeholder="${ui("For example, bars 1–8", "Por ejemplo, compases 1–8")}" /></label></div>
      ${d.blocks.length > 1 ? `<div class="cp-block-controls">${button('block-up','↑',String(i))}${button('block-down','↓',String(i))}${button('block-remove',ui("Remove block", "Eliminar bloque"),String(i))}</div>` : ''}</${['reading','technique'].includes(b.type)?'details':'div'}>
    </${d.blocks.length > 1 ? 'details' : 'section'}>`).join('')}
    ${purpose !== 'start' && !simpleRepertoire ? button('block-add',ui("+ Add block", "+ Añadir bloque"),'','quiet') : ''}
    <p id="prepare-error" role="alert"></p><div class="cp-start-row"><button type="submit" class="primary">${purpose === 'edit-plan' ? ui("Review date and save", "Revisar fecha y guardar") : purpose === 'plan' ? ui("Choose date", "Elegir fecha") : ui("Start session →", "Empezar sesión →")}</button>${button('prepare-more',ui("More options", "Más opciones"),'','quiet')}</div></form></div>`;
}

export function orientationAdvice(context, presentation, width, height) {
  const tablet = Math.min(width, height) >= 600;
  if (tablet && presentation !== 'scroll' && width > height) return ui("On a tablet, try portrait orientation to see more systems of the score.", "En tablet, prueba el modo retrato para ver más sistemas de la partitura.");
  if (!tablet && context === 'midi' && height > width) return ui("With MIDI on a phone, turn to landscape to see more of the staff.", "Con MIDI en el móvil, gira a apaisado para ver más pentagrama.");
  if (!tablet && presentation === 'page' && width > height) return ui("To view a whole page, try portrait orientation.", "Para ver una página completa, prueba el modo retrato.");
  return '';
}
