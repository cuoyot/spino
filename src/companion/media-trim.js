import {Capacitor,registerPlugin} from '@capacitor/core';
const native=registerPlugin('MediaTrim');
const LIMIT=250*1024*1024,CHUNK=256*1024;
export function trimRange(durationMs,startMs,endMs){
  if(![durationMs,startMs,endMs].every(Number.isFinite)||durationMs<=0||startMs<0||endMs>durationMs+1||endMs-startMs<200)throw Error('Choose a recording segment of at least 0.2 seconds.');
  return {startMs:Math.round(startMs),endMs:Math.round(Math.min(durationMs,endMs)),durationMs:Math.round(endMs-startMs)};
}
export function trimmedRecording(record,blob,range,title){
  if(!(blob instanceof Blob)||!blob.size||blob.size>LIMIT||!blob.type.startsWith(record.kind+'/'))throw Error('The trimmed recording is empty or too large.');
  const {cloud,installation,...original}=record;
  return {...original,mediaTakeId:crypto.randomUUID(),title,blob,durationMs:range.durationMs,draft:false,trimmedFrom:record.id};
}
export async function trimNativeRecording(record,range,{signal,onProgress=()=>{}},plugin=native,read=async path=>{
  const response=await fetch(Capacitor.convertFileSrc(path));if(!response.ok)throw Error('Could not read the trimmed recording.');return response.blob();
}){
  let token,poll;
  const cancelled=()=>{if(signal?.aborted)throw new DOMException('Trim cancelled.','AbortError');};
  const cancel=()=>{if(token)void plugin.cancel({token}).catch(()=>{});};
  signal?.addEventListener('abort',cancel,{once:true});
  try{
    cancelled();({token}=await plugin.begin({size:record.blob.size,kind:record.kind}));cancelled();
    for(let offset=0;offset<record.blob.size;offset+=CHUNK){
      cancelled();const bytes=new Uint8Array(await record.blob.slice(offset,offset+CHUNK).arrayBuffer());let binary='';
      for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      await plugin.writeChunk({token,offset,base64:btoa(binary)});onProgress(Math.floor((offset+bytes.length)/record.blob.size*10));
    }
    cancelled();poll=setInterval(()=>{void plugin.progress({token}).then(r=>onProgress(10+Math.floor((r.percent||0)*.85))).catch(()=>{});},400);
    const result=await plugin.trim({token,startMs:range.startMs,endMs:range.endMs});cancelled();
    const blob=new Blob([await read(result.path)],{type:result.mimeType});cancelled();
    if(blob.size!==result.bytes||blob.size>LIMIT||!blob.size)throw Error('Could not verify the trimmed recording.');
    onProgress(100);return blob;
  }catch(error){cancelled();throw error;}finally{clearInterval(poll);signal?.removeEventListener('abort',cancel);if(token)await plugin.cancel({token}).catch(()=>{});}
}
export async function trimRecording(record,startMs,endMs,options={}){
  const range=trimRange(record.durationMs,startMs,endMs);
  if(Capacitor.getPlatform()==='android'&&Capacitor.isPluginAvailable('MediaTrim'))return trimNativeRecording(record,range,options);
  const {trimBrowserRecording}=await import('./media-trim-browser.js');
  return trimBrowserRecording(record,range,options);
}
