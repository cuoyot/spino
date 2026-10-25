import test from 'node:test';import assert from 'node:assert/strict';
import {createStorageCoordinator} from '../src/companion/storage-coordinator.js';
function fixture(){const cloud={state:{status:'saved'},resumeChecks:async()=>{},waitForIdle:async()=>{}};return {cloud,coordinator:createStorageCoordinator({cloud,media:{waitForIdle:async()=>{}}})};}
test('a setup reservation waits for a periodic storage operation and excludes the next one',async()=>{
 const f=fixture();let finish,count=0;const job=f.coordinator.background(()=>new Promise(resolve=>finish=resolve));let acquired=false;
 const reservation=f.coordinator.reserve().then(release=>{acquired=true;return release;});await Promise.resolve();assert.equal(acquired,false);finish();await job;const release=await reservation;assert.equal(f.coordinator.locked,true);await f.coordinator.background(async()=>{count++;});assert.equal(count,0);release();assert.equal(f.coordinator.locked,false);await f.coordinator.background(async()=>{count++;});assert.equal(count,1);
});
test('waiting setup keeps notebook synchronization eligible and prevents new background work',async()=>{
 const f=fixture();let finish,count=0;f.cloud.resumeChecks=()=>new Promise(resolve=>finish=resolve);const pending=f.coordinator.reserve();assert.equal(f.coordinator.locked,false);await f.coordinator.background(async()=>{count++;});assert.equal(count,0);finish();const release=await pending;assert.equal(f.coordinator.locked,true);release();
});
test('failed synchronization never grants a storage reservation and leaves later recovery available',async()=>{
 const f=fixture();f.cloud.state={status:'error',error:'Drive unavailable'};await assert.rejects(f.coordinator.reserve(),/Drive unavailable/);assert.equal(f.coordinator.locked,false);f.cloud.state={status:'saved'};const release=await f.coordinator.reserve();release();assert.equal(f.coordinator.locked,false);
});
test('periodic failures release the lock without swallowing the error',async()=>{
 const f=fixture();await assert.rejects(f.coordinator.background(async()=>{throw Error('Failed');}),/Failed/);assert.equal(f.coordinator.locked,false);const release=await f.coordinator.reserve();release();
});
