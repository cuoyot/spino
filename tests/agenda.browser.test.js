import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { emptyData, block, beginSession, saveSession, localDate, addDays, weekOf } from '../src/companion/model.js';
import { openBrowser } from './browser.js';

test('Today and weekly calendar show results and add practices on the chosen date', { timeout: 60000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve();}else if(++n>200){clearInterval(timer);reject(Error('Timeout'));}},20);})`);
  const action = (name, id) => evaluate(`document.querySelector('[data-action="${name}"]${id ? `[data-id="${id}"]` : ''}').click()`);
  await send('Page.navigate', { url });
  await wait(`document.querySelector('#app-shell h1')`);
  const data = emptyData(), today = localDate(), tomorrow = addDays(today, 1);
  data.plans.push({ id: 'done', title: 'Lectura en Sol mayor', date: today, time: '08:00', context: 'mobile', blocks: [block()], status: 'planned', reminder: false });
  data.plans.push({ id: 'next', title: 'Técnica: coordinación de manos y arpegios', date: today, time: '18:00', context: 'piano', blocks: [block('technique')], status: 'planned', reminder: false });
  data.events.push({ id: 'lesson', title: 'Clase de piano', date: addDays(today, 5), time: '10:00', type: 'Clase', place: '', notes: '', workIds: [], reminder: false, milestones: [] });
  const session = beginSession({ ...data.plans[0], planId: 'done' });
  session.elapsedMs = session.blockElapsedMs = 600000;
  saveSession(data, session, { mood: 4, notes: 'Pulso más estable. Repetir compases 2–4.' });
  await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=reject;};})`);
  await send('Page.reload');
  await wait(`document.querySelector('.cp-today [data-entry-id="done"]')`);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.cp-nav button')].map(b=>b.getAttribute('aria-label')||b.textContent.trim())`), ['Hoy', 'Practicar', 'Calendario', 'Biblioteca', 'Progreso']);
  assert.equal(await evaluate(`!!document.querySelector('.cp-app-header [data-action=settings]')`), true);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-today-sessions .cp-history-card').length`), 1);
  assert.match(await evaluate(`document.querySelector('[data-entry-id="done"]').textContent`), /10 min/);
  assert.match(await evaluate(`document.querySelector('.cp-history-note').textContent`), /Pulso más estable/);
  assert.ok(await evaluate(`!!document.querySelector('[data-entry-id="done"] .cp-history-mood')`));

  for (const [width, height] of [[320,568],[390,844],[844,390],[768,1024],[1180,820]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
    for (const route of ['home', 'calendar']) {
      await action(route);
      const layout = await evaluate(`(()=>{const page=document.querySelector('.cp-page');return {overflow:page.scrollWidth>page.clientWidth+1,tiny:[...document.querySelectorAll('.cp-entry-open,.cp-add-day,.cp-entry-actions button')].some(b=>{const r=b.getBoundingClientRect();return r.height<44||r.width<44;})};})()`);
      const small = layout.tiny ? await evaluate(`[...document.querySelectorAll('.cp-entry-open,.cp-add-day,.cp-entry-actions button')].map(b=>({text:b.textContent,css:b.className,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height})).filter(b=>b.width<44||b.height<44)`) : [];
      assert.deepEqual(layout, { overflow: false, tiny: false }, `${route} at ${width}x${height}: ${JSON.stringify(small)}`);
      if (process.env.UI_SCREENSHOTS) {
        await mkdir('artifacts/agenda', { recursive: true });
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        await writeFile(`artifacts/agenda/${route}-${width}x${height}.png`, Buffer.from(shot.data, 'base64'));
      }
    }
  }
  await action('home');
  // Choose a day from the visible strip, including Sunday/Monday boundaries.
  const chosen = addDays(weekOf(today), 6);
  await action('calendar-day', chosen);
  assert.equal(await evaluate(`document.querySelector('.selected-day').dataset.agendaDate`), chosen);
  await action('add-on-day', tomorrow);
  await action('plan-practice');
  assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`), false);
  await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);
  await wait(`document.querySelector('#cp-dialog[open] [name="date"]')`);
  assert.equal(await evaluate(`document.querySelector('#cp-dialog [name="date"]').value`), tomorrow);
  await evaluate(`document.querySelector('#cp-dialog [name="title"]').value='Tomorrow session';document.querySelector('#cp-dialog form').requestSubmit()`);
  await wait(`document.querySelector('.cp-week-agenda')&&document.querySelector('#cp-dialog').open===false`);
  const plannedId = await evaluate(`[...document.querySelectorAll('[data-agenda-date="${tomorrow}"] [data-action="plan-detail"]')].find(b=>b.textContent.includes('Tomorrow session')).dataset.id`);
  await action('plan-detail', plannedId);
  assert.ok(await evaluate(`document.querySelector('#cp-dialog').open`));
  await evaluate(`document.querySelector('#cp-dialog [data-action="start-plan"]').click()`);
  await wait(`document.querySelector('[data-action="session-end"]')`);
  assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`), false);
  assert.deepEqual(errors, []);
});
