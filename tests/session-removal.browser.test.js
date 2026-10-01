import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser } from './browser.js';

test('sessions can finish without saving and saved sessions can be deleted safely', { timeout: 60000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve(true);}else if(++n>500){clearInterval(timer);reject(Error('Session removal timeout'));}},30);})`);
  const action = name => evaluate(`document.querySelector('[data-action="${name}"]').click()`);
  const stored = () => evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{resolve(q.result);db.close();};};})`);
  await send('Page.navigate', { url }); await wait(`document.querySelector('#app-shell h1')`);
  await action('practice'); await action('prepare'); await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);
  await wait(`document.querySelector('[data-action=session-end]')`); await action('session-end');
  assert.ok(await evaluate(`!!document.querySelector('#cp-dialog [data-action=discard-session]')`));
  await evaluate(`document.querySelector('#cp-dialog [data-action=discard-session]').click()`);
  await action('close-dialog'); assert.ok((await stored()).active);
  await action('session-end'); await evaluate(`document.querySelector('#cp-dialog [data-action=discard-session]').click()`);
  // A failed write must leave the pending session recoverable for a retry.
  await evaluate(`window.originalPut=IDBObjectStore.prototype.put;window.failNextWrite=true;IDBObjectStore.prototype.put=function(value,key,...rest){if(key==='current'&&value.active===null&&window.failNextWrite){window.failNextWrite=false;throw Error('Simulated storage failure');}return originalPut.call(this,value,key,...rest);};document.querySelector('#cp-confirm').click()`);
  await wait(`document.querySelector('#cp-form-error').textContent.includes('Simulated storage failure')`);
  assert.ok((await stored()).active);
  await evaluate(`IDBObjectStore.prototype.put=originalPut;document.querySelector('#cp-confirm').click()`);
  await wait(`!document.querySelector('#cp-dialog').open && document.querySelector('#app-shell h1').textContent==='Hoy'`);
  let data = await stored(); assert.equal(data.active, null); assert.equal(data.sessions.length, 0);
  await action('calendar'); await action('add-on-day'); await action('plan-practice');
  await evaluate(`document.querySelector('#prepare-form').requestSubmit()`); await wait(`document.querySelector('#cp-dialog[open] form')`);
  await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`); await wait(`document.querySelector('[data-action=start-plan]')`);
  await action('start-plan'); await wait(`document.querySelector('[data-action=next-block]')`);
  await action('next-block'); await wait(`document.querySelector('#cp-dialog[open] [data-action=discard-session]')`);
  await evaluate(`document.querySelector('#cp-dialog form').requestSubmit(document.querySelector('#cp-dialog button[value=save]'))`);
  await wait(`document.querySelector('[data-action=delete-session]')`);
  data = await stored(); const id = data.sessions[0].id; assert.equal(data.plans[0].sessionId, id);
  await action('delete-session'); await action('close-dialog'); assert.equal((await stored()).sessions.length, 1);
  await action('delete-session'); await evaluate(`document.querySelector('#cp-confirm').click()`);
  await wait(`!document.querySelector('#cp-dialog').open && !document.querySelector('[data-action=delete-session]')`);
  data = await stored(); assert.equal(data.sessions.length, 0); assert.equal(data.plans[0].status, 'planned'); assert.equal(data.plans[0].sessionId, undefined);
  await send('Page.reload'); await wait(`document.querySelector('#app-shell h1')`);
  assert.equal((await stored()).sessions.length, 0); assert.deepEqual(errors, []);
});
