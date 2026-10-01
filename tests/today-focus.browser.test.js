import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openBrowser } from './browser.js';
import { REVIEW_DATE, REVIEW_NOW, todayFixtures } from '../scripts/review/today-fixtures.mjs';

test('Today keeps the next practice action visible and Practice owns activity shortcuts', { timeout: 60000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  await send('Emulation.setTimezoneOverride', { timezoneId: 'Europe/Madrid' });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `{
    const OriginalDate=Date, fixed=${Date.parse(REVIEW_NOW)};
    window.Date=class extends OriginalDate {constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};
  }` });
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('Today focus timeout'));}},20);})`);
  const action = name => evaluate(`document.querySelector('[data-action="${name}"]').click()`);
  await send('Page.navigate', { url });
  await wait(`document.querySelector('.cp-today')`);
  for (const [state, data] of Object.entries(todayFixtures())) {
    await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};})`);
    await send('Page.reload');
    await wait(`document.querySelector('.cp-today')`);
    const expected = { typical: 'start-plan', empty: 'practice', pending: 'resume-session' }[state];
    for (const [width, height] of [[320, 568], [390, 844], [844, 390], [768, 1024], [1024, 768]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
      await evaluate(`document.querySelector('.cp-page').scrollTop=0;new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
      const layout = await evaluate(`(()=>{const page=document.querySelector('.cp-page'),primary=document.querySelector('.cp-today-focus button.primary'),r=primary.getBoundingClientRect(),p=page.getBoundingClientRect();return {action:primary.dataset.action,visible:r.top>=p.top&&r.bottom<=p.bottom&&r.left>=p.left&&r.right<=p.right,width:r.width,height:r.height,overflow:page.scrollWidth>page.clientWidth+1,shortcuts:document.querySelectorAll('.cp-today [data-action=prepare]').length};})()`);
      assert.equal(layout.action, expected, `${state}: actionable session priority`);
      assert.equal(layout.visible, true, `${state} at ${width}×${height}: ${JSON.stringify(layout)}`);
      assert.ok(layout.width >= 44 && layout.height >= 44, `${state}: primary touch target`);
      assert.equal(layout.overflow, false);
      assert.equal(layout.shortcuts, 0, 'Activity selection has its own destination');
      const targets = await evaluate(`[document.querySelector('.cp-midi-status'),...document.querySelectorAll('.cp-today-days button')].map(b=>{const r=b.getBoundingClientRect();return {name:b.getAttribute('aria-label'),midi:b.classList.contains('cp-midi-status'),left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};})`);
      for (const target of targets) {
        assert.ok(target.width >= 44 && target.height >= 44, `${width}×${height}: ${JSON.stringify(target)}`);
        if (target.midi) assert.ok(target.left >= 0 && target.top >= 0 && target.right <= width && target.bottom <= height, 'MIDI status target fits the viewport');
      }
    }
    await evaluate(`document.querySelector('.cp-today-focus button.primary').click()`);
    if (state === 'empty') {
      assert.equal(await evaluate(`document.querySelectorAll('.cp-practice-hub [data-action=prepare]').length`), 4);
    } else {
      await wait(`document.querySelector('.cp-session-card')`);
      if (state === 'pending') assert.match(await evaluate(`document.querySelector('#app-shell h1').textContent`), /Lectura y repertorio/);
    }
  }
  await action('home');
  // Today creates commitments for today, regardless of a previously selected calendar date.
  await evaluate(`document.querySelector('[data-action=calendar-day][data-id="2026-10-04"]').click()`);
  await action('home');
  await action('new-event');
  assert.equal(await evaluate(`document.querySelector('#cp-dialog [name=date]').value`), REVIEW_DATE);
  await action('close-dialog');
  await action('piano');
  assert.equal(await evaluate(`document.querySelector('#app-shell h1').textContent`), 'Biblioteca');
  assert.equal(await evaluate(`document.querySelector('.cp-dashboard-week')`), null);
  assert.ok(await evaluate(`document.querySelector('[data-action=catalog]').textContent.includes('Catálogo')`));
  assert.equal(await evaluate(`document.querySelector('[data-action=session-detail]')`), null, 'Library does not duplicate practice history');
  await action('settings');
  await action('progress');
  assert.ok(await evaluate(`!!document.querySelector('.cp-dashboard-week')`), 'Weekly totals remain available through Profile');
  assert.ok(await evaluate(`!!document.querySelector('[data-action=session-detail]')`), 'Existing session history remains available');
  assert.deepEqual(errors, []);
});
