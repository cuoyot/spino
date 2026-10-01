import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyData, block, beginSession, saveSession, validateData } from '../src/companion/model.js';
import { calendarDates, shiftCalendar, orientationAdvice } from '../src/companion/views.js';
import { canDownload, catalogChanges, createDownloads, queueDownload } from '../src/companion/downloads.js';
import { CATALOG } from '../src/companion/catalog.js';

test('feedback survives storage and previous backups remain readable', () => {
  const data=emptyData(), s=beginSession({title:'Reading',context:'mobile',blocks:[block()]});
  saveSession(data,s,{title:'First session',mood:4,notes:'Bars 2–4',workIds:['piece']});
  const restored=validateData(data);
  assert.equal(restored.sessions[0].mood,4); assert.equal(restored.sessions[0].title,'First session');
  assert.deepEqual(restored.sessions[0].workIds,['piece']);
  delete data.preferences.wifiOnly;delete data.downloadJobs;delete data.sessions[0].mood;delete data.sessions[0].workIds;
  assert.equal(validateData(data).preferences.wifiOnly,true);
  data.sessions[0].mood=6;assert.throws(()=>validateData(data));
});
test('calendar covers leap months and clamps month navigation at month end',()=>{
  assert.equal(shiftCalendar('2024-01-31',1,'month'),'2024-02-29');
  assert.equal(shiftCalendar('2024-03-31',-1,'month'),'2024-02-29');
  const dates=calendarDates('2024-02-29','month');
  assert.equal(dates.length%7,0);assert.ok(dates.includes('2024-02-29'));
  assert.equal(calendarDates('2026-09-30','week')[0],'2026-09-28');
});
test('orientation advice distinguishes device size and practice context',()=>{
  assert.match(orientationAdvice('midi','auto',390,844),/landscape/);
  assert.match(orientationAdvice('piano','page',1180,820),/portrait/);
  assert.equal(orientationAdvice('midi','auto',844,390),'');
  assert.equal(orientationAdvice('mobile','scroll',390,844),'');
});
test('Wi-Fi policy fails closed on unknown or metered networks',()=>{
  assert.equal(canDownload({online:true,wifi:null,metered:false},true),false);
  assert.equal(canDownload({online:true,wifi:true,metered:true},true),false);
  assert.equal(canDownload({online:true,wifi:true,metered:false},true),true);
  assert.equal(canDownload({online:true,wifi:false},false),true);
  assert.equal(canDownload({online:false,wifi:true},false),false);
});
test('catalog revisions detect updates without adding a repertoire work',()=>{
  const data=emptyData();data.downloads.push({catalogId:CATALOG[0].id,assetId:'old',title:'Old',revision:'0'});
  assert.equal(catalogChanges(data.downloads).length,1);
  queueDownload(data,CATALOG[0]);queueDownload(data,CATALOG[0]);
  assert.equal(data.downloadJobs.length,1);assert.equal(data.works.length,0);
  data.downloadJobs[0].status='downloading';assert.equal(validateData(data).downloadJobs[0].status,'paused');
});
function harness(overrides={}, assets=new Map()) {
  const data=emptyData();data.preferences.wifiOnly=false;
  const writes=[];
  const manager=createDownloads({getData:()=>data,isVisible:()=>true,persist:async()=>{},changed:()=>{},store:{asset:async id=>assets.get(id),commitAsset:async(asset,state)=>{assets.set(asset.id,asset);writes.push({asset,data:structuredClone(state)});}},platform:{networkStatus:async()=>({online:true,wifi:true,metered:false}),downloadPDF:async()=>btoa('%PDF-1.4\n%%EOF'),...overrides}});
  return {data,manager,writes};
}
test('download replacement commits asset and metadata together after validation',async()=>{
  const {data,manager,writes}=harness();data.downloads.push({catalogId:CATALOG[0].id,assetId:'old',title:'Old',revision:'0'});
  await manager.enqueue(CATALOG[0].id);
  assert.equal(writes.length,1);assert.equal(writes[0].asset.id,'old');assert.equal(writes[0].asset.sha256.length,64);
  assert.equal(data.downloads[0].revision,'1');assert.equal(data.downloadJobs[0].status,'complete');assert.equal(data.works.length,0);
});
test('failed replacement preserves the offline edition and supports retry',async()=>{
  const {data,manager,writes}=harness({downloadPDF:async()=>{throw Error('Offline');}});
  data.downloads.push({catalogId:CATALOG[0].id,assetId:'old',title:'Old',revision:'0'});
  await manager.enqueue(CATALOG[0].id);
  assert.equal(writes.length,0);assert.equal(data.downloads[0].revision,'0');assert.equal(data.downloadJobs[0].status,'failed');
});
test('pausing an active transfer prevents attachment commits',async()=>{
  let started;
  const ready=new Promise(r=>started=r);
  const {data,manager,writes}=harness({downloadPDF:async(url,{signal})=>new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(Error('Aborted')));started();})});
  const task=manager.enqueue(CATALOG[0].id);await ready;await manager.pause(CATALOG[0].id);await task;
  assert.equal(writes.length,0);assert.equal(data.downloadJobs[0].status,'paused');
});

