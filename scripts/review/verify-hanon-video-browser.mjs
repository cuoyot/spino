import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { openBrowser } from '../../tests/browser.js';
import { emptyData, beginSession, block } from '../../src/companion/model.js';
const folder = process.env.SPINO_HANON_REVIEW;
assert.ok(folder, 'Set SPINO_HANON_REVIEW to a new evidence folder');
test('complete video bank: actual guide, every mode and note seek, playback and lifecycle', { timeout: 600000 }, async t => {
 await mkdir(folder, { recursive: true });
 const bindingFiles=['src/companion/hanon-animation.js','dist/index.html','public/warmups/hanon-video-v1/index.json'];
 const hash=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
 const bindings=Object.fromEntries(await Promise.all(bindingFiles.map(async file=>[file,await hash(file)])));
 const { send, evaluate, errors, url } = await openBrowser(t, { companion: true, language: 'en' });
 const wait = (condition, attempts = 1500) => evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(${condition}){clearInterval(t);resolve()}else if(++n>${attempts}){clearInterval(t);reject(Error('Video state timeout'))}},20)})`);
 await send('Page.navigate', { url }); await wait(`document.querySelector('.cp-today')`);
 const fixture = emptyData(); fixture.preferences.language = 'en'; fixture.preferences.theme = 'light';
 const selector = '#cp-dialog [data-hanon-animation]', checks = [];
 for (let number = 1; number <= 10; number++) for (const hand of ['both', 'left', 'right']) {
  fixture.active = beginSession({ title: 'Synthetic compressed Hanon review', context: 'piano', blocks: [block('warmup', { target: 'hanon-' + number, exercises: ['hanon-' + number], minutes: 3, figures: '2', hand, presentation: 'page' })] });
  await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve()}}})`);
  await send('Page.reload'); await wait(`document.querySelector('.cp-today')`);
  await evaluate(`document.querySelector('[data-action=resume-session]').click()`); await wait(`document.querySelector('[data-action=warmup-guide]')`);
  await evaluate(`document.querySelector('[data-action=warmup-guide]').click()`); await wait(`document.querySelector('${selector}')?.dataset.ready==='true'`);
  const result = await evaluate(`(async()=>{const r=document.querySelector('${selector}'),v=r.querySelector('video'),d=await(await fetch('/warmups/hanon-video-v1/exercises/hanon-${number}.json')).json();const visited=[];for(let note=0;note<d.events.length;note++){const f=d.frames.findIndex(x=>x[0]===note&&x[1]);await r.hanonPlayer.seek(f);if(Number(r.dataset.event)!==note||Math.abs(v.currentTime-f/24)>.002)throw Error('Note seek mismatch '+JSON.stringify({note,f,event:r.dataset.event,frame:r.dataset.frame,time:v.currentTime,ready:r.dataset.ready,source:v.currentSrc}));visited.push(note)}await r.hanonPlayer.seek(1439);return {width:v.videoWidth,height:v.videoHeight,duration:v.duration,src:v.currentSrc,visited,finalFrame:Number(r.dataset.frame),pressed:r.dataset.pressed}})()`);
  assert.deepEqual([result.width, result.height, result.duration, result.finalFrame, result.pressed], [720, 400, 60, 1439, 'false']); assert.equal(result.visited.length, 113); assert.match(result.src, new RegExp(`hanon-${number}-${hand}\\.mp4$`));
  if ([1, 4, 7, 10].includes(number) && hand === 'both') for (const [layout, width, height] of [['phone-portrait',390,844],['tablet-portrait',800,1280]]) {
   await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
   await evaluate(`(async()=>{const r=document.querySelector('${selector}');await r.hanonPlayer.seek(735);r.scrollIntoView({block:'center'})})()`);
   const state = await evaluate(`(()=>{const d=document.querySelector('#cp-dialog'),c=d.querySelector('.cp-dialog-head button').getBoundingClientRect();return {closeVisible:c.top>=0&&c.bottom<=innerHeight,overflow:d.scrollWidth>d.clientWidth+1}})()`); assert.equal(state.closeVisible,true);assert.equal(state.overflow,false);
   const shot = await send('Page.captureScreenshot', { format: 'png' }); await writeFile(`${folder}/hanon-${number}-${hand}-${layout}.png`, Buffer.from(shot.data,'base64'));
  }
  if (number === 4 && hand === 'both') {
   await evaluate(`(async()=>{const r=document.querySelector('${selector}');await r.hanonPlayer.seek(0);r.__visited=new Set([0]);r.__held=new Set();r.__observer=new MutationObserver(()=>{r.__visited.add(Number(r.dataset.event));if(r.dataset.pressed==='true')r.__held.add(Number(r.dataset.event))});r.__observer.observe(r,{attributes:true,attributeFilter:['data-event','data-pressed']});r.querySelector('[data-ha-play]').click()})()`);
   await wait(`Number(document.querySelector('${selector}').dataset.frame)>=120`);
   // Prove recovery when decoding continues through a blocked UI thread.
   await evaluate(`(()=>{const until=performance.now()+1200;while(performance.now()<until){}})()`);
   await wait(`document.querySelector('${selector}').dataset.frame==='1439'&&document.querySelector('${selector}').dataset.playing==='false'`, 6000);
   const visited=await evaluate(`(()=>{const r=document.querySelector('${selector}');r.__observer.disconnect();return [...r.__visited].sort((a,b)=>a-b)})()`);assert.deepEqual(visited,Array.from({length:113},(_,n)=>n));result.fullNormalPlaybackEvents=visited;const held=await evaluate(`[...document.querySelector('${selector}').__held].sort((a,b)=>a-b)`);assert.deepEqual(held,Array.from({length:113},(_,n)=>n));result.pressedNoteEvents=held;result.deliberateUiStallMilliseconds=1200;
   await evaluate(`(async()=>{const r=document.querySelector('${selector}');await r.hanonPlayer.seek(100);const s=r.querySelector('[data-ha-speed]');s.value='0.5';s.dispatchEvent(new Event('change'));r.querySelector('[data-ha-play]').click()})()`);
   await new Promise(resolve=>setTimeout(resolve,2000));const slow=await evaluate(`(()=>{const r=document.querySelector('${selector}');r.hanonPlayer.pause();return {frame:Number(r.dataset.frame),rate:r.querySelector('video').playbackRate,paused:r.querySelector('video').paused}})()`);assert.equal(slow.rate,.5);assert.ok(slow.frame>=118&&slow.frame<=130);assert.equal(slow.paused,true);result.slow=slow;
  }
  await evaluate(`window.__closedHanon=document.querySelector('${selector}');document.querySelector('#cp-dialog [data-action=close-dialog]').click()`);
  await wait(`__closedHanon.hanonPlayer===undefined&&__closedHanon.querySelector('video').paused&&!__closedHanon.querySelector('video').getAttribute('src')`);
  checks.push({number,hand,...result});console.log(number,hand,'passed');await writeFile(folder+'/progress.json',JSON.stringify({checks,errors},null,2));
 }
 for(const [file,sha] of Object.entries(bindings))assert.equal(await hash(file),sha,'Review inputs must stay unchanged');
 assert.deepEqual(errors,[]);await writeFile(folder+'/verification.json',JSON.stringify({passed:true,kind:'Actual routed responsive Chromium guide; native acceptance separate',checks,errors,bindings},null,2));
});
