import test from 'node:test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';
import {emptyData,beginSession,block,saveSession} from '../src/companion/model.js';
test('Completed practice can be edited, cancelled and saved',async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
 const wait=s=>evaluate(`new Promise(r=>{const i=setInterval(()=>{if(document.querySelector('${s}')){clearInterval(i);r()}},20)})`);
 await send('Page.navigate',{url});await wait('.cp-today');
 const data=emptyData();data.works=['old','new'].map(id=>({id,title:id,composer:'',stage:'En estudio',notes:'',passage:'',target:null,bpm:60}));const a=beginSession({title:'Synthetic saved practice',context:'piano',blocks:[block('repertoire',{workId:'old'})]});a.elapsedMs=a.blockElapsedMs=60000;saveSession(data,a,{notes:'Keep notes',mood:4});
 await evaluate(`new Promise(r=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const tx=q.result.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=r}})`);
 await send('Page.reload');await wait('.cp-today');
 await evaluate(`document.querySelector('[data-action=progress]').click();document.querySelector('[data-action=session-detail]').click();document.querySelector('[data-action=edit-saved-practice]').click()`);await wait('#saved-practice-form');
 await evaluate(`document.querySelector('[name=saved-minutes-0]').value=9;document.querySelector('#cp-dialog [data-action=close-dialog]').click();document.querySelector('[data-action=edit-saved-practice]').click()`);
 assert.equal(await evaluate(`document.querySelector('[name=saved-minutes-0]').value`),'1');
 if(process.env.EDIT_CAPTURE)for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await mkdir(process.env.EDIT_CAPTURE,{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${process.env.EDIT_CAPTURE}/${width}x${height}.png`,Buffer.from(shot.data,'base64'));}

 await evaluate(`document.querySelector('[name=saved-minutes-0]').value=2;document.querySelector('[name=saved-work-0]').value='new';document.querySelector('#saved-block-type').value='free';document.querySelector('#saved-block-add').click();document.querySelector('#saved-practice-form').requestSubmit()`);
 await evaluate(`new Promise(r=>{const i=setInterval(()=>{if(!document.querySelector('#cp-dialog').open){clearInterval(i);r()}},20)})`);
 assert.equal(await evaluate(`document.querySelector('.cp-number').textContent`),'7:00');
 assert.match(await evaluate(`document.querySelector('.cp-content').textContent`),/Keep notes/);
 assert.deepEqual(errors,[]);
});
