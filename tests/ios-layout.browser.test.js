import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser } from './browser.js';

test('planner date fields fit and landscape practice respects safe insets without changing zero-inset Android geometry', {timeout:60000}, async t => {
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  const wait=expression=>evaluate(`new Promise((resolve,reject)=>{let n=0;const id=setInterval(()=>{if(${expression}){clearInterval(id);resolve()}else if(++n>300){clearInterval(id);reject(Error('Timeout'))}},20)})`);
  await send('Page.navigate',{url});await wait(`document.querySelector('#app-shell h1')`);
  await send('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:1,mobile:true});
  await evaluate(`document.querySelector('[data-action=calendar]').click();document.querySelector('[data-action=weekly-planner]').click()`);
  const date=await evaluate(`(()=>{const input=document.querySelector('input[type=date]'),r=input.getBoundingClientRect();return {right:r.right,box:getComputedStyle(input).boxSizing,width:innerWidth}})()`);
  assert.equal(date.box,'border-box');assert.ok(date.right<=date.width);
  await send('Emulation.setDeviceMetricsOverride',{width:874,height:402,deviceScaleFactor:1,mobile:true});
  await evaluate(`document.querySelector('[data-action=practice]').click();document.querySelector('[data-action=quick-practice]').click()`);
  await wait(`document.querySelector('#reader-view:not([hidden])')`);
  await evaluate(`new Promise(r=>setTimeout(r,250))`);
  const measure=()=>evaluate(`(()=>{const b=id=>{const r=document.querySelector(id).getBoundingClientRect();return {x:r.x,right:r.right,bottom:r.bottom}};return {back:b('#practice-return'),next:b('#practice-advance'),staff:b('#staff-wrap'),piano:b('#piano')}})()`);
  const normal=await measure();assert.equal(normal.back.x,8);assert.equal(normal.next.right,866);
  await send('Emulation.setSafeAreaInsetsOverride',{insets:{left:62,right:62,top:0,bottom:21}});
  await evaluate(`new Promise(r=>setTimeout(r,250))`);
  const safe=await measure();assert.equal(safe.back.x,70);assert.equal(safe.next.right,804);
  for(const item of Object.values(safe)){assert.ok(item.x>=62);assert.ok(item.right<=812);assert.ok(item.bottom<=381);}
  assert.deepEqual(errors,[]);
});
