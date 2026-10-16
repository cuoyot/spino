import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {driveNotebookBootstrap} from '../scripts/review/drive-notebook-fixture.mjs';
import {cloudRecoveryFixture} from '../scripts/review/cloud-recovery-fixture.mjs';
async function setup(t,options={}){
 const b=await openBrowser(t,{companion:true});await b.send('Page.addScriptToEvaluateOnNewDocument',{source:driveNotebookBootstrap(options)});await b.send('Page.navigate',{url:b.url});
 const wait=condition=>b.evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('Drive notebook timeout: '+${JSON.stringify(condition)}));}},20)})`);
 const click=action=>b.evaluate(`document.querySelector('[data-action="${action}"]').click()`);
 await wait(`document.querySelector('.cp-profile-nav')&&window.__cloudReview.statusCalls`);await click('settings');await click('profile-backup');
 return {...b,wait,click};
}
test('Drive setup, legacy migration, reconnect, offline continuation and local JSON copies',{timeout:90000},async t=>{
 const {send,evaluate,wait,click,errors}=await setup(t,{legacy:true});
 const folder=process.env.SPINO_DRIVE_NOTEBOOK_EVIDENCE,frames=[];
 async function capture(state){if(!folder)return;await mkdir(folder,{recursive:true});for(const [layout,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth+1`),false);
  const file=state+'-'+layout+'.png',shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({state,layout,width,height,file});
 }}
 await click('cloud-manage');await capture('legacy-manage');await click('drive-connect');await wait(`document.querySelector('[data-drive-picker]')`);await capture('drive-picker');
 assert.equal(await evaluate(`__driveFixture.files.size`),0);await click('drive-use-local');
 await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`);
 await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);
 assert.equal(await evaluate(`JSON.parse(localStorage.getItem('spino.cloud-sync.device.v1')).notebookId`),cloudRecoveryFixture().cloudBackup.sharedNotebookId);
 assert.equal(await evaluate(`__cloudReview.linked`),false,'Legacy link is released without deleting its file');
 assert.equal(await evaluate(`__driveFixture.files.size`),1);
 assert.equal(await evaluate(`JSON.parse([...__driveFixture.files.values()][0].text).assets[0].annotations.marks[0].id`),'synthetic-mark');
 assert.equal(await evaluate(`document.querySelector('#cloud-backup').textContent.includes('synthetic-owner@example.invalid')`),true);
 await capture('connected');
 assert.equal(await evaluate(`!!document.querySelector('[data-action=export-backup]')&&!!document.querySelector('[data-action=import-backup]')`),true);
 await click('export-backup');assert.equal(await evaluate(`!!document.querySelector('[name=format]')`),true);await capture('local-copy');await click('close-dialog');
 await evaluate(`__driveFixture.revoked=true`);await click('cloud-sync');await wait(`document.querySelector('#cloud-backup[data-cloud-status=error]')`);
 assert.equal(await evaluate(`!!document.querySelector('[data-action=drive-reconnect]')`),true);await click('drive-reconnect');await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);
 await evaluate(`__driveFixture.offline=true`);await click('cloud-sync');await wait(`document.querySelector('#cloud-backup[data-cloud-status=error]')`);await capture('offline');
 await click('cloud-continue-local');await wait(`document.querySelector('#cloud-backup[data-cloud-status=paused]')`);
 await send('Page.reload');await wait(`document.querySelector('.cp-profile-nav')`);await click('settings');await click('profile-backup');
 await wait(`document.querySelector('#cloud-backup[data-cloud-status=paused]')`);assert.equal(await evaluate(`!!document.querySelector('[data-action=export-backup]')&&!!document.querySelector('[data-action=import-backup]')`),true);
 assert.equal(await evaluate(`__driveFixture.files.size`),1);
 await click('cloud-manage');await click('cloud-disconnect');await evaluate(`document.querySelector('#cp-confirm').click()`);await wait(`document.querySelector('#cloud-backup[data-cloud-status=disconnected]')`);assert.equal(await evaluate(`__driveFixture.files.size`),1);
 assert.deepEqual(errors,[]);
 if(folder)await writeFile(folder+'/verification.json',JSON.stringify({date:new Date().toISOString(),kind:'responsive-browser-synthetic-drive-api',googleAuthorizationTested:false,realDriveTransferTested:false,frames,checks:['Legacy notebook identity retained','PDF/annotation IDs retained','Account and direct Drive status visible','Export/import JSON remain available','Revoked permission reconnect','Offline pause and restart retain local notebook','Disconnect retains remote notebook'],sources:Object.fromEntries(await Promise.all(['src/companion/drive-notebook.js','src/companion/notebook-transport.js','src/companion/cloud-sync.js','src/companion/cloud-backup-view.js','src/companion/app.js'].map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])))},null,2));
});
test('a second device finds and joins the Drive notebook from Profile',{timeout:60000},async t=>{
 const remote=cloudRecoveryFixture();remote.data.works.push({...remote.data.works[0],id:'second-work',title:'Remote addition',assetId:null});
 const {evaluate,wait,click,errors}=await setup(t,{remote});await click('cloud-setup');await click('drive-connect');await wait(`document.querySelector('[data-action=drive-select]')`);
 await evaluate(`window.__beforeDriveJoin=true`);
 try{await click('drive-select');}catch(error){if(!/navigated|context/i.test(error.message))throw error;}
 let reloaded=false;for(let n=0;n<200;n++){try{if(await evaluate(`!window.__beforeDriveJoin&&!!document.querySelector('.cp-profile-nav')`)){reloaded=true;break;}}catch(error){if(!/navigated|context/i.test(error.message))throw error;}await new Promise(r=>setTimeout(r,30));}assert.equal(reloaded,true,'Incoming notebook changes reload the adopted local store');
 await click('settings');await click('profile-backup');await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);
 const saved=await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,r=db.transaction('state').objectStore('state').get('current');r.onsuccess=()=>{db.close();resolve(r.result)};};})`);
 assert.ok(saved.works.some(w=>w.id==='second-work'));assert.equal(saved.preferences.theme,'light');assert.deepEqual(errors,[]);
});
