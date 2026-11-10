import {Capacitor,registerPlugin} from '@capacitor/core';
import {exportRecording} from './media-bookends.js';
import {ui,getAppLanguage} from './locale.js';
import {exportChoice,exportProgress,waitForExportVisibility} from './media-export-ui.js';
import {waitForMediaOperation,assertMediaOperationActive} from './media-operation.js';
import {openMediaStore} from './media-store.js';
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
async function transferNativeFile(file,plugin,finish,onProgress=()=>{},signal) {
  assertMediaOperationActive(signal);
  const started=plugin.begin({name:file.name,mimeType:file.type,size:file.size});
  if(signal)void started.then(({token})=>{if(signal.aborted)void plugin.abort({token}).catch(()=>{});}).catch(()=>{});
  const {token}=await waitForMediaOperation(started,signal);
  try {
    for(let offset=0;offset<file.size;offset+=CHUNK){
      if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');
      const bytes=new Uint8Array(await file.slice(offset,offset+CHUNK).arrayBuffer());
      let binary='';for(let n=0;n<bytes.length;n+=8192)binary+=String.fromCharCode(...bytes.subarray(n,n+8192));
      await waitForMediaOperation(plugin.writeChunk({token,offset,base64:btoa(binary)}),signal);onProgress(Math.min(offset+CHUNK,file.size),file.size);
    }
    if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');
    return await waitForMediaOperation(finish(token),signal);
  }catch(error){void plugin.abort({token}).catch(()=>{});throw error;}
}
export const shareNativeRecording=(file,plugin,{title,dialogTitle,onProgress,signal,beforeShare=async()=>{}})=>transferNativeFile(file,plugin,async token=>{await beforeShare();assertMediaOperationActive(signal);return plugin.share({token,title,dialogTitle});},onProgress,signal);
export const saveNativeFile=(file,plugin)=>transferNativeFile(file,plugin,token=>plugin.save({token}));
export const saveAutomaticLocalBackup=(file,plugin,notebookId,onProgress=()=>{})=>transferNativeFile(file,plugin,token=>{onProgress({stage:'saving',completed:0,total:0});return plugin.saveAutomatic({token,notebookId});},(completed,total)=>onProgress({stage:'staging',completed,total}));
async function chooseMidiFormat(signal) {
  const dialog=document.createElement('dialog');dialog.className='cp-midi-export-dialog';dialog.dataset.mediaExport='true';
  const heading=document.createElement('h2');heading.textContent=ui('Share recording','Compartir grabación');dialog.append(heading);
  return await new Promise(resolve=>{
    let settled=false;const abort=()=>done(null);
    const done=value=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);dialog.close();dialog.remove();resolve(value);};
    for(const [format,label] of [['midi',ui('Original MIDI (.mid)','MIDI original (.mid)')],['wav',ui('Piano audio (.wav)','Audio de piano (.wav)')],['mp3',ui('Piano audio (.mp3)','Audio de piano (.mp3)')],['cancel',ui('Cancel','Cancelar')]]){
      const button=document.createElement('button');button.type='button';button.dataset.midiExport=format;button.textContent=label;button.onclick=()=>done(format==='cancel'?null:format);dialog.append(button);
    }
    dialog.addEventListener('cancel',event=>{event.preventDefault();done(null);});document.body.append(dialog);dialog.showModal();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  });
}
let preparedExport=null;
const exportKey=(record,options)=>JSON.stringify([record.id,record.mediaTakeId,record.blob.size,record.durationMs,options.format]);

async function withMediaStore(options,run) {
  const store=options.store||await openMediaStore();
  try {return await run(store);}finally {if(!options.store)store.close();}
}

export async function prepareSavedVideo(record,options={}) {
  if(record.kind!=='video')return {record,created:false};
  return withMediaStore(options,async store=>{
    assertMediaOperationActive(options.signal);
    const cached=await store.getPrepared(record);
    if(cached)return {record:{...record,...cached},created:false};
    const status=exportProgress(ui('Preparing and saving video…','Preparando y guardando vídeo…'),options.signal);
    try {
      await waitForExportVisibility(status.signal);
      const prepared=await waitForMediaOperation(exportRecording(record,{...options,signal:status.signal,onProgress:value=>{status.progress.value=value;options.onProgress?.(value);}}),status.signal);
      assertMediaOperationActive(status.signal);
      status.label.textContent=ui('Saving prepared video…','Guardando vídeo preparado…');
      await waitForMediaOperation(store.putPrepared(record,prepared),status.signal);
      assertMediaOperationActive(status.signal);
      return {record:prepared,created:true};
    }finally {status.close();}
  });
}

