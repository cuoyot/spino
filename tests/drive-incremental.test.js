import test from 'node:test';
import assert from 'node:assert/strict';
import {createIncrementalNotebookAdapter} from '../src/companion/drive-incremental.js';
import {createDriveNotebookAdapter} from '../src/companion/drive-notebook.js';
import {syntheticNotebookDrive} from './fixtures/drive/notebook-server.js';
import {cloudRecoveryFixture} from '../scripts/review/cloud-recovery-fixture.mjs';
import {createNotebookCloud} from '../src/companion/cloud-sync.js';
import {createCloudBackup} from '../src/companion/cloud-backup.js';
const fixture=()=>cloudRecoveryFixture('en');
function device(server,{account='synthetic-owner',initial={}}={}){
 let settings=structuredClone(initial),recovery=null;const values=new Map(),native=server.native(account);
 const options={native,recovery:{saveRecovery:async({text})=>{recovery=text;},readRecovery:async()=>({text:recovery})},settings:{read:()=>settings,save:v=>{settings=structuredClone(v);}},journal:{clear:async()=>values.clear(),get:async k=>structuredClone(values.get(k)),set:async(k,v)=>{values.set(k,structuredClone(v));}}};
 return {adapter:createIncrementalNotebookAdapter(options),restart:()=>createIncrementalNotebookAdapter(options),settings:()=>structuredClone(settings),recovery:()=>recovery,values,options};
}
const roots=server=>[...server.files.values()].filter(f=>f.appProperties?.spinoType==='spino-notebook-v2');
const commits=server=>[...server.files.values()].filter(f=>f.appProperties?.spinoType==='spino-commit-v2');
const load=async adapter=>JSON.parse((await adapter.readLinked()).text);
async function pair(server){const a=device(server),b=device(server);await a.adapter.connect();await a.adapter.create({text:JSON.stringify(fixture())});b.adapter.choose(roots(server)[0].id);await b.adapter.pickBackup();return {a,b};}

test('incremental notebook preserves stable IDs, PDF bytes and annotations, with separate bounded objects',async()=>{
 const server=syntheticNotebookDrive(),{a,b}=await pair(server),remote=await load(b.adapter),original=fixture();
 assert.deepEqual(remote.assets,original.assets);assert.deepEqual(remote.data.works,original.data.works);assert.equal(remote.cloudBackup.sharedNotebookId,original.cloudBackup.sharedNotebookId);
 assert.equal(roots(server).length,1);assert.equal(commits(server).length,1);
 const transfer=server.requests.filter(r=>r.method==='POST'&&r.path.includes('multipart'));assert.ok(transfer.length>2);assert.ok(transfer.every(r=>new TextEncoder().encode(r.text).length<1048576));
 assert.ok(!commits(server)[0].text.includes(original.assets[0].base64));
 assert.deepEqual(JSON.parse((await a.restart().readLinked()).text).assets,original.assets);
 assert.deepEqual(await device(server,{account:'another-owner'}).adapter.list(),[]);
});

test('unchanged warm and restarted polls transfer only the changes cursor and never objects or uploads',async()=>{
 const server=syntheticNotebookDrive(),a=device(server);await a.adapter.create({text:JSON.stringify(fixture())});await a.adapter.readLinked();
 const start=server.requests.length;for(let n=0;n<5;n++)await a.adapter.readLinked();await a.restart().readLinked();
 const requests=server.requests.slice(start);assert.equal(requests.length,6);assert.ok(requests.every(r=>r.path.startsWith('/drive/v3/changes?')&&r.method==='GET'));
 const before=await a.adapter.readLinked(),count=commits(server).length;await a.adapter.write({text:before.text,expectedHash:before.hash});assert.equal(commits(server).length,count);
});

