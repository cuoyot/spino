import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser,disableWarmup} from './browser.js';
import {scorePDF} from './pdf-fixture.js';
test('autoplay, saved annotation resume, editable time and MIDI hold across four layouts',{timeout:120000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});
 const wait=expression=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve()}else if(++n>1000){clearInterval(timer);reject(Error('Timeout '+${JSON.stringify(expression)}))}},20)})`);
 const action=name=>evaluate(`document.querySelector('[data-action="${name}"]').click()`);
 const read=()=>evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const q=r.result.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{resolve(q.result);r.result.close()}}})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('#app-shell h1')`);await disableWarmup(evaluate);
 await action('piano');await action('repertoire');await action('new-work');
 await evaluate(`(()=>{const transfer=new DataTransfer();transfer.items.add(new File([Uint8Array.from(atob(${JSON.stringify(scorePDF())}),c=>c.charCodeAt(0))],'Synthetic.pdf',{type:'application/pdf'}));const input=document.querySelector('[name=score]');input.files=transfer.files;input.dispatchEvent(new Event('change'));})()`);
 await wait(`document.querySelector('[name=score]').validity.valid`);await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`);await wait(`document.querySelector('[data-action=practice-work]')`);
 const workId=(await read()).works[0].id;
 for(const [name,width,height] of [['phone-portrait',402,874],['phone-landscape',874,402],['tablet-portrait',820,1180],['tablet-landscape',1180,820]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await action('practice-work');await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);await wait(`document.querySelector('[data-action=toggle-session]')`);
  const active=(await read()).active;assert.notEqual(active.runningSince,null);
  await action('open-pdf');await wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);assert.equal(await evaluate(`document.querySelector('.pdf-viewer').dataset.running`),'true');
  await evaluate(`document.querySelector('[data-pdf=timer]').click();document.querySelector('[data-pdf=annotations]').click();document.querySelector('[data-finger="3"]').click()`);
  await wait(`document.querySelector('.pdf-paper').dataset.tool==='fingering' && document.querySelector('.pdf-viewer').dataset.running==='false'`);
  const point=await evaluate(`(()=>{const r=document.querySelector('.pdf-paper').getBoundingClientRect();return{x:r.x+r.width*.4,y:Math.max(90,Math.min(innerHeight*.4,r.y+r.height*.15))}})()`);
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait(`document.querySelectorAll('.pdf-marks [data-mark-id]').length>0`);
  await evaluate(`document.querySelector('[data-pdf=split-done]').click()`);await wait(`document.querySelector('.pdf-viewer').dataset.running==='true'`);
  await evaluate(`document.querySelector('[data-pdf=timer]').click()`);assert.equal((await read()).active.runningSince,null);
  await evaluate(`document.querySelector('[data-pdf=finish]').click()`);await wait(`document.querySelector('[name=practicedMinutes]')`);
  await evaluate(`document.querySelector('[name=practicedMinutes]').value='12.5'`);
  await mkdir('artifacts/beta/2026-10-12/beta2-header/practice-adjustments',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`artifacts/beta/2026-10-12/beta2-header/practice-adjustments/save-${name}.png`,Buffer.from(shot.data,'base64'));
  await evaluate(`document.querySelector('#cp-dialog form').requestSubmit(document.querySelector('button[value=save]'))`);await wait(`document.querySelector('[data-action=edit-session-notes]')`);
  const saved=(await read()).sessions[0];assert.equal(saved.id,active.id);assert.equal(saved.elapsedMs,750000);assert.equal(saved.results.reduce((n,r)=>n+r.elapsedMs,0),750000);assert.ok(saved.recordedElapsedMs>=0);
  await action('piano');await action('work-detail');
 }
 await action('settings');await evaluate(`__sr.midi.simulateDevices([])`);const p=await evaluate(`(()=>{const r=document.querySelector('.cp-midi-status').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await wait(`document.querySelector('#instrument-panel')`);await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});assert.ok(await evaluate(`document.querySelector('#instrument-panel')`));
 assert.deepEqual(errors,[]);
});
