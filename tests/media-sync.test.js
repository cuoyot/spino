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
 const store=options.store||memoryStore(records),progress=options.progress||new Map();let context={accountId:'synthetic-owner',notebookId:'synthetic-book',works:options.works||[{id:'work-1',title:'Original piece'}],wifiOnly:options.wifiOnly!==false};
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

test('free audio and video copy to an empty repertoire without inventing a piece',async t=>{
 const server=syntheticDrive(),free=['audio','video'].map(kind=>({...recording('free-'+kind,kind),workId:'',workTitle:'',title:'Free '+kind}));
 const a=device(t,server,free,{works:[]}),b=device(t,server,[],{works:[]});
 await a.engine.sync();assert.equal(a.engine.state.status,'saved',a.engine.state.error);
 await b.engine.sync();assert.equal(b.engine.state.status,'saved',b.engine.state.error);assert.equal(b.store.rows.size,2);
 assert.ok([...server.files.values()].every(f=>f.appProperties.spinoMedia==='spino-media-free-v1'));
 for(const original of free){const copied=b.store.rows.get(original.id);assert.equal(copied.workId,'');assert.equal(copied.workTitle,'');assert.equal(copied.title,original.title);assert.equal(await mediaHash(copied.blob),await mediaHash(original.blob));}
 await a.engine.sync();await b.engine.sync();assert.equal(server.files.size,2);
});

test('allowed mobile networks upload and download exact audio/video bytes, while offline still waits',async t=>{
 const server=syntheticDrive(),mobile=async()=>({online:true,wifi:false,metered:true});
 const a=device(t,server,[recording(),recording('mobile-video','video')],{network:mobile,wifiOnly:false}),b=device(t,server,[],{network:mobile,wifiOnly:false});
 await a.engine.sync();assert.equal(a.engine.state.status,'saved',a.engine.state.error);await b.engine.sync();assert.equal(b.engine.state.status,'saved',b.engine.state.error);
 for(const original of a.store.rows.values())assert.equal(await mediaHash(b.store.rows.get(original.id).blob),await mediaHash(original.blob));
 const offline=device(t,syntheticDrive(),[recording()],{wifiOnly:false,network:async()=>({online:false,wifi:false,metered:true})});await offline.engine.sync();assert.equal(offline.engine.state.status,'offline');assert.equal(offline.store.rows.size,1);
});

test('a rejected Drive file does not block other uploads/downloads or cause duplicate uploads on retry',async t=>{
 const server=syntheticDrive(),a=device(t,server,[recording('bad'),recording('remote-good')]);await a.engine.sync();
 const bad=[...server.files.values()].find(f=>f.appProperties.takeId==='bad'),badType=bad.mimeType;bad.mimeType='application/octet-stream';
 const b=device(t,server,[recording('bad'),recording('local-good')]);await b.engine.sync();
 assert.equal(b.engine.state.status,'error');assert.equal(b.engine.state.completed,2);assert.equal(b.engine.state.issues.length,1);
 assert.equal(b.engine.state.issues[0].takeId,'bad');assert.equal(b.engine.state.issues[0].title,recording().title);assert.match(b.engine.state.issues[0].message,/format is not supported/);
 assert.equal(b.store.rows.size,3);assert.equal(b.store.rows.get('bad').cloud,undefined);assert.equal(server.files.size,3);
 await b.engine.sync();assert.equal(server.files.size,3);assert.equal(b.engine.state.status,'error');assert.equal(b.engine.state.completed,0);
 bad.mimeType=badType;await b.engine.sync();assert.equal(b.engine.state.status,'saved');assert.deepEqual(b.engine.state.issues,[]);assert.equal(b.store.rows.get('bad').cloud.fileId,bad.id);assert.equal(server.files.size,3);
});

test('a damaged remote take ID cannot duplicate or rebind an existing cloud-linked recording',async t=>{
 const server=syntheticDrive(),a=device(t,server,[recording()]);await a.engine.sync();
 const before=structuredClone(a.store.rows.get('take-1')),file=[...server.files.values()][0];file.appProperties.takeId='';
 a.store.rows.set('new-take',recording('new-take'));await a.engine.sync();
 assert.equal(a.engine.state.status,'error');assert.equal(a.engine.state.completed,1);assert.equal(server.files.size,2);
 assert.deepEqual(a.store.rows.get('take-1'),before);assert.match(a.engine.state.issues[0].message,/recording identity/);
});