test('one note uploads a small record change and never retransfers unchanged score content',async()=>{
 const server=syntheticNotebookDrive(),a=device(server),original=fixture();original.assets[0].base64=Buffer.concat([Buffer.from(original.assets[0].base64,'base64'),Buffer.from('\n%'+ 'padding'.repeat(180000))]).toString('base64');
 await a.adapter.create({text:JSON.stringify(original)});const before=await a.adapter.readLinked(),next=JSON.parse(before.text);next.data.works[0].notes='A small saved note';
 const start=server.requests.length;await a.adapter.write({text:JSON.stringify(next),expectedHash:before.hash});const uploads=server.requests.slice(start).filter(r=>r.method==='POST'&&r.path.includes('multipart'));
 assert.equal(uploads.length,2);assert.ok(uploads.every(r=>r.text.length<5000));assert.deepEqual((await load(a.restart())).assets,original.assets);
});

test('lost upload responses reuse their allocated ID after restart and do not duplicate a commit',async()=>{
 const server=syntheticNotebookDrive(),a=device(server);server.dropMediaResponse=true;
 await assert.rejects(a.adapter.create({text:JSON.stringify(fixture())}),/lost upload/);
 await a.restart().create({text:JSON.stringify(fixture())});assert.equal(roots(server).length,1);assert.equal(commits(server).length,1);
 const before=await a.adapter.readLinked(),next=JSON.parse(before.text);next.data.works[0].notes='Saved before response was lost';
 server.beforeCommit=()=>{server.dropMediaResponse=true;server.beforeCommit=null;};
 await assert.rejects(a.adapter.write({text:JSON.stringify(next),expectedHash:before.hash}),/lost upload/);
 const restarted=a.restart(),current=await restarted.readLinked(),count=commits(server).length;
 await restarted.write({text:JSON.stringify(next),expectedHash:current.hash});assert.equal(commits(server).length,count);assert.equal((await load(restarted)).data.works[0].notes,next.data.works[0].notes);
});

async function concurrent(server,a,b,left,right){
 const ar=await a.adapter.readLinked(),br=await b.adapter.readLinked(),av=JSON.parse(ar.text),bv=JSON.parse(br.text);left(av);right(bv);
 let arrivals=0,release;const barrier=new Promise(r=>release=r);server.beforeCommit=async()=>{arrivals++;if(arrivals===2)release();await barrier;};
 await Promise.all([a.adapter.write({text:JSON.stringify(av),expectedHash:ar.hash}),b.adapter.write({text:JSON.stringify(bv),expectedHash:br.hash})]);server.beforeCommit=null;
}
test('two simultaneous writers retain independent fields without a shared mutable manifest',async()=>{
 const server=syntheticNotebookDrive(),{a,b}=await pair(server);
 await concurrent(server,a,b,v=>v.data.works[0].notes='Device A',v=>v.data.works[0].bpm=90);
 for(const d of [a,b]){const r=await d.adapter.readLinked(),v=JSON.parse(r.text);assert.deepEqual(r.conflicts,[]);assert.equal(v.data.works[0].notes,'Device A');assert.equal(v.data.works[0].bpm,90);}
 assert.equal(commits(server).length,3);assert.ok(!server.requests.some(r=>r.method==='PUT'));
});

test('concurrent overlapping edits require review and a resolution commit is idempotent',async()=>{
 const server=syntheticNotebookDrive(),{a,b}=await pair(server);
 await concurrent(server,a,b,v=>v.data.works[0].notes='Device A',v=>v.data.works[0].notes='Device B');
 const remote=await a.adapter.readLinked();assert.ok(remote.conflicts.some(p=>p.includes('notes')));
 const value=JSON.parse(remote.text);value.data.works[0].notes='Explicitly reviewed';
 await a.adapter.write({text:JSON.stringify(value),expectedHash:remote.hash});
 const resolved=await b.adapter.readLinked();assert.deepEqual(resolved.conflicts,[]);assert.equal(JSON.parse(resolved.text).data.works[0].notes,'Explicitly reviewed');
 const count=commits(server).length;await b.adapter.write({text:resolved.text,expectedHash:resolved.hash});assert.equal(commits(server).length,count);
});

