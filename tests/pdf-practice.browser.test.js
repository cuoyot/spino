import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser, disableWarmup } from './browser.js';
import { scorePDF } from './pdf-fixture.js';

test('immersive PDF practice, pause-only tools, fingering and saved framing', { timeout: 120000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve(true);}else if(++n>700){clearInterval(timer);reject(Error('Timeout: '+${JSON.stringify(expression)}));}},20);})`);
  const action = name => evaluate(`document.querySelector('[data-action="${name}"]').click()`);
  const control = name => evaluate(`document.querySelector('[data-pdf="${name}"]').click()`);
  const ready = () => wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);
  const saved = () => wait(`document.querySelector('.pdf-save-state')?.textContent==='Anotaciones guardadas en el dispositivo.'`);
  const read = (store, key) => evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('${store}').objectStore('${store}').get(${JSON.stringify(key)});q.onsuccess=()=>{resolve(q.result);db.close();};};})`);
  const tap = async (x, y) => {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const paper = () => evaluate(`(()=>{const r=document.querySelector('.pdf-paper').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`);
  const frame = () => evaluate(`(()=>{const v=document.querySelector('.pdf-viewport'),p=document.querySelector('.pdf-paper');return {zoom:parseInt(document.querySelector('.pdf-zoom-value').textContent),x:(v.scrollLeft+v.clientWidth/2-p.offsetLeft)/p.offsetWidth,y:(v.scrollTop+v.clientHeight/2-p.offsetTop)/p.offsetHeight};})()`);
  const shot = async name => { if (!process.env.UI_SCREENSHOTS) return; await mkdir('artifacts/pdf', { recursive: true }); const r = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`artifacts/pdf/${name}.png`, Buffer.from(r.data, 'base64')); };
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url }); await wait(`document.querySelector('#app-shell h1')`);
  await disableWarmup(evaluate);
  await action('piano'); await action('repertoire'); await action('new-work');
  await evaluate(`(()=>{const f=new DataTransfer();f.items.add(new File([Uint8Array.from(atob(${JSON.stringify(scorePDF())}),c=>c.charCodeAt(0))],'Score.pdf',{type:'application/pdf'}));const input=document.querySelector('[name=score]');input.files=f.files;input.dispatchEvent(new Event('change'));})()`);
  await wait(`document.querySelector('[name=score]').validity.valid`);
  await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`); await wait(`document.querySelector('[data-action=practice-work]')`);
  const state = await read('state', 'current'), assetId = state.works[0].assetId;
  await action('practice-work'); await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);
  await wait(`document.querySelector('[data-action=toggle-session]')`); await action('toggle-session'); await action('open-pdf'); await ready();

  await evaluate(`__sr.midi.simulateDevices(['Test piano']);__sr.midi.simulateNote(60)`);
  assert.ok(await evaluate(`!!document.querySelector('.pdf-widget [data-midi-indicator][data-active=true][data-connected=true]')`));

  await t.test('running practice gives the sheet the whole viewport and rejects annotation/exit until paused', async () => {
    const layout = await evaluate(`(()=>{const v=document.querySelector('.pdf-viewport').getBoundingClientRect();return {w:v.width,h:v.height,chrome:document.querySelectorAll('.pdf-header,.pdf-footer').length,widgets:document.querySelectorAll('.pdf-widget').length,toolsHidden:document.querySelector('.pdf-panel').hidden,backHidden:document.querySelector('[data-pdf=close]').hidden};})()`);
    assert.deepEqual(layout, { w: 390, h: 844, chrome: 0, widgets: 1, toolsHidden: true, backHidden: true });
    await evaluate(`document.querySelector('[data-finger="3"]').click()`);
    const r = await paper(); await tap(r.x + r.width * .3, r.y + r.height * .3);
    assert.equal(await evaluate(`document.querySelectorAll('.pdf-marks [data-mark-id]').length`), 0);
    await shot('practice-running');
    await evaluate(`document.querySelector('.pdf-viewer').dispatchEvent(new Event('cancel',{cancelable:true}))`);
    await wait(`document.querySelector('.pdf-viewer').dataset.running==='false'`);
    assert.ok(await evaluate(`!!document.querySelector('.pdf-viewer[open]')`));
    assert.equal((await read('state', 'current')).active.runningSince, null);
  });
  await t.test('paused tools offer direct fingering stamps, a visual palette and undo/redo', async () => {
    assert.equal(await evaluate(`document.querySelectorAll('.pdf-widget select').length`), 0);
    const r = await paper();
    for (let n = 1; n <= 5; n++) {
      await evaluate(`document.querySelector('[data-finger="${n}"]').click();document.querySelector('[data-color="#2878c8"]').click()`);
      await tap(r.x + r.width * (.1 + n * .13), r.y + r.height * .15); await saved();
    }
    const asset = await read('assets', assetId);
    assert.deepEqual(asset.annotations.marks.map(m => [m.type, m.text, m.color]), ['1','2','3','4','5'].map(n => ['fingering',n,'#2878c8']));
    await control('undo'); await saved(); assert.equal((await read('assets', assetId)).annotations.marks.length, 4);
    await control('redo'); await saved(); assert.equal((await read('assets', assetId)).annotations.marks.length, 5);
    await shot('practice-fingering');
    await control('timer'); assert.equal(await evaluate(`document.querySelector('.pdf-paper').dataset.tool`), 'read');
    assert.equal(await evaluate(`document.querySelector('.pdf-panel').hidden`), true);
    await control('timer');
  });
  await t.test('saved framing survives page turns, portrait/landscape and reopening the same work', async () => {
    await control('view');
    for (let n = 0; n < 4; n++) { await control('in'); await ready(); }
    await evaluate(`document.querySelector('.pdf-viewport').scrollTo(160,100)`);
    const expected = await frame(); assert.equal(expected.zoom, 200);
    await control('save-view'); await wait(`document.querySelector('.pdf-view-status').textContent.startsWith('Encuadre guardado')`);
    const initial = (await read('assets', assetId)).scoreView;
    assert.equal(initial.portrait.zoom, 2); assert.ok(Math.abs(initial.portrait.centerY - expected.y) < .002);
    await control('next'); await ready(); assert.equal((await frame()).zoom, 200);
    await control('prev'); await ready();
    await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
    await wait(`document.querySelector('.pdf-zoom-value').textContent==='100 %'`); await ready();
    await control('in'); await ready(); await control('save-view'); await wait(`document.querySelector('.pdf-view-status').textContent.includes('apaisado')`);
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await wait(`document.querySelector('.pdf-zoom-value').textContent==='200 %'`); await ready();
    assert.ok(Math.abs((await frame()).y - expected.y) < .01);
    await control('close'); await wait(`!document.querySelector('.pdf-viewer')`); await action('open-pdf'); await ready();
    assert.equal((await frame()).zoom, 200); assert.ok(Math.abs((await frame()).y - expected.y) < .01);
    assert.equal(await evaluate(`document.querySelectorAll('.pdf-marks [data-mark-id]').length`), 5);
    await control('tools'); await control('view');
    await evaluate(`window.originalPut=IDBObjectStore.prototype.put;window.failFrame=true;IDBObjectStore.prototype.put=function(...args){if(this.name==='assets'&&failFrame){const tx=this.transaction;queueMicrotask(()=>tx.abort());}return originalPut.apply(this,args);}`);
    await control('reset-view'); await wait(`document.querySelector('.pdf-view-status').textContent.startsWith('No se ha podido')`);
    assert.equal((await read('assets', assetId)).scoreView.portrait.zoom, 2);
    await evaluate(`window.failFrame=false`); await control('reset-view'); await wait(`document.querySelector('.pdf-view-status').textContent.startsWith('Encuadre guardado')`); await ready();
    assert.equal((await frame()).zoom, 100); assert.equal((await read('assets', assetId)).annotations.marks.length, 5);
  });
  await t.test('one draggable widget stays inside phone/tablet screens and does not resize the score', async () => {
    for (const [width, height] of [[320,568],[844,390],[768,1024],[1180,820]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
      await new Promise(r => setTimeout(r, 220)); await ready();
      const box = await evaluate(`(()=>{const r=document.querySelector('.pdf-widget').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};})()`);
      assert.ok(box.x >= 0 && box.y >= 0 && box.right <= width + 1 && box.bottom <= height + 1, `${width}x${height} ${JSON.stringify(box)}`);
      const before = await paper();
      await control('tools'); const after = await paper(); assert.equal(after.width, before.width); assert.equal(after.height, before.height);
      await control('tools'); await shot(`practice-widget-${width}x${height}`);
    }
    await control('tools');
    const before = await evaluate(`(()=>{const r=document.querySelector('[data-pdf=drag]').getBoundingClientRect();return {x:r.x+22,y:r.y+22};})()`);
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...before, id: 1 }] });
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 50, y: 50, id: 1 }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.ok(await evaluate(`document.querySelector('.pdf-widget').getBoundingClientRect().left<80`));
    assert.equal((await read('assets', assetId)).annotations.marks.length, 5);
  });
  await t.test('opening tools preserves the dragged bottom anchor when collapsed or resumed', async () => {
    const bottom = () => evaluate(`document.querySelector('.pdf-widget').getBoundingClientRect().bottom`);
    for (const [width, height] of [[390,844],[844,390],[768,1024],[1180,820]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
      await new Promise(resolve => setTimeout(resolve, 220)); await ready();
      if (await evaluate(`!document.querySelector('.pdf-panel').hidden`)) await control('tools');
      const handle = await evaluate(`(()=>{const r=document.querySelector('[data-pdf=drag]').getBoundingClientRect();return {x:r.x+22,y:r.y+22};})()`);
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...handle, id: 1 }] });
      await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 60, y: height - 30, id: 1 }] });
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      const anchored = await bottom();
      for (let i = 0; i < 3; i++) {
        await control('tools'); await control('tools');
        assert.ok(Math.abs(await bottom() - anchored) < 2, `${width}x${height}: collapsed anchor moved`);
      }
      await control('tools'); await control('timer');
      assert.ok(Math.abs(await bottom() - anchored) < 2, 'Resuming moved the bottom anchor');
      assert.equal(await evaluate(`document.querySelector('[data-pdf=finish]').hidden`), true);
      await control('timer');
    }
  });
  await t.test('visible finish action opens feedback without automatically saving the session', async () => {
    assert.equal(await evaluate(`document.querySelector('[data-pdf=finish]').hidden`), false);
    assert.equal(await evaluate(`document.querySelector('[data-pdf=finish]').textContent`), 'Terminar práctica');
    await control('finish'); await wait(`!document.querySelector('.pdf-viewer')`);
    await wait(`document.querySelector('#cp-dialog[open] [data-action=discard-session]')`);
    const data = await read('state', 'current');
    assert.ok(data.active); assert.equal(data.sessions.length, 0);
    assert.equal((await read('assets', assetId)).annotations.marks.length, 5);
  });
  assert.deepEqual(errors, []);
});
