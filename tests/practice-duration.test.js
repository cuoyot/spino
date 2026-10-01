import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resizePractice, practiceMinutes } from '../src/companion/practice-duration.js';

test('total duration preserves proportions and block identities without mutating saved routines', () => {
  const blocks = [{id:'a',minutes:2},{id:'b',minutes:3},{id:'c',minutes:3}];
  const resized = resizePractice(blocks,40);
  assert.deepEqual(resized.map(b=>b.minutes),[10,15,15]);
  assert.deepEqual(resized.map(b=>b.id),['a','b','c']);
  assert.equal(practiceMinutes(blocks),8);
});
test('rounding, minimum block time and long existing routines keep exact totals', () => {
  for (const weights of [[1,1,1],[1,180,1],[600,600,10]]) {
    for (const total of [1,3,17,40,1210,1800]) {
      const result=resizePractice(weights.map(minutes=>({minutes})),total);
      assert.equal(practiceMinutes(result),Math.max(3,total));
      assert.ok(result.every(b=>Number.isInteger(b.minutes)&&b.minutes>=1&&b.minutes<=600));
    }
  }
  assert.deepEqual(resizePractice([],40),[]);
});
