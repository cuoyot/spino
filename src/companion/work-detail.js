import {formatProgressDuration} from './progress-duration.js';
import { ui, getAppLanguage } from './locale.js';
import { stageLabel } from './model.js';
import { targetById } from './curriculum.js';
import { isOnStand } from './repertoire.js';
import { icon } from './icons.js';
import { scoreIcon, printActionButton } from './score-controls.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const button = (action, label, id, css = '', attributes = '') => `<button type="button" data-action="${action}" data-id="${esc(id)}" class="${css}" ${attributes}>${label}</button>`;

export function workDetailMarkup(work, { hasScore = false, recordingCount = 0, history = '', totalMs = 0, thumbnailAssetId = work.assetId } = {}) {
  const heading = `<h1 class="cp-detail-title" data-detail-title>${esc(work.title)}</h1>${work.composer ? `<p class="muted">${esc(work.composer)}</p>` : ''}`;
  if (work.trashedAt) return `<div class="cp-work-page"><section class="cp-card">${heading}<p>${ui('This work is in trash. Its score, annotations, history and existing plans are preserved.', 'Esta obra está en la papelera. Conserva su partitura, anotaciones, historial y planes.')}</p>${button('restore-work', ui('Restore work', 'Restaurar obra'), work.id, 'primary')}</section>${history}</div>`;
  const scoreAction = hasScore ? 'open-pdf' : work.libraryId ? 'library-detail' : 'attach-pdf';
  const scoreLabel = hasScore ? work.libraryId ? ui('Open MusicXML score', 'Abrir partitura MusicXML') : ui('Open and annotate PDF', 'Abrir y anotar PDF') : work.libraryId ? ui('View in the library', 'Ver en la biblioteca') : ui('Add PDF', 'Añadir PDF');
  const scoreHint = work.libraryId ? ui('MusicXML · manual tracking, or follow along with a MIDI keyboard.', 'MusicXML · registro manual o seguimiento con teclado MIDI.') : work.assetId ? ui('Offline PDF and annotations · manual tracking.', 'PDF y anotaciones sin conexión · seguimiento manual.') : '';
  const addedDate=work.addedAt&&Number.isFinite(Date.parse(work.addedAt))?new Date(work.addedAt):null;
  return `<div class="cp-work-page">
    <section class="cp-work-overview">
    <header class="cp-work-heading"><h1 class="cp-detail-title" data-detail-title>${esc(work.title)}</h1>${button('close-work',ui('Close','Cerrar'),work.id,'quiet')}</header>
      <div class="cp-work-identity">${button(scoreAction,icon('reading'),scoreAction==='library-detail'?work.libraryId:work.id,'cp-work-thumbnail',`aria-label="${esc(scoreLabel)}" ${thumbnailAssetId?`data-score-thumbnail="${esc(thumbnailAssetId)}"`:''}`)}
      <div class="cp-work-facts">${work.composer?`<p class="cp-work-composer">${esc(work.composer)}</p>`:''}<p class="cp-work-status">${esc(stageLabel(work.stage))}${isOnStand(work)?` · ${ui('On the music stand','En el atril')}`:''}</p>
      <div class="cp-work-total"><span>${ui('Total practiced','Total practicado')}</span><strong>${formatProgressDuration(totalMs)}</strong></div>
      <div class="cp-work-added"><span>${ui('Added to repertoire','Añadida al repertorio')}</span>${addedDate?`<time datetime="${esc(work.addedAt)}">${esc(new Intl.DateTimeFormat(getAppLanguage(),{day:'numeric',month:'short',year:'numeric'}).format(addedDate))}</time>`:`<span>${ui('Date not recorded','Fecha no registrada')}</span>`}</div></div></div>
      <div class="cp-work-actions"><details class="cp-work-menu"><summary aria-label="${ui('More options','Más opciones')}"><span aria-hidden="true">•••</span><span>${ui('Actions','Acciones')}</span></summary><div class="cp-work-menu-items">
        ${button('practice-work',ui('Practice','Practicar'),work.id,'quiet')}
        ${button('plan-work',ui('Schedule','Planificar'),work.id,'quiet')}
        ${button('edit-work',ui('Edit','Editar'),work.id,'quiet')}
        ${button('stand-work',isOnStand(work)?ui('Take off the stand','Retirar del atril'):ui('Put on the stand','Poner en el atril'),work.id,'quiet')}
        ${button('delete-work',ui('Delete work','Eliminar obra'),work.id,'danger quiet')}
      </div></details></div>
    </section>
    <section class="cp-work-focus">
      <div class="cp-work-study"><h2>${ui('Next step', 'Próximo paso')}</h2><span>${work.target?`${esc(targetById(work.target).label)} · `:''}${esc(work.bpm)} BPM</span></div>
      <p class="cp-work-goal">${esc(work.passage || ui('Choose a passage and a clear goal for your next practice.', 'Elige un pasaje y un objetivo concreto para la siguiente práctica.'))}</p>
      ${work.tempoMark?`<p class="muted cp-work-tempo">${ui('Printed tempo: ','Tempo impreso: ')}${esc(work.tempoMark)}</p>`:''}
      ${work.notes ? `<p class="cp-work-notes">${esc(work.notes)}</p>` : ''}
    </section>
    <section class="cp-work-resources" aria-label="${ui('Score and recordings', 'Partitura y grabaciones')}">
      <div class="cp-work-resource">${button(scoreAction, `<span class="cp-work-resource-icon">${icon('reading')}</span><span class="cp-work-resource-copy"><strong>${scoreLabel}</strong>${scoreHint ? `<small>${scoreHint}</small>` : ''}</span><span aria-hidden="true">›</span>`, scoreAction === 'library-detail' ? work.libraryId : work.id, 'quiet cp-work-resource-open')}${hasScore ? printActionButton('print-work', work.id, esc) : ''}</div>
      <div class="cp-work-resource">${button('work-media', `<span class="cp-work-resource-icon">${scoreIcon('record')}</span><span class="cp-work-resource-copy"><strong>${ui('Recordings', 'Grabaciones')} <span class="cp-work-count">${recordingCount}</span></strong></span><span aria-hidden="true">›</span>`, work.id, 'quiet cp-work-resource-open')}${button('record-work', ui('Record', 'Grabar'), work.id, 'quiet cp-work-record')}</div>
    </section>
    <h2 class="cp-section">${ui('Sessions for this work', 'Sesiones de esta obra')}</h2>${history}
  </div>`;
}
