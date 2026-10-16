import test from 'node:test';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('public site distinguishes stable and beta in every language',{timeout:45000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{rootDirectory:'site'});
 for(const language of ['es','en','ca']){
  await send('Page.navigate',{url:url.replace(/\?.*$/,'')+(language==='es'?'':language+'/')});
  await evaluate(`new Promise(resolve=>{const timer=setInterval(()=>{if(document.querySelector('#downloads')){clearInterval(timer);resolve()}},20)})`);
  const links=await evaluate(`Array.from(document.querySelectorAll('#downloads a')).map(a=>({text:a.textContent,href:a.getAttribute('href')}))`);
  assert.ok(links.some(a=>a.href==='https://play.google.com/store/apps/details?id=com.miguecoll.spino'));
  for(const file of ['spino-6.0.0-53-android.apk','spino-6.0.0-checksums.json','spino-6.1.0-beta.14-67-android.apk','spino-6.0.0-beta.9-48-ios-simulator.zip'])assert.ok(links.some(a=>a.href.endsWith(file)));
  const stable=await evaluate(`document.querySelector('[data-channel=stable]').innerText`);assert.ok(stable.includes('6.0.0 (53)'));assert.ok(await evaluate(`document.querySelector('[data-channel=stable] a[download]').getAttribute('href').endsWith('spino-6.0.0-53-android.apk')`));assert.ok(await evaluate(`document.querySelector('[data-channel=beta] a[download]').getAttribute('href').endsWith('spino-6.1.0-beta.14-67-android.apk')`));
  const text=await evaluate(`document.querySelector('#downloads').innerText`);assert.ok(text.includes('5.2.3 (35)'));assert.ok(text.includes('6.1.0-beta.14 (67)'));assert.ok(links.some(a=>a.href.endsWith('ios-simulator.zip')&&a.text.includes('beta 9')));assert.ok(text.includes('Apple Developer'));assert.ok(text.includes('TestFlight'));assert.ok(text.includes('100'));assert.ok(links.some(a=>a.href==='mailto:support@spinoapp.com'));
  await send('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth+1`),false);
  await mkdir('artifacts/releases/6.1.0-beta.14/site',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`artifacts/releases/6.1.0-beta.14/site/${language}.png`,Buffer.from(shot.data,'base64'));
 }
 const stableManifest=JSON.parse(await readFile('site/downloads/spino-6.0.0-checksums.json','utf8'));assert.equal(stableManifest.version,'6.0.0');assert.equal(stableManifest.build,53);
 for(const a of stableManifest.artifacts){const b=await readFile('site/downloads/'+a.file);assert.equal(b.byteLength,a.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);assert.equal(a.applicationId,'com.miguecoll.spino');}
 const manifest=JSON.parse(await readFile('docs/releases/6.1.0-beta.14-artifacts.json','utf8'));
 for(const artifact of manifest.artifacts)assert.equal((await readFile('site/downloads/'+artifact.file)).byteLength,artifact.bytes);
 assert.deepEqual(errors,[]);
});
