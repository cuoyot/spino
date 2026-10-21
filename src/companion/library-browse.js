import { escapeHTML as esc } from './views.js';
import { getAppLanguage, localizeMessage, localize } from './locale.js';

const button = (action, label, id = '', extra = '') => `<button type="button" data-action="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`;
export const libraryText = (lang = getAppLanguage()) => (en, es) => localize(en, es, lang);

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

// Catalogue pieces can join the repertoire without being practised; `repertoire` maps library ids to work ids.
export const repertoireButton = (id, repertoire, t) => repertoire.has(id) ? button('work-detail', t('✓ In your repertoire', '✓ En tu repertorio'), repertoire.get(id), 'class="quiet"') : button('library-add-work', t('+ Repertoire', '+ Repertorio'), id, 'class="quiet"');
export { catalogueMarkup as libraryMarkup } from './catalogue-view.js';
