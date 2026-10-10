import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';

for (const timing of ['wait', 'timed']) test(`managed keyboard landscape (${timing}) preserves controls, settings and rotation`, { timeout: 120000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('Timeout'));}},20);})`);
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url });
  await wait(`document.querySelector('.cp-today')`);
  await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=reading]').click();`);
  await evaluate(`document.querySelector('[name=timing-0]').value='${timing}';document.querySelector('[name=input-0]').value='piano';document.querySelector('#prepare-form').requestSubmit();`);
  await wait(`document.querySelector('[data-action=open-reader]')`);
  await evaluate(`document.querySelector('[data-action=open-reader]').click()`);
  await wait(`__sr.waiting || __sr.timed`);
  await mkdir('docs/quality-review/captures/generated-practice/2026-10-07-landscape-applied',{recursive:true});
  for (const [width,height] of [[844,390],[640,360],[568,320],[390,844],[768,1024],[1024,768],[844,390]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
    await evaluate(`new Promise(resolve=>setTimeout(resolve,200))`);
    const layout = await evaluate(`(()=>{const box=id=>{const r=document.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};return {start:box('#start'),tools:box('#open-settings'),back:box('#practice-return'),next:box('#practice-advance'),stats:box('#status-row'),piano:box('#piano'),staff:box('#staff-wrap'),overflow:document.documentElement.scrollWidth>innerWidth};})()`);
    assert.equal(layout.overflow,false);
    for(const name of ['start','tools','back','next','piano','staff']) {
      const r=layout[name];assert.ok(r.x>=0 && r.y>=0 && r.x+r.w<=width+1 && r.y+r.h<=height+1,`${name} inside ${width}x${height}`);
    }
    if(width>height && height<500) {
      assert.equal(layout.back.y,layout.next.y);
      assert.ok(layout.start.x>layout.piano.x+layout.piano.w);
      assert.ok(layout.stats.x+layout.stats.w<layout.piano.x);
      assert.ok(layout.piano.h>height*.4);
      assert.ok(layout.staff.y+layout.staff.h<=layout.piano.y);
    }
    await evaluate(`document.querySelector('#open-settings').click()`);
    assert.equal(await evaluate(`document.querySelector('#settings').open`),true);
    assert.ok(await evaluate(`document.querySelector('#q-sound').getBoundingClientRect().height>=44`),'Sound shortcut remains available in settings');
    assert.equal(await evaluate(`document.querySelector('#settings').getBoundingClientRect().height<=innerHeight`),true);
    await evaluate(`document.querySelector('#settings').close()`);
    const frame = await send('Page.captureScreenshot',{format:'png'});
    await writeFile(`docs/quality-review/captures/generated-practice/2026-10-07-landscape-applied/reading-${timing}-${width}x${height}.png`,Buffer.from(frame.data,'base64'));
  }
  const pauseExpression = timing === 'wait' ? '__sr.waiting.paused' : '(__sr.timed===null || __sr.timed.suspendedAt!=null)';
  const paused = await evaluate(pauseExpression);
  await evaluate(`document.querySelector('#start').click()`);
  await wait(`(${pauseExpression})===${!paused}`);
  assert.equal(await evaluate(pauseExpression),!paused);
  await evaluate(`document.querySelector('#start').click()`);
  await wait(`(${pauseExpression})===${paused}`);
  assert.equal(await evaluate(pauseExpression),paused);
  await mkdir('docs/quality-review/captures/generated-practice/2026-10-07-landscape-applied',{recursive:true});
  const shot=await send('Page.captureScreenshot',{format:'png'});
  await writeFile(`docs/quality-review/captures/generated-practice/2026-10-07-landscape-applied/reading-${timing}-phone-landscape.png`,Buffer.from(shot.data,'base64'));
  assert.deepEqual(errors,[]);
});
