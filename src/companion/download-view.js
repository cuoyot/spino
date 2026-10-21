import {moreInfo} from './more-info.js';
import { supportsWifiOnly } from './network-policy.js';
import { CATALOG } from './catalog.js';
import { catalogChanges } from './downloads.js';
import { escapeHTML as esc } from './views.js';
import { ui, localizeMessage } from './locale.js';
import { downloadStatus } from './library-browse.js';
import { catalogueRecords } from './library.js';
const btn = (action, label, id = '', css = '') => `<button type="button" data-action="${action}" data-id="${esc(id)}" class="${css}">${label}</button>`;
export function downloadMarkup(data, native, library = { executions: {}, manifests: {} }) {
  const updates = catalogChanges(data.downloads);
  const records = new Map(catalogueRecords(library).map(record => [record.piece_id, record]));
  const jobs = [...data.downloadJobs.map(job => ({ ...job, xml: false })), ...Object.entries(library.executions).filter(([, execution]) => execution.job).map(([id, execution]) => ({ ...execution.job, catalogId: id, xml: true }))];
  const pending = jobs.filter(job => job.status !== 'complete'), completed = jobs.filter(job => job.status === 'complete');
  const localCount = data.downloads.length + Object.values(library.executions).filter(execution => execution.assetId).length;
  const rows = entries => entries.map(job => {
    const title = job.xml ? records.get(job.catalogId)?.display_title : CATALOG.find(item => item.id === job.catalogId)?.title;
    const active = ['queued','downloading','waiting-wifi'].includes(job.status);
    const action = active ? job.xml ? 'library-pause' : 'pause-download' : job.status === 'complete' ? job.xml ? 'library-detail' : 'open-pdf' : job.xml ? 'library-download' : 'download-piece';
    return `<div class="cp-transfer-row" id="download-${esc(job.catalogId)}"><div><h2>${esc(title || job.catalogId)}</h2><p>${job.xml ? 'MusicXML' : 'PDF'} · ${esc(downloadStatus(job.status))}</p>${job.status === 'downloading' ? `<progress aria-label="${ui('Download progress','Progreso de descarga')}"></progress><small data-bytes></small>` : ''}${job.error ? `<p role="alert">${esc(localizeMessage(job.error))}</p>` : ''}</div>${btn(action, active ? ui('Pause','Pausar') : job.status === 'complete' ? ui('Open','Abrir') : ui('Retry','Reintentar'),job.catalogId,'quiet')}</div>`;
  }).join('');
  return `<section class="cp-transfers"><div class="cp-catalogue-heading"><h1>${ui('Transfers','Transferencias')}</h1>${btn('catalog',ui('Find scores','Buscar partituras'),'','quiet')}</div>
    <div class="cp-transfer-network">${supportsWifiOnly() ? `<label class="check"><input id="wifi-only" type="checkbox" ${data.preferences.wifiOnly ? 'checked' : ''} />${ui('Unmetered Wi-Fi only','Solo Wi-Fi sin consumo medido')}</label>` : `<p>${ui('Downloads use any available internet connection.','Las descargas usan cualquier conexión a internet disponible.')}</p>`}${!native && supportsWifiOnly() && data.preferences.wifiOnly ? `<p class="muted">${ui('If your browser cannot identify Wi-Fi, turn this off to download.','Si el navegador no puede identificar el Wi-Fi, desactívalo para descargar.')}</p>` : ''}
    ${moreInfo(`<p>${ui('Downloads run while the app is open. Scores remain available offline after downloading.','Las descargas se realizan con la app abierta. Después, las partituras están disponibles sin conexión.')}</p>`)}</div>
    <div class="cp-transfer-summary"><span>${localCount} ${ui('scores on this device','partituras en este dispositivo')}</span>${btn('catalogue-local',ui('View downloaded','Ver descargadas'),'','quiet')}${pending.some(job => ['queued','downloading','waiting-wifi'].includes(job.status)) ? btn('pause-downloads',ui('Pause all','Pausar todas'),'','quiet') : ''}</div>
    ${updates.length ? `<p>${btn('download-updates',ui(`Update ${updates.length} scores`,`Actualizar ${updates.length} partituras`))}</p>` : ''}
    ${pending.length ? `<div class="cp-transfer-list">${rows(pending)}</div>` : `<div class="cp-catalogue-empty"><p>${ui('No pending transfers.','No hay transferencias pendientes.')}</p></div>`}
    ${completed.length ? `<details class="cp-transfer-completed"><summary>${ui('Completed','Completadas')} · ${completed.length}</summary>${rows(completed)}</details>` : ''}
  </section>`;
}
export function updateDownloadProgress(jobs) {
  for (const job of jobs) {
    const el = document.getElementById('download-'+job.catalogId), progress = el?.querySelector('progress');
    if (!progress) continue;
    if (job.total) { progress.max=job.total; progress.value=job.loaded; } else progress.removeAttribute('value');
    el.querySelector('[data-bytes]').textContent = `${Math.round(job.loaded/1024)} KB${job.total?' / '+Math.round(job.total/1024)+' KB':''}`;
  }
}
