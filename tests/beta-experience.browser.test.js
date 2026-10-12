import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';

test('initial tour can skip, replay and finish without modifying notebook data; themes persist and follow device', {timeout:60000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en',onboarding:true});
 const wait=e=>evaluate(`new Promise((resolve,reject)=>{let n=0;const id=setInterval(()=>{if(${e}){clearInterval(id);resolve()}else if(++n>400){clearInterval(id);reject(Error('Timeout'))}},20)})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('#cp-walkthrough[open]')`);
 const notebook=()=>evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const d=r.result,q=d.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{resolve(q.result);d.close()}}})`);
 const before=await notebook();
 await evaluate(`document.querySelector('[data-tour=skip]').click()`);assert.equal(await evaluate(`localStorage.getItem('spino.walkthrough.v1')`),'done');
 await evaluate(`document.querySelector('[data-action=settings]').click();document.querySelector('[data-action=walkthrough]').click()`);
 for(let i=0;i<6;i++){assert.equal(await evaluate(`document.querySelector('#cp-walkthrough small').textContent`),`${i+1} / 6`);await evaluate(`document.querySelector('[data-tour=next]').click()`);}
 assert.equal(await evaluate(`document.querySelector('#cp-walkthrough').open`),false);assert.deepEqual(await notebook(),before);
 await evaluate(`document.querySelector('[data-action=profile-appearance]').click();document.querySelector('[data-id=light][data-action=set-theme]').click()`);await wait(`document.documentElement.dataset.theme==='light'`);
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('#app-shell')).color`),'rgb(30, 41, 59)');
 await evaluate(`document.querySelector('[data-id=system][data-action=set-theme]').click()`);await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'dark'}]});await wait(`document.documentElement.dataset.theme==='dark'`);
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});await wait(`document.documentElement.dataset.theme==='light'`);
 await evaluate(`document.querySelector('[data-action=close-dialog]').click()`);
 assert.equal(await evaluate(`!!document.querySelector('[data-action=rate-app]')&&!!document.querySelector('[data-action=share-app]')`),true);
 const folder='artifacts/beta/2026-10-12/beta2-header/theme-tour';await mkdir(folder,{recursive:true});
 for(const theme of ['light','dark']){
  await evaluate(`document.querySelector('[data-action=profile-appearance]').click();document.querySelector('[data-action=set-theme][data-id=${theme}]').click();document.querySelector('[data-action=close-dialog]').click()`);
  for(const [name,width,height] of [['phone-portrait',402,874],['phone-landscape',874,402],['tablet-portrait',820,1180],['tablet-landscape',1180,820]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`new Promise(r=>setTimeout(r,120))`);
   for(const view of ['home','practice','calendar','piano','progress','settings']){
    await evaluate(`document.querySelector('[data-action=${view}]').click()`);
    assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth>document.querySelector('.cp-page').clientWidth+1`),false,`${view}/${theme}/${name}`);
    const image=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${folder}/${view==='settings'?'profile':view}-${theme}-${name}.png`,Buffer.from(image.data,'base64'));
   }
  }
 }
 await send('Page.reload');await wait(`document.querySelector('#app-shell h1')`);assert.equal(await evaluate(`document.documentElement.dataset.theme`),'dark');assert.equal(await evaluate(`document.querySelector('#cp-walkthrough').open`),false);
 assert.deepEqual(errors,[]);
});
