import {Capacitor,registerPlugin} from '@capacitor/core';
import {createDriveMedia,DRIVE_CHUNK} from './drive-media.js';
const native=registerPlugin('DriveMedia');
export const driveNativeAvailable=()=>Capacitor.getPlatform()==='android'&&Capacitor.isPluginAvailable('DriveMedia');
const base64 = bytes => {let s='';for(const v of bytes)s+=String.fromCharCode(v);return btoa(s);};
export async function connectDriveReview(notebookId){
  const account=await native.connect();
  const staged=new WeakMap();
  const hashBlob=async blob=>{
    const key=crypto.randomUUID();let result;
    for(let offset=0;offset<blob.size;offset+=DRIVE_CHUNK){
      result=await native.stageChunk({key,offset,total:blob.size,base64:base64(new Uint8Array(await blob.slice(offset,offset+DRIVE_CHUNK).arrayBuffer()))});
    }
    staged.set(blob,result.sha256);return result.sha256;
  };
  const request=async options=>{
    const {body,...rest}=options;
    const response=await native.request({...rest,...(body?{fileKey:body.fileKey,offset:body.offset,length:body.length}:{})});
    return response;
  };
  const state={get:async key=>(await native.readState({key})).value||null,set:async(key,value)=>native.writeState({key,value})};
  return {account,client:createDriveMedia({request,state,accountId:account.id,notebookId,hashBlob,readChunk:async(blob,start,end)=>({fileKey:staged.get(blob),offset:start,length:end-start}),downloadFile:options=>native.download(options)})};
}
