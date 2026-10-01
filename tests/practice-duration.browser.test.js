import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser } from './browser.js';

test('new sessions start at forty minutes and the total slider updates all blocks without changing tempo', {timeout:60000}, async t => {
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  await send('Page.navigate',{url});
  const wait = expr => evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(${expr}){clearInterval(t);resolve();}else if(++n>500){clearInterval(t);reject(Error('timeout'));}},20);})`);
  await wait(`document.querySelector('.cp-today')`);
  await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=reading]').click()`);
  assert.equal(await evaluate(`document.querySelector('#practice-duration').value`),'40');
  await evaluate(`document.querySelector('[data-action=prepare-more]').click();document.querySelector('[data-action=block-add]').click()`);
  assert.equal(await evaluate(`document.querySelector('#practice-duration').value`),'40');
  await evaluate(`{const form=document.querySelector('#prepare-form');form.elements['minutes-0'].value=10;form.elements['minutes-1'].value=30;form.elements['bpm-0'].value=75;form.elements['minutes-1'].dispatchEvent(new Event('input',{bubbles:true}));const slider=document.querySelector('#practice-duration');slider.value=80;slider.dispatchEvent(new Event('input',{bubbles:true}));}`);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('[name^=minutes-]')].map(el=>Number(el.value))`),[20,60]);
  assert.equal(await evaluate(`document.querySelector('[name=bpm-0]').value`),'75');
  assert.equal(await evaluate(`document.querySelector('output[for=practice-duration]').value`),'80');
  await evaluate(`document.querySelector('[data-action=block-remove][data-id="1"]').click()`);
  assert.equal(await evaluate(`document.querySelector('[name=minutes-0]').value`),'80');
  await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);
  await wait(`document.querySelector('[data-action=open-reader]')`);
  const minutes=await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const q=r.result.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{resolve(q.result.active.blocks[0].minutes);r.result.close();};};})`);
  assert.equal(minutes,80);assert.deepEqual(errors,[]);
});
