import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addQuickAnswer,emptyQuickScore,validQuickScore,quickRecords} from '../src/companion/quick-score.js';
import {emptyData,beginSession,saveSession,validateData} from '../src/companion/model.js';
import {quickPractice} from '../src/companion/quick-practice.js';
test('quick score rewards speed, penalizes errors and never displays negative totals',()=>{
 const empty=emptyQuickScore(),fast=addQuickAnswer(empty,true,300),slow=addQuickAnswer(empty,true,3000);
 assert.equal(fast.points,190);assert.equal(slow.points,100);assert.equal(empty.points,0);
 assert.equal(addQuickAnswer(fast,false).points,140);assert.equal(addQuickAnswer(empty,false).points,0);
 assert.ok(validQuickScore(fast));assert.equal(validQuickScore({...fast,points:99999}),false);
});
test('scores are backed up with saved sessions and records exclude ordinary practices',()=>{
 const data=emptyData(),active=beginSession(quickPractice(data.preferences));active.quickScore=addQuickAnswer(emptyQuickScore(),true,600);const saved=saveSession(data,active);assert.doesNotThrow(()=>validateData(data));
 const before=structuredClone(data.sessions);assert.equal(quickRecords([...data.sessions,{date:'2026-10-06'}])[0].id,saved.id);assert.deepEqual(data.sessions,before);
 data.sessions[0].quickScore.points=-1;assert.throws(()=>validateData(data));
});
