import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { openBrowser } from './browser.js';
import { emptyData } from '../src/companion/model.js';

const fixture=emptyData();
fixture.preferences={...fixture.preferences,language:'es',theme:'light'};
fixture.works=[['bach','Prelude in C major BWV 846 — Well Tempered Clavier First Book','J. S. Bach',true],['satie','Gymnopédie No. 1','Erik Satie',true],['shelf','Été','Review composer',false],['trash','Deleted piece','',false]].map(([id,title,composer,onStand])=>({id,title,composer,onStand,stage:'En estudio',passage:'',notes:'Synthetic notebook',target:null,bpm:60,...(id==='trash'?{trashedAt:'2026-11-01T12:00:00Z'}:{})}));

test('repertoire selects multiple stand/search pieces and starts with fixed total and separate identities',{timeout:60000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const wait=selector=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(document.querySelector(${JSON.stringify(selector)})){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('timeout'))}},20)})`);
 const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 await send('Page.navigate',{url});await wait('.cp-today');
 await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve()}}})`);
 await send('Page.reload');await wait('.cp-today');
 await click('.cp-nav [data-action=practice]');await click('[data-action=prepare][data-id=repertoire]');await wait('#prepare-form');
 assert.equal(await evaluate(`document.querySelectorAll('[name^=type-],[name^=minutes-],[data-action=block-add]').length`),0);
 await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);
 assert.match(await evaluate(`document.querySelector('#prepare-error').textContent`),/Selecciona/);
 await click('[data-action=prepare-toggle-piece][data-id=bach]');await click('[data-action=prepare-toggle-piece][data-id=satie]');
 assert.equal(await evaluate(`document.querySelectorAll('.cp-practice-stand [aria-pressed=true]').length`),2);
 await click('[name=include-warmup]');
 await evaluate(`{const s=document.querySelector('[name=warmup-kind]');s.value='free';s.dispatchEvent(new Event('change',{bubbles:true}))}`);
 assert.equal(await evaluate(`document.querySelector('#practice-duration').value`),'40');
 const folder=process.env.SPINO_REPERTOIRE_EVIDENCE,frames=[];
 if(folder)await mkdir(folder,{recursive:true});
 for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
  assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth<=document.querySelector('.cp-page').clientWidth+1`),true);
  for(const state of ['selected','search']) {
   if(state==='search')await click('[data-action=prepare-browse-repertoire]');
   if(folder){const file=`${theme}-${state}-${width}x${height}.png`;await writeFile(folder+'/'+file,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));frames.push(file);}
   if(state==='search')await click('#cp-dialog [data-action=close-dialog]');
  }
 }
 await click('[data-action=prepare-browse-repertoire]');
 assert.equal(await evaluate(`document.querySelectorAll('[data-repertoire-results] button').length`),3);
 await evaluate(`{const s=document.querySelector('[data-repertoire-search]');s.value='ete';s.dispatchEvent(new Event('input'))}`);
 await click('[data-repertoire-results] button');
 assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`),true);
 assert.equal(await evaluate(`document.querySelector('[data-repertoire-results] button').getAttribute('aria-pressed')`),'true');
 await click('[data-repertoire-results] button');
 assert.equal(await evaluate(`document.querySelector('[data-repertoire-results] button').getAttribute('aria-pressed')`),'false');
 await click('[data-repertoire-results] button');await click('#cp-dialog [data-action=close-dialog]');
 assert.equal(await evaluate(`document.querySelectorAll('.cp-practice-stand [aria-pressed=true]').length`),3);
 await click('[data-action=prepare-change-mode]');await wait('#prepare-form');
 assert.equal(await evaluate(`document.querySelectorAll('.cp-practice-stand [aria-pressed=true]').length`),3);
 assert.equal(await evaluate(`document.querySelector('#practice-duration').value`),'40');
 await click('[data-action=prepare-toggle-piece][data-id=satie]');await click('[data-action=prepare-toggle-piece][data-id=satie]');
 await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);await wait('.cp-session');
 const stored=await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{db.close();resolve(q.result)}}})`);
 assert.equal(stored.active.blocks.reduce((n,b)=>n+b.minutes,0),40);
 assert.equal(stored.active.blocks[0].warmupKind,'free');
 assert.deepEqual(stored.active.blocks.slice(1).map(b=>b.workId),['bach','shelf','satie']);
 assert.equal(new Set(stored.active.blocks.map(b=>b.id)).size,4);
 assert.deepEqual(stored.works,fixture.works);assert.deepEqual(stored.sessions,[]);assert.deepEqual(errors,[]);
 if(folder)await writeFile(folder+'/verification.json',JSON.stringify({date:'2026-11-10',surface:'Responsive browser; synthetic notebook; not native acceptance',frames,fixture,errors,sources:Object.fromEntries(await Promise.all(['app.js','views.js','app.css','repertoire-preparation.js'].map(async f=>[f,createHash('sha256').update(await readFile('src/companion/'+f)).digest('hex')]))),checks:['Multiple stand and off-stand selections; deselection; search accents; trash exclusion','Fixed total and optional warm-up; mode return; unique per-piece activity IDs','No block creation controls in default repertoire setup','Both themes/four orientations/320px; notebook works/history retained']},null,2));
});
