import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
import {backupAccountBootstrap} from '../scripts/review/backup-account-fixture.mjs';
import {connectedDriveBootstrap} from '../scripts/review/drive-connected-fixture.mjs';

test('automatic archive row updates last copy and folder through preparing and saving phases',{timeout:60000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const instrument=`{
  const native=Capacitor.nativePromise,interval=window.setInterval;window.__archiveIntervals=[];
  window.setInterval=(fn,delay,...args)=>{if(delay===60000)__archiveIntervals.push(fn);return interval(fn,delay,...args);};
  Capacitor.PluginHeaders.push({name:'MediaShare',methods:['begin','writeChunk','saveAutomatic','commitAutomatic'].map(name=>({name,rtype:'promise'}))});
  Capacitor.nativePromise=async(plugin,method,args)=>{
   if(plugin==='DriveNotebook'&&method==='request'&&args.path.startsWith('/drive/v2/files/')&&(!args.method||args.method==='GET')){
    const id=args.path.split('/').pop().split('?')[0],file=__driveFixture.files.get(id);
    if(file&&!window.__archiveSeeded){window.__archiveSeeded=true;const folder=[...__driveFixture.files.values()].find(f=>f.mimeType==='application/vnd.google-apps.folder');Object.assign(file.appProperties,{storageVersion:'1',storageFolder:folder.id,principalId:localStorage.getItem('spino.backup-device.id'),principalName:'Synthetic phone',backupEnabled:'1',backupDestination:'local',lastBackupAt:'2026-10-25T10:00:00Z',lastBackupDate:'2026-10-25'});}
   }
   if(plugin==='DriveMedia'&&method==='useNotebookAccount'&&window.__holdArchivePreparation){window.__holdArchivePreparation=false;await new Promise(resolve=>window.__releaseArchivePreparation=resolve);}
   if(plugin==='MediaShare'){
    if(method==='begin'){window.__archiveFile=args;return {token:'synthetic-archive'};}
    if(method==='writeChunk')return {};
    if(method==='saveAutomatic'){await new Promise(resolve=>window.__releaseArchiveSave=resolve);return {saved:true,bytes:__archiveFile.size,uri:'content://synthetic/automatic-copy'};}
    if(method==='commitAutomatic')return {};
   }
   return native(plugin,method,args);
  };
 }`;
 await send('Page.addScriptToEvaluateOnNewDocument',{source:await connectedDriveBootstrap({language:'es'})+backupAccountBootstrap()+instrument});await send('Page.navigate',{url});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>900){clearInterval(timer);reject(Error('Archive review timeout: '+${JSON.stringify(condition)}));}},20);})`);
 const click=action=>evaluate(`document.querySelector('[data-action="${action}"]').click()`);
 await wait(`document.querySelector('.cp-today')`);await click('settings');await click('profile-backup');await click('drive-connect');await wait(`document.querySelector('[data-drive-picker]')`);
 await evaluate(`document.querySelector('[data-drive-picker]').requestSubmit()`);await wait(`document.querySelector('[data-open-remote]')||document.querySelector('#cloud-backup[data-cloud-status=saved]')`);await evaluate(`document.querySelector('[data-open-remote]')?.closest('form').requestSubmit()`);
 await wait(`document.querySelector('#cloud-media')?.textContent.includes('Grabaciones sincronizadas')&&document.querySelector('#automatic-backup-status')?.textContent.includes('25')`);
 const summary=await evaluate(`document.querySelector('#automatic-backup-status').textContent`);assert.match(summary,/Última copia automática/);assert.match(summary,/Carpeta: Descargas \/ SPino backups/);
 const dir=process.env.AUTO_BACKUP_EVIDENCE;
 const capture=async phase=>{if(!dir)return;await mkdir(dir,{recursive:true});for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.querySelector('#automatic-backup-status').scrollIntoView({block:'center'})`);assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${dir}/${phase}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));}};
 await capture('last-copy');
 await evaluate(`window.__holdArchivePreparation=true;const task=__archiveIntervals.find(fn=>fn.toString().includes('.daily('));if(!task)throw Error('Archive interval missing');void task()`);
 await wait(`window.__releaseArchivePreparation&&document.querySelector('[data-backup-phase=preparing]')`);assert.equal(await evaluate(`document.querySelector('[data-backup-phase=preparing] progress').hasAttribute('value')`),false);await capture('preparing');
 await evaluate(`__releaseArchivePreparation()`);await wait(`window.__releaseArchiveSave&&document.querySelector('[data-backup-phase=saving]')`);await capture('saving');
 await evaluate(`__releaseArchiveSave()`);await wait(`!document.querySelector('[data-backup-phase]')&&!document.querySelector('#automatic-backup-status')?.textContent.includes('25/10')`);
 assert.match(await evaluate(`__archiveFile.name`),/^SPino notebook_\d{4}-\d{2}-\d{2}T.*\.zip$/);await capture('saved');
 await click('cloud-manage');assert.equal(await evaluate(`!!document.querySelector('#cp-dialog [data-action=import-json]')`),true);assert.match(await evaluate(`document.querySelector('#cp-dialog [data-action=export-json]').textContent`),/No incluye archivos multimedia/);await evaluate(`document.querySelector('[data-action=close-dialog]').click()`);
 await click('storage-manage');await wait(`document.querySelector('[data-backup-settings]')`);await evaluate(`const select=document.querySelector('[name=destination]');select.value='drive';select.dispatchEvent(new Event('change',{bubbles:true}))`);await wait(`document.querySelector('[data-backup-settings]')?.textContent.includes('backups@example.invalid')`);
 assert.equal(await evaluate(`!!document.querySelector('[name=folder]')`),false);assert.equal(await evaluate(`!!document.querySelector('[name=backupFolderName]')`),true);
 assert.deepEqual(errors,[]);
 if(dir)await writeFile(`${dir}/verification.json`,JSON.stringify({kind:'Responsive browser; disposable synthetic notebook and document writer',nativeProviderAcceptance:false,lastCopyAndFolder:true,preparationAndSavePhases:true,indeterminateUntilRealCounts:true,completionRefresh:true,typedBackupFolder:true,independentAccountSelection:true,JSONImportAndNoMultimediaCopy:true,layouts:4},null,2)+'\n');
});
