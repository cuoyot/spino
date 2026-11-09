import { ui } from './locale.js';
import { ACTIVITIES, CONTEXTS } from './model.js';
import { targetById } from './curriculum.js';
import { practiceMinutes } from './practice-duration.js';
import { warmupExercises, warmupFocus, warmupSetLabel } from './warmups.js';
import { warmupAnimationPosterMarkup } from './hanon-animation.js';
import { isOnStand } from './repertoire.js';
import { scalePreviewMarkup } from './scale-preview.js';
import { sessionBlockMs } from './session-edit.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clock = ms => `${Math.floor(Math.max(0, ms) / 60000)}:${String(Math.floor(Math.max(0, ms) / 1000) % 60).padStart(2, '0')}`;
const glyph = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
  edit: '<path d="m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14Z"/>',
  grip: '<path d="M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01" stroke-width="3"/>',
  up: '<path d="m6 14 6-6 6 6"/>',
  down: '<path d="m6 10 6 6 6-6"/>',
  remove: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6"/>',
  play: '<path d="m9 5 10 7-10 7Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  next: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  finish: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
}[name] || ''}</svg>`;
const button = (action, text, { id = '', css = '', symbol = '', label = '', disabled = false, extra = '' } = {}) => `<button type="button" data-action="${action}" data-id="${esc(id)}" class="${css}"${label ? ` aria-label="${esc(label)}" title="${esc(label)}"` : ''}${disabled ? ' disabled' : ''}${extra ? ` ${extra}` : ''}>${symbol ? glyph(symbol) : ''}${text ? `<span>${text}</span>` : ''}</button>`;

function blockTitle(block, workName) {
  if (block.type === 'repertoire') return block.workId ? workName(block.workId) : ui('Piece chosen when you practise', 'Obra a elegir al practicar');
  if (block.type === 'free') return block.passage || ui('Time at the piano', 'Tiempo al piano');
  if (block.type === 'warmup') return warmupSetLabel(warmupExercises(block).map(exercise => exercise.id));
  return targetById(block.target).label;
}

function scoreOrientation(context, presentation, width, height, hasScore) {
  if (!hasScore) return '';
  const tablet = Math.min(width, height) >= 600;
  if (tablet && presentation !== 'scroll' && width > height) return ui('Portrait shows more of the score.', 'En retrato verás más partitura.');
  if (!tablet && context === 'midi' && height > width) return ui('Try landscape for a wider staff.', 'En apaisado verás más pentagrama.');
  if (!tablet && presentation === 'page' && width > height) return ui('Try portrait for a whole page.', 'En retrato verás la página completa.');
  return '';
}

function sequenceMarkup(session, workName, liveMs) {
  return `<section class="cp-session-plan cp-session-stand" aria-labelledby="session-plan-title"><div class="cp-session-plan-heading"><div><h2 id="session-plan-title">${ui('In this practice', 'En esta práctica')}</h2><small>${practiceMinutes(session.blocks)} ${ui('suggested min', 'min orientativos')}</small></div>${button('session-add-block', ui('Add', 'Añadir'), { symbol: 'plus', css: 'quiet', label: ui('Add a block', 'Añadir un bloque') })}</div>
    <ol class="cp-session-blocks">${session.blocks.map((block, index) => {
      const current = index === session.blockIndex;
      const activity = block.warmupKind ? ui('Warm-up','Calentamiento') + ' · ' + ACTIVITIES[block.type] : ACTIVITIES[block.type];
      const title = blockTitle(block, workName), name = `${activity}: ${title}`;
      const editable = session.flexibleBlocks || index >= session.blockIndex;
      const elapsed = sessionBlockMs(session, block.id, liveMs);
      return `<li class="cp-session-block${current ? ' is-current' : ''}" data-session-block="${esc(block.id)}"${current ? ' aria-current="true"' : ''}>
        <button type="button" class="cp-session-block-select quiet" data-action="session-select-block" data-id="${esc(block.id)}" aria-label="${esc(ui('Practise ', 'Practicar ') + name)}" aria-pressed="${current}"><span class="cp-session-block-copy"><strong>${esc(title)}</strong><span>${activity}${current ? ` · ${ui('Now', 'Ahora')}` : ''}</span></span><span class="cp-session-block-elapsed"${current ? ' data-block-clock' : ''}>${clock(elapsed)}</span></button>
        ${editable ? `<div class="cp-session-row-actions">${button('session-block-edit', '', { id: block.id, symbol: 'edit', css: 'quiet', label: ui('Edit '+name, 'Editar '+name) })}<button type="button" class="cp-session-grip quiet" data-session-options aria-expanded="false" aria-label="${esc(ui('Move or remove '+name, 'Mover o eliminar '+name))}" title="${ui('Hold to move · tap for options', 'Mantén para mover · toca para ver opciones')}">${glyph('grip')}</button></div>
        <div data-session-menu class="cp-session-block-menu" hidden>${button('session-block-up', ui('Move up', 'Subir'), { id: block.id, disabled: index <= (session.flexibleBlocks ? 0 : session.blockIndex) })}${button('session-block-down', ui('Move down', 'Bajar'), { id: block.id, disabled: index === session.blocks.length - 1 })}${button('session-block-remove', ui('Remove', 'Eliminar'), { id: block.id, css: 'danger quiet', disabled: session.blocks.length <= 1 })}</div>` : ''}
      </li>`;
    }).join('')}</ol><button type="button" data-session-bin class="cp-session-bin" hidden aria-label="${ui('Remove block', 'Eliminar bloque')}">${glyph('remove')}<span>${ui('Drop to remove', 'Suelta para eliminar')}</span></button><div class="cp-session-leave">${button('discard-session', ui('Discard', 'Descartar'), { css: 'danger quiet cp-session-discard', label: ui('Discard session', 'Descartar sesión') })}${button('session-end', ui('Finish session', 'Finalizar'), { symbol: 'finish' })}</div></section>`;
}

// Repertoire blocks can be planned without a piece: the stand comes first, the rest of the repertoire on demand.
export function workPickerMarkup(data, currentId = '', playable = () => true) {
  const works = data.works.filter(work => !work.trashedAt && work.id !== currentId);
  const stand = works.filter(isOnStand), rest = works.filter(work => !isOnStand(work));
  const choice = work => button('session-pick-work', `<b>${esc(work.title)}</b>${playable(work) ? work.composer ? `<small>${esc(work.composer)}</small>` : '' : `<small>${ui('Download its score in Library first', 'Descarga antes su partitura en la Biblioteca')}</small>`}`, { id: work.id, css: 'cp-work-choice', disabled: !playable(work) });
  if (!works.length) return `<p class="muted">${ui('Add pieces to your repertoire from Library to choose them here.', 'Añade obras a tu repertorio desde la Biblioteca para elegirlas aquí.')}</p>`;
  return `<div class="cp-work-picker">${stand.length ? `<p class="cp-work-picker-label">${ui('On the music stand', 'En el atril')}</p><div class="cp-work-choices">${stand.map(choice).join('')}</div>` : ''}${rest.length ? `<details${stand.length ? '' : ' open'}><summary>${ui('Rest of your repertoire', 'Resto del repertorio')} (${rest.length})</summary><div class="cp-work-choices">${rest.map(choice).join('')}</div></details>` : ''}</div>`;
}

export function sessionMarkup(data, { readerDevices = [], totalMs = 0, blockMs = 0, metronomeRunning = false, workName = id => data.works.find(work => work.id === id)?.title || ui('Piece', 'Obra'), workHasScore = work => !!work?.assetId, workPlayable = () => true, width = globalThis.innerWidth, height = globalThis.innerHeight } = {}) {
  const session = data.active;
  if (!session) return '';
  const block = session.blocks[session.blockIndex];
  const generated = ['reading', 'technique', 'warmup'].includes(block?.type);
  const warmup = block?.type === 'warmup' ? warmupExercises(block)[0] : null;
  const warmupCount = block?.type === 'warmup' ? warmupExercises(block).length : 0;
  const midiNeeded = generated && session.context === 'midi' && !readerDevices.length;
  const running = session.runningSince != null;
  const state = midiNeeded ? 'midi-needed' : running ? 'running' : blockMs > 0 || session.currentMeasurement || session.readerSnapshot ? 'paused' : 'ready';
  const stateLabel = { 'midi-needed': ui('MIDI needed', 'Falta MIDI'), running: ui('Practising', 'En práctica'), paused: ui('Paused', 'En pausa'), ready: ui('Ready', 'Listo') }[state];
  const work = data.works.find(work => work.id === block?.workId);
  const hasScore = generated || block?.type === 'repertoire' && workHasScore(work);
  const choosing = block?.type === 'repertoire' && !block.workId;
  const advice = scoreOrientation(session.context, block?.presentation, width, height, hasScore);
  const selfPaced = session.context === 'mobile' && block?.timing === 'wait';
  const primary = midiNeeded ? button('midi-settings', ui('Connect instrument', 'Conectar instrumento'), { css: 'primary' }) : generated ? button('open-reader', state === 'ready' ? ui('Start exercise', 'Empezar ejercicio') : ui('Continue exercise', 'Continuar ejercicio'), { symbol: 'play', css: 'primary' }) : block.type === 'repertoire' && workHasScore(work) ? button('open-score-practice', state === 'ready' ? ui('Start practice', 'Empezar práctica') : ui('Continue practice', 'Continuar práctica'), { symbol: 'play', css: 'primary' }) : button(block.type === 'free' ? 'open-free-practice' : 'toggle-session', `<b data-block-clock>${clock(sessionBlockMs(session, block.id, blockMs))}</b>`, { symbol: running ? 'pause' : 'play', css: 'primary', label: block.type==='free' ? ui('Open free practice','Abrir práctica libre') : running ? ui('Pause practice','Pausar práctica') : ui('Continue practice','Continuar práctica') });
  const target = targetById(block?.target);
  return `<section class="cp-session"><header class="cp-session-heading"><div class="cp-session-summary"><h1>${esc(session.title || ui('Practice session', 'Sesión de práctica'))}</h1><div class="cp-session-total"><span>${ui('Total practice time', 'Tiempo total de práctica')}</span><b data-session-clock>${clock(totalMs)}</b></div><p>${CONTEXTS[session.context]}</p></div>${button('leave-session', ui('Continue later', 'Continuar después'), { css: 'cp-session-finish quiet' })}</header>
    <div class="cp-session-layout"><div class="cp-session-current-column">${block ? `<article class="cp-card cp-session-card" aria-labelledby="session-current-title"><div class="cp-session-current-heading"><p class="eyebrow">${ui('Current activity', 'Actividad actual')} <span aria-hidden="true">·</span> ${block.warmupKind ? ui('Warm-up','Calentamiento') + ' · ' : ''}${ACTIVITIES[block.type]}</p><span class="cp-session-state" data-session-state="${state}" role="status"><i aria-hidden="true"></i>${stateLabel}</span></div>
      <h2 id="session-current-title">${esc(blockTitle(block, workName))}</h2>${block.passage && block.type !== 'free' ? `<p class="cp-session-passage">${esc(block.passage)}</p>` : ''}
      <div class="cp-session-timing">${generated || block.type === 'repertoire' && hasScore ? `<div><span>${ui('Block time', 'Tiempo del bloque')}</span><strong data-block-clock>${clock(sessionBlockMs(session, block.id, blockMs))}</strong></div>` : ''}<div class="cp-session-duration"><b>${block.minutes} min</b><span>${ui('suggested', 'orientativos')}</span></div>${block.type !== 'repertoire' ? `<div class="cp-session-tempo">${selfPaced ? ui('No tempo', 'Sin tempo') : `${block.bpm} <span>BPM</span>`}</div>` : ''}</div>
      ${choosing ? `<section class="cp-session-choose-work" aria-label="${ui('Choose a piece', 'Elige la obra')}"><h3>${ui('Which piece will you practise?', '¿Qué obra vas a trabajar?')}</h3>${workPickerMarkup(data, '', workPlayable)}<p class="muted">${ui('You can change it during the block; each piece keeps its own time.', 'Puedes cambiarla durante el bloque; cada obra conserva su tiempo.')}</p></section>` : ''}
      ${block.type==='technique'?scalePreviewMarkup(block.target):''}
      ${warmup ? `<div class="cp-session-warmup">${warmupAnimationPosterMarkup(warmup, { hand: block.hand })}<p>${warmupCount > 1 ? `${ui(`${warmupCount} exercises, one after another, each one octave up and back. First:`, `${warmupCount} ejercicios seguidos, cada uno una octava arriba y abajo. Primero:`)} ` : ''}${esc(warmupFocus(warmup))}</p></div>` : ''}
      <div class="cp-session-primary-actions">${primary}${warmup ? button('warmup-guide', ui('How to play', 'Cómo se toca'), { css: 'quiet' }) : ''}${block.type === 'repertoire' && block.workId ? button('record-work', ui('Record', 'Grabar'), { id:block.workId, css:'quiet' }) : ''}${block.type === 'repertoire' && block.workId ? button('session-change-work', ui('Change piece', 'Cambiar obra'), { css: 'quiet' }) : ''}</div>
      ${midiNeeded ? `<div class="cp-session-midi-note"><span>${ui('Input disconnected', 'Entrada desconectada')}</span>${button('continue-piano', ui('Use manual tracking', 'Usar registro manual'), { css: 'quiet' })}</div>` : generated && session.context !== 'midi' && readerDevices.length ? `<div class="cp-session-midi-note"><span>${ui('MIDI connected', 'MIDI conectado')}</span>${button('use-midi', ui('Use MIDI', 'Usar MIDI'), { css: 'quiet' })}</div>` : ''}
      ${block.type === 'theory' ? `<div class="cp-session-theory"><p>${esc(target.detail)}</p><div class="cp-notes">${target.notes.map(note => `<span>${esc(note.label)}</span>`).join('')}</div><h3>${esc(target.question)}</h3><div class="cp-actions">${target.options.map(option => button('quiz-answer', esc(option), { id: option })).join('')}</div><div class="cp-feedback" id="quiz-feedback" role="status">${session.currentMeasurement?.correct ? ui('Correct. Continue when ready.', 'Correcto. Continúa cuando quieras.') : ''}</div></div>` : ''}
      ${!generated && block.type !== 'theory' ? `<div class="cp-session-manual-tools">${block.type === 'free' ? button('toggle-metronome', metronomeRunning ? ui('Stop metronome', 'Detener metrónomo') : ui('Metronome', 'Metrónomo'), { css: 'quiet', extra: `aria-pressed="${metronomeRunning}"` }) : ''}<details class="cp-session-timer-options"><summary>${ui('Timer options', 'Opciones de tiempo')}</summary><label class="check"><input id="background-timer" type="checkbox"${session.keepTimeInBackground ? ' checked' : ''} />${ui('Keep timing in the background', 'Seguir contando en segundo plano')}</label><p>${ui('Manual tracking · no accuracy score', 'Registro manual · sin puntuación de aciertos')}</p></details></div>` : ''}
      </article>` : `<article class="cp-card cp-session-card"><h2>${ui('Blocks completed', 'Bloques completados')}</h2><p>${ui('Finish the session or add another block.', 'Termina la sesión o añade otro bloque.')}</p></article>`}
      ${advice ? `<p class="cp-orientation cp-session-orientation">${advice}</p>` : ''}
    </div>${sequenceMarkup(session, workName, blockMs)}</div></section>`;
}
