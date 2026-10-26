import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
import {connectedDriveBootstrap} from '../scripts/review/drive-connected-fixture.mjs';

test('configured cloud synchronization never flashes unfinished backup setup during a delayed settings read',{timeout:60000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const instrument=`{
  const native=Capacitor.nativePromise;window.__setupFlashes=[];
  new MutationObserver(()=>{for(const element of document.querySelectorAll('.cp-backup-onboarding'))__setupFlashes.push(element.textContent);}).observe(document,{childList:true,subtree:true});
  Capacitor.nativePromise=async(plugin,method,args)=>{
   if(plugin==='DriveNotebook'&&method==='request'&&args.path.startsWith('/drive/v2/files/')&&(!args.method||args.method==='GET')){
    if(sessionStorage.getItem('hold-storage-read')){window.__settingsReadEntered=true;await new Promise(resolve=>window.__releaseSettings=resolve);}
    const result=await native(plugin,method,args),file=JSON.parse(result.text);
    const folder=[...__driveFixture.files.values()].find(f=>f.mimeType==='application/vnd.google-apps.folder');
    file.properties=[...(file.properties||[]),...Object.entries({storageVersion:'1',storageFolder:folder.id,principalId:'synthetic-phone'}).map(([key,value])=>({key,value,visibility:'PRIVATE'}))];
    return {...result,text:JSON.stringify(file)};
   }
   return native(plugin,method,args);
  };
 }`;
 await send('Page.addScriptToEvaluateOnNewDocument',{source:await connectedDriveBootstrap({language:'es'})+instrument});
 await send('Page.navigate',{url});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>1000){clearInterval(timer);reject(Error('Copy review timeout: '+${JSON.stringify(condition)}));}},20);})`);
 const click=action=>evaluate(`document.querySelector('[data-action="${action}"]').click()`);
 await wait(`document.querySelector('.cp-today')&&__cloudReview.statusCalls>0`);
 await click('settings');await click('profile-backup');await click('drive-connect');
 await wait(`document.querySelector('[data-drive-picker]')`);await evaluate(`document.querySelector('[data-drive-picker]').requestSubmit()`);
 await wait(`document.querySelector('[data-open-remote]')||document.querySelector('[data-sync-status=saved]')`);
 await evaluate(`document.querySelector('[data-open-remote]')?.closest('form').requestSubmit()`);
 await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);
 await evaluate(`sessionStorage.setItem('hold-storage-read','1')`);await send('Page.reload');
 await wait(`window.__settingsReadEntered&&document.querySelector('.cp-today')`);
 assert.deepEqual(await evaluate(`__setupFlashes`),[]);
 await click('settings');await click('profile-backup');
 assert.equal(await evaluate(`!!document.querySelector('.cp-backup-onboarding')`),false);
 await evaluate(`sessionStorage.removeItem('hold-storage-read');__releaseSettings()`);
 await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);
 // Flush subsequent frames, rather than taking only the frame before the lookup resolves.
 await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
 assert.deepEqual(await evaluate(`__setupFlashes`),[]);
 const text=await evaluate(`document.querySelector('[data-view=profile-backup]').textContent`);
 assert.match(text,/Sincronización en la nube/);assert.match(text,/Sincronización de grabaciones/);assert.match(text,/Copias de seguridad/);assert.match(text,/ZIP comprimidos/);assert.doesNotMatch(text,/Copias de audio|Configura tus copias|Copia y sincronización/);
 const dir=process.env.SYNC_COPY_EVIDENCE;
 if(dir){await mkdir(dir,{recursive:true});for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
  const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${dir}/synchronization-${width}x${height}.png`,Buffer.from(shot.data,'base64'));
 }
 await writeFile(`${dir}/verification.json`,JSON.stringify({kind:'Responsive browser; disposable synthetic Drive notebook',nativeAcceptance:false,delayedSettingsRead:true,setupFlashes:[],separateCloudAndZIPCopy:true,layouts:4},null,2)+'\n');}
 assert.deepEqual(errors,[]);
});
