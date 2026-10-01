import { checkContract } from './library-contract.js';

export const LIBRARY_KEY = 'repertoire-library-v2';
export const emptyLibrary = () => ({ version: 1, index: null, sources: null, evidence: null, ingestion: null, manifests: {}, executions: {}, optional: false, report: null });
export const digest = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
export function packagePath(path) {
  if (typeof path !== 'string' || !/^[\w./-]+$/.test(path) || path.startsWith('/') || path.split('/').some(p => !p || p === '.' || p === '..')) throw new Error(`Invalid package path: ${path}`);
  return path;
}
const json = text => JSON.parse(text.replace(/^\uFEFF/, ''));
export async function readPackageFile(path) {
  const response = await fetch(`/repertoire/${packagePath(path)}`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${path}: bundled file unavailable (${response.status})`);
  return response.text();
}
export function catalogueRecords(library, { includeDisabled = false } = {}) {
  return Object.values(library.manifests).filter(m => includeDisabled || m.descriptor.enabled_by_default || library.optional && m.descriptor.group === 'accompaniment_optional').flatMap(m => m.snapshot.pieces);
}
export function sourceEnabled(library, sourceId) {
  const source = library.sources?.sources.find(s => s.source_id === sourceId);
  return !!source && (source.enabled || sourceId === 'openscore' && library.optional);
}

// Each manifest is committed independently. Input snapshots never overwrite execution state.
export async function importLibrary({ previous = emptyLibrary(), read = readPackageFile, save = async () => {}, optional = previous.optional } = {}) {
  let result = structuredClone(previous);
  const report = { inserted: 0, updated: 0, skipped: 0, failed: 0, errors: [], manifests: [], checkedAt: new Date().toISOString() };
  try {
    const index = checkContract('library', json(await read('library.json')), 'library.json');
    if (index.schema_version !== '2.0.0' || index.base_language !== 'en') throw new Error('Unsupported library version or base language.');
    const sources = checkContract('sources', json(await read(packagePath(index.config.sources))));
    const evidence = checkContract('evidence', json(await read('provenance/evidence.json')));
    const ingestion = checkContract('ingestion', json(await read(packagePath(index.config.ingestion))));
    result = { ...result, index, sources, evidence, ingestion, optional };
    const sourceIds = new Set(sources.sources.map(s => s.source_id)), evidenceIds = new Set(evidence.items.map(e => e.evidence_id));
    const seen = new Set(), assetIds = new Set();
    for (const descriptor of index.manifests) {
      if (!descriptor.enabled_by_default && !(optional && descriptor.group === 'accompaniment_optional')) continue;
      try {
        const raw = await read(packagePath(descriptor.path));
        if (await digest(raw) !== descriptor.sha256) throw new Error('Manifest SHA-256 mismatch.');
        const snapshot = checkContract('manifest', json(raw), descriptor.path);
        if (snapshot.manifest_id !== descriptor.manifest_id || snapshot.group !== descriptor.group || snapshot.pieces.length !== descriptor.record_count) throw new Error('Manifest identity, group or count mismatch.');
        const ids = new Set(), localAssets = new Set();
        for (const record of snapshot.pieces) {
          if (record.catalogue_group !== descriptor.group || seen.has(record.piece_id) || ids.has(record.piece_id)) throw new Error(`Duplicate or misplaced record: ${record.piece_id}`);
          ids.add(record.piece_id);
          for (const id of [...record.provenance.map(p => p.evidence_id), ...record.rights.evidence_ids]) if (!evidenceIds.has(id)) throw new Error(`${record.piece_id}: missing evidence ${id}`);
          for (const asset of record.assets) {
            if (!sourceIds.has(asset.source_id) || !evidenceIds.has(asset.license_evidence_id) || assetIds.has(asset.asset_id) || localAssets.has(asset.asset_id)) throw new Error(`${record.piece_id}: invalid asset reference ${asset.asset_id}`);
            localAssets.add(asset.asset_id);
          }
        }
        const old = result.manifests[descriptor.manifest_id], previousRecords = new Map(old?.snapshot.pieces.map(p => [p.piece_id, p]) || []);
        const counts = { inserted: 0, updated: 0, skipped: 0 };
        for (const record of snapshot.pieces) counts[!previousRecords.has(record.piece_id) ? 'inserted' : JSON.stringify(previousRecords.get(record.piece_id)) === JSON.stringify(record) ? 'skipped' : 'updated']++;
        const next = { ...result, manifests: { ...result.manifests, [descriptor.manifest_id]: { descriptor, snapshot } } };
        if (!old || JSON.stringify(old.descriptor) !== JSON.stringify(descriptor)) await save(next);
        result = next;
        ids.forEach(id => seen.add(id)); localAssets.forEach(id => assetIds.add(id));
        for (const key of ['inserted', 'updated', 'skipped']) report[key] += counts[key];
        report.manifests.push({ id: descriptor.manifest_id, ...counts });
      } catch (error) { report.failed += descriptor.record_count; report.errors.push(`${descriptor.path}: ${error.message}`); }
    }
    result.report = report; await save(result);
  } catch (error) { report.errors.push(error.message); result.report = report; }
  return result;
}

// v1 key-based IDs have no verified ordinal mapping. Do not rewrite them or user history.
export function legacyMigrationReport(data, legacyProgress = {}) {
  const ids = new Set([...data.works.map(w => w.catalogId), ...Object.keys(legacyProgress.done || {}), ...Object.keys(legacyProgress.results || {})].filter(id => typeof id === 'string' && id.startsWith('chaulieu_op9_')));
  return [...ids].map(id => ({ id, status: 'unmapped', reason: 'No verified key-to-ordinal edition mapping. Existing progress is preserved.' }));
}

export function validateLibraryState(value) {
  if (value?.personalTesting !== undefined && typeof value.personalTesting !== 'boolean') throw new Error('Invalid personal testing preference.');
  if (!value || value.version !== 1 || !value.manifests || !value.executions || typeof value.optional !== 'boolean') throw new Error('Invalid repertoire library backup.');
  if (value.index) checkContract('library', value.index);
  if (value.sources) checkContract('sources', value.sources);
  if (value.evidence) checkContract('evidence', value.evidence);
  const ids = new Set();
  for (const [id, entry] of Object.entries(value.manifests)) {
    checkContract('manifest', entry.snapshot, id);
    if (entry.descriptor.manifest_id !== id || entry.snapshot.manifest_id !== id) throw new Error('Invalid manifest identity in backup.');
    for (const record of entry.snapshot.pieces) { if (ids.has(record.piece_id)) throw new Error('Duplicate catalogue ID in backup.'); ids.add(record.piece_id); }
  }
  for (const [id, execution] of Object.entries(value.executions)) {
    if (!ids.has(id) || !execution || typeof execution !== 'object') throw new Error(`Invalid execution record: ${id}`);
    if (execution.analysis) checkContract('analysis', execution.analysis, id);
    if (execution.segments) for (const segment of execution.segments) {
      checkContract('segment', segment, id);
      if (segment.piece_id !== id || segment.asset_id !== execution.sourceAssetId || segment.input_sha256 !== execution.sha256 || segment.end_measure_index_exclusive > execution.analysis?.metrics.measure_count || segment.end_measure_index_exclusive <= segment.start_measure_index) throw new Error(`Invalid excerpt boundaries: ${id}`);
    }
    if (execution.job) { if (!['queued', 'downloading', 'paused', 'waiting-wifi', 'failed', 'complete'].includes(execution.job.status)) throw new Error('Invalid library download state.'); if (execution.job.status === 'downloading') execution.job.status = 'paused'; }
    // Rendering must be checked on this installation when opening a score.
    if (execution.render) execution.render = null;
  }
  return value;
}
