import test from 'node:test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';
import {emptyData} from '../src/companion/model.js';

const fixture=emptyData();fixture.preferences.warmup={enabled:true,minutes:3,exercise:'rotate'};
fixture.works=[{id:'stand',title:'Ballade — synthetic score',composer:'Review composer',onStand:true},
 {id:'long',title:'Prelude in C major BWV 846 — Well Tempered Clavier First Book',composer:'J. S. Bach',onStand:true},
 {id:'third',title:'Gymnopédie No. 1',composer:'Erik Satie',onStand:true},
 {id:'fourth',title:'Für Elise',composer:'Ludwig van Beethoven',onStand:true},
 {id:'shelf',title:'Été',composer:'Debussy',onStand:false},
 {id:'trash',title:'Deleted',trashedAt:'2026-10-15T00:00:00Z',onStand:true}]
 .map(w=>({composer:'',notes:'',passage:'',target:null,bpm:60,stage:'En estudio',...w}));

test('stand selection, horizontal cards, other repertoire pieces and catalogue preserve preparation', {timeout:60000}, async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
 const wait=selector=>evaluate(`new Promise((resolve,reject)=>{let n=0;const i=setInterval(()=>{if(document.querySelector(${JSON.stringify(selector)})){clearInterval(i);resolve();}else if(++n>300){clearInterval(i);reject(Error('Missing '+${JSON.stringify(selector)}));}},20);})`);
 const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 const frames=[],folder=process.env.PREP_CAPTURE;
 const capture=async(state,theme,width,height)=>{if(!folder)return;await mkdir(folder,{recursive:true});const file=`${theme}-${state}-${width}x${height}.png`;await writeFile(`${folder}/${file}`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));frames.push({state,theme,width,height,file});};
 await send('Page.navigate',{url});await wait('.cp-today');
 for(const enabled of [false,true]) {
  await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve();};};})`);
  await send('Page.reload');await wait('.cp-today');
  await evaluate(`document.querySelector('[data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=repertoire]').click()`);await wait('#prepare-form');
  assert.equal(await evaluate(`document.querySelectorAll('[data-action=prepare-select-work]').length`),4);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-prepare [data-action=choose-catalogue],.cp-prepare [data-practice-search],.cp-prepare select[name^=workId]').length`),0);
  await click('[data-action=prepare-select-work]');
  assert.equal(await evaluate(`document.querySelector('[name=workId-0]').value`),'stand');
  await click('.cp-practice-stand button:last-child');
  assert.equal(await evaluate(`document.querySelector('[name=workId-0]').value`),'fourth');
  assert.equal(await evaluate(`document.querySelectorAll('.cp-practice-stand [aria-pressed=true]').length`),1);
  assert.equal(await evaluate(`JSON.parse(document.querySelector('.cp-practice-stand [aria-pressed=true]').dataset.id)[1]`),'fourth');
  for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,568]]) {
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
   await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
   assert.equal(await evaluate(`(()=>{const r=document.querySelector('.cp-practice-stand').getBoundingClientRect(),b=document.querySelector('.cp-practice-stand [aria-pressed=true]').getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1;})()`),true);
   assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth<=document.querySelector('.cp-page').clientWidth+1`),true);
   const sizes=await evaluate(`[...document.querySelectorAll('.cp-practice-stand button')].map(b=>{const r=b.getBoundingClientRect();return[r.width,r.height];})`);assert.ok(sizes.every(([w,h])=>w===176&&h===100));
   const colors=await evaluate(`(()=>{const b=document.querySelector('.cp-practice-stand [aria-pressed=true]'),c=document.querySelector('.cp-practice-piece-check');return{selected:getComputedStyle(b).backgroundColor,plain:getComputedStyle(document.querySelector('.cp-practice-stand [aria-pressed=false]')).backgroundColor,check:getComputedStyle(b.querySelector('.cp-practice-piece-check')).visibility};})()`);assert.notEqual(colors.selected,colors.plain);assert.equal(colors.check,'visible');
   if(!enabled){await capture('selected',theme,width,height);await click('[data-action=prepare-other-pieces]');await capture('other-pieces',theme,width,height);await click('#cp-dialog [data-action=close-dialog]');}
  }
  await click('[data-action=prepare-other-pieces]');
  assert.equal(await evaluate(`document.querySelectorAll('#cp-dialog [data-practice-results] button').length`),5);
  await evaluate(`const search=document.querySelector('[data-practice-search]');search.value='ete';search.dispatchEvent(new Event('input'))`);
  assert.match(await evaluate(`document.querySelector('[data-practice-results]').textContent`),/Été/);
  await click('[data-practice-results] button');
  assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`),false);
  assert.equal(await evaluate(`document.querySelector('[data-practice-selected]').textContent`),'Été');
  await evaluate(`document.querySelector('[name=include-warmup]').checked=${enabled}`);
  await click('[data-action=prepare-other-pieces]');await click('#cp-dialog [data-action=choose-catalogue]');
  await wait('[data-action=return-to-preparation]');
  assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`),false);
  await click('[data-action=return-to-preparation]');await wait('#prepare-form');
  assert.equal(await evaluate(`document.querySelector('[name=include-warmup]').checked`),enabled);
  assert.equal(await evaluate(`document.querySelector('[name=workId-0]').value`),'shelf');
  await click('[data-action=prepare-other-pieces]');await click('#cp-dialog .cp-actions:last-of-type [data-action=prepare-select-work]');
  assert.equal(await evaluate(`document.querySelector('[name=workId-0]').value`),'');
  await click('[data-action=prepare-other-pieces]');await click('[data-practice-results] button');
  await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);await wait('.cp-session');
  const stored=await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{db.close();resolve(q.result)};};})`);
  assert.equal(stored.active.blocks.filter(b=>b.type==='warmup').length,enabled?1:0);assert.equal(stored.preferences.warmup.enabled,true);
  assert.deepEqual(stored.works,fixture.works);
  await click('[data-action=session-end]');await wait('#cp-dialog [data-action=discard-session]');await click('#cp-dialog [data-action=discard-session]');await click('#cp-confirm');await wait('.cp-today');
 }
 assert.deepEqual(errors,[]);
 if(folder){await writeFile(folder+'/notebook.fixture.json',JSON.stringify(fixture,null,2));await writeFile(folder+'/verification.json',JSON.stringify({date:'2026-10-15',surface:'Responsive Chromium browser; synthetic notebook; not native acceptance',frames,errors,sources:Object.fromEntries(await Promise.all(['views.js','app.js','app.css','media-view.js'].map(async f=>[f,createHash('sha256').update(await readFile('src/companion/'+f)).digest('hex')]))),checks:['Uniform 176×100 cards and selected check/color in both themes','Single Other pieces entry; accent-insensitive repertoire search excludes trash','Off-stand selection, choose later and catalogue return preserve draft and per-practice warmup','Notebook work IDs/content unchanged']},null,2));}
});
