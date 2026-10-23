import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
test('German and Hungarian landing pages render in four responsive layouts with working language links', {timeout:90000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{rootDirectory:'site'});
 const folder=process.env.SPINO_SITE_LOCALE_EVIDENCE||'docs/quality-review/captures/website/2026-10-23-de-hu-04/site';await mkdir(folder,{recursive:true});
 for(const lang of ['de','hu'])for(const [width,height]of [[390,844],[844,390],[768,1024],[1024,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:new URL('/'+lang+'/',url).href});
  await evaluate(`new Promise((resolve,reject)=>{let n=0;const id=setInterval(()=>{if(document.querySelector('.hero img')?.complete&&document.querySelector('.hero img')?.naturalWidth){clearInterval(id);resolve()}else if(++n>500){clearInterval(id);reject(Error('Missing hero image'))}},20)})`);
  assert.equal(await evaluate('document.documentElement.lang'),lang);
  assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`));
  assert.equal(await evaluate(`document.querySelectorAll('.language-options a').length`),4);
  assert.equal(await evaluate(`document.querySelector('#arcade a').getAttribute('href')`),'../arcade/en/');
  await writeFile(`${folder}/${lang}-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 }
 assert.deepEqual(errors,[]);
});
