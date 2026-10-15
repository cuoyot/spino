import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';

test('create open and bounded event series, edit one date and cancel future dates', {timeout:60000}, async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
 const wait=expression=>evaluate(`new Promise((resolve,reject)=>{let n=0;const i=setInterval(()=>{if(${expression}){clearInterval(i);resolve();}else if(++n>300){clearInterval(i);reject(Error('Timed out'));}},20);})`);
 const stored=()=>evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{resolve(q.result);db.close();};};})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('[data-action=new-event]')`);
 await evaluate(`document.querySelector('[data-action=new-event]').click();var f=document.querySelector('#event-form');f.elements.title.value='Monthly lesson';f.elements.date.value='2030-01-31';f.elements.frequency.value='monthly';f.elements.frequency.dispatchEvent(new Event('change'));`);
 assert.equal(await evaluate(`document.querySelector('#event-form').elements.until.required`),false);
 await evaluate(`document.querySelector('#event-form').elements.until.value='2030-01-01'`);
 assert.equal(await evaluate(`document.querySelector('#event-form').checkValidity()`),false);
 await evaluate(`document.querySelector('#event-form').elements.until.value=''`);
 for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]) {
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await evaluate(`document.querySelector('#event-form [name=frequency]').scrollIntoView({block:'center'})`);
   assert.equal(await evaluate(`document.querySelector('#event-form').scrollWidth<=document.querySelector('#event-form').clientWidth+1`),true);
   if(process.env.EVENT_CAPTURE){await mkdir(process.env.EVENT_CAPTURE,{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${process.env.EVENT_CAPTURE}/${width}x${height}.png`,Buffer.from(shot.data,'base64'));}
 }
 await evaluate(`document.querySelector('#event-form').requestSubmit()`);await wait(`document.querySelector('[data-action=edit-event]')`);
 const initial=(await stored()).events;assert.equal(initial.length,1);assert.equal(initial[0].recurrence.until,null);assert.equal(initial[0].recurrence.frequency,'monthly');
 assert.match(await evaluate(`document.querySelector('.cp-content').textContent`),/Cada mes · Sin fecha de fin/);
 await evaluate(`document.querySelector('[data-action=edit-event]').click();document.querySelector('#event-form').elements.title.value='Only this lesson';document.querySelector('#event-form').requestSubmit()`);
 await wait(`!document.querySelector('#cp-dialog').open`);
 const edited=(await stored()).events;assert.equal(edited.length,2);assert.equal(edited[0].title,'Monthly lesson');assert.deepEqual(edited[0].recurrence.excluded,['2030-01-31']);assert.equal(edited[1].title,'Only this lesson');
 await evaluate(`document.querySelector('[data-action=cancel-series]').click();document.querySelector('#cp-confirm').click()`);await wait(`!document.querySelector('#cp-dialog').open`);assert.equal((await stored()).events.length,0);
 await evaluate(`document.querySelector('[data-action=home]').click();document.querySelector('[data-action=new-event]').click();var f=document.querySelector('#event-form');f.elements.title.value='Weekly rehearsal';f.elements.date.value='2030-03-01';f.elements.frequency.value='weekly';f.elements.frequency.dispatchEvent(new Event('change'));f.elements.until.value='2030-03-15';f.requestSubmit()`);
 await wait(`document.querySelector('[data-action=edit-event]')`);await send('Page.reload');await wait(`document.querySelector('[data-action=new-event]')`);
 const saved=(await stored()).events;assert.equal(saved.length,1);assert.equal(saved[0].recurrence.until,'2030-03-15');assert.equal(saved[0].recurrence.frequency,'weekly');
 assert.deepEqual(errors,[]);
});
