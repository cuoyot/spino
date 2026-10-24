import {Capacitor,registerPlugin} from '@capacitor/core';
import {mediaHash} from './drive-media.js';
const native=registerPlugin('DriveMedia'),API='https://www.googleapis.com/drive/v3/files',CHUNK=256*1024;
const expect=r=>{if(r.status<200||r.status>=300)throw Error('The Drive backup transfer failed.');return r;};
export async function uploadArchive({blob,accountId,folderId,name,properties,fileId,wifiOnly}){
 await native.useNotebookAccount({accountId,wifiOnly});const key=crypto.randomUUID();let staged;
 try{
  for(let offset=0;offset<blob.size;offset+=CHUNK){const bytes=new Uint8Array(await blob.slice(offset,offset+CHUNK).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));staged=await native.stageChunk({key,offset,total:blob.size,base64:btoa(binary)});}
  const sha256=staged.sha256;
  const start=expect(await native.request({accountId,url:'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',method:'POST',headers:{'X-Upload-Content-Type':'application/zip','X-Upload-Content-Length':String(blob.size)},json:{id:fileId,name,mimeType:'application/zip',parents:[folderId],appProperties:{...properties,sha256,complete:'0'}}}));
  const url=start.headers?.location;if(!url)throw Error('Drive did not start the backup upload.');
  for(let offset=0;offset<blob.size;offset+=CHUNK){const length=Math.min(CHUNK,blob.size-offset),r=await native.request({accountId,url,method:'PUT',headers:{'Content-Type':'application/zip','Content-Range':`bytes ${offset}-${offset+length-1}/${blob.size}`},fileKey:sha256,offset,length});if(offset+length<blob.size?r.status!==308:![200,201].includes(r.status))throw Error('The backup upload was interrupted.');}
  const meta=expect(await native.request({accountId,url:API+'/'+fileId+'?fields=id,size,sha256Checksum,appProperties'})).json;
  if(Number(meta.size)!==blob.size)throw Error('The uploaded backup size differs.');
  if(meta.sha256Checksum){if(meta.sha256Checksum!==sha256)throw Error('The uploaded backup checksum differs.');}
  else {const result=await native.download({accountId,fileId,bytes:blob.size,sha256,mimeType:'application/zip'});if(result.sha256!==sha256)throw Error('The backup could not be verified.');}
  return {fileId,sha256};
 }finally{if(staged?.sha256)await native.release({sha256:staged.sha256});else await native.release({stage:key});}
}
export async function downloadArchive({accountId,file,wifiOnly=false}){
 await native.useNotebookAccount({accountId,wifiOnly});const sha256=file.sha256Checksum||file.appProperties.sha256;
 const result=await native.download({accountId,fileId:file.id,bytes:Number(file.size),sha256,mimeType:'application/zip'});
 try{const response=await fetch(Capacitor.convertFileSrc(result.path));if(!response.ok)throw Error('Could not open downloaded backup.');const blob=new Blob([await response.blob()],{type:'application/zip'});if(await mediaHash(blob)!==sha256)throw Error('Backup checksum mismatch.');return blob;}finally{await native.release({sha256});}
}
