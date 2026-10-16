import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
const until = expression => `new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(${expression}){clearInterval(t);resolve();}else if(++n>500){clearInterval(t);reject(Error('Timed out: '+${JSON.stringify(expression)}));}},20);})`;
test('isolated Drive review labels synthetic access, verifies playback and never opens a notebook',async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});
  const folder=process.env.SPINO_DRIVE_EVIDENCE;const frames=[];
  await send('Page.navigate',{url:new URL('/drive-media-review.html?demo=1',url).href});
  await evaluate(until("document.querySelector('#connect')"));
  assert.match(await evaluate(`document.querySelector('.notice').textContent`),/Synthetic browser preview/);
  await evaluate(`document.querySelector('#connect').click()`);await evaluate(until("!document.querySelector('#upload').disabled"));
  await evaluate(`document.querySelector('#upload').click()`);await evaluate(until("document.querySelector('#recordings button')&&!document.querySelector('#upload').disabled"));
  await evaluate(`document.querySelector('#recordings button').click()`);await evaluate(until("document.querySelector('audio')?.readyState>=1"));
  assert.equal(await evaluate(`document.querySelector('audio').duration`),120);
  assert.match(await evaluate(`document.querySelector('#status').textContent`),/SHA-256 verified/);
  assert.deepEqual(await evaluate(`(async()=> (await indexedDB.databases()).map(d=>d.name))()`),[]);
  if(folder){await mkdir(folder,{recursive:true});for(const [name,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth+1`),false);
    const file=name+'.png',shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({file,width,height});
  }}
  await send('Page.navigate',{url:new URL('/drive-media-review.html',url).href});await evaluate(until("document.querySelector('#connect')"));
  await evaluate(`document.querySelector('#connect').click()`);await evaluate(until("document.querySelector('#status').textContent.includes('Android review APK')"));
  assert.equal(await evaluate(`document.querySelector('#upload').disabled`),true);
  assert.deepEqual(errors,[]);
  if(folder)await writeFile(folder+'/browser.json',JSON.stringify({date:new Date().toISOString(),kind:'responsive-browser-synthetic',realGoogleAcceptance:false,checks:['Synthetic access explicitly labeled','Upload/discovery/download/checksum and 120-second playback pass','No notebook or media IndexedDB opened','Browser does not claim native Google authorization'],frames,hashes:Object.fromEntries(await Promise.all(['src/companion/drive-media.js','src/companion/drive-media-native.js','src/companion/drive-media-review.js','src/companion/drive-media-fixture.js','dist/drive-media-review.html'].map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')]))),errors},null,2));
});
