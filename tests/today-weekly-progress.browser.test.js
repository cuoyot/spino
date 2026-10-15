import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
import {emptyData,beginSession,block,saveSession} from '../src/companion/model.js';

test('Home highlights saved weekly practice with and without a goal in both themes', {timeout:60000}, async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
 const fixed=Date.parse('2026-10-14T12:00:00Z');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`{const OriginalDate=Date;window.Date=class extends OriginalDate {constructor(...args){super(...(args.length?args:[${fixed}]));}static now(){return ${fixed};}};}`});
 const wait=async()=>{for(let n=0;n<300;n++){try{if(await evaluate(`!!document.querySelector('.cp-today-progress')`))return;}catch(error){if(!/navigated|closed|context/.test(error.message))throw error;}await new Promise(r=>setTimeout(r,30));}throw Error('Home timeout');};
 await send('Page.navigate',{url});await wait();
 for(const theme of ['light','dark']) for(const state of ['goal','none','reached','empty']) {
  const data=emptyData();data.preferences.theme=theme;data.preferences.weeklyMinutes=state==='none'?0:state==='reached'?30:90;
  if(state!=='empty'){const active=beginSession({title:'Synthetic practice',context:'piano',blocks:[block('free',{minutes:45})]},fixed);active.date='2026-10-14';active.runningSince=null;active.elapsedMs=active.blockElapsedMs=45*60000;saveSession(data,active,{});}
  await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};})`);
  await send('Page.reload');await wait();
  assert.equal(await evaluate(`document.querySelector('.cp-today-progress').contains(document.querySelector('.cp-today-week'))`),true);
  assert.equal(await evaluate(`!!(document.querySelector('.cp-today-progress').compareDocumentPosition(document.querySelector('.cp-today-focus')) & Node.DOCUMENT_POSITION_FOLLOWING)`),true);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-today-progress .cp-day-practice').length`),7);
  assert.equal(await evaluate(`document.querySelector('.cp-today-progress-total strong').textContent`),`${state==='empty'?0:45} min`);
  assert.equal(await evaluate(`!!document.querySelector('.cp-today-progress [role=progressbar]')`),state!=='none');
  for(const [width,height] of state==='goal'?[[390,844],[844,390],[768,1024],[1024,768]]:[[390,844]]) {
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await evaluate(`document.querySelector('.cp-page').scrollTop=0;new Promise(r=>requestAnimationFrame(r))`);
   assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth<=document.querySelector('.cp-page').clientWidth+1`),true);
   await evaluate(`document.querySelector('.cp-today-progress').scrollIntoView({block:'nearest'})`);
   if(process.env.WEEK_CAPTURE){await mkdir(process.env.WEEK_CAPTURE,{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${process.env.WEEK_CAPTURE}/${theme}-${state}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));}
  }
 }
 await evaluate(`document.querySelector('.cp-today-progress [data-action=progress]').click()`);
 assert.equal(await evaluate(`!!document.querySelector('.cp-time-overview')`),true);
 assert.deepEqual(errors,[]);
});
