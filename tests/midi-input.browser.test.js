import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser } from './browser.js';

test('open Web MIDI input survives consecutive reading sessions and activity stays visible when paused', { timeout: 60000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    let time=1000,id=0;const frames=new Map();performance.now=()=>time;
    requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};cancelAnimationFrame=id=>frames.delete(id);
    window.frameAt=at=>{time=at;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(time));};
    window.midiRequests=0;window.portOpens=0;
    window.testInput={name:'Test input',state:'connected',connection:'closed',open:async function(){portOpens++;this.connection='open';return this;}};
    Object.defineProperty(navigator,'requestMIDIAccess',{value:async()=>{midiRequests++;return {inputs:new Map([['input',testInput]])};}});
  ` });
  await send('Page.navigate', { url });
  const wait = expr => evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(${expr}){clearInterval(t);resolve();}else if(++n>500){clearInterval(t);reject(Error('timeout'));}},20);})`);
  await wait(`document.querySelector('.cp-midi-status [data-midi-indicator][data-connected=true]')`);
  for (let session = 0; session < 2; session++) {
    await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=reading]').click();{const c=document.querySelector('#practice-context');c.value='midi';c.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('#prepare-form').requestSubmit()`);
    await wait(`document.querySelector('[data-action=open-reader]')`);
    await evaluate(`document.querySelector('[data-action=open-reader]').click()`);
    await wait(`__sr.timed`);
    await evaluate(`frameAt(__sr.timed.t0);testInput.onmidimessage({data:[0x91,__sr.line.notes[0].midi,80]})`);
    assert.equal(await evaluate(`Number(document.querySelector('#s-correct').textContent)`), 1);
    assert.ok(await evaluate(`document.querySelector('#practice-midi [data-active=true][data-connected=true][data-input=midi]').getBoundingClientRect().width>0`));
    await evaluate(`document.querySelector('#start').click();testInput.onmidimessage({data:[0x90,60,80]})`);
    assert.equal(await evaluate(`Number(document.querySelector('#s-correct').textContent)`), 1);
    assert.ok(await evaluate(`!!document.querySelector('#practice-midi [data-active=true]')`));
    await evaluate(`document.querySelector('#practice-return').click();document.querySelector('[data-action=discard-session]').click();document.querySelector('#cp-confirm').click()`);
    await wait(`document.querySelector('.cp-today')`);
  }
  await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=reading]').click();document.querySelector('#practice-context').value='piano';document.querySelector('#prepare-form').requestSubmit()`);
  await wait(`document.querySelector('[data-action=use-midi]')`);
  await evaluate(`document.querySelector('[data-action=use-midi]').click()`);
  await wait(`document.querySelector('.cp-midi-status [data-midi-indicator][data-input=midi]')`);
  await evaluate(`document.querySelector('[data-action=open-reader]').click()`);
  await wait(`__sr.timed`);
  await evaluate(`frameAt(__sr.timed.t0);testInput.onmidimessage({data:[0x90,__sr.line.notes[0].midi,80]})`);
  assert.equal(await evaluate(`Number(document.querySelector('#s-correct').textContent)`), 1);
  assert.equal(await evaluate('midiRequests'), 1);
  assert.equal(await evaluate('portOpens'), 1);
  assert.deepEqual(errors, []);
});
