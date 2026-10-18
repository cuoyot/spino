import test from 'node:test';
import assert from 'node:assert/strict';
import {recordingFile,shareNativeRecording} from '../src/companion/media-share.js';

test('sharing keeps original recording bytes, safe musical filenames and audio/video MIME types',async()=>{
  for(const [type,extension] of [['audio/webm;codecs=opus','webm'],['video/mp4','mp4'],['audio/mp4','m4a']]){
    const blob=new Blob(['original recording bytes'],{type}),record={title:'Prélude / étude: 🎹',createdAt:'2026-10-18T12:00:00Z',blob};
    const file=recordingFile(record);assert.equal(file.name,'Prélude - étude- 🎹 · 2026-10-18.'+extension);assert.equal(file.type,type.split(';')[0]);assert.deepEqual(await file.arrayBuffer(),await blob.arrayBuffer());assert.equal(record.title,'Prélude / étude: 🎹');
  }
});
test('native sharing transfers bounded sequential chunks before opening the system chooser',async()=>{
  const bytes=new Uint8Array(600003).map((_,i)=>i%251),file=new File([bytes],'take.webm',{type:'audio/webm'}),chunks=[];let opened=false;
  const plugin={begin:async value=>{assert.equal(value.size,file.size);assert.equal(value.mimeType,'audio/webm');return{token:'synthetic'};},writeChunk:async({offset,base64})=>{const part=Buffer.from(base64,'base64');assert.ok(part.length<=256*1024);assert.equal(offset,chunks.reduce((n,b)=>n+b.length,0));chunks.push(part);},share:async value=>{opened=true;assert.equal(value.token,'synthetic');assert.deepEqual(Buffer.concat(chunks),Buffer.from(bytes));return{cancelled:true};},abort:async()=>assert.fail('Successful preparation must remain available for the receiver')};
  const result=await shareNativeRecording(file,plugin,{title:'Take',dialogTitle:'Share recording'});assert.equal(opened,true);assert.equal(result.cancelled,true);assert.equal(chunks.length,3);
});
test('interrupted preparation releases its temporary copy without opening sharing',async()=>{
  let aborted=false;
  const plugin={begin:async()=>({token:'partial'}),writeChunk:async()=>{throw Error('Storage full');},abort:async value=>{assert.equal(value.token,'partial');aborted=true;},share:async()=>assert.fail('Partial files cannot be shared')};
  await assert.rejects(shareNativeRecording(new File(['take'],'take.webm',{type:'video/webm'}),plugin,{}),/Storage full/);assert.equal(aborted,true);
});
