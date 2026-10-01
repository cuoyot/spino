import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';

test('responsive frontend', { timeout: 120000 }, async (t) => {
  const { send, evaluate, errors, url } = await openBrowser(t);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    localStorage.clear();
    localStorage.setItem('sr.settings', JSON.stringify({ lang: 'es', naming: 'latin', templateId: 'l1', timeSig: '4/4' }));
    localStorage.setItem('sr.startedL1', '1');
    window.box = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    window.controlBoxes = () => Object.fromEntries(['open-settings', 'rank-pill', 'level-pill', 'midi-pill', 'bpm-down', 'bpm-up', 'q-clef', 'start', 'q-sound', 'kb-auto', 'guide-btn', 'finger-btn', 'key-scale', 'new-key'].map(id => [id, box(document.getElementById(id))]));
    window.settle = () => new Promise(r => setTimeout(r, 70));
    window.layoutProblems = () => {
      const problems = [];
      const overlaps = (a, b) => a.x < b.x + b.w - .5 && b.x < a.x + a.w - .5 && a.y < b.y + b.h - .5 && b.y < a.y + a.h - .5;
      const inside = (r) => r.x >= -.5 && r.y >= -.5 && r.x + r.w <= innerWidth + .5 && r.y + r.h <= innerHeight + .5;
      const controls = controlBoxes();
      for (const [id, rect] of Object.entries(controls)) {
        if (!inside(rect)) problems.push(id + ' outside viewport');
        if (rect.w < 35 || rect.h < 35) problems.push(id + ' too small');
      }
      for (const group of [Object.entries(controls).filter(([id]) => !['key-scale', 'new-key'].includes(id))]) {
        for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
          if (overlaps(group[i][1], group[j][1])) problems.push(group[i][0] + ' overlaps ' + group[j][0]);
        }
      }
      const feedback = box(document.querySelector('#feedback'));
      const hud = box(document.querySelector('.hud'));
      if (overlaps(feedback, hud)) problems.push('feedback overlaps statistics');
      for (const selector of ['header', 'main', '#staff-wrap', '#status-row', '#kb-bar']) {
        if (!inside(box(document.querySelector(selector)))) problems.push(selector + ' outside viewport');
      }
      if (document.documentElement.scrollWidth > innerWidth) problems.push('horizontal overflow');
      if (box(document.querySelector('#staff')).h < 90) problems.push('score too short');
      if (box(document.querySelector('#staff')).w < innerWidth * .85) problems.push('score too narrow');
      if (!document.querySelector('#piano').hidden) {
        for (const key of document.querySelectorAll('#piano .key')) {
          if (box(key).w < (key.classList.contains('white') ? 44 : 28) - .1) problems.push('piano key too narrow');
        }
      }
      return problems;
    };
  ` });
  const sizes = [[320, 568], [360, 640], [390, 844], [412, 915], [568, 320], [640, 360], [844, 390], [915, 412], [600, 960], [768, 1024], [820, 1180], [960, 600], [1024, 768], [1180, 820]];
  for (const [width, height] of sizes) {
    await t.test(`${width} × ${height}: controls, feedback and dialogs`, async () => {
      await send('Emulation.setDeviceMetricsOverride', { width, height, screenWidth: width, screenHeight: height, deviceScaleFactor: 1, mobile: true });
      await send('Page.navigate', { url });
      await evaluate(`new Promise(resolve => { const timer = setInterval(() => { if (window.__sr?.line && __sr.layout) { clearInterval(timer); settle().then(resolve); } }, 20); })`);
      const base = await evaluate('({ boxes: controlBoxes(), problems: layoutProblems(), device: document.documentElement.dataset.device, orientation: document.documentElement.dataset.orientation })');
      assert.equal(base.device, Math.min(width, height) < 600 ? 'phone' : 'tablet');
      assert.equal(base.orientation, width > height ? 'landscape' : 'portrait');
      assert.deepEqual(base.problems, []);
      for (const id of ['q-sound', 'q-sound', 'q-sound', 'guide-btn', 'guide-btn', 'guide-btn', 'finger-btn', 'finger-btn', 'q-clef', 'q-clef', 'q-clef', 'start', 'start', 'bpm-up']) {
        const result = await evaluate(`(async () => { document.getElementById('${id}').click(); await settle(); return { boxes: controlBoxes(), problems: layoutProblems() }; })()`);
        assert.deepEqual(result.problems, [], id);
        assert.deepEqual(result.boxes, base.boxes, `${id} shifted controls`);
      }
      const stress = await evaluate(`(() => {
        document.querySelectorAll('.hud b').forEach(el => el.textContent = '12345');
        document.querySelector('#feedback').textContent = 'Nota esperada: Sol sostenido 4';
        return layoutProblems();
      })()`);
      assert.deepEqual(stress, []);
      // All settings panels remain within the dialog, including long option text and translated tabs.
      await evaluate(`document.querySelector('#open-settings').click()`);
      for (const tab of ['levels', 'exercise', 'practice', 'general']) {
        const result = await evaluate(`(async () => {
          document.querySelector('[data-tab="${tab}"]').click(); await settle();
          const d = document.querySelector('#settings');
          const r = box(d);
          return { fits: r.x >= 0 && r.y >= 0 && r.x + r.w <= innerWidth && r.y + r.h <= innerHeight, overflow: d.scrollWidth > d.clientWidth + 1 };
        })()`);
        assert.ok(result.fits && !result.overflow, `${tab}: ${JSON.stringify(result)}`);
      }
      // Change the answer mode through the settings UI; the header/footer keep their slots.
      for (const mode of ['names', 'none', 'piano']) {
        const result = await evaluate(`(async () => {
          const d = document.querySelector('#settings'); if (!d.open) document.querySelector('#open-settings').click();
          const el = d.querySelector('[name="input"]'); el.value = '${mode}'; el.dispatchEvent(new Event('input', { bubbles: true }));
          d.close(); await settle();
          return { boxes: controlBoxes(), problems: layoutProblems() };
        })()`);
        assert.deepEqual(result.problems, [], mode);
        for (const id of ['open-settings', 'rank-pill', 'level-pill', 'midi-pill', 'q-clef', 'start', 'q-sound', 'kb-auto', 'guide-btn', 'finger-btn']) {
          assert.deepEqual(result.boxes[id], base.boxes[id], `${mode}: ${id} moved`);
        }
      }
      const scoreModes = await evaluate(`(async () => {
        document.querySelector('#open-settings').click();
        const d = document.querySelector('#settings');
        for (const [name, value] of [['pianoMode', true], ['hands', 'together'], ['layoutMode', 'page']]) {
          const el = d.querySelector('[name="' + name + '"]');
          if (el.type === 'checkbox') el.checked = value; else el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        d.close(); await settle();
        return { page: !!__sr.layout.page, together: __sr.line.together, problems: layoutProblems() };
      })()`);
      assert.deepEqual(scoreModes.problems, [], 'grand staff and page mode');
      assert.equal(scoreModes.page, base.device === 'tablet');
      assert.equal(scoreModes.together, base.device === 'tablet');
      const scale = await evaluate(`(async () => {
        document.querySelector('#key-scale').click(); await settle();
        const d = document.querySelector('#scale-dialog'), r = box(d);
        const result = { open: d.open, fits: r.x >= 0 && r.y >= 0 && r.x + r.w <= innerWidth && r.y + r.h <= innerHeight, overflow: d.scrollWidth > d.clientWidth + 1 };
        document.querySelector('#scale-close').click(); await settle();
        return result;
      })()`);
      assert.ok(scale.open && scale.fits && !scale.overflow, `scale dialog: ${JSON.stringify(scale)}`);
      if (process.env.UI_SCREENSHOTS && [[390, 844], [844, 390], [768, 1024], [1024, 768]].some(([w, h]) => w === width && h === height)) {
        await mkdir('artifacts/ui', { recursive: true });
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        await writeFile(`artifacts/ui/${width}x${height}.png`, Buffer.from(shot.data, 'base64'));
      }
    });
  }
  assert.deepEqual(errors, [], 'No frontend exceptions');
});
