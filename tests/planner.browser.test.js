import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { localDate, addDays, weekOf } from '../src/companion/model.js';
import { openBrowser } from './browser.js';

test('weekly assistant previews and saves practice days plus a tutor class without duplicates', { timeout: 60000 }, async t => {
  const { send, evaluate, errors, url } = await openBrowser(t, { companion: true });
  const week = weekOf(addDays(localDate(), 7));
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve();}else if(++n>200){clearInterval(timer);reject(Error('Timeout'));}},20);})`);
  const stored = () => evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{resolve(q.result);db.close();};};})`);
  await send('Page.navigate', { url });
  await wait(`document.querySelector('#app-shell h1')`);
  await evaluate(`document.querySelector('[data-action="calendar"]').click();document.querySelector('[data-action="weekly-planner"]').click();var f=document.querySelector('#weekly-plan-form');f.elements.week.value='${week}';f.elements.context.value='piano';f.elements.minutes.value='30';f.elements.tutor.checked=true;f.elements.tutorDay.value='3';f.elements.tutorTime.value='19:00';f.dispatchEvent(new Event('input',{bubbles:true}));`);
  assert.match(await evaluate(`document.querySelector('.cp-planner-preview').textContent`), /3 prácticas · 90 min \+ clase/);
  assert.equal((await stored()).plans.length, 0, 'preview does not save before submission');
  for (const [width,height] of [[320,568],[390,844],[844,390],[768,1024]]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth>document.querySelector('.cp-page').clientWidth+1`),false,`assistant width ${width}x${height}`);
    if(process.env.UI_SCREENSHOTS) {
      await mkdir('artifacts/agenda',{recursive:true});
      const shot=await send('Page.captureScreenshot',{format:'png'});
      await writeFile(`artifacts/agenda/planner-${width}x${height}.png`,Buffer.from(shot.data,'base64'));
    }
  }
  await evaluate(`document.querySelector('#weekly-plan-form').requestSubmit();document.querySelector('#weekly-plan-form')?.requestSubmit();`);
  await wait(`document.querySelector('.cp-week-agenda')`);
  const data = await stored();
  assert.deepEqual(data.plans.map(p=>p.date),[week,addDays(week,2),addDays(week,4)]);
  assert.ok(data.plans.every(p=>p.blocks[0].minutes===30&&p.blocks[0].type==='free'&&p.context==='piano'));
  assert.equal(data.events.length,1);assert.equal(data.events[0].date,addDays(week,3));assert.equal(data.events[0].time,'19:00');
  assert.equal(data.sessions.length,0,'planning a class never records practice');
  await evaluate(`document.querySelector('[data-action="weekly-planner"]').click();var f=document.querySelector('#weekly-plan-form');f.elements.tutor.checked=true;f.elements.tutorDay.value='3';f.dispatchEvent(new Event('input',{bubbles:true}));`);
  assert.equal(await evaluate(`document.querySelector('#weekly-plan-form [type=submit]').disabled`),true);
  assert.match(await evaluate(`document.querySelector('.cp-planner-preview').textContent`),/Ya tienes una clase/);
  await send('Page.reload');
  await wait(`document.querySelector('#app-shell h1')?.textContent==='Hoy'`);
  assert.equal((await stored()).plans.length,3,'appointments survive restart');
  await evaluate(`document.querySelector('[data-action=calendar]').click();document.querySelector('[data-action=weekly-planner]').click();var f=document.querySelector('#weekly-plan-form');f.elements.week.value='${week}';f.elements.weeks.value='4';f.elements.tutor.checked=true;f.elements.tutorDay.value='3';f.dispatchEvent(new Event('input',{bubbles:true}));`);
  assert.match(await evaluate(`document.querySelector('.cp-planner-preview').textContent`), /9 prácticas · 3 clases con tutor/);
  await evaluate(`document.querySelector('#weekly-plan-form').requestSubmit()`); await wait(`document.querySelector('.cp-week-agenda')`);
  const recurring = await stored(); assert.equal(recurring.plans.length,12); assert.equal(recurring.events.length,4);
  const first = recurring.plans.find(p=>p.recurrence);
  await evaluate(`document.querySelector('[data-action=calendar-next]').click()`);
  await evaluate(`document.querySelector('[data-action=plan-detail][data-id="${first.id}"]').click();document.querySelector('[data-action=cancel-series]').click()`);
  await evaluate(`document.querySelector('#cp-confirm').click()`); await wait(`!document.querySelector('#cp-dialog').open`);
  const cancelled = await stored(); assert.equal(cancelled.plans.length,3); assert.equal(cancelled.events.length,4);
  await send('Page.reload'); await wait(`document.querySelector('#app-shell h1')`);
  assert.equal((await stored()).events.filter(e=>e.recurrence).length,3);
  assert.deepEqual(errors,[]);
});
