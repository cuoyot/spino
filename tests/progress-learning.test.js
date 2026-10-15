import test from 'node:test';
import assert from 'node:assert/strict';
import {techniqueComparisons} from '../src/companion/progress-learning.js';
import {block} from '../src/companion/model.js';
const sample=(i,bpm=60)=>({date:`2026-10-${String(i+1).padStart(2,'0')}`,results:[{block:block('technique',{bpm}),context:'piano',measurement:{source:'midi',correct:i<3?5:9,wrong:i<3?5:1,guide:'off'}}]});
test('Technique compares disjoint groups with matching conditions only',()=>{
 const sessions=Array.from({length:6},(_,i)=>sample(i));
 const [g]=techniqueComparisons(sessions,'2026-10-14');assert.equal(g.before,50);assert.equal(g.after,90);
 assert.equal(techniqueComparisons(sessions.slice(0,5),'2026-10-14')[0].before,null);
 sessions[5].results[0].block.bpm=80;assert.equal(techniqueComparisons(sessions,'2026-10-14').length,2);
 assert.equal(techniqueComparisons(sessions,'2026-10-14')[0].before,null);
});
test('Manual and future entries cannot imply measured improvement',()=>{
 const s=sample(0);s.results[0].measurement=null;
 assert.deepEqual(techniqueComparisons([s,sample(6)],'2026-10-01'),[]);
});
