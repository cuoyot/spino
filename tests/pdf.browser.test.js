async function pdfViewerChunk() {
  const names = (await readdir('dist/assets')).filter(name => /^pdf-viewer-.*\.js$/.test(name));
  for (const name of names) if (/\bas openScore\b/.test(await readFile(`dist/assets/${name}`, 'utf8'))) return name;
  throw new Error('The built PDF viewer export was not found.');
}
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { openBrowser, disableWarmup } from './browser.js';
import { scorePDF } from './pdf-fixture.js';

test('PDF repertoire import, safe page gestures, annotation tools, persistence and practice timing', { timeout: 120000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve(true);}else if(++n>500){clearInterval(timer);reject(Error('Timeout: '+${JSON.stringify(expression)}));}},20);})`);
  const action = name => evaluate(`document.querySelector('[data-action="${name}"]').click()`);
  const control = async name => {
    if (['timer','close','finish'].includes(name)) await evaluate(`(()=>{const done=document.querySelector('[data-pdf=split-done]');if(done&&!done.hidden)done.click();})()`);
    return evaluate(`document.querySelector('[data-pdf="${name}"]').click()`);
  };
  const ready = () => wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);
  const tool = name => evaluate(`(()=>{if(document.querySelector('.pdf-panel').hidden)document.querySelector('[data-pdf=tools]').click();document.querySelector('[data-pdf=annotations]').click();document.querySelector('[data-tool="${name}"]').click();if(!document.querySelector('.pdf-panel').hidden)document.querySelector('[data-pdf=tools]').click();})()`);
  const rect = () => evaluate(`(()=>{const r=document.querySelector('.pdf-paper').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`);
  const tap = async (x, y, hold = 0) => {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    if (hold) await new Promise(r => setTimeout(r, hold));
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const stroke = async (x1, y1, x2, y2) => {
    const r = await rect();
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x + r.width * x1, y: r.y + r.height * y1, button: 'left', clickCount: 1 });
    for (let i = 1; i <= 5; i++) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x + r.width * (x1 + (x2 - x1) * i / 5), y: r.y + r.height * (y1 + (y2 - y1) * i / 5), button: 'left', buttons: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x + r.width * x2, y: r.y + r.height * y2, button: 'left', clickCount: 1 });
  };
  const readStore = (store, key) => evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result;const q=db.transaction('${store}').objectStore('${store}').get(${JSON.stringify(key)});q.onsuccess=()=>{resolve(q.result);db.close();};q.onerror=reject;};})`);
  const saved = () => wait(`document.querySelector('.pdf-save-state')?.textContent==='Anotaciones guardadas en el dispositivo.'`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url }); await wait(`document.querySelector('#app-shell h1')`);
  await disableWarmup(evaluate);
  await evaluate(`window.fixture=${JSON.stringify(scorePDF())};window.originalFileClick=HTMLInputElement.prototype.click;HTMLInputElement.prototype.click=function(){if(this.type==='file'){const data=new DataTransfer();data.items.add(new File([Uint8Array.from(atob(window.fixture),c=>c.charCodeAt(0))],'My score.pdf',{type:'application/pdf'}));this.files=data.files;this.dispatchEvent(new Event('change'));}else originalFileClick.call(this);};`);
  await action('piano'); await action('repertoire');
  await t.test('imports and validates a PDF without creating a partial work on invalid files', async () => {
    await evaluate(`window.validFixture=window.fixture;window.fixture=btoa('%PDF-1.4 invalid')`);
    await action('import-pdf'); await wait(`document.querySelector('#cp-score-status')?.textContent.includes('No se puede leer')`);
    assert.equal((await readStore('state', 'current')).works.length, 0);
    await action('close-dialog');
    await evaluate(`window.fixture=window.validFixture`); await action('import-pdf');
    await wait(`document.querySelector('#cp-dialog [name=score]')?.validity.valid`);
    await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`);
    await wait(`document.querySelector('[data-action="open-pdf"]')`);
    assert.equal((await readStore('state', 'current')).works.length, 1);
    await action('open-pdf'); await ready();
    assert.equal(await evaluate(`document.querySelector('.pdf-page-count').textContent`), '1 / 2');
  });
  await t.test('turns only on margin taps, never on staff taps, long holds or swipes', async () => {
    let r = await rect();
    await tap(r.x + r.width * .6, r.y + r.height / 2);
    await tap(r.x + r.width - 3, r.y + r.height / 2, 370);
    await stroke(.99, .3, .98, .6);
    assert.equal(await evaluate(`document.querySelector('.pdf-page-count').textContent`), '1 / 2');
    await tap(r.x + r.width - 3, r.y + r.height / 2); await ready();
    assert.equal(await evaluate(`document.querySelector('.pdf-page-count').textContent`), '2 / 2');
    r = await rect(); await tap(r.x + 3, r.y + r.height / 2); await ready();
    assert.equal(await evaluate(`document.querySelector('.pdf-page-count').textContent`), '1 / 2');
  });
  await t.test('draws every annotation tool, escapes text and supports undo, redo and erasing', async () => {
    for (const [index, name] of ['pen', 'line', 'arrow', 'ellipse', 'rectangle', 'underline', 'highlight'].entries()) {
      await tool(name); await stroke(.2, .15 + index * .09, .75, .19 + index * .09); await saved();
    }
    await tool('text'); const r = await rect(); await tap(r.x + r.width * .15, r.y + r.height * .08);
    await wait(`document.querySelector('.pdf-text-dialog[open]')`);
    assert.equal(await evaluate(`(()=>{const d=document.querySelector('.pdf-text-dialog'),form=d.querySelector('form');form.scrollTop=form.scrollHeight;const b=d.querySelector('.dialog-head button'),r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b;})()`),true,'Annotation Close remains visible above the scrolling form');
    await evaluate(`document.querySelector('.pdf-text-dialog textarea').value=${JSON.stringify('<img onerror=alert(1)>\nRepetir lento')};document.querySelector('.pdf-text-dialog form').requestSubmit()`); await saved();
    assert.equal(await evaluate(`document.querySelectorAll('.pdf-marks [data-mark-id]').length`), 8);
    assert.equal(await evaluate(`document.querySelectorAll('.pdf-marks img').length`), 0);
    await control('undo'); await saved(); assert.equal(await evaluate(`document.querySelectorAll('.pdf-marks [data-mark-id]').length`), 7);
    await control('redo'); await saved(); assert.equal(await evaluate(`document.querySelectorAll('.pdf-marks [data-mark-id]').length`), 8);
    await tool('erase'); await tap(r.x + r.width * .5, r.y + r.height * .25); await saved();
    assert.equal(await evaluate(`document.querySelectorAll('.pdf-marks [data-mark-id]').length`), 7);
    await control('undo'); await saved();
    await tool('pen'); await tap(r.x + r.width - 3, r.y + r.height / 2); await saved();
    assert.equal(await evaluate(`document.querySelector('.pdf-page-count').textContent`), '1 / 2', 'annotation at the edge must not turn the page');
    await control('undo'); await saved();
    await control('next'); await ready(); assert.equal(await evaluate(`document.querySelectorAll('.pdf-marks [data-mark-id]').length`), 0);
    await tool('arrow'); await stroke(.15, .3, .55, .5); await saved();
    await control('prev'); await ready(); assert.equal(await evaluate(`document.querySelectorAll('.pdf-marks [data-mark-id]').length`), 8);
  });
  await t.test('pinch and cancelled gestures never create marks or turn pages', async () => {
    await tool('read'); const r = await rect(); const x = r.x + r.width / 2, y = r.y + r.height / 2;
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 40, y, id: 1 }, { x: x + 40, y, id: 2 }] });
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 65, y, id: 1 }, { x: x + 65, y, id: 2 }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await ready();
    assert.ok((await rect()).width > r.width * 1.3);
    assert.equal(await evaluate(`document.querySelector('.pdf-page-count').textContent`), '1 / 2');
    await control('fit'); await ready();
    await tool('pen');
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 30, y: y + 30, id: 1 }] });
    await send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    assert.equal(await evaluate(`document.querySelectorAll('.pdf-marks [data-mark-id]').length`), 8);
    await tool('read');
  });
  const data = await readStore('state', 'current'), assetId = data.works[0].assetId;
  const snapshot = await readStore('assets', assetId);
  await t.test('rotation preserves annotation coordinates and keeps controls within phone/tablet viewports', async () => {
    const viewBox = await evaluate(`document.querySelector('.pdf-marks').getAttribute('viewBox')`);
    for (const [width, height] of [[320, 568], [844, 390], [768, 1024], [1180, 820]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
      await new Promise(r => setTimeout(r, 220)); await ready();
      assert.equal(await evaluate(`document.querySelector('.pdf-marks').getAttribute('viewBox')`), viewBox);
      const controls = await evaluate(`[...document.querySelectorAll('.pdf-widget-bar button')].filter(el=>!el.hidden).map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})`);
      assert.ok(controls.length >= 4);
      for (const r of controls) assert.ok(r.left >= 0 && r.top >= 0 && r.right <= width + 1 && r.bottom <= height + 1, `${width}x${height}: ${JSON.stringify(r)}`);
      if (process.env.UI_SCREENSHOTS) { await mkdir('artifacts/pdf', { recursive: true }); const shot = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`artifacts/pdf/annotated-${width}x${height}.png`, Buffer.from(shot.data, 'base64')); }
    }
    assert.deepEqual((await readStore('assets', assetId)).annotations, snapshot.annotations);
  });
  await t.test('annotations survive reload and are included in the complete notebook backup', async () => {
    await control('close'); await wait(`!document.querySelector('.pdf-viewer')`);
    await send('Page.reload'); await wait(`document.querySelector('#app-shell h1')`);
    await action('piano'); await action('repertoire'); await action('work-detail'); await action('open-pdf'); await ready();
    assert.equal(await evaluate(`document.querySelectorAll('.pdf-marks [data-mark-id]').length`), 8);
    assert.deepEqual((await readStore('assets', assetId)).annotations, snapshot.annotations);
    await control('close'); await wait(`!document.querySelector('.pdf-viewer')`); await action('settings'); await action('profile-backup');
    await evaluate(`window.nativeObjectURL=URL.createObjectURL;URL.createObjectURL=blob=>{window.exportedBlob=blob;return nativeObjectURL(blob);};HTMLAnchorElement.prototype.click=function(){};`);
    await action('export-backup'); await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`); await wait(`window.exportedBlob`);
    const backup = await evaluate(`exportedBlob.text().then(text=>JSON.parse(text))`);
    assert.deepEqual(backup.assets[0].annotations, snapshot.annotations); assert.equal(backup.assets[0].base64, scorePDF());
    await evaluate(`(async()=>{window.backupText=await exportedBlob.text();HTMLInputElement.prototype.click=function(){if(this.type==='file'){const data=new DataTransfer();data.items.add(new File([window.backupText],'backup.json',{type:'application/json'}));this.files=data.files;this.dispatchEvent(new Event('change'));}};})()`);
    await action('import-backup'); await wait(`document.querySelector('#cp-confirm')`);
    await evaluate(`setTimeout(()=>document.querySelector('#cp-confirm').click(),10);true`);
    await new Promise(r=>setTimeout(r,250)); await wait(`document.querySelector('#app-shell h1')?.textContent==='Hoy'`);
    assert.deepEqual((await readStore('assets',assetId)).annotations,snapshot.annotations);
  });
  await t.test('PDF practice keeps the running timer and exposes pause/resume inside the viewer', async () => {
    await action('piano'); await action('repertoire'); await action('work-detail'); await action('practice-work');
    await evaluate(`document.querySelector('#prepare-form').requestSubmit()`); await ready();
    assert.equal(await evaluate(`document.querySelector('[data-pdf=timer]').getAttribute('aria-label')`), 'Pausar práctica');
    const before = await readStore('state', 'current'); assert.ok(before.active.runningSince);
    await control('timer'); assert.equal(await evaluate(`document.querySelector('[data-pdf=timer]').getAttribute('aria-label')`), 'Continuar práctica');
    await wait(`document.querySelector('[data-pdf=timer]').getAttribute('aria-label')==='Continuar práctica'`);
    const after = await readStore('state', 'current'); assert.equal(after.active.runningSince, null); assert.ok(after.active.elapsedMs >= before.active.elapsedMs);
    await control('close'); await wait(`!document.querySelector('.pdf-viewer')`);
    assert.match(await evaluate(`document.querySelector('[data-action="open-score-practice"]').textContent`),/Continuar/);
  });
  await t.test('save failures keep the PDF open and allow a retry without losing annotations', async () => {
    const chunk = await pdfViewerChunk();
    await evaluate(`(async()=>{window.rejectSave=true;const module=await import('/assets/${chunk}');window.testViewer=await module.openScore({asset:${JSON.stringify({ ...snapshot, annotations: { version: 1, marks: [] } })},save:async marks=>{if(window.rejectSave)throw Error('Full');window.recoveredMarks=marks;}});})()`);
    await ready(); await tool('pen'); await stroke(.2, .3, .5, .4);
    await wait(`document.querySelector('.pdf-save-state').classList.contains('error')`);
    await control('close'); assert.ok(await evaluate(`!!document.querySelector('.pdf-viewer[open]')`));
    await evaluate(`window.rejectSave=false`); await control('retry'); await saved();
    assert.equal(await evaluate(`recoveredMarks.marks.length`), 1); await control('close');
  });
  assert.deepEqual(errors, []);
});
