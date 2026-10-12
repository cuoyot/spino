import { effectiveWifiOnly } from './network-policy.js';
import { readMusicXML, bytesFromBase64 } from './musicxml-document.js';
import { parseScore, analyzeScore, selectionHash } from './musicxml-analysis.js';
import { generateSegments } from './musicxml-segments.js';
import { digest, catalogueRecords } from './library.js';
import { pendingAnalysis, checkContract } from './library-contract.js';
import { acquisitionCandidates, executionFor } from './library-state.js';
import { canDownload } from './downloads.js';
import { reserveDownload } from './download-slot.js';

export async function processScore(asset, record, { selection = null, hands = {}, includeSegments = true } = {}) {
  const bytes = bytesFromBase64(asset.base64);
  if (asset.pieceId !== record.piece_id || await digest(bytes) !== asset.sha256) throw new Error('The local score identity or SHA-256 does not match.');
  const { xml, rootfile } = readMusicXML(bytes, asset.format), score = parseScore(xml);
  selection ||= score.parts.filter(p => p.pianoCandidate).map(p => p.id);
  const common = { validated: true, rootfile, credits: score.credits, parts: score.parts.map(p => ({ id: p.id, name: p.name, instruments: p.instruments, pianoCandidate: p.pianoCandidate, staves: p.staves, voices: p.voices, measures: p.measures.length })), selection, hands, render: null };
  if (!selection.length) return { ...common, configHash: null, analysisConfigHash: null, analysis: { ...pendingAnalysis(), warnings: ['No unambiguous piano part was identified. Select and review the intended parts.'] }, segments: [] };
  const configHash = await selectionHash(selection, hands);
  const analysis = await analyzeScore({ score, assetId: asset.sourceAssetId, sha256: asset.sha256, selection, hands });
  const segments = includeSegments ? await generateSegments({ record, asset, score, xml, analysis, selection, hands }) : [];
  checkContract('analysis', analysis);
  segments.forEach(s => checkContract('segment', s));
  return { ...common, configHash, analysisConfigHash: configHash, analysis, segments };
}

// Large scores must not block touch input, download cancellation or navigation.
export function processScoreInBackground(asset, record, options = {}) {
  if (typeof Worker === 'undefined') return processScore(asset, record, options);
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./musicxml-worker.js', import.meta.url), { type: 'module' });
    const finish = (error, result) => { clearTimeout(timer); worker.terminate(); error ? reject(error) : resolve(result); };
    const timer = setTimeout(() => finish(new Error('Score analysis exceeded two minutes. Try a smaller, reviewed edition.')), 120000);
    worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data.result);
    worker.onerror = event => finish(new Error(event.message || 'The score analysis worker failed.'));
    worker.postMessage({ asset, record, options });
  });
}

