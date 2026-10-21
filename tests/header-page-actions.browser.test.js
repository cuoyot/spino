import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {driveNotebookBootstrap} from '../scripts/review/drive-notebook-fixture.mjs';

test('page actions stay accessible below the shared header and Calendar keeps one toolbar', {timeout:120000}, async t => {
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:driveNotebookBootstrap({language:'es'})});
  const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('Page action timeout'));}},20);})`);
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')&&__cloudReview.statusCalls>0`);
  await click('[data-action=settings]');await click('[data-action=profile-backup]');await click('[data-action=drive-connect]');await wait(`document.querySelector('[data-drive-picker]')`);
  await evaluate(`document.querySelector('[data-drive-picker]').requestSubmit()`);await wait(`document.querySelector('[data-sync-status=saved]')`);
  const folder=process.env.PAGE_ACTION_EVIDENCE;
  if(folder)await mkdir(folder,{recursive:true});
  const frames=[];
  for(const theme of ['light','dark']) {
    await click('[data-action=settings]');await click('[data-action=profile-appearance]');await click(`[data-action=set-theme][data-id=${theme}]`);await click('[data-action=close-dialog]');
    for(const [width,height] of [[320,640],[390,844],[844,390],[768,1024],[1024,768]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
      let weekPlanner;
      for(const route of ['home','practice','calendar','calendar-month','multimedia','settings']) {
        if(route==='calendar-month')await click('[data-action=calendar-mode][data-id=month]');
        else if(route==='multimedia') {await click('[data-action=progress]');await click('[data-action=progress-media-week]');}
        else {await click(`[data-action=${route}]`);if(route==='calendar')await click('[data-action=calendar-mode][data-id=week]');}
        await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
        assert.equal(await evaluate(`document.querySelectorAll('.cp-app-header [data-action=record-media],.cp-app-header [data-action=quick-practice],.cp-app-header [data-action=calendar-mode]').length`),0);
        assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth<=document.querySelector('.cp-page').clientWidth+1&&document.querySelector('.cp-app-header').scrollWidth<=document.querySelector('.cp-app-header').clientWidth+1`),true,`${theme}/${width}/${route}: overflow`);
        assert.equal(await evaluate(`(()=>{const b=document.querySelector('[data-action=sync-settings]');return b&&b.getBoundingClientRect().width>=44&&b.getBoundingClientRect().height>=44&&!b.querySelector('.cp-sync-badge')&&getComputedStyle(b).backgroundColor==='rgba(0, 0, 0, 0)';})()`),true);
        if(route==='settings')assert.equal(await evaluate(`(()=>{const b=document.querySelector('.cp-app-header .cp-profile-nav'),avatar=b.querySelector('.cp-avatar'),s=getComputedStyle(avatar),r=avatar.getBoundingClientRect();return b.getAttribute('aria-current')==='page'&&s.outlineStyle==='none'&&s.borderRadius==='50%'&&s.boxShadow.includes('inset')&&getComputedStyle(b).overflow==='visible'&&r.width===r.height;})()`),true);
        if(route==='home')assert.equal(await evaluate(`!!document.querySelector('.cp-today-focus [data-action=record-media]')`),true);
        if(route==='practice')assert.equal(await evaluate(`!!document.querySelector('.cp-shortcuts [data-action=quick-practice]')`),true);
        if(route.startsWith('calendar')) {
          const geometry=await evaluate(`(()=>{const toolbar=document.querySelector('.cp-agenda-toolbar'),b=toolbar.querySelector('[data-action=weekly-planner]').getBoundingClientRect(),s=toolbar.querySelector('.cp-segment').getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height,sameRow:Math.abs(b.top+b.height/2-s.top-s.height/2)<1,organizers:document.querySelectorAll('[data-action=weekly-planner]').length};})()`);
          assert.equal(geometry.sameRow,true);assert.equal(geometry.organizers,1);
          if(route==='calendar')weekPlanner=geometry;else assert.deepEqual(geometry,weekPlanner);
        }
        if(folder) {const path=`${theme}-${route}-${width}x${height}.png`;const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${folder}/${path}`,Buffer.from(shot.data,'base64'));frames.push(path);}
      }
    }
  }
  await click('[data-action=calendar]');await click('[data-action=calendar-mode][data-id=week]');
  const initial=await evaluate(`document.querySelector('[data-week-start]').dataset.weekStart`);
  await click('[data-action=calendar-prev]');assert.notEqual(await evaluate(`document.querySelector('[data-week-start]').dataset.weekStart`),initial);
  await click('[data-action=calendar-next]');assert.equal(await evaluate(`document.querySelector('[data-week-start]').dataset.weekStart`),initial);
  await click('[data-action=today]');await click('[data-action=calendar-mode][data-id=month]');
  const month=await evaluate(`document.querySelector('.cp-calendar-heading h2').textContent`);await click('[data-action=calendar-next]');assert.notEqual(await evaluate(`document.querySelector('.cp-calendar-heading h2').textContent`),month);
  await click('[data-action=weekly-planner]');assert.equal(await evaluate(`document.querySelector('.cp-page').dataset.view`),'planner');
  await click('[data-action=home]');await click('[data-action=record-media]');await wait(`document.querySelector('[data-media-picker]')`);await click('[data-media=close]');
  assert.equal(await evaluate(`document.activeElement?.dataset.action`),'record-media');
  await click('[data-action=practice]');await click('[data-action=quick-practice]');await wait(`document.querySelector('#app-shell').hidden`);
  assert.deepEqual(errors,[]);
  if(folder) {const paths=['src/companion/app.js','src/companion/app.css','src/companion/agenda.js','src/companion/views.js','src/companion/media-view.js','src/companion/sync-indicator.js'];await writeFile(`${folder}/metadata.json`,JSON.stringify({kind:'Responsive browser, synthetic connected Drive notebook',nativeAcceptance:false,browser:await send('Browser.getVersion'),frames,errors,sourceHashes:Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')]))),buildIndexSha256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex')},null,2));}
});
