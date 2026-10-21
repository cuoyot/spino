import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';

test('period and author filters combine with search in four responsive layouts', async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>400){clearInterval(timer);reject(Error('Filter timeout'))}},25)})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('[data-action=piano]')`);
 await evaluate(`document.querySelector('[data-action=piano]').click();document.querySelector('[data-action=catalog]').click()`);await wait(`document.querySelector('#library-search [name=period]')`);
 assert.match(await evaluate(`document.querySelector('#library-results').textContent`),/129 partituras · 106 obras identificadas/);
 for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await evaluate(`(()=>{const form=document.querySelector('#library-search');form.elements.period.value='classical';form.elements.composer.value='Wolfgang Amadeus Mozart';form.requestSubmit();document.querySelector('.cp-catalogue-filters').open=true})()`);
  assert.match(await evaluate(`document.querySelector('#library-results').textContent`),/3 obras identificadas/);
  assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
  await writeFile(`docs/quality-review/captures/repertoire/2026-10-21-periods-01/period-author-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 }
 await evaluate(`(()=>{const form=document.querySelector('#library-search');form.elements.period.value='impressionist';form.elements.composer.value='Erik Satie';form.requestSubmit()})()`);
 assert.match(await evaluate(`document.querySelector('#library-results').textContent`),/^0 /);
 await evaluate(`(()=>{const form=document.querySelector('#library-search');form.elements.period.value='modern';form.elements.composer.value='Erik Satie';form.elements.query.value='Gymnopédie';form.requestSubmit()})()`);
 assert.match(await evaluate(`document.querySelector('#library-results').textContent`),/4 partituras · 3 obras identificadas/);
 await evaluate(`(()=>{const form=document.querySelector('#library-search');form.elements.period.value='romantic';form.elements.composer.value='Isaac Albéniz';form.elements.query.value='';form.requestSubmit()})()`);
 assert.match(await evaluate(`document.querySelector('#library-results').textContent`),/1 partitura · 1 obra identificada/);
 await evaluate(`document.querySelector('[data-action=catalogue-pdf-detail]').click()`);
 assert.match(await evaluate(`document.querySelector('#cp-dialog').textContent`),/Piano solo/);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await writeFile('docs/quality-review/captures/repertoire/2026-10-21-periods-01/albeniz-detail.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 assert.deepEqual(errors,[]);
});
