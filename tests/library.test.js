import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { importLibrary, catalogueRecords, digest, legacyMigrationReport } from '../src/companion/library.js';
import { libraryCounts, filterCatalogue, practiceState, currentAnalysis } from '../src/companion/library-state.js';
import { emptyData, validateBackup } from '../src/companion/model.js';
import { createLibraryDownloads, processScore } from '../src/companion/library-pipeline.js';
import { bytesToBase64 } from '../src/companion/musicxml-document.js';
import { mxlFixture } from './musicxml-fixture.js';
import { RENDERER_VERSION } from '../src/companion/analysis-versions.js';

const read = path => readFile(`Exercises_Library/${path}`, 'utf8');
test('all enabled manifests import idempotently, retaining executions, progress and pending records', async () => {
  const first = await importLibrary({ read }); assert.equal(first.report.inserted, 618); assert.equal(first.report.errors.length, 0);
  const counts = libraryCounts(first); assert.deepEqual([counts.records, counts.works, counts.candidates, counts.ready, counts.downloaded], [55,0,55,0,0]);
  const id = catalogueRecords(first)[0].piece_id;
  first.executions[id] = { reviews: { rights: { approved: true, notes: 'Human review retained.' } }, customProgress: 42 };
  const again = await importLibrary({ previous: first, read });
  assert.equal(again.report.inserted, 0); assert.equal(again.report.skipped, 618); assert.deepEqual(again.executions, first.executions);
  assert.equal(filterCatalogue(again, { query: 'Czerny Op.821' }).length, 0); assert.equal(filterCatalogue(again, { level: 'unknown' }).length, 55);
  assert.equal(filterCatalogue(again, { maxLeap: '5' }).length, 0); assert.equal(filterCatalogue(again, { key: '0' }).length, 0);
  assert.equal(filterCatalogue(again, { state: 'pending' }).length, 55);
  const optional = await importLibrary({ previous: again, read, optional: true }); assert.equal(catalogueRecords(optional).length, 2080); assert.equal(libraryCounts(optional).accompaniment, 1462);
  const disabled = await importLibrary({ previous: optional, read, optional: false }); assert.equal(catalogueRecords(disabled).length, 618); assert.equal(catalogueRecords(disabled, { includeDisabled: true }).length, 2080);
  const legacy = legacyMigrationReport({ works: [{ catalogId: 'chaulieu_op9_c_major' }] }, { done: { chaulieu_op9_g_minor: true } });
  assert.equal(legacy.length, 2); assert.ok(legacy.every(e => e.status === 'unmapped'));
});
test('manifest validation is contextual and transactional; translated labels update stable IDs', async () => {
  const base = await importLibrary({ read }), index = JSON.parse(await read('library.json'));
  const descriptor = index.manifests[0], manifest = JSON.parse(await read(descriptor.path));
  manifest.pieces[0].display_title = 'Updated English label'; const raw = JSON.stringify(manifest); descriptor.sha256 = await digest(raw);
  const updated = await importLibrary({ previous: base, read: p => p === 'library.json' ? Promise.resolve(JSON.stringify(index)) : p === descriptor.path ? Promise.resolve(raw) : read(p) });
  assert.equal(updated.report.updated, 1); assert.equal(updated.report.inserted, 0); assert.equal(catalogueRecords(updated)[0].piece_id, catalogueRecords(base)[0].piece_id);
  const failed = await importLibrary({ previous: updated, read: p => p === descriptor.path ? Promise.resolve('{}') : read(p) });
  assert.equal(failed.report.failed, 160); assert.match(failed.report.errors[0], /czerny_op821.*SHA-256/); assert.equal(catalogueRecords(failed).length, 618);
  assert.equal(catalogueRecords(failed)[0].display_title, 'Updated English label');
});
test('format-aware acquisition never calls PDF download, preserves failures and backs up original assets/results', async () => {
  let library = await importLibrary({ read }); const assets = new Map(), data = emptyData(), bytes = mxlFixture(); let transfers = 0, commits = 0, failure = null;
  const record = catalogueRecords(library).find(r => r.assets.length), id = record.piece_id;
  const manager = createLibraryDownloads({ getLibrary: () => library, setLibrary: v => { library = v; }, getData: () => data, changed: () => {}, isVisible: () => true,
    store: { saveLibrary: async () => {}, asset: async id => assets.get(id), commitLibraryAsset: async (asset) => { commits++; if (failure === 'storage') throw new Error('Storage full'); assets.set(asset.id, asset); } },
    platform: { networkStatus: async () => ({ online: true, wifi: true, metered: false }), downloadPDF: () => assert.fail('MXL sent to PDF'), downloadScore: async () => { transfers++; if (failure === '404') return { complete: false, error: 'HTTP 404', httpStatus: 404 }; return { complete: true, base64: bytesToBase64(bytes), bytes: bytes.length, finalUrl: record.assets[0].download_url, httpStatus: 200 }; } },
  });
  failure = '404'; await manager.enqueue(id); assert.equal(library.executions[id].job.status, 'failed'); assert.equal(catalogueRecords(library).length, 618); assert.equal(assets.size, 0);
  failure = null; await manager.enqueue(id); assert.equal(transfers, 2); assert.equal(commits, 1); assert.equal(assets.size, 1);
  assert.equal(library.executions[id].segments.length,0);
  await manager.analyze(id);
  const execution = structuredClone(library.executions[id]); assert.equal(currentAnalysis(execution), true); assert.equal(execution.segments.length, 3); assert.equal(practiceState(record, execution).playable, false);
  assert.equal(execution.analysis.metrics.hand_assignment, null);
  failure = 'storage'; await manager.enqueue(id); assert.equal(assets.size, 1); assert.equal(library.executions[id].assetId, execution.assetId); assert.deepEqual(library.executions[id].analysis, execution.analysis);
  const backup = validateBackup(JSON.stringify({ format: 'cuaderno-piano', version: 1, data, assets: [...assets.values()], library }));
  assert.equal(catalogueRecords(backup.library).length, 618); assert.equal(backup.assets[0].base64, bytesToBase64(bytes));
  const changed = { ...execution, sha256: '0'.repeat(64) }; assert.equal(currentAnalysis(changed), false);
  assert.equal(currentAnalysis({ ...execution, configHash: 'changed-selection' }), false);
  assert.equal(currentAnalysis({ ...execution, analysis: { ...execution.analysis, algorithm_version: 'old' } }), false);
});
test('successful parsing does not approve licenses, hands, difficulty or piano suitability', async () => {
  const bytes = mxlFixture(), sha256 = await digest(bytes), asset = { pieceId: 'fixture', sourceAssetId: 'fixture_asset', sha256, format: 'mxl', base64: bytesToBase64(bytes) };
  const result = await processScore(asset, { piece_id: 'fixture', provenance: [] });
  assert.equal(result.analysis.metrics.sightreading_score, null); assert.equal(result.reviews, undefined);
  assert.deepEqual(result.selection, ['P']); assert.equal(result.analysis.metrics.highest_note.midi, 72);
});

