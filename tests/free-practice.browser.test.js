import test from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser } from './browser.js';
import { sessionFixtures } from '../scripts/review/session-fixtures.mjs';

test('dedicated free practice retains time and offers selectable visual metronome', {timeout:30000}, async t => {
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.metroOscillators=0;const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(...args){window.metroOscillators++;return original.apply(this,args);};`});
  const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('Free practice timeout'));}},20);})`);
  await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
  const fixture=sessionFixtures().running;
  await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve();};};})`);
  await send('Page.reload');await wait(`document.querySelector('[data-action=resume-session]')`);
  await evaluate(`document.querySelector('[data-action=resume-session]').click();document.querySelector('[data-action=open-free-practice]').click()`);
  await wait(`document.querySelector('.cp-free-practice')`);
  assert.equal(await evaluate(`document.querySelector('[data-block-clock]').textContent`),'8:00');
  assert.equal(await evaluate(`document.querySelectorAll('[data-action=session-end]').length`),0);
  await evaluate(`document.querySelector('[data-metro-setting=mode]').value='visual';document.querySelector('[data-metro-setting=mode]').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-metro-setting=beats]').value='3';document.querySelector('[data-metro-setting=beats]').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-action=toggle-metronome]').click()`);
  await wait(`document.querySelector('[data-metro-beat].is-active')`);
  assert.equal(await evaluate(`window.metroOscillators`),0,'Visual-only mode must not produce audio.');
  assert.equal(await evaluate(`document.querySelectorAll('[data-metro-beat]').length`),3);
  await evaluate(`document.querySelector('[data-action=toggle-session]').click()`);
  assert.equal(await evaluate(`document.querySelector('[data-action=toggle-metronome]').getAttribute('aria-pressed')`),'false');
  const paused=await evaluate(`document.querySelector('[data-block-clock]').textContent`);
  await evaluate(`new Promise(resolve=>setTimeout(resolve,1100))`);
  assert.equal(await evaluate(`document.querySelector('[data-block-clock]').textContent`),paused);
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth>document.querySelector('.cp-page').clientWidth+1`),false);
  }
  await evaluate(`document.querySelector('[data-action=free-return]').click()`);
  assert.equal(await evaluate(`document.querySelector('[data-session-clock]').textContent`),paused);
  await evaluate(`document.querySelector('[data-action=open-free-practice]').click()`);
  assert.equal(await evaluate(`document.querySelector('[data-metro-setting=mode]').value`),'visual');
  assert.equal(await evaluate(`document.querySelector('[data-metro-setting=beats]').value`),'3');
  await evaluate(`document.querySelector('[data-metro-setting=mode]').value='audio';document.querySelector('[data-metro-setting=mode]').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-action=toggle-metronome]').click()`);
  await wait(`window.metroOscillators>0`);
  assert.equal(await evaluate(`document.querySelectorAll('[data-metro-beat].is-active').length`),0,'Audio-only mode does not flash beat indicators.');
  await evaluate(`document.querySelector('[data-action=free-return]').click()`);
  await send('Page.reload');await wait(`document.querySelector('[data-action=resume-session]')`);
  await evaluate(`document.querySelector('[data-action=resume-session]').click();document.querySelector('[data-action=open-free-practice]').click()`);
  assert.equal(await evaluate(`document.querySelector('[data-metro-setting=mode]').value`),'audio','Settings survive notebook recovery.');
  assert.equal(await evaluate(`document.querySelector('[data-metro-setting=beats]').value`),'3');
  await evaluate(`document.querySelector('[data-metro-setting=mode]').value='both';document.querySelector('[data-metro-setting=mode]').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-action=toggle-metronome]').click()`);
  await wait(`window.metroOscillators>0 && document.querySelector('[data-metro-beat].is-active')`);
  await evaluate(`document.querySelector('[data-action=toggle-session]').click();window.tempoProbeNow=performance.now();performance.now=()=>window.tempoProbeNow;document.querySelector('[data-action=tap-tempo]').click()`);
  await evaluate(`window.tempoProbeNow+=500;document.querySelector('[data-action=tap-tempo]').click()`);
  assert.equal(await evaluate(`document.querySelector('[data-metro-setting=bpm]').value`),'120','Two taps 500 ms apart select 120 BPM.');
  for(const bpm of [40,50,60]){
    await evaluate(`{const field=document.querySelector('input[type=number][data-metro-setting=bpm]');field.value=${bpm};field.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-action=metro-favorite-add]').click();}`);
  }
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('[data-action=metro-favorite]'),b=>Number(b.dataset.id))`),[40,50,60]);
  for(const [width,height] of [[320,740],[390,844],[844,390],[768,1024],[1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate(`(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect(),favorites=rect('.cp-tempo-favorites'),tempo=rect('.cp-tempo-fader'),volume=rect('.cp-volume-fader'),dial=rect('.cp-tempo-dial'),card=rect('.cp-metronome');const placement=innerWidth>innerHeight ? favorites.top>=dial.bottom && favorites.right<tempo.left && favorites.bottom<=innerHeight : favorites.top>=Math.max(tempo.bottom,volume.bottom)-1;return placement && Array.from(document.querySelectorAll('.cp-tempo-favorites button')).every(b=>{const r=b.getBoundingClientRect();return r.left>=card.left && r.right<=card.right && r.top>=favorites.top-3 && r.bottom<=favorites.bottom+3;});})()`),true,'Favorite markers fit below the dial in landscape and clear both faders in portrait.');
    if(width>height) assert.equal(await evaluate(`document.querySelector('.cp-beats').getBoundingClientRect().bottom<=document.querySelector('.cp-tempo-dial').getBoundingClientRect().top`),true,'Landscape beat indicators sit above the dial.');
  }
  await evaluate(`document.querySelector('[data-action=metro-favorite][data-id="40"]').click()`);
  assert.equal(await evaluate(`document.querySelector('.cp-tempo-dial strong').textContent`),'40');
  await evaluate(`{const field=document.querySelector('[data-metro-setting=volume]');field.value=0;field.dispatchEvent(new Event('change',{bubbles:true}));window.metroOscillators=0;document.querySelector('[data-action=toggle-metronome]').click();}`);
  await wait(`document.querySelector('[data-metro-beat].is-active')`);
  assert.equal(await evaluate(`window.metroOscillators`),0,'Zero volume is silent but retains visual timing.');
  await evaluate(`document.querySelector('[data-action=free-return]').click()`);
  await send('Page.reload');await wait(`document.querySelector('[data-action=resume-session]')`);
  await evaluate(`document.querySelector('[data-action=resume-session]').click();document.querySelector('[data-action=open-free-practice]').click()`);
  assert.equal(await evaluate(`document.querySelector('[data-metro-setting=volume]').value`),'0');
  assert.equal(await evaluate(`document.querySelectorAll('[data-action=metro-favorite]').length`),3);
  await evaluate(`document.querySelector('[data-action=metro-favorite-remove][data-id="50"]').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('[data-action=metro-favorite]').length`),2);
  assert.equal(await evaluate(`document.querySelector('.cp-tempo-dial input')`),null);
  assert.deepEqual(errors,[]);
});
