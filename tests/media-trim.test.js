import test from 'node:test';
import assert from 'node:assert/strict';
import {trimRange,trimmedRecording,trimNativeRecording} from '../src/companion/media-trim.js';
test('trim validates bounds and creates an independent cloud identity',()=>{
 for(const args of [[1000,-1,500],[1000,1,1100],[1000,1,100],[1000,NaN,500]])assert.throws(()=>trimRange(...args));
 const original={id:'original',workId:'work',sessionId:'session',createdAt:'2026-10-21',kind:'audio',cloud:{fileId:'remote'},installation:'device',blob:new Blob(['original'],{type:'audio/webm'})};
 const copy=trimmedRecording(original,new Blob(['cut'],{type:'audio/mp4'}),trimRange(3000,1000,2000),'Trimmed');
 assert.equal(copy.id,original.id);assert.notEqual(copy.mediaTakeId,original.id);assert.equal(copy.workId,'work');assert.equal(copy.sessionId,'session');assert.equal(copy.cloud,undefined);assert.equal(copy.installation,undefined);assert.equal(original.cloud.fileId,'remote');assert.equal(copy.durationMs,1000);
});
test('native output failure and cancellation clean staging without returning partial output',async()=>{
 let cleaned=0;const controller=new AbortController(),record={kind:'audio',blob:new Blob(['input'],{type:'audio/webm'})},range=trimRange(3000,1000,2000);
 const plugin={begin:async()=>({token:'test'}),writeChunk:async()=>{},trim:async()=>({path:'file',bytes:100,mimeType:'audio/mp4'}),cancel:async()=>{cleaned++}};
 await assert.rejects(trimNativeRecording(record,range,{},plugin,async()=>new Blob(['bad'])),/verify/);assert.equal(cleaned,1);
 plugin.trim=async()=>{controller.abort();throw Error('Native cancellation')};await assert.rejects(trimNativeRecording(record,range,{signal:controller.signal},plugin),{name:'AbortError'});assert.ok(cleaned>=2);
});
