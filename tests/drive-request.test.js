import test from 'node:test';
import assert from 'node:assert/strict';
import {createDriveRequestGate} from '../src/companion/drive-request.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
test('a stalled bridge request times out, requests native cancellation and permits a fresh operation',async()=>{
 const pending=deferred(),cancelled=[],gate=createDriveRequestGate({cancel:async value=>cancelled.push(value.requestId)},{timeoutMs:20});
 await assert.rejects(gate.serialized(()=>gate.run(()=>pending.promise,{requestId:'stalled-read'})),e=>e.code==='PROVIDER_ERROR');assert.deepEqual(cancelled,['stalled-read']);assert.equal(gate.busy,false);
 assert.equal(await gate.serialized(()=>gate.run(async()=>42)),42);pending.resolve('late response');assert.equal(gate.busy,false);
});
test('pause aborts a pending request without letting its late result advance the notebook operation',async()=>{
 const pending=deferred(),gate=createDriveRequestGate({cancel:async()=>{}},{timeoutMs:10000});let reached=false,started;
 const ready=new Promise(r=>started=r),task=gate.serialized(async()=>{await gate.run(()=>{started();return pending.promise;},{requestId:'pause-read'});reached=true;});await ready;
 gate.cancel();await assert.rejects(task,e=>e.code==='CANCELLED');pending.resolve({text:'late remote data'});await new Promise(r=>setTimeout(r,0));assert.equal(reached,false);assert.equal(gate.busy,false);assert.equal(await gate.serialized(()=>gate.run(async()=>'retry')),'retry');
});
test('bridge call not dispatched after cancellation and overlapping operations stay serialized',async()=>{
 const gate=createDriveRequestGate({}, {timeoutMs:10000}),pending=deferred();let dispatched=false;
 const first=gate.serialized(async()=>{await pending.promise;return gate.run(async()=>{dispatched=true;});});await assert.rejects(gate.serialized(async()=>{}),e=>e.code==='BUSY');gate.cancel();pending.resolve();await assert.rejects(first,e=>e.code==='CANCELLED');assert.equal(dispatched,false);
});
