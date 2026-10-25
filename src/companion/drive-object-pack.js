import {gzipSync,Gunzip,strToU8,strFromU8} from 'fflate';
import {backupHash} from './cloud-backup.js';
import {stableJSON} from './cloud-merge.js';
import {atomicFailure,hashPattern,ATOMIC_FORMAT} from './atomic-notebook.js';

export const PACK_KIND='notebook-object-pack-v1',INDEX_KIND='notebook-pack-index-v1';
export const PACK_LIMIT=2*1024*1024,ENCODED_LIMIT=900000,SEGMENT_LIMIT=512;
const fail=()=>atomicFailure('Invalid optional notebook pack.','INTEGRITY');
const encode=bytes=>{let value='';for(let n=0;n<bytes.length;n+=8192)value+=String.fromCharCode(...bytes.subarray(n,n+8192));return btoa(value);};
const scoped=(value,scope)=>value?.rootId===scope.rootId&&value?.notebookId===scope.notebookId;
const supported=value=>value?.format===ATOMIC_FORMAT||['record-changes','large-record-part'].includes(value?.kind);

function pack(records,scope){
  const text=stableJSON({rootId:scope.rootId,notebookId:scope.notebookId,objects:Object.fromEntries(records)});
  if(strToU8(text).length>PACK_LIMIT)return null;
  const value=encode(gzipSync(strToU8(text)));
  return value.length<=ENCODED_LIMIT?{kind:PACK_KIND,rootId:scope.rootId,notebookId:scope.notebookId,value}:null;
}

// Existing complete segments are reused by the caller; only newly covered objects are packed.
export function buildObjectPacks(records,scope){
  const result=[];let batch=[],size=0;
  const flush=values=>{if(!values.length)return;const value=pack(values,scope);if(value){result.push({value,count:values.length});return;}if(values.length>1){const mid=Math.floor(values.length/2);flush(values.slice(0,mid));flush(values.slice(mid));}};
  for(const entry of records){
    const bytes=strToU8(stableJSON(entry)).length;
    if(batch.length&&(size+bytes>PACK_LIMIT-2048||batch.length>=2048)){flush(batch);batch=[];size=0;}
    batch.push(entry);size+=bytes;
  }
  flush(batch);return result;
}

export async function unpackObjectPack(value,scope){
  try{
    if(value?.kind!==PACK_KIND||!scoped(value,scope)||typeof value.value!=='string'||value.value.length>ENCODED_LIMIT)throw fail();
    let size=0;const chunks=[],decoder=new Gunzip(chunk=>{size+=chunk.length;if(size>PACK_LIMIT)throw atomicFailure('Notebook pack exceeds its expanded limit.','LIMIT');chunks.push(chunk);});
    decoder.push(Uint8Array.from(atob(value.value),v=>v.charCodeAt(0)),true);
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const decoded=JSON.parse(strFromU8(bytes));
    if(!scoped(decoded,scope)||!decoded.objects||typeof decoded.objects!=='object'||Array.isArray(decoded.objects))throw fail();
    const records=Object.entries(decoded.objects);if(!records.length||records.length>2048)throw fail();
    for(const [hash,record] of records){
      if(!hashPattern.test(hash)||!record||!supported(record.value)||!/^[-\w]{1,180}$/.test(record.id)||!/^\d{1,30}$/.test(record.version)||!Number.isSafeInteger(record.size)||record.size<1||record.size>1048576)throw fail();
      const text=stableJSON(record.value);
      if(strToU8(text).length!==record.size||await backupHash(text)!==hash)throw fail();
      if(record.value.format===ATOMIC_FORMAT&&!scoped(record.value,scope))throw fail();
    }
    return new Map(records);
  }catch(error){if(['LIMIT','INTEGRITY'].includes(error.code))throw error;throw fail();}
}

export function validatePackIndex(value,scope){
  if(value?.kind!==INDEX_KIND||!scoped(value,scope)||!Number.isSafeInteger(value.commitCount)||value.commitCount<1||!Array.isArray(value.segments)||!value.segments.length||value.segments.length>SEGMENT_LIMIT)throw fail();
  const seen=new Set();let count=0;
  for(const segment of value.segments){if(!hashPattern.test(segment?.hash)||seen.has(segment.hash)||!Number.isSafeInteger(segment.count)||segment.count<1||segment.count>2048)throw fail();seen.add(segment.hash);count+=segment.count;}
  if(value.objectCount!==count)throw fail();
  return value;
}