test('bad download bytes stay quarantined while independent recordings are verified and saved',async t=>{
 const server=syntheticDrive(),a=device(t,server,[recording('bad'),recording('good')]);await a.engine.sync();
 const bad=[...server.files.values()].find(f=>f.appProperties.takeId==='bad');
 const b=device(t,server,[],{request:async options=>{const r=await server.request(options);if(r.body&&new URL(options.url).pathname.endsWith('/'+bad.id))r.body[0]^=1;return r;}});
 await b.engine.sync();assert.equal(b.engine.state.status,'error');assert.equal(b.engine.state.completed,1);assert.equal(b.store.rows.size,1);assert.ok(b.store.rows.has('good'));assert.equal(b.engine.state.issues[0].takeId,'bad');
 assert.equal(await mediaHash(b.store.rows.get('good').blob),await mediaHash(recording('good').blob));
});

test('conflicting copies of one take are all excluded while unrelated uploads continue',async t=>{
 const server=syntheticDrive(),a=device(t,server,[recording()]);await a.engine.sync();
 const original=[...server.files.values()][0],conflict=structuredClone(original);conflict.id='conflicting-file';conflict.appProperties.workId='different-work';server.files.set(conflict.id,conflict);
 const b=device(t,server,[recording(),recording('independent')]);await b.engine.sync();
 assert.equal(b.engine.state.status,'error');assert.equal(b.engine.state.completed,1);assert.match(b.engine.state.issues[0].message,/identity conflict/);assert.equal(b.store.rows.get('take-1').cloud,undefined);assert.equal(server.files.size,3);
});

test('authorization failure stops the queue, retains all local bytes, and identifies the attempted recording',async t=>{
 const server=syntheticDrive(),a=device(t,server,[recording('first'),recording('second')],{request:async options=>options.url.includes('generateIds')?{status:401}:server.request(options)});
 await a.engine.sync();assert.equal(a.engine.state.status,'error');assert.equal(a.engine.state.issues[0].takeId,'first');assert.equal(a.engine.state.completed,0);assert.equal(server.files.size,0);assert.equal(a.store.rows.size,2);assert.equal(a.store.rows.get('second').cloud,undefined);
});

test('invalid metadata after a completed upload preserves its immutable ID and does not block the next take',async t=>{
 const server=syntheticDrive(),a=device(t,server,[recording('first'),recording('second')],{request:async options=>{
  const r=await server.request(options);
  for(const file of server.files.values())if(file.appProperties.takeId==='first')file.mimeType='application/octet-stream';
  if(r.json?.appProperties?.takeId==='first')r.json.mimeType='application/octet-stream';
  return r;
 }});
 await a.engine.sync();assert.equal(a.engine.state.status,'error');assert.equal(a.engine.state.completed,1);assert.equal(a.engine.state.issues[0].takeId,'first');assert.equal(server.files.size,2);assert.equal(a.store.rows.get('first').cloud.pending,true);
 const originalIDs=[...server.files.keys()];await a.engine.sync();assert.deepEqual([...server.files.keys()],originalIDs);assert.equal(a.store.rows.size,2);assert.equal(a.engine.state.status,'error');
});

test('trim revision uploads new bytes while preserving the local record ID and excluding its old backup',async t=>{
 const server=syntheticDrive(),a=device(t,server,[recording()]);await a.engine.sync();
 const old=a.store.rows.get('take-1');a.store.ignoredKeys.add('synthetic-owner.synthetic-book.take-1');
 a.store.rows.set(old.id,{...old,mediaTakeId:'trim-revision',cloud:undefined,durationMs:1000,blob:new Blob(['trimmed audio'],{type:'audio/webm'})});
 await a.engine.sync();assert.equal(a.engine.state.status,'saved',a.engine.state.error);await a.engine.sync();assert.equal(a.engine.state.status,'saved',a.engine.state.error);
 assert.equal(a.store.rows.size,1);assert.equal(a.store.rows.get(old.id).title,old.title);assert.equal(a.store.rows.get(old.id).cloud.sha256,await mediaHash(a.store.rows.get(old.id).blob));assert.equal(server.files.size,2);
});
