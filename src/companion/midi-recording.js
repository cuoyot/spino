// Standard MIDI file, format 0. At 500 ticks/quarter and 120 BPM one tick is 1 ms.
const vlq = value => { const bytes=[value & 127]; while ((value=Math.floor(value/128))) bytes.unshift((value&127)|128); return bytes; };
const word = n => [n>>>24&255,n>>>16&255,n>>>8&255,n&255];
export function encodeMidi(events, durationMs) {
  const track=[0,255,81,3,7,161,32];
  for(let channel=0;channel<16;channel++)track.push(0,192|channel,0);
  let previous=0;
  for(const event of [...events].sort((a,b)=>a.time-b.time)){
    const tick=Math.max(previous,Math.round(event.time));
    if(!Number.isFinite(tick)||tick>900000||!Array.isArray(event.data)||event.data.length!==3||![128,144,176].includes(event.data[0]&240)||event.data.slice(1).some(n=>!Number.isInteger(n)||n<0||n>127))throw Error('Invalid MIDI event');
    track.push(...vlq(tick-previous),...event.data);previous=tick;
  }
  const end=Math.max(previous,Math.min(900000,Math.round(durationMs)));
  // Release held notes and pedals even when recording ends during a chord.
  for(let channel=0;channel<16;channel++){track.push(...vlq(end-previous),176|channel,64,0,0,176|channel,123,0);previous=end;}
  track.push(0,255,47,0);
  return new Blob([new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,244,77,84,114,107,...word(track.length)]),new Uint8Array(track)],{type:'audio/midi'});
}
export function decodeMidi(buffer) {
  const bytes=new Uint8Array(buffer),view=new DataView(buffer);let p=0;
  const invalid=()=>{throw Error('Invalid MIDI recording');};
  const read=()=>p<bytes.length?bytes[p++]:invalid();
  const text=()=>String.fromCharCode(read(),read(),read(),read());
  const length=()=>{if(p+4>bytes.length)invalid();const n=view.getUint32(p);p+=4;return n;};
  const variable=()=>{let n=0;for(let i=0;i<4;i++){const b=read();n=n*128+(b&127);if(!(b&128))return n;}return invalid();};
  if(text()!=='MThd'||length()!==6||view.getUint16(p)!==0||view.getUint16(p+2)!==1)invalid();
  const division=view.getUint16(p+4);p+=6;if(!division||division&32768||text()!=='MTrk')invalid();
  const size=length(),end=p+size;if(end>bytes.length)invalid();
  let time=0,tempo=500000,status=0;const events=[];
  while(p<end){time+=variable()*tempo/division/1000;let s=read();if(s<128){p--;s=status;}else if(s<240)status=s;
    if(s===255){const type=read(),size=variable();if(p+size>end)invalid();if(type===81&&size===3)tempo=bytes[p]*65536+bytes[p+1]*256+bytes[p+2];p+=size;if(type===47)break;}
    else if(s===240||s===247){const size=variable();p+=size;status=0;}
    else if(s>=128&&s<240){const data=[s,read()];if(![192,208].includes(s&240))data.push(read());if(data.slice(1).some(v=>v>127))invalid();events.push({time,data});}
    else invalid();
    if(p>end||time>900001||events.length>200000)invalid();
  }
  return {events,durationMs:time};
}
// Resolve sustain and note lengths before scheduling, including repeated notes and channels.
export function midiNotes(events, durationMs) {
  const active=new Map(),sustained=new Set(),pedals=new Set(),notes=[];
  const release=(note,time)=>{note.duration=Math.max(0,(time-note.time)/1000);sustained.delete(note);};
  for(const {time,data:[status,key,value]} of events){const channel=status&15,type=status&240,id=channel+':'+key;
    if(type===144&&value){const old=active.get(id);if(old)release(old,time);const note={midi:key,velocity:value,channel,time,duration:0};notes.push(note);active.set(id,note);}
    else if(type===128||type===144){const note=active.get(id);if(note){active.delete(id);if(pedals.has(channel))sustained.add(note);else release(note,time);}}
    else if(type===176){
      if(key===64){if(value>=64)pedals.add(channel);else{pedals.delete(channel);for(const note of sustained)if(note.channel===channel)release(note,time);}}
      if(key===120||key===123||key===121){for(const [id,note] of active)if(note.channel===channel&&key!==121){release(note,time);active.delete(id);}for(const note of sustained)if(note.channel===channel)release(note,time);pedals.delete(channel);}
    }
  }
  for(const note of [...active.values(),...sustained])release(note,durationMs);
  return notes;
}
