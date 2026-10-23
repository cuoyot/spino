import {decodeMidi,midiNotes} from './midi-recording.js';
import {ui} from './locale.js';
const stamp=ms=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
export function mountMidiPlayer(host,blob,durationMs=0) {
  let context,disposed=false,playing=false,loading=false,position=0,origin=0,index=0,notes=[],duration=durationMs,timer;
  const buffers=new Map(),voices=new Set();
  const play=document.createElement('button'),seek=document.createElement('input'),label=document.createElement('span'),error=document.createElement('p');
  play.type='button';play.textContent=ui('Play','Reproducir');seek.type='range';seek.min=0;seek.max=duration;seek.value=0;seek.step=100;seek.setAttribute('aria-label',ui('Playback position','Posición de reproducción'));error.setAttribute('role','alert');
  host.append(play,seek,label,error);host.className='cp-midi-player';
  const key=n=>`${Math.max(21,Math.min(108,n.midi))}-${n.velocity<60?40:n.velocity<100?80:120}`;
  const update=()=>{seek.value=position;label.textContent=stamp(position)+' / '+stamp(duration);play.textContent=playing?ui('Pause','Pausar'):ui('Play','Reproducir');};
  const silence=()=>{for(const source of voices){try{source.stop();}catch{}}voices.clear();};
  const pause=()=>{if(playing)position=Math.min(duration,(context.currentTime-origin)*1000);playing=false;clearInterval(timer);silence();update();};
  const sound=n=>{
    const start=n.time/1000,end=start+n.duration,offset=Math.max(0,position/1000-start);
    if(offset>=n.duration)return;
    const source=context.createBufferSource(),gain=context.createGain(),sample=key(n),layer=Number(sample.split('-')[1]);
    source.buffer=buffers.get(sample);source.playbackRate.value=2**((n.midi-Math.max(21,Math.min(108,n.midi)))/12);
    const when=Math.max(context.currentTime,origin+start),off=Math.max(when+.01,origin+end),volume=Math.min(1.5,n.velocity/layer);
    gain.gain.setValueAtTime(volume,when);gain.gain.setValueAtTime(volume,off);gain.gain.linearRampToValueAtTime(0,off+.18);
    source.connect(gain).connect(context.destination);source.onended=()=>{voices.delete(source);source.disconnect();gain.disconnect();};voices.add(source);
    source.start(when,offset*source.playbackRate.value);source.stop(off+.2);
  };
  const tick=()=>{position=Math.min(duration,(context.currentTime-origin)*1000);while(index<notes.length&&notes[index].time<position+120)sound(notes[index++]);update();if(position>=duration){pause();position=0;update();}};
  play.onclick=async()=>{
    if(playing){pause();return;}if(loading)return;loading=true;play.disabled=true;play.textContent=ui('Loading piano…','Cargando piano…');error.textContent='';
    try{
      context ||= new (window.AudioContext||window.webkitAudioContext)({sampleRate:32000});await context.resume();
      if(!notes.length){const midi=decodeMidi(await blob.arrayBuffer());notes=midiNotes(midi.events,midi.durationMs);duration=midi.durationMs;seek.max=duration;}
      const pending=[...new Set(notes.map(key))].filter(k=>!buffers.has(k));
      // Bound concurrent fetches and decoded memory to the notes used by this take.
      for(let i=0;i<pending.length;i+=4)await Promise.all(pending.slice(i,i+4).map(async k=>{const r=await fetch(import.meta.env.BASE_URL+'piano/'+k+'.mp3');if(!r.ok)throw Error('Piano unavailable');const buffer=await context.decodeAudioData(await r.arrayBuffer());if(!disposed)buffers.set(k,buffer);}));
      if(disposed)return;if(position>=duration)position=0;origin=context.currentTime-position/1000;index=0;
      while(index<notes.length&&notes[index].time<position){const note=notes[index++];if(note.time+note.duration*1000>position)sound(note);}
      playing=true;tick();timer=setInterval(tick,40);
    }catch{if(!disposed)error.textContent=ui('Could not load the piano. Try again.','No se ha podido cargar el piano. Vuelve a intentarlo.');}
    finally{loading=false;if(!disposed){play.disabled=false;update();}}
  };
  seek.oninput=()=>{const next=Number(seek.value);pause();position=next;update();};
  const hidden=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',hidden);
  update();
  return {dispose(){disposed=true;pause();document.removeEventListener('visibilitychange',hidden);buffers.clear();void context?.close().catch(()=>{});}};
}
