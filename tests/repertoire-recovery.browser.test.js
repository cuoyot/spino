import test from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser } from './browser.js';
import { sessionFixtures } from '../scripts/review/session-fixtures.mjs';

test('missing local repertoire score preserves the pending session and permits retry', { timeout: 30000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('Recovery timeout'));}},20);})`);
  await send('Page.navigate', { url }); await wait(`document.querySelector('.cp-today')`);
  const fixture = sessionFixtures().running;
  fixture.active.blocks[0].type = 'repertoire';
  fixture.active.blocks[0].workId = fixture.works[0].id;
  fixture.works[0].assetId = 'synthetic-missing-score';
  await evaluate(`new Promise(resolve=>{const request=indexedDB.open('cuaderno-piano',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve();};};})`);
  await send('Page.reload'); await wait(`document.querySelector('[data-action=resume-session]')`);
  await evaluate(`document.querySelector('[data-action=resume-session]').click()`);
  const before = await evaluate(`document.querySelector('[data-block-clock]').textContent`);
  for (let attempt = 0; attempt < 2; attempt++) {
    await evaluate(`document.querySelector('[data-action=open-score-practice]').click()`);
    await wait(`!document.querySelector('[data-action=open-score-practice]').disabled && document.body.textContent.includes('Vuelve a añadir o descargar la partitura.')`);
    assert.equal(await evaluate(`document.querySelector('[data-block-clock]').textContent`), before);
    assert.equal(await evaluate(`!!document.querySelector('.pdf-paper')`), false);
    assert.equal(await evaluate(`!!document.querySelector('[data-action=session-change-work]')`), true);
  }
  assert.deepEqual(errors, []);
});
