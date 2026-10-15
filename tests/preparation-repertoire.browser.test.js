import test from 'node:test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';
import {emptyData} from '../src/companion/model.js';

test('Repertoire shortcuts, whole personal library search and per-practice warm-up', {timeout:60000}, async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
 const wait=selector=>evaluate(`new Promise((resolve,reject)=>{let n=0;const i=setInterval(()=>{if(document.querySelector(${JSON.stringify(selector)})){clearInterval(i);resolve();}else if(++n>300){clearInterval(i);reject(Error('Missing '+${JSON.stringify(selector)}));}},20);})`);
 await send('Page.navigate',{url});await wait('.cp-today');
 for(const enabled of [false,true]) {
  const data=emptyData();data.preferences.warmup={enabled:true,minutes:3,exercise:'rotate'};data.works=[{id:'stand',title:'On stand',composer:'Bach',onStand:true,stage:'En estudio',bpm:60},{id:'shelf',title:'Été',composer:'Debussy',onStand:false,stage:'Archivada',bpm:60},{id:'trash',title:'Deleted',trashedAt:new Date().toISOString(),onStand:true}].map(w=>({composer:'',notes:'',passage:'',target:null,bpm:60,stage:'En estudio',...w}));
  await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=()=>{db.close();resolve();};};})`);
  await send('Page.reload');await wait('.cp-today');
  await evaluate(`document.querySelector('[data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=repertoire]').click()`);await wait('#prepare-form');
  assert.equal(await evaluate(`document.querySelectorAll('[data-action=prepare-select-work]').length`),1);
  await evaluate(`document.querySelector('[data-action=prepare-select-work]').click()`);
  assert.equal(await evaluate(`document.querySelector('[name=workId-0]').value`),'stand');
  await evaluate(`const search=document.querySelector('[data-practice-search]');search.value='ete';search.dispatchEvent(new Event('input',{bubbles:true}))`);
  assert.match(await evaluate(`document.querySelector('[data-practice-results]').textContent`),/Été/);
  await evaluate(`document.querySelector('[data-practice-results] button').click();document.querySelector('[name=include-warmup]').checked=${enabled};document.querySelector('[data-action=choose-catalogue][data-id="0"]').click()`);
  await wait('[data-action=return-to-preparation]');
  await evaluate(`document.querySelector('[data-action=return-to-preparation]').click()`);await wait('#prepare-form');
  assert.equal(await evaluate(`document.querySelector('[name=include-warmup]').checked`),enabled);
  assert.equal(await evaluate(`document.querySelector('[name=workId-0]').value`),'shelf');
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]) {await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth<=document.querySelector('.cp-page').clientWidth+1`),true);if(process.env.PREP_CAPTURE&&!enabled){await mkdir(process.env.PREP_CAPTURE,{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${process.env.PREP_CAPTURE}/preparation-${width}x${height}.png`,Buffer.from(shot.data,'base64'));}}
  await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);
  await wait('.cp-session');
  const stored=await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{db.close();resolve(q.result)};};})`);
  assert.equal(stored.active.blocks.filter(b=>b.type==='warmup').length,enabled?1:0);
  assert.equal(stored.preferences.warmup.enabled,true);
 }
 assert.deepEqual(errors,[]);
});
