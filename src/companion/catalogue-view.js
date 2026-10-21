import { CATALOG, catalogPresentation } from './catalog.js';
import { scoreCatalogueRecords, executionFor, manualPracticeState } from './library-state.js';
import { scoreStatus, downloadStatus } from './library-browse.js';
import { escapeHTML as esc } from './views.js';
import { getAppLanguage, localize } from './locale.js';

const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const busy = job => ['queued', 'downloading', 'waiting-wifi'].includes(job?.status);
const icons = {
  preview: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>' ,
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  open: '<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6"/>',
  add: '<path d="M12 4v16M4 12h16"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  transfer: '<path d="M7 3v16m-4-4 4 4 4-4M17 21V5m-4 4 4-4 4 4"/>',
};
const button = (action, label, id = '', extra = '') => `<button type="button" data-action="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`;
export const catalogueIconButton = (action, label, id, icon) => button(action, `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[icon]}</svg>`, id, `class="cp-catalogue-icon" title="${esc(label)}" aria-label="${esc(label)}"`);

// Keep source IDs and acquisition paths intact while presenting both formats together.
export function catalogueItems(library, data = {}, filters = {}, lang = getAppLanguage()) {
  const works = (data.works || []).filter(work => !work.trashedAt);
  const xml = scoreCatalogueRecords(library).map(record => {
    const execution = executionFor(library, record.piece_id);
    return { id: record.piece_id, title: record.display_title, composer: record.known_metadata.composer || '', format: 'musicxml', record, execution,
      assetId: execution.assetId, job: execution.job, work: works.find(work => work.libraryId === record.piece_id) };
  });
  const pdf = CATALOG.map(source => {
    const record = catalogPresentation(source, lang), work = works.find(work => work.catalogId === record.id);
    return { id: record.id, title: record.title, composer: record.composer, format: 'pdf', record, work,
      assetId: work?.assetId || (data.downloads || []).find(download => download.catalogId === record.id)?.assetId,
      job: (data.downloadJobs || []).find(job => job.catalogId === record.id) };
  });
  const terms = fold(filters.query).trim().split(/\s+/).filter(Boolean);
  return [...xml, ...pdf].filter(item => {
    const haystack = fold([item.title, item.composer, item.id, item.record.known_metadata?.collection_title, item.record.known_metadata?.opus_or_catalogue].join(' '));
    return terms.every(term => haystack.includes(term)) && (!filters.format || filters.format === item.format)
      && (filters.state !== 'downloaded' || item.assetId) && (!filters.composer || item.composer === filters.composer)
      && (!filters.target || item.record.targets?.includes(filters.target));
  }).sort((a, b) => a.title.localeCompare(b.title, lang, { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id));
}

export function catalogueMarkup(library, filters = {}, page = 0, selecting = false, { lang = getAppLanguage(), data = {} } = {}) {
  const t = (en, es) => localize(en, es, lang);
  const all = catalogueItems(library, data, {}, lang), items = catalogueItems(library, data, filters, lang);
  const limit = (Math.max(0, page) + 1) * 24, downloaded = all.filter(item => item.assetId).length;
  const composers = [...new Set(all.map(item => item.composer).filter(Boolean))].sort((a,b) => a.localeCompare(b,lang));
  const options = (pairs, value) => pairs.map(([id,label]) => `<option value="${esc(id)}" ${id === (value || '') ? 'selected' : ''}>${esc(label)}</option>`).join('');
  return `<section class="cp-catalogue" aria-label="${t('Score catalogue','Catálogo de partituras')}">
    <div class="cp-catalogue-heading"><h1>${t('Catalogue','Catálogo')}</h1></div>
    <form id="library-search" class="cp-catalogue-search" role="search">
      <label class="sr-only" for="catalogue-query">${t('Search the catalogue','Buscar en el catálogo')}</label><div class="cp-catalogue-search-line"><input id="catalogue-query" name="query" type="search" value="${esc(filters.query || '')}" placeholder="${t('Search titles, composers…','Buscar títulos, compositores…')}" autocomplete="off" /><button type="submit" class="quiet">${t('Search','Buscar')}</button></div>
      ${filters.target ? `<input type="hidden" name="target" value="${esc(filters.target)}" /><p class="cp-catalogue-count">${t('Filtered by musical goal','Filtrado por objetivo musical')} · ${button('library-clear',t('Search all scores','Buscar en todo el catálogo'))}</p>` : ''}
      <input type="hidden" name="state" value="${filters.state === 'downloaded' ? 'downloaded' : ''}" />
      <div class="cp-catalogue-toolbar"><nav aria-label="${t('Catalogue views','Vistas del catálogo')}">${button('library-all',`${t('All scores','Todas')} <span>${all.length}</span>`,'',`aria-pressed="${filters.state !== 'downloaded'}"`)}${button('library-downloaded',`${t('Downloaded','Descargadas')} <span>${downloaded}</span>`,'',`aria-pressed="${filters.state === 'downloaded'}"`)}</nav><label><span class="sr-only">${t('Format','Formato')}</span><select name="format" aria-label="${t('Format','Formato')}">${options([['',t('All formats','Todos los formatos')],['musicxml','MusicXML'],['pdf','PDF']],filters.format)}</select></label></div>
      <div class="cp-catalogue-secondary"><details class="cp-catalogue-filters"><summary>${t('More filters','Más filtros')}</summary><label>${t('Composer','Compositor')}<select name="composer">${options([['',t('All composers','Todos los compositores')],...composers.map(value=>[value,value])],filters.composer)}</select></label><label class="check"><input id="library-optional" type="checkbox" ${library.optional ? 'checked' : ''} />${t('Include OpenScore accompaniment','Incluir acompañamientos de OpenScore')}</label></details>${button('downloads', t('Transfers','Transferencias'), '', 'class="quiet"')}</div>
    </form>
    ${(library.report?.errors || []).length ? `<p class="cp-notice" role="alert">${t('Some sources could not be loaded. Try refreshing the catalogue.','No se han podido cargar algunas fuentes. Prueba a actualizar el catálogo.')}</p>` : ''}
    <p id="library-results" class="cp-catalogue-count" role="status">${items.length} ${t('scores','partituras')}${filters.state === 'downloaded' ? ` · ${t('on this device','en este dispositivo')}` : ''}</p>
    <div class="cp-catalogue-list">${items.slice(0,limit).map(item => {
      const xml = item.format === 'musicxml', ready = xml && manualPracticeState(item.record,item.execution).playable;
      const label = busy(item.job) || item.job?.status === 'failed' || item.job?.status === 'paused' ? downloadStatus(item.job.status,lang) : item.assetId ? t('Downloaded','Descargada') : '';
      const titleAction = xml ? 'library-detail' : 'catalogue-pdf-detail';
      const downloadAction = busy(item.job) ? 'downloads' : xml ? 'library-download' : 'download-piece';
      const openAction = xml ? ready ? selecting ? 'library-practice' : 'library-preview' : 'library-detail' : selecting ? 'select-catalogue-pdf' : 'open-pdf';
      const add = item.work ? catalogueIconButton('work-detail',t('In your repertoire','En tu repertorio'),item.work.id,'check') : item.assetId ? catalogueIconButton(xml ? 'library-add-work' : 'add-catalog-work',t('Add to repertoire','Añadir al repertorio'),item.id,'add') : '';
      return `<article class="cp-catalogue-row" ${xml ? 'data-piece-id' : 'data-pdf-id'}="${esc(item.id)}"><div class="cp-catalogue-piece"><h2>${button(titleAction,esc(item.title),item.id,'class="cp-catalogue-title"')}</h2><p>${item.composer ? `<span>${esc(item.composer)}</span><span aria-hidden="true"> · </span>` : ''}<span>${xml ? 'MusicXML' : 'PDF'}</span>${label ? `<span class="cp-catalogue-status ${item.assetId ? 'is-local' : ''}"> · ${esc(label)}</span>` : ''}</p></div><div class="cp-catalogue-row-actions">${!item.assetId ? catalogueIconButton('catalogue-preview',t('Preview score','Vista previa de la partitura'),item.id,'preview') : ''}${item.assetId ? catalogueIconButton(openAction,selecting ? t('Use in this practice','Usar en esta práctica') : t('Open score','Abrir partitura'),!xml && !selecting ? item.work?.id || item.id : item.id,'open') : catalogueIconButton(downloadAction,busy(item.job) ? t('View transfer','Ver transferencia') : item.job?.status === 'failed' ? t('Retry download','Reintentar descarga') : t('Download score','Descargar partitura'),item.id,busy(item.job) ? 'transfer' : 'download')}${add}</div></article>`;
    }).join('') || `<div class="cp-catalogue-empty"><p>${filters.state === 'downloaded' && !downloaded ? t('Your downloaded scores will appear here.','Aquí aparecerán tus partituras descargadas.') : t('No scores match your search.','No hay partituras con esta búsqueda.')}</p>${button('library-clear',t('Search all scores','Buscar en todo el catálogo'))}</div>`}</div>
    ${items.length > limit ? `<div class="cp-catalogue-more">${button('library-more',t('Show more scores','Mostrar más partituras'))}</div>` : items.length ? `<p class="cp-catalogue-end">${t('End of results','Fin de los resultados')}</p>` : ''}
    <details class="cp-catalogue-tools"><summary>${t('Catalogue options','Opciones del catálogo')}</summary><div class="cp-actions">${button('library-reimport',t('Refresh catalogue','Actualizar catálogo'))}${button('library-candidates-download',t('Download piano editions','Descargar ediciones para piano'))}</div></details>
  </section>`;
}
