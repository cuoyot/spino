import test from 'node:test';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';

test('event calendar selects and persists dates, supports recurrence limits and editing', {timeout:60000}, async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
  const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>300){clearInterval(timer);reject(Error('Timed out'))}},20)})`);
  await send('Page.navigate',{url});
  await wait(`document.querySelector('[data-action=new-event]')`);
  await evaluate(`document.querySelector('[data-action=new-event]').click();var f=document.querySelector('#event-form');f.elements.title.value='Calendar regression';f.elements.date.value='2028-02-01';f.elements.date.dispatchEvent(new Event('change'));document.querySelector('[data-date-field=date] .cp-date-toggle').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('[data-date-field=date] [data-date]').length`),29);
  for(const [width,height] of [[320,640],[390,844],[768,1024],[1024,768]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate(`(()=>{const f=document.querySelector('#event-form');return f.scrollWidth<=f.clientWidth+1})()`),true);
  }
  await evaluate(`document.querySelector('[data-date="2028-02-29"]').click();f.elements.frequency.value='weekly';f.elements.frequency.dispatchEvent(new Event('change'))`);
  await wait(`!document.querySelector('[data-date-field=until] .cp-date-toggle').disabled`);
  await evaluate(`document.querySelector('[data-date-field=until] .cp-date-toggle').click()`);
  assert.equal(await evaluate(`document.querySelector('[data-date-field=until] [data-date="2028-02-28"]').disabled`),true);
  await evaluate(`document.querySelector('[data-date-field=until] [aria-label="Mes siguiente"]').click();document.querySelector('[data-date="2028-03-15"]').click();f.requestSubmit()`);
  await wait(`document.querySelector('[data-action=edit-event]')`);
  const events=await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,r=db.transaction('state').objectStore('state').get('current');r.onsuccess=()=>{db.close();resolve(r.result.events)}}})`);
  assert.equal(events[0].date,'2028-02-29');
  assert.equal(events[0].recurrence.until,'2028-03-15');
  await evaluate(`document.querySelector('[data-action=edit-event]').click();document.querySelector('[data-date-field=date] .cp-date-toggle').click()`);
  assert.equal(await evaluate(`document.querySelector('[data-date="2028-02-29"]').getAttribute('aria-pressed')`),'true');
  await evaluate(`document.querySelector('[data-date-field=date] [aria-label="Mes siguiente"]').click();document.querySelector('[data-date="2028-03-01"]').click();document.querySelector('#event-form').requestSubmit()`);
  await wait(`!document.querySelector('#cp-dialog').open`);
  assert.deepEqual(errors,[]);
});
