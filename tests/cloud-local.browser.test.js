import test from 'node:test';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {block,beginSession,saveSession} from '../src/companion/model.js';
import {createIncrementalNotebookAdapter} from '../src/companion/drive-incremental.js';
import {syntheticNotebookDrive} from './fixtures/drive/notebook-server.js';
import {driveNotebookBootstrap} from '../scripts/review/drive-notebook-fixture.mjs';
import {cloudRecoveryFixture} from '../scripts/review/cloud-recovery-fixture.mjs';
const snapshot=evaluate=>evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets']),data=tx.objectStore('state').get('current'),assets=tx.objectStore('assets').getAll();tx.oncomplete=()=>{resolve({data:data.result,assets:assets.result});db.close();};};})`);
async function setup(t,options={}){
 const b=await openBrowser(t,{companion:true});await b.send('Page.addScriptToEvaluateOnNewDocument',{source:driveNotebookBootstrap(options)});await b.send('Page.navigate',{url:b.url});
 const wait=condition=>b.evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('Drive local timeout: '+${JSON.stringify(condition)}));}},20)})`);
 const click=action=>b.evaluate(`document.querySelector('[data-action="${action}"]').click()`);await wait(`document.querySelector('.cp-today')&&__cloudReview.statusCalls>0`);return {...b,wait,click};
}
async function connect(b){await b.click('settings');await b.click('profile-backup');await b.click('drive-connect');await b.wait(`document.querySelector('[data-drive-picker]')`);await b.evaluate(`document.querySelector('[data-drive-picker]').requestSubmit()`);await b.wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);}
test('Catalan Drive notebook keeps reader settings, scores and annotations and rejects invalid cloud data',{timeout:60000},async t=>{
 const b=await setup(t,{language:'ca'}),{evaluate,wait,click,errors}=b;await connect(b);const healthy=await snapshot(evaluate);assert.equal(healthy.data.preferences.language,'ca');assert.deepEqual(healthy.assets,cloudRecoveryFixture('ca').assets);
 await click('cloud-manage');assert.match(await evaluate(`document.querySelector('#cp-dialog').textContent`),/30 segons/);await click('close-dialog');
 await evaluate(`{const file=[...__driveFixture.files.values()].find(f=>f.appProperties?.spinoType==='spino-object-v2'&&JSON.parse(f.text).kind==='score-bytes');file.text=file.text.replace('JVBER','AVBER');file.revision++;__driveFixture.touch(file);window.invalidRemoteID=file.id;window.invalidRemote=file.text;window.writesBeforeInvalid=__driveFixture.requests.filter(r=>r.method==='PUT').length;}`);
 await click('cloud-sync');await wait(`document.querySelector('#cloud-backup[data-cloud-status=error]')`);assert.deepEqual(await snapshot(evaluate),healthy);assert.equal(await evaluate(`__driveFixture.files.get(invalidRemoteID).text===invalidRemote&&__driveFixture.requests.filter(r=>r.method==='PUT').length===writesBeforeInvalid`),true);assert.deepEqual(errors,[]);
});
test('offline practice starts without a sync prompt, saves progress and keeps automatic sync enabled after restart',{timeout:60000},async t=>{
 const b=await setup(t),{send,evaluate,wait,click,errors}=b;await connect(b);await evaluate(`__driveFixture.offline=true`);
 await click('practice');await evaluate(`document.querySelector('[data-action=prepare][data-id=reading]').click();document.querySelector('#prepare-form').requestSubmit()`);await wait(`document.querySelector('[data-action=session-end]')`);assert.equal(await evaluate(`!!document.querySelector('#cp-dialog[open]')`),false);assert.equal(await evaluate(`JSON.parse(localStorage.getItem('spino.cloud-sync.device.v1')).enabled`),true);
 const active=await snapshot(evaluate);assert.deepEqual(active.assets,cloudRecoveryFixture().assets);await click('session-end');await wait(`document.querySelector('#cp-dialog [name=title]')`);await evaluate(`document.querySelector('#cp-dialog [name=title]').value='Saved offline';document.querySelector('#cp-dialog form').requestSubmit(document.querySelector('#cp-dialog button[value=save]'))`);await wait(`document.querySelector('.cp-today')`);
 await send('Page.reload');await wait(`document.querySelector('.cp-today')`);assert.equal(await evaluate(`JSON.parse(localStorage.getItem('spino.cloud-sync.device.v1')).enabled`),true);await click('settings');await click('profile-backup');await click('cloud-manage');assert.equal(await evaluate(`document.querySelector('#cp-dialog [role=switch]').getAttribute('aria-checked')`),'true');await click('close-dialog');await click('cloud-sync');await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);
 assert.equal(await evaluate(`[...__driveFixture.files.values()].filter(f=>f.appProperties?.spinoType==='spino-object-v2').flatMap(f=>JSON.parse(f.text).changes||[]).find(c=>c.key.startsWith('data/sessions/')&&c.value?.title==='Saved offline')?.value.title`),'Saved offline');assert.deepEqual((await snapshot(evaluate)).assets,active.assets);assert.deepEqual(errors,[]);
});
test('old file connection stays paused and canceling the Google notebook selection preserves local data',{timeout:60000},async t=>{
 const {evaluate,wait,click,errors}=await setup(t,{legacy:true});const before=await snapshot(evaluate);await click('settings');await click('profile-backup');await wait(`document.querySelector('#cloud-backup[data-cloud-status=paused]')`);assert.equal(await evaluate(`__cloudReview.reads+__cloudReview.writes+__cloudReview.picks`),0);assert.equal(await evaluate(`!!document.querySelector('[data-action=cloud-connect],[data-action=cloud-create-shared],[data-action=cloud-join-shared]')`),false);
 await click('drive-connect');await wait(`document.querySelector('[data-drive-picker]')`);assert.equal(await evaluate(`!!document.querySelector('[data-drive-picker] button[type=submit]')`),true);await click('close-dialog');assert.deepEqual(await snapshot(evaluate),before);assert.equal(await evaluate(`__driveFixture.files.size`),0);assert.equal(await evaluate(`__cloudReview.reads+__cloudReview.writes+__cloudReview.picks`),0);assert.deepEqual(errors,[]);
});
test('a stalled Drive read can be paused immediately and still permits a local JSON export',{timeout:60000},async t=>{
 const b=await setup(t),{evaluate,wait,click,errors}=b;await connect(b);await evaluate(`__driveStall=true`);await click('cloud-sync');await wait(`window.__releaseDrive`);await click('cloud-manage');await evaluate(`document.querySelector('#cp-dialog [data-action=cloud-toggle]').click()`);await wait(`document.querySelector('#cloud-backup[data-cloud-status=paused]')`);await click('export-backup');assert.equal(await evaluate(`!!document.querySelector('#cp-dialog [name=format]')`),true);await evaluate(`__driveStall=false;__releaseDrive()`);await click('close-dialog');assert.deepEqual(errors,[]);
});

// Publish a valid second-device change through the production adapter against a cloned synthetic server.
async function remoteEdit(b,change){
 const state=await b.evaluate(`({files:[...__driveFixture.files],changes:__driveFixture.changes,nextID:__driveFixture.nextID})`),server=syntheticNotebookDrive();
 Object.assign(server,{files:new Map(state.files),changes:state.changes,nextID:state.nextID});
 let settings={};const journal=new Map(),adapter=createIncrementalNotebookAdapter({native:server.native(),recovery:{saveRecovery:async()=>{}},settings:{read:()=>settings,save:v=>settings=v},journal:{get:async k=>journal.get(k),set:async(k,v)=>journal.set(k,v)}});
 adapter.choose([...server.files.values()].find(f=>f.appProperties?.spinoType==='spino-notebook-v2').id);await adapter.pickBackup();
 const before=await adapter.readLinked(),value=JSON.parse(before.text);change(value);await adapter.write({text:JSON.stringify(value),expectedHash:before.hash});
 await b.evaluate(`Object.assign(__driveFixture,{files:new Map(${JSON.stringify([...server.files])}),changes:${JSON.stringify(server.changes)},nextID:${server.nextID}})`);
}
test('stalled Drive never gates practice and late incoming changes wait until the saved session is finished',{timeout:60000},async t=>{
 const b=await setup(t),{send,evaluate,wait,click,errors}=b;await connect(b);
 const initial=await snapshot(evaluate),folder=process.env.SPINO_PRACTICE_SYNC_EVIDENCE,frames=[];
 const capture=async state=>{if(!folder)return;await mkdir(folder,{recursive:true});for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth>document.querySelector('.cp-page').clientWidth+1`),false);const file=state+'-'+width+'x'+height+'.png',shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({state,width,height,file});}};
 await remoteEdit(b,value=>{value.data.works[0].notes='Independent note from the second device';});
 await evaluate(`__driveStall=true;window.__practicePageMarker=true`);await click('cloud-sync');await wait(`window.__releaseDrive`);
 await click('practice');await evaluate(`document.querySelector('[data-action=prepare][data-id=reading]').click()`);
 // A failed local save must not leave the start reservation stuck; a second submission retries locally.
 await evaluate(`window.__originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...args){if(this.name==='state'&&value?.active){IDBObjectStore.prototype.put=__originalPut;window.__practiceSaveFailed=true;throw new DOMException('Synthetic local storage failure','QuotaExceededError');}return __originalPut.call(this,value,...args)};document.querySelector('#prepare-form').requestSubmit()`);
 await wait(`window.__practiceSaveFailed`);await wait(`document.querySelector('#cp-toast')?.textContent.includes('Synthetic local storage failure')`);
 assert.equal((await snapshot(evaluate)).data.active,null);
 const started=Date.now();await evaluate(`document.querySelector('#prepare-form').requestSubmit();document.querySelector('#prepare-form').requestSubmit()`);
 await wait(`document.querySelector('[data-action=session-end]')`);const startMs=Date.now()-started;
 assert.ok(startMs<2000,'Practice starts locally while the provider is still stalled: '+startMs+'ms');
 assert.equal(await evaluate(`!!window.__releaseDrive&&!!window.__practicePageMarker&&!document.querySelector('#cp-dialog[open]')`),true);
 const active=await snapshot(evaluate),sessionId=active.data.active.id;
 assert.deepEqual(active.assets,initial.assets);assert.equal(active.data.works[0].notes,initial.data.works[0].notes);
 assert.equal(await evaluate(`JSON.parse(localStorage.getItem('spino.cloud-sync.device.v1')).enabled`),true);
 await evaluate(`document.querySelector('#cp-toast').hidden=true`);await capture('practice-started-with-stalled-drive');
 await evaluate(`__driveStall=false;__releaseDrive();__releaseDrive=null`);
 await wait(`JSON.parse(localStorage.getItem('spino.cloud-sync.device.v1')).status==='waiting'`);
 assert.equal(await evaluate(`window.__practicePageMarker`),true);
 assert.equal((await snapshot(evaluate)).data.active.id,sessionId);
 assert.equal((await snapshot(evaluate)).data.works[0].notes,initial.data.works[0].notes);
 await capture('late-changes-deferred');
 await click('session-end');await wait(`document.querySelector('#cp-dialog [name=title]')`);await evaluate(`document.querySelector('#cp-dialog [name=title]').value='Practice started without waiting';document.querySelector('#cp-dialog form').requestSubmit(document.querySelector('#cp-dialog button[value=save]'))`);
 // Incoming adoption reloads the app; poll durable state across that expected navigation.
 let saved;for(let n=0;n<200;n++){try{saved=await snapshot(evaluate);if(!saved.data.active&&saved.data.works[0].notes==='Independent note from the second device')break;}catch(error){if(!/context|navigat/i.test(error.message))throw error;}await new Promise(r=>setTimeout(r,50));}
 assert.equal(saved.data.active,null);assert.equal(saved.data.works[0].notes,'Independent note from the second device');
 assert.equal(saved.data.sessions.filter(s=>s.id===sessionId&&s.title==='Practice started without waiting').length,1);
 assert.deepEqual(saved.assets,initial.assets);await wait(`document.querySelector('.cp-today')`);
 await capture('saved-and-synchronized');assert.equal(await evaluate(`JSON.parse(localStorage.getItem('spino.cloud-sync.device.v1')).enabled`),true);
 assert.deepEqual(errors,[]);
 if(folder){await writeFile(folder+'/fixture.json',JSON.stringify(initial,null,2));await writeFile(folder+'/verification.json',JSON.stringify({kind:'responsive-browser-synthetic-drive',date:new Date().toISOString(),nativeAcceptance:false,startMs,frames,sessionId,scoreAssetsAndAnnotationsUnchanged:true,savedSessionRetained:true,lateRemoteNoteAdoptedAfterPractice:true,syncRemainsEnabled:true,runtimeErrors:errors,sourceHashes:Object.fromEntries(await Promise.all(['src/companion/app.js','src/companion/cloud-policy.js','src/companion/cloud-sync.js','tests/cloud-local.browser.test.js'].map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')]))),buildIndexSha256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex')},null,2));}
});

