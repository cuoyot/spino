import {ui,localizeMessage} from './locale.js';
import {escapeHTML as esc} from './views.js';
const button=(action,text,primary=false,id='')=>`<button type="button" data-action="${action}" data-id="${esc(id)}" class="${primary?'primary':''}">${esc(text)}</button>`;
const row=(label,value)=>`<div class="cp-row"><strong>${esc(label)}</strong><span>${esc(value||'—')}</span></div>`;
export function createStorageUI({manager,showDialog,dialog,formEnd,toast,refresh,exportZip,restoreZip,downloadCopy,cloud,deviceName,storage=localStorage,canNotify=()=>!dialog.open,connect=()=>{}}){
 let folders=[],draft=null,operation=0;
 const title=()=>ui('Your backups','Tus copias');
 const configured=()=>manager.state.config?.storageVersion==='1'&&!!manager.state.config.storageFolder&&!!manager.state.config.principalId;
 const offeredKey=()=>"spino.storage.wizard.offered.v2."+(cloud?.state.notebookId||cloud?.state.name||'local');
 const needsConnection=()=>cloud?.state.transport!=='drive'||!!cloud.state.syncFormat&&cloud.state.syncFormat!=='spino-notebook-v2';
 const pending=()=>cloud?.state.transport==='drive'&&!!cloud.state.name&&!configured();
 const waiting=text=>showDialog(title(),`<div class="cp-drive-loading"><span class="cp-drive-spinner" aria-hidden="true"></span><p role="status">${esc(text)}</p></div>`);
 const wizardActions=(label,back)=>`<div class="cp-actions">${back?button(back,ui('Back','Atrás')):''}<button type="submit" class="primary">${esc(label)}</button></div>`;
 const name=()=>String(manager.state.config?.name||cloud?.state.name||'Spino').replace(/\.json$/i,'');
 function entryMarkup(){return pending()?`<section class="cp-card cp-backup-onboarding"><h2>${ui('Set up your backups','Configura tus copias')}</h2><p>${ui('Choose where to keep your notebook and its files. We will guide you.','Elige dónde guardar tu cuaderno y sus archivos. Te guiamos paso a paso.')}</p>${button('storage-setup',ui('Set up my backups','Configurar mis copias'),true)}</section>`:'';}
 async function overview(){
  if(!configured())return setup();
  waiting(ui('Checking your backups…','Comprobando tus copias…'));
  const node=dialog.lastElementChild;await manager.refresh();if(!dialog.open||!dialog.contains(node))return;
  const c=manager.state.config,folder=await manager.folderName(c.storageFolder);if(!dialog.open||!dialog.contains(node))return;
  showDialog(title(),`<p>${esc(c.lastBackupAt?ui('Your last complete backup is saved.','Tu última copia completa está guardada.'):ui('Your first complete backup is pending.','Tu primera copia completa está pendiente.'))}</p>${row(ui('Last backup','Última copia'),c.lastBackupAt?new Date(c.lastBackupAt).toLocaleString():ui('Not created yet','Todavía sin crear'))}${row(ui('Saved in','Guardado en'),folder)}${row(ui('Makes backups','Hace las copias'),c.principalName)}<div class="cp-actions">${button('storage-copies',ui('Recover a backup','Recuperar una copia'),true)}${button('storage-export',ui('Save a copy','Guardar una copia'))}</div><div class="cp-drive-manage-actions">${button('storage-settings',ui('Backup settings','Configurar copias'))}${button('storage-problem',ui('I have a problem','Tengo un problema'))}</div>`);
 }
 async function setup(){
  if(needsConnection())return connect();
  const request=++operation;waiting(ui('Looking for your Drive folder…','Buscando tu carpeta de Drive…'));
  const node=dialog.lastElementChild;
  try{await manager.refresh();folders=await manager.folders();if(request!==operation||!dialog.open||!dialog.contains(node))return;
   const c=manager.state.config,l=manager.link(),folderId=c.storageFolder||l.folderId;
   // Retain unfinished choices when returning from the folder picker.
   draft={folderId,name:name(),enabled:c.backupEnabled!=='0',wifiOnly:c.backupWifiOnly!=='0',...draft};
   if(!folders.some(f=>f.id===draft.folderId))folders.push({id:folderId,name:await manager.folderName(folderId)});
   locationStep();
  }catch(error){if(dialog.open&&dialog.contains(node))showDialog(title(),`<p role="alert">${esc(localizeMessage(error.message))}</p><p>${ui('Your notebook is still saved on this device.','Tu cuaderno sigue guardado en este dispositivo.')}</p>${button('storage-setup',ui('Retry','Reintentar'),true)}`);}
 }
 function locationStep(){
  const folder=folders.find(f=>f.id===draft.folderId);
  showDialog(ui('Where should we save your notebook?','¿Dónde guardamos tu cuaderno?'),`<form data-storage-step="location"><p class="muted">${ui('Step 1 of 2','Paso 1 de 2')}</p><p>${ui('Your notebook, files and backups will stay in this folder.','Tu cuaderno, archivos y copias quedarán en esta carpeta.')}</p>${row(ui('Google Drive folder','Carpeta de Google Drive'),folder?.name)}${button('storage-folder',ui('Change folder','Cambiar carpeta'))}<label>${ui('Notebook name','Nombre del cuaderno')}<input name="name" maxlength="180" required value="${esc(draft.name)}"></label>${wizardActions(ui('Continue','Continuar'))}</form>`,form=>{draft.name=String(form.get('name')).trim().replace(/\.json$/i,'');if(!draft.name)throw Error(ui('Enter a notebook name.','Escribe un nombre para el cuaderno.'));backupStep();});
 }
 function chooseFolder(){
  const input=dialog.querySelector('[name=name]');if(input)draft.name=input.value;
  showDialog(ui('Choose a folder','Elegir carpeta'),`<form data-storage-step="folder"><label>Google Drive<select name="folder">${folders.map(f=>`<option value="${esc(f.id)}" ${f.id===draft.folderId?'selected':''}>${esc(f.name)}${folders.filter(v=>v.name===f.name).length>1?' · …'+esc(f.id.slice(-6)):''}</option>`).join('')}<option value="new">${ui('Create a folder…','Crear una carpeta…')}</option></select></label><label data-new-folder hidden>${ui('New folder name','Nombre de la carpeta nueva')}<input name="folderName" maxlength="180" value="Spino"></label>${wizardActions(ui('Use this folder','Usar esta carpeta'),'storage-location')}</form>`,async form=>{let id=String(form.get('folder'));if(id==='new'){waiting(ui('Creating your folder…','Creando tu carpeta…'));const node=dialog.lastElementChild;const folder=await manager.createFolder(String(form.get('folderName')));folders.push(folder);id=folder.id;if(!dialog.open||!dialog.contains(node))return;}if(!folders.some(f=>f.id===id))throw Error(ui('Choose a folder.','Elige una carpeta.'));draft.folderId=id;locationStep();});
  const select=dialog.querySelector('[name=folder]');select.onchange=()=>{const field=dialog.querySelector('[data-new-folder]');field.hidden=select.value!=='new';field.querySelector('input').required=!field.hidden;};
 }
 function backupStep(){
  const c=manager.state.config;
  showDialog(ui('Protect your notebook','Protege tu cuaderno'),`<form data-storage-step="backups"><p class="muted">${ui('Step 2 of 2','Paso 2 de 2')}</p><p>${ui('One complete backup a day when there are changes. We keep the latest 7.','Una copia completa al día cuando haya cambios. Conservamos las últimas 7.')}</p>${row(ui('Makes backups','Hace las copias'),c.principalName||deviceName)}<p>${ui('Only the device shown makes automatic backups, while Spino is open.','Solo el dispositivo indicado hace las copias automáticas, con Spino abierto.')}</p><label class="check"><input name="mobile" type="checkbox" ${draft.wifiOnly?'':'checked'}>${ui('Also use mobile data for backups','Usar también datos móviles para las copias')}</label><p class="muted">${ui('Otherwise, backups wait for Wi-Fi.','Si no lo activas, las copias esperan a tener wifi.')}</p>${wizardActions(ui('Activate my backups','Activar mis copias'),'storage-location')}</form>`,async form=>{draft.wifiOnly=!form.has('mobile');draft.enabled=true;await applySetup();});
 }
 async function applySetup(){
  const request=++operation,started=Date.now();let phase=ui('Organizing your folder…','Organizando tu carpeta…');
  waiting(phase);const node=dialog.lastElementChild;
  const update=()=>{if(request!==operation||!dialog.open||!dialog.contains(node))return;const status=node.querySelector('[role=status]');if(status){const p=manager.state.progress,label=p?.stage==='upload'?ui('Saving your backup…','Guardando tu copia…'):p?.stage==='staging'?ui('Preparing your backup…','Preparando tu copia…'):phase;const count=p?(p.stage==='files'?` · ${p.completed}/${p.total} ${ui('files','archivos')}`:` · ${Math.round(p.completed/1024)}/${Math.ceil(p.total/1024)} KB`):'';status.textContent=label+count+' · '+Math.floor((Date.now()-started)/1000)+' s';}};
  const timer=setInterval(update,1000);
  try{await manager.organize(draft);storage.setItem('spino.storage.review.v1','done');
   phase=ui('Checking your first backup…','Comprobando tu primera copia…');update();
   await refresh?.();await manager.daily({manual:true});
   if(request!==operation||!dialog.open||!dialog.contains(node))return;
   const c=manager.state.config,s=manager.state;
   const message=c.lastBackupAt?ui('Your complete backup is saved and verified.','Tu copia completa está guardada y verificada.'):s.status==='wifi'?ui('Backups are active. The first copy will start with Wi-Fi and Spino open.','Las copias están activadas. La primera se hará con wifi y Spino abierto.'):s.status==='secondary'?ui('Backups are active. The principal device will make the first copy.','Las copias están activadas. El dispositivo principal hará la primera copia.'):s.status==='error'?ui('The folder is ready. The first complete backup could not finish yet.','La carpeta está preparada. La primera copia completa todavía no ha podido terminar.'):ui('Backups are active. The first complete copy is pending.','Las copias están activadas. La primera copia completa está pendiente.');
   showDialog(ui('Your folder is ready','Tu carpeta está preparada'),`<div data-storage-step="complete"><p role="status">${esc(message)}</p>${s.error?`<p role="alert">${esc(localizeMessage(s.error))}</p>`:''}${row(ui('Saved in','Guardado en'),folders.find(f=>f.id===draft.folderId)?.name)}${row(ui('Notebook','Cuaderno'),draft.name)}<div class="cp-actions">${button('close-dialog',ui('Back to Spino','Volver a Spino'),true)}</div></div>`);
  }catch(error){if(request===operation&&dialog.open&&dialog.contains(node))showDialog(title(),`<p role="alert">${esc(localizeMessage(error.message))}</p><p>${ui('Setup has not finished. Your notebook and files are kept.','La configuración no ha terminado. Se conservan tu cuaderno y tus archivos.')}</p>${button('storage-apply',ui('Retry','Reintentar'),true)}`);}
  finally{clearInterval(timer);}
 }
 const actions={
  'storage-manage':overview,'storage-setup':setup,'storage-location':locationStep,'storage-folder':chooseFolder,'storage-apply':applySetup,
  'storage-problem':()=>showDialog(ui('What do you need?','¿Qué necesitas?'),`<div class="cp-drive-manage-actions">${button('drive-reconnect',ui('Reconnect Google Drive','Reconectar Google Drive'))}${button('storage-import',ui('Recover a ZIP from my device','Recuperar un ZIP del dispositivo'))}${button('storage-reset',ui('Start this device over','Volver a empezar en este dispositivo'))}</div>`),
  'storage-settings':async()=>{await manager.refresh();const c=manager.state.config;showDialog(ui('Backup settings','Configurar copias'),`<form><label class="check"><input name="enabled" type="checkbox" ${c.backupEnabled==='1'?'checked':''}>${ui('Daily backup when there are changes','Copia diaria cuando haya cambios')}</label><label class="check"><input name="mobile" type="checkbox" ${c.backupWifiOnly==='0'?'checked':''}>${ui('Also use mobile data','Usar también datos móviles')}</label>${row(ui('Makes backups','Hace las copias'),c.principalName)}${button('storage-principal',ui('Use this device instead','Usar este dispositivo'))}${button('storage-setup',ui('Change folder','Cambiar carpeta'))}${formEnd(ui('Save','Guardar'))}</form>`,async form=>{await manager.settings({backupEnabled:form.has('enabled')?'1':'0',backupWifiOnly:form.has('mobile')?'0':'1'});await overview();});},
  'storage-principal':()=>showDialog(ui('Make backups on this device?','¿Hacer las copias en este dispositivo?'),`<form><p>${ui('This device will make the automatic backups. The previous principal will stop.','Este dispositivo hará las copias automáticas. El principal anterior dejará de hacerlas.')}</p>${formEnd(ui('Use this device','Usar este dispositivo'))}</form>`,async()=>{await manager.claimPrincipal();await overview();}),
  'storage-now':async()=>{dialog.close();await cloud.retry();await manager.daily();await overview();},
  'storage-copies':async()=>{waiting(ui('Looking for your backups…','Buscando tus copias…'));const node=dialog.lastElementChild;await manager.refresh();const files=(await manager.copies()).sort((a,b)=>b.appProperties.createdAt.localeCompare(a.appProperties.createdAt));if(!dialog.open||!dialog.contains(node))return;showDialog(ui('Recover a backup','Recuperar una copia'),`<p>${ui('Choose the date you want to recover.','Elige la fecha que quieres recuperar.')}</p>${files.map(f=>`<section class="cp-card"><h3>${esc(new Date(f.appProperties.createdAt).toLocaleString())}</h3><p>${(Number(f.size)/1048576).toFixed(1)} MB</p>${button('storage-download-copy',ui('Review this copy','Revisar esta copia'),false,f.id)}</section>`).join('')||`<p>${ui('No complete backups yet.','Todavía no hay copias completas.')}</p>`}${button('storage-import',ui('Choose a ZIP from my device','Elegir un ZIP del dispositivo'))}`);},
  'storage-download-copy':async id=>{const file=(await manager.copies()).find(f=>f.id===id);if(!file)throw Error('Backup unavailable.');showDialog(ui('Download backup','Descargar copia'),`<form><p>${esc(file.name)} · ${(Number(file.size)/1048576).toFixed(1)} MB</p><p>${ui('This download may use mobile data, including 5G.','Esta descarga puede usar datos móviles, incluido 5G.')}</p>${formEnd(ui('Download and review','Descargar y revisar'))}</form>`,async()=>downloadCopy(file));},
  'storage-export':exportZip,'storage-import':restoreZip,
  'storage-review-later':()=>{storage.setItem(offeredKey(),'later');dialog.close();},
 };
 async function notify(){
  if(!cloud?.state.name||cloud.busy||!canNotify())return;
  if(!needsConnection()){try{await manager.refresh();}catch{return;}}
  if(configured()||!canNotify()||storage.getItem(offeredKey()))return;
  storage.setItem(offeredKey(),'shown');
  showDialog(ui('Set up your backups','Configura tus copias'),`<p>${ui('Choose where to keep your notebook and its files. We will guide you.','Elige dónde guardar tu cuaderno y sus archivos. Te guiamos paso a paso.')}</p><div class="cp-actions">${button('storage-setup',ui('Start','Empezar'),true)}${button('storage-review-later',ui('Later','Más tarde'))}</div>`);
 }
 return {actions,notify,overview,entryMarkup,get pending(){return pending();}};
}
