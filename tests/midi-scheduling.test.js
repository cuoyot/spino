import test from 'node:test';
import assert from 'node:assert/strict';
import {midiVoiceTiming} from '../src/companion/midi-scheduling.js';
import {encodeMidi,decodeMidi,midiNotes} from '../src/companion/midi-recording.js';

test('dense chords survive file round trip and delayed scheduling without losing attacks',async()=>{
 const events=[];
 for(let time=0;time<3000;time+=30){
  for(let key=48;key<60;key++)events.push({time,data:[144,key,90]});
  for(let key=48;key<60;key++)events.push({time:time+15,data:[128,key,0]});
 }
 const midi=decodeMidi(await encodeMidi(events,3100).arrayBuffer());
 const notes=midiNotes(midi.events,midi.durationMs);
 assert.equal(notes.length,1200);
 for(const note of notes){
  const delayedNow=10+Math.ceil(note.time/1000/.4)*.4;
  const timing=midiVoiceTiming(note,10,delayedNow);
  assert.ok(timing);assert.equal(timing.offset,0);
  assert.ok(Math.abs(timing.off-timing.when-.015)<1e-9);
 }
});
test('future notes stay on the audio clock; seek resumes held notes only',()=>{
 const note={time:1000,duration:2};
 assert.deepEqual(midiVoiceTiming(note,10,10),{when:11,offset:0,off:13});
 assert.deepEqual(midiVoiceTiming(note,10,12,2000),{when:12,offset:1,off:13});
 assert.equal(midiVoiceTiming(note,10,14,4000),null);
 assert.deepEqual(midiVoiceTiming({time:0,duration:.01},10,12),{when:12,offset:0,off:12.01});
});
