import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { openBrowser, disableWarmup } from './browser.js';
import { scorePDF } from './pdf-fixture.js';
import {createHash} from 'node:crypto';

test('immersive PDF practice, pause-only tools, fingering and saved framing', { timeout: 120000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve(true);}else if(++n>700){clearInterval(timer);reject(Error('Timeout: '+${JSON.stringify(expression)}));}},20);})`);
  const action = name => evaluate(`document.querySelector('[data-action="${name}"]').click()`);
  const control = async name => {
    if (name==='timer' && await evaluate(`!document.querySelector('[data-pdf=split-done]').hidden`)) {await evaluate(`document.querySelector('[data-pdf=split-done]').click()`);await wait(`document.querySelector('.pdf-viewer').dataset.running==='true'`);return;}
    if (['close','finish'].includes(name) && await evaluate(`!document.querySelector('[data-pdf=split-done]').hidden`)) {
      await evaluate(`document.querySelector('[data-pdf=split-done]').click()`);
      await wait(`document.querySelector('.pdf-viewer').dataset.running==='true'`);
      await evaluate(`document.querySelector('[data-pdf=timer]').click()`);
    }
    return evaluate(`document.querySelector('[data-pdf="${name}"]').click()`);
  };
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
  await wait(`document.querySelector('.pdf-paper')`); assert.notEqual((await read('state','current')).active.runningSince,null); await ready();

  await evaluate(`__sr.midi.simulateDevices(['Test piano']);__sr.midi.simulateNote(60)`);
  assert.ok(await evaluate(`!!document.querySelector('.pdf-widget [data-midi-indicator][data-active=true][data-connected=true]')`));

  await t.test('floating Record starts compact capture and stops into review over the running PDF', async () => {
    await evaluate(`document.querySelector('[data-pdf=record]').click()`);
    await wait(`document.querySelector('.pdf-viewer #cp-media-capture [data-media=audio]')`);
    const choices = await evaluate(`(()=>{const audio=document.querySelector('#cp-media-capture [data-media=audio]'),video=document.querySelector('#cp-media-capture [data-media=video]'),style=getComputedStyle(audio);return{audio:audio.textContent,video:video.textContent,background:style.backgroundColor,color:style.color,running:document.querySelector('.pdf-viewer').dataset.running};})()`);
    assert.equal(choices.audio,'Grabar audio');assert.equal(choices.video,'Grabar vídeo');assert.notEqual(choices.background,choices.color);assert.equal(choices.running,'true');
    await evaluate(`window.pdfCaptureTracks=[];Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{const context=new AudioContext(),oscillator=context.createOscillator(),output=context.createMediaStreamDestination();oscillator.connect(output);oscillator.start();await context.resume();pdfCaptureTracks=output.stream.getTracks();await new Promise(resolve=>window.resolvePDFPermission=resolve);return output.stream;}});`);
    await send('Runtime.evaluate',{expression:`document.querySelector('[data-media=audio]').click()`,userGesture:true});
    await evaluate(`Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));resolvePDFPermission();`);
    await wait(`document.querySelector('[data-media=cancel-request]')`);
    assert.equal(await evaluate(`pdfCaptureTracks.every(t=>t.readyState==='live')`),true);
    await evaluate(`Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));`);
    await wait(`document.querySelector('[data-pdf=record]').dataset.recording==='true'&&document.querySelector('#cp-media-capture').hidden`);
    assert.equal(await evaluate(`document.querySelector('[data-pdf=record]').getAttribute('aria-label')`),'Detener grabación y revisar');
    assert.equal(await evaluate(`!!document.querySelector('[data-pdf=record] rect')`),true);
    await wait(`document.querySelector('[data-media-clock]')?.textContent==='0:02'`);
    const evidence=process.env.SPINO_PDF_RECORD_EVIDENCE,frames=[];
    const captureState=async state=>{if(!evidence)return;await mkdir(evidence,{recursive:true});for(const theme of ['light','dark'])for(const [name,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);const file=theme+'-'+state+'-'+name+'.png',image=await send('Page.captureScreenshot',{format:'png'});await writeFile(evidence+'/'+file,Buffer.from(image.data,'base64'));frames.push({file,width,height,theme,state});}};
    await captureState('recording');
    await control('next');await ready();assert.equal(await evaluate(`document.querySelector('[data-pdf=record]').dataset.recording`),'true');
    await control('record');
    await wait(`!document.querySelector('#cp-media-capture').hidden&&document.querySelector('#media-title')&&!document.querySelector('[data-media=save]').disabled`);
    assert.equal(await evaluate(`pdfCaptureTracks.every(track=>track.readyState==='ended')`),true);
    assert.equal(await evaluate(`document.querySelector('.pdf-viewer').dataset.running`),'true');
    await captureState('review');
    if(evidence)await writeFile(evidence+'/verification.json',JSON.stringify({date:'2026-10-15',kind:'Responsive Chromium, synthetic microphone; not native acceptance',frames,sources:Object.fromEntries(await Promise.all(['app.js','media-view.js','media.css','score-controls.js','pdf-viewer.css'].map(async file=>[file,createHash('sha256').update(await readFile('src/companion/'+file)).digest('hex')]))),checks:['Recording panel hidden by default during PDF capture','Same red control becomes Stop recording and review','Page turning retains capture','Stop releases tracks and opens local draft review without stopping practice']},null,2));
    await evaluate(`document.querySelector('[data-media=delete]').click()`);await wait(`document.querySelector('#cp-media-capture').hidden`);
    assert.equal(await evaluate(`document.querySelector('[data-pdf=record]').getAttribute('aria-label')`),'Grabar práctica');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme='light'`);
    await new Promise(resolve=>setTimeout(resolve,220));await ready();await control('prev');await ready();
    assert.equal(await evaluate(`document.querySelector('.pdf-page-count').textContent`),'1 / 2');

  });
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
    assert.equal(await evaluate(`document.querySelector('.pdf-panel').hidden`),true,'Pausing does not enter score editing.');
    assert.equal(await evaluate(`document.querySelector('[data-pdf=split-done]').hidden`),true);
  });
  await t.test('paused tools offer direct fingering stamps, a visual palette and undo/redo', async () => {
    await control('tools');
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
    await control('close'); await wait(`!document.querySelector('.pdf-viewer')`); await action('open-score-practice'); await ready(); await control('timer');
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
      assert.equal(await evaluate(`(()=>{const bar=document.querySelector('.pdf-widget-bar').getBoundingClientRect(),buttons=Array.from(document.querySelectorAll('.pdf-widget-bar button')).filter(b=>!b.hidden && b.getBoundingClientRect().width);return buttons.every(b=>{const r=b.getBoundingClientRect();return r.top>=bar.top-30 && r.bottom<=bar.bottom+4 && r.left>=bar.left-1 && r.right<=bar.right+1;});})()`),true,'PDF controls and the raised dial remain inside the bar bounds without clipping.');
      assert.equal(await evaluate(`!!document.querySelector('[data-pdf=timer] .pdf-time')`),true);
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
      assert.equal(await evaluate(`document.querySelector('[data-pdf=finish]').hidden`), false);
      await control('timer');
    }
  });
  await t.test('pause and explicit editing keep one row across phone and tablet layouts', async () => {
    const evidence=process.env.SPINO_PDF_RECORD_EVIDENCE;
    for(const theme of ['light','dark'])for(const [name,width,height] of [['narrow-phone',320,568],['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);await new Promise(resolve=>setTimeout(resolve,220));await ready();
      const positions=()=>evaluate(`Object.fromEntries([...document.querySelectorAll('.pdf-widget-bar button')].filter(b=>b.getBoundingClientRect().width).map(b=>{const r=b.getBoundingClientRect();return[['tools','split-done'].includes(b.dataset.pdf)?'edit':b.dataset.pdf,{x:r.x,y:r.y,w:r.width,h:r.height}]}))`);
      const pausedPositions=await positions();
      for(const state of ['paused','editing']){
        if(state==='editing')await control('tools');
        assert.equal(await evaluate(`document.querySelector('.pdf-panel').hidden`),state==='paused');
        assert.equal(await evaluate(`document.querySelector('[data-pdf=tools]').hidden`),state==='editing');
        assert.equal(await evaluate(`document.querySelector('[data-pdf=split-done]').hidden`),state==='paused');
        assert.equal(await evaluate(`document.querySelector('[data-pdf=timer]').hidden`),false);
        assert.equal(await evaluate(`document.querySelector('[data-pdf=timer]').disabled`),state==='editing');
        const currentPositions=await positions();assert.deepEqual(Object.keys(currentPositions).sort(),Object.keys(pausedPositions).sort());
        for(const [action,box] of Object.entries(currentPositions))for(const key of ['x','y','w','h'])assert.ok(Math.abs(box[key]-pausedPositions[action][key])<1,`${theme} ${width}x${height}: ${action} ${key} moved: ${JSON.stringify({paused:pausedPositions,current:currentPositions})}`);
        if(state==='editing'){
          await evaluate(`document.querySelector('[data-pdf=timer]').click()`);
          assert.equal(await evaluate(`document.querySelector('.pdf-viewer').dataset.running`),'false','Disabled clock cannot resume editing.');
        }
        const geometry=await evaluate(`(()=>{const bar=document.querySelector('.pdf-widget-bar').getBoundingClientRect(),buttons=[...document.querySelectorAll('.pdf-widget-bar button')].map(b=>({timer:b.matches('.score-timer'),r:b.getBoundingClientRect()})).filter(b=>b.r.width&&b.r.height);return{inside:buttons.every(({r})=>r.left>=bar.left-1&&r.right<=bar.right+1),rows:[...new Set(buttons.filter(b=>!b.timer).map(b=>Math.round(b.r.top)))].length};})()`);
        assert.deepEqual(geometry,{inside:true,rows:1},`${theme} ${state} ${width}x${height}`);
        if(evidence){const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${evidence}/${theme}-${state}-${name}.png`,Buffer.from(shot.data,'base64'));}
      }
      await control('split-done');await control('timer');
    }
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme='light'`);await new Promise(resolve=>setTimeout(resolve,220));await ready();
  });
  await t.test('visible finish action opens feedback without automatically saving the session', async () => {
    if(await evaluate(`!document.querySelector('[data-pdf=split-done]').hidden`)){await control('split-done');await wait(`document.querySelector('.pdf-viewer').dataset.running==='true'`);await control('timer');}
    assert.equal(await evaluate(`document.querySelector('[data-pdf=finish]').hidden`), false);
    assert.equal(await evaluate(`document.querySelector('[data-pdf=finish]').getAttribute('aria-label')`), 'Terminar práctica');
    await control('finish'); await wait(`!document.querySelector('.pdf-viewer')`);
    await wait(`document.querySelector('#cp-dialog[open] [data-action=discard-session]')`);
    const data = await read('state', 'current');
    assert.ok(data.active); assert.equal(data.sessions.length, 0);
    assert.equal((await read('assets', assetId)).annotations.marks.length, 5);
  });
  assert.deepEqual(errors, []);
});
