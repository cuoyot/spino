import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { CATALOG } from '../src/companion/catalog.js';
import { createDownloads } from '../src/companion/downloads.js';
import { emptyData, validateData, validateBackup, VERSION } from '../src/companion/model.js';

// Synthetic bytes isolate provenance and preservation behavior from remote availability.
const pdf = '%PDF-1.4\n% download provenance fixture\n%%EOF';
const encoded = btoa(pdf);
const annotations = { version: 1, marks: [{ id: 'mark', page: 1, type: 'text', color: '#d64545', width: .002, points: [{ x: .3, y: .4 }], text: 'Repeat' }] };
const scoreView = { version: 1, portrait: { zoom: 1.5, centerX: .5, centerY: .4 } };

function harness(assets = new Map()) {
  const data = emptyData(); data.preferences.wifiOnly = false;
  const manager = createDownloads({
    getData: () => data, isVisible: () => true, persist: async () => {}, changed: () => {},
    store: { asset: async id => assets.get(id), commitAsset: async (asset, next) => { validateData(next); assets.set(asset.id, asset); } },
    platform: { networkStatus: async () => ({ online: true, wifi: true, metered: false }), downloadPDF: async () => encoded },
  });
  const backup = () => validateBackup(JSON.stringify({ format: 'cuaderno-piano', version: VERSION, data, assets: [...assets.values()] }));
  return { data, assets, manager, backup };
}

test('downloaded edition provenance and runtime hash survive backup round trips', async () => {
  const item = CATALOG.find(item => item.id === 'mutopia-40');
  const { manager, data, assets, backup } = harness();
  await manager.enqueue(item.id);
  assert.equal(data.downloadJobs[0].status, 'complete');
  const asset = assets.get(data.downloads[0].assetId);
  assert.equal(asset.name, item.filename);
  assert.equal(asset.catalogId, item.id);
  for (const field of ['title', 'composer', 'source', 'download', 'edition', 'editor', 'licenseUrl', 'reviewed']) assert.equal(asset[field], item[field]);
  assert.equal(asset.license, item.licenseLabel);
  assert.deepEqual(asset.downloadEvidence, item.downloadEvidence);
  assert.notEqual(asset.downloadEvidence, item.downloadEvidence);
  assert.equal(asset.sha256, createHash('sha256').update(pdf).digest('hex'));
  assert.notEqual(asset.sha256, asset.downloadEvidence.sha256);
  assert.deepEqual(backup().assets[0], asset);
});

test('identical downloaded bytes retain local annotations and framing while adding attribution', async () => {
  const item = CATALOG.find(item => item.id === 'mutopia-202');
  const prior = { id: 'original', name: 'original.pdf', type: 'application/pdf', base64: encoded, annotations, scoreView };
  const { manager, data, assets, backup } = harness(new Map([[prior.id, prior]]));
  data.downloads.push({ catalogId: item.id, assetId: prior.id, title: item.title, revision: item.revision });
  await manager.enqueue(item.id);
  assert.equal(data.downloads[0].assetId, prior.id);
  assert.equal(assets.size, 1);
  assert.deepEqual(assets.get(prior.id).annotations, annotations);
  assert.deepEqual(assets.get(prior.id).scoreView, scoreView);
  assert.equal(assets.get(prior.id).editor, item.editor);
  assert.deepEqual(backup().assets[0].annotations, annotations);
});

test('changed annotated PDF with no curriculum target remains accessible and backup-valid', async () => {
  const item = CATALOG.find(item => item.id === 'mutopia-40');
  assert.deepEqual(item.targets, []);
  const prior = { id: 'annotated', name: 'old.pdf', type: 'application/pdf', base64: btoa('%PDF-1.3\n% previous edition'), annotations, scoreView, edition: 'Original edition', editor: 'Original editor' };
  const { manager, data, assets, backup } = harness(new Map([[prior.id, prior]]));
  data.downloads.push({ catalogId: item.id, assetId: prior.id, title: item.title, revision: '0' });
  await manager.enqueue(item.id);
  assert.equal(data.downloadJobs[0].status, 'complete');
  assert.notEqual(data.downloads[0].assetId, prior.id);
  assert.deepEqual(assets.get(prior.id), prior);
  assert.equal(data.works[0].assetId, prior.id);
  assert.equal(data.works[0].target, null);
  const restored = backup();
  assert.equal(restored.assets.length, 2);
  assert.equal(restored.data.works[0].target, null);
});