for(const preference of ['local','remote'])test('conflict review retains both offline practices and only chooses the shared plan link: '+preference,{timeout:90000},async t=>{
 const b=await setup(t,{language:preference==='local'?'es':'ca'}),{send,evaluate,wait,click,errors}=b;
 const plan={id:'shared-plan',title:'Shared practice plan',context:'piano',date:'2026-10-17',time:'10:00',status:'planned',blocks:[block('repertoire',{workId:'synthetic-work'})]},initial=await snapshot(evaluate);initial.data.plans=[plan];
 const put=data=>evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=()=>{db.close();resolve()}}})`);
 await put(initial.data);await send('Page.reload');await wait(`document.querySelector('.cp-today')`);await connect(b);const connected=await snapshot(evaluate);
 const save=(data,title,now)=>{const active=beginSession({...plan,planId:plan.id},now);active.elapsedMs=active.blockElapsedMs=120000;saveSession(data,active,{title},now+120000);return data;};
 await remoteEdit(b,value=>save(value.data,'Tablet practice',Date.parse('2026-10-17T11:00:00Z')));
 const local=structuredClone(connected.data);save(local,'Phone practice',Date.parse('2026-10-17T10:00:00Z'));await put(local);
 await evaluate(`sessionStorage.setItem('synthetic-drive-files',JSON.stringify([...__driveFixture.files]));sessionStorage.setItem('synthetic-drive-progress',JSON.stringify({changes:__driveFixture.changes,nextID:__driveFixture.nextID}))`);
 await send('Page.reload');await wait(`document.querySelector('.cp-today')`);await click('settings');await click('profile-backup');await click('cloud-sync');await wait(`document.querySelector('#cloud-backup[data-cloud-status=conflict]')`);await click('cloud-conflicts');
 const review=await evaluate(`JSON.parse(localStorage.getItem('spino.cloud-sync.device.v1')).conflictReview`);assert.equal(review.practiceCount,2);assert.equal(review.values[0].field,'sessionId');
 assert.equal(await evaluate(`document.querySelector('.cp-cloud-preserved').textContent.includes('Phone practice')&&document.querySelector('.cp-cloud-preserved').textContent.includes('Tablet practice')`),true);
 assert.equal((await snapshot(evaluate)).data.sessions.length,1);await click('close-dialog');assert.equal((await snapshot(evaluate)).data.sessions.length,1);await click('cloud-conflicts');
 const folder=process.env.SPINO_CONFLICT_EVIDENCE,frames=[];
 if(folder){await mkdir(folder,{recursive:true});for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme='${theme}';document.querySelector('#cp-dialog .cp-dialog-body').scrollTop=0`);
  const geometry=await evaluate(`(()=>{const d=document.querySelector('#cp-dialog'),r=d.getBoundingClientRect();return{contained:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,noOverflow:d.scrollWidth<=d.clientWidth+1}})()`);assert.equal(geometry.contained,true);assert.equal(geometry.noOverflow,true);
  const file=preference+'-'+theme+'-'+width+'x'+height+'.png',shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({file,theme,width,height,geometry});
  await evaluate(`(()=>{const body=document.querySelector('#cp-dialog .cp-dialog-body');body.scrollTop=body.scrollHeight})()`);
  const choices=await evaluate(`(()=>{const d=document.querySelector('#cp-dialog').getBoundingClientRect(),r=[...document.querySelectorAll('.cp-cloud-conflict-actions button')].map(e=>e.getBoundingClientRect());return{visible:r.every(e=>e.top>=d.top&&e.bottom<=d.bottom),targets:r.every(e=>e.height>=44),equalSize:r[0].width===r[1].width&&r[0].height===r[1].height}})()`);assert.equal(choices.visible,true);assert.equal(choices.targets,true);assert.equal(choices.equalSize,true);
  const choiceFile=preference+'-'+theme+'-'+width+'x'+height+'-choices.png',choiceShot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+choiceFile,Buffer.from(choiceShot.data,'base64'));frames.push({file:choiceFile,theme,width,height,choices});
 }}
 await click('cloud-resolve-'+preference);let actual;for(let n=0;n<200;n++){try{actual=await snapshot(evaluate);if(actual.data.sessions.length===2)break;}catch(error){if(!/context|navigat/i.test(error.message))throw error;}await new Promise(r=>setTimeout(r,50));}

 assert.deepEqual(new Set(actual.data.sessions.map(s=>s.title)),new Set(['Phone practice','Tablet practice']));assert.deepEqual(actual.assets,connected.assets);assert.equal(new Set(actual.data.sessions.map(s=>s.id)).size,2);assert.deepEqual(errors,[]);
 if(folder)await writeFile(folder+'/'+preference+'.json',JSON.stringify({date:new Date().toISOString(),kind:'responsive-browser-synthetic-drive',preference,frames,review,initial:connected,localBefore:local,after:actual,closingReviewPreservesLocal:true,bothSavedPracticesRetained:true,assetsAndAnnotationsUnchanged:true,runtimeErrors:errors,buildIndexSha256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex'),sourceHashes:Object.fromEntries(await Promise.all(['src/companion/cloud-merge.js','src/companion/atomic-notebook.js','src/companion/drive-incremental.js','src/companion/cloud-conflict-review.js','src/companion/cloud-backup-view.js'].map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])))},null,2));
});

test('a paused phone practice stays local while completed tablet history arrives; stalled sync can pause and retry',{timeout:90000},async t=>{
 const b=await setup(t),{send,evaluate,wait,click,errors}=b;await connect(b);const initial=await snapshot(evaluate);
 const pending=beginSession({title:'Phone unfinished practice',context:'piano',blocks:[block('repertoire',{workId:'synthetic-work'})]});pending.elapsedMs=pending.blockElapsedMs=60000;
 await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite'),s=tx.objectStore('state'),r=s.get('current');r.onsuccess=()=>s.put({...r.result,active:${JSON.stringify(pending)}},'current');tx.oncomplete=()=>{db.close();resolve()}}})`);await send('Page.reload');await wait(`document.querySelector('.cp-today')`);await click('settings');await click('profile-backup');
 const tablet=beginSession({title:'Tablet finished repertoire',context:'piano',blocks:[block('repertoire',{workId:'synthetic-work'})]});tablet.elapsedMs=tablet.blockElapsedMs=31*60000;let savedId;
 await remoteEdit(b,value=>{const s=saveSession(value.data,tablet,{notes:'Independent tablet lesson',mood:4});savedId=s.id;});
 await click('cloud-sync');let received;for(let n=0;n<200;n++){try{received=await snapshot(evaluate);if(received.data.sessions.some(s=>s.id===savedId))break;}catch(error){if(!/document is not defined|context|navigat/i.test(error.message))throw error;}if(received?.data.sessions.some(s=>s.id===savedId))break;await new Promise(r=>setTimeout(r,30));}
 assert.ok(received.data.sessions.some(s=>s.id===savedId));assert.deepEqual(received.data.active,pending);assert.deepEqual(received.assets,initial.assets);await wait(`document.querySelector('.cp-today')`);await click('settings');await click('profile-backup');await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);
 assert.equal(await evaluate(`!!document.querySelector('[data-cloud-checked]')&&!document.querySelector('[data-cloud-checked]').hidden`),true);
 const folder=process.env.SPINO_SYNC_RECOVERY_EVIDENCE,frames=[];if(folder){await mkdir(folder,{recursive:true});await writeFile(folder+'/fixture.json',JSON.stringify({pending,tabletResultId:savedId,original:initial},null,2));}
 const capture=async state=>{for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme='${theme}'`);assert.equal(await evaluate(`document.querySelector('.cp-content').scrollWidth<=document.querySelector('.cp-content').clientWidth+1`),true);if(folder){const file=`${state}-${theme}-${width}x${height}.png`,shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({file,state,theme,width,height});}}};
 await wait(`document.querySelector('#cp-toast')?.hidden`);await capture('phone-retained-and-tablet-history-received');await click('progress');await evaluate(`document.querySelector('[data-action=session-detail][data-id="${savedId}"]').scrollIntoView({block:'center'})`);await capture('pending-phone-and-tablet-history');await click('settings');await click('profile-backup');await evaluate(`window.__driveStall=true`);await click('cloud-sync');await wait(`window.__releaseDrive&&document.querySelector('#cloud-backup [data-action=cloud-toggle][data-id=false]')`);assert.match(await evaluate(`document.querySelector('#cloud-backup').textContent`),/Comprobando Google Drive/);await evaluate(`document.querySelector('#cloud-backup [data-action=cloud-toggle][data-id=false]').scrollIntoView({block:'center'})`);await capture('stalled-drive-pause-available');
 await evaluate(`document.querySelector('#cloud-backup [data-action=cloud-toggle][data-id=false]').click()`);await wait(`document.querySelector('#cloud-backup[data-cloud-status=paused]')`);await capture('paused-keeps-pending-practice');await evaluate(`window.__driveStall=false;__releaseDrive()`);await new Promise(r=>setTimeout(r,100));
 await evaluate(`document.querySelector('#cloud-backup [data-action=cloud-toggle][data-id=true]').click()`);await wait(`document.querySelector('[data-action=cloud-sync]')`);await click('cloud-sync');await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);
 assert.equal((await snapshot(evaluate)).data.active.id,pending.id);assert.equal((await snapshot(evaluate)).data.sessions.filter(s=>s.id===savedId).length,1);assert.deepEqual(errors,[]);
 if(folder)await writeFile(folder+'/verification.json',JSON.stringify({kind:'responsive-browser-synthetic-drive',date:new Date().toISOString(),frames,phonePendingPracticeRetained:true,tabletCompletedPracticeReceived:true,scoreBytesAndAnnotationsUnchanged:true,stalledPauseAndRetryWithoutLateAdoption:true,runtimeErrors:errors},null,2));
});
