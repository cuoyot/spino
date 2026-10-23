import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
const folder=process.env.SPINO_LOCALE_EVIDENCE||'output/review/2026-10-23-locales';
test('profile switches and persists both new languages, including reader and stable app copy', {timeout:120000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en-US'});
 const wait=expr=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expr}){clearInterval(timer);resolve()}else if(++n>750){clearInterval(timer);reject(Error(${JSON.stringify(expr)}))}},20)})`);
 const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-profile-nav')`);
 await mkdir(folder,{recursive:true});
 for(const [lang,word]of [['de','Sprache'],['hu','Nyelv']]){
  await click('.cp-profile-nav');await click('[data-action=profile-edit]');
  await evaluate(`{const form=document.querySelector('#profile-identity-form');form.elements.language.value='${lang}';form.elements.name.value='Béla · Original name';form.requestSubmit()}`);
  await wait(`!document.querySelector('#cp-dialog').open`);
  await send('Page.reload');await wait(`document.querySelector('.cp-profile-nav')`);
  assert.equal(await evaluate('document.documentElement.lang'),lang);assert.equal(await evaluate('__sr.settings.lang'),lang);
  await click('.cp-profile-nav');assert.equal(await evaluate(`document.querySelector('.cp-profile-identity h2').textContent`),'Béla · Original name');
  await click('[data-action=profile-edit]');
  for(const [width,height]of [[390,844],[844,390],[768,1024],[1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
   assert.ok((await evaluate(`document.querySelector('#cp-dialog').innerText`)).includes(word));
   const dimensions=await evaluate(`({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})`);
   assert.ok(dimensions.scroll<=dimensions.width+1,JSON.stringify(dimensions));
   await writeFile(`${folder}/${lang}-profile-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  await click('[data-action=close-dialog]');await click('[data-action=about]');
  assert.doesNotMatch(await evaluate(`document.querySelector('#cp-dialog').innerText`),/\bbeta\b|trial version|versión de prueba/i);
  await writeFile(`${folder}/${lang}-about.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await click('[data-action=close-dialog]');
 }
 assert.deepEqual(errors,[]);
});
