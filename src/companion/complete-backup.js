import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {backupHash} from './cloud-backup.js';
import {stableJSON} from './cloud-merge.js';
import {inspectBackup} from './backup-format.js';
import {mediaHash} from './drive-media.js';
const LIMIT=250*1024*1024;
const safe=id=>typeof id==='string'&&/^[\w-]{1,180}$/.test(id);
export async function backupFingerprint(text,records){
 const b=JSON.parse(text);delete b.exportedAt;delete b.cloudBackup;delete b.data.lastBackup;
 // Device-only activity and download settings do not create a new daily snapshot.
 for(const asset of b.assets||[])if(asset.remoteContent)delete asset.base64;
 b.data.active=null;for(const k of ['theme','wifiOnly'])delete b.data.preferences?.[k];
 return backupHash(stableJSON({notebook:b,media:records.filter(r=>!r.draft).map(r=>({id:r.mediaTakeId||r.id,title:r.title,workId:r.workId,createdAt:r.createdAt,sha256:r.cloud?.sha256||r.sha256})).sort((a,b)=>a.id.localeCompare(b.id))}));
}
export async function createCompleteBackup({text,records,load,onProgress=()=>{}}){
 const source=inspectBackup(text).backup;if(source.assets.some(a=>a.base64===undefined))throw Error('Download all scores before creating a complete backup.');const available=new Set(records.filter(r=>!r.draft).map(r=>r.id));for(const event of source.data.events||[])for(const id of event.recordingIds||[])if(!available.has(id))throw Error('Some linked recordings are unavailable. The complete backup was not created.');const files={'notebook.json':strToU8(text)},manifest={format:'spino-complete-backup',version:1,createdAt:new Date().toISOString(),notebookHash:await backupHash(text),recordings:[]};
 let total=files['notebook.json'].length,done=0;
 for(const row of records.filter(r=>!r.draft)){
  if(!safe(row.id)||!safe(row.mediaTakeId||row.id))throw Error('Invalid recording identity.');
  const record=await load(row);if(!(record?.blob instanceof Blob)||!record.blob.size)throw Error('Some recordings are unavailable. The complete backup was not created.');
  total+=record.blob.size;if(total>LIMIT)throw Error('The complete backup exceeds the 250 MB beta limit. No incomplete copy has been saved.');
  const sha256=await mediaHash(record.blob);if(row.cloud?.sha256&&sha256!==row.cloud.sha256)throw Error('A recording failed verification.');
  const path='media/'+row.id;files[path]=new Uint8Array(await record.blob.arrayBuffer());
  const {blob,installation,cloud,remoteOnly,...meta}=row;
  manifest.recordings.push({...meta,path,mimeType:record.blob.type,bytes:record.blob.size,sha256});onProgress(++done,records.length);
 }
 files['manifest.json']=strToU8(JSON.stringify(manifest));
 const blob=new Blob([zipSync(files,{level:0})],{type:'application/zip'});
 await inspectCompleteBackup(blob);return blob;
}
export async function inspectCompleteBackup(blob){
 if(blob.size>LIMIT+2*1024*1024)throw Error('The complete backup exceeds the supported size.');
 let expanded=0;const files=unzipSync(new Uint8Array(await blob.arrayBuffer()),{filter:f=>{expanded+=f.originalSize;if(expanded>LIMIT+2*1024*1024)throw Error('Backup entry is too large.');return true;}});
 if(Object.values(files).reduce((sum,v)=>sum+v.length,0)>LIMIT+2*1024*1024)throw Error('Backup contents exceed the supported size.');
 if(!files['manifest.json']||!files['notebook.json'])throw Error('The backup is incomplete.');
 const manifest=JSON.parse(strFromU8(files['manifest.json'])),text=strFromU8(files['notebook.json']);
 if(manifest.format!=='spino-complete-backup'||manifest.version!==1||!Array.isArray(manifest.recordings)||manifest.recordings.length>10000)throw Error('Unsupported complete backup.');
 const inspection=inspectBackup(text);if(inspection.backup.assets.some(a=>a.base64===undefined))throw Error('The complete backup contains unavailable scores.');if(await backupHash(text)!==manifest.notebookHash)throw Error('Notebook checksum mismatch.');
 const seen=new Set(),records=[];
 for(const row of manifest.recordings){if(!safe(row.id)||row.path!=='media/'+row.id||seen.has(row.id)||!files[row.path]||files[row.path].length!==row.bytes||! /^(audio|video)\//.test(row.mimeType))throw Error('Invalid or missing backup recording.');seen.add(row.id);const media=new Blob([files[row.path]],{type:row.mimeType});if(await mediaHash(media)!==row.sha256)throw Error('Recording checksum mismatch.');records.push({...row,blob:media,remoteOnly:false,cloud:undefined});}
 for(const event of inspection.backup.data.events||[])for(const id of event.recordingIds||[])if(!seen.has(id))throw Error('A linked recording is missing from the backup.');
 return {text:inspection.text,backup:inspection.backup,records,manifest};
}
export function dailyBackupDecision({enabled,principalId,deviceId,lastDate,lastHash,date,hash}){
 if(!enabled)return 'disabled';if(principalId!==deviceId)return 'secondary';if(lastHash===hash)return 'unchanged';if(lastDate===date)return 'today';return 'due';
}
export const retainedBackups=files=>[...files].filter(f=>f.appProperties?.complete==='1').sort((a,b)=>(b.appProperties.createdAt||'').localeCompare(a.appProperties.createdAt||'')||b.id.localeCompare(a.id)).slice(7);
