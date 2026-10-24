import {gzipSync,Gunzip,strToU8,strFromU8} from 'fflate';
import {backupHash} from './cloud-backup.js';
import {stableJSON} from './cloud-merge.js';
import {atomicFailure,hashPattern} from './atomic-notebook.js';
const LIMIT=16*1024*1024;
const encode=bytes=>{let value='';for(let n=0;n<bytes.length;n+=8192)value+=String.fromCharCode(...bytes.subarray(n,n+8192));return btoa(value);};
export function packCheckpoint(objects){
 const text=stableJSON(Object.fromEntries(objects));if(strToU8(text).length>LIMIT)return null;
 const value=encode(gzipSync(strToU8(text)));
 return value.length<900000?{kind:'notebook-checkpoint-v1',value}:null;
}
async function decodeCheckpoint(value){
 if(value?.kind!=='notebook-checkpoint-v1'||typeof value.value!=='string'||value.value.length>900000)throw atomicFailure('Invalid notebook checkpoint.','INTEGRITY');
 let size=0;const chunks=[],decoder=new Gunzip(chunk=>{size+=chunk.length;if(size>LIMIT)throw atomicFailure('Notebook checkpoint exceeds the limit.','LIMIT');chunks.push(chunk);});
 decoder.push(Uint8Array.from(atob(value.value),v=>v.charCodeAt(0)),true);
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const objects=JSON.parse(strFromU8(bytes));if(!objects||Array.isArray(objects)||typeof objects!=='object'||Object.keys(objects).length>100000)throw atomicFailure('Invalid notebook checkpoint.','INTEGRITY');
 for(const [hash,object] of Object.entries(objects)){if(!hashPattern.test(hash)||object?.kind==='score-bytes'||await backupHash(stableJSON(object))!==hash)throw atomicFailure('Notebook checkpoint integrity check failed.','INTEGRITY');}
 return new Map(Object.entries(objects));
}

export async function unpackCheckpoint(value){try{return await decodeCheckpoint(value);}catch(error){if(error.code==='LIMIT'||error.code==='INTEGRITY')throw error;throw atomicFailure('Invalid notebook checkpoint.','INTEGRITY');}}
