import {ui} from './locale.js';
import {ACTIVITIES, CONTEXTS, applyWorkParts, finishBlock, adjustPracticeTime} from './model.js';
import {settleSuspendedBlocks} from './session-edit.js';
import {icon} from './icons.js';
import {targetById} from './curriculum.js';
import {escapeHTML as esc, FACES, MOODS} from './views.js';

const clock = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

// Preview finalization on a copy; opening or editing the summary never saves the active session.
export function finishPracticePreview(active, {feedback = {}, partial = false, minutes = null} = {}) {
  const preview = settleSuspendedBlocks(active);
  if (preview.blockIndex < preview.blocks.length) finishBlock(preview, preview.currentMeasurement);
  preview.title = feedback.title?.trim() || preview.title;
  preview.notes = feedback.notes ?? preview.notes;
  preview.next = feedback.next ?? preview.next;
  preview.status = partial ? 'partial' : 'completed';
  applyWorkParts(preview, feedback.parts);
  if (minutes !== null) adjustPracticeTime(preview, Math.round(minutes * 60000));
  return preview;
}

export function finishPracticeTitle(active) {
  if (active.planId || active.routineId) return active.title;
  const types = [...new Set(active.blocks.map(block => block.type).filter(type => type !== 'warmup'))];
  const activity = types.length === 1 ? ACTIVITIES[types[0]] : ui('Piano practice','Práctica de piano');
  const hour = new Date(active.startedAt).getHours();
  const period = hour < 6 || hour >= 21 ? ui('Night','Noche')
    : hour < 12 ? ui('Morning','Mañana')
    : hour < 15 ? ui('Midday','Mediodía') : ui('Afternoon','Tarde');
  return `${activity} · ${period}`;
}

export function finishPracticeRating(active) {
  return `<fieldset class="cp-rating"><legend>${ui('How did it feel?','¿Cómo te has sentido?')} <small>${ui('Optional','Opcional')}</small></legend><div>${MOODS.map((label, i) => `<label><input type="radio" name="mood" value="${i+1}" ${active.mood === i+1 ? 'checked' : ''}><span aria-hidden="true">${FACES[i]}</span><small>${esc(label)}</small></label>`).join('')}</div></fieldset>`;
}

const performed = result => result.elapsedMs > 0 || result.measurement?.correct || result.measurement?.wrong;
const editButton = (key, label, content, css = '') =>
  `<button type="button" class="cp-finish-control ${css}" data-finish-edit="${key}" aria-label="${esc(label)}" aria-haspopup="dialog">${content}</button>`;
const hiddenField = (name, value) => `<input type="hidden" name="${name}" value="${esc(value)}">`;

function noteTile(key, value, symbol, label, prompt) {
  const text = value?.trim();
  return editButton(key, text ? `${label} · ${text}` : prompt,
    `${icon(symbol)}<span>${text ? `<small>${esc(label)}</small>` : ''}<span class="cp-finish-excerpt">${esc(text || prompt)}</span></span>`, 'cp-finish-note');
}

export function finishPracticeSummaryMarkup(session, works) {
  const rows = [];
  const displayed = new Set();
  session.results.forEach((result, index) => {
    if (!performed(result)) return;
    const {block} = result;
    const piece = works.find(work => work.id === block.workId);
    const target = ['reading', 'technique', 'theory'].includes(block.type) ? targetById(block.target).label : '';
    const title = piece?.title || ACTIVITIES[block.type];
    const detail = [piece ? ACTIVITIES[block.type] : target, block.passage].filter(Boolean).join(' · ');
    const content = `<span class="cp-finish-row-copy"><strong>${esc(title)}</strong>${detail ? `<small>${esc(detail)}</small>` : ''}</span><span class="cp-finish-clock">${clock(result.elapsedMs)}</span>`;
    if (piece) displayed.add(piece.id);
    rows.push(block.type === 'repertoire'
      ? `<li>${editButton(`piece-${index}`, `${ui('Change piece','Cambiar obra')} · ${[title,detail,clock(result.elapsedMs)].filter(Boolean).join(' · ')}`, content + icon('edit'), 'cp-finish-row')}</li>`
      : `<li class="cp-finish-row">${content}</li>`);
  });
  const piecesLabel = ui('Pieces practised','Obras practicadas');
  for (const piece of works.filter(work => session.workIds?.includes(work.id) && !displayed.has(work.id))) {
    rows.push(`<li>${editButton('works', piecesLabel, `<strong>${esc(piece.title)}</strong>${icon('edit')}`, 'cp-finish-row')}</li>`);
  }
  const context = [CONTEXTS[session.context], session.status === 'partial' && ui('Partial','Parcial')].filter(Boolean).join(' · ');
  return `<div class="cp-finish-overview">
    ${editButton('title', `${ui('Edit name','Editar nombre')} · ${session.title}`, `<span><strong>${esc(session.title)}</strong> ${icon('edit')}</span><small>${esc(context)}</small>`, 'cp-finish-name')}
    ${editButton('time', `${ui('Edit time','Editar tiempo')} · ${clock(session.elapsedMs)}`, `<strong>${clock(session.elapsedMs)}</strong><small>${ui('Practice time','Tiempo de práctica')}</small>`, 'cp-finish-time')}
  </div><section class="cp-finish-list"><div class="cp-finish-list-head"><b>${ui('Activity','Actividad')}</b>${editButton('works', piecesLabel, icon('plus'), 'cp-finish-add')}</div><ul>${rows.join('')}</ul></section>
  <div class="cp-finish-notes">
    ${noteTile('notes', session.notes, 'note', ui('Notes','Notas'), ui('Add notes','Añade notas'))}
    ${noteTile('next', session.next, 'flag', ui('Next step','Próximo paso'), ui('Set next steps','Fijar siguientes pasos'))}
  </div>`;
}

