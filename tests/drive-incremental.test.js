import test from 'node:test';
import assert from 'node:assert/strict';
import {createIncrementalNotebookAdapter} from '../src/companion/drive-incremental.js';
import {createDriveNotebookAdapter} from '../src/companion/drive-notebook.js';
import {syntheticNotebookDrive} from './fixtures/drive/notebook-server.js';
import {cloudRecoveryFixture} from '../scripts/review/cloud-recovery-fixture.mjs';
import {createNotebookCloud} from '../src/companion/cloud-sync.js';
import {createCloudBackup} from '../src/companion/cloud-backup.js';
import {block,beginSession,saveSession} from '../src/companion/model.js';
const fixture=()=>cloudRecoveryFixture('en');
function device(server,{account='synthetic-owner',initial={},fastReads=false}={}){
 let settings=structuredClone(initial),recovery=null;const values=new Map(),native=server.native(account);
 const options={native,fastReads,recovery:{saveRecovery:async({text})=>{recovery=text;},readRecovery:async()=>({text:recovery})},settings:{read:()=>settings,save:v=>{settings=structuredClone(v);}},journal:{clear:async()=>values.clear(),get:async k=>structuredClone(values.get(k)),set:async(k,v)=>{values.set(k,structuredClone(v));}}};
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

test('choosing local conflicting notes retains an independent remote tempo in that same piece',async()=>{
 const server=syntheticNotebookDrive(),{a,b}=await pair(server);
 await concurrent(server,a,b,v=>v.data.works[0].notes='Local conflicting note',v=>{v.data.works[0].notes='Cloud conflicting note';v.data.works[0].bpm=96;});
 const remote=await a.adapter.readLinked(),local=fixture();local.data.works[0].notes='Local conflicting note';
 const resolved=JSON.parse(await a.adapter.resolveRemote({local:JSON.stringify(local),merged:remote.text,preference:'local',expectedHash:remote.hash}));
 assert.equal(resolved.data.works[0].notes,'Local conflicting note');assert.equal(resolved.data.works[0].bpm,96);
});
test('both fully saved offline practices survive either conflict choice on the same shared plan',async()=>{
 for(const preference of ['local','remote']){
  const server=syntheticNotebookDrive(),a=device(server),b=device(server),initial=fixture(),plan={id:'shared-plan',title:'Shared practice plan',context:'piano',date:'2026-10-17',time:'10:00',status:'planned',blocks:[block('repertoire',{workId:'synthetic-work'})]};initial.data.plans.push(plan);
  await a.adapter.create({text:JSON.stringify(initial)});b.adapter.choose(roots(server)[0].id);await b.adapter.pickBackup();let left;
  const save=(value,title,now)=>{const active=beginSession({...plan,planId:plan.id},now);active.elapsedMs=active.blockElapsedMs=120000;saveSession(value.data,active,{title},now+120000);return value;};
  await concurrent(server,a,b,v=>{save(v,'Phone practice',Date.parse('2026-10-17T10:00:00Z'));left=structuredClone(v);},v=>save(v,'Tablet practice',Date.parse('2026-10-17T11:00:00Z')));
  const remote=await a.adapter.readLinked();assert.ok(remote.conflicts.some(p=>p.includes('sessionId')));assert.equal(JSON.parse(remote.text).data.sessions.length,2);
  const resolved=JSON.parse(await a.adapter.resolveRemote({local:JSON.stringify(left),merged:remote.text,preference,expectedHash:remote.hash}));assert.equal(resolved.data.sessions.length,2);assert.deepEqual(new Set(resolved.data.sessions.map(s=>s.title)),new Set(['Phone practice','Tablet practice']));
  await a.adapter.write({text:JSON.stringify(resolved),expectedHash:remote.hash});const after=await load(b.restart());assert.equal(after.data.sessions.length,2);assert.deepEqual(after.assets,initial.assets);assert.deepEqual((await b.adapter.readLinked()).conflicts,[]);
 }
});

test('a reviewed original local field can win without reverting another remote field',async()=>{
 const server=syntheticNotebookDrive(),{a,b}=await pair(server),original=fixture();
 await concurrent(server,a,b,v=>v.data.works[0].notes='First edit',v=>{v.data.works[0].notes='Second edit';v.data.works[0].bpm=108;});
 const remote=await a.adapter.readLinked(),resolved=JSON.parse(await a.adapter.resolveRemote({local:JSON.stringify(original),merged:remote.text,preference:'local',expectedHash:remote.hash}));assert.equal(resolved.data.works[0].notes,original.data.works[0].notes);assert.equal(resolved.data.works[0].bpm,108);
});

test('choosing one conflicting annotation retains an independently added annotation and original score bytes',async()=>{
 const server=syntheticNotebookDrive(),{a,b}=await pair(server),original=fixture();
 await concurrent(server,a,b,v=>v.assets[0].annotations.marks[0].text='1',v=>{v.assets[0].annotations.marks[0].text='2';v.assets[0].annotations.marks.push({...v.assets[0].annotations.marks[0],id:'independent-mark',text:'4'});});
 const remote=await a.adapter.readLinked(),local=fixture();local.assets[0].annotations.marks[0].text='1';
 const resolved=JSON.parse(await a.adapter.resolveRemote({local:JSON.stringify(local),merged:remote.text,preference:'local',expectedHash:remote.hash}));
 assert.equal(resolved.assets[0].annotations.marks.length,2);assert.equal(resolved.assets[0].annotations.marks.find(m=>m.id==='synthetic-mark').text,'1');assert.equal(resolved.assets[0].annotations.marks.find(m=>m.id==='independent-mark').text,'4');assert.equal(resolved.assets[0].base64,original.assets[0].base64);
});

test('a tablet practice retries uncertain incremental uploads and reaches the phone once without changing scores',async t=>{
 for(const lostResponse of [false,true]){
  const server=syntheticNotebookDrive(),tablet=device(server);let local=fixture(),base=null,meta={};
  const engine=createNotebookCloud({adapter:tablet.adapter,delay:15,settings:{read:()=>meta,save:v=>{meta=structuredClone(v);}},snapshot:async()=>JSON.stringify(local),eligible:()=>true,readBase:async()=>base,saveBase:async v=>{base=structuredClone(v);},apply:async text=>{local=JSON.parse(text);},backupFactory:o=>createCloudBackup({...o,settings:{read:()=>null,save:()=>{}}})});t.after(()=>engine.stop());
  await engine.createShared();const phone=device(server);phone.adapter.choose(roots(server)[0].id);await phone.adapter.pickBackup();const initial=await load(phone.adapter),before=commits(server).length;
  const active=beginSession({title:'Tablet practice after network loss',context:'piano',blocks:[block('repertoire',{workId:'synthetic-work'})]});active.elapsedMs=active.blockElapsedMs=300000;const saved=saveSession(local.data,active,{notes:'Keep teacher feedback',mood:4});engine.markDirty();
  let failures=0;server.beforeCommit=()=>{server.beforeCommit=null;failures++;if(lostResponse)server.dropMediaResponse=true;else throw Object.assign(Error('The Drive server could not be reached. Check the connection and retry.'),{code:'PROVIDER_ERROR'});};
  await engine.sync();assert.equal(engine.state.status,'error');assert.equal(engine.state.retryable,true);assert.equal(local.data.sessions.filter(s=>s.id===saved.id).length,1);
  if(!lostResponse)assert.equal((await load(phone.adapter)).data.sessions.some(s=>s.id===saved.id),false,'Phone can be up to date while tablet has not uploaded its pending practice');
  for(let n=0;n<100&&engine.state.status!=='saved';n++)await new Promise(r=>setTimeout(r,10));assert.equal(engine.state.status,'saved');assert.equal(failures,1);assert.equal(commits(server).length,before+1);
  const received=await load(phone.restart());assert.equal(received.data.sessions.filter(s=>s.id===saved.id).length,1);assert.equal(received.data.sessions.find(s=>s.id===saved.id).notes,'Keep teacher feedback');assert.deepEqual(received.assets,initial.assets);assert.deepEqual(received.data.works,initial.data.works);engine.stop();
 }
});

test('pause releases a stalled incremental read and an uncached late response cannot overwrite newer practice',async t=>{
 const server=syntheticNotebookDrive(),a=device(server);await a.adapter.create({text:JSON.stringify(fixture())});const b=device(server);b.adapter.choose(roots(server)[0].id);await b.adapter.pickBackup();
 const native=a.options.native,request=native.request;let release,entered,stall=true;const started=new Promise(r=>entered=r);native.request=async options=>{if(stall&&options.path.startsWith('/drive/v3/changes?')){entered();await new Promise(r=>release=r);}return request(options);};
 const stale=a.adapter.readLinked();await started;a.adapter.cancelPending();await assert.rejects(stale,e=>e.code==='CANCELLED');stall=false;
 const original=await b.adapter.readLinked(),updated=JSON.parse(original.text);const active=beginSession({title:'New tablet practice',context:'piano',blocks:[block('free')]});active.elapsedMs=active.blockElapsedMs=120000;const saved=saveSession(updated.data,active);await b.adapter.write({text:JSON.stringify(updated),expectedHash:original.hash});
 const received=await a.adapter.readLinked();assert.ok(JSON.parse(received.text).data.sessions.some(s=>s.id===saved.id));release();await new Promise(r=>setTimeout(r,0));assert.deepEqual(await a.adapter.readLinked(),received);
});

test('legacy current-practice conflicts cannot block completed history or erase the phone in-progress session',async t=>{
 const {backupHash}=await import('../src/companion/cloud-backup.js'),{stableJSON}=await import('../src/companion/cloud-merge.js');
 const server=syntheticNotebookDrive(),tablet=device(server);await tablet.adapter.create({text:JSON.stringify(fixture())});const phone=device(server);phone.adapter.choose(roots(server)[0].id);await phone.adapter.pickBackup();
 const root=JSON.parse(roots(server)[0].text);
 // Recreate old-client commits without running the new transport normalization.
 const oldCommit=async(before,changes)=>{
  const put=async(value,commit=false)=>{const text=stableJSON(value),hash=await backupHash(text),id='old-client-'+server.nextID++,file={id,owner:'synthetic-owner',name:'Old client fixture',mimeType:'application/json',text,revision:1,appProperties:{spinoType:commit?'spino-commit-v2':'spino-object-v2',rootId:root.rootId,notebookId:root.notebookId,hash}};server.files.set(id,file);server.checksums.set(id,hash);server.touch(file);return hash;};
  const part=await put({kind:'record-changes',changes:changes.map(c=>({...c,previous:before.versions[c.key]||[]}))});await put({format:'spino-notebook-v2',rootId:root.rootId,notebookId:root.notebookId,parents:before.heads,parts:[part]},true);
 };
 const paused=beginSession({title:'Phone pending repertoire',context:'piano',blocks:[block('repertoire',{workId:'synthetic-work'})]});paused.elapsedMs=paused.blockElapsedMs=60000;
 let before=await tablet.adapter.readLinked();const oldHeader=structuredClone(before.records.header);oldHeader.data.active=paused;await oldCommit(before,[{key:'header',value:oldHeader}]);before=await tablet.adapter.readLinked();
 const tabletLocal=JSON.parse(before.text),phoneLocal=JSON.parse(before.text),oldBase=JSON.parse(before.text);tabletLocal.data.active=null;
 const practice=beginSession({title:'Tablet completed repertoire',context:'piano',blocks:[block('repertoire',{workId:'synthetic-work'})]});practice.elapsedMs=practice.blockElapsedMs=31*60000;const saved=saveSession(tabletLocal.data,practice);
 const finishedHeader=structuredClone(before.records.header);finishedHeader.data.active=null;
 await oldCommit(before,[{key:'header',value:finishedHeader},{key:'data/sessions/'+saved.id,value:saved},{key:'order/sessions',value:{idKey:'id',ids:tabletLocal.data.sessions.map(s=>s.id)}}]);
 const updatedHeader=structuredClone(oldHeader);updatedHeader.data.active.elapsedMs=updatedHeader.data.active.blockElapsedMs=120000;phoneLocal.data.active=structuredClone(updatedHeader.data.active);await oldCommit(before,[{key:'header',value:updatedHeader}]);
 const conflicted=await tablet.adapter.readLinked();assert.ok(conflicted.conflicts.includes('/header/data/active'));
 const engine=(device,initial,initialActive)=>{let local=structuredClone(initial),base=structuredClone(oldBase),meta={mode:'sync',enabled:true,status:'conflict',conflicts:conflicted.conflicts,name:'Synthetic shared notebook',notebookId:root.notebookId};const e=createNotebookCloud({adapter:device.adapter,delay:100000,settings:{read:()=>meta,save:v=>meta=structuredClone(v)},snapshot:async()=>JSON.stringify(local),eligible:()=>true,readBase:async()=>base,saveBase:async v=>base=structuredClone(v),apply:async text=>{local=JSON.parse(text);local.data.active=structuredClone(initialActive);},backupFactory:o=>createCloudBackup({...o,settings:{read:()=>null,save:()=>{}}})});t.after(()=>e.stop());return {e,get:()=>local};};
 const a=engine(tablet,tabletLocal,null);await a.e.init();assert.equal(a.e.state.status,'pending');await a.e.sync();assert.equal(a.e.state.status,'saved');assert.equal(a.get().data.active,null);
 const b=engine(phone,phoneLocal,phoneLocal.data.active);await b.e.init();await b.e.sync();assert.equal(b.e.state.status,'saved');assert.deepEqual(b.get().data.active,phoneLocal.data.active);assert.ok(b.get().data.sessions.some(s=>s.id===saved.id));assert.deepEqual(b.get().assets,oldBase.assets);assert.equal((await phone.adapter.readLinked()).conflicts.length,0);
 assert.deepEqual((await load(tablet.adapter)).data.active,null,'New shared snapshots do not share the current-session slot');
});

test('joining and explicit refresh discover saved history absent from the changes feed',async()=>{
 const server=syntheticNotebookDrive(),a=device(server);await a.adapter.create({text:JSON.stringify(fixture())});
 const before=await a.adapter.readLinked(),next=JSON.parse(before.text);next.data.works[0].notes='Recent tablet practice notes';
 const active=beginSession({title:'Tablet weekly practice',context:'piano',blocks:[block('repertoire',{workId:'synthetic-work'})]});active.elapsedMs=active.blockElapsedMs=7620000;const saved=saveSession(next.data,active,{notes:'Preserve this weekly practice',mood:4});
 await a.adapter.write({text:JSON.stringify(next),expectedHash:before.hash});
 const b=device(server),request=b.options.native.request;
 b.options.native.request=async options=>{
  const response=await request(options);
  if(options.path.startsWith('/drive/v3/changes?')){const data=JSON.parse(response.text);data.changes=[];return {...response,text:JSON.stringify(data)};}
  return response;
 };
 b.adapter.choose(roots(server)[0].id);await b.adapter.pickBackup();
 assert.equal((await load(b.adapter)).data.works[0].notes,'Recent tablet practice notes');
 assert.deepEqual((await load(b.adapter)).data.sessions.find(s=>s.id===saved.id),saved);
 const latest=await a.adapter.readLinked(),updated=JSON.parse(latest.text);updated.data.works[0].notes='Another saved tablet change';
 await a.adapter.write({text:JSON.stringify(updated),expectedHash:latest.hash});
 const count=commits(server).length;
 const refreshed=JSON.parse((await b.adapter.readLinked({fullScan:true})).text);
 assert.equal(refreshed.data.works[0].notes,'Another saved tablet change');
 assert.deepEqual(refreshed.assets,next.assets);assert.equal(commits(server).length,count);
 assert.equal(refreshed.data.sessions.filter(s=>s.id===saved.id).length,1);
 const originalRequest=b.options.native.request;
 b.options.native.request=async options=>{if(options.path.startsWith('/drive/v3/files?'))return {status:503,text:''};return originalRequest(options);};
 await assert.rejects(b.adapter.readLinked({fullScan:true}),{code:'PROVIDER_ERROR'});
 assert.equal((await load(b.adapter)).data.sessions.filter(s=>s.id===saved.id).length,1);
});

test('rename changes only the selected descriptor and previews never connect or mutate notebooks',async()=>{
 const server=syntheticNotebookDrive(),{a,b}=await pair(server),before=await a.adapter.readLinked();
 const original=a.settings().link,objects=[...server.files.values()].map(f=>[f.id,f.text]),commitCount=commits(server).length;
 await a.adapter.rename('Tablet practice — October');
 assert.equal(server.files.get(original.id).name,'Tablet practice — October');
 assert.equal(a.settings().link.id,original.id);assert.equal(a.adapter.info.fileId,original.id);
 assert.deepEqual([...server.files.values()].map(f=>[f.id,f.text]),objects);
 assert.equal((await a.adapter.readLinked()).text,before.text);assert.equal(commits(server).length,commitCount);
 const disconnected=device(server),state=disconnected.settings(),count=server.files.size;
 const summary=await disconnected.adapter.describe(original.id);
 assert.equal(summary.sessions.length,JSON.parse(before.text).data.sessions.length);
 assert.deepEqual(disconnected.settings(),state);assert.equal(server.files.size,count);
 b.adapter.choose(original.id);await assert.rejects(b.adapter.pickBackup({expectedNotebookId:original.notebookId,expectedFileId:'wrong-file'}));
 assert.equal(b.settings().link.id,original.id);
 server.offline=true;await assert.rejects(a.adapter.rename('Unavailable rename'));assert.equal(a.settings().link.name,'Tablet practice — October');
});


test('fast checkpoint joins keep history visible without fetching any score bytes and accept old-client edits',async()=>{
 const server=syntheticNotebookDrive(),writer=device(server),original=fixture();
 await writer.adapter.create({text:JSON.stringify(original)});
 for(let n=0;n<5;n++){const before=await writer.adapter.readLinked(),value=JSON.parse(before.text);value.data.works[0].notes='Edit '+n;await writer.adapter.write({text:JSON.stringify(value),expectedHash:before.hash});}
 const prepared=await writer.adapter.prepareCheckpoint();assert.equal(prepared.created,true);
 const reader=device(server,{fastReads:true});reader.adapter.choose(roots(server)[0].id);
 const start=server.requests.length,result=await reader.adapter.pickBackup({}),backup=JSON.parse(result.text);
 assert.equal(backup.data.works[0].notes,'Edit 4');assert.equal(backup.assets[0].base64,undefined);assert.ok(backup.assets[0].remoteContent.parts.length);
 const scoreIds=new Set([...server.files.values()].filter(f=>{try{return JSON.parse(f.text).kind==='score-bytes';}catch{return false;}}).map(f=>f.id));
 assert.ok(!server.requests.slice(start).some(r=>[...scoreIds].some(id=>r.path.includes('/'+id+'?alt=media'))));
 const reads=server.requests.slice(start).filter(r=>r.path.includes('alt=media'));assert.ok(reads.length<=2,'Index + one compressed checkpoint: '+reads.length);
 const score=await reader.adapter.downloadAsset(backup.assets[0].id);assert.equal(score.base64,original.assets[0].base64);
 // Older client writes an ordinary commit after the checkpoint: it must not be skipped.
 const before=await writer.adapter.readLinked(),value=JSON.parse(before.text);value.data.works[0].notes='From older client';await writer.adapter.write({text:JSON.stringify(value),expectedHash:before.hash});
 assert.equal(JSON.parse((await reader.adapter.readLinked()).text).data.works[0].notes,'From older client');
 const rd=await reader.adapter.readLinked(),edited=JSON.parse(rd.text);edited.data.works[0].bpm=88;await reader.adapter.write({text:JSON.stringify(edited),expectedHash:rd.hash});
 const oldRead=JSON.parse((await writer.adapter.readLinked()).text);assert.equal(oldRead.data.works[0].bpm,88);assert.equal(oldRead.assets[0].base64,original.assets[0].base64);
});
test('protected legacy connection never archives, renames or writes the stable file',async()=>{const server=syntheticNotebookDrive(),d=device(server),old=createDriveNotebookAdapter(d.options);await old.create({text:JSON.stringify(fixture())});const before=[...server.files.values()].map(f=>structuredClone(f)),modern=createIncrementalNotebookAdapter({...d.options,fastReads:true,preserveLegacy:true}),start=server.requests.length;await assert.rejects(modern.readLinked(),{code:'MIGRATION_REQUIRED'});assert.deepEqual([...server.files.values()],before);assert.ok(server.requests.slice(start).every(r=>!r.method||r.method==='GET'));});

test('legacy conversion requires consent for this exact file; modern client follows verified redirect',async()=>{
 const server=syntheticNotebookDrive(),d=device(server),old=createDriveNotebookAdapter(d.options);await old.create({text:JSON.stringify(fixture())});const legacy=[...server.files.values()].find(f=>f.appProperties?.spinoType==='spino-notebook-v1'),modern=createIncrementalNotebookAdapter({...d.options,fastReads:true,preserveLegacy:true});
 modern.authorizeMigration('another-file');await assert.rejects(modern.readLinked(),{code:'MIGRATION_REQUIRED'});modern.authorizeMigration(legacy.id);const result=JSON.parse((await modern.readLinked()).text);assert.equal(result.data.works.length,fixture().data.works.length);assert.equal(legacy.appProperties.spinoType,'spino-notebook-archive-v1');
 const second=createIncrementalNotebookAdapter({...d.options,fastReads:true,preserveLegacy:true});assert.equal(JSON.parse((await second.readLinked()).text).data.works.length,result.data.works.length);
});

test('renaming on one device updates the other through its changes feed without changing notebook identity',async()=>{
 const server=syntheticNotebookDrive(),{a,b}=await pair(server),id=a.settings().link.id,folder=a.settings().link.folderId;
 await a.adapter.rename('5_Practice.json');const start=server.requests.length;await b.adapter.readLinked();assert.equal(b.adapter.info.name,'5_Practice.json');assert.equal(b.settings().link.id,id);assert.equal(b.settings().link.folderId,folder);assert.ok(server.requests.slice(start).every(r=>r.path.startsWith('/drive/v3/changes?')));
});
test('connected presentation and QR use the verified descriptor name even if engine settings retain an old name',async t=>{
 const server=syntheticNotebookDrive(),{a,b}=await pair(server);await a.adapter.rename('5_Shared notebook.json');await b.adapter.readLinked();
 const engine=createNotebookCloud({adapter:b.adapter,settings:{read:()=>({mode:'sync',enabled:true,status:'saved',name:'3_Old.json',notebookId:b.settings().link.notebookId}),save:()=>{}},snapshot:async()=>JSON.stringify(fixture()),eligible:()=>true,readBase:async()=>null,saveBase:async()=>{},apply:async()=>{},backupFactory:()=>({state:{},busy:false,stop(){}})});t.after(()=>engine.stop());
 assert.equal(engine.state.name,'5_Shared notebook.json');const qr=await engine.deviceLink();assert.equal(qr.name,'5_Shared notebook.json');assert.equal(qr.fileId,a.adapter.info.fileId);
});
