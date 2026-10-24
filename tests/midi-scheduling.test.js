import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeMidi,decodeMidi,midiNotes} from '../src/companion/midi-recording.js';

test('dense events retain timestamp precision and are sorted without modifying input',async()=>{
 const events=[];
 for(let i=0;i<1200;i++){
  const time=i*17.1234;
  events.push({time,data:[144,60,80]},{time:time+1.23,data:[128,60,0]});
 }
 const delivered=[...events].reverse();
 const midi=decodeMidi(await encodeMidi(delivered,21000).arrayBuffer());
 const captured=midi.events.filter(e=>(e.data[0]&240)===144||(e.data[0]&240)===128);
 assert.equal(captured.length,events.length);
 const maxErrorMs=Math.max(...captured.map((e,i)=>Math.abs(e.time-events[i].time)));
 assert.ok(maxErrorMs<=.5);
 assert.equal(delivered[0],events.at(-1));
 assert.equal(midiNotes(midi.events,midi.durationMs).length,1200);
 console.log('MIDI timestamp round-trip maximum error (ms):',maxErrorMs);
});