test('personal testing never fabricates rights approval or bypasses technical validation',async()=>{
  const bytes=mxlFixture(),sha256=await digest(bytes),asset={pieceId:'fixture',sourceAssetId:'fixture_asset',sha256,format:'mxl',base64:bytesToBase64(bytes)};
  const record={piece_id:'fixture',assets:[],provenance:[]};
  const e={...await processScore(asset,record),assetId:'local',sourceAssetId:asset.sourceAssetId,sha256};
  const policy={personalTesting:true};
  assert.equal(practiceState(record,e,policy).playable,false);
  e.render={sha256,configHash:e.configHash,version:RENDERER_VERSION};
  assert.equal(practiceState(record,e,policy).playable,true);
  assert.equal(practiceState(record,e).playable,false);
  assert.equal(e.reviews,undefined);
  assert.equal(practiceState(record,{...e,validated:false},policy).playable,false);
  assert.equal(practiceState(record,{...e,parts:[]},policy).playable,false);
  assert.equal(practiceState(record,{...e,sha256:'0'.repeat(64)},policy).playable,false);
  assert.equal(practiceState(record,{...e,reviews:{suitability:{approved:false,sha256,configHash:e.configHash}}},policy).playable,false);
});

test('batch acquisition queues only missing piano candidates and preserves Wi-Fi policy',async()=>{
  let library=await importLibrary({read});const data=emptyData();
  const first=catalogueRecords(library).find(r=>r.catalogue_group==='piano_candidates');
  library.executions[first.piece_id]={assetId:'existing-score'};
  const manager=createLibraryDownloads({getLibrary:()=>library,setLibrary:value=>{library=value;},getData:()=>data,changed:()=>{},isVisible:()=>true,
    store:{saveLibrary:async()=>{}},platform:{networkStatus:async()=>({online:true,wifi:false,metered:true}),downloadScore:()=>assert.fail('Wi-Fi-only policy bypassed')}});
  await manager.enqueueCandidates();
  assert.equal(Object.values(library.executions).filter(e=>e.job).length,54);
  assert.equal(Object.values(library.executions).filter(e=>e.job?.status==='waiting-wifi').length,1);
  assert.equal(library.executions[first.piece_id].assetId,'existing-score');
});
