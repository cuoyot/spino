import { catalogueRecords, sourceEnabled } from './library.js';
import { PARSER_VERSION, ALGORITHM_VERSION, RENDERER_VERSION } from './analysis-versions.js';

export const executionFor = (library, id) => library.executions[id] || {};
export const selectedDescriptor = (record, execution) => [...record.assets, ...(execution.editions || [])].find(a => a.asset_id === execution.sourceAssetId);
export function currentAnalysis(execution) {
  const a = execution.analysis;
  return !!execution.assetId && execution.validated === true && a?.status === 'complete' && a.input_sha256 === execution.sha256 && a.input_asset_id === execution.sourceAssetId
    && a.parser_version === PARSER_VERSION && a.algorithm_version === ALGORITHM_VERSION && /^[a-f0-9]{64}$/.test(execution.configHash || '') && execution.configHash === execution.analysisConfigHash;
}
export function practiceState(record, execution = {}, { personalTesting = false } = {}) {
  const reasons = [];
  if (!execution.assetId || !execution.validated) reasons.push(record?.assets?.length ? 'Score located; download and validation are pending.' : 'No score edition has been located.');
  if (!currentAnalysis(execution)) reasons.push(execution.analysis?.status === 'failed' ? `Analysis failed: ${execution.analysis.error}` : 'Analysis or piano-part selection is pending.');
  const suitability = execution.reviews?.suitability;
  const currentSuitability = !!suitability && suitability.sha256 === execution.sha256 && suitability.configHash === execution.configHash;
  const identifiedPiano = execution.selection?.length > 0 && execution.selection.every(id => execution.parts?.some(p => p.id === id && p.pianoCandidate));
  const testSelection = personalTesting && identifiedPiano && !(currentSuitability && suitability.approved === false);
  if (!(currentSuitability && suitability.approved === true) && !testSelection) reasons.push(currentSuitability && suitability.approved === false ? 'The selected material was reviewed as unsuitable.' : 'Piano suitability review is pending.');
  const rights = execution.reviews?.rights;
  const rightsApproved = rights?.sha256 === execution.sha256 && rights?.sourceAssetId === execution.sourceAssetId && rights?.approved === true && rights?.jurisdictions?.length && rights?.editionEvidence && rights?.compositionEvidence;
  if (!rightsApproved && !personalTesting) reasons.push(rights?.approved === false ? 'Edition distribution is blocked by its rights review.' : 'Composition and edition rights review is pending.');
  if (!execution.render || execution.render.sha256 !== execution.sha256 || execution.render.configHash !== execution.configHash || execution.render.version !== RENDERER_VERSION) reasons.push('Score rendering needs verification.');
  return { playable: reasons.length === 0, personalTesting: personalTesting && (!rightsApproved || !(currentSuitability && suitability.approved)), reasons, status: !execution.assetId ? record?.assets?.length ? 'asset_located' : 'catalogue_only' : !execution.validated ? 'blocked' : reasons.length ? 'parsed' : 'ready' };
}

