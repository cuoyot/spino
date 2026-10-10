import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {openBrowser} from '../../tests/browser.js';
import {writeGallery} from './build-gallery.mjs';
const runId=process.argv[2],folder=resolve('docs/quality-review/captures/repertoire',runId),cleanup=[],results=[];
await mkdir(folder,{recursive:false});
try {
 const {send,evaluate,url,errors}=await openBrowser({after:fn=>cleanup.push(fn)},{companion:true,language:'es'});
 const wait=c=>evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(${c}){clearInterval(t);resolve();}else if(++n>500){clearInterval(t);reject(Error('Repertoire timeout'));}},20);})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite'),s=tx.objectStore('state'),q=s.get('current');q.onsuccess=()=>{const d=q.result;d.works=[['a','Arabesque','Burgmüller',true],['b','Ballade','Chopin',false],['c','Clair de lune','Debussy',false],['d','Gymnopédie','Satie',true]].map(([id,title,composer,onStand])=>({id,title,composer,onStand,stage:'En estudio',tags:[],notes:'',passage:'',bpm:60,target:null}));s.put(d,'current');};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=reject;};})`);
 for(const device of [{id:'phone-portrait',width:390,height:844},{id:'phone-landscape',width:844,height:390},{id:'tablet-portrait',width:768,height:1024},{id:'tablet-landscape',width:1024,height:768}]) {
  await send('Emulation.setDeviceMetricsOverride',{...device,deviceScaleFactor:1,mobile:true});await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
  await evaluate(`document.querySelector('[data-action=piano]').click();document.querySelector('[data-action=repertoire]').click()`);
  for(const state of ['collection','stand-toggled','descending','filtered']) {
   if(state==='stand-toggled') {
    const before=await evaluate(`document.querySelectorAll('.cp-repertoire-table')[1].querySelector('[data-action=stand-work][data-id=b]').getAttribute('aria-pressed')`);
    await evaluate(`document.querySelectorAll('.cp-repertoire-table')[1].querySelector('[data-action=stand-work][data-id=b]').click()`);
    await wait(`document.querySelectorAll('.cp-repertoire-table')[1].querySelector('[data-action=stand-work][data-id=b]').getAttribute('aria-pressed')!==${JSON.stringify(before)}`);
   }
   if(state==='descending')await evaluate(`document.querySelector('[data-action=repertoire-sort][data-id=title]').click()`);
   if(state==='filtered')await evaluate(`const s=document.querySelector('#repertoire-search');s.value='clair debussy';s.dispatchEvent(new Event('input',{bubbles:true}))`);
   assert.equal(await evaluate(`document.querySelector('#repertoire-stand-title').getBoundingClientRect().top<document.querySelector('#repertoire-search').getBoundingClientRect().top`),true);
   assert.equal(await evaluate(`document.querySelectorAll('[data-action=favorite-work], [data-repertoire-filter=scope] option[value=favorites]').length`),0);
   assert.equal(await evaluate(`[...document.querySelectorAll('.cp-repertoire-table-wrap')].every(e=>e.scrollWidth<=e.clientWidth+1)`),true);
   assert.equal(await evaluate(`getComputedStyle(document.querySelector('.cp-repertoire-open')).backgroundColor`),'rgba(0, 0, 0, 0)');
   if(state==='descending')assert.equal(await evaluate(`document.querySelectorAll('.cp-repertoire-table')[1].querySelector('tbody b').textContent`),'Gymnopédie');
   if(state==='filtered')assert.equal(await evaluate(`document.querySelectorAll('.cp-repertoire-table')[1].querySelectorAll('tbody tr').length`),1);
   const path=`${state}-${device.id}-01.png`,bytes=Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64');await writeFile(join(folder,path),bytes);results.push({state,...device,frames:[{path,scrollTop:0,sha256:createHash('sha256').update(bytes).digest('hex')}]});
  }
  await evaluate(`document.querySelector('.cp-page').scrollTop=80`);
  const repertoireScroll=await evaluate(`document.querySelector('.cp-page').scrollTop`);
  await evaluate(`document.querySelector('.cp-library-navigation [data-action=catalog]').click()`);
  await wait(`document.querySelector('#library-search')`);
  await evaluate(`document.querySelector('#library-search [name=query]').value='Chopin'`);
  await evaluate(`document.querySelector('.cp-page').scrollTop=120`);
  const catalogScroll=await evaluate(`document.querySelector('.cp-page').scrollTop`);
  await evaluate(`document.querySelector('.cp-library-navigation [data-action=repertoire]').click()`);
  assert.equal(await evaluate(`document.querySelector('#repertoire-search').value`),'clair debussy');
  assert.equal(await evaluate(`document.querySelector('.cp-page').scrollTop`),repertoireScroll);
  await evaluate(`document.querySelector('.cp-library-navigation [data-action=catalog]').click()`);
  assert.equal(await evaluate(`document.querySelector('#library-search [name=query]').value`),'Chopin');
  assert.equal(await evaluate(`document.querySelector('.cp-page').scrollTop`),catalogScroll);
  await evaluate(`document.querySelector('.cp-page').scrollTop=0`);
  for(const state of ['catalogue','practice-routines']) {
   if(state==='practice-routines')await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click()`);
   const path=`${state}-${device.id}-01.png`,bytes=Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64');await writeFile(join(folder,path),bytes);results.push({state,...device,frames:[{path,scrollTop:0,sha256:createHash('sha256').update(bytes).digest('hex')}]});
  }
 }
 const metadata={runId,date:'2026-10-06',title:'Music stand and repertoire table',surface:'Responsive production Chromium; not native acceptance',fixtures:'Disposable four-work notebook; no personal data',results,runtimeErrors:errors};await writeFile(join(folder,'capture.json'),JSON.stringify(metadata,null,2));await writeGallery(folder,metadata);console.log(JSON.stringify({folder,views:results.length,errors}));
} finally {for(const close of cleanup.reverse())await close();}
