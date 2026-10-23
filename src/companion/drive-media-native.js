import {Capacitor,registerPlugin} from '@capacitor/core';
import {createDriveMedia,DRIVE_CHUNK} from './drive-media.js';
const native=registerPlugin('DriveMedia');
export const driveNativeAvailable=()=>Capacitor.getPlatform()==='android'&&Capacitor.isPluginAvailable('DriveMedia');
const base64 = bytes => {let s='';for(const v of bytes)s+=String.fromCharCode(v);return btoa(s);};
export async function connectDriveMedia({notebookId,accountId,wifiOnly=true}){
  await native.useNotebookAccount({accountId,wifiOnly});
  const staged=new WeakMap();
  const hashBlob=async blob=>{
    const key=crypto.randomUUID();let result;
    try{for(let offset=0;offset<blob.size;offset+=DRIVE_CHUNK){
      result=await native.stageChunk({key,offset,total:blob.size,base64:base64(new Uint8Array(await blob.slice(offset,offset+DRIVE_CHUNK).arrayBuffer()))});
    }
    }catch(error){await native.release({stage:key}).catch(()=>{});throw error;}
    staged.set(blob,result.sha256);return result.sha256;
  };
  const request=async options=>{
    const {body,...rest}=options;
    const response=await native.request({...rest,...(body?{fileKey:body.fileKey,offset:body.offset,length:body.length}:{})});
    return response;
  };
  const state={get:async key=>(await native.readState({key})).value||null,set:async(key,value)=>native.writeState({key,value})};
  const client=createDriveMedia({request,state,accountId,notebookId,hashBlob,readChunk:async(blob,start,end)=>({fileKey:staged.get(blob),offset:start,length:end-start}),downloadFile:async options=>{
    const downloaded=await native.download(options);
    try{const response=await fetch(Capacitor.convertFileSrc(downloaded.path));if(!response.ok)throw Error('Could not open the downloaded recording.');const blob=new Blob([await response.blob()],{type:options.mimeType});if(blob.size!==options.bytes||downloaded.sha256!==options.sha256)throw Error('Downloaded recording failed verification.');return {blob,verified:true,cleanup:()=>native.release({sha256:options.sha256})};}
    catch(error){await native.release({sha256:options.sha256}).catch(()=>{});throw error;}
  }});
  return {...client,repairFormat:async options=>{try{return await client.repairFormat(options);}finally{const sha256=staged.get(options.blob);if(sha256)await native.release({sha256}).catch(()=>{});}},upload:async options=>{try{return await client.upload(options);}finally{const sha256=staged.get(options.blob);if(sha256)await native.release({sha256}).catch(()=>{});}}};
}

export const pauseDriveMedia=()=>native.pause();
