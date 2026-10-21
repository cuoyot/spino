import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';
import { driveNotebookBootstrap } from '../scripts/review/drive-notebook-fixture.mjs';

test('global sync indicator updates and opens recovery from the notebook header', { timeout: 60000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: driveNotebookBootstrap({ language: 'es' }) });
  await send('Page.navigate', { url });
  const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('Indicator timeout'));}},20);})`);
  const click = action => evaluate(`document.querySelector('[data-action="${action}"]').click()`);
  await wait(`document.querySelector('.cp-today')&&__cloudReview.statusCalls>0`);
  assert.equal(await evaluate(`!!document.querySelector('[data-action=sync-settings]')`), false);
  await click('settings'); await click('profile-backup'); await click('drive-connect');
  await wait(`document.querySelector('[data-drive-picker]')`);
  await evaluate(`document.querySelector('[data-drive-picker]').requestSubmit()`);
  await wait(`document.querySelector('[data-sync-status=saved]')`);
  await evaluate(`{const file=[...__driveFixture.files.values()].find(f=>f.appProperties?.spinoType==='spino-object-v2'&&JSON.parse(f.text).kind==='score-bytes');file.text=file.text.replace('JVBER','AVBER');file.revision++;__driveFixture.touch(file);}`);
  await click('cloud-sync');
  await wait(`document.querySelector('[data-sync-status=error]')`);
  await click('settings');
  const dir = process.env.SYNC_INDICATOR_EVIDENCE || 'artifacts/sync-indicator-browser';
  await mkdir(dir, { recursive: true });
  for (const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]) {
    await send('Emulation.setDeviceMetricsOverride', { width,height,deviceScaleFactor:1,mobile:true });
    assert.equal(await evaluate(`(()=>{const b=document.querySelector('[data-action=sync-settings]'),m=document.querySelector('.cp-midi-status'),r=b.getBoundingClientRect(),s=m.getBoundingClientRect();return b.dataset.attention==='true'&&r.width>=44&&r.right<=s.left&&s.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth;})()`), true);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(`${dir}/error-${width}x${height}.png`, Buffer.from(shot.data, 'base64'));
  }
  await click('sync-settings');
  await wait(`document.querySelector('#cloud-backup [role=alert]')`);
  assert.equal(await evaluate(`document.querySelector('.cp-page').dataset.view`), 'profile-backup');
  assert.deepEqual(errors, []);
});
