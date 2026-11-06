import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {workDetailFixture} from './work-detail-fixture.js';

test('standalone PDF has a reachable floating Close in reading and editing and retains marks on save failure/retry', {timeout:90000}, async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
 const fixture=workDetailFixture(),{data,assets}=fixture,folder=process.env.PDF_CLOSE_EVIDENCE,frames=[];
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>700){clearInterval(timer);reject(Error('PDF close timeout: '+${JSON.stringify(condition)}))}},20)})`);
 const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 const tap=async selector=>{
  const p=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 };
 const read=store=>evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,q=db.transaction(${JSON.stringify(store)}).objectStore(${JSON.stringify(store)}).get(${JSON.stringify(store==='state'?'current':'history-pdf')});q.onsuccess=()=>{db.close();resolve(q.result)}}})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');for(const asset of ${JSON.stringify(assets)})tx.objectStore('assets').put(asset);tx.oncomplete=()=>{db.close();resolve()}}})`);
 await send('Page.reload');await wait(`document.querySelector('.cp-today')`);
 await click('.cp-nav [data-action=piano]');await click('[data-action=work-detail][data-id=history-prelude]');
 const open=async()=>{await click('.cp-work-thumbnail');await wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`)};
 const assertClose=async()=>{
  assert.equal(await evaluate(`document.querySelectorAll('[data-pdf=close]').length`),1);
  assert.equal(await evaluate(`(()=>{const e=document.querySelector('.pdf-widget-bar [data-pdf=close]'),r=e.getBoundingClientRect();return !e.hidden&&r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[data-pdf=close]')===e})()`),true);
 };
 if(folder){await mkdir(folder,{recursive:true});await writeFile(folder+'/fixture.json',JSON.stringify(fixture,null,2))}
 for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await open();await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
  for(const state of ['reading','editing']){
   if(state==='editing')await tap('[data-pdf=tools]');
   await assertClose();assert.equal(await evaluate(`document.querySelector('.pdf-widget').scrollWidth<=document.querySelector('.pdf-widget').clientWidth+1`),true);
   if(folder){const file=`${state}-${theme}-${width}x${height}.png`;await writeFile(folder+'/'+file,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));frames.push({file,state,theme,width,height})}
  }
  await tap('[data-pdf=close]');await wait(`!document.querySelector('.pdf-viewer')`);assert.equal(await evaluate(`document.querySelector('.cp-page').dataset.view`),'work');
 }
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await open();await tap('[data-pdf=tools]');await click('[data-finger="3"]');
 await evaluate(`window.originalPut=IDBObjectStore.prototype.put;window.failAsset=true;IDBObjectStore.prototype.put=function(...args){if(this.name==='assets'&&window.failAsset){const tx=this.transaction;queueMicrotask(()=>tx.abort())}return window.originalPut.apply(this,args)}`);
 const p=await evaluate(`(()=>{const r=document.querySelector('.pdf-paper').getBoundingClientRect();for(let y=Math.max(30,r.top+30);y<Math.min(innerHeight-30,r.bottom);y+=30)for(let x=Math.max(30,r.left+30);x<Math.min(innerWidth-30,r.right);x+=30)if(document.elementFromPoint(x,y)?.closest('.pdf-viewport'))return{x,y};throw Error('No exposed score point')})()`);
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(`document.querySelector('.pdf-save-state').classList.contains('error')`);
 await assertClose();await tap('[data-pdf=close]');await wait(`document.querySelector('.pdf-save-state')?.classList.contains('error')`);assert.ok(await evaluate(`!!document.querySelector('.pdf-viewer')`));assert.equal((await read('assets')).annotations,undefined);
 await evaluate(`window.failAsset=false`);await tap('[data-pdf=close]');await wait(`!document.querySelector('.pdf-viewer')`);
 const saved=await read('assets');assert.equal(saved.base64,assets.find(a=>a.id==='history-pdf').base64);assert.equal(saved.annotations.marks.length,1);assert.equal(saved.annotations.marks[0].text,'3');
 await open();assert.equal(await evaluate(`document.querySelectorAll('.pdf-marks [data-mark-id]').length`),1);await tap('[data-pdf=tools]');await tap('[data-pdf=view]');await assertClose();await tap('[data-pdf=close]');await wait(`!document.querySelector('.pdf-viewer')`);
 assert.deepEqual(await read('state'),data);assert.deepEqual(errors,[]);
 if(folder){const sourceHashes={};for(const path of ['src/companion/pdf-viewer.js','src/companion/score-controls.js','src/companion/pdf-viewer.css','tests/pdf-standalone-close.browser.test.js','dist/index.html'])sourceHashes[path]=createHash('sha256').update(await readFile(path)).digest('hex');await writeFile(folder+'/verification.json',JSON.stringify({surface:'Responsive production browser; disposable synthetic notebook; not native acceptance',frames,sourceHashes,annotationsRetained:true,originalPDFUnchanged:true,notebookUnchanged:true,failedSaveKeepsViewerOpen:true,runtimeErrors:errors},null,2))}
});
