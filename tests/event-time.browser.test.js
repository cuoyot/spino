import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';

test('event hour/minute controls retain optional time, midnight, edits and recurrence', {timeout:60000}, async t => {
  const {send, evaluate, url, errors} = await openBrowser(t, {companion:true, language:'es'});
  const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>300){clearInterval(timer);reject(Error('Timed out'));}},20)})`);
  const stored = () => evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,r=db.transaction('state').objectStore('state').get('current');r.onsuccess=()=>{db.close();resolve(r.result)}}})`);
  const choose = async (hour, minute) => evaluate(`(()=>{const f=document.querySelector('#event-form');for(const [name,value] of ${JSON.stringify([['eventHour',hour],['eventMinute',minute]])}){f.elements[name].value=value;f.elements[name].dispatchEvent(new Event('change',{bubbles:true}))}return f.elements.time.value})()`);
  await send('Page.navigate', {url});
  await wait(`document.querySelector('[data-action=new-event]')`);
  await evaluate(`document.querySelector('[data-action=new-event]').click();var f=document.querySelector('#event-form');f.elements.title.value='Time regression';f.elements.date.value='2030-01-31';f.elements.frequency.value='weekly';f.elements.frequency.dispatchEvent(new Event('change'))`);
  assert.equal(await choose('', '00'), '');
  assert.equal(await choose('00', '00'), '00:00');
  assert.equal(await choose('23', '59'), '23:59');
  await choose('18','35');
  for (const theme of ['light','dark']) for (const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    await evaluate(`document.documentElement.dataset.theme='${theme}';document.querySelector('.cp-event-time').scrollIntoView({block:'center'})`);
    assert.equal(await evaluate(`(()=>{const f=document.querySelector('#event-form'),r=f.getBoundingClientRect();return f.scrollWidth<=f.clientWidth+1&&[...f.querySelectorAll('.cp-event-time select')].every(s=>{const b=s.getBoundingClientRect();return b.width>=44&&b.height>=44&&b.left>=r.left&&b.right<=r.right+1})})()`),true);
    if (process.env.EVENT_TIME_CAPTURE) {
      await mkdir(process.env.EVENT_TIME_CAPTURE,{recursive:true});
      const shot=await send('Page.captureScreenshot',{format:'png'});
      await writeFile(`${process.env.EVENT_TIME_CAPTURE}/${theme}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));
    }
  }
  await evaluate(`document.querySelector('#event-form').requestSubmit()`);
  await wait(`document.querySelector('[data-action=edit-event]')`);
  const initial=(await stored()).events[0];
  assert.equal(initial.time,'18:35');
  await evaluate(`document.querySelector('[data-action=edit-event]').click()`);
  assert.deepEqual(await evaluate(`(()=>{const f=document.querySelector('#event-form');return [f.elements.eventHour.value,f.elements.eventMinute.value,f.elements.time.value]})()`),['18','35','18:35']);
  await choose('00','00');
  await evaluate(`document.querySelector('#event-form').requestSubmit()`);
  await wait(`!document.querySelector('#cp-dialog').open`);
  let events=(await stored()).events;
  assert.equal(events.find(e=>e.id!==initial.id).time,'00:00');
  assert.equal(events.find(e=>e.recurrence?.rule).id,initial.id);
  await send('Page.reload');await wait(`document.querySelector('[data-action=new-event]')`);
  await evaluate(`document.querySelector('[data-action=new-event]').click();document.querySelector('#event-form').elements.title.value='No time'`);
  await choose('12','15');await choose('','15');
  await evaluate(`document.querySelector('#event-form').elements.reminder.checked=true;document.querySelector('#event-form').requestSubmit()`);
  await wait(`document.querySelector('#cp-form-error').textContent`);
  assert.equal((await stored()).events.length,2);
  await evaluate(`document.querySelector('#event-form').elements.reminder.checked=false;document.querySelector('#event-form').requestSubmit()`);
  await wait(`!document.querySelector('#cp-dialog').open`);
  assert.equal((await stored()).events.find(e=>e.title==='No time').time,'');
  assert.deepEqual(errors,[]);
});
