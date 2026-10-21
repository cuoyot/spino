import {moreInfo} from './more-info.js';
import { printActionButton } from './score-controls.js';
import { catalogueRecords } from './library.js';
import { executionFor, manualPracticeState, scoreCatalogueRecords, acquisitionCandidates } from './library-state.js';
import { escapeHTML as esc } from './views.js';
import { libraryText, scoreStatus, downloadStatus, repertoireButton } from './library-browse.js';
import { getAppLanguage, localizeMessage } from './locale.js';
const button = (action, label, id = '', extra = '') => `<button type="button" data-action="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`;
export { libraryMarkup } from './library-browse.js';
const link = (url, label) => typeof url === 'string' && /^https:\/\//.test(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : esc(label);
export function libraryDetailMarkup(library, id, selecting = false, lang = getAppLanguage(), repertoire = new Map()) {
  const t = libraryText(lang);
  const record = scoreCatalogueRecords(library).find(r => r.piece_id === id); if (!record) return `<p>${t('Catalogue record not found.', 'No se encuentra la referencia del catálogo.')}</p>`;
  const e = executionFor(library, id), state = manualPracticeState(record, e);
  const assets = acquisitionCandidates(library, record);
  const busy = ['queued', 'downloading', 'waiting-wifi'].includes(e.job?.status);
  const rejected = state.reasons.some(reason => /reviewed as unsuitable/.test(reason));
  return `<div class="cp-row"><h1>${esc(record.display_title)}</h1>${button('catalog', t('Library','Biblioteca'))}</div><p class="muted">${esc(record.known_metadata.composer || t('Composer unverified','Compositor sin verificar'))}</p>
    <section class="cp-card"><h2>${esc(scoreStatus(record,e,state,lang))}</h2><div class="cp-actions">${state.playable ? button('library-practice', selecting ? t('Use in this practice','Usar en esta práctica') : t('Practice','Practicar'), id, 'class="primary"') : ''}${!e.assetId && assets.length ? button(busy ? 'downloads' : 'library-download',busy ? t('View download','Ver descarga') : t('Download score','Descargar partitura'),id,'class="primary"') : ''}${e.assetId && e.selection?.length ? button('library-preview',t('Open score','Abrir partitura'),id) : ''}${e.assetId ? printActionButton('library-print',id,esc) : ''}${e.assetId ? repertoireButton(id, repertoire, t) : ''}${e.assetId && !state.playable ? button(rejected ? 'library-suitability' : e.selection?.length ? 'library-analyze' : 'library-parts',rejected ? t('Review selection','Revisar selección') : e.selection?.length ? t('Retry analysis','Reintentar análisis') : t('Select piano parts','Seleccionar partes de piano'),id) : ''}${!e.assetId && !assets.length ? button('library-attach',t('Attach a score','Adjuntar partitura'),id) : ''}</div>
    <p class="muted">${t('Manual practice · no automatic scoring','Práctica manual · sin puntuación automática')}</p>
    ${e.job?.error ? `<p role="alert">${esc(localizeMessage(e.job.error, lang))}</p>` : ''}${e.analysis?.error ? `<p role="alert">${esc(localizeMessage(e.analysis.error, lang))}</p>` : ''}
    ${e.assetId && !state.playable ? `<p class="muted">${esc(state.reasons.map(reason => localizeMessage(reason, lang)).join(' '))}</p>` : ''}
    ${e.referencePDF ? `<p>${t('Reference PDF attached. Musical analysis is separate.', 'PDF de referencia adjunto. El análisis musical es independiente.')}</p>${button('library-reference',t('Open PDF','Abrir PDF'),id)}` : ''}</section>
    <div class="cp-actions">${button('library-attach',t('Attach another local edition','Adjuntar otra edición local'),id)}${e.assetId ? button('library-parts',t('Select piano parts','Seleccionar partes de piano'),id) : ''}</div>
    <section class="cp-card"><h2>${t('Sources, rights and credits','Fuentes, derechos y créditos')}</h2><p>${esc(record.rights.attribution)}</p>${record.assets.map(a => `<p>${link(a.source_page_url,a.source_path || a.asset_id)} · ${esc(a.format)}${a.license_id ? ` · ${esc(a.license_id)}` : ''}</p>`).join('')}${(e.credits || []).map(c => `<p>${esc(c.text)}</p>`).join('')}</section>`;
}
export function libraryDownloadMarkup(library, lang = getAppLanguage()) {
  const t = libraryText(lang);
  const entries = Object.entries(library.executions).filter(([, e]) => e.job);
  return `<section class="cp-card"><h2>${t('MusicXML / MXL transfers','Descargas de MusicXML / MXL')}</h2>${moreInfo(`<p class="muted">${t('Downloads run one at a time while the app is open. Interrupted files resume when the source allows it; otherwise they restart.','Las descargas se realizan de una en una con la app abierta. Se reanudan si la fuente lo permite; de lo contrario, empiezan de nuevo.')}</p>`)}${entries.map(([id, e]) => `<div class="cp-download-row" id="download-${esc(id)}"><h3>${esc(catalogueRecords(library).find(r => r.piece_id === id)?.display_title || id)}</h3><small>${esc(downloadStatus(e.job.status,lang))}</small>${e.job.status === 'downloading' ? `<progress aria-label="${t('Score download progress','Progreso de descarga de la partitura')}"></progress><small data-bytes></small>` : ''}<p>${esc(localizeMessage(e.job.error || '',lang))}</p><div class="cp-actions">${['queued','downloading','waiting-wifi'].includes(e.job.status) ? button('library-pause',t('Pause','Pausar'),id) : e.job.status === 'complete' ? button('library-detail',t('Score status','Estado de la partitura'),id) : button('library-download',t('Retry / resume','Reintentar / reanudar'),id)}</div></div>`).join('') || `<p>${t('No MusicXML downloads requested.','No hay descargas de MusicXML solicitadas.')}</p>`}</section>`;
}
