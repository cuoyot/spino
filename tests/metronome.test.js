import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/metronome-processor.js', import.meta.url), 'utf8');
function processor(sampleRate) {
  const beats = [], scope = {sampleRate, currentFrame:0, AudioWorkletProcessor:class {constructor(){this.port={postMessage:value=>beats.push(value)}}}, registerProcessor(name, constructor){scope.Processor=constructor}};
  vm.createContext(scope); vm.runInContext(source, scope);
  const node = new scope.Processor();
  return {node,scope,beats};
}
for (const rate of [44100,48000]) test(`audio-thread pulse has no accumulated drift at ${rate} Hz`, () => {
  const {node,scope,beats} = processor(rate), bpm=137, subdivision=4, origin=.017;
  node.port.onmessage({data:{bpm,subdivision,beats:7,origin,volume:.7}});
  // Render without dispatching any interface callbacks, using irregular quanta.
  let energy=0;
  while(scope.currentFrame<rate*60) {
    const out=new Float32Array(scope.currentFrame%3===0?128:256);
    node.process([],[[out]]); energy+=out.reduce((sum,value)=>sum+Math.abs(value),0);scope.currentFrame+=out.length;
  }
  assert.ok(energy>0);assert.ok(beats.length>500);
  for(let i=0;i<beats.length;i++) {
    assert.equal(beats[i].step,i);
    const expected=origin+i*60/bpm/subdivision;
    assert.ok(Math.abs(beats[i].time-expected)<=.51/rate,`${i}: audio sample differs from the beat grid`);
    assert.equal(beats[i].accent,i%(7*subdivision)===0);
  }
  node.port.onmessage({data:null});const out=new Float32Array(128);node.process([],[[out]]);assert.ok(out.every(v=>v===0));
});

test('visual and muted modes generate silence; count-in remains audible when exercise clicks are off',()=>{
  for(const volume of [0,1]) {
    const {node,scope,beats}=processor(48000);node.port.onmessage({data:{bpm:120,beats:4,origin:1,firstStep:-2,enabled:false,volume}});
    let before=0,after=0;
    for(;scope.currentFrame<96000;scope.currentFrame+=128){const out=new Float32Array(128);node.process([],[[out]]);const energy=out.reduce((n,v)=>n+Math.abs(v),0);if(scope.currentFrame<48000)before+=energy;else after+=energy;}
    assert.equal(after,0);assert.equal(before>0,volume>0);assert.deepEqual(beats.map(b=>b.step),[-2,-1,0,1]);
  }
});


test('late audio startup anchors free clicks and skips stale generated count-in beats',()=>{
 for(const startNow of [false,true]) {
  const {node,scope,beats}=processor(48000);
  node.port.onmessage({data:{bpm:60,beats:4,origin:.05,volume:1,startNow}});
  scope.currentFrame=8832;
  for(;scope.currentFrame<48000*3;scope.currentFrame+=128)node.process([],[[new Float32Array(128)]]);
  if(startNow){assert.equal(beats[0].time,8832/48000);assert.equal(beats[0].step,0)}
  else {assert.equal(beats[0].step,1);assert.ok(Math.abs(beats[0].time-1.05)<1/48000)}
  for(let i=1;i<beats.length;i++)assert.ok(Math.abs(beats[i].time-beats[i-1].time-1)<=1/48000);
 }
 const {node,scope,beats}=processor(48000);node.port.onmessage({data:{bpm:120,beats:4,origin:0}});node.process([],[[new Float32Array(128)]]);scope.currentFrame=96000;node.process([],[[new Float32Array(128)]]);
 assert.deepEqual(beats.map(b=>b.step),[0,4]);
});
