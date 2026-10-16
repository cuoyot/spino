import test from 'node:test';
import assert from 'node:assert/strict';
import {createDriveNotebookAdapter} from '../src/companion/drive-notebook.js';
import {createCloudBackup} from '../src/companion/cloud-backup.js';
import {createNotebookTransport} from '../src/companion/notebook-transport.js';
import {createNotebookCloud} from '../src/companion/cloud-sync.js';
import {driveNotebookContent} from '../src/companion/notebook-transport.js';
import {cloudRecoveryFixture} from '../scripts/review/cloud-recovery-fixture.mjs';
import {syntheticNotebookDrive} from './fixtures/drive/notebook-server.js';
const initial=()=>cloudRecoveryFixture('en');
function device(server,{id='synthetic-owner',initialState={}}={}){
 let state=structuredClone(initialState),recovery=null;
 const options={native:server.native(id),recovery:{saveRecovery:async({text})=>{recovery=text;},readRecovery:async()=>({text:recovery})},settings:{read:()=>state,save:value=>{state=structuredClone(value);}}};
 return {adapter:createDriveNotebookAdapter(options),restart:()=>createDriveNotebookAdapter(options),state:()=>state,recovery:()=>recovery};
}
test('Drive notebooks create, discover and join with exact notebook, score and annotation IDs',async()=>{
 const server=syntheticNotebookDrive(),a=device(server),b=device(server),fixture=initial();
 await a.adapter.connect();await a.adapter.create({text:JSON.stringify(fixture),name:'Original musical title.json'});
 const files=await b.adapter.list();assert.equal(files.length,1);b.adapter.choose(files[0].id);
 const joined=await b.adapter.pickBackup({expectedNotebookId:fixture.cloudBackup.sharedNotebookId});
 assert.deepEqual(JSON.parse(joined.text),fixture);assert.equal((await b.adapter.status()).setupPending,true);
 assert.deepEqual(await device(server,{id:'another-owner'}).adapter.list(),[]);
 assert.ok(server.requests.filter(r=>r.method==='PATCH').every(r=>r.etag));
});
test('a lost creation response resumes the preallocated Drive file after restart without duplication',async()=>{
 const server=syntheticNotebookDrive(),a=device(server);server.dropMediaResponse=true;
 await assert.rejects(a.adapter.create({text:JSON.stringify(initial())}),/lost upload/);
 assert.equal((await a.adapter.list()).length,0);assert.equal(server.files.size,1);
 await a.restart().create({text:JSON.stringify(initial())});assert.equal(server.files.size,1);assert.equal((await a.adapter.list()).length,1);
});
test('conditional Drive writes reject concurrent changes and keep a local recovery copy',async()=>{
 const server=syntheticNotebookDrive(),a=device(server);await a.adapter.create({text:JSON.stringify(initial())});
 const before=await a.adapter.readLinked(),change=JSON.parse(before.text);change.data.preferences.weeklyMinutes=150;
 server.beforePatch=file=>{const concurrent=JSON.parse(file.text);concurrent.data.works[0].notes='Saved on another device';file.text=JSON.stringify(concurrent);file.revision++;};
 await assert.rejects(a.adapter.write({text:JSON.stringify(change),expectedHash:before.hash}),{code:'CONFLICT'});
 assert.equal(JSON.parse([...server.files.values()][0].text).data.works[0].notes,'Saved on another device');
 assert.equal(a.recovery(),before.text);
});
test('offline/revoked access preserves notebook linkage and recovery, disconnect keeps remote files',async()=>{
 const server=syntheticNotebookDrive(),a=device(server);await a.adapter.create({text:JSON.stringify(initial())});
 const before=structuredClone(a.state());server.offline=true;await assert.rejects(a.adapter.readLinked());assert.deepEqual(a.state(),before);
 server.offline=false;server.revoked=true;await assert.rejects(a.adapter.readLinked(),{code:'PERMISSION_REQUIRED'});assert.deepEqual(a.state(),before);
 server.revoked=false;const current=await a.adapter.readLinked();await a.adapter.write({text:current.text,expectedHash:current.hash});await a.adapter.disconnect();
 assert.equal(server.files.size,1);assert.ok(a.recovery());assert.equal((await a.adapter.status()).linked,false);
});
test('missing strong revisions and mismatched notebook identities fail before upload/link',async()=>{
 const server=syntheticNotebookDrive(),a=device(server);await a.adapter.create({text:JSON.stringify(initial())});
 const before=server.requests.filter(r=>r.method==='PATCH').length;server.omitEtag=true;
 await assert.rejects(a.adapter.readLinked(),{code:'REVISION_REQUIRED'});assert.equal(server.requests.filter(r=>r.method==='PATCH').length,before);
 server.omitEtag=false;const b=device(server);b.adapter.choose([...server.files.keys()][0]);
 await assert.rejects(b.adapter.pickBackup({expectedNotebookId:'b524329c-a21f-4908-bf87-83a8719db75e'}),{code:'INVALID_NOTEBOOK'});assert.equal((await b.adapter.status()).linked,false);
});
test('Drive sync combines offline edits and keeps theme/network preferences on each device',async t=>{
 const server=syntheticNotebookDrive();
 function engine(theme,wifiOnly){
  const d=device(server);let local=initial(),base=null,meta={};local.data.preferences.theme=theme;local.data.preferences.wifiOnly=wifiOnly;
  const e=createNotebookCloud({adapter:d.adapter,delay:100000,settings:{read:()=>meta,save:v=>{meta=structuredClone(v);}},snapshot:async()=>JSON.stringify(local),eligible:()=>true,
   backupFactory:options=>createCloudBackup({...options,settings:{read:()=>null,save:()=>{}}}),
   readBase:async()=>base,saveBase:async v=>{base=structuredClone(v);},apply:async(text,b)=>{const next=JSON.parse(text);for(const key of ['theme','wifiOnly'])next.data.preferences[key]=local.data.preferences[key];local=next;base=structuredClone(b);}});
  t.after(()=>e.stop());return {e,d,get:()=>local,edit:fn=>{fn(local);e.markDirty();}};
 }
 const a=engine('dark',true),b=engine('light',false);await a.e.createShared();
 b.d.adapter.choose((await b.d.adapter.list())[0].id);await b.e.joinShared();
 a.edit(v=>v.data.works[0].notes='Offline on A');b.edit(v=>v.data.preferences.weeklyMinutes=180);
 await a.e.sync();await b.e.sync();await a.e.sync();
 assert.equal(a.e.state.status,'saved',a.e.state.error);assert.equal(b.e.state.status,'saved',b.e.state.error);
 for(const d of [a,b]){assert.equal(d.get().data.works[0].notes,'Offline on A');assert.equal(d.get().data.preferences.weeklyMinutes,180);assert.deepEqual(d.get().assets,initial().assets);}
 assert.equal(a.get().data.preferences.theme,'dark');assert.equal(b.get().data.preferences.theme,'light');assert.equal(b.get().data.preferences.wifiOnly,false);
 const remote=JSON.parse([...server.files.values()][0].text);assert.equal(Object.hasOwn(remote.data.preferences,'theme'),false);assert.equal(Object.hasOwn(remote.data.preferences,'wifiOnly'),false);
 assert.equal(driveNotebookContent(null),null);
});

