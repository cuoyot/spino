import test from 'node:test';
import assert from 'node:assert/strict';
import { beginSession, block, emptyData, saveSession, validateBackup } from '../src/companion/model.js';
import { editSession, sessionBlockMs, settleSuspendedBlocks } from '../src/companion/session-edit.js';
const now=Date.parse('2026-11-05T10:00:00Z');
const fixture=()=>beginSession({title:'Synthetic practice',context:'piano',blocks:[block('free',{id:'a'}),block('repertoire',{id:'b',workId:'bach'}),block('warmup',{id:'c',target:'hanon-1'})]},now);
const select=(s,id,time=now)=>editSession(s,{type:'select',blockId:id},{now:time}).active;

test('switching backwards and forwards retains timing, measurements, snapshots and stable order through recovery/save',()=>{
 let s=fixture(); s.runningSince=now;
 s=select(s,'b',now+5000);assert.equal(s.elapsedMs,5000);assert.equal(s.blockElapsedMs,0);
 s.runningSince=now+5000;s=select(s,'c',now+12000);
 assert.equal(sessionBlockMs(s,'b'),7000);
 s=select(s,'a');assert.equal(s.blockElapsedMs,5000);
 const snapshot={line:{notes:[{d:28,midi:60,letter:'c',acc:'',dur:'q',bar:0,start:0,units:4,clef:'treble'}],onsets:[0],states:['current'],key:'C',idx:0,beats:4,bars:1,waitBars:2},beat:0,settings:{timing:'wait',kbLo:25}};
 s.readerSnapshot=snapshot;s.currentMeasurement={source:'screen',correct:2,wrong:1};
 s=select(s,'b');
 const recovered=validateBackup(JSON.stringify({format:'cuaderno-piano',version:1,data:{...emptyData(),active:s},assets:[]})).data.active;
 s=select(recovered,'a');assert.deepEqual(s.readerSnapshot,snapshot);assert.equal(s.currentMeasurement.correct,2);
 assert.deepEqual(s.blocks.map(b=>b.id),['a','b','c']);
 s.runningSince=now+12000;s=select(s,'b',now+15000);
 assert.equal(sessionBlockMs(s,'a'),8000);assert.equal(s.elapsedMs,15000);
 const data=emptyData();data.active=s;
 const saved=saveSession(data,settleSuspendedBlocks(s),{},now+15000);
 assert.equal(saved.results.reduce((sum,r)=>sum+r.elapsedMs,0),15000);
 assert.equal(saved.id,s.id);assert.equal(saved.results.find(r=>r.block.id==='b').block.workId,'bach');
 assert.deepEqual(saved.results.find(r=>r.block.id==='a').material.notes,snapshot.line.notes);
});

test('legacy completed results remain immutable while revisiting their block accumulates additional time',()=>{
 let s=fixture();const result={block:structuredClone(s.blocks[0]),context:'piano',elapsedMs:9000,measurement:null,material:null};
 s.results=[result];s.blockIndex=1;s.elapsedMs=9000;
 s=select(s,'a');assert.equal(sessionBlockMs(s,'a'),9000);
 s.runningSince=now;s=select(s,'c',now+3000);
 assert.equal(sessionBlockMs(s,'a'),12000);assert.deepEqual(s.results,[result]);
 const saved=saveSession(emptyData(),settleSuspendedBlocks(s),{},now+3000);
 assert.equal(saved.results.reduce((sum,r)=>sum+r.elapsedMs,0),12000);
});

test('reordering and removing earlier flexible blocks preserves the active block and its runtime',()=>{
 let s=select(fixture(),'c');s.blockElapsedMs=s.elapsedMs=2000;
 s=editSession(s,{type:'move',blockId:'a',toIndex:2},{now}).active;
 assert.equal(s.blocks[s.blockIndex].id,'c');assert.equal(s.blockElapsedMs,2000);
 s=editSession(s,{type:'remove',blockId:'b'},{now}).active;
 assert.equal(s.blocks[s.blockIndex].id,'c');assert.equal(s.blockElapsedMs,2000);
 s=editSession(s,{type:'remove',blockId:'c'},{now}).active;
 assert.equal(s.blocks[s.blockIndex].id,'a');assert.equal(s.blockElapsedMs,0);
 assert.equal(s.results[0].elapsedMs,2000);
});

test('recover a copied Hanon block mislabeled as Reading without losing timing, IDs or its exercises',()=>{
 const s=fixture();s.blocks[0]=block('reading',{id:'a',target:'hanon-1',exercises:['hanon-1']});s.elapsedMs=s.blockElapsedMs=12000;s.runningSince=now;
 const original=structuredClone(s);const next=select(s,'b',now+3000);
 assert.equal(next.blocks[0].type,'warmup');assert.equal(next.blocks[0].id,'a');assert.deepEqual(next.blocks[0].exercises,['hanon-1']);assert.equal(sessionBlockMs(next,'a'),15000);assert.deepEqual(s,original);
});
