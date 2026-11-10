import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
const wait=(evaluate,expression)=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('Mode timeout'))}},20)})`);

test('all practice types choose Mobile or With piano before configuration, retaining the draft',{timeout:60000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en',manualPracticeMode:true});await send('Page.navigate',{url});await wait(evaluate,`document.querySelector('.cp-today')`);
 const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 const folder=process.env.SPINO_MODE_EVIDENCE;if(folder)await mkdir(folder,{recursive:true});
 for(const type of ['reading','technique','repertoire','free']) {
  await click('.cp-nav [data-action=practice]');await click(`[data-action=prepare][data-id=${type}]`);
  assert.equal(await evaluate(`document.querySelector('#prepare-form')`),null);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('[data-action=prepare-mode]')].map(b=>b.dataset.id)`),['mobile','piano']);
  assert.equal(await evaluate(`document.querySelector('[data-action=prepare-mode][data-id=mobile]').disabled`),['repertoire','free'].includes(type));
  if(folder)for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]) {
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth<=document.querySelector('.cp-page').clientWidth+1`),true);
   await writeFile(`${folder}/${type}-mode-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  const choose=mode=>click(`[data-action=prepare-mode][data-id=${mode}]`);
  await choose(['reading','technique'].includes(type)?'mobile':'piano');
  if(type==='repertoire') {await click('[data-action=prepare-more]');await click('[data-action=prepare-customize]');}
  assert.equal(await evaluate(`document.querySelector('[name=type-0]').value`),type);
  assert.equal(await evaluate(`document.querySelector('#practice-context').type`),'hidden');
  assert.equal(await evaluate(`document.querySelector('select[name=context]')`),null);
  if(['reading','technique'].includes(type)) {
   assert.equal(await evaluate(`document.querySelector('[name=include-warmup]')`),null);
   await evaluate(`{document.querySelector('[name=passage-0]').value='Preserved musical goal';const d=document.querySelector('#practice-duration');d.value=44;d.dispatchEvent(new Event('input',{bubbles:true}))}`);
   for(const mode of ['piano','mobile','piano']) {
    await click('[data-action=prepare-change-mode]');assert.equal(await evaluate(`document.querySelector('#prepare-form')`),null);await choose(mode);
    assert.equal(await evaluate(`document.querySelector('#practice-duration').value`),'44');
    assert.equal(await evaluate(`document.querySelector('[name=passage-0]').value`),'Preserved musical goal');
    assert.equal(await evaluate(`!!document.querySelector('[name=include-warmup]')`),mode==='piano');
    if(mode==='piano') {await evaluate(`document.querySelector('[name=include-warmup]').click()`);assert.equal(await evaluate(`document.querySelector('[name=minutes-0]').value`),'41');}
   }
  } else {
   assert.equal(await evaluate(`document.querySelector('[name=include-warmup]').checked`),false);
   assert.equal(await evaluate(`document.querySelector('[name=passage-0]').closest('details')`),null);
  }
 }
 assert.deepEqual(errors,[]);
});

test('With piano selects connected MIDI automatically without a third configuration mode',{timeout:30000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en',manualPracticeMode:true});await send('Page.navigate',{url});await wait(evaluate,`document.querySelector('.cp-today')`);
 await evaluate(`__sr.midi.simulateDevices(['Synthetic review MIDI']);document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=reading]').click();document.querySelector('[data-action=prepare-mode][data-id=piano]').click();document.querySelector('#prepare-form').requestSubmit()`);
 await wait(evaluate,`document.querySelector('.cp-session')`);
 const active=await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,r=db.transaction('state').objectStore('state').get('current');r.onsuccess=()=>{resolve(r.result.active);db.close()}}})`);
 assert.equal(active.context,'midi');assert.equal(active.autoMidi,true);assert.equal(active.blocks[0].type,'reading');assert.equal(active.blocks[0].minutes,40);assert.deepEqual(errors,[]);
});
