import test from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser } from './browser.js';
import { generatedPracticeFixtures } from '../scripts/review/generated-practice-fixtures.mjs';

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
