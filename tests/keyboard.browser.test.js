import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openBrowser } from './browser.js';

test('keyboard touch zoom preserves practice', { timeout: 60000 }, async (t) => {
  const { send, evaluate, errors, url } = await openBrowser(t);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, screenWidth: 390, screenHeight: 844, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  await send('Page.navigate', { url });
  const ready = () => evaluate(`new Promise(resolve => { const timer = setInterval(() => { if (window.__sr?.layout && __sr.line) { clearInterval(timer); resolve(true); } }, 20); })`);
  await ready();
  await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  await evaluate(`
    __sr.settings.soundMode = 'off'; __sr.settings.metronome = false;
    document.querySelector('#start').click();
    __sr.timed.t0 = performance.now() + 100000;
    window.beforePinch = { line: __sr.line, t0: __sr.timed.t0, strip: __sr.layout.strip, width: document.querySelector('#piano .white').getBoundingClientRect().width };
  `);
  const gesture = async (start, end, type = 'touchEnd') => {
    const rect = await evaluate(`(() => { const r = document.querySelector('#piano .keys').getBoundingClientRect(); return { x: r.x, y: r.y + r.height * .85, w: r.width }; })()`);
    const points = (xs) => xs.map((x, id) => ({ id, x: rect.x + x * rect.w, y: rect.y }));
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(start) });
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(end) });
    await evaluate('new Promise(requestAnimationFrame)');
    await send('Input.dispatchTouchEvent', { type, touchPoints: [] });
    await evaluate('new Promise(r => setTimeout(r, 180))');
  };
  const state = () => evaluate(`({
    zoom: __sr.settings.kbZoom, lo: __sr.settings.kbLo,
    width: document.querySelector('#piano .white').getBoundingClientRect().width,
    originalWidth: beforePinch.width,
    sameLine: beforePinch.line === __sr.line,
    sameClock: beforePinch.t0 === __sr.timed?.t0,
    sameScore: beforePinch.strip === __sr.layout.strip,
    wrong: +document.querySelector('#s-wrong').textContent
  })`);
  await t.test('pinching enlarges keys without moving or restarting the score', async () => {
    await gesture([.35, .65], [.15, .85]);
    const result = await state();
    assert.ok(result.zoom > 2 && result.zoom <= 2.5);
    assert.ok(result.width > result.originalWidth);
    assert.ok(result.sameLine && result.sameClock && result.sameScore, JSON.stringify(result));
    assert.equal(result.wrong, 0);
  });
  await t.test('parallel two-finger movement pans without changing zoom', async () => {
    const before = await state();
    await gesture([.2, .55], [.4, .75]);
    const after = await state();
    assert.equal(after.zoom, before.zoom);
    assert.ok(after.lo < before.lo);
    assert.ok(after.sameLine && after.sameClock && after.sameScore, JSON.stringify(after));
    assert.equal(after.wrong, 0);
  });
  await t.test('pinching inward cannot make keys smaller than the minimum', async () => {
    await gesture([.15, .85], [.45, .55]);
    const result = await state();
    assert.equal(result.zoom, 1);
    assert.ok(result.width >= 44);
    assert.ok(result.sameLine && result.sameClock && result.sameScore, JSON.stringify(result));
    assert.equal(result.wrong, 0);
  });
  await t.test('zoom persists after reload and has a settings control', async () => {
    await gesture([.35, .65], [.2, .8]);
    const zoom = (await state()).zoom;
    await send('Page.reload');
    await ready();
    const result = await evaluate(`(() => {
      document.querySelector('#open-settings').click();
      const el = document.querySelector('[name="kbZoom"]');
      const restored = __sr.settings.kbZoom;
      el.value = '1'; el.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#settings').close();
      return { restored, reset: __sr.settings.kbZoom, stored: JSON.parse(localStorage.getItem('sr.settings')).kbZoom };
    })()`);
    assert.equal(result.restored, zoom);
    assert.equal(result.reset, 1);
    assert.equal(result.stored, 1);
  });
  await t.test('pinching from the expected key while stopped does not start the piece', async () => {
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const first = await evaluate(`(() => {
      window.idleLine = __sr.line;
      const r = document.querySelector('#piano .keys').getBoundingClientRect();
      const key = document.querySelector('#piano [data-midi="' + __sr.line.notes[0].midi + '"]').getBoundingClientRect();
      return (key.x + key.width / 2 - r.x) / r.width;
    })()`);
    await gesture([first, first > .5 ? .2 : .8], first > .5 ? [Math.min(.98, first + .1), .05] : [Math.max(.02, first - .1), .95]);
    const result = await evaluate(`({ stopped: __sr.timed === null, sameLine: idleLine === __sr.line, zoom: __sr.settings.kbZoom })`);
    assert.ok(result.stopped && result.sameLine);
    assert.ok(result.zoom > 1);
  });
  assert.deepEqual(errors, []);
});
