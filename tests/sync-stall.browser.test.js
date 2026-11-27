import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
import {connectedDriveBootstrap} from '../scripts/review/drive-connected-fixture.mjs';

test('a stalled production sync stops, keeps the notebook and permits a manual retry',{timeout:60000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const instrumentation=`{
  const native=Capacitor.nativePromise,schedule=window.setTimeout.bind(window);
  window.__stallMetrics={requests:0,cancelled:0};window.__heldRequests=[];
  window.setTimeout=(callback,delay,...args)=>schedule(callback,window.__shortBudget&&delay===180000?800:delay,...args);
  Capacitor.PluginHeaders.find(p=>p.name==='DriveNotebook').methods.push({name:'cancel',rtype:'promise'});
  Capacitor.nativePromise=async(plugin,method,args)=>{
   if(plugin==='DriveNotebook'&&method==='cancel'){__stallMetrics.cancelled++;return {};}
   if(plugin==='DriveNotebook'&&method==='request'){__stallMetrics.requests++;if(window.__holdNotebook)await new Promise(resolve=>__heldRequests.push(resolve));}
   return native(plugin,method,args);
  };
 }`;
 await send('Page.addScriptToEvaluateOnNewDocument',{source:await connectedDriveBootstrap({language:'es'})+instrumentation});
 await send('Page.navigate',{url});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>900){clearInterval(timer);reject(Error('Sync recovery timeout: '+${JSON.stringify(condition)}));}},20);})`);
 const click=action=>evaluate(`document.querySelector('[data-action="${action}"]').click()`);
 await wait(`document.querySelector('.cp-today')&&__cloudReview.statusCalls>0`);
 await click('settings');await click('profile-backup');await click('drive-connect');
 await wait(`document.querySelector('[data-drive-picker]')`);await evaluate(`document.querySelector('[data-drive-picker]').requestSubmit()`);
 await wait(`document.querySelector('[data-open-remote]')||document.querySelector('[data-sync-status=saved]')`);
 await evaluate(`document.querySelector('[data-open-remote]')?.closest('form').requestSubmit()`);
 await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);
 const notebook=()=>evaluate(`new Promise((resolve,reject)=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets']),state=tx.objectStore('state').get('current'),assets=tx.objectStore('assets').getAll();tx.oncomplete=async()=>{db.close();resolve({data:state.result,assets:await Promise.all(assets.result.map(async a=>({...a,blob:a.blob?Array.from(new Uint8Array(await a.blob.arrayBuffer())):null})))})};tx.onerror=()=>reject(tx.error);};q.onerror=()=>reject(q.error);})`);
 const before=await notebook();
 await evaluate(`__shortBudget=true;__holdNotebook=true`);await click('cloud-sync');
 await wait(`document.querySelector('#cloud-backup[data-cloud-status=error]')`);
 assert.match(await evaluate(`document.querySelector('.cp-cloud-problem').textContent`),/ha tardado demasiado/);
 assert.equal(await evaluate(`document.querySelector('[data-action=cloud-sync]').disabled`),false);
 assert.equal(await evaluate(`document.querySelector('.cp-sync-status').dataset.syncStatus`),'error');
 assert.ok(await evaluate(`__stallMetrics.cancelled>0`));assert.deepEqual(await notebook(),before);
 const errorRequests=await evaluate(`__stallMetrics.requests`);
 await evaluate(`new Promise(r=>setTimeout(r,1000))`);assert.equal(await evaluate(`__stallMetrics.requests`),errorRequests);
 const dir=process.env.SPINO_STALL_EVIDENCE;
 const capture=async state=>{if(!dir)return;await mkdir(dir,{recursive:true});for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${dir}/${state}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));}};
 await capture('stopped');
 await evaluate(`__shortBudget=false;__holdNotebook=false`);await click('cloud-sync');
 await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);
 await evaluate(`for(const resolve of __heldRequests.splice(0))resolve()`);
 await evaluate(`new Promise(r=>setTimeout(r,100))`);
 assert.equal(await evaluate(`document.querySelector('.cp-sync-status').dataset.syncStatus`),'saved');
 assert.deepEqual(await notebook(),before);await capture('recovered');
 if(dir)await writeFile(`${dir}/browser-verification.json`,JSON.stringify({kind:'Responsive browser with synthetic Drive',nativeDeviceAcceptance:false,acceleratedOperationDeadlineMs:800,productionOperationDeadlineMs:180000,keepsNotebookAndScores:true,manualRetry:true,lateResponseIgnored:true},null,2)+'\n');
 assert.deepEqual(errors,[]);
});
