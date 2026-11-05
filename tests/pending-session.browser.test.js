import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';
import { todayFixtures } from '../scripts/review/today-fixtures.mjs';

test('unfinished session stays discoverable across destinations and clears on discard', {timeout:90000}, async t => {
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  const wait=expression=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('timeout'));}},20);})`);
  await send('Page.navigate',{url});
  await wait(`document.querySelector('.cp-today')`);
  const fixture=todayFixtures().pending;
  fixture.preferences.theme='light';
  await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};})`);
  await send('Page.navigate',{url:'about:blank'});
  await send('Page.navigate',{url});
  await wait(`document.querySelector('.cp-today-resume')`);
  await wait(`document.querySelector('#cp-toast').hidden`);
  const evidence=process.env.PENDING_SESSION_EVIDENCE;
  if(evidence)await mkdir(evidence,{recursive:true});
  const results=[];
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    let banner,libraryTabs;
    for(const route of ['home','practice','calendar','piano','catalog','multimedia','progress','settings']) {
      await evaluate(`document.querySelector('[data-action="${route}"]').click()`);
      if(['piano','catalog','multimedia','progress'].includes(route)){
        const tabs=await evaluate(`(()=>{const nav=document.querySelector('.cp-section-tabs'),button=nav.querySelector('[aria-current=page]'),n=getComputedStyle(nav),b=getComputedStyle(button);return {background:n.backgroundColor,radius:n.borderRadius,selected:b.backgroundColor,color:b.color,buttonRadius:b.borderRadius,count:nav.querySelectorAll('button').length}})()`);
        assert.equal(tabs.count,3);libraryTabs??=tabs;assert.deepEqual(tabs,libraryTabs);
      }
      if(['calendar','piano','catalog','multimedia','progress'].includes(route)) {
        assert.equal(await evaluate(`document.querySelectorAll('.cp-today-resume').length`),0);
        assert.equal(await evaluate(`document.querySelectorAll('.cp-nav .cp-pending-session-dot').length`),1);
        if(route==='multimedia'){
          const geometry=await evaluate(`(()=>{const calendar=document.querySelector('.cp-media-calendar-panel').getBoundingClientRect(),list=document.querySelector('.cp-media-list').getBoundingClientRect();return {calendarBottom:calendar.bottom,listTop:list.top}})()`);
          assert.ok(geometry.listTop>geometry.calendarBottom,JSON.stringify(geometry));
        }
        results.push({route,width,height,pendingCard:false});
        if(evidence){const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${evidence}/${route}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));}
        continue;
      }
      await wait(`document.querySelector('.cp-today-resume')`);
      if(route==='practice') {
        const before=await evaluate(`JSON.stringify(document.querySelector('.cp-practice-hub').innerHTML)`);
        const controls=await evaluate(`(()=>{const options=document.querySelector('.cp-practice-options');const buttons=[...options.querySelectorAll('button')];buttons.forEach(button=>button.click());return {disabled:options.disabled,allDisabled:buttons.every(button=>button.matches(':disabled')),resumeDisabled:document.querySelector('[data-action=resume-session]').matches(':disabled')}})()`);
        assert.deepEqual(controls,{disabled:true,allDisabled:true,resumeDisabled:false});
        assert.equal(await evaluate(`JSON.stringify(document.querySelector('.cp-practice-hub').innerHTML)`),before);
      }
      const state=await evaluate(`(()=>{const p=document.querySelector('.cp-page'),b=document.querySelector('.cp-today-resume');return {count:document.querySelectorAll('.cp-today-resume').length,text:b.querySelector('.cp-focus-copy').textContent+b.querySelector('[data-action=resume-session]').textContent,dots:document.querySelectorAll('.cp-nav .cp-pending-session-dot').length,label:document.querySelector('.cp-practice-nav').getAttribute('aria-label'),overflow:p.scrollWidth>p.clientWidth+1}})()`);
      assert.equal(state.count,1);assert.equal(state.dots,1);assert.match(state.label,/Sesión pendiente/);assert.equal(state.overflow,false);
      banner??=state.text;assert.equal(state.text,banner);
      results.push({route,width,height,...state});
      if(evidence&&['home','practice','calendar'].includes(route)) {
        await evaluate(`document.querySelector('.cp-page').scrollTop=0`);
        const shot=await send('Page.captureScreenshot',{format:'png'});
        await writeFile(`${evidence}/${route}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));
      }
    }
  }
  await evaluate(`document.querySelector('[data-action=resume-session]').click()`);
  await wait(`document.querySelector('.cp-session-card')`);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-today-resume').length`),0);
  await evaluate(`document.querySelector('[data-action=discard-session]').click();document.querySelector('#cp-confirm').click()`);
  await wait(`document.querySelector('.cp-today')`);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-pending-session-dot,.cp-today-resume').length`),0);
  assert.equal(await evaluate(`document.querySelector('.cp-practice-nav').getAttribute('aria-label')`),null);
  await evaluate(`document.querySelector('[data-action=practice]').click()`);
  assert.equal(await evaluate(`document.querySelector('.cp-practice-options').disabled`),false);
  await evaluate(`document.querySelector('[data-action=prepare][data-id=free]').click()`);
  await wait(`document.querySelector('#prepare-form')`);
  assert.deepEqual(errors,[]);
  if(evidence)await writeFile(`${evidence}/verification.json`,JSON.stringify({scope:'Responsive browser; disposable synthetic notebook',fixture,results},null,2));
});
