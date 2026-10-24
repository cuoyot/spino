import test from 'node:test';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';
test('rendered PCM preserves millisecond attacks across stalls and segment boundaries',{timeout:60000},async t=>{
 const {send,evaluate,url}=await openBrowser(t,{rootDirectory:'.'});
 await send('Page.navigate',{url:new URL('/tests/midi-audio-fixture.html',url).href});
 const result=await evaluate(`(async()=>{
  const {renderMidiAudio}=await import('/src/companion/midi-render.js');
  const context=new AudioContext({sampleRate:32000}),sample=context.createBuffer(1,320,32000);sample.getChannelData(0)[0]=1;
  const times=Array.from({length:1200},(_,i)=>i*17.1234),notes=times.map(time=>({time,duration:.001,midi:60,velocity:80}));
  const promise=renderMidiAudio(context,notes,new Map([['60-80',sample]]),21000);
  const until=performance.now()+150;while(performance.now()<until){}
  const audio=await promise,data=audio.getChannelData(0),attacks=[];
  for(let i=0;i<data.length;i++)if(Math.abs(data[i])>.001)attacks.push(i);
  const maxErrorMs=Math.max(...attacks.map((frame,i)=>Math.abs(frame/32-times[i])));
  const longSample=context.createBuffer(1,32000,32000);longSample.getChannelData(0).fill(.5);
  const sustained=await renderMidiAudio(context,[{time:19950,duration:.2,midi:60,velocity:80}],new Map([['60-80',longSample]]),20500);
  const boundary=sustained.getChannelData(0).slice(639998,640003);
  await context.close();return {count:attacks.length,maxErrorMs,boundary:Array.from(boundary)};
 })()`);
 assert.equal(result.count,1200);assert.ok(result.maxErrorMs<=1/32,JSON.stringify(result));assert.deepEqual(result.boundary,[.5,.5,.5,.5,.5]);
 console.log('PCM timing measurement:',JSON.stringify(result));
});
