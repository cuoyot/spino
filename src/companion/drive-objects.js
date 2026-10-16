import {backupHash} from './cloud-backup.js';
import {stableJSON} from './cloud-merge.js';
import {atomicFailure,hashPattern} from './atomic-notebook.js';
export const OBJECT_MARKER='spino-object-v2',COMMIT_MARKER='spino-commit-v2',ROOT_MARKER='spino-notebook-v2';
export const objectFields='id,name,mimeType,size,version,sha256Checksum,appProperties,trashed';
export const validDriveId=id=>typeof id==='string'&&/^[\w-]{1,180}$/.test(id);
export function createDriveObjects({api,journal,scope,rootId,notebookId,folderId,lookup}){
 const cache=new Map(),locations=new Map();
 const key=hash=>scope+'/object/'+hash;
 function register(file){const p=file?.appProperties;if(!validDriveId(file?.id)||file.trashed||file.mimeType!=='application/json'||!Number.isSafeInteger(Number(file.size))||Number(file.size)<1||Number(file.size)>1048576||p?.rootId!==rootId||p.notebookId!==notebookId||![OBJECT_MARKER,COMMIT_MARKER].includes(p.spinoType)||!hashPattern.test(p.hash))throw atomicFailure('Invalid incremental Drive object.');if(file.sha256Checksum&&file.sha256Checksum!==p.hash)throw atomicFailure('An incremental notebook object failed its integrity check.','INTEGRITY');if(!locations.has(p.hash))locations.set(p.hash,file.id);}
 async function get(hash){
  if(!hashPattern.test(hash))throw atomicFailure('Invalid incremental object checksum.');
  if(cache.has(hash))return cache.get(hash);
  const saved=await journal.get(key(hash));
  let text=saved?.verified?saved.text:null;
  if(!text){if(!locations.has(hash)&&!saved?.id&&lookup)for(const file of await lookup(hash))register(file);const id=locations.get(hash)||saved?.id;if(!id)throw atomicFailure('Some notebook objects have not arrived yet. Retry synchronization.','INCOMPLETE');text=(await api(`/drive/v3/files/${id}?alt=media`)).text;}
  if(typeof text!=='string'||new TextEncoder().encode(text).length>1048576||await backupHash(text)!==hash)throw atomicFailure('An incremental notebook object failed its integrity check.','INTEGRITY');
  let value;try{value=JSON.parse(text);}catch{throw atomicFailure('Invalid incremental object data.');}
  if(!saved?.verified)await journal.set(key(hash),{id:locations.get(hash)||saved?.id,text,verified:true});cache.set(hash,value);return value;
 }
 async function put(value,{commit=false}={}){
  const text=stableJSON(value);if(new TextEncoder().encode(text).length>1048576)throw atomicFailure('An incremental object exceeds 1 MB.','LIMIT');
  const hash=await backupHash(text),saved=await journal.get(key(hash));
  if(saved?.verified){if(saved.text!==text)throw atomicFailure('Incremental content identity mismatch.','INTEGRITY');cache.set(hash,value);return hash;}
  if(locations.has(hash)){await get(hash);return hash;}
  let id=saved?.id;
  if(!id){id=JSON.parse((await api('/drive/v3/files/generateIds?count=1&space=drive&type=files')).text).ids?.[0];if(!validDriveId(id))throw atomicFailure('Drive did not allocate an incremental object ID.');const pending={id,text,verified:false};if(journal.claim){const claimed=await journal.claim(key(hash),pending);if(claimed.text!==text)throw atomicFailure('Pending content identity mismatch.','INTEGRITY');id=claimed.id;}else await journal.set(key(hash),pending);}
  const confirm=async file=>{register(file);if(file.appProperties.hash!==hash)throw atomicFailure('Incremental content identity mismatch.','INTEGRITY');if(file.sha256Checksum!==hash)return false;await journal.set(key(hash),{id:file.id,text,verified:true});cache.set(hash,value);return true;};
  // After a lost POST response the same allocated ID is verified, never duplicated.
  const existing=await api(`/drive/v3/files/${id}?fields=${objectFields}`,{missing:true});
  if(existing){if(await confirm(JSON.parse(existing.text)))return hash;locations.set(hash,id);await get(hash);return hash;}
  const metadata={id,name:(commit?'Change ':'Object ')+hash.slice(0,16),mimeType:'application/json',...(folderId?{parents:[folderId]}:{}),appProperties:{spinoType:commit?COMMIT_MARKER:OBJECT_MARKER,rootId,notebookId,hash}};
  const boundary='spino_'+crypto.randomUUID().replaceAll('-','');
  const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${text}\r\n--${boundary}--\r\n`;
  const response=await api('/upload/drive/v3/files?uploadType=multipart&fields='+objectFields,{method:'POST',text:body,contentType:'multipart/related; boundary='+boundary,allowConflict:true});
  if(response.status!==409&&await confirm(JSON.parse(response.text)))return hash;
  locations.set(hash,id);await get(hash);return hash;
 }
 function invalidate(hash){cache.delete(hash);}
 return {get,put,register,invalidate,locations};
}
