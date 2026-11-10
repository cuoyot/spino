import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {openBrowser} from './browser.js';
import {REVIEW_NOW,todayEventPriorityFixture} from '../scripts/review/today-event-priority-fixture.mjs';

test('Today prioritizes distant performances, opens their details and retains the notebook', {timeout:60000},async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  await send('Emulation.setTimezoneOverride',{timezoneId:'Europe/Madrid'});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`{const OriginalDate=Date,fixed=${Date.parse(REVIEW_NOW)};window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};}`});
  const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('Today priority timeout'));}},20);})`);
  await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
  const evidence=process.env.TODAY_PRIORITY_EVIDENCE,measurements=[];
  if(evidence)await mkdir(evidence,{recursive:true});
  for(const concert of [false,true]){
    const fixture=todayEventPriorityFixture({concert});
    await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};})`);
    await send('Page.reload');await wait(`document.querySelector('.cp-today')`);
    await evaluate('document.fonts.ready');await wait(`document.querySelector('#cp-toast').hidden`);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.cp-upcoming-event')].map(e=>e.dataset.id)`),concert?['review-concert','review-audition','review-secondary-0-1','review-secondary-1-1','review-secondary-0-2','review-secondary-1-2','review-lessons@2026-11-17','review-lessons@2026-11-24']:['review-audition','review-lessons@2026-11-17','review-lessons@2026-11-24']);
    assert.equal(await evaluate(`document.querySelector('[data-id="review-audition"] .cp-upcoming-remaining .sr-only').textContent`),'5 semanas y 2 días');
    assert.deepEqual(await evaluate(`({featured:document.querySelectorAll('.cp-upcoming-featured .cp-upcoming-event').length,secondary:document.querySelectorAll('.cp-upcoming-secondary .cp-upcoming-event').length})`),{featured:concert?2:1,secondary:concert?6:2});
    assert.deepEqual(await evaluate(`[...document.querySelector('[data-id="review-audition"] .cp-upcoming-units').children].map(e=>e.textContent)`),['5semanas','2días']);
    const dateTile=await evaluate(`document.querySelector('.cp-upcoming-event[data-id="review-audition"] .cp-event-date-tile').outerHTML`);
    assert.equal(await evaluate(`document.querySelector('.cp-upcoming-event[data-id="review-audition"] time').dateTime`),'2026-12-17');
    assert.equal(await evaluate(`!!document.querySelector('.cp-today-sessions [data-id="review-lessons@2026-11-10"]')`),true);
    if(evidence)await writeFile(`${evidence}/${concert?'two-performances':'audition'}.fixture.json`,JSON.stringify(fixture,null,2));
    for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)};document.querySelector('.cp-upcoming-event').scrollIntoView({block:'center'});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
      const metrics=await evaluate(`(()=>{const p=document.querySelector('.cp-page'),b=document.querySelector('.cp-upcoming-event'),r=b.getBoundingClientRect(),v=p.getBoundingClientRect();return{overflow:p.scrollWidth>p.clientWidth+1,visible:r.top>=v.top&&r.bottom<=v.bottom,width:r.width,height:r.height,availableWidth:document.querySelector('.cp-upcoming-featured').clientWidth,columns:getComputedStyle(document.querySelector('.cp-upcoming-featured')).gridTemplateColumns.split(' ').filter(size=>parseFloat(size)>0).length}})()`);
      assert.equal(metrics.columns,concert&&metrics.availableWidth>=572?2:1,JSON.stringify({width,height,...metrics}));
      assert.equal(metrics.overflow,false);assert.equal(metrics.visible,true);assert.ok(metrics.width>=44&&metrics.height>=44);
      measurements.push({theme,width,height,...metrics});
      if(evidence)await writeFile(`${evidence}/${concert?'all-types':'audition'}-${theme}-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    }
    await evaluate(`document.querySelector('.cp-upcoming-event[data-id="review-audition"]').click()`);
    await wait(`document.querySelector('.cp-event-overview')`);
    assert.equal(await evaluate(`document.querySelector('.cp-event-overview h1').textContent`),'Audicion de nadal');
    assert.equal(await evaluate(`document.querySelector('.cp-event-overview .cp-event-date-tile').outerHTML`),dateTile);
    assert.equal(await evaluate(`document.querySelector('.cp-event-countdown > strong').textContent`),'5 semanas y 2 días');
    await evaluate(`document.querySelector('[data-action=close-event]').click();document.querySelector('.cp-nav [data-action=home]').click()`);
    await wait(`document.querySelector('.cp-today')`);
    const retained=await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{db.close();resolve(q.result)};};})`);
    assert.deepEqual(retained.events,fixture.events);assert.deepEqual(retained.sessions,fixture.sessions);assert.deepEqual(retained.works,fixture.works);
  }
  assert.deepEqual(errors,[]);
  if(evidence){
    const files=['src/companion/event-recurrence.js','src/companion/agenda.js','src/companion/app.js','src/companion/event-date-tile.js','src/companion/event-countdown.js','src/companion/browse-surfaces.css','src/companion/today.css','src/companion/appearance.css','src/companion/theme.js','src/companion/app.css','dist/index.html','scripts/review/today-event-priority-fixture.mjs','tests/today-event-priority.browser.test.js'];
    const sourceHashes=Object.fromEntries(await Promise.all(files.map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])));
    await writeFile(`${evidence}/verification.json`,JSON.stringify({createdAt:new Date().toISOString(),gitHead:process.env.SPINO_REVIEW_HEAD||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,renderer:await send('Browser.getVersion'),fixedTime:REVIEW_NOW,surface:'Responsive browser, isolated synthetic notebook; not native-device acceptance',measurements,runtimeErrors:errors,retention:'Events, stable IDs, sessions and works unchanged'},null,2));
  }
});
