import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quickPractice} from '../src/companion/quick-practice.js';
import {emptyData,validateData,beginSession} from '../src/companion/model.js';
test('quick practice overrides piano/tempo/both-hand defaults without mutating preferences',()=>{
 const preferences={context:'midi',practiceDefaults:{reading:{hand:'both',bpm:120,figures:'2'}}},before=structuredClone(preferences);
 for(const [hand,value] of [['right',0],['left',0.9]]){
  const practice=quickPractice(preferences,()=>value),b=practice.blocks[0];
  assert.equal(practice.context,'mobile');assert.equal(b.hand,hand);assert.equal(b.input,'piano');assert.equal(b.timing,'wait');assert.ok(Number.isInteger(b.keyboardStart));
  const data=emptyData();data.active=beginSession(practice);assert.doesNotThrow(()=>validateData(data));
 }
 assert.deepEqual(preferences,before);
 const positions=[0,0.3,0.6,0.99].map(n=>{let i=0;return quickPractice(preferences,()=>i++?n:0).blocks[0].keyboardStart;});assert.equal(new Set(positions).size,4);
});
