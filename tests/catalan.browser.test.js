import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser } from './browser.js';

test('Catalan device language, profile persistence and reader use the same locale', async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true, language: 'ca-ES' });
  const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>250){clearInterval(timer);reject(Error(document.body.innerText));}},20);})`);
  await send('Page.navigate', { url });
  try { await wait(`document.querySelector('.cp-today')`); }
  catch (error) { console.error(JSON.stringify(errors)); throw error; }
  assert.equal(await evaluate(`document.documentElement.lang`), 'ca');
  assert.equal(await evaluate(`__sr.settings.lang`), 'ca');
  await evaluate(`document.querySelector('.cp-profile-nav').click();document.querySelector('[data-action=profile-edit]').click()`);
  assert.equal(await evaluate(`document.querySelector('[name=language]').value`), 'ca');
  await evaluate(`{const f=document.querySelector('#profile-identity-form');f.elements.name.value='My original title';f.requestSubmit();}`);
  await wait(`!document.querySelector('#cp-dialog').open`);
  await send('Page.reload'); await wait(`document.querySelector('.cp-today')`);
  assert.equal(await evaluate(`document.documentElement.lang`), 'ca');
  await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=quick-practice]').click()`);
  await wait(`document.querySelector('#app-shell').hidden`);
  assert.equal(await evaluate(`document.querySelector('#timing-mode').innerText.includes('RÈCORD')`), true);
  await evaluate(`document.querySelector('#practice-advance').click()`);
  assert.match(await evaluate(`document.querySelector('#cp-dialog').innerText`), /Vols finalitzar aquesta pràctica/);
  assert.deepEqual(errors, []);
});
