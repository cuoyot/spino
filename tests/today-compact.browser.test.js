import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {openBrowser} from './browser.js';
import {todayCompactFixtures,REVIEW_NOW} from '../scripts/review/today-compact-fixtures.mjs';

test('Today restores the weekly overview and retains appointments and performance priorities', {timeout:60000},async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  const baseline=!!process.env.TODAY_COMPACT_BASELINE,evidence=process.env.TODAY_COMPACT_EVIDENCE,measurements=[];
  await send('Emulation.setTimezoneOverride',{timezoneId:'Europe/Madrid'});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`{const OriginalDate=Date,fixed=${Date.parse(REVIEW_NOW)};window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};}`});
  const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('Compact Today timeout'));}},20);})`);
  await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
  if(evidence)await mkdir(evidence,{recursive:true});
  for(const [state,fixture] of Object.entries(todayCompactFixtures())) {
    await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};})`);
    await send('Page.reload');await wait(`document.querySelector('.cp-today')`);await evaluate('document.fonts.ready');await wait(`document.querySelector('#cp-toast').hidden`);
    assert.equal(await evaluate(`document.querySelector('.cp-today-progress-total strong').textContent`),'50 min');
    if(!baseline){
      assert.equal(await evaluate(`document.querySelector('.cp-today-progress-heading h2').textContent`),'Tu semana');
      assert.match(await evaluate(`document.querySelector('.cp-today-progress-caption').textContent`),/190/);
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.cp-today-progress-caption')).position`),'static');
      assert.equal(await evaluate(`!!(document.querySelector('.cp-upcoming-section').compareDocumentPosition(document.querySelector('.cp-today-history'))&Node.DOCUMENT_POSITION_FOLLOWING)`),true);
      assert.equal(await evaluate(`document.querySelectorAll('.cp-today-history .cp-history-card').length`),1);
    }
    if(evidence)await writeFile(`${evidence}/${state}.fixture.json`,JSON.stringify(fixture,null,2));
    for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)};document.querySelector('.cp-page').scrollTop=0;new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
      const metrics=await evaluate(`(()=>{const p=document.querySelector('.cp-page'),box=e=>{const b=e.getBoundingClientRect();return{top:b.top,bottom:b.bottom,height:b.height}},first=document.querySelector('.cp-upcoming-featured .cp-upcoming-event');return{progress:box(document.querySelector('.cp-today-progress')),focus:box(document.querySelector('.cp-today-focus')),summary:box(document.querySelector('.cp-today-progress-summary')||document.querySelector('.cp-today-progress-total')),week:box(document.querySelector('.cp-today-week')),appointment:box(document.querySelector('.cp-today-sessions [data-id="review-lessons@2026-11-10"]')),performance:box(first),page:box(p),overflow:p.scrollWidth>p.clientWidth+1,pills:[...document.querySelectorAll('.cp-day-practice')].map(e=>({date:e.closest('button').dataset.id,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,fillWidth:e.firstElementChild.getBoundingClientRect().width,fillHeight:e.firstElementChild.getBoundingClientRect().height,minutes:e.nextElementSibling.textContent})),actions:[...document.querySelectorAll('.cp-today-focus button')].map(e=>({action:e.dataset.action,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))}})()`);
      if(evidence)await writeFile(`${evidence}/${state}-${theme}-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
      assert.equal(metrics.overflow,false);
      if(!baseline){
        assert.ok(metrics.pills.every(p=>p.height===32),JSON.stringify(metrics.pills));
        assert.ok(metrics.focus.height<=(state==='current'?60:145),JSON.stringify({state,width,height,...metrics}));
        assert.ok(metrics.appointment.top<metrics.performance.top);
        for(const action of metrics.actions)assert.ok(action.width>=44&&action.height>=44,JSON.stringify(action));
      }
      measurements.push({state,theme,width,height,...metrics});
    }
    const retained=await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{db.close();resolve(q.result)}}})`);
    assert.deepEqual(retained.events,fixture.events);assert.deepEqual(retained.sessions,fixture.sessions);assert.deepEqual(retained.works,fixture.works);
  }
  assert.deepEqual(errors,[]);
  if(evidence){
    const paths=['src/companion/agenda.js','src/companion/app.js','src/companion/browse-surfaces.css','src/companion/today.css','src/companion/appearance.css','src/companion/theme.js','src/companion/app.css','src/companion/locale-ca.js','src/companion/locale-de.json','src/companion/locale-hu.json','dist/index.html','scripts/review/today-compact-fixtures.mjs','tests/today-compact.browser.test.js'];
    const sourceHashes=Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])));
    await writeFile(`${evidence}/verification.json`,JSON.stringify({createdAt:new Date().toISOString(),baseline,gitHead:process.env.SPINO_REVIEW_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,renderer:await send('Browser.getVersion'),fixedTime:REVIEW_NOW,surface:'Responsive browser, disposable synthetic notebooks; not native-device acceptance',measurements,runtimeErrors:errors},null,2));
  }
});
