import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
import {eventDetailFixture} from '../scripts/review/event-detail-fixture.mjs';

test('event detail closes, hides pending practice and shares attributed piece totals with repertoire', {timeout:90000}, async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('Timed out'))}},20)})`);
 const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 const fixture=eventDetailFixture();
 await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('[data-action=event-detail][data-id=review-audition]')`);
 await wait(`document.querySelector('#cp-toast').hidden`);
 const evidence=process.env.EVENT_DETAIL_EVIDENCE;
 if(evidence){await mkdir(evidence,{recursive:true});await writeFile(`${evidence}/fixture.json`,JSON.stringify(fixture,null,2));}
 const measurements=[];
 for(const theme of ['light','dark']) for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await click('.cp-nav [data-action=home]');await click('[data-action=event-detail][data-id=review-audition]');
  await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
  assert.equal(await evaluate(`document.querySelector('.cp-event-overview h1').textContent`),fixture.events[0].title);
  assert.equal(await evaluate(`document.querySelector('.cp-app-header .cp-header-title').textContent`),'Calendario');
  assert.equal(await evaluate(`document.querySelectorAll('.cp-today-resume').length`),0);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-pending-session-dot').length`),1);
  assert.equal(await evaluate(`document.querySelector('.cp-event-countdown strong').textContent`),'5 semanas y 6 días');
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.cp-event-work .cp-work-practice')].map(e=>e.textContent)`),['Total practicado: 1 hr 35 min','Total practicado: 42 min']);
  assert.equal(await evaluate(`document.querySelector('.cp-event-date-tile').getAttribute('datetime')`),fixture.events[0].date);
  assert.equal(await evaluate(`document.querySelector('.cp-event-hour').textContent`),'18:00');
  assert.equal(await evaluate(`(()=>{const a=document.querySelector('.cp-event-date-tile').getBoundingClientRect(),b=document.querySelector('.cp-event-countdown').getBoundingClientRect();return a.right<=b.left&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)})()`),true);
  const layout=await evaluate(`(()=>{const p=document.querySelector('.cp-page'),edit=document.querySelector('[data-action=edit-event]').getBoundingClientRect(),next=document.querySelector('.cp-event-preparation').getBoundingClientRect();return {overflow:p.scrollWidth>p.clientWidth+1,overlap:edit.bottom>next.top}})()`);
  assert.deepEqual(layout,{overflow:false,overlap:false});measurements.push({theme,width,height,...layout});
  if(evidence) await writeFile(`${evidence}/${theme}-event-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  if(evidence){
   await evaluate(`document.querySelector('.cp-event-repertoire').scrollIntoView({block:'start'})`);
   await writeFile(`${evidence}/${theme}-event-pieces-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
   assert.equal(await evaluate(`!!document.querySelector('.cp-event-overview [data-action=close-event]')`),true);
  }
  await click('[data-action=close-event]');assert.equal(await evaluate(`document.querySelector('.cp-page').dataset.view`),'calendar');
  await click('.cp-nav [data-action=piano]');
  await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.cp-repertoire-stand .cp-work-practice')].map(e=>e.textContent)`),['Total practicado: 1 hr 35 min','Total practicado: 42 min']);
  if(evidence) await writeFile(`${evidence}/${theme}-repertoire-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 }
 await click('.cp-nav [data-action=home]');await click('[data-action=event-detail][data-id=review-audition]');
 await click('[data-milestone="0"]');await click('[data-action=edit-event]');
 assert.equal(await evaluate(`document.querySelector('#event-form').elements.title.value`),'Audicion de nadal');
 await evaluate(`document.querySelector('#event-form').requestSubmit()`);await wait(`!document.querySelector('#cp-dialog').open`);
 assert.equal(await evaluate(`document.querySelector('[data-milestone="0"]').checked`),true);
 const retained=await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{db.close();resolve(q.result)}}})`);
 assert.deepEqual(retained.sessions,fixture.sessions);assert.deepEqual(retained.active,fixture.active);assert.deepEqual(retained.works,fixture.works);
 assert.deepEqual(errors,[]);
 if(evidence)await writeFile(`${evidence}/verification.json`,JSON.stringify({surface:'Responsive browser; synthetic notebook; not native acceptance',measurements,runtimeErrors:errors,retention:'Sessions, active practice and works unchanged; event ID and milestone retained'},null,2));
});
