import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,block,validateData} from '../src/companion/model.js';
import {routineDraft,routineForPractice} from '../src/companion/routine-policy.js';

test('routines resolve MIDI and first-position warm-up at practice time without mutating legacy data',()=>{
 const data=emptyData(),source={id:'routine',title:'Daily',context:'midi',blocks:[block('reading',{id:'reading',minutes:10}),block('warmup',{target:'hanon-1',minutes:4})]};
 const original=structuredClone(source),draft=routineDraft(source,data);
 assert.deepEqual(source,original);assert.equal(draft.context,'piano');assert.deepEqual(draft.blocks.map(b=>b.id),['reading']);assert.equal(draft.routinePolicy.warmupMinutes,4);
 data.routines=[draft];assert.deepEqual(validateData(data).routines[0].routinePolicy,draft.routinePolicy);
 const manual=routineForPractice(draft,data,false),midi=routineForPractice(draft,data,true);
 assert.equal(manual.context,'piano');assert.equal(midi.context,'midi');assert.equal(manual.blocks[0].type,'warmup');assert.equal(manual.blocks[1].id,'reading');
 draft.routinePolicy.warmup=false;assert.deepEqual(routineForPractice(draft,data,true).blocks.map(b=>b.id),['reading']);
});
test('routine tempo resolves from current practice defaults instead of saved template tempo',()=>{
 const data=emptyData(),draft=routineDraft({id:'r',title:'Daily',context:'mobile',blocks:[block('reading',{id:'b',bpm:150})]},data);
 data.preferences.practiceDefaults={reading:{bpm:75,hand:'right'}};
 assert.equal(routineForPractice(draft,data,false).blocks.find(b=>b.id==='b').bpm,75);assert.equal(draft.blocks[0].bpm,150);
 const prepared=routineForPractice(draft,data,false);prepared.blocks.find(b=>b.id==='b').bpm=88;
 assert.equal(routineForPractice(prepared,data,true,{keepTempo:true}).blocks.find(b=>b.id==='b').bpm,88);
 data.routines=[draft];draft.routinePolicy.warmupMinutes=0;assert.throws(()=>validateData(data));
});
