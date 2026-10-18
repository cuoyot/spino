import {Capacitor,registerPlugin} from '@capacitor/core';
import {ui} from './locale.js';
const MediaShare=registerPlugin('MediaShare');
const CHUNK=256*1024;
export function recordingFile(record) {
  const type=record.blob.type.split(';')[0].toLowerCase();
  const extension=({'audio/mp4':'m4a','video/mp4':'mp4','audio/wav':'wav','audio/x-wav':'wav','audio/ogg':'ogg','video/ogg':'ogv','audio/mpeg':'mp3','audio/webm':'webm','video/webm':'webm'})[type];
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
let sharing=false;
export async function shareRecording(record) {
  if(sharing)return 'busy';
  sharing=true;
  try {
    const file=recordingFile(record);
    if(Capacitor.getPlatform()==='android'){
      if(!Capacitor.isPluginAvailable('MediaShare'))throw Error('Native recording sharing unavailable');
      const result=await shareNativeRecording(file,MediaShare,{title:record.title||record.workTitle||'SPino',dialogTitle:ui('Share recording','Compartir grabación')});
      return result.cancelled?'cancelled':'shared';
    }
    if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:record.title||'SPino'});return 'shared';}
    const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);return 'downloaded';
  }catch(error){if(error.name==='AbortError'||error.code==='CANCELLED')return 'cancelled';throw error;}
  finally{sharing=false;}
}
