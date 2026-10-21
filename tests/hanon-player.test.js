import test from 'node:test';
import assert from 'node:assert/strict';
import { bindHanonAnimation, warmupAnimationMarkup, warmupAnimationPosterMarkup } from '../src/companion/hanon-animation.js';

test('complete video guide preserves score seeking, slow playback, retry and decoder cleanup', async t => {
  const keys = ['document', 'fetch', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const originals = Object.fromEntries(keys.map(k => [k, globalThis[k]]));
  t.after(() => keys.forEach(k => originals[k] === undefined ? delete globalThis[k] : globalThis[k] = originals[k]));
  const document = globalThis.document = new EventTarget();
  globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = () => {};
  const events = [[21, 5, 28, 1, 0, 0], [23, 4, 30, 2, 1, 7]];
  const frames = Array.from({ length: 12 }, (_, n) => [n < 6 ? 0 : 1, n !== 11 ? 1 : 0]);
  globalThis.fetch = async path => ({ ok: true, json: async () => path.endsWith('index.json')
    ? { width: 720, height: 400, revision: 'complete-video' }
    : { fps: 24, events, frames, videos: Object.fromEntries(['left', 'right', 'both'].map(h => [h, { file: `videos/hanon-1-${h}.mp4` }])) } });
  const makeRoot = () => {
    const nodes = new Map(); let time = 0;
    const video = new EventTarget(); video.paused = true; video.videoWidth = 720; video.videoHeight = 400;
    Object.defineProperty(video, 'currentTime', { get: () => time, set: value => { time = value; queueMicrotask(() => video.dispatchEvent(new Event('seeked'))); } });
    video.load = () => { video.loads = (video.loads || 0) + 1; if (video.src) queueMicrotask(() => video.dispatchEvent(new Event('loadeddata'))); };
    video.pause = () => { if (!video.paused) { video.paused = true; video.dispatchEvent(new Event('pause')); } };
    video.play = async () => { video.paused = false; };
    video.requestVideoFrameCallback = fn => { video.frameCallback = fn; return 1; };
    video.cancelVideoFrameCallback = () => { video.frameCallback = null; };
    video.emitFrame = value => { time = value; const fn = video.frameCallback; video.frameCallback = null; fn?.(0, { mediaTime: value }); };
    video.removeAttribute = name => { delete video[name]; };
    nodes.set('video', video);
    return { dataset: {}, querySelector(selector) { if (!nodes.has(selector)) { const n = new EventTarget(); n.value = '1'; nodes.set(selector, n); } return nodes.get(selector); } };
  };
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const root = makeRoot(), delivered = [], close = bindHanonAnimation(root, { id: 'hanon-1' }, { hand: 'right', onEvent: e => delivered.push(e) });
  await flush(); assert.equal(root.dataset.ready, 'true');
  const video = root.querySelector('video'); assert.match(video.src, /hanon-video-v1\/videos\/hanon-1-right.mp4$/);
  assert.equal(root.dataset.frame, 3); assert.equal(root.querySelector('[data-ha-right]').textContent, '1 · C4');
  root.querySelector('[data-ha-next]').dispatchEvent(new Event('click')); await flush(); assert.equal(root.dataset.frame, 6);
  assert.equal(delivered.at(-1).eventIndex, 1);
  const speed = root.querySelector('[data-ha-speed]'); speed.value = '.5'; speed.dispatchEvent(new Event('change')); assert.equal(video.playbackRate, .5);
  await root.hanonPlayer.seek(1000); assert.equal(root.dataset.frame, 11); assert.equal(root.dataset.pressed, false);
  root.querySelector('[data-ha-play]').dispatchEvent(new Event('click')); await flush(); assert.equal(root.dataset.frame, 0); assert.equal(root.dataset.playing, 'true');
  document.hidden = true; document.dispatchEvent(new Event('visibilitychange')); assert.equal(video.paused, true);
  video.dispatchEvent(new Event('error')); assert.equal(root.querySelector('[data-ha-retry]').hidden, false);
  root.querySelector('[data-ha-retry]').dispatchEvent(new Event('click')); await flush(); assert.equal(root.querySelector('[data-ha-retry]').hidden, true);
  document.hidden = false;
  await root.hanonPlayer.seek(0); root.querySelector('[data-ha-play]').dispatchEvent(new Event('click')); await flush();
  // A blocked JS thread lets the decoder jump past a complete unshown note.
  // The controller must rewind the media, not synthesize unseen note callbacks.
  video.emitFrame(10 / 24); await flush(); await flush();
  assert.equal(root.dataset.frame, 0); assert.equal(video.currentTime, 0); assert.equal(video.paused, false); assert.equal(root.dataset.playing, 'true');
  video.emitFrame(10 / 24); await flush(); assert.equal(root.dataset.event, 1);
  video.ended = true; video.pause(); video.dispatchEvent(new Event('ended')); await flush();
  assert.equal(root.dataset.frame, 11); assert.equal(root.dataset.playing, 'false');
  video.ended = false;
  const pending = root.hanonPlayer.seek(4); close(); await pending; assert.equal(root.hanonPlayer, undefined); assert.equal(video.src, undefined); assert.equal(video.paused, true); assert.ok(video.loads >= 3);
  assert.match(warmupAnimationPosterMarkup({ id: 'hanon-10' }), /hanon-video-v1\/posters\/hanon-10-both/);
  assert.match(warmupAnimationMarkup({ id: 'hanon-1' }), /<video[^>]+playsinline/);
});
