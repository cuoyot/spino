import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {openBrowser} from './browser.js';
import {WARMUP_IDS} from '../src/companion/warmups.js';
import {emptyData,block,beginSession,finishBlock,saveSession,localDate,weekOf,addDays,validateData} from '../src/companion/model.js';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const capture=process.env.PROGRESS_TIME_CAPTURE;
test('practice chart details filter actual blocks, navigate ranges/back and fit responsive themes/locales',async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
 const wait=async s=>{for(let attempt=0;attempt<5;attempt++){try{return await evaluate(`new Promise((r,j)=>{const timeout=setTimeout(()=>{clearInterval(i);j(Error('Missing ${s}: '+document.body.textContent.slice(0,500)))},10000),i=setInterval(()=>{if(document.querySelector('${s}')){clearInterval(i);clearTimeout(timeout);r()}},20)})`);}catch(error){if(!/navigated|closed|context/.test(error.message))throw error;}}throw Error('Navigation did not settle');};
 await send('Page.navigate',{url});await wait('.cp-today');
 const fixture=emptyData(),today=localDate(),monday=weekOf(today),frames=[];
 fixture.works=['a','b'].map((id,i)=>({id,title:i?'Study <B> & second piece':'Prélude en do majeur',composer:'Synthetic',stage:'En estudio',notes:'',passage:'Bars 1–8',target:null,bpm:60}));
 for(let i=0;i<12;i++){
  const date=addDays(monday,-7*i),now=new Date(date+'T12:00:00').getTime(),s=beginSession({title:'Synthetic mixed practice',context:'piano',blocks:[block('warmup',{target:WARMUP_IDS[0]}),block('repertoire',{workId:'a'}),block('repertoire',{workId:'b'})]},now);
  for(const n of [5,20+i*2,10+i%3*15]){s.elapsedMs+=n*60000;s.blockElapsedMs=n*60000;finishBlock(s,null,now);}
  saveSession(fixture,s,{},now);
 }
 validateData(fixture);
 if(capture){await mkdir(capture,{recursive:true});await writeFile(`${capture}/fixture.json`,JSON.stringify(fixture,null,2));}
 const seed=async(locale,theme,source=fixture)=>{
  const notebook=structuredClone(source);Object.assign(notebook.preferences,{language:locale,theme});
  await evaluate(`new Promise(r=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const tx=q.result.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(notebook)},'current');tx.oncomplete=r}})`);
  await send('Page.reload');await wait('.cp-today');await evaluate(`document.querySelector('[data-action=progress]').click()`);
  return notebook;
 };
 const shot=async(state,locale,theme,width,height)=>{
  const geometry=await evaluate(`(()=>{const p=document.querySelector('.cp-page');return {overflow:p.scrollWidth>p.clientWidth+1,chartWidth:document.querySelector('.cp-time-chart').clientWidth,buttons:[...document.querySelectorAll('.cp-time-ranges button')].every(e=>e.getBoundingClientRect().height>=44&&e.scrollWidth<=e.clientWidth+1)}})()`);
  assert.equal(geometry.overflow,false,`${state}/${width}/${locale}`);assert.equal(geometry.buttons,true,JSON.stringify({state,locale,width,geometry}));assert.ok(geometry.chartWidth>150);
  if(capture){const image=await send('Page.captureScreenshot',{format:'png'}),bytes=Buffer.from(image.data,'base64'),path=`${locale}-${theme}-${state}-${width}x${height}.png`;await writeFile(`${capture}/${path}`,bytes);frames.push({path,state,locale,theme,width,height,sha256:hash(bytes)});}
 };
 const select=async(id,value)=>evaluate(`(()=>{const e=document.querySelector('#${id}');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
 const total=()=>evaluate(`document.querySelector('.cp-time-total strong').textContent`);
 for(const locale of ['es','en','ca'])for(const theme of ['light','dark']){
  const notebook=await seed(locale,theme);
  assert.match(await evaluate(`document.querySelector('.cp-time-stats strong').textContent`),/35 min/);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-time-point').length`),12);
  assert.equal(await evaluate(`!!document.querySelector('.cp-four-weeks')`),false);
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await shot('overview',locale,theme,width,height);
  }
  await evaluate(`document.querySelector('[data-action=progress-time]').click()`);
  assert.equal(await evaluate(`document.querySelector('.cp-nav [data-action=progress]').getAttribute('aria-current')`),'page');
  await evaluate(`document.querySelector('[data-action=progress-time-range][data-id="7d"]').click()`);assert.equal(await total(),'35 min');
  await select('progress-time-type','repertoire');assert.equal(await total(),'30 min');
  await select('progress-time-work','a');assert.equal(await total(),'20 min');
  await select('progress-time-type','free');assert.equal(await total(),'0 min');
  assert.equal(await evaluate(`!!document.querySelector('.cp-time-empty')`),true);
  await select('progress-time-type','repertoire');
  for(const range of ['1m','3m','6m','ytd','1y']){
   await evaluate(`document.querySelector('[data-action=progress-time-range][data-id="${range}"]').click()`);
   assert.equal(await evaluate(`document.querySelector('#progress-time-work').value`),'a');
   assert.equal(await evaluate(`document.activeElement.dataset.id`),range);
  }
  await evaluate(`document.querySelector('[data-action=progress-time-range][data-id="3m"]').click()`);
  for(const [width,height] of [[320,640],[390,844],[844,390],[768,1024],[1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await shot('piece-detail',locale,theme,width,height);
  }
  await evaluate(`document.querySelector('.cp-time-values').open=true`);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-time-values tbody tr').length===document.querySelectorAll('.cp-time-point').length`),true);
  await evaluate(`window.dispatchEvent(new Event('spino:back',{cancelable:true}))`);assert.equal(await evaluate(`!!document.querySelector('.cp-time-overview')`),true);
  await evaluate(`document.querySelector('[data-action=progress-time]').click()`);assert.equal(await evaluate(`document.querySelector('#progress-time-work').value`),'a');
  const after=await evaluate(`new Promise(r=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{q.result.transaction('state').objectStore('state').get('current').onsuccess=e=>r(e.target.result)}})`);
  assert.deepEqual(after,notebook);
 }
 await seed('es','light',emptyData());await evaluate(`document.querySelector('[data-action=progress-time]').click()`);
 assert.equal(await total(),'0 min');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await shot('empty','es','light',390,844);
 assert.deepEqual(errors,[]);
 if(capture){const sourceHashes={};for(const path of ['src/companion/progress-time.js','src/companion/progress-time.css','src/companion/app.js','src/companion/progress-metrics.js','src/companion/locale-ca.js','tests/progress-time.browser.test.js'])sourceHashes[path]=hash(await readFile(path));await writeFile(`${capture}/metadata.json`,JSON.stringify({capturedAt:new Date().toISOString(),kind:'responsive-browser',nativeAcceptance:false,gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:'Existing uncommitted work preserved; this run is identified by source hashes.',build:'Vite production build',buildIndexSha256:hash(await readFile('dist/index.html')),browser:await send('Browser.getVersion'),today,sourceHashes,frames,runtimeErrors:errors},null,2));}
});
