import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { openBrowser } from './browser.js';
import { workDetailFixture } from './work-detail-fixture.js';

const folder = process.env.WORK_DETAIL_CAPTURE;
test('work actions and every saved-session summary share the Progress card without changing notebook or scores', { timeout: 120000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>800){clearInterval(timer);reject(Error('Work review timeout: '+${JSON.stringify(condition)}))}},20)})`);
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const fixture = workDetailFixture(), { data, assets } = fixture, frames = [];
  await send('Page.navigate', { url }); await wait(`document.querySelector('.cp-today')`);
  await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');for(const asset of ${JSON.stringify(assets)})tx.objectStore('assets').put(asset);tx.oncomplete=()=>{db.close();resolve()}}})`);
  await send('Page.reload'); await wait(`document.querySelector('.cp-today')`);
  const card = '[data-action="session-detail"][data-id="history-session-1"]';
  const summary = () => evaluate(`(()=>{const card=document.querySelector('${card}');return ['.cp-history-title','time','.cp-history-pieces','.cp-history-face','.cp-history-types','.cp-history-duration','.cp-history-link'].map(selector=>card.querySelector(selector)?.textContent)})()`);
  const openWork = async () => { await click('.cp-nav [data-action=piano]'); await click('.cp-library-navigation [data-action=repertoire]'); await click('[data-action=work-detail][data-id=history-prelude]'); await wait(`document.querySelector('.cp-work-page')`); };
  await click('.cp-nav [data-action=progress]');
  const expected = await summary();
  await openWork(); assert.deepEqual(await summary(), expected);
  assert.match(await evaluate(`document.querySelector('${card} .cp-work-part').textContent`), /Bars 9–16/);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-work-primary button').length`), 2);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-work-resources .cp-work-resource').length`), 2);
  assert.equal(await evaluate(`document.querySelector('[data-action=delete-work]').closest('details').open`), false);
  await click('.cp-work-menu summary');
  await evaluate(`document.querySelector('.cp-work-menu summary').focus()`);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  assert.equal(await evaluate(`document.querySelector('.cp-work-menu').open`), false);
  await click('.cp-work-menu summary'); await click('[data-action=edit-work]');
  assert.equal(await evaluate(`document.querySelector('#cp-dialog [name=title]').value`), 'Balada Para Adelina');
  await click('#cp-dialog [data-action=close-dialog]');
  for (const action of ['practice-work', 'plan-work']) {
    await click(`[data-action=${action}]`); await wait(`document.querySelector('#prepare-form')`);
    assert.equal(await evaluate(`document.querySelector('#prepare-form [name=workId]')?.value === 'history-prelude' || document.querySelector('#prepare-form [name="workId-0"]')?.value === 'history-prelude' || document.querySelector('#prepare-form').textContent.includes('Balada Para Adelina')`), true);
    await openWork();
  }
  await click('[data-action=work-media]'); await wait(`document.querySelector('[data-view=multimedia]')`); await openWork();
  if (folder) { await mkdir(folder, { recursive: true }); await writeFile(folder + '/fixture.json', JSON.stringify(fixture, null, 2)); }
  const capture = async state => {
    for (const theme of ['light','dark']) for (const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)};document.querySelector('.cp-page').scrollTop=0`);
      if (state !== 'work') await evaluate(`document.querySelector('${card}').scrollIntoView({block:'center'})`);
      assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth<=document.querySelector('.cp-page').clientWidth+1`), true, state + ' page ' + width);
      assert.equal(await evaluate(`[...document.querySelectorAll('.cp-history-open')].every(b=>b.scrollWidth<=b.clientWidth+1)`), true, state + ' cards ' + width);
      if (state === 'work') {
        assert.equal(await evaluate(`[...document.querySelectorAll('.cp-work-primary button,.cp-work-resource button,.cp-work-menu summary')].every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44&&b.scrollWidth<=b.clientWidth+1})`), true, 'Action targets ' + width);
      }
      if (folder) { const file = `${state}-${theme}-${width}x${height}.png`, shot = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(folder + '/' + file, Buffer.from(shot.data,'base64')); frames.push({ file, state, theme, width, height }); }
    }
  };
  await capture('work');
  await evaluate(`document.querySelector('${card}').scrollIntoView({block:'center'})`);
  await wait(`document.querySelector('${card} [data-score-thumbnail] img')?.naturalWidth>0`);
  if (folder) { const shot = await send('Page.captureScreenshot',{format:'png'}); await writeFile(folder+'/work-shared-session.png',Buffer.from(shot.data,'base64')); }
  await click('.cp-nav [data-action=home]'); assert.deepEqual(await summary(), expected);
  assert.match(await evaluate(`document.querySelector('${card} .cp-history-note').textContent`), /Keep the melody/);
  await capture('today');
  await click('.cp-nav [data-action=calendar]'); assert.deepEqual(await summary(), expected);
  assert.equal(await evaluate(`document.querySelectorAll('[data-entry-id=work-review-plan]').length`), 1);
  await capture('calendar');
  // Month and Week both use the same renderer; the completed plan is never duplicated.
  await click('[data-action=calendar-mode][data-id=month]');
  await click(`[data-action=select-day][data-id="${data.sessions.find(s=>s.id==='history-session-1').date}"]`);
  assert.deepEqual(await summary(), expected);
  await click(card); await wait(`document.querySelector('[data-view=session-detail]')`);
  assert.equal(await evaluate(`document.querySelector('[data-action=edit-saved-practice]').dataset.id`), 'history-session-1');
  await click('.cp-nav [data-action=calendar]');
  await click('[data-action=calendar-mode][data-id=week]');
  await click('[data-action=plan-detail][data-id=work-review-moved-plan]');
  assert.equal(await evaluate(`document.querySelector('#cp-dialog .cp-history-open').dataset.id`), 'history-session-2');
  await click('#cp-dialog [data-action=close-dialog]');
  await click('.cp-nav [data-action=progress]');
  await click('[data-action=target-history]');
  assert.equal(await evaluate(`document.querySelector('#cp-dialog .cp-history-open')?.dataset.action`), 'session-detail');
  await evaluate(`document.querySelector('#cp-dialog .cp-history-open').scrollIntoView({block:'center'})`);
  if (folder) { const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/target-dialog.png',Buffer.from(shot.data,'base64')); }
  await click('#cp-dialog .cp-history-open'); await wait(`document.querySelector('[data-view=session-detail]')`);
  assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`), false);
  const stored=await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets']),a=tx.objectStore('assets').getAll(),s=tx.objectStore('state').get('current');tx.oncomplete=()=>{db.close();resolve({data:s.result,assets:a.result})}}})`);
  assert.deepEqual(stored.data,data); assert.deepEqual(stored.assets.sort((a,b)=>a.id.localeCompare(b.id)),assets.sort((a,b)=>a.id.localeCompare(b.id))); assert.deepEqual(errors,[]);
  if (folder) {
    const sourceHashes={};
    for (const path of ['src/companion/app.js','src/companion/work-detail.js','src/companion/work-detail.css','src/companion/saved-session-card.js','src/companion/saved-session-card.css','src/companion/agenda.js','tests/work-detail.browser.test.js','tests/work-detail-fixture.js']) sourceHashes[path]=createHash('sha256').update(await readFile(path)).digest('hex');
    await writeFile(folder+'/metadata.json',JSON.stringify({capturedAt:new Date().toISOString(),kind:'responsive-browser',nativeAcceptance:false,gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),buildIndexSha256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex'),sourceHashes,frames,notebookUnchanged:true,assetsUnchanged:true,runtimeErrors:errors},null,2));
  }
});
