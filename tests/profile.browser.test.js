import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser } from './browser.js';

test('profile defaults prefill new reading and session overrides leave them unchanged', { timeout: 60000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url });
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let i=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve();}else if(++i>500){clearInterval(timer);reject(Error('timeout'));}},20);})`);
  await wait(`document.querySelector('.cp-app-header [data-action=settings]')`);
  await evaluate(`document.querySelector('.cp-app-header [data-action=settings]').click();`);
  assert.equal(await evaluate(`document.querySelector('#app-shell h1').textContent`), 'Perfil');
  // The pianist level lives in Edit profile and sets the default rhythm level and reading range.
  await evaluate(`document.querySelector('[data-action=profile-edit]').click()`);
  await wait(`document.querySelector('#profile-identity-form [name=level]')`);
  await evaluate(`{const form=document.querySelector('#profile-identity-form');form.elements.level.value='4';form.requestSubmit();}`);
  await wait(`document.querySelector('#cp-toast')?.textContent.includes('Perfil guardado')`);
  assert.match(await evaluate(`document.querySelector('.cp-profile-identity p').textContent`), /Avanzado/);
  await evaluate(`document.querySelector('[data-action=profile-practice]').click()`);
  assert.match(await evaluate(`document.querySelector('.cp-level-card').textContent`), /Avanzado/);
  assert.equal(await evaluate(`document.querySelector('#preferences-form [name="reading-level"]')`), null);
  await evaluate(`{const form=document.querySelector('#preferences-form');form.elements.context.value='piano';form.elements['reading-hand'].value='both';form.elements['reading-bpm'].value='80';form.elements['warmup-enabled'].checked=false;form.requestSubmit();}`);
  await wait(`document.querySelector('#cp-toast')?.textContent.includes('guardadas')`);
  await send('Page.reload');
  await wait(`document.querySelector('.cp-today')`);
  await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=reading]').click()`);
  assert.deepEqual(await evaluate(`['hand','level','bpm','figures'].map(k=>document.querySelector('[name="'+k+'-0"]').value)`), ['both','2','80','4']);
  assert.equal(await evaluate(`document.querySelector('[name=hand-0]').closest('details')`), null);
  await evaluate(`document.querySelector('[name=level-0]').value='1';document.querySelector('[name=bpm-0]').value='65';document.querySelector('#prepare-form').requestSubmit()`);
  await wait(`document.querySelector('[data-action=open-reader]')`);
  await evaluate(`document.querySelector('[data-action=open-reader]').click()`);
  assert.equal(await evaluate(`__sr.settings.level`), 1);
  assert.equal(await evaluate(`__sr.settings.bpm`), 65);
  const defaults = await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const q=r.result.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{resolve({...q.result.preferences.practiceDefaults.reading,pianist:q.result.preferences.level});r.result.close();};};})`);
  assert.equal(defaults.level, undefined); assert.equal(defaults.bpm, 80); assert.equal(defaults.pianist, 4);
  assert.deepEqual(errors, []);
});

