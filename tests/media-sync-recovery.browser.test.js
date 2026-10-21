import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {driveNotebookBootstrap} from '../scripts/review/drive-notebook-fixture.mjs';
import {cloudRecoveryFixture} from '../scripts/review/cloud-recovery-fixture.mjs';

const base64=(await readFile('tests/fixtures/media/two-minute-stream.webm')).toString('base64');
const take={id:'synthetic-local-recording',workId:'synthetic-work',title:'Synthetic local recording',workTitle:'Synthetic score',createdAt:'2026-10-21T10:00:00Z',durationMs:120000,kind:'audio',draft:false,base64};
const remoteTake={...take,id:'synthetic-remote-recording',title:'Synthetic rejected recording <original title>',mimeType:'application/octet-stream'};

test('recording problems name the file, allow independent copies and recover through Retry', {timeout:60000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:driveNotebookBootstrap({remote:cloudRecoveryFixture(),localMedia:take,remoteMedia:remoteTake})});
 await send('Page.navigate',{url});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>700){clearInterval(timer);reject(Error('Recovery timeout: '+${JSON.stringify(condition)}));}},20);})`);
 const click=action=>evaluate(`document.querySelector('[data-action="${action}"]').click()`);
 await wait(`document.querySelector('.cp-profile-nav')`);await click('settings');await click('profile-backup');await click('drive-connect');
 await wait(`document.querySelector('[data-drive-picker]')`);await evaluate(`document.querySelector('[data-drive-picker]').requestSubmit()`);
 await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);await click('media-sync');
 await wait(`document.querySelector('.cp-media-sync-issues')&&__mediaFixture.files.size===2`);
 assert.equal(await evaluate(`document.querySelector('.cp-media-sync-issues strong').textContent`),remoteTake.title);
 assert.match(await evaluate(`document.querySelector('.cp-media-sync-issues').textContent`),/formato.*no es compatible/);
 assert.match(await evaluate(`document.querySelector('.cp-media-sync-status').textContent`),/Copias completadas: 1.*atención: 1/);
 assert.equal(await evaluate(`document.querySelector('[data-action=sync-settings]').dataset.syncStatus`),'media');
 assert.equal(await evaluate(`document.querySelector('[data-action=media-sync]').disabled`),false);
 assert.equal(await evaluate(`!!document.querySelector('.cp-media-sync-issues original')`),false,'Recording titles stay plain text');
 const folder=process.env.SPINO_MEDIA_RECOVERY_EVIDENCE,frames=[];
 const capture=async state=>{
  if(!folder)return;await mkdir(folder,{recursive:true});
  for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await evaluate(`document.documentElement.dataset.theme='${theme}';document.querySelector('${state==='error'?'.cp-media-sync-issues':'#cloud-media'}').scrollIntoView({block:'center'});new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
   assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth<=document.querySelector('.cp-page').clientWidth+1`),true);
   const file=`${state}-${theme}-${width}x${height}.png`,shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({file,state,theme,width,height});
  }
 };
 await capture('error');
 // Model a valid HTTP codec serialization; the prior validator rejected this.
 await evaluate(`__mediaFixture.files.get('synthetic-remote-take').mimeType='audio/webm; codecs="opus"'`);
 await click('media-sync');await wait(`document.querySelector('#cloud-media').textContent.includes('al día')`);
 assert.equal(await evaluate(`!!document.querySelector('.cp-media-sync-issues')`),false);assert.equal(await evaluate(`__mediaFixture.files.size`),2);
 const rows=await evaluate(`(async()=>{
  const records=await new Promise(resolve=>{const r=indexedDB.open('spino-local-media');r.onsuccess=()=>{const db=r.result,q=db.transaction('recordings').objectStore('recordings').getAll();q.onsuccess=()=>{db.close();resolve(q.result);};};});
  return Promise.all(records.map(async({blob,...record})=>{
   const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
   return {...record,bytes:blob.size,sha256:Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('')};
  }));
 })()`);
 assert.deepEqual(rows.map(r=>r.id).sort(),[take.id,remoteTake.id].sort());
 for(const row of rows)assert.equal(row.sha256,createHash('sha256').update(Buffer.from(base64,'base64')).digest('hex'));
 await capture('saved');assert.deepEqual(errors,[]);
 if(folder)await writeFile(folder+'/verification.json',JSON.stringify({date:new Date().toISOString(),kind:'responsive-browser-synthetic-Drive',realGoogleTransferTested:false,frames,checks:['Independent upload completed despite rejected remote metadata','Failed title escaped and specific reason translated','Retry button enabled and global indicator reports attention','Quoted-codec metadata recovered on retry','Downloaded original bytes verified','No duplicate Drive files'],sourceHashes:Object.fromEntries(await Promise.all(['src/companion/drive-media.js','src/companion/media-sync.js','src/companion/drive-sync-view.js','tests/media-sync-recovery.browser.test.js'].map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')]))),buildIndexSHA256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex')},null,2));
});
