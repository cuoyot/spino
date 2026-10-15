import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
import {emptyData} from '../src/companion/model.js';
test('Progress separates activity, repertoire and technique',async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
 const wait=s=>evaluate(`new Promise(r=>{const i=setInterval(()=>{if(document.querySelector('${s}')){clearInterval(i);r()}},20)})`);
 await send('Page.navigate',{url});await wait('.cp-today');
 const data=emptyData();data.works=[{id:'piece',title:'Synthetic piece',composer:'',stage:'En estudio',notes:'',passage:'Bars 1–8',target:null,bpm:60}];
 await evaluate(`new Promise(r=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const tx=q.result.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=r}})`);
 await send('Page.reload');await wait('.cp-today');await evaluate(`document.querySelector('[data-action=progress]').click()`);
 for(const section of ['activity','repertoire','technique']){
  await evaluate(`document.querySelector('[data-action=progress-section][data-id=${section}]').click()`);
  assert.equal(await evaluate(`document.querySelector('.cp-progress-sections [aria-current]').dataset.id`),section);
  assert.equal(await evaluate(`!!document.querySelector('.cp-four-weeks')`),section==='activity');
  if(section==='repertoire')assert.match(await evaluate(`document.querySelector('.cp-progress-page').textContent`),/Bars 1–8/);
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth<=document.querySelector('.cp-page').clientWidth+1`),true);
   if(process.env.PROGRESS_CAPTURE){await mkdir(process.env.PROGRESS_CAPTURE,{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${process.env.PROGRESS_CAPTURE}/${section}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));}
  }
 }
 await evaluate(`document.querySelector('[data-action=progress-section][data-id=repertoire]').click();document.querySelector('[data-action=work-detail]').click()`);
 assert.match(await evaluate(`document.querySelector('.cp-content').textContent`),/Bars 1–8/);assert.deepEqual(errors,[]);
});
