import test from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser } from './browser.js';
import { generatedPracticeFixtures } from '../scripts/review/generated-practice-fixtures.mjs';
import { sessionFixtures } from '../scripts/review/session-fixtures.mjs';

test('practice seconds repaint promptly between checkpoints without redundant DOM writes', { timeout: 30000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  await send('Page.navigate', { url });
  await evaluate(`new Promise(resolve=>{const timer=setInterval(()=>{if(document.querySelector('.cp-today')){clearInterval(timer);resolve();}},20);})`);
  await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(sessionFixtures().running)},'current');tx.oncomplete=()=>{db.close();resolve();};};})`);
  await send('Page.reload');
  await evaluate(`new Promise(resolve=>{const timer=setInterval(()=>{if(document.querySelector('[data-action=resume-session]')){clearInterval(timer);resolve();}},20);})`);
  const result = await evaluate(`(async()=>{
    document.querySelector('[data-action=resume-session]').click();
    const realNow=Date.now;let now=realNow();Date.now=()=>now;
    const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    try {
      document.querySelector('[data-action=open-free-practice]').click();
      await frames();
      const clock=document.querySelector('[data-block-clock]'),samples=[];
      let writes=0;const observer=new MutationObserver(records=>writes+=records.length);
      observer.observe(clock,{childList:true,characterData:true,subtree:true});
      for(let second=1;second<=7;second++){
        now+=1000;await frames();samples.push(clock.textContent);
      }
      const changedWrites=writes;await frames();const idleWrites=writes-changedWrites;
      now+=3700;await frames();const caughtUp=clock.textContent;
      observer.disconnect();
      document.querySelector('[data-action=toggle-session]').click();
      now+=3000;await frames();const paused=document.querySelector('[data-block-clock]').textContent;
      document.querySelector('[data-action=toggle-session]').click();now+=1000;await frames();
      return {samples,changedWrites,idleWrites,caughtUp,paused,resumed:document.querySelector('[data-block-clock]').textContent};
    } finally { Date.now=realNow; }
  })()`);
  assert.deepEqual(result.samples, ['8:01','8:02','8:03','8:04','8:05','8:06','8:07']);
  assert.equal(result.changedWrites, 7, 'Each second should change the clock once.');
  assert.equal(result.idleWrites, 0, 'Unchanged seconds should keep their text node.');
  assert.equal(result.caughtUp, '8:10', 'Delayed frames must show elapsed time without losing seconds.');
  assert.equal(result.paused, '8:10');
  assert.equal(result.resumed, '8:11');
  assert.deepEqual(errors, []);
});

for (const mode of ['timed-reading', 'self-paced-reading', 'piano-reading']) {
  test(`practice time advances, pauses and survives return: ${mode}`, { timeout: 30000 }, async t => {
    const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
    const wait = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve();}else if(++n>400){clearInterval(timer);reject(Error('Clock probe timed out'));}},25);})`);
    await send('Page.navigate', { url });
    await wait(`document.querySelector('.cp-today')`);
    const fixture = generatedPracticeFixtures()[mode === 'piano-reading' ? 'timed-reading' : mode];
    if (mode === 'piano-reading') fixture.active.context = 'piano';
    await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve();};};})`);
    await send('Page.reload');
    await wait(`document.querySelector('[data-action=resume-session]')`);
    await evaluate(`document.querySelector('[data-action=resume-session]').click();document.querySelector('[data-action=open-reader]').click()`);
    await wait(`window.__sr?.timed || window.__sr?.waiting`);
    const seconds = text => text.split(':').reduce((total, part) => total * 60 + Number(part), 0);
    await evaluate(`new Promise(resolve=>setTimeout(resolve,2200))`);
    const active = await evaluate(`document.querySelector('#practice-clock').textContent`);
    const visibility = await evaluate(`getComputedStyle(document.querySelector('#practice-clock')).visibility`);
    console.log(`${mode} timer visibility: ${visibility}`);
    console.log(`${mode} playing clock: ${active}`);
    assert.ok(seconds(active) >= 1, 'Elapsed practice time should advance during play.');
    await evaluate(`document.querySelector('#start').click()`);
    await evaluate(`new Promise(resolve=>setTimeout(resolve,600))`);
    const paused = await evaluate(`document.querySelector('#practice-clock').textContent`);
    await evaluate(`new Promise(resolve=>setTimeout(resolve,1600))`);
    assert.equal(await evaluate(`document.querySelector('#practice-clock').textContent`), paused, 'Paused time must stay fixed.');
    await evaluate(`document.querySelector('#start').click()`);
    await evaluate(`new Promise(resolve=>setTimeout(resolve,2200))`);
    assert.ok(seconds(await evaluate(`document.querySelector('#practice-clock').textContent`)) >= seconds(paused) + 1, 'Resuming must add time.');
    await evaluate(`document.querySelector('#practice-return').click()`);
    await wait(`document.querySelector('[data-session-clock]')`);
    const clocks = await evaluate(`({session:document.querySelector('[data-session-clock]').textContent,block:document.querySelector('[data-block-clock]').textContent})`);
    console.log(`${mode} returned clocks: ${JSON.stringify(clocks)}`);
    assert.ok(seconds(clocks.session) >= 4);
    assert.equal(clocks.block, clocks.session);
    assert.deepEqual(errors, []);
    assert.equal(visibility, 'visible', 'Practised time should be visible for this input mode.');
  });
}
