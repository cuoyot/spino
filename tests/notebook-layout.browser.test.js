import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser, disableWarmup } from './browser.js';

test('compact preparation, calendar and dashboard adapt to phone/tablet orientations', {timeout:60000}, async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  await send('Page.navigate',{url});
  await evaluate(`new Promise(r=>{const timer=setInterval(()=>{if(document.querySelector('#app-shell h1')){clearInterval(timer);r();}},20);})`);
  for(const [width,height] of [[320,568],[360,640],[390,844],[844,390],[768,1024],[1180,820]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    await evaluate(`document.querySelector('[data-action="home"]').click();document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action="prepare"][data-id="reading"]').click()`);
    await new Promise(r=>setTimeout(r,100));
    const layout=await evaluate(`(()=>{const page=document.querySelector('.cp-page'),start=document.querySelector('#prepare-form button[type="submit"]'),r=start.getBoundingClientRect();return {overflow:page.scrollWidth>page.clientWidth+1,startBottom:r.bottom,pageBottom:page.getBoundingClientRect().bottom,titleField:!!document.querySelector('#prepare-form [name="title"]')};})()`);
    assert.equal(layout.overflow,false,`${width}x${height} preparation width`);
    assert.equal(layout.titleField,false,'session name is deferred');
    assert.ok(layout.startBottom<=layout.pageBottom+1,`${width}x${height} start action visible: ${JSON.stringify(layout)}`);
    for(const [route,name] of [[null,'prepare'],['home','today'],['calendar','calendar-week'],['calendar-mode','calendar-month'],['piano','dashboard']]) {
      if(route)await evaluate(`document.querySelector('[data-action="${route}"]${route === 'calendar-mode' ? '[data-id="month"]' : ''}').click()`);
      if(name==='calendar-week')await evaluate(`document.querySelector('[data-action="calendar-mode"][data-id="week"]').click()`);
      assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth>document.querySelector('.cp-page').clientWidth+1`),false,`${width}x${height} ${name}`);
      if(name==='calendar-month')assert.ok(await evaluate(`document.querySelectorAll('.cp-day').length>=28`));
      if(name==='calendar-week')assert.equal(await evaluate(`document.querySelectorAll('.cp-agenda-day').length`),14);
      if(process.env.UI_SCREENSHOTS){await mkdir('artifacts/review',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`artifacts/review/${name}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));}
    }
  }
  await evaluate(`document.querySelector('[data-action="settings"]').click();document.querySelector('[data-action=profile-practice]').click();document.querySelector('#preferences-form [name="reading-bpm"]').value='85';const select=document.querySelector('#preferences-form [name="context"]');select.value='midi';select.dispatchEvent(new Event('change',{bubbles:true}));`);
  assert.equal(await evaluate(`document.querySelector('#preferences-form [name="reading-bpm"]').value`),'85','changing preferences must not discard unsaved fields');
  assert.equal(await evaluate(`document.querySelector('#preferences-form [name="context"]').value`),'midi');
  assert.deepEqual(errors,[]);
});

test('saved routines start directly and their configuration remains unchanged', {timeout:60000},async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  await send('Page.navigate',{url});
  const wait=expression=>evaluate(`new Promise(r=>{const timer=setInterval(()=>{if(${expression}){clearInterval(timer);r();}},20);})`);
  await wait(`document.querySelector('#app-shell h1')`);
  await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action="prepare"][data-id="reading"]').click();document.querySelector('[name="target-0"]').value='G-major';document.querySelector('[data-action="prepare-more"]').click();document.querySelector('[data-action="save-routine"]').click();document.querySelector('#cp-dialog [name="title"]').value='G warm-up';document.querySelector('#cp-dialog form').requestSubmit()`);
  await wait(`document.querySelector('[data-action="start-routine"]')`);
  await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action="quick-routine"]').click()`);
  await wait(`__sr.timed`);
  assert.equal(await evaluate(`document.querySelector('#reader-view').hidden`),false);
  assert.equal(await evaluate(`__sr.line.key`),'G');
  assert.equal(await evaluate(`__sr.settings.input`),'piano');
  assert.deepEqual(errors,[]);
});

for (const context of ['piano', 'midi']) test(`fixed-page browsing preserves notes and pauses safely: ${context}`, {timeout:60000}, async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url});
  const wait=expression=>evaluate(`new Promise((resolve,reject)=>{let count=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve();}else if(++count>200){clearInterval(timer);reject(Error('timeout'));}},20);})`);
  await wait(`document.querySelector('#app-shell h1')`);
  await disableWarmup(evaluate);
  await evaluate(`__sr.midi.simulateDevices(['Test piano']);document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action="prepare"][data-id="reading"]').click();document.querySelector('[name="context"]').value='${context}';document.querySelector('[name="presentation-0"]').value='page';document.querySelector('#prepare-form').requestSubmit()`);
  await wait(`document.querySelector('[data-action="open-reader"]')`);
  await evaluate(`document.querySelector('[data-action="open-reader"]').click()`);
  await wait(`__sr.timed`);
  const before=await evaluate(`({notes:JSON.stringify(__sr.line.notes.slice(0,16)),wrong:document.querySelector('#s-wrong').textContent,correct:document.querySelector('#s-correct').textContent})`);
  await evaluate(`document.querySelector('#score-next').click()`);
  assert.equal(await evaluate(`document.querySelector('#score-pages').hidden`),false);
  assert.ok(await evaluate(`__sr.timed.suspendedAt!=null&&__sr.line.pageStart>0`));
  await evaluate(`document.querySelector('#score-prev').click()`);
  const after=await evaluate(`({notes:JSON.stringify(__sr.line.notes.slice(0,16)),wrong:document.querySelector('#s-wrong').textContent,correct:document.querySelector('#s-correct').textContent})`);
  assert.deepEqual(after,before);assert.equal(await evaluate(`__sr.line.pageStart`),0);
  const focused = await evaluate(`(()=>{const i=__sr.line.onsets.findIndex(b=>b>=4),r=__sr.layout.elementOf(i).getBoundingClientRect(),el=document.querySelector('#staff-wrap'),opts={bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,pointerId:7,pointerType:'touch'};el.dispatchEvent(new PointerEvent('pointerdown',opts));el.dispatchEvent(new PointerEvent('pointerup',opts));return {expected:__sr.line.onsets[i],actual:__sr.line.onsets[__sr.line.idx],wrong:document.querySelector('#s-wrong').textContent};})()`);
  assert.equal(focused.actual, focused.expected, 'Tapping a paused note moves focus to its onset.');
  assert.equal(focused.wrong, before.wrong, 'Moving focus does not count skipped notes as errors.');
  await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
  await new Promise(r=>setTimeout(r,100));
  assert.equal(await evaluate(`__sr.timed.suspendedAt!=null`),true);
  assert.equal(await evaluate(`JSON.stringify(__sr.line.notes.slice(0,16))`),before.notes);
  assert.equal(await evaluate(`__sr.line.onsets[__sr.line.idx]`), focused.actual, 'Rotation retains selected focus.');
  await evaluate(`document.querySelector('#start').click()`);
  assert.equal(await evaluate(`__sr.timed.suspendedAt`),null);
  assert.deepEqual(errors,[]);
});