// Opening a full score for personal, manual practice is separate from approving
// an edition for distribution or enabling automatic note evaluation.
export function manualPracticeState(record, execution = {}) {
  const reasons = [];
  if (!execution.assetId || execution.validated !== true) reasons.push(record?.assets?.length ? 'Download and validate the score first.' : 'No local score edition is available.');
  if (!currentAnalysis(execution)) reasons.push(execution.analysis?.status === 'failed' ? `Analysis failed: ${execution.analysis.error}` : 'Score analysis and piano-part selection are needed.');
  const suitability = execution.reviews?.suitability;
  const currentSuitability = !!suitability && suitability.sha256 === execution.sha256 && suitability.configHash === execution.configHash;
  const selectedParts = execution.selection || [];
  const identifiedPiano = selectedParts.length > 0 && selectedParts.every(id => execution.parts?.some(part => part.id === id && part.pianoCandidate));
  const manualSelection = execution.manualSelection;
  const selectedManually = !!manualSelection && manualSelection.sha256 === execution.sha256 && manualSelection.configHash === execution.configHash
    && selectedParts.length > 0 && selectedParts.every(id => execution.parts?.some(part => part.id === id));
  if (currentSuitability && suitability.approved === false) reasons.push('The selected material was reviewed as unsuitable.');
  else if (!selectedParts.length || !(identifiedPiano || selectedManually || currentSuitability && suitability.approved === true)) reasons.push('Select and identify the piano parts before practicing.');
  const renderPending = !execution.render || execution.render.sha256 !== execution.sha256 || execution.render.configHash !== execution.configHash || execution.render.version !== RENDERER_VERSION;
  return { playable: reasons.length === 0, reasons, renderPending,
    status: !execution.assetId ? record?.assets?.length ? 'asset_located' : 'catalogue_only' : execution.validated !== true ? 'blocked' : reasons.length ? 'parsed' : 'ready' };
}
// Keep research snapshots for stable IDs and backups; expose only acquired or downloadable scores.
export function scoreCatalogueRecords(library) {
  return catalogueRecords(library).filter(record => executionFor(library, record.piece_id).assetId || acquisitionCandidates(library, record).length);
}
export function libraryCounts(library) {
  const records = scoreCatalogueRecords(library), executions = records.map(r => executionFor(library, r.piece_id));
  return { records: records.length, works: records.filter(r => r.record_kind === 'work').length, candidates: records.filter(r => r.catalogue_group === 'piano_candidates').length,
    accompaniment: records.filter(r => r.catalogue_group === 'accompaniment_optional').length, located: records.filter(r => r.assets.some(a => a.download_url) || executionFor(library, r.piece_id).editions?.length).length,
    downloaded: executions.filter(e => e.assetId).length, analyzed: executions.filter(currentAnalysis).length,
    segments: executions.reduce((n, e) => n + (currentAnalysis(e) ? e.segments?.length || 0 : 0), 0),
    ready: records.filter(r => practiceState(r, executionFor(library, r.piece_id), library).playable).length,
    available: records.filter(r => executionFor(library, r.piece_id).assetId || acquisitionCandidates(library, r).length).length,
    manualReady: records.filter(r => manualPracticeState(r, executionFor(library, r.piece_id)).playable).length,
    approved: executions.filter(e => e.reviews?.rights?.approved && e.reviews.rights.sha256 === e.sha256).length,
    failed: executions.filter(e => e.job?.status === 'failed' || e.analysis?.status === 'failed').length };
}
export function acquisitionCandidates(library, record) {
  return [...record.assets, ...(executionFor(library, record.piece_id).editions || [])].filter(a => ['mxl', 'musicxml'].includes(a.format) && a.download_url && sourceEnabled(library, a.source_id));
}
export function discoveryQueue(library) {
  return catalogueRecords(library).filter(r => r.record_kind === 'work' && !executionFor(library, r.piece_id).assetId).map(record => ({ piece_id: record.piece_id, composer: record.known_metadata.composer, collection: record.known_metadata.collection_title,
    title: record.display_title, status: executionFor(library, record.piece_id).referencePDF ? 'reviewed_transcription_needed' : acquisitionCandidates(library, record).length ? 'download_pending' : 'edition_discovery_pending',
    evidence: record.provenance.map(p => library.evidence.items.find(e => e.evidence_id === p.evidence_id)).filter(Boolean) }));
}
export function filterCatalogue(library, { query = '', group = '', composer = '', state = '', level = '', maxLeap = '', key = '' } = {}) {
  const fold = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const terms = fold(query).trim().split(/\s+/).filter(Boolean);
  return scoreCatalogueRecords(library).filter(record => {
    const e = executionFor(library, record.piece_id), analyzed = currentAnalysis(e), m = analyzed ? e.analysis.metrics : {}, ready = practiceState(record, e, library).playable;
    const haystack = fold([record.piece_id, record.display_title, ...Object.values(record.known_metadata)].filter(v => v != null).join(' '));
    return terms.every(term => haystack.includes(term)) && (!group || group === record.catalogue_group) && (!composer || composer === record.known_metadata.composer)
      && (!state || state === 'ready' && ready || state === 'manual-ready' && manualPracticeState(record, e).playable || state === 'pending' && !ready || state === 'downloaded' && e.assetId || state === 'located' && acquisitionCandidates(library,record).length || state === 'usable' && (e.assetId || acquisitionCandidates(library,record).length) || state === 'analyzed' && analyzed || state === 'missing' && !record.assets.length && !e.assetId)
      && (!level || level === 'unknown' && m.sightreading_level == null || level === m.sightreading_level)
      && (maxLeap === '' || m.max_melodic_leap_semitones != null && m.max_melodic_leap_semitones <= Number(maxLeap))
      && (!key || key === 'unknown' && m.key_signatures == null || m.key_signatures?.some(k => String(k.fifths) === key));
  });
}
