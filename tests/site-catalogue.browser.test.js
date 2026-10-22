import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';

test('localized catalogue website section explains the released catalogue across four layouts',async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{rootDirectory:'site'});
 const folder='docs/quality-review/captures/website/2026-10-21-beta8-catalogue/site';await mkdir(folder,{recursive:true});
 for(const language of ['es','en','ca']){
  await send('Page.navigate',{url:url.replace(/\?.*$/,'')+(language==='es'?'':language+'/')});
  assert.equal(await evaluate(`document.querySelector('#catalogue .catalogue-stats strong').textContent`),'106');
  assert.match(await evaluate(`document.querySelector('#catalogue').textContent`),/129/);
  assert.match(await evaluate(`document.querySelector('#catalogue').textContent`),/Rumores de la Caleta/);
  assert.equal(await evaluate(`document.querySelectorAll('#catalogue .catalogue-shots img').length`),3);
  assert.ok(await evaluate(`document.querySelector('#catalogue a[download]').href.endsWith('spino-6.1.1-86-android.apk')`));
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await evaluate(`document.querySelector('#catalogue').scrollIntoView()`);
   assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
   await writeFile(`${folder}/${language}-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  await evaluate(`document.querySelector('.catalogue-shots').scrollIntoView()`);
  await evaluate(`Promise.all([...document.querySelectorAll('.catalogue-shots img')].map(img=>img.complete?Promise.resolve():new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Missing screenshot'))})))`);
  assert.equal(await evaluate(`[...document.querySelectorAll('.catalogue-shots img')].every(img=>img.naturalWidth===390&&img.naturalHeight===844)`),true);
  await writeFile(`${folder}/${language}-screenshots.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 }
 assert.deepEqual(errors,[]);
});
