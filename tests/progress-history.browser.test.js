import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { openBrowser } from './browser.js';
import { historyFixture } from './progress-history-fixture.js';

const folder = process.env.HISTORY_CAPTURE;
test('visual history renders local scores, prominent optional moods and opens stable session IDs without writing assets', { timeout: 90000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>1000){clearInterval(timer);reject(Error('History review timeout: '+${JSON.stringify(condition)}))}},20)})`);
  const { data, assets } = historyFixture(), frames = [];
  await send('Page.navigate', { url }); await wait(`document.querySelector('.cp-today')`);
  await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');for(const asset of ${JSON.stringify(assets)})tx.objectStore('assets').put(asset);tx.oncomplete=()=>{db.close();resolve()}}})`);
  await send('Page.reload'); await wait(`document.querySelector('.cp-today')`);
  await evaluate(`document.querySelector('.cp-nav [data-action=progress]').click();document.querySelector('.cp-history').previousElementSibling.scrollIntoView({block:'start'})`);
  await wait(`document.querySelector('[data-score-thumbnail="history-pdf"] img')?.complete`);
  await evaluate(`document.querySelector('[data-score-thumbnail="history-mxl"]').scrollIntoView({block:'center'})`);
  await wait(`document.querySelector('[data-score-thumbnail="history-mxl"] img')?.naturalWidth>0`);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-history-card').length`), 5);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-history-mood').length`), 4);
  assert.equal(await evaluate(`document.querySelector('[data-id="history-session-2"] .cp-history-mood')`), null);
  assert.equal(await evaluate(`document.querySelector('[data-id="history-session-2"] .cp-history-types').children.length`), 2);
  assert.equal(await evaluate(`document.querySelector('[data-id="history-session-3"] .cp-history-duration').textContent`), '1 hr 30 min');
  assert.equal(await evaluate(`document.querySelector('[data-id="history-session-4"] .cp-history-pieces').textContent`), data.works[2].title);
  await evaluate(`document.querySelector('[data-score-thumbnail="missing-score"]').scrollIntoView({block:'center'})`);
  assert.equal(await evaluate(`!!document.querySelector('[data-score-thumbnail="missing-score"] svg')`), true);
  if (folder) { await mkdir(folder, { recursive: true }); await writeFile(folder + '/fixture.json', JSON.stringify(data, null, 2)); await writeFile(folder + '/assets.json', JSON.stringify(assets, null, 2)); }
  for (const theme of ['light', 'dark']) for (const [width, height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
    await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)};document.querySelector('.cp-history').previousElementSibling.scrollIntoView({block:'start'})`);
    assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth<=document.querySelector('.cp-page').clientWidth+1`), true);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('.cp-history-open')).every(button=>button.scrollWidth<=button.clientWidth+1)`), true);
    assert.equal(await evaluate(`parseFloat(getComputedStyle(document.querySelector('.cp-history-face')).fontSize)>=32`), true);
    if (folder) { const file = `${theme}-${width}x${height}.png`, shot = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(folder + '/' + file, Buffer.from(shot.data, 'base64')); frames.push({ file, theme, width, height }); }
  }
  await evaluate(`document.querySelector('[data-id="history-session-1"]').focus()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await wait(`document.querySelector('[data-view="session-detail"]')`);
  assert.equal(await evaluate(`document.querySelector('[data-action=edit-saved-practice]').dataset.id`), 'history-session-1');
  const stored = await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets']),a=tx.objectStore('assets').getAll(),s=tx.objectStore('state').get('current');tx.oncomplete=()=>{db.close();resolve({data:s.result,assets:a.result})}}})`);
  assert.deepEqual(stored.data, data); assert.deepEqual(stored.assets.sort((a,b)=>a.id.localeCompare(b.id)), assets.sort((a,b)=>a.id.localeCompare(b.id)));
  assert.deepEqual(errors, []);
  if (folder) {
    const sourceHashes = {};
    for (const path of ['src/companion/app.js','src/companion/progress-history.js','src/companion/progress-history.css','src/companion/score-thumbnail.js','tests/progress-history.browser.test.js','tests/progress-history-fixture.js']) sourceHashes[path] = createHash('sha256').update(await readFile(path)).digest('hex');
    await writeFile(folder + '/metadata.json', JSON.stringify({ capturedAt: new Date().toISOString(), kind: 'responsive-browser', nativeAcceptance: false, gitHead: execFileSync('git', ['rev-parse','HEAD'], {encoding:'utf8'}).trim(), build: 'Vite production build', buildIndexSha256: createHash('sha256').update(await readFile('dist/index.html')).digest('hex'), sourceHashes, frames, runtimeErrors: errors, notebookUnchanged: true, assetsUnchanged: true }, null, 2));
  }
});
