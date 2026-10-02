import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openBrowser } from './browser.js';

test('reading stays on tempo and visually stable', { timeout: 60000 }, async (t) => {
  const { send, evaluate, errors, url } = await openBrowser(t);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, screenWidth: 390, screenHeight: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const nativeFrame = window.requestAnimationFrame.bind(window);
    window.settleLayout = () => new Promise(resolve => nativeFrame(() => nativeFrame(resolve)));
    let time = 1000, id = 0;
    const frames = new Map();
    performance.now = () => time;
    window.requestAnimationFrame = fn => { frames.set(++id, fn); return id; };
    window.cancelAnimationFrame = id => frames.delete(id);
    window.frameAt = at => {
      time = at;
      const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(time));
    };
    window.tap = midi => {
      const key = document.querySelector('#piano [data-midi="' + midi + '"]');
      if (!key) throw new Error('Key is outside the visible keyboard: ' + midi);
      key.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
      key.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    };
    window.position = () => {
      const { layout } = __sr;
      return { x: new DOMMatrix(getComputedStyle(layout.strip).transform).m41,
        staff: getComputedStyle(document.querySelector('#staff')).transform,
        animation: getComputedStyle(document.querySelector('#staff')).animationName };
    };
  ` });
  await send('Page.navigate', { url: url });
  await evaluate(`new Promise(resolve => { const id = setInterval(() => { if (window.__sr?.line && __sr.layout) { clearInterval(id); resolve(true); } }, 20); })`);
  await evaluate('settleLayout()');

  await t.test('correct, wrong and missed notes never reposition the staff', async () => {
    const result = await evaluate(`(async () => {
      __sr.settings.soundMode = 'off';
      __sr.settings.metronome = false;
      document.querySelector('#start').click();
      window.originalLine = __sr.line;
      frameAt(__sr.timed.t0);
      const before = position();
      const strip = __sr.layout.strip;
      tap(__sr.line.notes[0].midi);
      const afterCorrect = position();
      const correct = __sr.line.states[0];
      const wrongBefore = +document.querySelector('#s-wrong').textContent;
      const wrong = [...document.querySelectorAll('#piano .key')].find(k => +k.dataset.midi !== __sr.line.notes[1].midi);
      tap(+wrong.dataset.midi);
      await new Promise(r => setTimeout(r, 180));
      const afterWrong = position();
      const wrongCount = +document.querySelector('#s-wrong').textContent - wrongBefore;
      frameAt(performance.now() + 500);
      const halfBeat = position();
      const expected = 500 / (60000 / __sr.settings.bpm) * (__sr.layout.xOf(1) - __sr.layout.xOf(0));
      frameAt(__sr.timed.t0 + 3000);
      return { before, afterCorrect, afterWrong, correct, wrongCount, halfBeat, expected,
        sameStrip: strip === __sr.layout.strip, sameLine: originalLine === __sr.line,
        missed: __sr.line.states.includes('missed') };
    })()`);
    assert.equal(result.correct, 'correct');
    assert.deepEqual(result.afterCorrect, result.before);
    assert.deepEqual(result.afterWrong, result.before);
    assert.equal(result.before.staff, 'none');
    assert.equal(result.before.animation, 'none');
    assert.equal(result.wrongCount, 1);
    assert.ok(Math.abs(result.before.x - result.halfBeat.x - result.expected) < 0.11);
    assert.ok(result.sameLine && result.sameStrip && result.missed);
  });

  await t.test('tempo changes preserve notes and the current beat', async () => {
    const result = await evaluate(`(() => {
      const before = position();
      const states = [...__sr.line.states];
      const oldBpm = __sr.settings.bpm;
      document.querySelector('#bpm-up').click();
      frameAt(performance.now());
      const after = position();
      frameAt(performance.now() + 500);
      return { before, after, next: position(), oldBpm, bpm: __sr.settings.bpm,
        sameLine: originalLine === __sr.line, sameStates: JSON.stringify(states) === JSON.stringify(__sr.line.states),
        expected: 500 / (60000 / __sr.settings.bpm) * (__sr.layout.xOf(1) - __sr.layout.xOf(0)) };
    })()`);
    assert.deepEqual(result.before, result.after);
    assert.equal(result.bpm, result.oldBpm + 1);
    assert.ok(result.sameLine && result.sameStates);
    assert.ok(Math.abs(result.after.x - result.next.x - result.expected) < 0.11);
  });

  await t.test('moving the keyboard keeps the current exercise running', async () => {
    const result = await evaluate(`(() => {
      const clock = __sr.timed, before = position();
      const slider = document.querySelector('#kb-shift');
      slider.value = +slider.value + 1;
      slider.dispatchEvent(new Event('input'));
      slider.dispatchEvent(new Event('change'));
      return { sameLine: originalLine === __sr.line, sameClock: clock === __sr.timed, before, after: position() };
    })()`);
    assert.ok(result.sameLine && result.sameClock);
    assert.deepEqual(result.before, result.after);
  });

  await t.test('backgrounding does not skip or penalize notes on return', async () => {
    const result = await evaluate(`(() => {
      const before = position(), states = JSON.stringify(__sr.line.states);
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
      frameAt(performance.now() + 60000);
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
      frameAt(performance.now());
      return { before, after: position(), sameStates: states === JSON.stringify(__sr.line.states) };
    })()`);
    assert.deepEqual(result.before, result.after);
    assert.ok(result.sameStates);
  });

  await t.test('long practice redraws retain complete bars and clock alignment', async () => {
    const result = await evaluate(`(() => {
      const failures = [];
      let redraws = 0, strip = __sr.layout.strip;
      for (let i = 0; i < 480; i++) {
        frameAt(performance.now() + 250);
        const { layout, line, timed, settings } = __sr;
        if (strip !== layout.strip) { redraws++; strip = layout.strip; }
        if (layout.from && line.notes[layout.from - 1].bar === line.notes[layout.from].bar) failures.push('partial bar');
        const beat = (performance.now() - timed.t0) / (60000 / settings.bpm);
        if (Math.abs(position().x - (layout.readX - layout.xOf(beat))) > .11) failures.push('clock drift');
      }
      return { failures, redraws, sameLine: originalLine === __sr.line };
    })()`);
    assert.deepEqual(result.failures, []);
    assert.ok(result.redraws >= 3);
    assert.ok(result.sameLine);
  });

  await t.test('unchanged notes do not get rewritten every frame', async () => {
    const result = await evaluate(`(() => {
      const observer = new MutationObserver(() => {});
      observer.observe(document.querySelector('#staff'), { subtree: true, attributes: true, attributeFilter: ['class'] });
      for (let i = 0; i < 10; i++) frameAt(performance.now());
      const count = observer.takeRecords().length;
      observer.disconnect();
      return count;
    })()`);
    assert.equal(result, 0);
  });

  await t.test('redrawing after stop preserves the frozen beat', async () => {
    const result = await evaluate(`(() => {
      document.querySelector('#start').click();
      const before = position();
      document.querySelector('#finger-btn').click();
      return { before, after: position(), stopped: __sr.timed === null };
    })()`);
    assert.deepEqual(result.before, result.after);
    assert.ok(result.stopped);
  });

  await t.test('rotating a stopped phone keeps the same notes and musical position', async () => {
    const before = await evaluate(`({ beat: (__sr.layout.readX - position().x - __sr.layout.xOf(0)) / (__sr.layout.xOf(1) - __sr.layout.xOf(0)) })`);
    await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, screenWidth: 844, screenHeight: 390, deviceScaleFactor: 1, mobile: true });
    const after = await evaluate(`new Promise(resolve => setTimeout(() => resolve({
      beat: (__sr.layout.readX - position().x - __sr.layout.xOf(0)) / (__sr.layout.xOf(1) - __sr.layout.xOf(0)),
      sameLine: originalLine === __sr.line
    }), 100))`);
    assert.ok(after.sameLine);
    assert.ok(Math.abs(before.beat - after.beat) < 0.002);
  });

  await t.test('whole notes sustain their duration even after being answered', async () => {
    const result = await evaluate(`(() => {
      __sr.settings.figures = { w: true, h: false, q: false, e: false, s: false };
      document.querySelector('#new-key').click();
      document.querySelector('#start').click();
      frameAt(__sr.timed.t0);
      const before = position();
      tap(__sr.line.notes[0].midi);
      const answered = position();
      const duration = __sr.line.onsets[1] - __sr.line.onsets[0];
      frameAt(performance.now() + 60000 / __sr.settings.bpm);
      const expected = __sr.layout.xOf(1) - __sr.layout.xOf(0);
      return { before, answered, next: position(), duration, expected, nextState: __sr.line.states[1] };
    })()`);
    assert.equal(result.duration, 4);
    assert.deepEqual(result.before, result.answered);
    assert.ok(Math.abs(result.answered.x - result.next.x - result.expected) < .11);
    assert.ok(['pending', 'current'].includes(result.nextState));
  });
  assert.deepEqual(errors, [], 'No browser exceptions');
});
