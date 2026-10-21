import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { catalogueRecords, digest, importLibrary } from '../src/companion/library.js';
import { filterCatalogue, libraryCounts, manualPracticeState, practiceState } from '../src/companion/library-state.js';
import { processScore } from '../src/companion/library-pipeline.js';
import { bytesToBase64 } from '../src/companion/musicxml-document.js';
import { RENDERER_VERSION } from '../src/companion/analysis-versions.js';
import { mxlFixture } from './musicxml-fixture.js';

const read = path => readFile(`Exercises_Library/${path}`, 'utf8');
async function localScore(record = { piece_id: 'fixture', assets: [], provenance: [] }) {
  const bytes = mxlFixture(), sha256 = await digest(bytes);
  const asset = { pieceId: record.piece_id, sourceAssetId: 'fixture_asset', sha256, format: 'mxl', base64: bytesToBase64(bytes) };
  return { record, execution: { ...await processScore(asset, record, { includeSegments: false }), assetId: 'local_fixture', sourceAssetId: asset.sourceAssetId, sha256 } };
}

test('a validated full score is available for manual practice without rights approval or a preliminary preview', async () => {
  const { record, execution } = await localScore();
  const before = structuredClone(execution), state = manualPracticeState(record, execution);
  assert.equal(state.playable, true);
  assert.deepEqual(state.reasons, []);
  assert.equal(state.renderPending, true);
  assert.equal(execution.reviews, undefined);
  assert.deepEqual(execution, before, 'availability checks do not create reviews or change source evidence');
  assert.equal(practiceState(record, execution).playable, false, 'strict edition readiness remains separate');
  execution.render = { sha256: execution.sha256, configHash: execution.configHash, version: RENDERER_VERSION };
  assert.equal(manualPracticeState(record, execution).renderPending, false);
  assert.equal(practiceState(record, execution).playable, false, 'rendering does not imply rights approval');
  execution.render.version = 'old-renderer';
  assert.equal(manualPracticeState(record, execution).renderPending, true);
  assert.equal(manualPracticeState(record, execution).playable, true, 'the actual open verifies rendering again');
});

test('manual practice requires a current validated analysis and identified or reviewed piano selection', async () => {
  const { record, execution } = await localScore();
  const blocked = [
    { assetId: null }, { validated: false }, { analysis: null },
    { analysis: { ...execution.analysis, status: 'failed', error: 'Invalid notation' } },
    { sha256: '0'.repeat(64) }, { sourceAssetId: 'another_edition' },
    { configHash: '1'.repeat(64) },
    { analysis: { ...execution.analysis, algorithm_version: 'old-analysis' } },
    { selection: [] }, { parts: [] },
    { selection: ['V'] },
  ];
  for (const change of blocked) {
    const result = manualPracticeState(record, { ...execution, ...change });
    assert.equal(result.playable, false, JSON.stringify(change));
    assert.ok(result.reasons.length > 0);
  }
  const suitability = { approved: true, sha256: execution.sha256, configHash: execution.configHash };
  const reviewed = { ...execution, parts: execution.parts.map(part => ({ ...part, pianoCandidate: false })), reviews: { suitability } };
  assert.equal(manualPracticeState(record, reviewed).playable, true, 'an explicit current review can identify unnamed piano parts');
  assert.equal(manualPracticeState(record, { ...reviewed, selection: [] }).playable, false);
  assert.equal(manualPracticeState(record, { ...reviewed, reviews: { suitability: { ...suitability, sha256: '0'.repeat(64) } } }).playable, false);
  assert.equal(manualPracticeState(record, { ...reviewed, reviews: { suitability: { ...suitability, configHash: '1'.repeat(64) } } }).playable, false);
  assert.equal(manualPracticeState(record, { ...execution, reviews: { suitability: { ...suitability, approved: false } } }).playable, false, 'an explicit rejection blocks even automatically identified piano parts');
});

test('all visible catalogue filters exclude research while internal snapshots preserve stable records', async () => {
  const library = await importLibrary({ read });
  const records = catalogueRecords(library), candidates = filterCatalogue(library, { state: 'usable' });
  assert.equal(records.length, 618);
  assert.equal(candidates.length, 55);
  assert.ok(candidates.every(record => record.catalogue_group === 'piano_candidates'));
  assert.equal(filterCatalogue(library, { query: 'Czerny Op.821' }).length, 0);
  assert.equal(filterCatalogue(library, { query: 'Czerny Op.821', state: 'usable' }).length, 0);
  const record = records.find(item => item.record_kind === 'work');
  const { execution } = await localScore(record);
  library.executions[record.piece_id] = execution;
  const counts = libraryCounts(library);
  assert.equal(counts.records, 56);
  assert.equal(counts.available, 56);
  assert.equal(counts.manualReady, 1);
  assert.equal(counts.ready, 0);
  assert.equal(counts.approved, 0);
  assert.deepEqual(filterCatalogue(library, { state: 'manual-ready' }).map(item => item.piece_id), [record.piece_id]);
  assert.equal(filterCatalogue(library, { state: 'ready' }).length, 0, 'the strict filter retains edition approval semantics');
  assert.equal(filterCatalogue(library, { state: 'usable' }).length, 56);
  library.sources.sources.find(source => source.source_id === 'musetrainer').enabled = false;
  assert.deepEqual(filterCatalogue(library, { state: 'usable' }).map(item => item.piece_id), [record.piece_id]);
  library.executions[record.piece_id] = { referencePDF: 'reference_only' };
  assert.equal(filterCatalogue(library, { state: 'usable' }).length, 0, 'reference PDFs have no catalogue manual-practice route yet');
  assert.equal(catalogueRecords(library).length, 618);
});

test('a current explicit part selection enables manual practice without manufacturing piano or editorial approval', async () => {
  const { record, execution } = await localScore();
  const unnamed = { ...execution, parts: execution.parts.map(part => ({ ...part, name: '', pianoCandidate: false })) };
  assert.equal(manualPracticeState(record, unnamed).playable, false);
  const stamp = { sha256: execution.sha256, configHash: execution.configHash };
  const chosen = { ...unnamed, manualSelection: stamp };
  const before = structuredClone(chosen);
  assert.equal(manualPracticeState(record, chosen).playable, true);
  assert.equal(practiceState(record, chosen).playable, false);
  assert.equal(practiceState(record, chosen, { personalTesting: true }).playable, false);
  assert.deepEqual(chosen, before);
  assert.equal(chosen.reviews, undefined);
  assert.ok(chosen.parts.every(part => part.pianoCandidate === false));
  assert.deepEqual(chosen.hands, {});
  for (const manualSelection of [{ ...stamp, sha256: '0'.repeat(64) }, { ...stamp, configHash: '1'.repeat(64) }]) {
    assert.equal(manualPracticeState(record, { ...chosen, manualSelection }).playable, false);
  }
  assert.equal(manualPracticeState(record, { ...chosen, selection: [] }).playable, false);
  assert.equal(manualPracticeState(record, { ...chosen, selection: ['missing_part'] }).playable, false);
  assert.equal(manualPracticeState(record, { ...chosen, reviews: { suitability: { approved: false, ...stamp } } }).playable, false, 'a current rejection takes precedence over the personal selection');
});
