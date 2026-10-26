import {registerPlugin} from '@capacitor/core';
import {createDriveRequestGate} from './drive-request.js';
import {uploadArchive,downloadArchive} from './drive-archive.js';
const accountPlugin=registerPlugin('DriveBackupAccount'),archivePlugin=registerPlugin('DriveArchive');
const valid=id=>typeof id==='string'&&/^[\w-]{1,180}$/.test(id);
const normalized=name=>String(name||'').normalize('NFKC').trim().toLocaleLowerCase('en');
export const backupFolderConflicts=(name,notebookNames)=>notebookNames.some(n=>normalized(n)&&normalized(n)===normalized(name));
export function suggestedBackupFolder(name,notebookNames=[]){let result=String(name||'SPino').trim().replace(/\.json$/i,'').slice(0,150)+'_backup';while(backupFolderConflicts(result,notebookNames))result+='_backup';return result;}
export function validateBackupFolder(name,notebookNames=[]){
 const value=String(name||'').trim();
 if(!value||value.length>180||/[\u0000-\u001f/\\]/.test(value))throw Error('Enter a backup folder name.');
 if(backupFolderConflicts(value,notebookNames))throw Error('The backup folder name matches the notebook folder. Choose another name.');
 return value;
}
// This transport has its own native OAuth account and binary cache. Notebook credentials are never a fallback.
export function createBackupDrive({native=accountPlugin,transfer=archivePlugin,storage=localStorage,upload=uploadArchive,download=downloadArchive}={}){
 const gate=createDriveRequestGate(native,{timeoutMs:60000});
 async function account(id=''){const result=await native.status(id?{accountId:id}:{});return result.account?.id&&(!id||result.account.id===id)?result.account:null;}
 async function connect(){const selected=await native.connect();if(!valid(selected?.id)||!selected.email)throw Error('Connect Google Drive for backups.');return selected;}
 async function request(accountId,path,options={}){
  if(!valid(accountId))throw Error('Connect Google Drive for backups.');
  const {missing,...args}=options,result=await gate.run(()=>native.request({accountId,path,requestId:crypto.randomUUID(),...args}));
  if(result.status===404&&missing)return null;
  if(result.status===412)throw Object.assign(Error('Backup destination changed. Review its settings.'),{code:'CONFLICT'});
  if(result.status===401||result.status===403)throw Object.assign(Error('Connect Google Drive for backups.'),{code:'PERMISSION_REQUIRED'});
  if(result.status<200||result.status>=300)throw Error('The backup Drive request failed.');
  return result.text?JSON.parse(result.text):null;
 }
 async function requireAccount(id){const selected=await account(id);if(!selected||selected.id!==id)throw Error('Connect Google Drive for backups.');return selected;}
 async function ensureFolder({accountId,sourceRoot,name,notebookNames=[],excludedIds=[]}){
  name=validateBackupFolder(name,notebookNames);await requireAccount(accountId);
  if(!valid(sourceRoot))throw Error('Invalid notebook identity.');
  const key='spino.backup-folder.v1.'+JSON.stringify([accountId,sourceRoot,normalized(name)]);
  let id=storage.getItem(key),folder;if(id&&!valid(id))throw Error('The backup folder changed. Choose another name.');
  if(id&&valid(id))folder=await request(accountId,`/drive/v3/files/${id}?fields=id,name,mimeType,parents,appProperties,trashed`,{missing:true});
  if(folder&&(folder.trashed||folder.mimeType!=='application/vnd.google-apps.folder'||folder.appProperties?.spinoBackupFolder!=='complete-v1'||folder.appProperties.sourceRoot!==sourceRoot||normalized(folder.name)!==normalized(name)))throw Error('The backup folder changed. Choose another name.');
  if(!id){
   const escape=s=>s.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
   const q=`trashed = false and mimeType = 'application/vnd.google-apps.folder' and name = '${escape(name)}' and appProperties has { key='spinoBackupFolder' and value='complete-v1' } and appProperties has { key='sourceRoot' and value='${sourceRoot}' }`;
   const found=await request(accountId,'/drive/v3/files?pageSize=100&q='+encodeURIComponent(q)+'&fields=files(id,name,mimeType,parents,appProperties,trashed)');
   folder=found.files?.[0];
   id=folder?.id||(await request(accountId,'/drive/v3/files/generateIds?count=1&space=drive')).ids[0];
   if(!valid(id))throw Error('Drive did not allocate a backup folder.');storage.setItem(key,id);
  }
  if(!folder){
   await request(accountId,'/drive/v3/files?fields=id',{method:'POST',text:JSON.stringify({id,name,mimeType:'application/vnd.google-apps.folder',parents:['root'],appProperties:{spinoBackupFolder:'complete-v1',sourceRoot}})});
   folder=await request(accountId,`/drive/v3/files/${id}?fields=id,name,mimeType,parents,appProperties,trashed`);
  }
  if(!folder||folder.trashed||folder.mimeType!=='application/vnd.google-apps.folder'||folder.appProperties?.spinoBackupFolder!=='complete-v1'||folder.appProperties.sourceRoot!==sourceRoot||normalized(folder.name)!==normalized(name))throw Error('The backup folder changed. Choose another name.');
  let parent=folder;for(let n=0;parent&&n<100;n++){
   if(excludedIds.includes(parent.id))throw Error('The backup folder name matches the notebook folder. Choose another name.');
   if(!parent.parents?.length||!excludedIds.length)break;
   parent=await request(accountId,`/drive/v3/files/${parent.parents[0]}?fields=id,parents`,{missing:true});
  }
  return {id:folder.id,name:folder.name};
 }
 const write=(options)=>upload({...options,transport:transfer,authorizationMethod:'useBackupAccount'});
 const read=async options=>{await requireAccount(options.accountId);return download({...options,transport:transfer,authorizationMethod:'useBackupAccount'});};
 return {account,connect,requireAccount,request,ensureFolder,upload:write,download:read,pause:()=>transfer.pause()};
}
