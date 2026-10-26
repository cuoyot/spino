import test from 'node:test';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import splitDownloads from '../scripts/site/download-parts.mjs';

test('public site distinguishes stable and beta in every language',{timeout:45000},async t=>{
 const version=JSON.parse(await readFile('package.json','utf8')).version;
 const manifest=JSON.parse(await readFile(`docs/releases/${version}-artifacts.json`,'utf8'));
 const betaManifest=JSON.parse(await readFile(`site/downloads/spino-${manifest.beta.version}-checksums.json`,'utf8')),apk=betaManifest.artifacts[0].file;
 const stableVersion=manifest.stable.version,stableBuild=manifest.stable.build;
 const stableManifest=JSON.parse(await readFile(`site/downloads/spino-${stableVersion}-checksums.json`,'utf8'));
 const stableAPK=stableManifest.artifacts[0].file;
 const {send,evaluate,url,errors}=await openBrowser(t,{rootDirectory:'site'});
 for(const language of ['es','en','ca','de','hu']){
  await send('Page.navigate',{url:url.replace(/\?.*$/,'')+(language==='es'?'':language+'/')});
  await evaluate(`new Promise(resolve=>{const timer=setInterval(()=>{if(document.querySelector('#downloads')){clearInterval(timer);resolve()}},20)})`);
  const links=await evaluate(`Array.from(document.querySelectorAll('#downloads a')).map(a=>({text:a.textContent,href:a.getAttribute('href')}))`);
  assert.ok(links.some(a=>a.href==='https://play.google.com/store/apps/details?id=com.miguecoll.spino'));
  for(const file of [stableAPK,`spino-${stableVersion}-checksums.json`,apk])assert.ok(links.some(a=>a.href.endsWith(file)));
  const stable=await evaluate(`document.querySelector('[data-channel=stable]').innerText`);assert.ok(stable.includes(`${stableVersion} (${stableBuild})`));assert.ok(await evaluate(`document.querySelector('[data-channel=stable] a[download]').getAttribute('href').endsWith(${JSON.stringify(stableAPK)})`));assert.ok(await evaluate(`document.querySelector('[data-channel=beta] a[download]').getAttribute('href').endsWith(${JSON.stringify(apk)})`));
  const text=await evaluate(`document.querySelector('#downloads').innerText`);assert.ok(text.includes(`${manifest.beta.version} (${manifest.beta.build})`));
  await send('Emulation.setDeviceMetricsOverride',{width:402,height:874,deviceScaleFactor:1,mobile:true});assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth+1`),false);
  await mkdir(`artifacts/releases/${version}/site`,{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`artifacts/releases/${version}/site/${language}.png`,Buffer.from(shot.data,'base64'));
 }
 for(const artifact of [...stableManifest.artifacts,...betaManifest.artifacts]){
  const split=splitDownloads['/downloads/'+artifact.file];
  const bytes=split?Buffer.concat(await Promise.all(split.parts.map(part=>readFile('site'+part.path)))):await readFile('site/downloads/'+artifact.file);
  assert.equal(bytes.byteLength,artifact.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),artifact.sha256);
 }
 assert.deepEqual(errors,[]);
});
