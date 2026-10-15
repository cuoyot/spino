import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,block,beginSession,saveSession,validateData} from '../src/companion/model.js';
import {updateSavedPractice} from '../src/companion/saved-practice-edit.js';
test('Edits saved blocks without changing identity, feedback or the original record',()=>{
 const data=emptyData(),active=beginSession({title:'Practice',context:'piano',blocks:[block('repertoire',{workId:'old'})]});active.elapsedMs=active.blockElapsedMs=35000;
 const original=saveSession(data,active,{notes:'Keep',mood:4,next:'Next'}),before=structuredClone(original);
 const edited=structuredClone(original.results);edited[0].elapsedMs=95000;edited[0].block.workId='new';edited.push({block:block('free'),context:'piano',elapsedMs:60000,measurement:null});
 const result=updateSavedPractice(original,edited,[{id:'new'}]);
 assert.deepEqual(original,before);assert.equal(result.id,original.id);assert.equal(result.notes,'Keep');assert.equal(result.mood,4);assert.equal(result.next,'Next');assert.equal(result.elapsedMs,155000);assert.deepEqual(result.workIds,['new']);assert.equal(result.blocks[0].id,original.blocks[0].id);assert.equal(result.blockIndex,result.blocks.length);
 data.sessions=[result];validateData(data);
 assert.throws(()=>updateSavedPractice(original,[{...edited[0],elapsedMs:-1}],[]));
});
