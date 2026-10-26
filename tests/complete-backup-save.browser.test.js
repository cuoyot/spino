import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
import {connectedDriveBootstrap} from '../scripts/review/drive-connected-fixture.mjs';

test('manual ZIP cancellation, completion and a fresh copy have distinct responsive states',{timeout:60000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const instrument=`{
  const native=Capacitor.nativePromise;window.__saveCount=0;
  Capacitor.PluginHeaders.push({name:'MediaShare',methods:['begin','writeChunk','save','abort'].map(name=>({name,rtype:'promise'}))});
  Capacitor.nativePromise=async(plugin,method,args)=>{
   if(plugin==='MediaShare'){
    if(method==='begin'){window.__archiveName=args.name;return {token:'synthetic-zip'};}
    if(method==='save'){__saveCount++;return await new Promise(resolve=>window.__finishSave=resolve);}
    return {};
   }
   return native(plugin,method,args);
  };
 }`;
 await send('Page.addScriptToEvaluateOnNewDocument',{source:await connectedDriveBootstrap({language:'es'})+instrument});await send('Page.navigate',{url});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>900){clearInterval(timer);reject(Error('ZIP review timeout: '+${JSON.stringify(condition)}));}},20);})`);
 const click=action=>evaluate(`document.querySelector('[data-action="${action}"]').click()`);
 await wait(`document.querySelector('.cp-today')`);await click('settings');await click('profile-backup');await click('storage-export');
 await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`);await wait(`window.__finishSave`);
 assert.equal(await evaluate(`document.querySelector('[data-zip-export-status]').dataset.zipExportStatus`),'saving');
 await evaluate(`__finishSave({cancelled:true});window.__finishSave=null`);await wait(`document.querySelector('.cp-zip-dialog')`);
 assert.equal(await evaluate(`document.querySelectorAll('#cp-dialog [data-action=close-dialog]').length`),1);
 assert.equal(await evaluate(`document.querySelectorAll('#cp-dialog .cp-zip-dialog button').length`),2);
 const dir=process.env.ZIP_SAVE_EVIDENCE;
 const capture=async phase=>{if(!dir)return;await mkdir(dir,{recursive:true});for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await evaluate(`document.querySelector('[data-zip-export-status]').scrollIntoView({block:'center'})`);
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
  if(phase==='ready')assert.equal(await evaluate(`document.querySelector('#cp-dialog').scrollWidth<=document.querySelector('#cp-dialog').clientWidth`),true);
  const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${dir}/${phase}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));
 }};
 await capture('ready');await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`);await wait(`window.__finishSave`);
 await evaluate(`__finishSave({saved:true})`);await wait(`document.querySelector('[data-zip-export-status=saved]')&&!document.querySelector('#cp-dialog').open`);
 const summary=await evaluate(`document.querySelector('[data-zip-export-status]').textContent`);assert.match(summary,/guardada/);assert.doesNotMatch(summary,/Elegir dónde guardar|preparado/);assert.equal(await evaluate(`__saveCount`),2);
 await capture('saved');await click('storage-export-new');assert.match(await evaluate(`document.querySelector('#cp-dialog').textContent`),/Preparar ZIP/);assert.equal(await evaluate(`__saveCount`),2);
 assert.deepEqual(errors,[]);
 if(dir)await writeFile(`${dir}/verification.json`,JSON.stringify({kind:'Responsive browser; synthetic notebook and document provider',nativeAcceptance:false,cancellationRetainsZIP:true,acknowledgedSaveRemovesPendingAction:true,newCopyRequiresPreparation:true,layouts:4},null,2)+'\n');
});
