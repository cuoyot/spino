import {moreInfo} from './more-info.js';
import { supportsWifiOnly } from './network-policy.js';
import { CATALOG, CATALOG_VERSION } from './catalog.js';
import { catalogChanges } from './downloads.js';
import { escapeHTML as esc } from './views.js';
import { ui, localizeMessage } from './locale.js';
import { downloadStatus } from './library-browse.js';
const btn = (action, label, id = '', css = '') => `<button type="button" data-action="${action}" data-id="${esc(id)}" class="${css}">${label}</button>`;
export function downloadMarkup(data, native) {
  const updates = catalogChanges(data.downloads), missing = CATALOG.filter(c => !data.downloads.some(d=>d.catalogId===c.id));
  return `<h1>${ui('Downloads','Descargas')}</h1><p class="muted">${ui('Included library · version','Biblioteca incluida · versión')} ${CATALOG_VERSION}</p>
    <section class="cp-card">${supportsWifiOnly()?`<label class="check"><input id="wifi-only" type="checkbox" ${data.preferences.wifiOnly?'checked':''} />${ui('Unmetered Wi-Fi only','Solo Wi-Fi sin consumo medido')}</label>${native?`<p class="muted">${ui('Turn this off to allow mobile data.','Desactívalo para permitir datos móviles.')}</p>`:''}`:`<p class="muted">${ui('Downloads use any available internet connection.','Las descargas usan cualquier conexión a internet disponible.')}</p>`}${moreInfo(`<p>${!native&&supportsWifiOnly()?ui('Browsers cannot always check Wi-Fi. If unavailable, downloads wait until you allow any network.','El navegador no siempre puede comprobar el Wi-Fi. Si no puede, la descarga espera hasta que permitas cualquier red.')+' ':''}${ui('You can practice without downloads. Downloads pause when you leave the app.','Puedes practicar sin descargar piezas. Al salir de la app se pausan las descargas.')}</p>`)}<div class="cp-actions">${updates.length?btn('download-updates',ui(`Update ${updates.length} scores`,`Actualizar ${updates.length} partituras`),'','primary'):''}${btn('catalog',ui('Find scores','Buscar partituras'))}${btn('pause-downloads',ui('Pause all','Pausar todas'))}</div></section>
    <p class="muted">${data.downloads.length} ${ui('PDFs available offline','PDF disponibles sin conexión')} · ${missing.length} ${ui('not downloaded','sin descargar')}</p>${moreInfo(`<p>${ui('New editions arrive with app updates. Previous editions with annotations stay in your repertoire.','Las nuevas ediciones llegan con las actualizaciones de la app. Las ediciones anteriores con anotaciones se conservan en tu repertorio.')}</p>`)}
    <section class="cp-card">${data.downloadJobs.length ? data.downloadJobs.map(j => { const item=CATALOG.find(c=>c.id===j.catalogId); return `<div class="cp-download-row" id="download-${esc(j.catalogId)}"><h3>${esc(item?.title||j.catalogId)}</h3><small>${esc(downloadStatus(j.status))}</small>${j.status==='downloading'?`<progress aria-label="${ui('Download progress','Progreso de descarga')}"></progress><small data-bytes></small>`:''}${j.error?`<p class="muted">${esc(localizeMessage(j.error))}</p>`:''}<div class="cp-actions">${['queued','downloading','waiting-wifi'].includes(j.status)?btn('pause-download',ui('Pause','Pausar'),j.catalogId):j.status==='complete'?btn('open-pdf',ui('Open','Abrir'),j.catalogId):btn('download-piece',ui('Retry','Reintentar'),j.catalogId)}</div></div>`; }).join('') : `<p class="muted">${ui('Scores you choose to download appear here with their progress.','Las partituras que elijas descargar aparecerán aquí con su progreso.')}</p>`}</section>`;
}
export function updateDownloadProgress(jobs) {
  for (const job of jobs) {
    const el = document.getElementById('download-'+job.catalogId), progress = el?.querySelector('progress');
    if (!progress) continue;
    if (job.total) { progress.max=job.total; progress.value=job.loaded; } else progress.removeAttribute('value');
    el.querySelector('[data-bytes]').textContent = `${Math.round(job.loaded/1024)} KB${job.total?' / '+Math.round(job.total/1024)+' KB':''}`;
  }
}
