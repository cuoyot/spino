import test from 'node:test';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';
import {readFile,mkdir,writeFile} from 'node:fs/promises';

test('public site distinguishes stable and beta in every language',async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{rootDirectory:'site'});
 for(const language of ['es','en','ca']){
  await send('Page.navigate',{url:url.replace(/\?.*$/,'')+(language==='es'?'':language+'/')});
  await evaluate(`new Promise(resolve=>{const timer=setInterval(()=>{if(document.querySelector('#downloads')){clearInterval(timer);resolve()}},20)})`);
  const links=await evaluate(`Array.from(document.querySelectorAll('#downloads a')).map(a=>({text:a.textContent,href:a.getAttribute('href')}))`);
  assert.ok(links.some(a=>a.href==='https://play.google.com/store/apps/details?id=com.miguecoll.spino'));
  for(const extension of ['android.apk','ios-simulator.zip'])assert.ok(links.some(a=>a.href.endsWith('spino-6.0.0-beta.1-40-'+extension)));
  const text=await evaluate(`document.querySelector('#downloads').innerText`);assert.ok(text.includes('5.2.3 (35)'));assert.ok(text.includes('6.0.0-beta.1 (40)'));assert.ok(text.includes('Apple Developer'));assert.ok(text.includes('TestFlight'));
  await send('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth+1`),false);
  await mkdir('artifacts/beta/2026-10-12/site',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`artifacts/beta/2026-10-12/site/${language}.png`,Buffer.from(shot.data,'base64'));
 }
 const manifest=JSON.parse(await readFile('docs/releases/6.0.0-beta.1-artifacts.json','utf8'));
 for(const artifact of manifest.artifacts)assert.equal((await readFile('site/downloads/'+artifact.file)).byteLength,artifact.bytes);
 assert.deepEqual(errors,[]);
});
