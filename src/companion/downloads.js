import { effectiveWifiOnly } from './network-policy.js';
import { CATALOG } from './catalog.js';
import { reserveDownload } from './download-slot.js';

export const DOWNLOAD_STATES = { queued: 'En cola', downloading: 'Descargando', paused: 'En pausa', 'waiting-wifi': 'Esperando Wi-Fi', failed: 'No se pudo descargar', complete: 'Disponible sin conexión' };
export function canDownload(network, wifiOnly) {
  return network.online && (!wifiOnly || network.wifi === true && !network.metered);
}
export function catalogChanges(downloads, catalog = CATALOG) {
  return catalog.filter(item => { const saved = downloads.find(d => d.catalogId === item.id); return saved && saved.revision !== item.revision; });
}
export function queueDownload(data, item) {
  const existing = data.downloadJobs.find(j => j.catalogId === item.id);
  if (existing?.status === 'downloading') return existing;
  const job = { catalogId: item.id, revision: item.revision, status: 'queued', loaded: 0, total: 0, error: '' };
  if (existing) Object.assign(existing, job); else data.downloadJobs.push(job);
  return existing || job;
}

// Downloads are opt-in, serial and foreground-only. An interrupted transfer restarts
// from zero; an installed edition remains usable until its replacement commits.
export function createDownloads({ getData, store, platform, persist, changed, isVisible = () => !document.hidden }) {
  let running = false, controller = null, activeId = null;
  const publish = async () => { await persist(); changed(); };
  async function pump() {
    if (running || !isVisible()) return;
    running = true;
    const release = await reserveDownload();
    try {
      while (isVisible()) {
        const data = getData();
        const job = data.downloadJobs.find(j => ['queued','waiting-wifi'].includes(j.status));
        if (!job) break;
        const item = CATALOG.find(c => c.id === job.catalogId);
        if (!item) { job.status = 'failed'; job.error = 'Esta pieza ya no está en el catálogo incluido.'; await publish(); continue; }
        const network = await platform.networkStatus();
        if (!isVisible()) break;
        if (!['queued','waiting-wifi'].includes(job.status)) continue;
        if (!canDownload(network, effectiveWifiOnly(data.preferences.wifiOnly))) {
          job.status = effectiveWifiOnly(data.preferences.wifiOnly) && network.online ? 'waiting-wifi' : 'paused';
          job.error = !network.online ? 'Sin conexión. Reintenta cuando estés conectado.' : network.wifi == null ? 'El navegador no puede comprobar el Wi-Fi. Usa Android o permite cualquier red.' : 'La descarga continuará con Wi-Fi sin consumo medido.';
          await publish(); break;
        }
        controller = new AbortController(); activeId = job.catalogId;
        job.status = 'downloading'; job.revision = item.revision; job.loaded = 0; job.total = 0; job.error = ''; await publish();
        try {
          const base64 = await platform.downloadPDF(item.download, { id: item.id, wifiOnly: effectiveWifiOnly(data.preferences.wifiOnly), signal: controller.signal, onProgress: p => { job.loaded = p.loaded; job.total = p.total || 0; changed(true); } });
          controller.signal.throwIfAborted();
          if (!base64.startsWith('JVBERi0')) throw new Error('La fuente no ha devuelto un PDF válido.');
          const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
          controller.signal.throwIfAborted();
          const previous = data.downloads.find(d => d.catalogId === item.id);
          const work = data.works.find(w => w.catalogId === item.id);
          const existingId = previous?.assetId || work?.assetId;
          const existing = existingId ? await store.asset(existingId) : null;
          controller.signal.throwIfAborted();
          const samePDF = existing?.base64 === base64;
          const keepEdition = !samePDF && !!existing?.annotations?.marks?.length;
          const assetId = keepEdition ? crypto.randomUUID() : existingId || crypto.randomUUID();
          const asset = {
            id: assetId, name: item.filename || `${item.id}.pdf`, type: 'application/pdf', base64,
            catalogId: item.id, title: item.title, composer: item.composer,
            source: item.source, download: item.download, edition: item.edition,
            editor: item.editor ?? null, license: item.licenseLabel, licenseUrl: item.licenseUrl || item.source,
            reviewed: item.reviewed, revision: item.revision,
            // Source checks describe the reviewed bytes, not an immutable URL contract.
            // The runtime hash always identifies the bytes actually stored in this asset.
            downloadEvidence: item.downloadEvidence ? structuredClone(item.downloadEvidence) : null,
            sha256: hash, downloadedAt: new Date().toISOString(),
          };
          if (samePDF && existing.annotations) asset.annotations = existing.annotations;
          if (samePDF && existing.scoreView) asset.scoreView = existing.scoreView;
          const savedDownloads = structuredClone(data.downloads), savedWorks = structuredClone(data.works);
          // An annotated edition remains attached to its work; updates get a separate PDF.
          if (keepEdition && !data.works.some(w => w.assetId === existingId)) {
            data.works.push({ id: crypto.randomUUID(), title: `${item.title} · edición anotada`.slice(0, 200), composer: item.composer, stage: 'En estudio', target: item.targets[0] ?? null, bpm: 60, notes: 'Edición anterior conservada con sus anotaciones.', passage: '', assetId: existingId });
          }
          data.downloads = data.downloads.filter(d => d.catalogId !== item.id);
          data.downloads.push({ catalogId: item.id, assetId, title: item.title, revision: item.revision });
          if (work && (!work.assetId || work.assetId === existingId && !keepEdition)) work.assetId = assetId;
          job.status = 'complete'; job.loaded = bytes.length; job.total = bytes.length;
          try { await store.commitAsset(asset, data); }
          catch (error) { data.downloads = savedDownloads; data.works = savedWorks; throw error; }
          changed();
        } catch (error) {
          job.status = controller.signal.aborted ? 'paused' : /WIFI_REQUIRED/.test(error.message) ? 'waiting-wifi' : 'failed';
          job.error = controller.signal.aborted ? 'Puedes reintentar la descarga desde el principio.' : job.status === 'waiting-wifi' ? 'La conexión ha cambiado. Esperando Wi-Fi.' : error.message;
          await publish();
          if (job.status === 'waiting-wifi') break;
        } finally { controller = null; activeId = null; }
      }
    } finally { running = false; release(); }
  }
  return {
    async enqueue(id) { const item = CATALOG.find(c=>c.id===id); if (!item) return; queueDownload(getData(), item); await publish(); return pump(); },
    async pause(id) {
      const job = getData().downloadJobs.find(j=>j.catalogId===id); if (!job || job.status === 'complete') return;
      job.status = 'paused'; if (activeId === id) controller?.abort(); await publish();
    },
    async pauseAll() {
      for (const job of getData().downloadJobs) if (['queued','downloading','waiting-wifi'].includes(job.status)) job.status = 'paused';
      controller?.abort(); await publish();
    },
    async policyChanged() { if (effectiveWifiOnly(getData().preferences.wifiOnly)) controller?.abort(); await publish(); if (!running) return pump(); },
    pump,
    get busy() { return running; },
  };
}
