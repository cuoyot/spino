import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { CATALOG, CATALOG_VERSION } from '../src/companion/catalog.js';
import { TARGETS } from '../src/companion/curriculum.js';
import { catalogChanges } from '../src/companion/downloads.js';

const additions = CATALOG.filter(item => item.downloadEvidence);

test('expanded PDF selection preserves existing edition revisions and valid lesson references', () => {
  assert.equal(CATALOG_VERSION, 7);
  assert.equal(new Set(CATALOG.map(item => item.id)).size, CATALOG.length);
  const saved = ['mutopia-75', 'mutopia-1612'].map(catalogId => ({ catalogId, revision: '1' }));
  assert.deepEqual(catalogChanges(saved), []);
  for (const item of CATALOG) {
    assert.match(item.download, /^https:\/\/www\.mutopiaproject\.org\/ftp\/.+\.pdf$/);
    assert.ok(item.targets.every(id => TARGETS.some(target => target.id === id)));
    assert.equal(item.difficulty, undefined);
  }
});

test('new PDF editions retain source, credit, permission and actual download evidence', () => {
  assert.equal(additions.length, 72);
  assert.ok(additions.every(item => item.downloadEvidence.bytes > 0));
  for (const item of additions) {
    assert.equal(new URL(item.source).searchParams.get('id'), item.id.replace('mutopia-', ''));
    assert.equal(new URL(item.download).pathname.split('/').at(-1), item.filename);
    assert.ok(item.edition.includes(item.editor));
    assert.ok(item.licenseLabel);
    assert.match(item.licenseUrl, /^https:\/\//);
    assert.equal(item.reviewed, item.downloadEvidence.checked);
    assert.match(item.downloadEvidence.sha256, /^[a-f0-9]{64}$/);
    assert.ok(item.downloadEvidence.bytes > 0);
  }
  const bach = CATALOG.find(item => item.id === 'mutopia-40');
  assert.match(bach.licenseLabel, /Attribution-ShareAlike 3\.0/);
  assert.doesNotMatch(bach.licenseLabel, /Public Domain/);
});

test('official new PDF downloads match reviewed bytes', { skip: process.env.VERIFY_CATALOG_DOWNLOADS !== '1', timeout: 180000 }, async () => {
  for (const item of additions) {
    const response = await fetch(item.download, { signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, item.id);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-', item.id);
    assert.equal(bytes.length, item.downloadEvidence.bytes, item.id);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.downloadEvidence.sha256, item.id);
  }
});
