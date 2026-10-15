import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';
import { cloudRecoveryBootstrap, cloudRecoveryFixture } from '../scripts/review/cloud-recovery-fixture.mjs';

const snapshot = evaluate => evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets']),data=tx.objectStore('state').get('current'),assets=tx.objectStore('assets').getAll();tx.oncomplete=()=>{resolve({data:data.result,assets:assets.result});db.close();};};})`);
async function setup(t, mode) {
  const browser = await openBrowser(t,{companion:true,language:'es'});
  const {send,evaluate,url}=browser;
  await send('Page.addScriptToEvaluateOnNewDocument',{source:cloudRecoveryBootstrap(mode)});
  await send('Page.navigate',{url});
  const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let count=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++count>400){clearInterval(timer);reject(Error('Cloud local review timeout: '+${JSON.stringify(condition)}));}},20);})`);
  try { await wait(`document.querySelector('.cp-today') && __cloudReview.statusCalls>0`); }
  catch(error) { console.error(JSON.stringify({errors:browser.errors,state:await evaluate(`({text:document.body.innerText.slice(-3000),seed:sessionStorage.getItem('cloud-recovery-seeded')})`)}));throw error; }
  return {...browser,wait,click:action=>evaluate(`document.querySelector('[data-action="${action}"]').click()`)};
}

test('Catalan notebook sync accepts the reader locale and keeps invalid remote data untouched',{timeout:60000},async t=>{
 const {send,evaluate,wait,click,errors}=await setup(t,'catalan');
 await wait(`document.documentElement.lang==='ca'`);await click('settings');await click('profile-backup');await click('cloud-sync');
 try{await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);}
 catch(error){console.error(JSON.stringify(await evaluate(`({meta:localStorage.getItem('spino.cloud-sync.device.v1'),body:document.body.innerText.slice(-2000)})`)));throw error;}
 assert.equal(await evaluate(`JSON.parse(JSON.parse(__cloudReview.text).legacy['sr.settings']).lang`),'ca');
 const healthy=await snapshot(evaluate);assert.deepEqual(healthy.assets,cloudRecoveryFixture('ca').assets);assert.equal(healthy.data.preferences.language,'ca');
 const evidence=process.env.CLOUD_CATALAN_CAPTURE;if(evidence)await mkdir(evidence,{recursive:true});
 const capture=async state=>{
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
   assert.equal(await evaluate(`document.querySelector('#cp-dialog').scrollWidth<=document.querySelector('#cp-dialog').clientWidth+1`),true);
   if(evidence)await writeFile(`${evidence}/${state}-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
 };
 await click('cloud-manage');
 assert.equal(await evaluate(`document.querySelector('#cp-dialog').textContent.includes('Mentre SPino és obert.')`),true);
 await capture('saved');
 await evaluate(`{const remote=JSON.parse(__cloudReview.text);remote.version=99;__cloudReview.text=JSON.stringify(remote);window.invalidRemote=__cloudReview.text;window.writesBeforeInvalid=__cloudReview.writes;}`);
 await click('cloud-sync');await wait(`document.querySelector('#cloud-backup[data-cloud-status=error]')`);
 await click('cloud-manage');await evaluate(`document.querySelector('#cp-dialog .cp-cloud-details').open=true`);
 const text=await evaluate(`document.querySelector('#cp-dialog').textContent`);assert.match(text,/No s’ha pogut actualitzar/);assert.doesNotMatch(text,/Update failed|While SPino is open/);
 await capture('invalid-remote');
 assert.deepEqual(await snapshot(evaluate),healthy);assert.equal(await evaluate(`__cloudReview.text===invalidRemote&&__cloudReview.writes===writesBeforeInvalid`),true);
 assert.deepEqual(errors,[]);
});

