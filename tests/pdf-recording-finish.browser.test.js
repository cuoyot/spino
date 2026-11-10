import test from 'node:test';
import assert from 'node:assert/strict';
import {openBrowser,disableWarmup} from './browser.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {syntheticCameraSource} from './fixtures/camera-controls.js';
import {scorePDF} from './pdf-fixture.js';

test('stopping PDF practice retains the active recording visibly before leaving and preserves saved takes', {timeout:60000}, async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const wait=e=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${e}){clearInterval(timer);resolve()}else if(++n>700){clearInterval(timer);reject(Error('Timed out: '+${JSON.stringify(e)}))}},20)})`);
 const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
 await send('Page.addScriptToEvaluateOnNewDocument',{source:syntheticCameraSource});
 await send('Page.navigate',{url});await wait(`document.querySelector('#app-shell h1')`);await disableWarmup(evaluate);
 await click('[data-action=piano]');await click('[data-action=repertoire]');await click('[data-action=add-work]'); await click('[data-action=new-work]');
 await evaluate(`(()=>{const files=new DataTransfer();files.items.add(new File([Uint8Array.from(atob(${JSON.stringify(scorePDF())}),c=>c.charCodeAt(0))],'Score.pdf',{type:'application/pdf'}));const input=document.querySelector('[name=score]');input.files=files.files;input.dispatchEvent(new Event('change'))})()`);
 await wait(`document.querySelector('[name=score]').validity.valid`);await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`);await wait(`document.querySelector('[data-action=practice-work]')`);
 await click('[data-action=practice-work]');await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);await wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);
 await evaluate(`__sr.midi.simulateDevices(['Test piano'])`);
 for(const reviewFirst of [true,false]) {
  await click('[data-pdf=record]');if(reviewFirst){await click('[data-media=midi]');await evaluate(`__sr.midi.simulateNote(60);__sr.midi.simulateNote(60,false)`);}
  else {await click('[data-media=video]');await wait(`document.querySelector('[data-media=start-video]')&&!document.querySelector('[data-media=start-video]').disabled`);await click('[data-media=start-video]');await new Promise(r=>setTimeout(r,400));}
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-media=stop]')).display==='none'`),false);
  assert.match(await evaluate(`document.querySelector('[data-media=stop]').textContent`),/Detener grabación/);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-pdf=record]')).display`),'none');
  await click('[data-pdf=drag]');assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-media=stop]')).display==='none'`),false);assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-pdf=record]')).display`),'none');await click('[data-pdf=drag]');
  const folder=process.env.SPINO_RECORDING_EVIDENCE;
  if(folder)for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]) {
    await mkdir(folder,{recursive:true});await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme='${theme}'`);
    const box=await evaluate(`(()=>{const b=document.querySelector('[data-media=stop]'),r=b.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,visible:getComputedStyle(b).display!=='none'}})()`);
    assert.ok(box.visible&&box.height>=44&&box.x>=0&&box.right<=width+1&&box.y>=0&&box.bottom<=height,JSON.stringify(box));
    await writeFile(folder+'/'+theme+'-'+(reviewFirst?'midi':'video')+'-recording-'+width+'x'+height+'.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  if(reviewFirst){await click('[data-media=stop]');await wait(`document.querySelector('#media-title')&&!document.querySelector('[data-media=save]').disabled`);await evaluate(`document.querySelector('#media-title').value='Retained take'`);}
  await click('[data-pdf=finish]');
  if(!reviewFirst){await wait(`document.querySelector('#media-title')&&!document.querySelector('[data-media=save]').disabled`);assert.match(await evaluate(`document.querySelector('#cp-media-capture').textContent`),/conservada/);assert.equal(await evaluate(`!!document.querySelector('#cp-dialog[open] [name=practicedMinutes]')`),false);await click('[data-media=save]');await wait(`document.querySelector('[data-media=share]')`);await click('[data-pdf=finish]');}
  await wait(`document.querySelector('#cp-dialog[open] [name=practicedMinutes]')`);
  assert.equal(await evaluate(`document.querySelector('#cp-media-capture').hidden`),true);
  assert.equal(await evaluate(`document.querySelectorAll('[data-media=save]').length`),0);
  const records=await evaluate(`new Promise(resolve=>{const q=indexedDB.open('spino-local-media');q.onsuccess=()=>{const db=q.result,r=db.transaction('recordings').objectStore('recordings').getAll();r.onsuccess=()=>{resolve(r.result.map(x=>({title:x.title,bytes:x.blob.size,draft:x.draft})));db.close()}}})`);
  assert.ok(records.every(r=>r.bytes>0));assert.equal(records.length,reviewFirst?1:2);assert.ok(records.some(r=>r.title==='Retained take'&&r.draft));
  if(reviewFirst){await click('[data-action=close-dialog]');await click('[data-action=open-score-practice]');await wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);}
 }
 await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`);await wait(`!document.querySelector('#cp-dialog').open`);
 assert.equal(await evaluate(`document.querySelector('#cp-media-capture').hidden`),true);assert.deepEqual(errors,[]);
});
