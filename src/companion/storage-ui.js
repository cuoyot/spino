import {backupFolderConflicts,suggestedBackupFolder,validateBackupFolder} from './backup-drive.js';
import {ui,localizeMessage,getAppLanguage} from './locale.js';
import {escapeHTML as esc} from './views.js';
import {automaticBackupCopy} from './automatic-backup-copy.js';
import {backupArchiveName} from './complete-backup.js';
const button=(action,text,id='')=>`<button type="button" data-action="${action}" data-id="${esc(id)}">${esc(text)}</button>`;
export function createStorageUI({manager,showDialog,dialog,formEnd,toast,refresh,prepareSetup,exportZip,restoreZip,downloadCopy,cloud,deviceName}){
 let draft=null,request=0,copyPending=false;
 const t=()=>automaticBackupCopy(getAppLanguage());
 const destination=c=>c.backupDestination||(c.copiesFolder&&c.backupEnabled==='1'?'drive':'local');
 const current=()=>manager.state.loaded&&manager.state.config;
 const name=()=>current()?.name||cloud?.state.name||'SPino';
 const waiting=text=>showDialog(t().enabled,`<div class="cp-drive-loading"><span class="cp-drive-spinner" aria-hidden="true"></span><p role="status">${esc(text)}</p></div>`);
 function summary(){const c=current(),v=t();return !c?v.unknown:c.backupEnabled==='1'?`${v.last}: ${c.lastBackupAt?new Date(c.lastBackupAt).toLocaleString():v.never}\n${v.folder}: ${destination(c)==='drive'?'Google Drive / '+(c.backupFolderName||v.choose):v.localPath}`:v.off;}
 function statusMarkup(){
  const c=current(),s=manager.state,v=t();if(!c||c.backupEnabled!=='1')return '';
  if(!s.busy)return `<p class="cp-auto-backup-schedule muted">${esc(v.schedule)}</p>${s.error?`<p class="cp-auto-backup-error" role="alert">${esc(localizeMessage(s.error))}</p>`:''}${c.principalId===s.deviceId?`<div class="cp-auto-backup-now">${button('storage-backup-now',v.copyNow)}</div>`:''}`;
  const p=s.progress||{},saving=['saving','staging','upload'].includes(p.stage),phase=saving?v.saving:v.prepare;
  const known=p.total>0,percent=known?Math.min(100,Math.floor(100*p.completed/p.total)):null;
  const count=known?(p.stage==='files'?`${p.completed}/${p.total} ${v.files}`:`${(p.completed/1048576).toFixed(1)}/${(p.total/1048576).toFixed(1)} MB`):'';
  return `<div class="cp-auto-backup-progress" data-backup-phase="${saving?'saving':'preparing'}" role="status" aria-live="polite"><div class="cp-backup-phases"><span ${saving?'':'data-current'}>1. ${esc(v.prepare)}</span><span ${saving?'data-current':''}>2. ${esc(v.saving)}</span></div><progress max="100" ${known?`value="${percent}"`:''} aria-label="${esc(phase)}"></progress>${count?`<small>${esc(count)}</small>`:''}</div>`;
 }
 function readDraft(){const form=dialog.querySelector?.('[data-backup-settings]');if(!form)return;draft.enabled=form.elements.enabled.checked;draft.mobile=form.elements.mobile.checked;draft.destination=form.elements.destination.value;draft.folderName=form.elements.backupFolderName?.value||draft.folderName;}
 const notebookNames=()=>manager.notebookFolderNames?.()||[name().replace(/\.json$/i,''),current()?.storageFolderName].filter(Boolean);
 function renderSettings(){
  const c=current(),v=t(),principal=c.principalId===manager.state.deviceId?v.thisDevice:c.principalName||(c.principalId?v.otherDevice:v.thisDevice);
  showDialog(v.enabled,`<form data-backup-settings class="cp-auto-backup-settings">
   <label class="cp-backup-enable"><input type="checkbox" name="enabled" ${draft.enabled?'checked':''}><span><strong>${esc(draft.enabled?v.on:v.off)}</strong><small>${esc(v.schedule)}</small></span></label>
   <section class="cp-backup-setting"><h3>${esc(v.device)}</h3><p class="cp-backup-setting-value">${esc(principal)}</p>${c.principalId&&c.principalId!==manager.state.deviceId?`${button('storage-principal',v.takeOver)}<p class="muted">${esc(v.takeOverHelp)}</p>`:''}</section>
   <section class="cp-backup-setting"><label for="backup-destination">${esc(v.destination)}</label><select name="destination" id="backup-destination"><option value="local" ${draft.destination==='local'?'selected':''}>${esc(v.local)}</option><option value="drive" ${draft.destination==='drive'?'selected':''}>${esc(v.remote)}</option></select><div data-backup-local ${draft.destination==='local'?'':'hidden'}><p class="muted">${esc(v.localPath)}</p></div><div data-backup-remote ${draft.destination==='drive'?'':'hidden'}><div class="cp-backup-account"><h4>${esc(v.backupAccount)}</h4><p>${esc(draft.account?.email||c.backupAccountLabel||v.noAccount)}</p>${button('storage-backup-connect',draft.account?v.changeAccount:v.connectAccount)}<p class="muted">${esc(v.accountHelp)}</p>${draft.connecting?`<p role="status">${esc(v.connecting)}</p>`:''}${draft.accountError?`<p role="alert">${esc(draft.accountError)}</p>`:''}</div><label for="backup-folder-name">${esc(v.folderName)}<input id="backup-folder-name" name="backupFolderName" maxlength="180" value="${esc(draft.folderName)}" aria-describedby="backup-folder-help backup-folder-error"></label><p class="muted" id="backup-folder-help">${esc(v.folderNameHelp)}</p><p id="backup-folder-error" role="alert" hidden></p><div data-backup-suggestion hidden>${button('storage-folder-suggestion',v.useSuggestion)}</div></div><p class="cp-backup-file-label">${esc(v.filename)}</p><p class="cp-backup-example">${esc(backupArchiveName(name(),new Date()).replace(/T.*\.zip$/,'.zip'))}</p><p class="muted">${esc(v.fileHelp)}</p></section>
   <label class="cp-backup-enable"><input type="checkbox" name="mobile" ${draft.mobile?'checked':''}><span><strong>${esc(v.mobile)}</strong><small>${esc(v.mobileHelp)}</small></span></label>
   <p class="cp-backup-last muted">${esc(v.last)} · ${esc(c.lastBackupAt?new Date(c.lastBackupAt).toLocaleString():v.never)}</p>
   ${manager.state.error?`<p role="alert">${esc(localizeMessage(manager.state.error))}</p>`:''}
   <div class="cp-backup-settings-footer">${formEnd(v.save)}</div></form>`,async form=>{
    draft={...draft,enabled:form.has('enabled'),mobile:form.has('mobile'),destination:String(form.get('destination')),folderName:String(form.get('backupFolderName')||draft.folderName)};
    if(draft.destination==='drive'&&draft.enabled)validateBackupFolder(draft.folderName,notebookNames());
    await manager.configureAutomatic({enabled:draft.enabled,destination:draft.destination,folderName:draft.folderName,accountId:draft.account?.id||'',wifiOnly:!draft.mobile});
    dialog.close();draft=null;await refresh?.();toast?.(t().saved);
   });
  const enabled=dialog.querySelector?.('[name=enabled]');if(enabled)enabled.onchange=()=>{enabled.closest('label').querySelector('strong').textContent=enabled.checked?t().on:t().off;readDraft();validateName();};
  const select=dialog.querySelector?.('[name=destination]');if(select)select.onchange=async()=>{readDraft();for(const kind of ['local','remote'])dialog.querySelector('[data-backup-'+kind+']').hidden=(draft.destination==='local')!==(kind==='local');validateName();if(draft.destination==='drive')await connectAccount();};
  const input=dialog.querySelector?.('[name=backupFolderName]');if(input)input.oninput=()=>{draft.folderName=input.value;draft.folderEdited=true;validateName();};validateName();
  if(draft.connecting){const submit=dialog.querySelector?.('[type=submit]');if(submit)submit.disabled=true;}
 }
 async function overview(){
  const id=++request;waiting(ui('Checking your backups…','Comprobando tus copias de seguridad…'));const node=dialog.lastElementChild;
  await manager.refresh();if(id!==request||!dialog.open||!dialog.contains(node))return;
  const c=current();draft={enabled:c.backupEnabled==='1',mobile:c.backupWifiOnly==='0',destination:destination(c),folderName:c.backupFolderName||c.backupFolderLabel||suggestedBackupFolder(name(),notebookNames()),account:null};
  if(c.backupAccount){draft.account=await manager.backupAccount(c.backupAccount);if(draft.account&&c.backupFolder)try{draft.folderName=await manager.backupFolderName?.()||draft.folderName;}catch(error){draft.accountError=localizeMessage(error.message);}}
  if(id!==request||!dialog.open||!dialog.contains(node))return;renderSettings();
 }
 function validateName(){
  const input=dialog.querySelector?.('[name=backupFolderName]');if(!input||!draft)return;
  const v=t(),remote=draft.destination==='drive',collision=remote&&backupFolderConflicts(input.value,notebookNames());
  input.required=remote&&draft.enabled;input.setCustomValidity(collision&&draft.enabled?v.folderCollision:'');input.setAttribute('aria-invalid',String(collision));
  const error=dialog.querySelector('#backup-folder-error'),suggestion=dialog.querySelector('[data-backup-suggestion]');
  error.hidden=!collision;suggestion.hidden=!collision;error.textContent=collision?v.folderCollision+' '+v.suggestedName+': '+suggestedBackupFolder(input.value,notebookNames()):'';
 }
 async function connectAccount(){
  readDraft();if(draft.connecting)return;draft.connecting=true;draft.accountError='';renderSettings();const node=dialog.lastElementChild;
  try{const account=await manager.connectBackupAccount();if(!dialog.open||!dialog.contains(node)||!draft)return;draft.account=account;if(account.id===current().backupAccount&&current().backupFolder&&!draft.folderEdited)draft.folderName=await manager.backupFolderName?.()||draft.folderName;}
  catch(error){if(!dialog.open||!dialog.contains(node)||!draft)return;draft.accountError=localizeMessage(error.message);}
  finally{if(draft){draft.connecting=false;if(dialog.open&&dialog.contains(node))renderSettings();}}
 }

 async function backupNow(){
  if(copyPending||manager.state.busy)return;
  copyPending=true;let release;
  waiting(t().prepare);const node=dialog.lastElementChild;
  try{
   release=await prepareSetup?.();
   if(dialog.open&&dialog.contains(node))dialog.close();
   const result=await manager.daily({manual:true,force:true});
   const state=manager.state,v=t();
   if(result==='saved')toast?.(v.copySaved);
   else if(state.error)toast?.(localizeMessage(state.error));
   else toast?.(state.status==='wifi'?v.copyWifi:state.status==='offline'?v.copyOffline:v.copyBusy);
  }finally{release?.();copyPending=false;if(dialog.open&&dialog.contains(node))dialog.close();await refresh?.();}
 }
 const actions={
  'storage-backup-now':backupNow,
  'storage-manage':overview,'storage-settings':overview,'storage-setup':overview,'storage-backup-connect':connectAccount,'storage-folder-suggestion':()=>{readDraft();draft.folderName=suggestedBackupFolder(draft.folderName,notebookNames());draft.folderEdited=true;renderSettings();},
  'storage-principal':async()=>{readDraft();const node=dialog.lastElementChild;await manager.claimPrincipal();if(dialog.open&&dialog.contains(node))renderSettings();},
  'storage-copies':async()=>{waiting(ui('Looking for your backups…','Buscando tus copias de seguridad…'));const node=dialog.lastElementChild;await manager.refresh();const files=(await manager.copies()).sort((a,b)=>b.appProperties.createdAt.localeCompare(a.appProperties.createdAt));if(!dialog.open||!dialog.contains(node))return;showDialog(t().restoreArchive,`<p>${ui('Choose the date you want to recover.','Elige la fecha que quieres recuperar.')}</p>${files.map(f=>`<section class="cp-card"><h3>${esc(new Date(f.appProperties.createdAt).toLocaleString())}</h3><p>${(Number(f.size)/1048576).toFixed(1)} MB</p>${button('storage-download-copy',ui('Review this backup','Revisar esta copia de seguridad'),f.id)}</section>`).join('')||`<p>${ui('No complete backups yet.','Todavía no hay copias de seguridad completas.')}</p>`}${button('storage-import',ui('Choose a ZIP from my device','Elegir un ZIP del dispositivo'))}`);},
  'storage-download-copy':async id=>{const file=(await manager.copies()).find(f=>f.id===id);if(!file)throw Error('Backup unavailable.');await downloadCopy(file);},
  'storage-export':exportZip,'storage-import':restoreZip,
 };
 // Backups are optional settings, not an unfinished notebook-connection wizard.
 return {actions,notify:async()=>{},overview,summary,statusMarkup,entryMarkup:()=>'',get pending(){return false;}};
}
