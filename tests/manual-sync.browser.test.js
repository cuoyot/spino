import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
import {connectedDriveBootstrap} from '../scripts/review/drive-connected-fixture.mjs';

test('Sync now checks only the cursor and a suspended recording check recovers without a stale spinner',{timeout:60000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const instrumentation=`{
  const native=window.Capacitor.nativePromise,getAll=IDBObjectStore.prototype.getAll;
  window.__manualMetrics={requests:[],assetExports:0};
  IDBObjectStore.prototype.getAll=function(...args){if(this.name==='assets')__manualMetrics.assetExports++;return getAll.apply(this,args);};
  window.Capacitor.nativePromise=async(plugin,method,args)=>{
   if(plugin==='DriveNotebook'&&method==='request')__manualMetrics.requests.push(args.path);
   if(plugin==='DriveMedia'&&method==='request'&&window.__holdMedia){window.__mediaCheckEntered=true;await new Promise(resolve=>{window.__releaseMedia=resolve;});}
   return native(plugin,method,args);
  };
 }`;
 await send('Page.addScriptToEvaluateOnNewDocument',{source:await connectedDriveBootstrap({language:'es'})+instrumentation});
 await send('Page.navigate',{url});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>800){clearInterval(timer);reject(Error('Manual sync timeout: '+${JSON.stringify(condition)}));}},20);})`);
 const click=action=>evaluate(`document.querySelector('[data-action="${action}"]').click()`);
 await wait(`document.querySelector('.cp-today')&&__cloudReview.statusCalls>0`);
 await click('settings');await click('profile-backup');await click('drive-connect');
 await wait(`document.querySelector('[data-drive-picker]')`);
 await evaluate(`document.querySelector('[data-drive-picker]').requestSubmit()`);
 await wait(`document.querySelector('[data-open-remote]')||document.querySelector('[data-sync-status=saved]')`);
 await evaluate(`document.querySelector('[data-open-remote]')?.closest('form').requestSubmit()`);
 await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);
 for(let n=0;n<2;n++){await click('cloud-sync');await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);}
 await evaluate(`__manualMetrics={requests:[],assetExports:0}`);
 await click('cloud-sync');await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);
 const metrics=await evaluate(`__manualMetrics`);
 assert.equal(metrics.assetExports,0);assert.equal(metrics.requests.length,1);
 assert.ok(metrics.requests[0].startsWith('/drive/v3/changes?'));
 await evaluate(`__holdMedia=true`);
 await wait(`window.__mediaCheckEntered`);
 await evaluate(`__driveStall=true`);await click('cloud-sync');
 await wait(`window.__releaseDrive&&document.querySelector('#cloud-backup[data-cloud-status=writing]')`);
 await evaluate(`__holdMedia=false;__releaseMedia()`);
 await wait(`!document.querySelector('.cp-media-sync-status').textContent.includes('Comprobando')`);
 await evaluate(`__driveStall=false;__releaseDrive()`);
 await wait(`document.querySelector('[data-sync-status=saved]')`);
 const dir=process.env.MANUAL_SYNC_EVIDENCE;
 if(dir){
  await mkdir(dir,{recursive:true});
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
   const shot=await send('Page.captureScreenshot',{format:'png'});
   await writeFile(`${dir}/idle-${width}x${height}.png`,Buffer.from(shot.data,'base64'));
  }
  await writeFile(`${dir}/verification.json`,JSON.stringify({kind:'Responsive browser; synthetic Drive and recordings',nativeAcceptance:false,manualCheck:metrics,stalledRecordingCheckResumes:true,spinnerReturnsToSaved:true},null,2)+'\n');
 }
 assert.deepEqual(errors,[]);
});
