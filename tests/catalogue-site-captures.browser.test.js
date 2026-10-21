import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
const folder=process.env.CATALOGUE_SITE_CAPTURE || 'artifacts/catalogue-site-preview';
for(const language of ['es','en','ca'])test(`catalogue website captures: ${language}`,async t=>{
 const {send,evaluate,url}=await openBrowser(t,{companion:true,language});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>400){clearInterval(timer);reject(Error('Catalogue did not load'))}},25)})`);
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url});await wait(`document.querySelector('[data-action=piano]')`);
 await evaluate(`document.querySelector('[data-action=piano]').click();document.querySelector('[data-action=catalog]').click()`);await wait(`document.querySelector('#library-search')`);
 await mkdir(`${folder}/${language}`,{recursive:true});
 const shot=async name=>writeFile(`${folder}/${language}/${name}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 assert.match(await evaluate(`document.querySelector('#library-results').textContent`),/129 .*106 /);await shot('catalogue');
 await evaluate(`(()=>{const form=document.querySelector('#library-search');form.elements.period.value='classical';form.elements.composer.value='Wolfgang Amadeus Mozart';form.requestSubmit();document.querySelector('.cp-catalogue-filters').open=true})()`);await shot('period-author');
 await evaluate(`(()=>{const form=document.querySelector('#library-search');form.elements.query.value='mutopia-202';form.elements.period.value='';form.elements.composer.value='';form.requestSubmit();document.querySelector('[data-action=catalogue-preview]').click()})()`);
 await wait(`document.querySelector('[data-catalogue-preview] img')?.naturalWidth>0`);await shot('preview');
});
