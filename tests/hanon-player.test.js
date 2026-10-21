import test from 'node:test';
import assert from 'node:assert/strict';
import { bindHanonAnimation, warmupAnimationPosterMarkup } from '../src/companion/hanon-animation.js';

test('reviewed No. 1 plays native both-hand frames, solo frames and legacy exercises without mixing caches', async t => {
  const originals = Object.fromEntries(['document', 'fetch', 'createImageBitmap', 'requestAnimationFrame', 'cancelAnimationFrame'].map(key => [key, globalThis[key]]));
  t.after(() => { for (const [key, value] of Object.entries(originals)) value === undefined ? delete globalThis[key] : globalThis[key] = value; });
  const requests = [], bitmaps = [], drawings = [];
  let callback, gradients = 0;
  globalThis.document = new EventTarget();
  globalThis.requestAnimationFrame = next => { callback = next; return 1; };
  globalThis.cancelAnimationFrame = () => {};
  const index = reviewed => ({ width: 1080, height: 600, revision: reviewed ? 'reviewed' : 'legacy', bakedKeys: reviewed,
    keyboard: 'keyboard.webp', board: { left: 34, keyWidth: 44, firstDiatonic: 19, top: 60, bottom: 350, blackBottom: 205 },
    packs: Array.from({ length: 12 }, (_, i) => ({ file: `pack-${i}.webp` })),
    sprites: Array.from({ length: 12 }, (_, i) => [i, 0, 0, 100, 100, 10, 20, 100, 100]) });
  const animation = reviewed => ({ fps: 24, composition: reviewed ? 'single-mode-sprite' : undefined,
    events: [[21, 5, 28, 1, 0, 0], [23, 4, 30, 2, 0, 0]],
    frames: Array.from({ length: 12 }, (_, i) => [i < 6 ? 0 : 1, i !== 11 ? 1 : 0, 0, 0, 0, 1, 0, 0]),
    both: Array.from({ length: 12 }, (_, i) => i) });
  globalThis.fetch = async path => {
    requests.push(path); const reviewed = path.includes('-v2/');
    return { ok: true, json: async () => path.endsWith('index.json') ? index(reviewed) : animation(reviewed), blob: async () => ({ path }) };
  };
  globalThis.createImageBitmap = async ({ path }) => { const bitmap = { path, closed: false, close() { this.closed = true; } }; bitmaps.push(bitmap); return bitmap; };
  function root() {
    const elements = new Map();
    const context = { clearRect() {}, drawImage(bitmap) { assert.ok(bitmap && !bitmap.closed); drawings.push(bitmap.path); }, createLinearGradient() { gradients++; return { addColorStop() {} }; } };
    for (const name of ['beginPath', 'moveTo', 'lineTo', 'closePath', 'fill']) context[name] = () => {};
    const result = { dataset: {}, querySelector(selector) {
      if (!elements.has(selector)) { const element = new EventTarget(); element.getContext = () => context; elements.set(selector, element); }
      return elements.get(selector);
    } };
    return result;
  }
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const both = root(), dispose = bindHanonAnimation(both, { id: 'hanon-1' });
  await flush(); assert.equal(both.dataset.ready, 'true');
  assert.equal(both.dataset.assetRevision, 'reviewed');
  assert.ok(drawings.at(-1).endsWith('pack-3.webp'));
  assert.equal(gradients, 0, 'Native key motion must not receive an extra procedural highlight');
  assert.equal(both.querySelector('[data-ha-left]').textContent, '5 · C3');
  assert.equal(both.querySelector('[data-ha-right]').textContent, '1 · C4');
  for (let frame = 0; frame < 12; frame++) { await both.hanonPlayer.seek(frame); await flush(); }
  assert.equal(both.dataset.pressed, false);
  assert.ok(bitmaps.filter(bitmap => bitmap.path.includes('pack-') && !bitmap.closed).length <= 8);
  both.querySelector('[data-ha-play]').dispatchEvent(new Event('click'));
  await flush(); await callback(performance.now() + 100);
  assert.equal(both.dataset.playing, 'true');
  dispose(); await flush(); assert.ok(bitmaps.every(bitmap => bitmap.closed));
  assert.equal(both.hanonPlayer, undefined);

  const solo = root(), disposeSolo = bindHanonAnimation(solo, { id: 'hanon-1' }, { hand: 'right' });
  await flush(); assert.ok(drawings.at(-1).endsWith('pack-1.webp')); disposeSolo();
  const legacy = root(), disposeLegacy = bindHanonAnimation(legacy, { id: 'hanon-2' });
  await flush(); assert.equal(legacy.dataset.assetRevision, 'legacy'); assert.ok(gradients > 0); disposeLegacy();
  assert.ok(requests.some(path => path.includes('hanon-frames-v3/exercises/hanon-2.json')));
  assert.ok(requests.some(path => path.includes('hanon-frames-v2/exercises/hanon-1.json')));
  assert.match(warmupAnimationPosterMarkup({ id: 'hanon-1' }), /hanon-frames-v2/);
  assert.match(warmupAnimationPosterMarkup({ id: 'hanon-2' }), /hanon-frames-v3/);
});
