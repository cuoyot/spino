import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {driveNotebookBootstrap} from '../scripts/review/drive-notebook-fixture.mjs';
import {cloudRecoveryFixture} from '../scripts/review/cloud-recovery-fixture.mjs';
const take={id:'synthetic-personal-take',workId:'synthetic-work',title:'Synthetic recording title',workTitle:'Synthetic score',durationMs:120000,createdAt:'2026-10-16T10:00:00Z',kind:'audio',draft:false,base64:(await readFile('tests/fixtures/media/two-minute-stream.webm')).toString('base64')};
const stored=`new Promise(resolve=>{const r=indexedDB.open('spino-local-media',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('recordings').objectStore('recordings').getAll();q.onsuccess=()=>{db.close();resolve(q.result.map(({blob,...r})=>({...r,bytes:blob.size,type:blob.type})));};};})`;
async function setup(t,options){
 const b=await openBrowser(t,{companion:true});await b.send('Page.addScriptToEvaluateOnNewDocument',{source:driveNotebookBootstrap(options)});await b.send('Page.navigate',{url:b.url});
 const wait=expression=>b.evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve()}else if(++n>700){clearInterval(timer);reject(Error('Media timeout: '+${JSON.stringify(expression)}));}},25)})`);
 const click=action=>b.evaluate(`document.querySelector('[data-action="${action}"]').click()`);
 await wait(`document.querySelector('.cp-profile-nav')`);await click('settings');await click('profile-backup');await click('drive-connect');await wait(`document.querySelector('[data-drive-picker]')`);
 await b.evaluate(`document.querySelector('[data-drive-picker]').requestSubmit()`);await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);
 return {...b,wait,click};
}
test('saved local recording uploads through the notebook account without a separate media login',{timeout:60000},async t=>{
 const {evaluate,wait,click,errors}=await setup(t,{localMedia:take});await click('media-sync');await wait(`__mediaFixture.files.size===1&&document.querySelector('#cloud-media').textContent.includes('al día')`);
 const file=await evaluate(`(()=>{const {blob,...file}=[...__mediaFixture.files.values()][0];return file;})()`);assert.equal(file.appProperties.takeId,take.id);assert.equal(file.appProperties.notebookId,await evaluate(`JSON.parse(localStorage.getItem('spino.cloud-sync.device.v1')).notebookId`));assert.equal(file.sha256Checksum,createHash('sha256').update(Buffer.from(take.base64,'base64')).digest('hex'));
 const rows=await evaluate(stored);assert.equal(rows.length,1);assert.equal(rows[0].cloud.accountId,'synthetic-owner');assert.equal(rows[0].title,take.title);assert.deepEqual(errors,[]);
});
test('second device automatically stores a verified recording, plays offline, and respects local deletion',{timeout:60000},async t=>{
 const {send,evaluate,wait,click,errors}=await setup(t,{remote:cloudRecoveryFixture(),remoteMedia:take});await click('media-sync');await wait(`document.querySelector('#cloud-media').textContent.includes('al día')||document.querySelector('#cloud-media [role=alert]')`);assert.ok(await evaluate(`document.querySelector('#cloud-media').textContent.includes('al día')`),await evaluate(`document.querySelector('#cloud-media').textContent`));
 const rows=await evaluate(stored);assert.equal(rows.length,1);assert.equal(rows[0].id,take.id);assert.equal(rows[0].durationMs,120000);assert.equal(rows[0].bytes,Buffer.from(take.base64,'base64').length);
 await evaluate(`__driveFixture.offline=true`);await click('piano');await wait(`document.querySelector('[data-action=multimedia]')`);await click('multimedia');await wait(`document.querySelector('[data-action=media-play]')`);
 await click('media-play');await wait(`document.querySelector('#cp-media-capture audio')?.readyState>=1`);
 assert.equal(await evaluate(`document.querySelector('#cp-media-capture audio').duration`),120);
 await evaluate(`document.querySelector('#cp-media-capture audio').currentTime=90`);assert.equal(await evaluate(`document.querySelector('#cp-media-capture audio').currentTime`),90);
 const folder=process.env.SPINO_MEDIA_SYNC_EVIDENCE,frames=[];
 if(folder){await mkdir(folder,{recursive:true});for(const [layout,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth+1`),false);const file='offline-playback-'+layout+'.png',shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({file,layout,width,height});}}
 await evaluate(`window.confirm=()=>true;document.querySelector('[data-media=delete]').click()`);await wait(`document.querySelector('#cp-media-capture').hidden`);assert.deepEqual(await evaluate(stored),[]);
 await evaluate(`__driveFixture.offline=false`);await click('settings');await click('profile-backup');await click('media-sync');await wait(`document.querySelector('#cloud-media').textContent.includes('al día')||document.querySelector('#cloud-media [role=alert]')`);assert.ok(await evaluate(`document.querySelector('#cloud-media').textContent.includes('al día')`),await evaluate(`document.querySelector('#cloud-media').textContent`));assert.deepEqual(await evaluate(stored),[]);assert.equal(await evaluate(`__mediaFixture.files.size`),1);assert.deepEqual(errors,[]);
 if(folder)await writeFile(folder+'/verification.json',JSON.stringify({date:new Date().toISOString(),kind:'responsive-browser-simulated-native-and-Drive',realGoogleTransferTested:false,checks:['Same notebook Google account','SHA256 verified copy stored in local IndexedDB','120-second offline playback and seeking','Local deletion keeps Drive copy and avoids redownload'],frames},null,2));
});

