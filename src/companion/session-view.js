import { ui } from './locale.js';
import { ACTIVITIES, CONTEXTS } from './model.js';
import { targetById } from './curriculum.js';
import { practiceMinutes } from './practice-duration.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clock = ms => `${Math.floor(Math.max(0, ms) / 60000)}:${String(Math.floor(Math.max(0, ms) / 1000) % 60).padStart(2, '0')}`;
const glyph = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
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
  if (block.type === 'repertoire') return workName(block.workId);
  if (block.type === 'free') return block.passage || ui('Time at the piano', 'Tiempo al piano');
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

function sequenceMarkup(session, workName) {
  return `<section class="cp-session-plan" aria-labelledby="session-plan-title"><div class="cp-session-plan-heading"><div><h2 id="session-plan-title">${ui('Your session', 'Tu sesión')}</h2><small>${practiceMinutes(session.blocks)} ${ui('suggested min', 'min orientativos')}</small></div>${button('session-add-block', ui('Add', 'Añadir'), { symbol: 'plus', css: 'quiet', label: ui('Add a block', 'Añadir un bloque') })}</div><p class="cp-session-edit-hint">${ui('Changes pause practice.', 'Los cambios pausan la práctica.')}</p>
    <ol class="cp-session-blocks">${session.blocks.map((block, index) => {
      const completed = index < session.blockIndex, current = index === session.blockIndex;
      const title = blockTitle(block, workName), name = `${ACTIVITIES[block.type]}: ${title}`;
      const canRemove = session.blocks.length - session.blockIndex > 1;
      const retained = index > session.blockIndex ? session.blockRuntime?.find(runtime => runtime.blockId === block.id && runtime.elapsedMs > 0) : null;
      return `<li class="cp-session-block${completed ? ' is-completed' : ''}${current ? ' is-current' : ''}" data-session-block="${esc(block.id)}"${current ? ' aria-current="step"' : ''}>
        <span class="cp-session-block-number" aria-label="${completed ? ui('Completed', 'Completado') : ui(`Block ${index + 1}`, `Bloque ${index + 1}`)}">${completed ? glyph('check') : index + 1}</span>
        <div class="cp-session-block-copy"><strong>${ACTIVITIES[block.type]}${current ? `<span class="cp-session-current-label">${ui('Now', 'Ahora')}</span>` : ''}</strong><span>${esc(title)}${retained ? `<span class="cp-session-retained-time">${ui('Practised', 'Practicado')} ${clock(retained.elapsedMs)}</span>` : ''}</span></div>
        ${completed ? `<span class="cp-session-block-saved-time">${block.minutes} min</span>` : `<div class="cp-session-block-edit"><label class="cp-session-minutes"><span class="sr-only">${ui('Suggested minutes for', 'Minutos orientativos de')} ${esc(name)}</span><input type="number" min="1" max="600" step="1" inputmode="numeric" value="${block.minutes}" data-session-minutes="${esc(block.id)}" aria-label="${esc(ui(`Suggested minutes for ${name}`, `Minutos orientativos de ${name}`))}" required /><span aria-hidden="true">min</span></label><div class="cp-session-block-tools">${button('session-block-up', '', { id: block.id, symbol: 'up', disabled: index <= session.blockIndex, label: ui(`Move ${name} up`, `Subir ${name}`) })}${button('session-block-down', '', { id: block.id, symbol: 'down', disabled: index === session.blocks.length - 1, label: ui(`Move ${name} down`, `Bajar ${name}`) })}${button('session-block-remove', '', { id: block.id, symbol: 'remove', css: 'quiet', disabled: !canRemove, label: canRemove ? ui(`Remove ${name}`, `Eliminar ${name}`) : ui('Keep at least one unfinished block', 'Conserva al menos un bloque pendiente') })}</div></div>`}
      </li>`;
    }).join('')}</ol><div class="cp-session-leave">${button('leave-session', ui('Continue later', 'Continuar después'), { css: 'quiet' })}${button('discard-session', ui('Discard', 'Descartar'), { css: 'danger quiet', label: ui('Discard session', 'Descartar sesión') })}</div></section>`;
}

