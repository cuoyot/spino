import test from 'node:test';
import assert from 'node:assert/strict';
import { validateScoreView, sortSections, sectionLayout, snapSectionPoint } from '../src/companion/score-view.js';

const part = (id, page, x, y, w, h) => ({ id, page, x, y, w, h });

test('section snapping aligns edges and repeats dimensions with a screen-pixel tolerance', () => {
  const sections = [part('a', 1, .1, .1, .4, .2)], rect = { width: 400, height: 800 };
  assert.deepEqual(snapSectionPoint({ x: .11, y: .105 }, sections, rect), { x: .1, y: .1 });
  const result = snapSectionPoint({ x: .61, y: .705 }, sections, rect, { x: .2, y: .5 });
  assert.ok(Math.abs(result.x - .6) < 1e-9 && Math.abs(result.y - .7) < 1e-9);
  assert.deepEqual(snapSectionPoint({ x: .64, y: .72 }, sections, rect, { x: .2, y: .5 }), { x: .64, y: .72 });
  assert.deepEqual(snapSectionPoint({ x: -.1, y: 1.1 }, [], rect), { x: 0, y: 1 });
});

test('score views keep valid page sections and reject malformed ones', () => {
  const view = validateScoreView({ version: 1, landscape: { zoom: 1, centerX: .5, centerY: .5 }, sections: [part('a', 1, .1, .1, .4, .1)] });
  assert.deepEqual(view.sections, [part('a', 1, .1, .1, .4, .1)]);
  assert.equal(validateScoreView({ version: 1, sections: [] }).sections, undefined);
  for (const bad of [part('b', 0, .1, .1, .4, .1), part('c', 1, .8, .1, .4, .1), part('d', 1, .1, .1, .001, .1), part('', 1, .1, .1, .4, .1), { ...part('e', 1, .1, .1, .4, .1), page: 1.5 }]) {
    assert.throws(() => validateScoreView({ version: 1, sections: [bad] }), /encuadre/);
  }
  assert.throws(() => validateScoreView({ version: 1, sections: [part('a', 1, 0, 0, .5, .1), part('a', 1, .5, 0, .5, .1)] }));
});

test('sections read top to bottom and left to right within a row', () => {
  const order = sortSections([part('lower', 1, 0, .4, 1, .1), part('right', 1, .5, .11, .5, .1), part('left', 1, 0, .1, .5, .1)]).map(s => s.id);
  assert.deepEqual(order, ['left', 'right', 'lower']);
});

test('a section fills the landscape frame and pads the rest', () => {
  // A full-width system on an A4 page in an 844x390 frame is limited by width, so white pads above and below.
  const wide = sectionLayout(part('s', 1, 0, .2, 1, .1), 595, 842, 844, 390);
  assert.equal(Math.round(wide.scale * 595), 844);
  assert.ok(wide.clip.top + wide.top > 0 && 390 - (wide.top + wide.height - wide.clip.bottom) > 0);
  // One bar is limited by height and centred horizontally.
  const bar = sectionLayout(part('b', 1, .1, .1, .2, .1), 595, 842, 844, 390);
  assert.ok(Math.abs(bar.scale * 842 * .1 - 390) < 1e-9);
  const visibleLeft = bar.left + bar.clip.left, visibleWidth = bar.width - bar.clip.left - bar.clip.right;
  assert.ok(Math.abs(visibleLeft + visibleWidth / 2 - 422) < 1e-9);
});
