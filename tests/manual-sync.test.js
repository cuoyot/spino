import test from 'node:test';
import assert from 'node:assert/strict';
import {createNotebookCloud} from '../src/companion/cloud-sync.js';
import {createIncrementalNotebookAdapter} from '../src/companion/drive-incremental.js';
import {createMediaSync} from '../src/companion/media-sync.js';
import {syncIndicatorMarkup} from '../src/companion/sync-indicator.js';
import {driveSyncMarkup} from '../src/companion/drive-sync-view.js';
import {syntheticNotebookDrive} from './fixtures/drive/notebook-server.js';
import {cloudRecoveryFixture} from '../scripts/review/cloud-recovery-fixture.mjs';

async function connected(t) {
  const server=syntheticNotebookDrive(),entries=new Map(),reads=[];
  let settings={},cloudSettings={},local=cloudRecoveryFixture('en'),base=null,snapshots=0,applyAllowed=true;
  const adapter=createIncrementalNotebookAdapter({native:server.native(),fastReads:true,
    recovery:{saveRecovery:async()=>{}},settings:{read:()=>settings,save:value=>{settings=structuredClone(value);}},
    journal:{get:async key=>structuredClone(entries.get(key)),set:async(key,value)=>entries.set(key,structuredClone(value))}});
  const originalRead=adapter.readLinked;
  adapter.readLinked=async options=>{reads.push(options);return originalRead(options);};
  const cloud=createNotebookCloud({adapter,delay:1000000,
    settings:{read:()=>cloudSettings,save:value=>{cloudSettings=structuredClone(value);}},
    snapshot:async()=>{snapshots++;return JSON.stringify(local);},eligible:()=>true,canApply:()=>applyAllowed,
    readBase:async()=>base,saveBase:async value=>{base=structuredClone(value);},
    apply:async text=>{local=JSON.parse(text);},
    backupFactory:()=>({state:{},busy:false,stop(){},setEnabled:async()=>{},markDirty(){}})});
  t.after(()=>cloud.stop());
  await cloud.createShared();await cloud.resumeChecks();await cloud.resumeChecks();
  assert.equal(cloud.state.status,'saved',cloud.state.error);
  return {server,adapter,cloud,reads,get:()=>local,snapshots:()=>snapshots,
    edit:fn=>{fn(local);cloud.markDirty();},canApply:value=>{applyAllowed=value;}};
}

test('repeated manual checks of an unchanged Drive notebook use only the changes feed, with no local export',async t=>{
  const f=await connected(t),before=f.snapshots(),start=f.server.requests.length;
  for(let n=0;n<3;n++)await f.cloud.sync();
  assert.equal(f.cloud.state.status,'saved',f.cloud.state.error);
  assert.equal(f.snapshots(),before,'A manual check must not export unchanged PDF content');
  const requests=f.server.requests.slice(start);
  assert.equal(requests.length,3);assert.ok(requests.every(r=>r.method==='GET'&&r.path.startsWith('/drive/v3/changes?')));
});

test('a saved local edit still uploads through a manual incremental check',async t=>{
  const f=await connected(t),start=f.reads.length;
  f.edit(local=>{local.data.works[0].notes='Saved local edit';});await f.cloud.sync();
  assert.equal(f.cloud.state.status,'saved',f.cloud.state.error);
  assert.ok(f.reads.slice(start).every(options=>!options?.fullScan));
  assert.equal(JSON.parse((await f.adapter.readLinked()).text).data.works[0].notes,'Saved local edit');
});

test('incoming changes cannot bypass an open editor and apply after it closes',async t=>{
  const f=await connected(t),before=await f.adapter.readLinked(),remote=JSON.parse(before.text);
  remote.data.works[0].notes='Received edit';await f.adapter.write({text:JSON.stringify(remote),expectedHash:before.hash});
  const original=f.get().data.works[0].notes;f.canApply(false);await f.cloud.sync();
  assert.equal(f.cloud.state.status,'waiting');assert.equal(f.get().data.works[0].notes,original);
  f.canApply(true);await f.cloud.sync();assert.equal(f.cloud.state.status,'saved',f.cloud.state.error);
  assert.equal(f.get().data.works[0].notes,'Received edit');
  const asset=await f.adapter.downloadAsset(f.get().assets[0].id),originalAsset=cloudRecoveryFixture('en').assets[0];
  assert.equal(asset.base64,originalAsset.base64);assert.deepEqual(asset.annotations,originalAsset.annotations);
});

test('manual retry after a provider error retains the full recovery scan',async t=>{
  const f=await connected(t),before=structuredClone(f.get());f.server.revoked=true;
  await f.cloud.sync();assert.equal(f.cloud.state.status,'error');assert.deepEqual(f.get(),before);
  f.server.revoked=false;const start=f.reads.length;await f.cloud.retry();
  assert.equal(f.cloud.state.status,'saved',f.cloud.state.error);assert.equal(f.reads[start]?.fullScan,true);
});

test('an edit during a lightweight manual read stays local until the next reconciled upload',async t=>{
  const f=await connected(t),read=f.adapter.readLinked;
  let release,entered;const started=new Promise(resolve=>{entered=resolve;}),gate=new Promise(resolve=>{release=resolve;});
  f.adapter.readLinked=async options=>{entered();await gate;return read(options);};
  const task=f.cloud.sync();await started;
  f.edit(local=>{local.data.works[0].notes='Typed while checking';});release();await task;
  assert.equal(f.cloud.state.status,'waiting');assert.equal(f.get().data.works[0].notes,'Typed while checking');
  f.adapter.readLinked=read;await f.cloud.sync();assert.equal(f.cloud.state.status,'saved',f.cloud.state.error);
  assert.equal(JSON.parse((await f.adapter.readLinked()).text).data.works[0].notes,'Typed while checking');
});

test('ending a media check when notebook sync starts cannot leave a permanently rotating indicator',async t=>{
  let allowed=true,release,connections=0;
  const gate=new Promise(resolve=>{release=resolve;}),context={accountId:'synthetic-owner',notebookId:'synthetic-notebook',works:[],wifiOnly:false};
  const media=createMediaSync({store:{index:async()=>[]},getContext:()=>context,eligible:()=>allowed,
    connection:async()=>{connections++;await gate;return {list:async()=>[]};},delay:1000000});
  t.after(()=>media.stop());const task=media.sync();
  await new Promise(resolve=>setImmediate(resolve));assert.equal(media.state.status,'checking');
  allowed=false;release();await task;assert.equal(media.busy,false);
  const indicator=syncIndicatorMarkup({name:'Synthetic notebook',enabled:true,status:'saved'},media.state,'en');
  assert.doesNotMatch(indicator,/data-sync-status="writing"/);
  allowed=true;await media.sync();assert.equal(media.state.status,'saved');
  assert.equal(connections,2,'Each pass connects once, including the interrupted pass');
});

test('waiting copy names the actual blocker and does not invent a practice when another operation is busy',()=>{
  const state={transport:'drive',name:'Synthetic notebook',enabled:true,status:'waiting'};
  const generic=driveSyncMarkup(state,{lang:'es',driveAvailable:true});
  assert.match(generic,/Sincronización en espera/);assert.doesNotMatch(generic,/Los cambios recibidos esperan/);
  for(const [waitReason,text] of [['practice','Termina y guarda la práctica pendiente'],['editor','Termina de editar'],['dialog','Cierra el diálogo abierto'],['score','Cierra la partitura']]){
    assert.ok(driveSyncMarkup({...state,waitReason},{lang:'es',driveAvailable:true}).includes(text));
  }
});
