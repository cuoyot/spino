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
