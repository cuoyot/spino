import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { openBrowser } from './browser.js';
import { connectedDriveBootstrap } from '../scripts/review/drive-connected-fixture.mjs';

test('global sync indicator updates and opens recovery from the notebook header', { timeout: 60000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: await connectedDriveBootstrap({ language: 'es' }) });
  await send('Page.navigate', { url });
  const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('Indicator timeout'));}},20);})`);
  const click = action => evaluate(`document.querySelector('[data-action="${action}"]').click()`);
  await wait(`document.querySelector('.cp-today')&&__cloudReview.statusCalls>0`);
  assert.equal(await evaluate(`!!document.querySelector('[data-action=sync-settings]')`), false);
  await click('settings'); await click('profile-backup'); await click('drive-connect');
  await wait(`document.querySelector('[data-drive-picker]')`);
  await evaluate(`document.querySelector('[data-drive-picker]').requestSubmit()`);
  await wait(`document.querySelector('[data-open-remote]')||document.querySelector('[data-sync-status=saved]')`);
  await evaluate(`document.querySelector('[data-open-remote]')?.closest('form').requestSubmit()`);
  await wait(`document.querySelector('[data-sync-status=saved]')`);
  await evaluate(`{const file=[...__driveFixture.files.values()].find(f=>f.appProperties?.spinoType==='spino-object-v2'&&JSON.parse(f.text).kind==='record-changes');file.text=file.text.replace('record-changes','record-invalid');file.revision++;__driveFixture.touch(file);}`);
  await click('cloud-sync');
  await wait(`document.querySelector('[data-sync-status=error]')`);
  await click('settings');
  const dir = process.env.SYNC_INDICATOR_EVIDENCE || 'artifacts/sync-indicator-browser';
  await mkdir(dir, { recursive: true });
  for (const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]) {
    await send('Emulation.setDeviceMetricsOverride', { width,height,deviceScaleFactor:1,mobile:true });
    assert.equal(await evaluate(`(()=>{const b=document.querySelector('[data-action=sync-settings]'),m=document.querySelector('.cp-midi-status'),r=b.getBoundingClientRect(),s=m.getBoundingClientRect();return b.dataset.attention==='true'&&r.width>=44&&r.right<=s.left&&s.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth;})()`), true);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(`${dir}/error-${width}x${height}.png`, Buffer.from(shot.data, 'base64'));
  }
  await click('sync-settings');
  await wait(`document.querySelector('#cloud-backup [role=alert]')`);
  assert.equal(await evaluate(`document.querySelector('.cp-page').dataset.view`), 'profile-backup');
  assert.deepEqual(errors, []);
});

test('progress preserves rotation, focus and centered geometry across shared header renders', { timeout: 120000 }, async t => {
  const {send, evaluate, url, errors} = await openBrowser(t, {companion: true});
  await send('Page.addScriptToEvaluateOnNewDocument', {source: await connectedDriveBootstrap({language: 'es'})});
  await send('Page.navigate', {url});
  const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('Rotation timeout'));}},20);})`);
  const click = action => evaluate(`document.querySelector('[data-action="${action}"]').click()`);
  await wait(`document.querySelector('.cp-today')&&__cloudReview.statusCalls>0`);
  await click('settings'); await click('profile-backup'); await click('drive-connect');
  await wait(`document.querySelector('[data-drive-picker]')`);
  await evaluate(`document.querySelector('[data-drive-picker]').requestSubmit()`);
  await wait(`document.querySelector('[data-open-remote]')||document.querySelector('[data-sync-status=saved]')`);
  await evaluate(`document.querySelector('[data-open-remote]')?.closest('form').requestSubmit()`);
  await wait(`document.querySelector('[data-sync-status=saved]')`);
  await evaluate(`{
    for(const file of __driveFixture.files.values())if(['spino-object-v2','spino-commit-v2'].includes(file.appProperties?.spinoType)){file.revision++;__driveFixture.touch(file);}
    window.__driveStall=true;
  }`);
  await click('cloud-sync');
  await wait(`window.__releaseDrive&&document.querySelector('[data-sync-status=writing]')`);
  await evaluate(`{
    window.__rotationSvg=document.querySelector('.cp-sync-status svg');
    window.__rotationAnimation=__rotationSvg.getAnimations()[0];
    document.querySelector('.cp-sync-status').focus();
  }`);
  await wait(`__rotationAnimation.currentTime>200`);
  await evaluate(`{window.__previousRelease=__releaseDrive;__releaseDrive();}`);
  await wait(`__releaseDrive!==__previousRelease`);
  assert.equal(await evaluate(`document.querySelector('.cp-sync-status svg')===__rotationSvg&&__rotationSvg.getAnimations()[0]===__rotationAnimation&&__rotationAnimation.currentTime>200`), true, 'Progress must preserve the running animation');
  assert.equal(await evaluate(`document.activeElement===document.querySelector('.cp-sync-status')`), true, 'Progress keeps keyboard focus');
  await evaluate(`window.__phaseBeforeRoute=document.querySelector('.cp-sync-status svg').getAnimations()[0].currentTime`);
  await click('home');
  assert.equal(await evaluate(`document.querySelector('.cp-sync-status svg').getAnimations()[0].currentTime>=__phaseBeforeRoute`), true, 'Route renders keep the rotation phase');
  const dir = process.env.SYNC_INDICATOR_EVIDENCE;
  if(dir) await mkdir(dir, {recursive:true});
  const frames = [];
  for(const theme of ['light','dark']) {
    await click('settings'); await click('profile-appearance');
    await evaluate(`document.querySelector('[data-action=set-theme][data-id=${theme}]').click()`);
    await click('close-dialog');
    for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]) {
      await send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:true});
      for(const route of ['home','practice','calendar','settings']) {
        await click(route);
        const geometry = await evaluate(`(()=>{
          const button=document.querySelector('.cp-sync-status'),svg=button.querySelector('svg'),style=getComputedStyle(svg),box=button.getBoundingClientRect();
          const origin=style.transformOrigin.split(' ').map(parseFloat);
          return {writing:button.dataset.syncStatus==='writing',origin,width:parseFloat(style.width),height:parseFloat(style.height),transformBox:style.transformBox,animations:svg.getAnimations().length,touchTarget:box.width>=44&&box.height>=44,contained:document.documentElement.scrollWidth<=innerWidth};
        })()`);
        assert.equal(geometry.origin[0],geometry.width/2,`${theme}/${width}/${route}: horizontal center`);
        assert.equal(geometry.origin[1],geometry.height/2,`${theme}/${width}/${route}: vertical center`);
        assert.deepEqual({writing:geometry.writing,transformBox:geometry.transformBox,animations:geometry.animations,touchTarget:geometry.touchTarget,contained:geometry.contained},{writing:true,transformBox:'view-box',animations:1,touchTarget:true,contained:true},`${theme}/${width}/${route}: centered spinner and header containment`);
        if(dir) {
          const file=`writing-${theme}-${route}-${width}x${height}.png`;
          const shot=await send('Page.captureScreenshot',{format:'png'});
          await writeFile(`${dir}/${file}`,Buffer.from(shot.data,'base64'));frames.push(file);
        }
      }
    }
  }
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.cp-sync-status svg')).animationName`),'none');
  await send('Emulation.setEmulatedMedia',{features:[]});
  await evaluate(`{__driveStall=false;__releaseDrive();}`);
  await wait(`!document.querySelector('[data-sync-status=writing]')`);
  await click('settings'); await click('profile-backup'); await click('cloud-sync');
  await wait(`document.querySelector('[data-sync-status=saved]')`);
  assert.deepEqual(errors,[]);
  if(dir) {
    const sources=['src/companion/app.js','src/companion/app.css','src/companion/sync-indicator.js','tests/sync-indicator.browser.test.js'];
    await writeFile(`${dir}/verification.json`,JSON.stringify({date:new Date().toISOString(),kind:'Responsive browser, synthetic Drive notebook',nativeAcceptance:false,frames,checks:['Progress retains the SVG, animation object and keyboard focus','Route renders preserve animation phase','Centered SVG view-box rotation','Four earlier shared-header routes in both themes and four orientations','Reduced motion disables rotation','Stalled synthetic synchronization completes'],sourceHashes:Object.fromEntries(await Promise.all(sources.map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')]))),buildIndexSHA256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex')},null,2));
  }
});
