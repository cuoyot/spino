import { catalogueRecords } from './library.js';
import { libraryCounts, filterCatalogue, executionFor, manualPracticeState, acquisitionCandidates } from './library-state.js';
import { escapeHTML as esc } from './views.js';
import { getAppLanguage, localizeMessage } from './locale.js';

const button = (action, label, id = '', extra = '') => `<button type="button" data-action="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`;
const options = (items, selected) => items.map(([value, label]) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
export const libraryText = (lang = getAppLanguage()) => (en, es) => lang === 'es' ? es : en;

export function downloadStatus(status, lang = getAppLanguage()) {
  const t = libraryText(lang);
  return ({ queued: t('Queued', 'En cola'), downloading: t('Downloading', 'Descargando'), paused: t('Paused', 'En pausa'),
    'waiting-wifi': t('Waiting for Wi-Fi', 'Esperando Wi-Fi'), failed: t('Download failed', 'Descarga fallida'),
    complete: t('Available offline', 'Disponible sin conexión') })[status] || t('Status unavailable', 'Estado no disponible');
}

export function scoreStatus(record, execution, state, lang = getAppLanguage()) {
  const t = libraryText(lang), job = execution.job;
  if (job?.status === 'waiting-wifi') return t('Waiting for Wi-Fi · change networks in Downloads', 'Esperando Wi-Fi · configura la red en Descargas');
  if (job?.status === 'queued') return t('Download queued', 'Descarga en cola');
  if (job?.status === 'downloading') return job.phase === 'analysis' ? t('Preparing score…', 'Preparando partitura…') : t('Downloading…', 'Descargando…');
  if (state.playable) return t('Available offline', 'Disponible sin conexión');
  if (job?.status === 'failed') return t('Download failed · see details to retry', 'Descarga fallida · puedes reintentar en el detalle');
  if (execution.assetId) {
    if (state.reasons.some(reason => /reviewed as unsuitable/.test(reason))) return t('Selected material marked unsuitable', 'El material seleccionado está marcado como no apto');
    if (execution.analysis?.status === 'failed') return t('Score analysis failed', 'No se pudo analizar la partitura');
    if (!execution.selection?.length || /suitab|piano/i.test(state.reasons.join(' '))) return t('Select the piano parts in details', 'Selecciona las partes de piano en el detalle');
    return t('Score preparation pending', 'Preparación de la partitura pendiente');
  }
  return record.assets?.some(a => a.download_url) ? t('Available to download', 'Disponible para descargar') : t('No score file is attached.', 'No hay un archivo de partitura asociado.');
}

export function libraryMarkup(library, filters = { state: 'usable' }, page = 0, selecting = false, { lang = getAppLanguage(), pdfs = '', pdfCount = 0 } = {}) {
  const t = libraryText(lang), counts = libraryCounts(library), isPDF = filters.format === 'pdf';
  const records = filterCatalogue(library, filters), pages = Math.max(1, Math.ceil(records.length / 24)), current = Math.min(page, pages - 1);
  const composers = [...new Set(catalogueRecords(library).map(r => r.known_metadata.composer).filter(Boolean))].sort();
  const isResearch = filters.state === 'missing';
  const tab = (action, label, active) => button(action, label, '', `aria-pressed="${active}"`);
  return `<section class="cp-library" aria-label="${t('Score library', 'Biblioteca de partituras')}">
    <div class="cp-row"><div><h1>${t('Scores', 'Partituras')}</h1><p class="muted">${t('Download once. Practice offline.', 'Descarga una vez. Practica sin conexión.')}</p></div>${button('downloads', t('Downloads', 'Descargas'))}</div>
    <nav class="cp-library-tabs" aria-label="${t('Catalogue views', 'Vistas del catálogo')}">
      ${tab('library-clear', `MusicXML · ${counts.available}`, !isPDF && filters.state === 'usable')}
      ${tab('library-pdfs', `PDF · ${pdfCount}`, isPDF)}
      ${tab('library-research', t('Research', 'Investigación'), isResearch)}
    </nav>
    ${isResearch ? `<p class="cp-notice">${t('Bibliographic references without a score file. These are research candidates, not downloadable exercises.', 'Referencias sin archivo de partitura. Son candidatas de investigación, no ejercicios descargables.')}</p>` : ''}
    ${(library.report?.errors || []).map(error => `<p class="cp-notice" role="alert">${esc(localizeMessage(error, lang))}</p>`).join('')}
    <form id="library-search" class="cp-library-search" ${isPDF ? 'hidden' : ''}>
      <div class="cp-library-search-row"><label><span class="sr-only">${t('Search scores', 'Buscar partituras')}</span><input name="query" type="search" value="${esc(filters.query || '')}" placeholder="${t('Title, composer or collection', 'Título, compositor o colección')}" /></label><button type="submit">${t('Search', 'Buscar')}</button></div>
      <details><summary>${t('Filters', 'Filtros')}</summary><div class="cp-library-filters">
        <label>${t('Show', 'Mostrar')}<select name="state">${options([['usable', t('Scores with a file or download', 'Partituras con archivo o descarga')], ['downloaded', t('On this device', 'En este dispositivo')], ['located', t('Downloadable', 'Descargables')], ['manual-ready', t('Prepared for manual practice', 'Preparadas para práctica manual')], ['missing', t('Research · no score file', 'Investigación · sin archivo')], ['', t('All catalogue records', 'Todas las referencias')]], filters.state || '')}</select></label>
        <label>${t('Composer', 'Compositor')}<select name="composer">${options([['', t('All composers', 'Todos los compositores')], ...composers.map(c => [c,c])], filters.composer || '')}</select></label>
        <label>${t('Group', 'Grupo')}<select name="group">${options([['',t('All groups','Todos los grupos')],['piano_core',t('Works and studies','Obras y estudios')],['piano_candidates',t('Piano editions','Ediciones para piano')],['accompaniment_optional',t('Accompaniment','Acompañamiento')]],filters.group || '')}</select></label>
        <label>${t('Level', 'Nivel')}<select name="level">${options([['',t('Any / unverified','Cualquiera / sin verificar')],['unknown',t('Unknown','Desconocido')]],filters.level || '')}</select></label>
        <label>${t('Analyzed key signature','Armadura analizada')}<select name="key">${options([['',t('Any signature','Cualquier armadura')],['unknown',t('Unknown','Desconocida')],...Array.from({length:15},(_,i)=>[String(i-7),`${i-7} ${t('fifths','quintas')}`])],filters.key || '')}</select></label>
        <label>${t('Maximum melodic leap','Salto melódico máximo')}<select name="maxLeap">${options([['',t('Any / unknown','Cualquiera / desconocido')],['2','2'],['5','5'],['12','12']],filters.maxLeap || '')}</select></label>
      </div><label class="check"><input id="library-optional" type="checkbox" ${library.optional ? 'checked' : ''} />${t('Include OpenScore accompaniment', 'Incluir acompañamientos de OpenScore')}</label></details>
    </form>
    ${isPDF ? pdfs : `<p id="library-results" class="muted" role="status">${records.length} ${t('matching records', 'resultados')} · ${current + 1} / ${pages}</p>
      <div class="cp-library-list">${records.slice(current * 24, (current + 1) * 24).map(record => {
        const e = executionFor(library, record.piece_id), state = manualPracticeState(record, e), downloadable = acquisitionCandidates(library, record).length > 0;
        const busy = ['queued','downloading','waiting-wifi'].includes(e.job?.status);
        return `<article class="cp-card cp-score-card" data-piece-id="${esc(record.piece_id)}"><span class="cp-tag">${e.assetId ? t('On device','En el dispositivo') : downloadable ? 'MusicXML' : t('Reference','Referencia')}</span><h2>${esc(record.display_title)}</h2><p class="muted">${esc(record.known_metadata.composer || (record.catalogue_group === 'piano_candidates' ? 'MuseTrainer · MusicXML' : t('Composer unverified','Compositor sin verificar')))}${record.known_metadata.opus_or_catalogue ? ` · ${esc(record.known_metadata.opus_or_catalogue)}` : ''}</p><p class="cp-score-state" id="reason-${esc(record.piece_id)}">${esc(scoreStatus(record,e,state,lang))}</p>
          <div class="cp-actions">${state.playable ? button('library-practice', selecting ? t('Use in this practice','Usar en esta práctica') : t('Practice','Practicar'),record.piece_id,'class="primary"') : !e.assetId && downloadable ? button(busy ? 'downloads' : 'library-download',busy ? t('View download','Ver descarga') : t('Download score','Descargar partitura'),record.piece_id,'class="primary"') : ''}${button('library-detail',t('Details','Detalle'),record.piece_id)}</div></article>`;
      }).join('') || `<p class="cp-empty">${t('No scores match these filters.', 'No hay partituras con estos filtros.')} ${button('library-clear',t('Show available scores','Ver partituras disponibles'))} ${button('library-all',t('Search research too','Buscar también en investigación'))}</p>`}</div>
      ${pages > 1 ? `<div class="cp-actions cp-library-pages">${button('library-page',t('Previous','Anterior'),String(Math.max(0,current-1)),current === 0 ? 'disabled' : '')}${button('library-page',t('Next','Siguiente'),String(current+1),current >= pages-1 ? 'disabled' : '')}</div>` : ''}`}
    <details class="cp-library-maintenance"><summary>${t('Catalogue information and tools','Información y herramientas del catálogo')}</summary>
      <div class="cp-stats" id="library-counts"><div><b data-count="records">${counts.records}</b>${t('Manifest records','Referencias del manifiesto')}</div><div><b data-count="ready">${counts.manualReady}</b>${t('Prepared for manual practice','Preparadas para práctica manual')}</div><div><b data-count="pending">${counts.records-counts.manualReady}</b>${t('Not prepared','Sin preparar')}</div></div>
      <p class="muted">${counts.downloaded} ${t('downloaded','descargadas')} · ${counts.analyzed} ${t('analyzed','analizadas')} · ${counts.segments} ${t('excerpt proposals','propuestas de pasajes')}. ${t('Edition records are not unique works. PDF scores are listed separately.','Las ediciones no son obras únicas. Los PDF se cuentan por separado.')}</p>
      <div class="cp-actions">${button('library-all',t('All records','Todas las referencias'))}${button('library-downloadable',t('Downloadable scores','Partituras descargables'))}${button('library-candidates-download',t('Download piano editions','Descargar ediciones para piano'))}${button('library-reimport',t('Refresh catalogue','Actualizar catálogo'))}</div>
      <details><summary>${t('Editorial and distribution reviews','Revisiones editoriales y de distribución')}</summary><p class="muted">${t('These checks concern distributing editions and analyzed excerpts. Personal full-score practice does not ask you to approve licenses. Source evidence and existing reviews are kept.', 'Estas revisiones corresponden a la distribución de ediciones y pasajes analizados. La práctica personal con la partitura completa no te pide aprobar licencias. Se conservan las fuentes y revisiones existentes.')}</p><label class="check"><input id="library-personal-testing" type="checkbox" ${library.personalTesting ? 'checked' : ''} />${t('Legacy personal-testing review override','Excepción de revisión para pruebas anteriores')}</label></details>
    </details></section>`;
}
