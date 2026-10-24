import {Capacitor,registerPlugin} from '@capacitor/core';
import {exportRecording} from './media-bookends.js';
import {ui} from './locale.js';
import {exportMidiAudio} from './midi-export.js';
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
async function chooseMidiFormat() {
  const dialog=document.createElement('dialog');dialog.className='cp-midi-export-dialog';dialog.dataset.mediaExport='true';
  const heading=document.createElement('h2');heading.textContent=ui('Share recording','Compartir grabación');dialog.append(heading);
  return await new Promise(resolve=>{
    const done=value=>{dialog.close();dialog.remove();resolve(value);};
    for(const [format,label] of [['midi',ui('Original MIDI (.mid)','MIDI original (.mid)')],['wav',ui('Piano audio (.wav)','Audio de piano (.wav)')],['mp3',ui('Piano audio (.mp3)','Audio de piano (.mp3)')],['cancel',ui('Cancel','Cancelar')]]){
      const button=document.createElement('button');button.type='button';button.dataset.midiExport=format;button.textContent=label;button.onclick=()=>done(format==='cancel'?null:format);dialog.append(button);
    }
    dialog.addEventListener('cancel',event=>{event.preventDefault();done(null);});document.body.append(dialog);dialog.showModal();
  });
}
async function prepareRecording(record,options){
  const midi=record.kind==='midi';
  if(midi&&options.format==='midi'){
    const header=new Uint8Array(await record.blob.slice(0,4).arrayBuffer());
    if(String.fromCharCode(...header)!=='MThd')throw Error('Original MIDI data unavailable');
    return {...record,blob:new Blob([record.blob],{type:'audio/midi'})};
  }
  if(record.kind!=='video'&&!midi)return record;
  const controller=new AbortController(),dialog=document.createElement('dialog');dialog.dataset.mediaExport='true';
  const label=document.createElement('p'),progress=document.createElement('progress'),cancel=document.createElement('button');
  label.textContent=midi?ui('Preparing piano audio…','Preparando audio de piano…'):ui('Preparing video… Keep SPino open.','Preparando vídeo… Mantén SPino abierto.');progress.max=100;progress.value=0;
  cancel.textContent=ui('Cancel','Cancelar');cancel.type='button';cancel.onclick=()=>controller.abort();
  if(midi)progress.removeAttribute('value');dialog.append(label,progress,cancel);dialog.addEventListener('cancel',event=>{event.preventDefault();controller.abort();});
  const background=()=>{if(document.hidden)controller.abort();};document.addEventListener('visibilitychange',background);
  document.body.append(dialog);dialog.showModal();
  try{if(midi)return {...record,blob:await exportMidiAudio(record.blob,options.format,controller.signal)};return await exportRecording(record,{...options,signal:controller.signal,onProgress:value=>{progress.value=value;options.onProgress?.(value);}});}
  finally{document.removeEventListener('visibilitychange',background);dialog.close();dialog.remove();}
}
let sharing=false;
export async function shareRecording(record,options={}) {
  if(sharing)return 'busy';
  sharing=true;
  try {
    if(record.kind==='midi'){const format=options.format||await chooseMidiFormat();if(!format)return 'cancelled';if(!['midi','wav','mp3'].includes(format))throw Error('Invalid MIDI export format');options={...options,format};}
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
