import {decodeMidi,midiNotes} from './midi-recording.js';
import {ui} from './locale.js';
import {renderMidiAudio,pianoSampleKey} from './midi-render.js';
import {scoreIcon} from './score-controls.js';
const stamp=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
export function mountMidiPlayer(host,blob,durationMs=0) {
  let context,disposed=false,playing=false,loading=false,position=0,origin=0,notes=[],duration=durationMs,timer,rendered,source,request=0;
  const buffers=new Map();
  const play=document.createElement('button'),seek=document.createElement('input'),label=document.createElement('span'),error=document.createElement('p');
  play.type='button';play.textContent=ui('Play','Reproducir');seek.type='range';seek.min=0;seek.max=duration;seek.value=0;seek.step=100;seek.setAttribute('aria-label',ui('Playback position','Posición de reproducción'));error.setAttribute('role','alert');
  host.append(play,seek,label,error);host.className='cp-midi-player';
  const key=pianoSampleKey;
  const update=()=>{seek.value=position;label.textContent=stamp(position)+' / '+stamp(duration);const name=loading?ui('Loading piano…','Cargando piano…'):playing?ui('Pause','Pausar'):ui('Play','Reproducir');const icon=playing?'pause':'play';if(play.dataset.icon!==icon){play.innerHTML=scoreIcon(icon);play.dataset.icon=icon;}play.setAttribute('aria-label',name);play.title=name;play.setAttribute('aria-busy',String(loading));};
  const silence=()=>{if(source){source.onended=null;try{source.stop();}catch{}source.disconnect();source=null;}};
  const pause=()=>{request++;if(playing)position=Math.max(0,Math.min(duration,(context.currentTime-origin)*1000));playing=false;clearInterval(timer);silence();update();};
  const tick=()=>{position=Math.max(0,Math.min(duration,(context.currentTime-origin)*1000));update();};
  play.onclick=async()=>{
    if(playing){pause();return;}if(loading)return;const attempt=++request;loading=true;play.disabled=true;update();error.textContent='';
    try{
      context ||= new (window.AudioContext||window.webkitAudioContext)({sampleRate:32000});await context.resume();
      if(!notes.length){const midi=decodeMidi(await blob.arrayBuffer());notes=midiNotes(midi.events,midi.durationMs);duration=midi.durationMs;seek.max=duration;}
      const pending=rendered?[]:[...new Set(notes.map(key))].filter(k=>!buffers.has(k));
      // Bound concurrent fetches and decoded memory to the notes used by this take.
      for(let i=0;i<pending.length;i+=4)await Promise.all(pending.slice(i,i+4).map(async k=>{const r=await fetch(import.meta.env.BASE_URL+'piano/'+k+'.mp3');if(!r.ok)throw Error('Piano unavailable');const buffer=await context.decodeAudioData(await r.arrayBuffer());if(!disposed)buffers.set(k,buffer);}));
      if(disposed)return;
      if(!rendered){rendered=await renderMidiAudio(context,notes,buffers,duration,()=>disposed);buffers.clear();}
      if(disposed)return;
      await context.resume();
      if(disposed||attempt!==request||document.hidden)return;if(position>=duration)position=0;
      source=context.createBufferSource();source.buffer=rendered;source.connect(context.destination);
      origin=context.currentTime+.05-position/1000;
      source.onended=()=>{playing=false;clearInterval(timer);source?.disconnect();source=null;position=0;update();};
      source.start(origin+position/1000,position/1000);
      playing=true;timer=setInterval(tick,40);
    }catch{if(!disposed)error.textContent=ui('Could not load the piano. Try again.','No se ha podido cargar el piano. Vuelve a intentarlo.');}
    finally{loading=false;if(!disposed){play.disabled=false;update();}}
  };
  seek.oninput=()=>{const next=Number(seek.value);pause();position=next;update();};
  const hidden=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',hidden);
  update();
  return {dispose(){disposed=true;pause();document.removeEventListener('visibilitychange',hidden);buffers.clear();rendered=null;void context?.close().catch(()=>{});}};
}
