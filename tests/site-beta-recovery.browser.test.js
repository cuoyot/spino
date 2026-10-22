import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';

test('beta recovery APK is offered in all languages while stable remains Google Play',async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{rootDirectory:'site'});
 const plan=JSON.parse(await readFile('scripts/store/release-plan.json','utf8'));
 const folder=process.env.SPINO_BETA_SITE_EVIDENCE;
 for(const lang of ['es','en','ca'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:url+(lang==='es'?'':lang+'/')});
  await evaluate(`new Promise(resolve=>{const timer=setInterval(()=>{if(document.querySelector('[data-channel=beta]')){clearInterval(timer);resolve()}},20)})`);
  assert.equal(await evaluate(`document.querySelector('[data-channel=stable] a.cta').href`),'https://play.google.com/store/apps/details?id=com.miguecoll.spino');
  assert.equal(await evaluate(`document.querySelector('[data-channel=beta] a.cta').getAttribute('href').split('/').at(-1)`),`spino-${plan.beta.version}-${plan.beta.build}-beta-android.apk`);
  assert.match(await evaluate(`document.querySelector('[data-channel=beta]').textContent`),new RegExp(plan.beta.version.replaceAll('.','\\.')));
  assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth+1`),false);
  if(folder){await mkdir(folder,{recursive:true});await evaluate(`document.querySelector('[data-channel=beta]').scrollIntoView({block:'center'})`);const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${folder}/${lang}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));}
 }
 assert.deepEqual(errors,[]);
});
