import {Capacitor,registerPlugin} from '@capacitor/core';
import {exportRecording} from './media-bookends.js';
import {ui} from './locale.js';
const MediaShare=registerPlugin('MediaShare');
const CHUNK=256*1024;
export function recordingFile(record) {
  const type=record.blob.type.split(';')[0].toLowerCase();
  const extension=({'audio/midi':'mid','audio/mp4':'m4a','video/mp4':'mp4','audio/wav':'wav','audio/x-wav':'wav','audio/ogg':'ogg','video/ogg':'ogv','audio/mpeg':'mp3','audio/webm':'webm','video/webm':'webm'})[type];
  if(!extension||!record.blob.size)throw Error('Invalid recording');
  const title=(record.title||record.workTitle||'SPino').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-').replace(/[. ]+$/,'').trim().slice(0,120)||'SPino';
  const date=/^\d{4}-\d{2}-\d{2}/.exec(record.createdAt||'')?.[0];
  return new File([record.blob],title+(date?' · '+date:'')+'.'+extension,{type});
}
export async function shareNativeRecording(file,plugin,{title,dialogTitle}) {
  const {token}=await plugin.begin({name:file.name,mimeType:file.type,size:file.size});
  try {
    for(let offset=0;offset<file.size;offset+=CHUNK){
      const bytes=new Uint8Array(await file.slice(offset,offset+CHUNK).arrayBuffer());
      let binary='';for(let n=0;n<bytes.length;n+=8192)binary+=String.fromCharCode(...bytes.subarray(n,n+8192));
      await plugin.writeChunk({token,offset,base64:btoa(binary)});
    }
    return await plugin.share({token,title,dialogTitle});
  }catch(error){await plugin.abort({token}).catch(()=>{});throw error;}
}
async function prepareRecording(record,options){
  if(record.kind!=='video')return record;
  const controller=new AbortController(),dialog=document.createElement('dialog');
  const label=document.createElement('p'),progress=document.createElement('progress'),cancel=document.createElement('button');
  label.textContent=ui('Preparing video… Keep SPino open.','Preparando vídeo… Mantén SPino abierto.');progress.max=100;progress.value=0;
  cancel.textContent=ui('Cancel','Cancelar');cancel.type='button';cancel.onclick=()=>controller.abort();
  dialog.append(label,progress,cancel);dialog.addEventListener('cancel',event=>{event.preventDefault();controller.abort();});
  const background=()=>{if(document.hidden)controller.abort();};document.addEventListener('visibilitychange',background);
  document.body.append(dialog);dialog.showModal();
  try{return await exportRecording(record,{...options,signal:controller.signal,onProgress:value=>{progress.value=value;options.onProgress?.(value);}});}
  finally{document.removeEventListener('visibilitychange',background);dialog.close();dialog.remove();}
}
let sharing=false;
export async function shareRecording(record,options={}) {
  if(sharing)return 'busy';
  sharing=true;
  try {
    const file=recordingFile(await prepareRecording(record,options));
    if(Capacitor.getPlatform()==='android'){
      if(!Capacitor.isPluginAvailable('MediaShare'))throw Error('Native recording sharing unavailable');
      const result=await shareNativeRecording(file,MediaShare,{title:record.title||record.workTitle||'SPino',dialogTitle:ui('Share recording','Compartir grabación')});
      return result.cancelled?'cancelled':'shared';
    }
    if(navigator.share&&navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:record.title||'SPino'});return 'shared';}catch(error){if(error.name!=='NotAllowedError')throw error;}}
    const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);return 'downloaded';
  }catch(error){if(error.name==='AbortError'||error.code==='CANCELLED')return 'cancelled';console.warn('Recording export failed',error);throw error;}
  finally{sharing=false;}
}
