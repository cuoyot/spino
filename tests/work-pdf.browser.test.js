import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';
import { headerPDF, scannedFixtureScript } from './score-metadata-fixture.js';

test('work form imports PDF and suggests editable metadata locally, including real scanned OCR', { timeout: 120000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve(true);}else if(++n>1500){clearInterval(timer);reject(Error('Timeout: '+${JSON.stringify(expression)}));}},20);})`);
  const action = name => evaluate(`document.querySelector('[data-action="${name}"]').click()`);
  const field = name => evaluate(`document.querySelector('#cp-dialog [name="${name}"]').value`);
  const read = (store, key) => evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result;const q=db.transaction('${store}').objectStore('${store}').get(${JSON.stringify(key)});q.onsuccess=()=>{resolve(q.result);db.close();};q.onerror=reject;};})`);
  const choose = expression => evaluate(`(()=>{const input=document.querySelector('#cp-dialog [name=score]'),files=new DataTransfer();files.items.add(new File([Uint8Array.from(atob(${expression}),c=>c.charCodeAt(0))],'mi-partitura.pdf',{type:'application/pdf'}));input.files=files.files;input.dispatchEvent(new Event('change'));})()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  // Block every external URL, including requests made by dedicated OCR/PDF workers.
  await send('Network.enable'); await send('Network.setBlockedURLs', { urls: ['https://*', 'http://cdn.*', 'http://*.com/*'] });
  await send('Page.navigate', { url }); await wait(`document.querySelector('#app-shell h1')`);
  await evaluate(scannedFixtureScript);
  await action('piano'); await action('repertoire'); await action('new-work');
  await t.test('PDF selection is visible without scrolling on small portrait and landscape screens', async () => {
    for (const [width, height] of [[320, 568], [390, 844], [844, 390], [768, 1024], [1180, 820]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
      const box = await evaluate(`(()=>{const r=document.querySelector('[name=score]').getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};})()`);
      assert.ok(box.x >= 0 && box.right <= width && box.y >= 0 && box.bottom <= height, JSON.stringify({ width, height, box }));
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  });
  await t.test('digital PDF fills title/composer and keeps the notebook unchanged until Save', async () => {
    await choose(JSON.stringify(headerPDF())); await wait(`document.querySelector('#cp-score-status').textContent.startsWith('Sugerencias del PDF:')`);
    assert.equal(await field('title'), 'Nocturne'); assert.equal(await field('composer'), 'Clara Schumann');
    assert.equal(await field('bpm'), '88'); assert.equal(await field('tempoMark'), 'q = 88');
    assert.equal((await read('state', 'current')).works.length, 0);
    await action('close-dialog'); await action('new-work');
    assert.equal(await field('title'), ''); assert.equal((await read('state', 'current')).works.length, 0);
  });
  await t.test('scanned PDF is recognized by bundled OCR while handwritten form values remain untouched', async () => {
    await choose('window.scannedFixture');
    await evaluate(`for(const [key,value] of [['title','Mi título'],['composer','Mi compositor']]){const el=document.querySelector('[name='+key+']');el.value=value;el.dispatchEvent(new Event('input'));}`);
    await wait(`document.querySelector('#cp-score-status').textContent.startsWith('Sugerencias OCR:')`);
    const status = await evaluate(`document.querySelector('#cp-score-status').textContent`);
    assert.match(status, /Noche serena/); assert.match(status, /Clara Schumann/); assert.match(status, /96/);
    assert.equal(await field('bpm'), '96'); assert.match(await field('tempoMark'), /96/);
    assert.equal(await field('title'), 'Mi título'); assert.equal(await field('composer'), 'Mi compositor');
    await evaluate(`document.querySelector('[data-score=apply]').click()`);
    assert.equal(await field('title'), 'Noche serena'); assert.equal(await field('composer'), 'Clara Schumann');
    if (process.env.UI_SCREENSHOTS) {
      await mkdir('artifacts/pdf', { recursive: true }); const shot = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile('artifacts/pdf/add-work-ocr.png', Buffer.from(shot.data, 'base64'));
    }
  });
  await t.test('failed atomic save can be retried without creating duplicate works or losing the attachment', async () => {
    await evaluate(`window.originalPut=IDBObjectStore.prototype.put;window.failAsset=true;IDBObjectStore.prototype.put=function(...args){if(this.name==='assets'&&window.failAsset){const tx=this.transaction;queueMicrotask(()=>tx.abort());}return originalPut.apply(this,args);};document.querySelector('#cp-dialog form').requestSubmit()`);
    await wait(`document.querySelector('#cp-form-error').textContent.includes('No se ha podido guardar')`);
    assert.equal((await read('state', 'current')).works.length, 0);
    await evaluate(`window.failAsset=false;document.querySelector('#cp-dialog form').requestSubmit();document.querySelector('#cp-dialog form').requestSubmit()`);
    await wait(`document.querySelector('[data-action=open-pdf]')`);
    const state = await read('state', 'current'); assert.equal(state.works.length, 1); assert.equal(state.works[0].title, 'Noche serena');
    assert.equal(state.works[0].bpm, 96); assert.match(state.works[0].tempoMark, /96/);
    const asset = await read('assets', state.works[0].assetId); assert.equal(asset.base64, await evaluate('window.scannedFixture'));
    await action('open-pdf'); await wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);
    assert.equal(await evaluate(`document.querySelector('.pdf-page-count').textContent`), '1 / 1');
    await evaluate(`document.querySelector('[data-pdf=close]').click()`);
    await action('edit-work'); assert.equal(await evaluate(`document.querySelector('#cp-dialog [name=score]')`), null);
    await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`); await wait(`!document.querySelector('#cp-dialog').open`);
    assert.deepEqual(await read('assets', state.works[0].assetId), asset);
  });
  await t.test('invalid files block saving; removing the file permits a normal work without PDF', async () => {
    await action('piano'); await action('repertoire'); await action('new-work'); await choose(`btoa('%PDF-1.4 invalid')`);
    await wait(`document.querySelector('#cp-score-status').textContent.includes('No se puede leer')`);
    await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`);
    assert.equal((await read('state', 'current')).works.length, 1);
    await evaluate(`document.querySelector('[data-score=remove]').click();document.querySelector('#cp-dialog [name=title]').value='Sin partitura';document.querySelector('#cp-dialog form').requestSubmit()`);
    await wait(`document.querySelector('[data-action=attach-pdf]')`);
    assert.equal((await read('state', 'current')).works.length, 2);
  });
  await t.test('switching files discards stale OCR results and cancellation leaves no work', async () => {
    await action('piano'); await action('repertoire'); await action('new-work'); await choose('window.scannedFixture');
    await wait(`document.querySelector('#cp-dialog [name=score]').validity.valid`);
    await choose(JSON.stringify(headerPDF()));
    await wait(`document.querySelector('#cp-score-status').textContent.startsWith('Sugerencias del PDF:')`);
    assert.equal(await field('title'), 'Nocturne'); await action('close-dialog');
    assert.equal((await read('state', 'current')).works.length, 2);
  });
  await t.test('attaching to an existing work allows skipping OCR without changing its title', async () => {
    const state = await read('state', 'current'), work = state.works.find(work => !work.assetId);
    await evaluate(`document.querySelector('[data-action=work-detail][data-id="${work.id}"]').click();document.querySelector('[data-action=edit-work]').click()`);
    await choose('window.scannedFixture'); await wait(`!document.querySelector('[data-score=skip]').hidden`);
    await evaluate(`document.querySelector('[data-score=skip]').click()`);
    assert.equal(await field('title'), 'Sin partitura');
    await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`); await wait(`!document.querySelector('#cp-dialog').open`);
    const after = await read('state', 'current'); assert.equal(after.works.length, 2);
    assert.ok(after.works.find(item => item.id === work.id).assetId);
    assert.equal(after.works.find(item => item.id === work.id).title, work.title);
  });
  assert.deepEqual(errors, []);
});