test('migration preserves the entire old file, pauses old clients and redirects a second old-format device',async()=>{
 const server=syntheticNotebookDrive(),old=device(server),v1=createDriveNotebookAdapter(old.options),original=fixture();await v1.connect();await v1.create({text:JSON.stringify(original),name:'Original musical title.json'});
 const initial=old.settings(),oldID=initial.link.id,oldText=server.files.get(oldID).text,a=device(server,{initial}),b=device(server,{initial});
 const migrated=await a.adapter.readLinked();assert.deepEqual(JSON.parse(migrated.text).assets,original.assets);assert.equal(server.files.get(oldID).text,oldText);assert.equal(server.files.get(oldID).appProperties.spinoType,'spino-notebook-archive-v1');assert.equal(roots(server).length,1);
 await assert.rejects(v1.readLinked(),{code:'INVALID_NOTEBOOK'});
 const count=commits(server).length;assert.deepEqual((await load(b.adapter)).data.works,original.data.works);assert.equal(commits(server).length,count);assert.equal(b.settings().link.rootId,oldID);assert.ok(a.recovery());
});

test('an interrupted migration retries existing objects and never activates a stale legacy snapshot',async()=>{
 const server=syntheticNotebookDrive(),old=device(server),v1=createDriveNotebookAdapter(old.options);await v1.create({text:JSON.stringify(fixture())});const initial=old.settings(),id=initial.link.id,a=device(server,{initial});
 server.beforePatch=file=>{if(file.id===id){const value=JSON.parse(file.text);value.data.works[0].notes='Legacy edit during migration';file.text=JSON.stringify(value);file.revision++;server.touch(file);}};
 await assert.rejects(a.adapter.readLinked(),{code:'CONFLICT'});assert.equal(server.files.get(id).appProperties.spinoType,'spino-notebook-v1');assert.ok(roots(server).every(f=>f.appProperties.ready==='0'));
 const visible=await a.adapter.list();assert.equal(visible.length,1);assert.equal(visible[0].id,id);
 const retried=a.restart();assert.equal((await load(retried)).data.works[0].notes,'Legacy edit during migration');assert.equal(roots(server).length,1);assert.equal(server.files.get(id).appProperties.spinoType,'spino-notebook-archive-v1');
});

test('offline and rejected access leave local linkage and recovery intact',async()=>{
 const server=syntheticNotebookDrive(),a=device(server);await a.adapter.create({text:JSON.stringify(fixture())});const before=a.settings();server.offline=true;
 await assert.rejects(a.adapter.readLinked());assert.deepEqual(a.settings(),before);server.offline=false;server.revoked=true;await assert.rejects(a.adapter.readLinked(),{code:'PERMISSION_REQUIRED'});assert.deepEqual(a.settings(),before);
});

test('cloud engine exposes and resolves remote graph conflicts through the existing review flow',async t=>{
 const server=syntheticNotebookDrive(),{a,b}=await pair(server);let local=fixture(),base=structuredClone(local),meta={mode:'sync',enabled:true,name:'Notebook',notebookId:local.cloudBackup.sharedNotebookId};
 await concurrent(server,a,b,v=>v.data.works[0].notes='Device A',v=>v.data.works[0].notes='Device B');
 local.data.works[0].notes='Device A';
 const e=createNotebookCloud({adapter:a.adapter,delay:100000,settings:{read:()=>meta,save:v=>{meta=structuredClone(v);}},snapshot:async()=>JSON.stringify(local),eligible:()=>true,readBase:async()=>base,saveBase:async v=>{base=structuredClone(v);},apply:async text=>{local=JSON.parse(text);},backupFactory:o=>createCloudBackup({...o,settings:{read:()=>null,save:()=>{}}})});t.after(()=>e.stop());
 await e.sync();assert.equal(e.state.status,'conflict',e.state.error);await e.resolve('local');assert.equal(e.state.status,'saved',e.state.error);assert.equal((await load(b.adapter)).data.works[0].notes,'Device A');assert.deepEqual((await b.adapter.readLinked()).conflicts,[]);
});

