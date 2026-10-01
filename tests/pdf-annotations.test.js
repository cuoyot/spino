import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAnnotations, pagePoint, marginTurn } from '../src/companion/pdf-annotations.js';
import { emptyData, validateBackup } from '../src/companion/model.js';
import { scorePDF } from './pdf-fixture.js';
import { validateScoreView } from '../src/companion/score-view.js';

const mark = { id: 'a', page: 1, type: 'pen', color: '#d64545', width: .0035, points: [{ x: .2, y: .4 }] };
test('annotations round-trip through backups while older unannotated PDFs remain valid', () => {
  const backup = { format: 'cuaderno-piano', version: 1, data: emptyData(), assets: [{ id: 'pdf', name: 'Score.pdf', type: 'application/pdf', base64: scorePDF() }] };
  assert.equal(validateBackup(JSON.stringify(backup)).assets[0].annotations, undefined);
  backup.assets[0].annotations = { version: 1, marks: [mark] };
  assert.deepEqual(validateBackup(JSON.stringify(backup)).assets[0].annotations.marks, [mark]);
  for (const invalid of [{ page: 0 }, { type: 'script' }, { width: -1 }, { color: 'url(x)' }, { points: [{ x: 2, y: .3 }] }]) {
    backup.assets[0].annotations.marks = [{ ...mark, ...invalid }];
    assert.throws(() => validateBackup(JSON.stringify(backup)), /anotaciones/);
  }
  assert.throws(() => validateAnnotations({ version: 1, marks: [mark, mark] }));
  assert.throws(() => validateAnnotations({ version: 1, marks: [{ ...mark, points: [{ x: NaN, y: .3 }] }] }));
  assert.throws(() => validateAnnotations({ version: 1, marks: [{ ...mark, type: 'text', text: 'x'.repeat(501) }] }));
});

test('normalized annotation coordinates are stable across screen sizes and zoom', () => {
  assert.deepEqual(pagePoint(70, 100, { left: 10, top: 20, width: 300, height: 400 }), { x: .2, y: .2 });
  assert.deepEqual(pagePoint(160, 210, { left: 40, top: 50, width: 600, height: 800 }), { x: .2, y: .2 });
  assert.deepEqual(pagePoint(-10, 1000, { left: 0, top: 0, width: 300, height: 400 }), { x: 0, y: 1 });
});

test('fingering and orientation-specific framing survive validated notebook backups', () => {
  const scoreView = { version: 1, portrait: { zoom: 1.5, centerX: .5, centerY: .6 }, landscape: { zoom: 2, centerX: .4, centerY: .5 } };
  const fingers = ['1', '2', '3', '4', '5'].map(text => ({ ...mark, id: text, type: 'fingering', text }));
  const backup = { format: 'cuaderno-piano', version: 1, data: emptyData(), assets: [{ id: 'pdf', name: 'Score.pdf', type: 'application/pdf', base64: scorePDF(), annotations: { version: 1, marks: fingers }, scoreView }] };
  const restored = validateBackup(JSON.stringify(backup)).assets[0];
  assert.deepEqual(restored.annotations.marks, fingers); assert.deepEqual(restored.scoreView, scoreView);
  assert.throws(() => validateAnnotations({ version: 1, marks: [{ ...fingers[0], text: '6' }] }));
  for (const frame of [{ zoom: 4, centerX: .5, centerY: .5 }, { zoom: 1, centerX: -1, centerY: .5 }, { zoom: 1, centerX: .5, centerY: Infinity }]) assert.throws(() => validateScoreView({ version: 1, portrait: frame }));
});

test('page turning uses narrow margins and rejects pointing, holds, drags, annotation and pinch gestures', () => {
  for (const width of [160, 300, 768, 1400]) {
    const tap = { width, x: width - 2, duration: 100, distance: 0, tool: 'read', zoom: 1 };
    assert.equal(marginTurn(tap), 1); assert.equal(marginTurn({ ...tap, x: 2 }), -1);
    assert.equal(marginTurn({ ...tap, zoom: 2, allowZoom: true }), 1, 'PDF reading can turn at a narrow visible edge of a saved zoom');
    for (const x of [width / 2, width - 20, 20]) assert.equal(marginTurn({ ...tap, x }), 0);
    for (const change of [{ tool: 'pen' }, { tool: 'text' }, { tool: 'erase' }, { duration: 301 }, { distance: 8 }, { pointers: 2 }, { zoom: 1.25 }, { scrollDistance: 3 }]) {
      assert.equal(marginTurn({ ...tap, ...change }), 0, JSON.stringify(change));
    }
  }
});
