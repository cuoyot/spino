import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCommitGraph,validateChanges,notebookRecords,recordsNotebook} from '../src/companion/atomic-notebook.js';
test('long sequential histories use an iterative graph and retain only the latest record version',()=>{
 const graph=new Map();let previous;
 for(let n=0;n<10000;n++){const hash=n.toString(16).padStart(64,'0');graph.set(hash,{parents:previous?[previous]:[],changes:[{key:'preference/weeklyMinutes',value:n,previous:previous?[previous]:[]}]});previous=hash;}
 const merged=mergeCommitGraph(new Map([...graph].reverse()));assert.equal(merged.records['preference/weeklyMinutes'],9999);assert.deepEqual(merged.conflicts,[]);assert.equal(merged.heads.length,1);
});
test('protocol rejects prototype paths and fabricated record predecessors',()=>{
 for(const key of ['preference/__proto__','data/works/constructor','asset/%70rototype','unknown/path'])assert.throws(()=>validateChanges({kind:'record-changes',changes:[{key,value:1,previous:[]}]}));
 const a='a'.repeat(64),b='b'.repeat(64);
 assert.throws(()=>mergeCommitGraph(new Map([[a,{parents:[],changes:[{key:'preference/name',value:'a',previous:[]}] }],[b,{parents:[],changes:[{key:'preference/name',value:'b',previous:[a]}]}]])),/predecessor/);
});

test('catalogue diagnostic reports stay in local copies while transport retains actual execution and notebook data',async()=>{
 const {emptyData}=await import('../src/companion/model.js'),{emptyLibrary}=await import('../src/companion/library.js');
 const backup={format:'cuaderno-piano',version:1,data:emptyData(),assets:[],library:{...emptyLibrary(),report:{checkedAt:'2026-10-17T11:00:00Z',inserted:0,updated:0,skipped:12,failed:0,errors:[]},executions:{piece:{notes:'Keep original execution'}}}};
 const records=await notebookRecords(backup,async()=>{throw Error('No binary content expected')});assert.equal(records.header.library.report,undefined);assert.equal(backup.library.report.checkedAt,'2026-10-17T11:00:00Z');
 const restored=await recordsNotebook(records,async()=>{throw Error('No binary content expected')});assert.deepEqual(restored.library.executions,backup.library.executions);assert.deepEqual(restored.data.works,backup.data.works);assert.equal(restored.library.report,undefined);
});