test('migration keeps notebook identity and merges a second legacy device into the existing Drive file',async t=>{
 const server=syntheticNotebookDrive(),original=initial(),first=device(server);await first.adapter.create({text:JSON.stringify(original),name:'Existing Drive notebook.json'});
 const remote=JSON.parse((await first.adapter.readLinked()).text);remote.data.preferences.weeklyMinutes=210;const before=await first.adapter.readLinked();await first.adapter.write({text:JSON.stringify(remote),expectedHash:before.hash});
 let local=structuredClone(original),base=structuredClone(original),recovery=null,legacyLinked=true,meta={mode:'sync',enabled:true,name:'Original-provider.json',notebookId:original.cloudBackup.sharedNotebookId};local.data.works[0].notes='Offline legacy edit';
 const legacy={status:async()=>({linked:legacyLinked,name:'Original-provider.json'}),saveRecovery:async({text})=>{recovery=text;},disconnect:async()=>{legacyLinked=false;},readRecovery:async()=>({text:recovery})};
 const d=device(server),storage=new Map(),router=createNotebookTransport({legacy,drive:d.adapter,storage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
 const e=createNotebookCloud({adapter:router,delay:100000,settings:{read:()=>meta,save:v=>{meta=structuredClone(v);}},snapshot:async()=>JSON.stringify(local),eligible:()=>true,canApply:()=>true,
  backupFactory:options=>createCloudBackup({...options,settings:{read:()=>null,save:()=>{}}}),readBase:async()=>base,saveBase:async v=>{base=structuredClone(v);},apply:async(text,b)=>{local=JSON.parse(text);base=structuredClone(b);}});t.after(()=>e.stop());
 await e.migrateToDrive();assert.equal(e.state.status,'saved',e.state.error);assert.equal(e.state.transport,'drive');assert.equal(server.files.size,1);assert.equal(e.state.notebookId,original.cloudBackup.sharedNotebookId);assert.equal(legacyLinked,false);
 assert.equal(local.data.preferences.weeklyMinutes,210);assert.equal(local.data.works[0].notes,'Offline legacy edit');assert.deepEqual(local.assets,original.assets);assert.ok(recovery);
});
test('failed migration keeps the legacy connection paused and leaves its baseline and notebook intact',async t=>{
 const server=syntheticNotebookDrive(),original=initial(),d=device(server);let local=structuredClone(original),base=structuredClone(original),meta={mode:'sync',enabled:true,name:'Retained-provider.json',notebookId:original.cloudBackup.sharedNotebookId},disconnected=false;
 const legacy={saveRecovery:async()=>{},disconnect:async()=>{disconnected=true;},status:async()=>({linked:true,name:'Retained-provider.json'})};
 const storage=new Map(),router=createNotebookTransport({legacy,drive:d.adapter,storage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
 const e=createNotebookCloud({adapter:router,delay:100000,settings:{read:()=>meta,save:v=>{meta=structuredClone(v);}},snapshot:async()=>JSON.stringify(local),eligible:()=>true,canApply:()=>true,readBase:async()=>base,saveBase:async v=>{base=structuredClone(v);},apply:async()=>{throw Error('Must not apply a failed migration');},backupFactory:options=>createCloudBackup({...options,settings:{read:()=>null,save:()=>{}}})});t.after(()=>e.stop());
 server.offline=true;await e.migrateToDrive();assert.equal(e.state.status,'error');assert.equal(e.state.enabled,false);assert.equal(e.state.transport,'provider');assert.equal(disconnected,false);assert.deepEqual(local,original);assert.deepEqual(base,original);assert.equal(server.files.size,0);
});
