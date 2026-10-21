import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
import {CATALOGUE_ADDITIONS} from '../src/companion/catalogue-additions.js';

test('each new edition is searchable and has a working bundled preview', async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>400){clearInterval(timer);reject(Error('Preview timeout'))}},25)})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('[data-action=piano]')`);
 await evaluate(`document.querySelector('[data-action=piano]').click();document.querySelector('[data-action=catalog]').click()`);await wait(`document.querySelector('#library-search')`);
 for(const item of CATALOGUE_ADDITIONS){
  await evaluate(`(()=>{const form=document.querySelector('#library-search');form.elements.query.value=${JSON.stringify(item.id)};form.requestSubmit();document.querySelector('[data-action=catalogue-preview]').click()})()`);
  await wait(`document.querySelector('[data-catalogue-preview] img')?.naturalWidth>0`);
  assert.equal(await evaluate(`document.querySelectorAll('[data-action=catalogue-save-preview]').length`),1);
  if(item.id==='mutopia-898')await writeFile('docs/quality-review/captures/repertoire/2026-10-21-periods-01/new-score-preview.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await evaluate(`document.querySelector('[data-action=close-dialog]').click()`);
 }
 assert.deepEqual(errors,[]);
});
