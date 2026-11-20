import test from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser } from './browser.js';

async function openClock(t) {
  const browser = await openBrowser(t, { rootDirectory: '.' });
  await browser.send('Page.navigate', { url: new URL('/tests/fixtures/clock-display.html', browser.url).href });
  await browser.evaluate(`(async () => {
    while (!window.updateClockDisplay) await new Promise(resolve => setTimeout(resolve, 10));
    await document.fonts.ready;
    window.clock = document.getElementById('clock');
    window.frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.format = ms => Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0');
    window.block = ms => { const end = performance.now() + ms; while (performance.now() < end) {} };
    window.origin = performance.now() - 58800;
    window.running = true;
    window.elapsed = () => running ? performance.now() - origin : window.pausedAt;
    window.draw = () => { const ms = elapsed(); updateClockDisplay(clock, format(ms), ms, running); };
    window.sample = () => ({
      elapsed: elapsed(),
      readable: clock.querySelector('.clock-readable').textContent,
      visible: [...clock.querySelector('.clock-digits').children].map(digit => {
        if (digit.dataset.symbol) return digit.dataset.symbol;
        const track = digit.firstElementChild, style = getComputedStyle(track);
        const row = Math.round(-new DOMMatrixReadOnly(style.transform).m42 / parseFloat(style.fontSize));
        return track.dataset.track.split('\\n')[row];
      }).join(''),
      animations: [...clock.querySelectorAll('.clock-track')].map(track => {
        const animation = track.getAnimations()[0];
        const duration = animation.effect.getTiming().duration;
        const difference = (animation.currentTime - elapsed()) % duration;
        const phaseError = (difference + duration * 1.5) % duration - duration / 2;
        return { phaseError, state: animation.playState };
      })
    });
    draw(); await frames();
  })()`);
  return browser;
}

test('a delayed frame must not count a blocked interval twice or rewind the visible digits', { timeout: 15000 }, async t => {
  const { evaluate, errors } = await openClock(t);
  const result = await evaluate(`(async () => {
    const before = sample();
    block(1800); draw();
    const during = sample();
    await frames();
    const after = sample();
    draw(); await frames();
    return { before, during, after, refreshed: sample() };
  })()`);
  assert.ok(result.during.elapsed - result.before.elapsed >= 1800, 'The UI thread really was blocked.');
  for (const state of [result.after, result.refreshed]) {
    assert.equal(state.visible, '1:00', 'Read the transformed digit rows, rather than only the hidden text.');
    for (const animation of state.animations) assert.ok(Math.abs(animation.phaseError) < 80, JSON.stringify(state));
  }
  assert.equal(result.after.visible, result.refreshed.visible, 'Refreshing must not rewind the rendered clock.');
  assert.deepEqual(errors, []);
});

test('pause, resume and digit-width rollover retain the correct time for every visible digit', { timeout: 15000 }, async t => {
  const { evaluate, errors } = await openClock(t);
  const result = await evaluate(`(async () => {
    block(400); pausedAt = elapsed(); running = false; draw(); await frames();
    const paused = sample();
    await new Promise(resolve => setTimeout(resolve, 250));
    const stillPaused = sample();
    block(400); origin = performance.now() - pausedAt; running = true; draw(); await frames();
    const resumed = sample();
    // Rebuild from m:ss to mm:ss while the document timeline is stale.
    block(400); origin = performance.now() - 600100; draw(); await frames();
    return { paused, stillPaused, resumed, rollover: sample() };
  })()`);
  assert.equal(result.paused.visible, result.stillPaused.visible);
  for (const animation of result.stillPaused.animations) {
    assert.equal(animation.state, 'paused');
    assert.ok(Math.abs(animation.phaseError) < 1);
  }
  for (const state of [result.resumed, result.rollover]) {
    for (const animation of state.animations) {
      assert.equal(animation.state, 'running');
      assert.ok(Math.abs(animation.phaseError) < 80, JSON.stringify(state));
    }
  }
  assert.equal(result.rollover.visible, '10:00');
  assert.deepEqual(errors, []);
});
