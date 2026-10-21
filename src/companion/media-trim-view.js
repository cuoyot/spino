import {ui} from './locale.js';
import {trimRange,trimRecording,trimmedRecording} from './media-trim.js';
const clock=ms=>`${Math.floor(ms/60000)}:${(ms/1000%60).toFixed(1).padStart(4,'0')}`;
export function createTrimEditor({panel,record,store,changed,setBusy,onSaved,trim=trimRecording}) {
  const player=panel.querySelector('audio,video'),editor=document.createElement('section');
  editor.className='cp-media-trim';
  const hidden=[...panel.querySelectorAll('.cp-media-title,.cp-media-viewer-actions')];
  const displays=hidden.map(el=>el.style.display);hidden.forEach(el=>el.style.display='none');player.pause();
  let startMs=0,endMs=record.durationMs,controller=null,frame=null,destroyed=false;
  const controls={};
  for(const [key,label] of [['start',ui('Start','Inicio')],['end',ui('End','Final')]]){
    const row=document.createElement('label'),caption=document.createElement('span'),value=document.createElement('output'),input=document.createElement('input'),current=document.createElement('button');
    caption.textContent=label;input.type='range';input.min=0;input.max=record.durationMs;input.step=100;input.value=key==='start'?0:record.durationMs;input.setAttribute('aria-label',label);
    current.type='button';current.textContent=ui('Use current position','Usar posición actual');
    row.append(caption,value,input,current);editor.append(row);controls[key]={input,value,current};
    const update=ms=>{stopPreview();if(key==='start')startMs=Math.max(0,Math.min(endMs-200,ms));else endMs=Math.min(record.durationMs,Math.max(startMs+200,ms));refresh();player.currentTime=(key==='start'?startMs:endMs)/1000;};
    input.addEventListener('input',()=>update(Number(input.value)));current.addEventListener('click',()=>update(Math.round(player.currentTime*1000)));
  }
  const duration=document.createElement('p'),note=document.createElement('p'),status=document.createElement('p'),progress=document.createElement('progress'),actions=document.createElement('div');
  note.textContent=ui('Saving replaces this recording with the selected segment.','Al guardar, esta grabación se sustituye por el fragmento seleccionado.');status.setAttribute('role','status');progress.max=100;progress.hidden=true;actions.className='cp-actions';
  const preview=document.createElement('button'),save=document.createElement('button'),cancel=document.createElement('button');
  for(const button of [preview,save,cancel])button.type='button';
  preview.textContent=ui('Preview selection','Previsualizar selección');save.textContent=ui('Save trim','Guardar recorte');save.className='primary';cancel.textContent=ui('Cancel','Cancelar');
  actions.append(preview,save,cancel);editor.append(duration,note,progress,status,actions);panel.append(editor);
  function refresh(){controls.start.input.value=startMs;controls.end.input.value=endMs;controls.start.value.textContent=clock(startMs);controls.end.value.textContent=clock(endMs);duration.textContent=ui('Selected duration','Duración seleccionada')+': '+clock(endMs-startMs);}
  function stopPreview(){cancelAnimationFrame(frame);frame=null;player.pause();}
  function dispose(){if(destroyed)return;destroyed=true;controller?.abort();stopPreview();player.controls=true;hidden.forEach((el,i)=>el.style.display=displays[i]);editor.remove();panel.querySelector('[data-media=trim]')?.focus();}
  preview.addEventListener('click',async()=>{stopPreview();player.currentTime=startMs/1000;try{await player.play();const tick=()=>{if(destroyed)return;if(player.currentTime*1000>=endMs||player.ended){stopPreview();return;}frame=requestAnimationFrame(tick);};tick();}catch{status.textContent=ui('Could not preview the recording.','No se ha podido previsualizar la grabación.');}});
  save.addEventListener('click',async()=>{
    stopPreview();controller=new AbortController();setBusy(true);player.controls=false;editor.querySelectorAll('input,button').forEach(el=>el.disabled=el!==cancel);progress.hidden=false;progress.value=0;status.textContent=ui('Trimming recording…','Recortando grabación…');
    let copy;
    try{
      const range=trimRange(record.durationMs,startMs,endMs),blob=await trim(record,startMs,endMs,{signal:controller.signal,onProgress:value=>progress.value=value});
      if(controller.signal.aborted)throw new DOMException('Cancelled','AbortError');
      const candidate=trimmedRecording(record,blob,range,record.title);await store.replaceTrim(candidate,record.mediaTakeId||record.id);copy=candidate;
    }catch(error){status.textContent=error.name==='AbortError'?ui('Trim cancelled.','Recorte cancelado.'):ui('Could not save the trim. The original recording is kept.','No se ha podido guardar el recorte. Se conserva la grabación original.');}
    finally{controller=null;setBusy(false);player.controls=true;progress.hidden=true;editor.querySelectorAll('input,button').forEach(el=>el.disabled=false);}
    if(copy){dispose();await onSaved(copy);await changed();}
  });
  cancel.addEventListener('click',()=>{if(controller)controller.abort();else dispose();});refresh();controls.start.input.focus();
  return {dispose,get active(){return !destroyed;},cancel:()=>controller?.abort()};
}