test('pausing during the network check does not start a transfer afterwards',async()=>{
  let resolveNetwork, checked, calls=0;
  const ready=new Promise(r=>checked=r);
  const {data,manager,writes}=harness({networkStatus:()=>new Promise(resolve=>{resolveNetwork=resolve;checked();}),downloadPDF:async()=>{calls++;return btoa('%PDF-1.4');}});
  const task=manager.enqueue(CATALOG[0].id);await ready;await manager.pauseAll();
  resolveNetwork({online:true,wifi:true,metered:false});await task;
  assert.equal(calls,0);assert.equal(writes.length,0);assert.equal(data.downloadJobs[0].status,'paused');
});

test('storage failure rolls back new download references and preserves the previous work asset',async()=>{
  const data=emptyData();data.preferences.wifiOnly=false;
  data.downloads.push({catalogId:CATALOG[0].id,assetId:'old',title:'Old',revision:'0'});
  data.works.push({id:'work',catalogId:CATALOG[0].id,assetId:'old'});
  const manager=createDownloads({getData:()=>data,isVisible:()=>true,persist:async()=>{},changed:()=>{},store:{asset:async()=>null,commitAsset:async()=>{throw Error('Storage full');}},platform:{networkStatus:async()=>({online:true,wifi:true,metered:false}),downloadPDF:async()=>btoa('%PDF-1.4')}});
  await manager.enqueue(CATALOG[0].id);
  assert.equal(data.downloadJobs[0].status,'failed');assert.equal(data.downloads[0].revision,'0');assert.equal(data.works[0].assetId,'old');
});

test('catalog updates preserve annotated editions and keep both PDFs accessible',async()=>{
  const original={id:'old',base64:btoa('%PDF-1.0 old'),annotations:{version:1,marks:[{id:'mark'}]}};
  const assets=new Map([['old',original]]);
  const {data,manager}=harness({},assets);
  data.downloads.push({catalogId:CATALOG[0].id,assetId:'old',title:'Old',revision:'0'});
  data.works.push({id:'work',catalogId:CATALOG[0].id,assetId:'old'});
  await manager.enqueue(CATALOG[0].id);
  assert.equal(data.works[0].assetId,'old');assert.notEqual(data.downloads[0].assetId,'old');
  assert.deepEqual(assets.get('old'),original);assert.equal(assets.size,2);
  // A later update must not reattach the repertoire work to the newer unannotated edition.
  await manager.enqueue(CATALOG[0].id);assert.equal(data.works[0].assetId,'old');
});

test('annotations made directly in the catalog remain reachable after an update',async()=>{
  const assets=new Map([['old',{id:'old',base64:btoa('%PDF-1.0'),annotations:{version:1,marks:[{id:'mark'}]}}]]);
  const {data,manager}=harness({},assets);
  data.downloads.push({catalogId:CATALOG[0].id,assetId:'old',title:'Old',revision:'0'});
  await manager.enqueue(CATALOG[0].id);
  assert.equal(data.works.length,1);assert.equal(data.works[0].assetId,'old');
  assert.notEqual(data.downloads[0].assetId,'old');assert.equal(assets.size,2);
});

test('an unchanged PDF retains annotations and framing when catalog metadata changes',async()=>{
  const annotations={version:1,marks:[{id:'mark'}]};
  const scoreView={version:1,portrait:{zoom:1.5,centerX:.5,centerY:.4}};
  const assets=new Map([['old',{id:'old',base64:btoa('%PDF-1.4\n%%EOF'),annotations,scoreView}]]);
  const {data,manager}=harness({},assets);
  data.downloads.push({catalogId:CATALOG[0].id,assetId:'old',title:'Old',revision:'0'});
  await manager.enqueue(CATALOG[0].id);
  assert.equal(data.downloads[0].assetId,'old');assert.deepEqual(assets.get('old').annotations,annotations);assert.equal(assets.size,1);
  assert.deepEqual(assets.get('old').scoreView,scoreView);
});