// The queue is durable, but never starts a new transfer merely because the app launches.
export function createLibraryDownloads({ getLibrary, setLibrary, store, getData, platform, changed, isVisible = () => !document.hidden, process = processScoreInBackground }) {
  let running = false, controller = null, activeId = null;
  const publish = async library => { await store.saveLibrary(library); setLibrary(library); changed(); };
  const execution = id => executionFor(getLibrary(), id);
  const update = async (id, value) => { const next = { ...getLibrary(), executions: { ...getLibrary().executions, [id]: { ...execution(id), ...value } } }; await publish(next); };
  async function analyze(id, options = {}) {
    const record = catalogueRecords(getLibrary()).find(r => r.piece_id === id), current = execution(id);
    if (!record || !current.assetId) throw new Error('Download a score before analyzing it.');
    const asset = await store.asset(current.assetId);
    await update(id, { analysis: { ...pendingAnalysis(), status: 'running' }, render: null });
    try {
      const result = await process(asset, record, options);
      await update(id, result);
    } catch (error) { await update(id, { analysis: { ...pendingAnalysis(), status: 'failed', error: error.message }, segments: [] }); }
  }
  async function pump() {
    if (running || !isVisible()) return;
    running = true; const release = await reserveDownload();
    try {
      while (isVisible()) {
        const pair = Object.entries(getLibrary().executions).find(([, e]) => ['queued', 'waiting-wifi'].includes(e.job?.status));
        if (!pair) break;
        const [id, current] = pair, record = catalogueRecords(getLibrary()).find(r => r.piece_id === id);
        const descriptor = record && acquisitionCandidates(getLibrary(), record).find(a => a.asset_id === current.job.sourceAssetId);
        if (!descriptor) { await update(id, { job: { ...current.job, status: 'failed', error: 'The selected source is disabled or its score URL is unavailable.' } }); continue; }
        if (current.job.nextAttemptAt > Date.now()) { await update(id, { job: { ...current.job, status: 'paused', error: `Source requested a retry after ${new Date(current.job.nextAttemptAt).toISOString()}.` } }); continue; }
        const network = await platform.networkStatus();
        if (!isVisible() || !['queued', 'waiting-wifi'].includes(execution(id).job?.status)) continue;
        if (!canDownload(network, effectiveWifiOnly(getData().preferences.wifiOnly))) { await update(id, { job: { ...current.job, status: network.online ? 'waiting-wifi' : 'paused', error: network.online ? 'Waiting for verified unmetered Wi-Fi. You can allow other networks in Downloads.' : 'Offline. Retry when connected.' } }); break; }
        controller = new AbortController(); activeId = id;
        await update(id, { job: { ...current.job, status: 'downloading', error: '' } });
        try {
          const receipt = await platform.downloadScore(descriptor.download_url, { id, wifiOnly: effectiveWifiOnly(getData().preferences.wifiOnly), signal: controller.signal, partial: current.partial,
            onProgress: progress => { const job = execution(id).job; Object.assign(job, progress); changed(true); } });
          if (!receipt.complete) { await update(id, { partial: receipt.partial || null, lastAttempt: { ...receipt, partial: undefined }, job: { ...execution(id).job, status: controller.signal.aborted ? 'paused' : /WIFI_REQUIRED/.test(receipt.error) ? 'waiting-wifi' : receipt.nextAttemptAt ? 'paused' : 'failed', error: receipt.error, nextAttemptAt: receipt.nextAttemptAt || null } }); if (execution(id).job.status === 'failed') continue; break; }
          controller.signal.throwIfAborted();
          const bytes = bytesFromBase64(receipt.base64), sha256 = await digest(bytes);
          if (descriptor.sha256 && descriptor.sha256 !== sha256) throw new Error('The downloaded score does not match the declared SHA-256.');
          readMusicXML(bytes, descriptor.format);
          controller.signal.throwIfAborted();
          const assetId = `${descriptor.asset_id}_${sha256.slice(0, 12)}`;
          const asset = { id: assetId, name: (descriptor.source_path?.split('/').at(-1) || `${id}.${descriptor.format}`).slice(0, 250), type: descriptor.format === 'mxl' ? 'application/vnd.recordare.musicxml' : 'application/vnd.recordare.musicxml+xml', format: descriptor.format,
            pieceId: id, sourceAssetId: descriptor.asset_id, base64: receipt.base64, sha256, origin: structuredClone(descriptor), receipt: { ...receipt, base64: undefined }, rights: structuredClone(record.rights), provenance: structuredClone(record.provenance) };
          await update(id,{job:{...execution(id).job,phase:'analysis',loaded:bytes.length,total:bytes.length}});
          // Full-score practice does not need hundreds of independently parsed excerpts.
          // Generate those only when the user explicitly requests excerpt analysis.
          const processed = await process(asset, record, { includeSegments: false });
          controller.signal.throwIfAborted();
          const e = { ...execution(id), ...processed, assetId, sourceAssetId: descriptor.asset_id, sha256, validated: true, receipt: asset.receipt, partial: null,
            job: { ...execution(id).job, status: 'complete', loaded: bytes.length, total: bytes.length, error: '' } };
          const next = { ...getLibrary(), executions: { ...getLibrary().executions, [id]: e } };
          await store.commitLibraryAsset(asset, next); setLibrary(next); changed();
        } catch (error) { await update(id, { job: { ...execution(id).job, status: controller.signal.aborted ? 'paused' : 'failed', error: error.message } }); }
        finally { controller = null; activeId = null; }
      }
    } finally { running = false; release(); }
  }
  return {
    async enqueueCandidates() {
      const next = structuredClone(getLibrary());
      for (const record of catalogueRecords(next).filter(r=>r.catalogue_group==='piano_candidates')) {
        const previous=executionFor(next,record.piece_id), descriptor=acquisitionCandidates(next,record)[0];
        if (!descriptor || previous.assetId || ['queued','downloading','waiting-wifi'].includes(previous.job?.status)) continue;
        next.executions[record.piece_id]={...previous,job:{status:'queued',loaded:0,total:0,error:'',sourceAssetId:descriptor.asset_id,revision:descriptor.revision,nextAttemptAt:previous.job?.nextAttemptAt||null}};
      }
      await publish(next);
      return pump();
    },
    async enqueue(id, assetId = null) {
      const record = catalogueRecords(getLibrary()).find(r => r.piece_id === id);
      const descriptor = record && acquisitionCandidates(getLibrary(), record).find(a => !assetId || a.asset_id === assetId);
      if (!descriptor) throw new Error('No enabled MusicXML/MXL acquisition URL exists for this record.');
      const previous = execution(id);
      if (previous.job?.status === 'downloading') return;
      await update(id, { job: { status: 'queued', loaded: 0, total: 0, error: '', sourceAssetId: descriptor.asset_id, revision: descriptor.revision, nextAttemptAt: previous.job?.nextAttemptAt || null } });
      return pump();
    },
    async pause(id) { const e = execution(id); if (!e.job || e.job.status === 'complete') return; if (activeId === id) controller?.abort(); await update(id, { job: { ...e.job, status: 'paused' } }); },
    async pauseAll() { controller?.abort(); const next = structuredClone(getLibrary()); for (const e of Object.values(next.executions)) if (['queued', 'downloading', 'waiting-wifi'].includes(e.job?.status)) e.job.status = 'paused'; await publish(next); },
    async policyChanged() { if (effectiveWifiOnly(getData().preferences.wifiOnly)) controller?.abort(); return pump(); },
    pump, analyze, update, get busy() { return running; },
  };
}