test('recording mobile-data switch permits cellular copies independently from score downloads and survives reload',{timeout:60000},async t=>{
 const remoteTake={...take,id:'synthetic-cellular-remote',title:'Other device recording'};
 const {send,evaluate,wait,click,errors}=await setup(t,{remote:cloudRecoveryFixture(),localMedia:take,remoteMedia:remoteTake,network:{type:'cellular',saveData:true}});
 const snapshot=()=>evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets']),state=tx.objectStore('state').get('current'),assets=tx.objectStore('assets').getAll();tx.oncomplete=()=>{db.close();resolve({data:state.result,assets:assets.result})}}})`);
 await wait(`document.querySelector('#cloud-media').textContent.includes('Wi-Fi')`);
 assert.equal(await evaluate(`document.querySelector('[data-action=media-mobile-data]').getAttribute('aria-checked')`),'false');
 assert.equal(await evaluate(`__mediaFixture.sessions.size`),0);const before=await snapshot();assert.equal(before.data.preferences.wifiOnly,true);
 const folder=process.env.SPINO_MEDIA_NETWORK_EVIDENCE,frames=[];
 const capture=async state=>{if(!folder)return;await mkdir(folder,{recursive:true});for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme='${theme}';document.querySelector('[data-action=media-mobile-data]').scrollIntoView({block:'center'})`);
  const geometry=await evaluate(`(()=>{const b=document.querySelector('[data-action=media-mobile-data]'),r=b.getBoundingClientRect();return{noOverflow:document.querySelector('.cp-page').scrollWidth<=document.querySelector('.cp-page').clientWidth+1,visible:r.top>=0&&r.bottom<=innerHeight,target:r.width>=44&&r.height>=44,checked:b.getAttribute('aria-checked')}})()`);
  assert.equal(geometry.noOverflow,true);assert.equal(geometry.visible,true);assert.equal(geometry.target,true);
  const file=state+'-'+theme+'-'+width+'x'+height+'.png',shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({file,state,theme,width,height,geometry});
 }};
 await capture('wifi-only');await click('media-mobile-data');
 await wait(`document.querySelector('[data-action=media-mobile-data]').getAttribute('aria-checked')==='true'&&__mediaFixture.files.size===2&&document.querySelector('#cloud-media').textContent.includes('al día')`);
 assert.equal(await evaluate(`__mediaWifiOnly`),false,'Native recording connection must allow metered cellular data');
 const rows=await evaluate(stored);assert.deepEqual(rows.map(r=>r.id).sort(),[take.id,remoteTake.id].sort());assert.ok(rows.every(r=>r.bytes===Buffer.from(take.base64,'base64').length));
 assert.deepEqual(await snapshot(),before,'Media network permission never changes notebook, score-download policy, PDFs or annotations');await capture('mobile-data');
 await send('Page.reload');await wait(`document.querySelector('.cp-profile-nav')`);await click('settings');await click('profile-backup');await wait(`document.querySelector('[data-action=media-mobile-data]')`);
 assert.equal(await evaluate(`document.querySelector('[data-action=media-mobile-data]').getAttribute('aria-checked')`),'true');
 await click('media-mobile-data');await wait(`document.querySelector('[data-action=media-mobile-data]').getAttribute('aria-checked')==='false'&&document.querySelector('#cloud-media').textContent.includes('Wi-Fi')`);
 assert.equal((await snapshot()).data.preferences.wifiOnly,true);assert.equal((await evaluate(stored)).length,2);assert.deepEqual(errors,[]);
 if(folder)await writeFile(folder+'/verification.json',JSON.stringify({date:new Date().toISOString(),kind:'responsive-browser-simulated-native-and-Drive',realCellularTransferTested:false,frames,checks:['Wi-Fi policy waits on metered cellular','Device switch allows upload and download','Native bridge receives wifiOnly false','Device permission survives reload','Restoring Wi-Fi policy stops cellular copying','Score downloads, notebook, PDFs and annotations unchanged'],sourceHashes:Object.fromEntries(await Promise.all(['src/companion/media-network.js','src/companion/app.js','src/companion/drive-sync-view.js','tests/drive-media.browser.test.js'].map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')]))),buildIndexSha256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex')},null,2));
});
