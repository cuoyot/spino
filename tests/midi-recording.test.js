import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeMidi,decodeMidi,midiNotes} from '../src/companion/midi-recording.js';
import {recordingFile} from '../src/companion/media-share.js';
import {validateRemote} from '../src/companion/drive-media.js';
test('standard MIDI round trip preserves chords, velocity, channel, pedal, silence and final releases',async()=>{
 const events=[{time:127,data:[146,60,41]},{time:127,data:[146,64,118]},{time:255,data:[178,64,127]},{time:500,data:[130,60,0]},{time:600,data:[130,64,0]},{time:16384,data:[178,64,0]}];
 const blob=encodeMidi(events,20000),bytes=await blob.arrayBuffer(),midi=decodeMidi(bytes);
 assert.equal(blob.type,'audio/midi');assert.equal(Buffer.from(bytes).subarray(0,4).toString(),'MThd');assert.deepEqual(midi.events.filter(e=>e.time<20000&&e.data.length===3),events);assert.equal(midi.durationMs,20000);
 const notes=midiNotes(midi.events,midi.durationMs);assert.equal(notes.length,2);assert.equal(notes[0].duration,16.257);assert.equal(notes[1].velocity,118);
 const file=recordingFile({blob,title:'Étude',createdAt:'2026-10-23'});assert.ok(file.name.endsWith('.mid'));assert.deepEqual(await file.arrayBuffer(),bytes);
 const remote={id:'file',mimeType:'audio/midi',size:blob.size,appProperties:{spinoMedia:'spino-media-free-v1',notebookId:'book',takeId:'take',workId:'',sha256:'a'.repeat(64),createdAt:'2026-10-23T10:00:00Z',durationMs:'20000'}};assert.deepEqual(validateRemote(remote,'book'),remote);
});
test('stopping with held keys releases them; malformed files fail without looping',async()=>{
 const midi=decodeMidi(await encodeMidi([{time:0,data:[144,60,90]}],1000).arrayBuffer());assert.equal(midiNotes(midi.events,midi.durationMs)[0].duration,1);
 assert.throws(()=>decodeMidi(new ArrayBuffer(0)),/Invalid/);assert.throws(()=>decodeMidi(new Uint8Array([77,84,104,100]).buffer),/Invalid/);
});
