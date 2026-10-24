import {decodeMidi,midiNotes} from './midi-recording.js';
import {renderMidiAudio,pianoSampleKey} from './midi-render.js';
export function midiWav(buffer) {
  const samples=buffer.getChannelData(0),bytes=new ArrayBuffer(44+samples.length*2),view=new DataView(bytes);
  const text=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,36+samples.length*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++){const value=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,Math.round(value*(value<0?32768:32767)),true);}
  return new Blob([bytes],{type:'audio/wav'});
}
export async function exportMidiAudio(blob,format,signal) {
  const context=new (window.AudioContext||window.webkitAudioContext)({sampleRate:32000});
  const check=()=>{if(signal?.aborted)throw new DOMException('Cancelled','AbortError');};
  try{
    const midi=decodeMidi(await blob.arrayBuffer()),notes=midiNotes(midi.events,midi.durationMs),buffers=new Map(),keys=[...new Set(notes.map(pianoSampleKey))];
    for(let i=0;i<keys.length;i+=4){check();await Promise.all(keys.slice(i,i+4).map(async key=>{const response=await fetch(import.meta.env.BASE_URL+'piano/'+key+'.mp3',{signal});if(!response.ok)throw Error('Piano unavailable');buffers.set(key,await context.decodeAudioData(await response.arrayBuffer()));}));}
    check();const audio=await renderMidiAudio(context,notes,buffers,midi.durationMs,()=>signal?.aborted);check();return format==='mp3'?await midiMp3(audio,signal):midiWav(audio);
  }finally{await context.close();}
}

export async function midiMp3(buffer,signal) {
  const {Mp3Encoder}=await import('@breezystack/lamejs');
  const encoder=new Mp3Encoder(1,buffer.sampleRate,128),samples=buffer.getChannelData(0),parts=[];
  for(let offset=0;offset<samples.length;offset+=1152){
    if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
    const block=new Int16Array(Math.min(1152,samples.length-offset));
    for(let i=0;i<block.length;i++){const value=Math.max(-1,Math.min(1,samples[offset+i]));block[i]=Math.round(value*(value<0?32768:32767));}
    const encoded=encoder.encodeBuffer(block);if(encoded.length)parts.push(new Uint8Array(encoded));
    if(offset%(1152*32)===0)await new Promise(resolve=>setTimeout(resolve,0));
  }
  const last=encoder.flush();if(last.length)parts.push(new Uint8Array(last));
  return new Blob(parts,{type:'audio/mpeg'});
}
