import test from 'node:test';
import assert from 'node:assert/strict';
import {adjustPracticeTime} from '../src/companion/model.js';
test('edited practice duration preserves measured time and consistent block totals',()=>{
 const s={id:'same',elapsedMs:10000,results:[{elapsedMs:3000,measurement:{correct:4}},{elapsedMs:7000}]};adjustPracticeTime(s,60001);assert.equal(s.id,'same');assert.equal(s.recordedElapsedMs,10000);assert.equal(s.results.reduce((n,r)=>n+r.elapsedMs,0),60001);assert.deepEqual(s.results[0].measurement,{correct:4});adjustPracticeTime(s,0);assert.equal(s.recordedElapsedMs,10000);assert.equal(s.elapsedMs,0);assert.throws(()=>adjustPracticeTime(s,NaN));assert.throws(()=>adjustPracticeTime(s,-1));
});
