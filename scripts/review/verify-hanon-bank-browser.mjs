import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {openBrowser} from '../../tests/browser.js';
import {emptyData,beginSession,block} from '../../src/companion/model.js';
const folder=process.env.SPINO_HANON_REVIEW;
assert.ok(folder,'Set SPINO_HANON_REVIEW to a prepared isolated overlay');
const overlay=JSON.parse(await readFile(folder+'/overlay.json','utf8')),number=overlay.number;
const runtimeBank=overlay.runtimeBank||'hanon-frames-v1';
const canonical=JSON.parse(await readFile(new URL('../../public/warmups/hanon-frames-v1/exercises/hanon-'+number+'.json',import.meta.url),'utf8'));
test('complete native static bank decodes, plays and disposes in the actual browser guide',{timeout:600000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en',rootDirectory:folder+'/app'});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const id=setInterval(()=>{if(${condition}){clearInterval(id);resolve()}else if(++n>1500){clearInterval(id);reject(Error('Missing bank review state'))}},20)})`);
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const original=window.createImageBitmap.bind(window);window.__bitmaps={created:0,closed:0,live:0,peak:0,bytes:0,peakBytes:0};window.createImageBitmap=async(...args)=>{const bitmap=await original(...args),s=__bitmaps,bytes=bitmap.width*bitmap.height*4,close=bitmap.close.bind(bitmap);s.created++;s.live++;s.bytes+=bytes;s.peak=Math.max(s.peak,s.live);s.peakBytes=Math.max(s.peakBytes,s.bytes);let done=false;bitmap.close=()=>{if(!done){done=true;s.closed++;s.live--;s.bytes-=bytes;}close()};return bitmap}})()`});
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 const fixture=emptyData();fixture.preferences.language='en';fixture.preferences.theme='light';
 const selector='#cp-dialog [data-hanon-animation]',checks=[];
 for(const hand of ['both','left','right']){
  fixture.active=beginSession({title:'Synthetic complete bank review',context:'piano',blocks:[block('warmup',{target:'hanon-'+number,exercises:['hanon-'+number,'hanon-1'],minutes:3,figures:'2',hand,presentation:'page'})]});
  await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve()}}})`);
  await send('Page.reload');await wait(`document.querySelector('.cp-today')`);
  await evaluate(`document.querySelector('[data-action=resume-session]').click()`);await wait(`document.querySelector('[data-action=warmup-guide]')`);
  await evaluate(`document.querySelector('[data-action=warmup-guide]').click()`);await wait(`document.querySelector('${selector}')?.dataset.ready==='true'`);
  assert.deepEqual(await evaluate(`(()=>{const r=document.querySelector('${selector}'),c=r.querySelector('canvas');return [r.dataset.hand,c.width,c.height,document.querySelectorAll('#cp-dialog .wg-figure').length]})()`),[hand,720,400,hand==='both'?2:1]);
  const packaged=await evaluate(`(async()=>{const d=await(await fetch('/warmups/${runtimeBank}/exercises/hanon-${number}.json')).json();return {events:d.events,frames:d.frames.length,both:d.both?.length,composition:d.composition}})()`);
  assert.deepEqual(packaged.events,canonical.events);assert.equal(packaged.frames,1440);assert.equal(packaged.both,1440);assert.equal(packaged.composition,'single-mode-sprite');
  const decoded=await evaluate(`(async()=>{const r=document.querySelector('${selector}');for(let i=0;i<1440;i++)await r.hanonPlayer.seek(i);return {frame:Number(r.dataset.frame),pressed:r.dataset.pressed,...__bitmaps}})()`);
  assert.equal(decoded.frame,1439);assert.equal(decoded.pressed,'false');assert.ok(decoded.closed>0);assert.ok(decoded.peak<=11,JSON.stringify(decoded));assert.ok(decoded.peakBytes<60*1024*1024,JSON.stringify(decoded));
  const frames=[];
  for(const [layout,width,height]of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',800,1280],['tablet-landscape',1280,800]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await evaluate(`(async()=>{const r=document.querySelector('${selector}');await r.hanonPlayer.seek(735);r.scrollIntoView({block:'center'})})()`);
   const state=await evaluate(`(()=>{const d=document.querySelector('#cp-dialog'),r=d.querySelector('.cp-dialog-head button').getBoundingClientRect();return {closeVisible:r.top>=0&&r.bottom<=innerHeight,overflow:d.scrollWidth>d.clientWidth+1,frame:document.querySelector('${selector}').dataset.frame}})()`);assert.equal(state.closeVisible,true);assert.equal(state.overflow,false);
   const file=`hanon-${number}-${hand}-${layout}.png`,shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({file,layout,width,height,...state});
  }
  await evaluate(`(async()=>{const r=document.querySelector('${selector}');await r.hanonPlayer.seek(0);r.__events=new Set([0]);r.__observer=new MutationObserver(()=>r.__events.add(Number(r.dataset.event)));r.__observer.observe(r,{attributes:true,attributeFilter:['data-event']});r.querySelector('[data-ha-play]').click()})()`);
  const samples=[],started=Date.now();
  for(let n=0;n<24;n++){
   await new Promise(resolve=>setTimeout(resolve,5000));const state=await evaluate(`(()=>{const r=document.querySelector('${selector}');return {frame:Number(r.dataset.frame),event:Number(r.dataset.event),playing:r.dataset.playing}})()`);samples.push(state);console.log(hand,state.frame);if(state.frame===1439)break;
  }
  assert.equal(samples.at(-1).frame,1439);assert.equal(samples.at(-1).playing,'false');
  const visited=await evaluate(`(()=>{const r=document.querySelector('${selector}');r.__observer.disconnect();return [...r.__events].sort((a,b)=>a-b)})()`);assert.deepEqual(visited,Array.from({length:113},(_,i)=>i));
  await evaluate(`window.__oldHanon=document.querySelector('${selector}');document.querySelector('#cp-dialog [data-warmup-step="1"]').click()`);await wait(`document.querySelector('#cp-dialog .cp-warmup-guide')?.dataset.exercise==='hanon-1'&&document.querySelector('${selector}')?.dataset.ready==='true'`);
  assert.equal(await evaluate('__oldHanon.hanonPlayer===undefined'),true);assert.equal(await evaluate(`document.querySelector('${selector} canvas').width`),1080);assert.match(await evaluate(`document.querySelector('${selector}').dataset.assetRevision`),/approved-blender-no1-static/);
  await evaluate(`document.querySelector('#cp-dialog [data-action=close-dialog]').click()`);await wait(`__bitmaps.live===0`);
  const cleanup=await evaluate('({...__bitmaps})');assert.equal(cleanup.created,cleanup.closed);assert.equal(cleanup.bytes,0);
  checks.push({hand,decoded,frames,visitedEvents:visited,samples,playbackMilliseconds:Date.now()-started,cleanup});
  await writeFile(folder+'/progress.json',JSON.stringify({overlay,checks,runtimeErrors:errors},null,2)+'\n');
 }
 assert.deepEqual(errors,[]);await writeFile(folder+'/verification.json',JSON.stringify({date:new Date().toISOString(),kind:overlay.runtimeBank?'Final routed production-build responsive browser review; Android/publication acceptance separate':'Responsive Chromium production player with isolated complete-exercise asset overlay; not final bank/native/publication acceptance',overlay,checks,runtimeErrors:errors},null,2)+'\n');
});
