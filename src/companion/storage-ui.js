import {ui,localizeMessage,getAppLanguage} from './locale.js';
import {escapeHTML as esc} from './views.js';
import {automaticBackupCopy} from './automatic-backup-copy.js';
import {backupArchiveName} from './complete-backup.js';
const button=(action,text,id='')=>`<button type="button" data-action="${action}" data-id="${esc(id)}">${esc(text)}</button>`;
export function createStorageUI({manager,showDialog,dialog,formEnd,toast,refresh,exportZip,restoreZip,downloadCopy,cloud,deviceName}){
 let draft=null,folders=[],request=0;
 const t=()=>automaticBackupCopy(getAppLanguage());
 const destination=c=>c.backupDestination||(c.copiesFolder&&c.backupEnabled==='1'?'drive':'local');
 const folderId=c=>c.backupFolder||c.copiesFolder||'';
 const current=()=>manager.state.loaded&&manager.state.config;
 const name=()=>current()?.name||cloud?.state.name||'SPino';
 const waiting=text=>showDialog(t().enabled,`<div class="cp-drive-loading"><span class="cp-drive-spinner" aria-hidden="true"></span><p role="status">${esc(text)}</p></div>`);
 function summary(){const c=current(),v=t();return !c?v.unknown:c.backupEnabled==='1'?`${v.last}: ${c.lastBackupAt?new Date(c.lastBackupAt).toLocaleString():v.never}\n${v.folder}: ${destination(c)==='drive'?'Google Drive / '+(c.backupFolderName||v.choose):v.localPath}`:v.off;}
 function statusMarkup(){
  const c=current(),s=manager.state,v=t();if(!c||c.backupEnabled!=='1')return '';
  if(!s.busy)return s.error?`<p class="cp-auto-backup-error" role="alert">${esc(localizeMessage(s.error))}</p>`:'';
  const p=s.progress||{},saving=['saving','staging','upload'].includes(p.stage),phase=saving?v.saving:v.prepare;
  const known=p.total>0,percent=known?Math.min(100,Math.floor(100*p.completed/p.total)):null;
  const count=known?(p.stage==='files'?`${p.completed}/${p.total} ${v.files}`:`${(p.completed/1048576).toFixed(1)}/${(p.total/1048576).toFixed(1)} MB`):'';
  return `<div class="cp-auto-backup-progress" data-backup-phase="${saving?'saving':'preparing'}" role="status" aria-live="polite"><div class="cp-backup-phases"><span ${saving?'':'data-current'}>1. ${esc(v.prepare)}</span><span ${saving?'data-current':''}>2. ${esc(v.saving)}</span></div><progress max="100" ${known?`value="${percent}"`:''} aria-label="${esc(phase)}"></progress>${count?`<small>${esc(count)}</small>`:''}</div>`;
 }
 function readDraft(){const form=dialog.querySelector?.('[data-backup-settings]');if(!form)return;draft.enabled=form.elements.enabled.checked;draft.mobile=form.elements.mobile.checked;draft.destination=form.elements.destination.value;}
 function renderSettings(){
  const c=current(),v=t(),principal=c.principalId===manager.state.deviceId?v.thisDevice:c.principalName||(c.principalId?v.otherDevice:v.thisDevice);
  showDialog(v.enabled,`<form data-backup-settings class="cp-auto-backup-settings">
   <label class="cp-backup-enable"><input type="checkbox" name="enabled" ${draft.enabled?'checked':''}><span><strong>${esc(draft.enabled?v.on:v.off)}</strong><small>${esc(v.schedule)}</small></span></label>
   <section class="cp-backup-setting"><h3>${esc(v.device)}</h3><p class="cp-backup-setting-value">${esc(principal)}</p>${c.principalId&&c.principalId!==manager.state.deviceId?`${button('storage-principal',v.takeOver)}<p class="muted">${esc(v.takeOverHelp)}</p>`:''}</section>
   <section class="cp-backup-setting"><label for="backup-destination">${esc(v.destination)}</label><select name="destination" id="backup-destination"><option value="local" ${draft.destination==='local'?'selected':''}>${esc(v.local)}</option><option value="drive" ${draft.destination==='drive'?'selected':''}>${esc(v.remote)}</option></select><div data-backup-local ${draft.destination==='local'?'':'hidden'}><p class="muted">${esc(v.localPath)}</p></div><div data-backup-remote ${draft.destination==='drive'?'':'hidden'}><p>${esc(draft.folderName||v.choose)}</p>${draft.folderError?`<p role="alert">${esc(draft.folderError)}</p>`:''}${button('storage-folder',v.change)}<p class="muted">${esc(v.folderHelp)}</p></div><p class="cp-backup-file-label">${esc(v.filename)}</p><p class="cp-backup-example">${esc(backupArchiveName(name(),new Date()).replace(/T.*\.zip$/,'.zip'))}</p><p class="muted">${esc(v.fileHelp)}</p></section>
   <label class="cp-backup-enable"><input type="checkbox" name="mobile" ${draft.mobile?'checked':''}><span><strong>${esc(v.mobile)}</strong><small>${esc(v.mobileHelp)}</small></span></label>
   <p class="cp-backup-last muted">${esc(v.last)} · ${esc(c.lastBackupAt?new Date(c.lastBackupAt).toLocaleString():v.never)}</p>
   ${manager.state.error?`<p role="alert">${esc(localizeMessage(manager.state.error))}</p>`:''}
   <div class="cp-backup-settings-footer">${formEnd(v.save)}</div></form>`,async form=>{
    draft={...draft,enabled:form.has('enabled'),mobile:form.has('mobile'),destination:String(form.get('destination'))};
    await manager.configureAutomatic({enabled:draft.enabled,destination:draft.destination,folderId:draft.folderId,wifiOnly:!draft.mobile});
    dialog.close();draft=null;await refresh?.();toast?.(t().saved);
   });
  const enabled=dialog.querySelector?.('[name=enabled]');if(enabled)enabled.onchange=()=>{enabled.closest('label').querySelector('strong').textContent=enabled.checked?t().on:t().off;};
  const select=dialog.querySelector?.('[name=destination]');if(select)select.onchange=()=>{readDraft();for(const kind of ['local','remote'])dialog.querySelector('[data-backup-'+kind+']').hidden=(draft.destination==='local')!==(kind==='local');};
 }
 async function overview(){
  const id=++request;waiting(ui('Checking your backups…','Comprobando tus copias de seguridad…'));const node=dialog.lastElementChild;
  await manager.refresh();if(id!==request||!dialog.open||!dialog.contains(node))return;
  const c=current();draft={enabled:c.backupEnabled==='1',mobile:c.backupWifiOnly==='0',destination:destination(c),folderId:folderId(c),folderName:''};
  if(draft.destination==='drive'&&draft.folderId)try{draft.folderName=await manager.folderName(draft.folderId);}catch(error){draft.folderError=localizeMessage(error.message);}
  if(id!==request||!dialog.open||!dialog.contains(node))return;renderSettings();
 }
 async function chooseFolder(){
  readDraft();const id=++request;waiting(ui('Choose a folder','Elegir carpeta'));const node=dialog.lastElementChild;
  folders=await manager.folders();if(id!==request||!dialog.open||!dialog.contains(node))return;
  const l=manager.link(),c=current();folders=folders.filter(f=>f.id!==l.folderId&&f.id!==c.storageFolder);
  const v=t();showDialog(v.choose,`<form data-backup-folder><p>${esc(v.folderHelp)}</p><label>${esc(v.remote)}<select name="folder" required><option value="" disabled ${draft.folderId?'':'selected'}>${esc(v.choose)}</option>${folders.map(f=>`<option value="${esc(f.id)}" ${f.id===draft.folderId?'selected':''}>${esc(f.name)}</option>`).join('')}<option value="new">${esc(v.newFolder)}</option></select></label><label data-new-folder hidden>${esc(v.newFolder)}<input name="folderName" maxlength="180"></label><div class="cp-actions">${button('storage-settings-back',v.cancel)}<button type="submit" class="primary">${esc(v.useFolder)}</button></div></form>`,async form=>{
   let id=String(form.get('folder')),folder=folders.find(f=>f.id===id);
   if(id==='new')folder=await manager.createFolder(String(form.get('folderName')).trim());
   if(!folder)throw Error(v.choose);draft.folderId=folder.id;draft.folderName=folder.name;draft.folderError='';draft.destination='drive';renderSettings();
  });const select=dialog.querySelector?.('[name=folder]');if(select)select.onchange=()=>{const row=dialog.querySelector('[data-new-folder]');row.hidden=select.value!=='new';row.querySelector('input').required=!row.hidden;};
 }
 const actions={
  'storage-manage':overview,'storage-settings':overview,'storage-setup':overview,'storage-folder':chooseFolder,'storage-settings-back':renderSettings,
  'storage-principal':async()=>{readDraft();const node=dialog.lastElementChild;await manager.claimPrincipal();if(dialog.open&&dialog.contains(node))renderSettings();},
  'storage-copies':async()=>{waiting(ui('Looking for your backups…','Buscando tus copias de seguridad…'));const node=dialog.lastElementChild;await manager.refresh();const files=(await manager.copies()).sort((a,b)=>b.appProperties.createdAt.localeCompare(a.appProperties.createdAt));if(!dialog.open||!dialog.contains(node))return;showDialog(t().restoreArchive,`<p>${ui('Choose the date you want to recover.','Elige la fecha que quieres recuperar.')}</p>${files.map(f=>`<section class="cp-card"><h3>${esc(new Date(f.appProperties.createdAt).toLocaleString())}</h3><p>${(Number(f.size)/1048576).toFixed(1)} MB</p>${button('storage-download-copy',ui('Review this backup','Revisar esta copia de seguridad'),f.id)}</section>`).join('')||`<p>${ui('No complete backups yet.','Todavía no hay copias de seguridad completas.')}</p>`}${button('storage-import',ui('Choose a ZIP from my device','Elegir un ZIP del dispositivo'))}`);},
  'storage-download-copy':async id=>{const file=(await manager.copies()).find(f=>f.id===id);if(!file)throw Error('Backup unavailable.');await downloadCopy(file);},
  'storage-export':exportZip,'storage-import':restoreZip,
 };
 // Backups are optional settings, not an unfinished notebook-connection wizard.
 return {actions,notify:async()=>{},overview,summary,statusMarkup,entryMarkup:()=>'',get pending(){return false;}};
}