async function prepareRecording(record,options){
  if(record.kind==='video')return options.format==='original'?record:(await prepareSavedVideo(record,options)).record;
  if(record.kind!=='midi')return record;
  if(options.format==='midi'){
    const header=new Uint8Array(await record.blob.slice(0,4).arrayBuffer());
    if(String.fromCharCode(...header)!=='MThd')throw Error('Original MIDI data unavailable');
    return {...record,blob:new Blob([record.blob],{type:'audio/midi'})};
  }
  const key=exportKey(record,options);if(preparedExport?.key===key)return preparedExport.record;
  const status=exportProgress(ui('Preparing piano audio…','Preparando audio de piano…'),options.signal);
  status.progress.removeAttribute('value');
  try{
    const blob=await waitForMediaOperation(exportMidiAudio(record.blob,options.format,status.signal),status.signal);
    assertMediaOperationActive(status.signal);const prepared={...record,blob};
    preparedExport={key,record:prepared};return prepared;
  }finally{status.close();}
}

let sharing=false;
export async function shareRecording(record,options={}) {
  if(sharing)return 'busy';
  sharing=true;
  try {
    assertMediaOperationActive(options.signal);
    if(record.kind==='midi'){const format=options.format||await chooseMidiFormat(options.signal);if(!format)return 'cancelled';if(!['midi','wav','mp3'].includes(format))throw Error('Invalid MIDI export format');options={...options,format};}
    let video=null,newVideo=false;
    if(record.kind==='video') {
      video=await withMediaStore(options,async store=>{const cached=await store.getPrepared(record);return cached?{...record,...cached}:null;});
      if(options.format==='original')video=record;
      else if(!video){
        const format=options.format||await exportChoice(ui('Prepare video once','Preparar vídeo una vez'),[
          ['decorated',ui('Prepare and save video','Preparar y guardar vídeo'),ui('Saved on this device for future shares, including after restarting SPino.','Se guarda en este dispositivo para compartirlo después, incluso tras reiniciar SPino.')],
          ['original',ui('Share original · fast','Compartir original · rápido'),ui('Same quality. No title or closing added.','La misma calidad. Sin añadir título ni cierre.')]
        ],options.signal);
        if(!format)return 'cancelled';if(!['original','decorated'].includes(format))throw Error('Invalid video export format');options={...options,format};
        if(format==='original')video=record;
        else {const prepared=await prepareSavedVideo(record,options);video=prepared.record;newVideo=prepared.created;}
      }
    }
    const file=recordingFile(video||await waitForMediaOperation(prepareRecording(record,options),options.signal));
    assertMediaOperationActive(options.signal);
    if(newVideo||record.kind==='midi'&&options.format!=='midi') {
      await waitForExportVisibility(options.signal);
      const ready=await exportChoice(ui('Ready to share','Listo para compartir'),[['share',ui('Share saved file','Compartir archivo guardado'),ui('The prepared video is saved for future shares.','El vídeo preparado queda guardado para compartirlo de nuevo.')]],options.signal);
      if(!ready)return 'cancelled';
    }
    if(Capacitor.getPlatform()==='android'){
      if(!Capacitor.isPluginAvailable('MediaShare'))throw Error('Native recording sharing unavailable');
      const status=exportProgress(ui('Opening sharing for saved file…','Abriendo Compartir para el archivo guardado…'),options.signal);
      try {
        const result=await waitForMediaOperation(shareNativeRecording(file,MediaShare,{title:record.title||record.workTitle||'SPino',dialogTitle:ui('Share recording','Compartir grabación'),signal:status.signal,onProgress:(completed,total)=>{status.progress.value=Math.floor(completed/total*100);},beforeShare:async()=>{await waitForExportVisibility(status.signal);status.close();}}),options.signal);
        return result.cancelled?'cancelled':'shared';
      }finally{status.close();}
    }
    if(navigator.share&&navigator.canShare?.({files:[file]})){try{await waitForMediaOperation(navigator.share({files:[file],title:record.title||'SPino'}),options.signal);return 'shared';}catch(error){if(error.name!=='NotAllowedError')throw error;}}
    const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);return 'downloaded';
  }catch(error){if(error.name==='AbortError'||error.code==='CANCELLED')return 'cancelled';console.warn('Recording export failed',error);throw error;}
  finally{sharing=false;}
}
