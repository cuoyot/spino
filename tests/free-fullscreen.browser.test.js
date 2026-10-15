import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
import {emptyData,beginSession,block} from '../src/companion/model.js';
test('Free metronome fits portrait and landscape viewports',async t=>{
 const {send,evaluate,url}=await openBrowser(t,{companion:true,language:'es'});
 const wait=s=>evaluate(`new Promise(r=>{const i=setInterval(()=>{if(document.querySelector('${s}')){clearInterval(i);r()}},20)})`);
 await send('Page.navigate',{url});await wait('.cp-today');
 const data=emptyData();data.active=beginSession({title:'Free practice',context:'piano',blocks:[block('free')]});
 await evaluate(`new Promise(r=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const tx=q.result.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=r}})`);
 await send('Page.reload');await wait('[data-action=resume-session]');
 await evaluate(`document.querySelector('[data-action=resume-session]').click();document.querySelector('[data-action=open-free-practice]').click()`);
 await wait('.cp-free-practice');
 await evaluate(`new Promise(r=>setTimeout(r,4000))`);
 for(const [width,height] of [[390,844],[360,640],[844,390],[640,360],[768,1024],[1024,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  const dims=await evaluate(`(()=>{const p=document.querySelector('.cp-page');return {height:p.clientHeight,scroll:p.scrollHeight,width:p.clientWidth,scrollWidth:p.scrollWidth}})()`);
  if(dims.scroll>dims.height+1)console.log(await evaluate(`JSON.stringify([...document.querySelectorAll('.cp-free-practice,.cp-metronome,.cp-metro-console,.cp-metro-settings,.cp-fader,.cp-free-practice>details')].map(e=>({c:e.className,h:e.getBoundingClientRect().height,top:e.getBoundingClientRect().top})))`));
  assert.ok(dims.scroll<=dims.height+1,`${width}x${height}: ${JSON.stringify(dims)}`);
  assert.ok(dims.scrollWidth<=dims.width+1);
  if(process.env.FREE_CAPTURE){await mkdir(process.env.FREE_CAPTURE,{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${process.env.FREE_CAPTURE}/${width}x${height}.png`,Buffer.from(shot.data,'base64'));}
 }
 await evaluate(`document.querySelector('[data-action=toggle-metronome]').click()`);
 assert.equal(await evaluate(`document.querySelector('[data-action=toggle-metronome]').getAttribute('aria-pressed')`),'true');
 await evaluate(`document.querySelector('[data-action=free-return]').click()`);
 assert.equal(await evaluate(`!!document.querySelector('.cp-session')`),true);
});
