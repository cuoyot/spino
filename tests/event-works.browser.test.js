import test from 'node:test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';

test('event work cards retain multiple selections across search, save and edit', {timeout:60000}, async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
 const wait=e=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${e}){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('Timed out'))}},20)})`);
 const click=s=>evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
 await send('Page.navigate',{url});await wait(`document.querySelector('[data-action=new-event]')`);
 for(const [title,onStand] of [['Prelude',true],['Sonata',false]]){
  await click('.cp-nav [data-action=piano]');await click('[data-action=repertoire]');await click('[data-action=new-work]');
  await evaluate(`(()=>{const f=document.querySelector('#cp-dialog form');f.elements.title.value=${JSON.stringify(title)};f.elements.onStand.checked=${onStand};f.requestSubmit()})()`);
  await wait(`!document.querySelector('#cp-dialog').open`);
 }
 await click('.cp-nav [data-action=home]');await click('[data-action=new-event]');
 assert.equal(await evaluate(`document.querySelector('.cp-event-details').open`),false);
 await evaluate(`document.querySelector('#event-form').elements.title.value='Two pieces';document.querySelector('[data-event-work]').click()`);
 await click('[data-event-work-browse]');await evaluate(`const search=document.querySelector('[data-event-work-search]');search.value='Sonata';search.dispatchEvent(new Event('input',{bubbles:true}))`);await click('[data-event-work]');
 assert.equal(await evaluate(`new FormData(document.querySelector('#event-form')).getAll('workIds').length`),2);
 await click('[data-event-work-browse]');assert.equal(await evaluate(`document.querySelectorAll('[data-event-work][aria-pressed=true]').length`),2);
 for(const [width,height] of [[320,640],[390,844],[768,1024],[1024,768]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate(`(()=>{const f=document.querySelector('#event-form');return f.scrollWidth<=f.clientWidth+1})()`),true);}
 if(process.env.EVENT_WORK_CAPTURE){await send('Emulation.setDeviceMetricsOverride',{width:768,height:1024,deviceScaleFactor:1,mobile:true});await mkdir(process.env.EVENT_WORK_CAPTURE,{recursive:true});await writeFile(process.env.EVENT_WORK_CAPTURE+'/selected-works.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));}
 await evaluate(`document.querySelector('#event-form').requestSubmit()`);await wait(`document.querySelector('[data-action=edit-event]')`);await click('[data-action=edit-event]');
 assert.equal(await evaluate(`document.querySelectorAll('[data-event-work][aria-pressed=true]').length`),2);
 await click('[data-event-work]');assert.equal(await evaluate(`new FormData(document.querySelector('#event-form')).getAll('workIds').length`),1);
 assert.deepEqual(errors,[]);
});
