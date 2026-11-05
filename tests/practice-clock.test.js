import test from 'node:test';
import assert from 'node:assert/strict';
import { watchPracticeClock } from '../src/companion/practice-clock.js';

test('clock keeps updating without animation frames and shares change detection with frames', t => {
  let frame, timer, cancelled, cleared;
  t.mock.method(globalThis, 'setInterval', (callback, delay) => { timer = callback; assert.equal(delay, 100); return 42; });
  t.mock.method(globalThis, 'clearInterval', id => { cleared = id; });
  const originals = Object.getOwnPropertyDescriptors(globalThis);
  globalThis.requestAnimationFrame = callback => { frame = callback; return 7; };
  globalThis.cancelAnimationFrame = id => { cancelled = id; };
  t.after(() => {
    for (const key of ['requestAnimationFrame', 'cancelAnimationFrame']) {
      if (originals[key]) Object.defineProperty(globalThis, key, originals[key]);
      else delete globalThis[key];
    }
  });
  let state = {time:'0:00',blockTime:'0:00',running:true};
  const updates = [];
  const stop = watchPracticeClock(() => state, value => updates.push(value));
  timer();
  for (let second = 1; second <= 7; second++) {
    state = {...state,time:`0:0${second}`,blockTime:`0:0${second}`};
    timer(); timer();
  }
  assert.deepEqual(updates.map(value => value.time), ['0:00','0:01','0:02','0:03','0:04','0:05','0:06','0:07']);
  frame();
  assert.equal(updates.length, 8, 'Returning frames must not repeat timer writes.');
  state = {...state,running:false}; timer(); frame();
  assert.equal(updates.length, 9, 'Pause must update even within the same second.');
  state = null; timer();
  state = {time:'0:07',blockTime:'0:07',running:false}; timer();
  assert.equal(updates.length, 10, 'A reopened clock must receive its initial state.');
  state = {...state,time:'0:11',blockTime:'0:11',running:true}; timer();
  assert.equal(updates.at(-1).time, '0:11', 'Delayed callbacks must retain the actual elapsed time.');
  stop();
  assert.equal(cancelled, 7); assert.equal(cleared, 42);
  state = {...state,time:'0:12'}; timer(); frame();
  assert.equal(updates.length, 11, 'Disposed watchers must stop updating.');
});

test('score clock refreshes when only the independent session total changes', t => {
 const oldFrame=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;
 globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 t.after(()=>{globalThis.requestAnimationFrame=oldFrame;globalThis.cancelAnimationFrame=oldCancel});
 let tick; t.mock.method(globalThis,'setInterval',callback=>{tick=callback;return 1});t.mock.method(globalThis,'clearInterval',()=>{});
 let state={time:'0:10',totalTime:'13:10',running:false};const updates=[];
 const stop=watchPracticeClock(()=>state,value=>updates.push(value));tick();
 state={...state,totalTime:'13:11'};tick();assert.equal(updates.length,2);assert.equal(updates[1].time,'0:10');stop();
});