export function finishPracticeFields(active, works, partial) {
  const preview = finishPracticePreview(active, {partial});
  const recorded = preview.results.map(result => result.block.workId).filter(Boolean);
  preview.workIds = active.workIds || [...new Set(recorded)];
  return `<section data-finish-summary>${finishPracticeSummaryMarkup(preview, works)}</section>
    ${hiddenField('title', active.title)}${hiddenField('practicedMinutes', (active.elapsedMs / 60000).toFixed(2))}
    <input hidden type="checkbox" name="partial" ${partial ? 'checked' : ''}>
    ${hiddenField('notes', active.notes)}${hiddenField('next', active.next)}
    <div hidden data-finish-ids>${preview.workIds.map(id => hiddenField('workIds', id)).join('')}</div>`;
}

// Indices identify individual recorded passages, including multiple results with the same block ID.
export function applyFinishPieceEdits(session, edits) {
  for (const [index, edit] of edits) {
    const result = session.results[index];
    if (result.block.workId !== edit.workId) {
      result.measurement = null;
      result.material = null;
    }
    Object.assign(result.block, edit);
    const block = session.blocks.find(block => block.id === result.block.id);
    if (block && session.results.findLast(r => r.block.id === block.id) === result) Object.assign(block, edit);
  }
}

export function bindFinishPractice(form, active, works, initialMinutes, readFeedback) {
  const edits = new Map();
  const summary = form.querySelector('[data-finish-summary]');
  const preview = () => {
    const values = new FormData(form);
    const minutes = Number(values.get('practicedMinutes'));
    const feedback = readFeedback(values);
    const session = finishPracticePreview(active, {feedback, partial:values.has('partial'), minutes:minutes === Number(initialMinutes) ? null : minutes});
    applyFinishPieceEdits(session, edits);
    session.workIds = feedback.workIds;
    return session;
  };
  const storeIds = ids => { form.querySelector('[data-finish-ids]').innerHTML = [...new Set(ids)].map(id => hiddenField('workIds', id)).join(''); };
  summary.addEventListener('click', event => {
    const opener = event.target.closest('[data-finish-edit]');
    if (!opener) return;
    const key = opener.dataset.finishEdit;
    const session = preview();
    const pieceIndex = key.startsWith('piece-') ? Number(key.slice(6)) : null;
    const block = pieceIndex === null ? null : session.results[pieceIndex].block;
    const picker = block || key === 'works';
    const labels = {
      title:ui('Session name','Nombre de la sesión'), time:ui('Practice time (minutes)','Tiempo practicado (minutos)'),
      notes:ui('Notes','Notas'), next:ui('Next step','Próximo paso'), works:ui('Pieces practised','Obras practicadas')
    };
    const heading = block ? ui('Change piece','Cambiar obra') : labels[key];
    const field = key === 'time' ? 'practicedMinutes' : key;
    let chosen = block?.workId || '';
    const selected = new Set(session.workIds);
    const timed = new Set(session.results.filter(performed).map(r => r.block.workId).filter(Boolean));
    let body;
    if (picker) {
      const choices = works.filter(w => !w.trashedAt || w.id === chosen || selected.has(w.id));
      body = `<input type="search" data-search aria-label="${ui('Search your repertoire','Buscar en tu repertorio')}" placeholder="${ui('Title or composer','Título o compositor')}">
        <div class="cp-practice-results">${choices.map(w => `<button type="button" data-piece="${esc(w.id)}" aria-pressed="${block ? w.id === chosen : selected.has(w.id) || timed.has(w.id)}" ${(block ? w.trashedAt && w.id !== chosen : timed.has(w.id)) ? 'disabled' : ''}><b>${esc(w.title)}</b>${w.composer ? `<small>${esc(w.composer)}</small>` : ''}</button>`).join('')}</div>
        <p data-no-results>${ui('No matching pieces in your repertoire.','No hay coincidencias en tu repertorio.')}</p>
        ${block ? `<label>${ui('Part','Parte')}<input name="passage" maxlength="1000" value="${esc(block.passage)}"></label>` : ''}`;
    } else if (key === 'time') {
      body = `<input name="value" type="number" aria-label="${esc(heading)}" min="0" max="720" step="0.01" required value="${esc(form.elements[field].value)}"><label class="check"><input type="checkbox" name="partial" ${form.elements.partial.checked ? 'checked' : ''}>${ui('Save as a partial session','Guardar como sesión parcial')}</label>`;
    } else if (key === 'title') {
      body = `<input name="value" aria-label="${esc(heading)}" maxlength="200" required value="${esc(session.title)}">`;
    } else {
      body = `<textarea name="value" aria-label="${esc(heading)}" rows="4" maxlength="10000">${esc(session[key])}</textarea>`;
    }
    const editor = document.createElement('dialog');
    editor.className = 'cp-finish-editor';
    editor.setAttribute('aria-labelledby','cp-finish-editor-title');
    editor.innerHTML = `<form><header><h2 id="cp-finish-editor-title">${esc(heading)}</h2><button type="button" data-cancel aria-label="${ui('Cancel','Cancelar')}">${icon('close')}</button></header>${body}<button type="submit" class="primary">${ui('Done','Listo')}</button></form>`;
    form.closest('dialog').append(editor);
    const fields = editor.querySelector('form');
    editor.querySelector('[data-cancel]').onclick = () => editor.close();
    if (picker) {
      const search = editor.querySelector('[data-search]');
      const buttons = [...editor.querySelectorAll('[data-piece]')];
      const normalize = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
      const filter = () => {
        for (const button of buttons) button.hidden = !normalize(button.innerText || button.textContent).includes(normalize(search.value.trim()));
        editor.querySelector('[data-no-results]').hidden = buttons.some(button => !button.hidden);
      };
      search.oninput = filter;
      filter();
      for (const button of buttons) button.onclick = () => {
        const id = button.dataset.piece;
        if (block) {
          if (chosen !== id) fields.elements.passage.value = id === block.workId ? block.passage : '';
          chosen = id;
        } else if (selected.has(id)) selected.delete(id);
        else selected.add(id);
        for (const choice of buttons) choice.setAttribute('aria-pressed', String(block ? choice.dataset.piece === chosen : selected.has(choice.dataset.piece) || timed.has(choice.dataset.piece)));
      };
    }
    fields.onsubmit = event => {
      event.preventDefault();
      if (block) {
        edits.set(pieceIndex, {workId:chosen, passage:fields.elements.passage.value.trim()});
        if (block.workId !== chosen && !session.results.some((r,i) => i !== pieceIndex && r.block.workId === block.workId)) selected.delete(block.workId);
        if (chosen) selected.add(chosen);
        storeIds(selected);
      } else if (picker) storeIds([...selected, ...timed]);
      else {
        const value = fields.elements.value.value;
        form.elements[field].value = key === 'title' ? value.trim() || session.title : value;
        if (key === 'time') form.elements.partial.checked = fields.elements.partial.checked;
      }
      summary.innerHTML = finishPracticeSummaryMarkup(preview(), works);
      editor.close();
    };
    editor.addEventListener('close', () => {
      editor.remove();
      (summary.querySelector(`[data-finish-edit="${key}"]`) || summary.querySelector('button')).focus({preventScroll:true});
    }, {once:true});
    editor.showModal();
    if (picker) fields.querySelector('[data-search]').focus();
    else fields.elements.value.focus();
  });
  return edits;
}