test('interrupted migration reuses its verified old snapshot and score pieces when the old revision is unchanged',async()=>{
 const server=syntheticNotebookDrive(),old=device(server),v1=createDriveNotebookAdapter(old.options);await v1.create({text:JSON.stringify(fixture())});const initial=old.settings(),id=initial.link.id,a=device(server,{initial});
 server.beforeCommit=()=>{server.beforeCommit=null;throw Error('Interrupted before atomic commit');};
 await assert.rejects(a.adapter.readLinked(),/Interrupted/);const count=server.requests.length;
 await a.restart().readLinked();const retry=server.requests.slice(count);
 assert.ok(!retry.some(r=>r.path===`/drive/v3/files/${id}?alt=media`));
 assert.ok(!retry.filter(r=>r.method==='POST'&&r.path.includes('multipart')).some(r=>r.text.includes('score-bytes')));
});

test('an archive acknowledgement lost after migration is recoverable without new uploads',async()=>{
 const server=syntheticNotebookDrive(),old=device(server),v1=createDriveNotebookAdapter(old.options);await v1.create({text:JSON.stringify(fixture())});const initial=old.settings(),id=initial.link.id,a=device(server,{initial}),request=a.options.native.request;
 let dropped=false;a.options.native.request=async options=>{const r=await request(options);if(!dropped&&options.method==='PUT'&&options.path.startsWith(`/drive/v2/files/${id}?`)){dropped=true;throw Error('Archive response lost');}return r;};
 await assert.rejects(a.adapter.readLinked(),/Archive response lost/);const count=server.requests.length;
 const visible=await a.restart().list();assert.equal(visible.length,1);assert.equal(visible[0].appProperties.spinoType,'spino-notebook-v2');
 const current=a.restart();await current.readLinked();assert.equal(commits(server).length,1);assert.ok(!server.requests.slice(count).some(r=>r.method==='POST'));
});

test('delete versus edit is an explicit conflict and choosing the edit keeps the original identity',async()=>{
 const server=syntheticNotebookDrive(),{a,b}=await pair(server);
 await concurrent(server,a,b,v=>v.data.works=[],v=>v.data.works[0].notes='Retain this edit');
 const r=await b.adapter.readLinked();assert.ok(r.conflicts.some(p=>p.includes('synthetic-work')));
 const edited=fixture();edited.data.works[0].notes='Retain this edit';await b.adapter.write({text:JSON.stringify(edited),expectedHash:r.hash});
 const saved=await load(a.adapter);assert.equal(saved.data.works[0].id,'synthetic-work');assert.equal(saved.data.works[0].notes,'Retain this edit');
});

test('changed or missing immutable remote objects fail integrity/discovery without adopting partial data',async()=>{
 const server=syntheticNotebookDrive(),a=device(server);await a.adapter.create({text:JSON.stringify(fixture())});
 const object=[...server.files.values()].find(f=>f.appProperties?.spinoType==='spino-object-v2'&&JSON.parse(f.text).kind==='score-bytes');
 object.text=object.text.replace('JVBER','AVBER');object.revision++;server.touch(object);
 await assert.rejects(a.adapter.readLinked(),{code:'INTEGRITY'});assert.ok(a.settings().link);
 const b=device(server);b.adapter.choose(roots(server)[0].id);await assert.rejects(b.adapter.pickBackup(),{code:'INTEGRITY'});
});

test('large records remain unchanged across restart and do not create repeated change batches',async()=>{
 const server=syntheticNotebookDrive(),a=device(server),value=fixture();value.data.preferences.photo='data:image/png;base64,'+'A'.repeat(180000);
 await a.adapter.create({text:JSON.stringify(value)});const reopened=a.restart(),before=await reopened.readLinked(),count=commits(server).length;
 await reopened.write({text:before.text,expectedHash:before.hash});assert.equal(commits(server).length,count);assert.equal(JSON.parse(before.text).data.preferences.photo,value.data.preferences.photo);
});

test('quiet polling does not rewrite the durable catalog or cached objects',async()=>{
 const server=syntheticNotebookDrive(),a=device(server);await a.adapter.create({text:JSON.stringify(fixture())});await a.adapter.readLinked();
 let writes=0;const save=a.options.journal.set;a.options.journal.set=async(k,v)=>{writes++;return save(k,v);};
 for(let n=0;n<10;n++)await a.adapter.readLinked();assert.equal(writes,0);
 const before=a.settings();assert.ok(before.link.format==='spino-notebook-v2');
});

