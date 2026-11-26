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
test('pause aborts every concurrent metadata read and never dispatches another read',async()=>{const ids=[],gate=createDriveRequestGate({cancel:async({requestId})=>ids.push(requestId)});let ready;const started=new Promise(r=>ready=r);const job=gate.serialized(async()=>{const calls=['a','b','c','d'].map(requestId=>gate.run(()=>new Promise(()=>{}),{requestId}));ready();await Promise.all(calls);});await started;gate.cancel();await assert.rejects(job,{code:'CANCELLED'});assert.deepEqual(ids.sort(),['a','b','c','d']);assert.equal(gate.busy,false);});


test('a whole operation expires even when each request responds before its own deadline',async()=>{
 const gate=createDriveRequestGate({}, {timeoutMs:1000,operationTimeoutMs:30});let reads=0;
 await assert.rejects(gate.serialized(async()=>{for(let n=0;n<20;n++){await gate.run(()=>new Promise(r=>setTimeout(r,5)));reads++;}throw Object.assign(Error('Synthetic request chain exceeded the operation budget'),{code:'TEST_LOOP'});}),{code:'SYNC_TIMEOUT'});
 assert.ok(reads>0);assert.equal(gate.busy,false);const stopped=reads;
 assert.equal(await gate.serialized(()=>gate.run(async()=>'recovered')),'recovered');assert.equal(reads,stopped);
});
test('operation expiry cancels all concurrent requests and rejects their late responses',async()=>{
 const pending=deferred(),cancelled=[],gate=createDriveRequestGate({cancel:async({requestId})=>cancelled.push(requestId)}, {timeoutMs:1000,operationTimeoutMs:25});let advanced=false;
 const job=gate.serialized(async()=>{await Promise.all(['a','b','c'].map(requestId=>gate.run(()=>pending.promise,{requestId})));advanced=true;});
 await assert.rejects(job,{code:'SYNC_TIMEOUT'});assert.deepEqual(cancelled.sort(),['a','b','c']);pending.resolve('late');
 await new Promise(r=>setImmediate(r));assert.equal(advanced,false);assert.equal(gate.busy,false);
});