test('a provider error offers local practice, preserves scores, saves progress and stays paused after reload',{timeout:60000},async t=>{
  const {send,evaluate,wait,click,errors}=await setup(t,'missing');
  await click('practice');await evaluate(`document.querySelector('[data-action=prepare][data-id=reading]').click();document.querySelector('#prepare-form').requestSubmit()`);
  await wait(`document.querySelector('#cp-dialog[open]')?.textContent.includes('necesita atención')`);
  assert.equal(await evaluate(`!!document.querySelector('#cp-dialog [data-action=cloud-continue-local]')`),true);
  if(process.env.CLOUD_LOCAL_CAPTURE){await mkdir(process.env.CLOUD_LOCAL_CAPTURE,{recursive:true});for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    await evaluate(`document.querySelector('#cp-dialog [data-action=cloud-continue-local]').scrollIntoView({block:'center'})`);
    assert.equal(await evaluate(`(()=>{const b=document.querySelector('#cp-dialog [data-action=cloud-continue-local]'),r=b.getBoundingClientRect();return !b.disabled&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})()`),true);
    const image=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${process.env.CLOUD_LOCAL_CAPTURE}/start-local-${width}x${height}.png`,Buffer.from(image.data,'base64'));
  }}
  await click('cloud-continue-local');await wait(`document.querySelector('[data-action=session-end]')`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('spino.cloud-sync.device.v1')).enabled`),false);
  const active=await snapshot(evaluate);assert.equal(active.data.active.blocks[0].type,'reading');assert.deepEqual(active.assets,cloudRecoveryFixture().assets);
  await click('session-end');await wait(`document.querySelector('#cp-dialog [name=title]')`);
  await evaluate(`document.querySelector('#cp-dialog [name=title]').value='Saved offline';document.querySelector('#cp-dialog form').requestSubmit(document.querySelector('#cp-dialog button[value=save]'))`);
  await wait(`document.querySelector('.cp-today')`);const saved=await snapshot(evaluate);assert.equal(saved.data.sessions[0].title,'Saved offline');assert.equal(saved.data.works[0].id,'synthetic-work');assert.deepEqual(saved.assets,active.assets);
  await send('Page.reload');await wait(`document.querySelector('.cp-today')`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('spino.cloud-sync.device.v1')).enabled`),false);
  await click('settings');await click('profile-backup');await click('cloud-manage');
  assert.equal(await evaluate(`document.querySelector('#cp-dialog [role=switch]').getAttribute('aria-checked')`),'false');
  await click('cloud-relink');await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);
  assert.equal(await evaluate(`JSON.parse(__cloudReview.text).data.sessions[0].title`),'Saved offline');assert.deepEqual((await snapshot(evaluate)).assets,active.assets);assert.deepEqual(errors,[]);
});

test('a stalled provider can be paused immediately and quick practice opens only once',{timeout:60000},async t=>{
  const {evaluate,wait,click,errors}=await setup(t,'stalled');
  await click('practice');await click('quick-practice');await wait(`__cloudReview.release && document.querySelector('#cp-dialog [data-cloud-preflight]')`);
  await click('cloud-continue-local');await wait(`document.querySelector('#reader-view') && !document.querySelector('#reader-view').hidden`);
  const before=await snapshot(evaluate);assert.ok(before.data.active);assert.equal(before.data.active.blocks[0].quickPractice,true);
  await evaluate(`__cloudReview.mode='ok';__cloudReview.release()`);
  await new Promise(resolve=>setTimeout(resolve,100));const after=await snapshot(evaluate);
  assert.equal(after.data.active.id,before.data.active.id);assert.equal(await evaluate(`JSON.parse(localStorage.getItem('spino.cloud-sync.device.v1')).status`),'paused');assert.deepEqual(after.assets,before.assets);assert.deepEqual(errors,[]);
});

test('a successful preflight does not treat its progress dialog as an editor',{timeout:60000},async t=>{
  const {evaluate,wait,click,errors}=await setup(t,'ok');await click('practice');await click('quick-practice');
  try { await wait(`document.querySelector('#reader-view') && !document.querySelector('#reader-view').hidden`); }
  catch(error){console.error(JSON.stringify(await evaluate(`({meta:localStorage.getItem('spino.cloud-sync.device.v1'),body:document.body.innerText.slice(-2500),cloud:__cloudReview})`)));throw error;}
  assert.ok((await snapshot(evaluate)).data.active);assert.equal(await evaluate(`JSON.parse(localStorage.getItem('spino.cloud-sync.device.v1')).enabled`),true);assert.deepEqual(errors,[]);
});

test('provider repair and local controls stay reachable in overview and manage across four layouts',{timeout:60000},async t=>{
  const {send,evaluate,wait,click,errors}=await setup(t,'missing');
  await click('settings');await click('profile-backup');await click('cloud-sync');await wait(`document.querySelector('#cloud-backup[data-cloud-status=error]')`);
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    for(const surface of ['overview','manage']){
      if(surface==='manage')await click('cloud-manage');
      const container=surface==='manage'?'#cp-dialog':'#cloud-backup';
      for(const action of ['cloud-relink','cloud-continue-local']){
        await evaluate(`document.querySelector('${container} [data-action=${action}]').scrollIntoView({block:'center'})`);
        assert.equal(await evaluate(`(()=>{const box=document.querySelector('${container}'),b=box.querySelector('[data-action=${action}]'),r=b.getBoundingClientRect();return !b.disabled&&r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&box.scrollWidth<=box.clientWidth+1;})()`),true);
      }
      if(process.env.CLOUD_LOCAL_CAPTURE){const image=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${process.env.CLOUD_LOCAL_CAPTURE}/${surface}-${width}x${height}.png`,Buffer.from(image.data,'base64'));}
      if(surface==='manage')await click('close-dialog');
    }
  }
  await click('cloud-manage');await evaluate(`document.querySelector('#cp-dialog [data-action=cloud-continue-local]').click()`);
  await wait(`document.querySelector('#cloud-backup[data-cloud-status=paused]')`);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('spino.cloud-sync.device.v1')).enabled`),false);assert.deepEqual(errors,[]);
});


test('Catalan file linking reaches the picker, preserves cancellation and separates joining from sharing',{timeout:60000},async t=>{
 const {send,evaluate,wait,click,errors}=await setup(t,'join-catalan');
 await click('settings');await click('device-link');
 assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('#cp-dialog .cp-cloud-options [data-action]'),b=>b.dataset.action)`),['device-link-scan','cloud-join-shared']);
 assert.equal(await evaluate(`!!document.querySelector('#cp-dialog [data-action=device-link-show]')`),false);
 const before=await snapshot(evaluate),remote=await evaluate(`__cloudReview.text`);
 await evaluate(`__cloudReview.cancelPick=true`);await click('cloud-join-shared');await wait(`__cloudReview.picks===1&&!document.querySelector('#cp-dialog').open`);
 assert.deepEqual(await snapshot(evaluate),before);assert.equal(await evaluate(`__cloudReview.text`),remote);
 await click('settings');await click('device-link');await evaluate(`__cloudReview.cancelPick=false;__cloudReview.failPick=true`);await click('cloud-join-shared');
 await wait(`document.querySelector('#cp-dialog [data-cloud-dialog=manage]')`);assert.match(await evaluate(`document.querySelector('#cp-dialog').textContent`),/Synthetic file provider unavailable/);
 await click('close-dialog');await click('settings');await click('device-link');await evaluate(`__cloudReview.failPick=false`);await click('cloud-join-shared');
 await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved],#cloud-backup[data-cloud-status=conflict]')`);
 if(await evaluate(`!!document.querySelector('#cloud-backup[data-cloud-status=conflict]')`)){await click('cloud-conflicts');await click('cloud-resolve-local');}
 await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);assert.equal(await evaluate(`__cloudReview.picks`),3);assert.equal(await evaluate(`__cloudReview.pickOptions.link`),true);
 assert.deepEqual((await snapshot(evaluate)).assets,before.assets);
 await click('settings');assert.equal(await evaluate(`!!document.querySelector('[data-action=device-link]')`),false);
 await click('profile-backup');await click('cloud-manage');
 assert.equal(await evaluate(`!!document.querySelector('#cp-dialog [data-action=device-link-show]')`),true);
 assert.equal(await evaluate(`!!document.querySelector('#cp-dialog [data-action=cloud-setup],#cp-dialog [data-action=device-link]')`),false);
 const evidence=process.env.CLOUD_LINK_CAPTURE;if(evidence)await mkdir(evidence,{recursive:true});
 const capture=async state=>{for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  assert.equal(await evaluate(`document.querySelector('#cp-dialog').scrollWidth<=document.querySelector('#cp-dialog').clientWidth+1`),true);
  if(evidence)await writeFile(`${evidence}/${state}-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 }};
 await capture('manage');await click('device-link-show');await wait(`document.querySelector('.cp-device-qr')`);await capture('share-qr');await click('close-dialog');
 await click('cloud-manage');await click('cloud-continue-local');await click('settings');assert.equal(await evaluate(`!!document.querySelector('[data-action=device-link]')`),false);
 await click('profile-backup');await click('cloud-manage');await click('cloud-disconnect');await evaluate(`document.querySelector('#cp-confirm').click()`);
 await wait(`!document.querySelector('#cp-dialog').open&&document.querySelector('#cloud-backup[data-cloud-status=disconnected]')`);
 assert.deepEqual((await snapshot(evaluate)).assets,before.assets);assert.equal(await evaluate(`__cloudReview.picks`),3);
 await click('settings');await click('device-link');await wait(`document.querySelector('#cp-toast').hidden`);await capture('join');assert.deepEqual(errors,[]);
});