test('first setup retains a notebook identity before any transfer and automatic migration preserves the merge baseline',async()=>{
 const server=syntheticNotebookDrive(),a=device(server);server.dropMediaResponse=true;await assert.rejects(a.adapter.create({text:JSON.stringify(fixture())}));assert.equal(a.adapter.pendingNotebookId(),fixture().cloudBackup.sharedNotebookId);
 const old=device(server),v1=createDriveNotebookAdapter(old.options);await v1.create({text:JSON.stringify(fixture())});const next=device(server,{initial:old.settings()});await next.adapter.readLinked();assert.equal((await next.adapter.status()).setupPending,false);
});

test('server checksums avoid downloading our own uploaded score pieces; absent checksums use verified readback',async()=>{
 const server=syntheticNotebookDrive();server.includeChecksum=true;const a=device(server);await a.adapter.create({text:JSON.stringify(fixture())});
 const objectIDs=new Set([...server.files.values()].filter(f=>f.appProperties?.spinoType==='spino-object-v2').map(f=>f.id));
 assert.ok(!server.requests.some(r=>r.path.includes('alt=media')&&objectIDs.has(r.path.split('/').pop().split('?')[0])));
 assert.deepEqual((await load(a.restart())).assets,fixture().assets);
});

test('quiet automatic polling avoids serializing the full unchanged local notebook',async t=>{
 const server=syntheticNotebookDrive(),a=device(server);let local=fixture(),base=null,meta={},snapshots=0;
 const e=createNotebookCloud({adapter:a.adapter,delay:15,settings:{read:()=>meta,save:v=>{meta=structuredClone(v);}},snapshot:async()=>{snapshots++;return JSON.stringify(local);},eligible:()=>true,readBase:async()=>base,saveBase:async v=>{base=structuredClone(v);},apply:async text=>{local=JSON.parse(text);},backupFactory:o=>createCloudBackup({...o,settings:{read:()=>null,save:()=>{}}})});t.after(()=>e.stop());
 await e.createShared();const initial=snapshots,start=server.requests.length;await new Promise(resolve=>setTimeout(resolve,80));e.stop();assert.equal(snapshots,initial);assert.ok(server.requests.length>start);assert.ok(server.requests.slice(start).every(r=>r.path.startsWith('/drive/v3/changes?')));
});

test('ordinary disconnect retains retry/cache data and explicit notebook erasure clears it',async()=>{
 const server=syntheticNotebookDrive(),a=device(server);await a.adapter.create({text:JSON.stringify(fixture())});const files=server.files.size;assert.ok(a.values.size>0);await a.adapter.disconnect();assert.ok(a.values.size>0);assert.equal(server.files.size,files);await a.adapter.clearDeviceCache();assert.equal(a.values.size,0);assert.equal(server.files.size,files);
});

test('duplicate and out-of-order discovery replays the same graph once; missing dependencies block adoption',async()=>{
 const server=syntheticNotebookDrive(),a=device(server);await a.adapter.create({text:JSON.stringify(fixture())});
 const original=await a.adapter.readLinked(),edited=JSON.parse(original.text);edited.data.works[0].notes='Discovered once';await a.adapter.write({text:JSON.stringify(edited),expectedHash:original.hash});
 server.changes=[...server.changes.reverse(),...structuredClone(server.changes)];
 const b=device(server);b.adapter.choose(roots(server)[0].id);await b.adapter.pickBackup();assert.equal((await load(b.adapter)).data.works[0].notes,'Discovered once');assert.deepEqual((await b.adapter.readLinked()).conflicts,[]);
 const count=commits(server).length,unchanged=await b.adapter.readLinked();await b.adapter.write({text:unchanged.text,expectedHash:unchanged.hash});assert.equal(commits(server).length,count);
 const missing=[...server.files.values()].find(f=>f.appProperties?.spinoType==='spino-object-v2'&&JSON.parse(f.text).kind==='score-bytes');server.files.delete(missing.id);
 const c=device(server);c.adapter.choose(roots(server)[0].id);await assert.rejects(c.adapter.pickBackup(),error=>['FILE_UNAVAILABLE','INCOMPLETE'].includes(error.code));
});
