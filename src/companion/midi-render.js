export const pianoSampleKey=n=>`${Math.max(21,Math.min(108,n.midi))}-${n.velocity<60?40:n.velocity<100?80:120}`;

// Render on the audio sample clock before playback. UI stalls cannot move note attacks.
// Small offline segments bound the number of live audio nodes for long takes.
export async function renderMidiAudio(context,notes,buffers,durationMs,cancelled=()=>false) {
  const rate=context.sampleRate,frames=Math.max(1,Math.ceil((durationMs/1000+.2)*rate));
  const output=context.createBuffer(1,frames,rate),samples=output.getChannelData(0),segmentFrames=rate*20;
  let peak=0;
  for(let first=0;first<frames;first+=segmentFrames){
    if(cancelled())return null;
    const size=Math.min(segmentFrames,frames-first),start=first/rate,end=(first+size)/rate;
    const offline=new OfflineAudioContext(1,size,rate);
    for(const n of notes){
      const on=n.time/1000,off=on+n.duration,stop=off+.18;
      if(on>=end||stop<=start)continue;
      const key=pianoSampleKey(n),buffer=buffers.get(key),speed=2**((n.midi-Math.max(21,Math.min(108,n.midi)))/12);
      const offset=Math.max(0,start-on)*speed;
      if(!buffer||offset>=buffer.duration)continue;
      const source=offline.createBufferSource(),gain=offline.createGain(),volume=Math.min(1.5,n.velocity/Number(key.split('-')[1]));
      source.buffer=buffer;source.playbackRate.value=speed;
      const when=Math.max(0,on-start),release=Math.max(0,off-start);
      gain.gain.setValueAtTime(volume*(start>off?Math.max(0,(stop-start)/.18):1),when);
      if(off>=start)gain.gain.setValueAtTime(volume,release);
      gain.gain.linearRampToValueAtTime(0,stop-start);
      source.connect(gain).connect(offline.destination);source.start(when,offset);source.stop(stop-start);
    }
    const rendered=await offline.startRendering();if(cancelled())return null;
    const data=rendered.getChannelData(0);samples.set(data,first);
    for(let i=0;i<data.length;i++)peak=Math.max(peak,Math.abs(data[i]));
  }
  // Keep dense chords from clipping without changing relative dynamics or timing.
  if(peak>.95){const gain=.95/peak;for(let i=0;i<samples.length;i++)samples[i]*=gain;}
  return output;
}
