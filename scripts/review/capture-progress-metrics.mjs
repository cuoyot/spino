import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {openBrowser} from '../../tests/browser.js';
import {writeGallery} from './build-gallery.mjs';
import {emptyData,block,beginSession,saveSession,localDate,weekOf,addDays} from '../../src/companion/model.js';
const folder=resolve('docs/quality-review/captures/profile',process.argv[2]),cleanup=[],results=[];
await mkdir(folder,{recursive:true});
const fixture=emptyData(),week=weekOf(localDate());fixture.preferences.language='es';
for(const [offset,minutes] of [[-21,70],[-14,110],[-7,95],[0,35]]){const date=addDays(week,offset),clock=new Date(date+'T12:00:00').getTime(),active=beginSession({title:'Synthetic practice',context:'piano',blocks:[block()]},clock);active.elapsedMs=active.blockElapsedMs=minutes*60000;saveSession(fixture,active,{},clock+minutes*60000);}
try {
 const {send,evaluate,url,errors}=await openBrowser({after:fn=>cleanup.push(fn)},{companion:true,language:'es'});
 const wait=()=>evaluate(`new Promise(resolve=>{const t=setInterval(()=>{if(document.querySelector('.cp-today')){clearInterval(t);resolve();}},20);})`);
 for(const device of [{id:'phone-portrait',label:'Phone portrait',width:390,height:844},{id:'phone-landscape',label:'Phone landscape',width:844,height:390},{id:'tablet-portrait',label:'Tablet portrait',width:768,height:1024},{id:'tablet-landscape',label:'Tablet landscape',width:1024,height:768}]) {
  await send('Emulation.setDeviceMetricsOverride',{width:device.width,height:device.height,deviceScaleFactor:1,mobile:true});
  for(const state of ['empty','populated']) {
   await send('Page.navigate',{url});await wait();
   const notebook=state==='empty'?{...emptyData(),preferences:{...emptyData().preferences,language:'es'}}:fixture;
   await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(notebook)},'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};})`);
   await send('Page.navigate',{url});await wait();await evaluate(`document.querySelector('.cp-nav [data-action=progress]').click()`);
   assert.equal(await evaluate(`document.querySelectorAll('.cp-week-result').length`),4);
   const positions=await evaluate(`['.cp-dashboard-week','.cp-consistency','.cp-four-weeks'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom};})`);
   assert.ok(positions[1].top-positions[0].bottom>=19);assert.ok(positions[2].top-positions[1].bottom>=19);
   assert.ok(await evaluate(`document.querySelector('.cp-progress-page').scrollWidth<=document.querySelector('.cp-progress-page').clientWidth`));
   const frames=[];
   for(const [i,selector] of ['.cp-progress-page','.cp-four-weeks'].entries()) {
    await evaluate(`document.querySelector('${selector}').scrollIntoView({block:'start'})`);
    const shot=await send('Page.captureScreenshot',{format:'png'}),bytes=Buffer.from(shot.data,'base64'),path=`${state}-${device.id}-${String(i+1).padStart(2,'0')}.png`;await writeFile(join(folder,path),bytes);frames.push({path,scrollTop:await evaluate(`document.querySelector('.cp-page').scrollTop`),sha256:createHash('sha256').update(bytes).digest('hex')});
   }
   results.push({...device,state,frames});
  }
 }
 assert.deepEqual(errors,[]);const metadata={date:'2026-10-06',title:'Progress consistency metrics',surface:'Responsive Chromium, not native acceptance',fixtures:'Disposable empty notebook and four synthetic weekly sessions; current calendar week',sourceSha256:createHash('sha256').update(await readFile('src/companion/progress-metrics.js')).digest('hex'),results,runtimeErrors:errors};await writeFile(join(folder,'capture.json'),JSON.stringify(metadata,null,2));await writeGallery(folder,metadata);console.log(JSON.stringify({folder,frames:16,errors}));
} finally {for(const close of cleanup.reverse())await close();}
