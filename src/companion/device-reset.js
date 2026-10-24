import {stableJSON,notebookContent} from './cloud-merge.js';
import {driveNotebookContent} from './notebook-transport.js';
import {inspectCompleteBackup} from './complete-backup.js';
import {mediaHash} from './drive-media.js';
const normalized=text=>{const v=driveNotebookContent(notebookContent(JSON.parse(text)));delete v.data.lastBackup;return stableJSON(v);};
export async function verifyDeviceReset({localText,remoteText,rows,remoteFiles,load,accountId,notebookId}){
 if(JSON.parse(localText).data.active)throw Error('Finish practice before resetting this device.');
 if(normalized(localText)!==normalized(remoteText))throw Error('Some notebook changes are not synchronized. Synchronize before resetting.');
 const files=new Map(remoteFiles.map(f=>[f.appProperties.takeId,f]));
 for(const row of rows){
  if(row.draft)throw Error('A draft recording is only on this device. Finish or export it before resetting.');
  if(row.remoteOnly)continue;
  const remote=files.get(row.mediaTakeId||row.id),record=await load(row.id);
  if(!record?.blob||!remote||row.cloud?.accountId!==accountId||row.cloud?.notebookId!==notebookId||await mediaHash(record.blob)!==(remote.sha256Checksum||remote.appProperties.sha256))throw Error('Some recordings are only on this device. Upload them before resetting.');
 }
}
export async function retainResetArchive(blob,link){
 await inspectCompleteBackup(blob);
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('spino-device-recovery',1);r.onupgradeneeded=()=>r.result.createObjectStore('archives');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const id=crypto.randomUUID();
 try{await new Promise((resolve,reject)=>{const tx=db.transaction('archives','readwrite');tx.objectStore('archives').put({blob,link,createdAt:new Date().toISOString()},id);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Could not retain recovery copy.'));});return id;}finally{db.close();}
}
export async function readResetArchive(id){
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('spino-device-recovery',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{return await new Promise((resolve,reject)=>{const r=db.transaction('archives').objectStore('archives').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}
}
