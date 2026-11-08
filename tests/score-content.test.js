import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameScoreContent, downloadedScore } from '../src/companion/score-content.js';
const parts = ['a'.repeat(64), 'b'.repeat(64)];
test('Drive score references ignore field order, retaining chunk order and length', () => {
  assert.equal(sameScoreContent({ parts, length: 4 }, { length: 4, parts }), true);
  assert.equal(sameScoreContent({ parts, length: 4 }, { length: 4, parts: [...parts].reverse() }), false);
  assert.equal(sameScoreContent({ parts, length: 4 }, { length: 8, parts }), false);
  assert.equal(sameScoreContent(undefined, undefined), false);
});
test('deferred score hydration keeps local edits and rejects a real replacement', () => {
  const expected = { id: 'score', remoteContent: { parts, length: 4 } };
  const current = { ...expected, musicxmlMarks: [{ digit: '3' }], name: 'Local title' };
  const remote = { id: 'score', remoteContent: { length: 4, parts }, base64: 'YWJj', musicxmlMarks: [] };
  assert.deepEqual(downloadedScore(current, expected, remote), { ...current, base64: 'YWJj' });
  assert.throws(() => downloadedScore(current, expected, { ...remote, remoteContent: { parts: ['c'.repeat(64)], length: 4 } }), /Synchronize/);
  assert.throws(() => downloadedScore({ ...current, remoteContent: { parts, length: 8 } }, expected, remote), /Synchronize/);
  assert.throws(() => downloadedScore(current, expected, { ...remote, base64: '' }), /incomplete/);
});

test('a first deferred sync retains only local bytes matching immutable chunk hashes', async () => {
  const { scoreBytesMatch } = await import('../src/companion/score-content.js');
  const { digest } = await import('../src/companion/library.js');
  const base64='YWJj';
  const reference={length:4,parts:[await digest(JSON.stringify({kind:'score-bytes',value:base64}))]};
  assert.equal(await scoreBytesMatch(base64,reference),true);
  assert.equal(await scoreBytesMatch('YWJk',reference),false);
});
