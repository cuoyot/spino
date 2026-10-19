import { ACTIVITIES, CONTEXTS } from './model.js';
import { FACES, MOODS } from './views.js';
import { icon } from './icons.js';
import { ui, getAppLanguage } from './locale.js';
import { formatProgressDuration } from './progress-duration.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// All saved-session summaries use this renderer, including calendar and dialog entries.
export function savedSessionsMarkup(sessions, works = [], options = {}) {
  if (!sessions.length) return `<p class="cp-empty">${ui('Your saved practices will appear here. Start with a few minutes at your own pace.', 'Tus prácticas guardadas aparecerán aquí. Empieza con unos minutos, a tu ritmo.')}</p>`;
  return `<div class="cp-history">${sessions.map(session => savedSessionCardMarkup(session, works, options)).join('')}</div>`;
}

export function savedSessionCardMarkup(session, works = [], { assetFor = work => work.assetId, workId = null, entryId = '', time = '', plannedMinutes = null, notes = false } = {}) {
  const blocks = session.results?.length ? session.results.map(result => result.block) : session.blocks || [];
  const types = [...new Set(blocks.map(block => block.type).filter(type => ACTIVITIES[type]))];
  const activity = types.find(type => type !== 'warmup') || types[0] || 'free';
  const workIds = new Set([...(session.workIds || []), ...blocks.map(block => block.workId).filter(Boolean)]);
  const pieces = works.filter(work => workIds.has(work.id));
  const score = pieces.find(work => assetFor(work));
  const date = new Intl.DateTimeFormat(getAppLanguage(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(session.date + 'T12:00:00'));
  const mood = FACES[session.mood - 1];
  const passages = workId ? [...new Set(blocks.filter(block => block.workId === workId && block.passage).map(block => block.passage))] : [];
  const context = session.manual ? ui('Manual entry', 'Registro manual') : CONTEXTS[session.context] || '';
  const detail = [time, plannedMinutes != null ? `${plannedMinutes} ${ui('min planned', 'min previstos')}` : '', context, session.status === 'partial' ? ui('Partial', 'Parcial') : ''].filter(Boolean).join(' · ');
  return `<article class="cp-card cp-history-card" data-activity="${activity}"${entryId ? ` data-entry-id="${esc(entryId)}"` : ''}>
    <button type="button" class="cp-history-open" data-action="session-detail" data-id="${esc(session.id)}">
      <span class="cp-history-visual" ${score ? `data-score-thumbnail="${esc(assetFor(score))}"` : ''} aria-hidden="true">${icon(activity)}</span>
      <span class="cp-history-copy"><strong class="cp-history-title">${esc(session.title)}</strong><time datetime="${esc(session.date)}">${esc(date)}</time>${pieces.length ? `<span class="cp-history-pieces">${pieces.map(work => esc(work.title)).join(' · ')}</span>` : ''}${passages.length ? `<span class="cp-work-part">${ui('Part', 'Parte')}: ${passages.map(esc).join(' · ')}</span>` : ''}</span>
      ${mood ? `<span class="cp-history-mood"><span class="cp-history-face" aria-hidden="true">${mood}</span><span>${esc(MOODS[session.mood - 1])}</span></span>` : ''}
      <span class="cp-history-types">${types.map(type => `<span data-activity="${type}">${icon(type)}${esc(ACTIVITIES[type])}</span>`).join('')}</span>
      ${notes && session.notes ? `<span class="cp-history-note">${esc(session.notes)}</span>` : ''}
      <span class="cp-history-footer"><span class="cp-history-duration">${formatProgressDuration(session.elapsedMs)}</span><span class="cp-history-context">${esc(detail)}</span><span class="cp-history-link">${ui('View session', 'Ver sesión')} <span aria-hidden="true">›</span></span></span>
    </button>
  </article>`;
}