export function sessionMarkup(data, { readerDevices = [], totalMs = 0, blockMs = 0, metronomeRunning = false, workName = id => data.works.find(work => work.id === id)?.title || ui('Piece', 'Obra'), width = globalThis.innerWidth, height = globalThis.innerHeight } = {}) {
  const session = data.active;
  if (!session) return '';
  const block = session.blocks[session.blockIndex];
  const generated = ['reading', 'technique'].includes(block?.type);
  const midiNeeded = generated && session.context === 'midi' && !readerDevices.length;
  const running = session.runningSince != null;
  const state = midiNeeded ? 'midi-needed' : running ? 'running' : blockMs > 0 || session.currentMeasurement || session.readerSnapshot ? 'paused' : 'ready';
  const stateLabel = { 'midi-needed': ui('MIDI needed', 'Falta MIDI'), running: ui('Practising', 'En práctica'), paused: ui('Paused', 'En pausa'), ready: ui('Ready', 'Listo') }[state];
  const work = data.works.find(work => work.id === block?.workId);
  const hasScore = generated || block?.type === 'repertoire' && !!work?.assetId;
  const advice = scoreOrientation(session.context, block?.presentation, width, height, hasScore);
  const selfPaced = session.context === 'mobile' && block?.timing === 'wait';
  const primary = midiNeeded ? button('midi-settings', ui('Connect instrument', 'Conectar instrumento'), { css: 'primary' }) : generated ? button('open-reader', state === 'ready' ? ui('Start exercise', 'Empezar ejercicio') : ui('Continue exercise', 'Continuar ejercicio'), { symbol: 'play', css: 'primary' }) : button('toggle-session', running ? ui('Pause', 'Pausar') : state === 'ready' ? ui('Start', 'Empezar') : ui('Continue', 'Continuar'), { symbol: running ? 'pause' : 'play', css: 'primary' });
  const target = targetById(block?.target);
  return `<section class="cp-session"><header class="cp-row cp-session-heading"><div><h1>${esc(session.title || ui('Practice session', 'Sesión de práctica'))}</h1><p>${CONTEXTS[session.context]} <span aria-hidden="true">·</span> <span>${ui('Session', 'Sesión')} <b data-session-clock>${clock(totalMs)}</b></span></p></div>${button('session-end', ui('Finish session', 'Terminar sesión'), { symbol: 'finish', css: 'cp-session-finish' })}</header>
    <div class="cp-session-layout"><div class="cp-session-current-column">${block ? `<article class="cp-card cp-session-card" aria-labelledby="session-current-title"><div class="cp-session-current-heading"><p class="eyebrow">${ui(`Block ${session.blockIndex + 1} of ${session.blocks.length}`, `Bloque ${session.blockIndex + 1} de ${session.blocks.length}`)} <span aria-hidden="true">·</span> ${ACTIVITIES[block.type]}</p><span class="cp-session-state" data-session-state="${state}" role="status"><i aria-hidden="true"></i>${stateLabel}</span></div>
      <h2 id="session-current-title">${esc(blockTitle(block, workName))}</h2>${block.passage && block.type !== 'free' ? `<p class="cp-session-passage">${esc(block.passage)}</p>` : ''}
      <div class="cp-session-timing"><div><span>${ui('This block', 'Este bloque')}</span><strong data-block-clock>${clock(blockMs)}</strong></div><div class="cp-session-duration"><b>${block.minutes} min</b><span>${ui('suggested', 'orientativos')}</span></div><div class="cp-session-tempo">${selfPaced ? ui('No tempo', 'Sin tempo') : `${block.bpm} <span>BPM</span>`}</div></div>
      <div class="cp-session-primary-actions">${primary}${block.type === 'repertoire' && work?.assetId ? button('open-pdf', ui('Open score', 'Abrir partitura'), { id: block.workId }) : ''}${button('next-block', session.blockIndex < session.blocks.length - 1 ? ui('Next block', 'Siguiente bloque') : ui('Finish session', 'Terminar sesión'), { symbol: session.blockIndex < session.blocks.length - 1 ? 'next' : 'finish', css: 'quiet' })}</div>
      ${midiNeeded ? `<div class="cp-session-midi-note"><span>${ui('Input disconnected', 'Entrada desconectada')}</span>${button('continue-piano', ui('Use manual tracking', 'Usar registro manual'), { css: 'quiet' })}</div>` : generated && session.context !== 'midi' && readerDevices.length ? `<div class="cp-session-midi-note"><span>${ui('MIDI connected', 'MIDI conectado')}</span>${button('use-midi', ui('Use MIDI', 'Usar MIDI'), { css: 'quiet' })}</div>` : ''}
      ${block.type === 'theory' ? `<div class="cp-session-theory"><p>${esc(target.detail)}</p><div class="cp-notes">${target.notes.map(note => `<span>${esc(note.label)}</span>`).join('')}</div><h3>${esc(target.question)}</h3><div class="cp-actions">${target.options.map(option => button('quiz-answer', esc(option), { id: option })).join('')}</div><div class="cp-feedback" id="quiz-feedback" role="status">${session.currentMeasurement?.correct ? ui('Correct. Continue when ready.', 'Correcto. Continúa cuando quieras.') : ''}</div></div>` : ''}
      ${!generated && block.type !== 'theory' ? `<div class="cp-session-manual-tools">${button('toggle-metronome', metronomeRunning ? ui('Stop metronome', 'Detener metrónomo') : ui('Metronome', 'Metrónomo'), { css: 'quiet', extra: `aria-pressed="${metronomeRunning}"` })}<details class="cp-session-timer-options"><summary>${ui('Timer options', 'Opciones de tiempo')}</summary><label class="check"><input id="background-timer" type="checkbox"${session.keepTimeInBackground ? ' checked' : ''} />${ui('Keep timing in the background', 'Seguir contando en segundo plano')}</label><p>${ui('Manual tracking · no accuracy score', 'Registro manual · sin puntuación de aciertos')}</p></details></div>` : ''}
      </article>` : `<article class="cp-card cp-session-card"><h2>${ui('Blocks completed', 'Bloques completados')}</h2><p>${ui('Finish the session or add another block.', 'Termina la sesión o añade otro bloque.')}</p></article>`}
      ${advice ? `<p class="cp-orientation cp-session-orientation">${advice}</p>` : ''}
    </div>${sequenceMarkup(session, workName)}</div></section>`;
}
