import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';

test('weekly calendar extends continuously without a month heading', {timeout:60000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const wait=expression=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve();}else if(++n>400){clearInterval(timer);reject(Error('timeout'));}},20);})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 const evidence=process.env.CALENDAR_SCROLL_EVIDENCE;
 if(evidence)await mkdir(evidence,{recursive:true});
 for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await evaluate(`document.querySelector('[data-action=calendar]').click();document.querySelector('[data-action=today]').click()`);
  assert.equal(await evaluate(`document.querySelector('.cp-calendar-heading')`),null);
  for(const count of [4,6,8]) {
   await evaluate(`document.querySelector('.cp-page').scrollTop=document.querySelector('.cp-page').scrollHeight`);
   await wait(`document.querySelectorAll('[data-week-start]').length>=${count}`);
  }
  const weeks=await evaluate(`[...document.querySelectorAll('[data-week-start]')].map(e=>e.dataset.weekStart)`);
  assert.equal(new Set(weeks).size,weeks.length);
  for(let i=1;i<weeks.length;i++)assert.equal((Date.parse(weeks[i])-Date.parse(weeks[i-1]))/86400000,7);
  assert.equal(await evaluate(`document.querySelectorAll('.selected-day').length`),1);
  assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth>document.querySelector('.cp-page').clientWidth+1`),false);
  await evaluate(`document.querySelector('.cp-week-agenda [data-week-start]:last-child [data-action=add-on-day]').click()`);
  await wait(`document.querySelector('#cp-dialog[open]')`);
  await evaluate(`document.querySelector('[data-action=close-dialog]').click()`);
  if(evidence) {
   await evaluate(`document.querySelector('.cp-page').scrollTop=0`);
   const shot=await send('Page.captureScreenshot',{format:'png'});
   await writeFile(`${evidence}/week-${width}x${height}.png`,Buffer.from(shot.data,'base64'));
  }
  await evaluate(`document.querySelector('[data-action=calendar-mode][data-id=month]').click()`);
  assert.ok(await evaluate(`!!document.querySelector('.cp-calendar-heading h2')`));
  await evaluate(`document.querySelector('[data-action=calendar-mode][data-id=week]').click()`);
 }
 assert.deepEqual(errors,[]);
});
