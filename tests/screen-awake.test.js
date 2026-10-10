import {test} from 'node:test';
import assert from 'node:assert/strict';
import {practiceNeedsScreen,createScreenAwake} from '../src/companion/screen-awake.js';

test('only visible running practice suppresses automatic screen locking',()=>{
  const state={active:{runningSince:1000},view:'session',readerVisible:false,scoreVisible:false,hidden:false};
  assert.equal(practiceNeedsScreen(state),true);
  assert.equal(practiceNeedsScreen({...state,view:'free-practice'}),true);
  for(const view of ['home','calendar','repertoire','prepare','settings'])assert.equal(practiceNeedsScreen({...state,view}),false);
  assert.equal(practiceNeedsScreen({...state,active:null}),false);
  assert.equal(practiceNeedsScreen({...state,active:{runningSince:null}}),false);
  assert.equal(practiceNeedsScreen({...state,hidden:true}),false);
  assert.equal(practiceNeedsScreen({...state,view:'work',scoreVisible:true}),true);
  assert.equal(practiceNeedsScreen({...state,view:'work',readerVisible:true}),true);
  assert.equal(practiceNeedsScreen({...state,view:'work',scoreVisible:true,active:null}),false);
});

test('screen requests are serialized, deduplicated and released after a delayed acquisition',async()=>{
  const calls=[];let finish;
  const update=createScreenAwake(async enabled=>{calls.push(enabled);if(enabled)await new Promise(resolve=>{finish=resolve;});});
  await update(false);
  const on=update(true);await Promise.resolve();await Promise.resolve();
  const off=update(false);finish();await on;await off;await update(false);
  assert.deepEqual(calls,[false,true,false]);
});

test('failed screen policy changes can be retried',async()=>{
  let calls=0;const update=createScreenAwake(async()=>{if(++calls===1)throw Error('Bridge unavailable');});
  await assert.rejects(update(false));await update(false);assert.equal(calls,2);
});
