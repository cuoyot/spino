import test from 'node:test';
import assert from 'node:assert/strict';
import { syncIndicatorMarkup } from '../src/companion/sync-indicator.js';

const linked = { name: 'Synthetic.json', enabled: true, status: 'saved' };
test('sync indicator follows connection, pause, busy, and actionable failures', () => {
  assert.equal(syncIndicatorMarkup(), '');
  assert.match(syncIndicatorMarkup(linked), /data-sync-status="saved"/);
  assert.match(syncIndicatorMarkup({ ...linked, enabled: false }), /data-sync-status="paused"/);
  assert.match(syncIndicatorMarkup({ ...linked, status: 'writing' }), /data-sync-status="writing"/);
  for (const status of ['error', 'conflict']) {
    const html = syncIndicatorMarkup({ ...linked, status }, {}, 'es');
    assert.match(html, /data-attention="true"/);
    assert.match(html, /data-action="sync-settings"/);
    assert.match(html, /aria-label="[^"]+"/);
    assert.doesNotMatch(html, /cp-sync-badge/);
  }
  assert.match(syncIndicatorMarkup(linked, { status: 'error' }), /data-sync-status="media"/);
  assert.match(syncIndicatorMarkup({ ...linked, status: 'conflict' }, { status: 'copying' }), /data-sync-status="conflict"/);
});
