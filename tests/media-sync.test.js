import test from 'node:test';
import assert from 'node:assert/strict';
import {createMediaSync} from '../src/companion/media-sync.js';
import {createDriveMedia,DRIVE_CHUNK,mediaHash} from '../src/companion/drive-media.js';
import {syntheticDrive} from '../src/companion/drive-media-fixture.js';

const recording=(id='take-1',kind='audio')=>({id,workId:'work-1',title:'Original musical title',workTitle:'Original piece',createdAt:'2026-10-16T10:00:00Z',durationMs:120000,kind,draft:false,blob:new Blob([new Uint8Array(DRIVE_CHUNK+32).fill(41)],{type:kind+'/webm'})});
function memoryStore(records=[]){
 const rows=new Map(records.map(r=>[r.id,r])),ignored=new Set();
 return {rows,ignoredKeys:ignored,index:async()=>[...rows.values()].map(({blob,...r})=>({...r,bytes:blob.size})),get:async id=>rows.get(id),ignored:async(key,id)=>ignored.has(key+'.'+id),attachCloud:async(id,cloud)=>{if(rows.has(id))rows.set(id,{...rows.get(id),cloud});},importRemote:async(record,key)=>{if(!rows.has(record.id)&&!ignored.has(key+'.'+record.id))rows.set(record.id,record);},remove:async id=>{const r=rows.get(id);if(r?.cloud)ignored.add(r.cloud.accountId+'.'+r.cloud.notebookId+'.'+id);rows.delete(id);}};
}
function device(t,server,records=[],options={}){
 const store=options.store||memoryStore(records),progress=options.progress||new Map();let context={accountId:'synthetic-owner',notebookId:'synthetic-book',works:[{id:'work-1',title:'Original piece'}],wifiOnly:true};
 const engine=createMediaSync({store,getContext:()=>context,eligible:()=>true,network:options.network,connection:async c=>createDriveMedia({request:options.request||server.request,state:{get:async k=>progress.get(k),set:async(k,v)=>progress.set(k,structuredClone(v))},...c})});
 t.after(()=>engine.stop());return {engine,store,progress,disconnect:()=>{context=null;},switchBook:()=>{context={...context,notebookId:'another-book'};}};
}
test('audio/video copies arrive on a second device with exact IDs, bytes, titles, dates and durations',async t=>{
 const server=syntheticDrive(),a=device(t,server,[recording(),recording('take-2','video')]),b=device(t,server);
 await a.engine.sync();assert.equal(a.engine.state.status,'saved',a.engine.state.error);await b.engine.sync();assert.equal(b.engine.state.status,'saved',b.engine.state.error);
 assert.equal(b.store.rows.size,2);for(const r of a.store.rows.values()){const copied=b.store.rows.get(r.id);assert.equal(await mediaHash(copied.blob),await mediaHash(r.blob));for(const key of ['id','title','createdAt','durationMs','workId','kind'])assert.equal(copied[key],r[key]);}
 await b.engine.sync();await a.engine.sync();assert.equal(server.files.size,2);assert.equal(server.sessions.size,2);
});
test('interrupted upload resumes after engine recreation without duplicate files',async t=>{
 const server=syntheticDrive(),a=device(t,server,[recording()]);server.interruptNextChunk();await a.engine.sync();assert.equal(a.engine.state.status,'error');assert.equal(a.store.rows.size,1);a.engine.stop();
 const resumed=device(t,server,[],{store:a.store,progress:a.progress});await resumed.engine.sync();assert.equal(resumed.engine.state.status,'saved',resumed.engine.state.error);assert.equal(server.files.size,1);assert.equal(server.sessions.size,1);
});
test('Wi-Fi/offline policies retain local files and do not start network transfers',async t=>{
 for(const network of [{online:false,wifi:false},{online:true,wifi:false,metered:true}]){const server=syntheticDrive(),a=device(t,server,[recording()],{network:async()=>network});await a.engine.sync();assert.equal(a.engine.state.status,network.online?'wifi':'offline');assert.equal(server.sessions.size,0);assert.equal(a.store.rows.size,1);}
});
test('local removal keeps the Drive copy and does not redownload it on the same device',async t=>{
 const server=syntheticDrive(),a=device(t,server,[recording()]),b=device(t,server);await a.engine.sync();await b.engine.sync();await b.store.remove('take-1');await b.engine.sync();assert.equal(b.store.rows.size,0);assert.equal(server.files.size,1);assert.equal(a.store.rows.size,1);
});
test('drafts, unrelated notebooks and unknown pieces do not upload or replace local records',async t=>{
 const server=syntheticDrive(),draft={...recording('draft'),draft:true},foreign={...recording('foreign'),workId:'unknown-work'},bound={...recording('bound'),cloud:{accountId:'another-owner',notebookId:'synthetic-book'}};
 const a=device(t,server,[draft,foreign,bound]);await a.engine.sync();assert.equal(server.files.size,0);assert.equal(a.store.rows.size,3);
});
test('disconnect during upload prevents local adoption and keeps the original take',async t=>{
 const server=syntheticDrive();let a;const request=async options=>{const result=await server.request(options);if(options.method==='PUT'&&result.status===200)a.disconnect();return result;};a=device(t,server,[recording()],{request});await a.engine.sync();assert.equal(a.store.rows.size,1);assert.equal(a.store.rows.get('take-1').cloud.pending,true);assert.equal(server.files.size,1);
});
test('corrupt downloads never become playable local recordings and can be retried',async t=>{
 const server=syntheticDrive(),a=device(t,server,[recording()]);await a.engine.sync();let corrupt=true;
 const b=device(t,server,[],{request:async options=>{const r=await server.request(options);if(corrupt&&r.body)r.body[0]^=1;return r;}});await b.engine.sync();assert.equal(b.engine.state.status,'error');assert.equal(b.store.rows.size,0);corrupt=false;await b.engine.sync();assert.equal(b.engine.state.status,'saved');assert.equal(b.store.rows.size,1);
});

test('deleting a recording during upload keeps the completed cloud copy without resurrecting it locally',async t=>{
 const server=syntheticDrive();let a;const request=async options=>{const result=await server.request(options);if(options.method==='PUT'&&result.status===200)await a.store.remove('take-1');return result;};a=device(t,server,[recording()],{request});await a.engine.sync();await a.engine.sync();assert.equal(a.store.rows.size,0);assert.equal(server.files.size,1);
});
