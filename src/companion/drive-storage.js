import {backupFingerprint,createCompleteBackup,dailyBackupDecision,retainedBackups} from './complete-backup.js';
import {mediaHash} from './drive-media.js';
import {uploadArchive} from './drive-archive.js';
import {readRecordingCopies} from './recording-copies.js';
const valid=id=>typeof id==='string'&&/^[\w-]{1,180}$/.test(id);
const enc=encodeURIComponent;
const conflict=()=>Object.assign(Error('Storage settings changed on another device. Reload and try again.'),{code:'CONFLICT'});
export function createDriveStorage({drive,deviceId,deviceName,snapshot,completeSnapshot=snapshot,mediaStore,mediaClient,network,eligible,changed=()=>{},upload=uploadArchive,now=()=>new Date()}){
 let busy=false,config=null,configKey='',status='idle',error='',progress=null;
 const api=async(path,options)=>{const r=await drive.storageRequest(path,options);return r?.text?JSON.parse(r.text):null;};
 const link=()=>{const l=drive.storageLink();if(!valid(l.id)||!valid(l.folderId)||!valid(l.notebookId))throw Error('Connect and synchronize your Drive notebook first.');return l;};
 async function list(q,fields='id,name,mimeType,parents,size,sha256Checksum,appProperties,trashed'){
  const files=[];let token='';do{const r=await api('/drive/v3/files?pageSize=100&q='+enc(q)+'&fields='+enc('nextPageToken,files('+fields+')')+(token?'&pageToken='+enc(token):''));files.push(...r.files);token=r.nextPageToken||'';if(files.length>100000)throw Error('Too many files in the storage folder.');}while(token);return files;
 }
 const identity=()=>{try{const l=link();return JSON.stringify([l.accountId,l.id,l.folderId,l.notebookId]);}catch{return '';}};
 async function control(){
  const l=link(),key=identity(),f=await api(`/drive/v2/files/${l.id}?fields=id,title,etag,properties`);
  if(!/^"[^"\r\n]+"$/.test(f.etag||''))throw Error('Drive did not provide a settings revision.');
  const p=Object.fromEntries((f.properties||[]).filter(p=>p.visibility==='PRIVATE').map(p=>[p.key,p.value])),next={...p,name:f.title,etag:f.etag};
  const folderId=p.storageFolder||l.folderId;
  if(drive.rememberStorage){const folder=await api(`/drive/v3/files/${folderId}?fields=id,name`,{missing:true});next.storageFolderName=folder?.name||'';}
  // Unknown settings are not an unfinished setup. Publish only a complete read for the current notebook.
  if(identity()!==key)throw Error('The connected notebook changed. Try again.');
  config=next;configKey=key;
  drive.rememberStorage?.({folderId,name:next.storageFolderName,notebookName:f.title});
  changed();return config;
 }
 async function patch(expected,updates){const l=link();await api(`/drive/v2/files/${l.id}?fields=id`,{method:'PUT',etag:expected.etag,text:JSON.stringify({properties:Object.entries({...expected,...updates}).filter(([k])=>!['name','etag','storageFolderName'].includes(k)).map(([key,value])=>({key,value:String(value),visibility:'PRIVATE'}))})});return control();}
 async function folders(){return list("trashed = false and mimeType = 'application/vnd.google-apps.folder'");}
 async function createFolder(name,parent){if(!name.trim()||name.length>180)throw Error('Enter a folder name.');return api('/drive/v3/files?fields=id,name',{method:'POST',text:JSON.stringify({name:name.trim(),mimeType:'application/vnd.google-apps.folder',...(parent?{parents:[parent]}:{})})});}
 async function putInFolder(id,parent){if(!valid(id)||!valid(parent)||id===parent)throw Error('Invalid folder selection.');const f=await api(`/drive/v3/files/${id}?fields=id,parents`);if(f.parents?.includes(parent))return;await api(`/drive/v3/files/${id}?addParents=${parent}${f.parents?.length?'&removeParents='+enc(f.parents.join(',')):''}&fields=id,parents`,{method:'PATCH',text:'{}'});const after=await api(`/drive/v3/files/${id}?fields=parents`);if(!after.parents?.includes(parent))throw Error('The file location could not be verified.');}
 async function organize({folderId,name,enabled=true,wifiOnly=true}){
  if(busy||!eligible(true))throw Error('Finish synchronization and editing before organizing storage.');busy=true;error='';progress=null;status='organizing';changed();
  try{const l=link(),before=await control();if(!valid(folderId)||!name.trim()||name.length>180)throw Error('Choose a folder and file name.');
   const target=await api(`/drive/v3/files/${folderId}?fields=id,name,mimeType,trashed,parents`);if(target.trashed||target.mimeType!=='application/vnd.google-apps.folder')throw Error('The selected folder is unavailable.');
   // Retain notebook and object IDs. Existing clients keep the same notebook; no fork is created.
   // Reject moving a folder inside itself or any of its descendants.
   let parent=target;for(let n=0;folderId!==l.folderId&&parent?.parents?.length&&n<100;n++){
    const parentId=parent.parents[0];if(parentId===l.folderId)throw Error('Select a folder outside the current notebook folder.');
    // drive.file may expose a selected/created folder without exposing its ancestors,
    // including My Drive. A missing ancestor is not a missing notebook object.
    // Drive still validates the move and rejects cycles beyond this visible boundary.
    parent=await api(`/drive/v3/files/${parentId}?fields=id,parents`,{missing:true});
   }
   if(folderId!==l.folderId){
    await putInFolder(l.folderId,folderId);
    const dataFolder=await api(`/drive/v3/files/${l.folderId}?fields=id,description`);
    // Only rename our own internal data folder, never a user-selected container.
    if(dataFolder.description==='SPino synchronized notebook objects. Keep this folder intact.')await api(`/drive/v3/files/${l.folderId}?fields=id`,{method:'PATCH',text:JSON.stringify({name:name.trim().replace(/\.json$/i,'')})});
   }
   const media=await list(`trashed = false and appProperties has { key='notebookId' and value='${l.notebookId}' } and (appProperties has { key='spinoMedia' and value='spino-media-v1' } or appProperties has { key='spinoMedia' and value='spino-media-free-v1' })`);
   const children=await list(`trashed = false and '${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`);
   const child=async(name,existing)=>existing?{id:existing}:(children.find(f=>f.appProperties?.spinoStorage===l.notebookId&&f.appProperties?.role===name)||await api('/drive/v3/files?fields=id,name',{method:'POST',text:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',parents:[folderId],appProperties:{spinoStorage:l.notebookId,role:name}})}));
   const mediaFolder=await child('Multimedia',before.mediaFolder);
   const copiesFolder=await child('Copias',before.copiesFolder);
   if(before.mediaFolder)await putInFolder(mediaFolder.id,folderId);if(before.copiesFolder)await putInFolder(copiesFolder.id,folderId);
   for(const file of media)await putInFolder(file.id,mediaFolder.id);
   await drive.rename(name.trim().replace(/\.json$/i,'')+'.json');
   // Renaming changes the resource revision. Re-read and check ownership before committing settings.
   const fresh=await control();if(fresh.principalId!==before.principalId||fresh.storageFolder!==before.storageFolder)throw conflict();
   await patch(fresh,{storageVersion:'1',storageFolder:folderId,mediaFolder:mediaFolder.id,copiesFolder:copiesFolder.id,principalId:before.principalId||deviceId,principalName:before.principalName||deviceName,backupEnabled:enabled?'1':'0',backupWifiOnly:wifiOnly?'1':'0'});status='ready';return config;
  }catch(e){error=e.message;status='error';throw e;}finally{busy=false;changed();}
 }
 async function claimPrincipal(){const before=await control();return patch(before,{principalId:deviceId,principalName:deviceName});}
 async function inventory(wifiOnly=false){const l=link(),client=await mediaClient({accountId:l.accountId,notebookId:l.notebookId,wifiOnly,folderId:config?.mediaFolder}),local=await mediaStore.index(),copies=await readRecordingCopies({client,rows:local,load:id=>mediaStore.get(id),accountId:l.accountId,notebookId:l.notebookId});
  if(copies.issues.length){const issue=copies.issues[0];throw Object.assign(Error('A recording needs attention before the complete ZIP can be created.'),{recordingTitle:issue.file.name||'',recordingError:issue.error.message});}
  const remote=copies.files;for(const row of local){if(!row.remoteOnly&&!row.draft){const r=await mediaStore.get(row.id);if(r)row.sha256=await mediaHash(r.blob);}}const rows=new Map(local.filter(r=>!r.draft&&(!r.cloud||r.cloud.accountId===l.accountId&&r.cloud.notebookId===l.notebookId)).map(r=>[r.mediaTakeId||r.id,r]));
  for(const file of remote){const p=file.appProperties;if(!rows.has(p.takeId))rows.set(p.takeId,{id:p.takeId,workId:p.workId,title:file.name,createdAt:p.createdAt,durationMs:Number(p.durationMs),kind:file.mimeType==='audio/midi'?'midi':file.mimeType.startsWith('video/')?'video':'audio',bytes:Number(file.size),remoteOnly:true,cloud:{accountId:l.accountId,notebookId:l.notebookId,fileId:file.id,sha256:file.sha256Checksum||p.sha256}});}
  return {rows:[...rows.values()],client,remoteFiles:remote};
 }
 async function complete({wifiOnly=false}={}){const {rows,client}=await inventory(wifiOnly),fingerprintText=await snapshot(),text=await completeSnapshot();const available=new Set(rows.map(r=>r.id));for(const event of JSON.parse(text).data.events||[])for(const id of event.recordingIds||[])if(!available.has(id))throw Error('Some linked recordings have not reached this device or Drive. Open the original device and synchronize first.');for(const r of rows)if(r.remoteOnly&&!r.cloud?.fileId)throw Error('Some recordings have not reached Drive.');
  const blob=await createCompleteBackup({text,records:rows,onProgress:(completed,total)=>{progress={stage:'files',completed,total};changed();},load:async row=>{const local=await mediaStore.get(row.id);if(local)return local;if(!row.cloud?.fileId)throw Error('A recording is unavailable.');const result=await client.download(row.cloud.fileId);try{return {...row,blob:result.blob};}finally{await result.cleanup?.();}}});return {blob,hash:await backupFingerprint(fingerprintText,rows)};
 }
 async function copies(){const l=link();return list(`trashed = false and appProperties has { key='spinoBackup' and value='complete-v1' } and appProperties has { key='notebookId' and value='${l.notebookId}' } and appProperties has { key='complete' and value='1' }`);}
 async function prune(){for(const file of retainedBackups(await copies())){const owner=await control();if(owner.principalId!==deviceId)throw conflict();await api(`/drive/v3/files/${file.id}?fields=id`,{method:'PATCH',text:JSON.stringify({trashed:true})});}}
 async function daily({manual=false}={}){if(busy||!eligible(manual))return;busy=true;error='';progress=null;try{const c=await control();if(c.storageVersion!=='1'||c.backupEnabled!=='1'||c.principalId!==deviceId){status=c.principalId&&c.principalId!==deviceId?'secondary':'disabled';return;}
   if(c.lastBackupFile){const pending=await api(`/drive/v3/files/${c.lastBackupFile}?fields=id,appProperties,trashed`);if(!pending.trashed&&pending.appProperties?.complete==='0'&&pending.appProperties.contentHash===c.lastBackupHash)await api(`/drive/v3/files/${c.lastBackupFile}?fields=id`,{method:'PATCH',text:JSON.stringify({appProperties:{complete:'1'}})});}
   const net=await network();if(!net.online||c.backupWifiOnly!=='0'&&(!net.wifi||net.metered)){status=net.online?'wifi':'offline';return;}
   status='checking';changed();const {rows}=await inventory(),text=await snapshot(),hash=await backupFingerprint(text,rows),date=now().toLocaleDateString('en-CA');
   const decision=dailyBackupDecision({enabled:true,principalId:c.principalId,deviceId,lastDate:c.lastBackupDate,lastHash:c.lastBackupHash,date,hash});if(decision!=='due'){await prune();status=decision;return;}
   status='copying';changed();const result=await complete({wifiOnly:c.backupWifiOnly!=='0'});if(!eligible(manual))throw Error('Backup paused until the app is available.');const check=await control();if(check.principalId!==deviceId||check.etag!==c.etag)throw conflict();
   const l=link(),id=(await api('/drive/v3/files/generateIds?count=1&space=drive')).ids[0],createdAt=now().toISOString();
   await upload({blob:result.blob,accountId:l.accountId,folderId:c.copiesFolder,fileId:id,name:c.name.replace(/\.json$/i,'')+'_'+createdAt.replace(/[:.]/g,'-')+'.zip',properties:{spinoBackup:'complete-v1',notebookId:l.notebookId,createdAt,contentHash:result.hash,principalId:deviceId},wifiOnly:c.backupWifiOnly!=='0',onProgress:value=>{progress=value;changed();}});
   const latest=await control();if(latest.principalId!==deviceId||latest.etag!==check.etag)throw conflict();
   // Commit ownership and the verified snapshot pointer atomically on the control file.
   // A concurrent principal change rejects this CAS before the ZIP becomes a completed copy.
   await patch(latest,{lastBackupDate:date,lastBackupHash:result.hash,lastBackupAt:createdAt,lastBackupFile:id});
   await api(`/drive/v3/files/${id}?fields=id`,{method:'PATCH',text:JSON.stringify({appProperties:{complete:'1'}})});
   await prune();status='saved';
  }catch(e){status='error';error=e.message;}finally{busy=false;changed();}}
 return {get state(){const loaded=!!configKey&&configKey===identity();return {config:loaded?config:null,loaded,busy,status,error,progress,deviceId,deviceName};},refresh:control,folders,createFolder,organize,claimPrincipal,copies,complete,daily,link,inventory,folderName:async id=>(await api(`/drive/v3/files/${id}?fields=name`)).name,settings:async updates=>patch(await control(),updates),putInFolder};
}
