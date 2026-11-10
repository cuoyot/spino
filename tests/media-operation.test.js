import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForMediaOperation,assertMediaOperationActive} from '../src/companion/media-operation.js';

test('cancelling an unresponsive OS operation releases the caller and consumes late failure',async()=>{
 const controller=new AbortController();let reject;
 const pending=new Promise((_,r)=>{reject=r;});
 const wait=waitForMediaOperation(pending,controller.signal);
 controller.abort();await assert.rejects(wait,{name:'AbortError'});
 reject(Error('Late native callback'));await new Promise(resolve=>setTimeout(resolve,0));
 assert.throws(()=>assertMediaOperationActive(controller.signal),{name:'AbortError'});
});
test('normal completion and OS errors keep their result',async()=>{
 const controller=new AbortController();assert.equal(await waitForMediaOperation(Promise.resolve('opened'),controller.signal),'opened');
 await assert.rejects(waitForMediaOperation(Promise.reject(Error('Native failure')),controller.signal),/Native failure/);
});
