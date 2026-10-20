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
  // The daily-detail assertions select today; keep the current fixture on today
  // rather than assuming that the test is always run on a Monday.
  const date=i===0?today:addDays(monday,-7*i),now=new Date(date+'T00:00:00').getTime(),s=beginSession({title:'Synthetic mixed practice',context:'piano',blocks:[block('warmup',{target:WARMUP_IDS[0]}),block('repertoire',{workId:'a'}),block('repertoire',{workId:'b'})]},now);
  for(const n of [5,i===0?124:20+i*2,10+i%3*15]){s.elapsedMs+=n*60000;s.blockElapsedMs=n*60000;finishBlock(s,null,now);}
  saveSession(fixture,s,{},now);
 }
 validateData(fixture);
 if(capture){await mkdir(capture,{recursive:true});await writeFile(`${capture}/fixture.json`,JSON.stringify(fixture,null,2));}
 const seed=async(locale,theme,source=fixture)=>{
  const notebook=structuredClone(source);Object.assign(notebook.preferences,{language:locale,theme,weeklyMinutes:source.preferences.weeklyMinutes??90});
  await evaluate(`new Promise(r=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const tx=q.result.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(notebook)},'current');tx.oncomplete=r}})`);
  await send('Page.reload');await wait('.cp-today');await evaluate(`document.querySelector('[data-action=progress]').click()`);
  return notebook;
 };
 const shot=async(state,locale,theme,width,height)=>{
  const geometry=await evaluate(`(()=>{const p=document.querySelector('.cp-page');return {overflow:p.scrollWidth>p.clientWidth+1,chartWidth:document.querySelector('.cp-time-chart').clientWidth,labelsInside:[...document.querySelectorAll('.cp-time-chart text')].every(e=>{const r=e.getBoundingClientRect(),s=e.closest('svg').getBoundingClientRect();return r.left>=s.left-1&&r.right<=s.right+1;}),buttons:[...document.querySelectorAll('.cp-time-ranges button')].every(e=>e.getBoundingClientRect().height>=44&&e.scrollWidth<=e.clientWidth+1)}})()`);
  assert.equal(geometry.labelsInside,true,JSON.stringify({state,locale,width,geometry}));assert.equal(geometry.overflow,false,`${state}/${width}/${locale}`);assert.equal(geometry.buttons,true,JSON.stringify({state,locale,width,geometry}));assert.ok(geometry.chartWidth>150);
  if(capture){const image=await send('Page.captureScreenshot',{format:'png'}),bytes=Buffer.from(image.data,'base64'),path=`${locale}-${theme}-${state}-${width}x${height}.png`;await writeFile(`${capture}/${path}`,bytes);frames.push({path,state,locale,theme,width,height,sha256:hash(bytes)});}
 };
 const select=async(id,value)=>evaluate(`(()=>{const e=document.querySelector('#${id}');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
 const total=()=>evaluate(`document.querySelector('.cp-time-total strong').textContent`);
 for(const locale of ['es','en','ca'])for(const theme of ['light','dark']){
  const notebook=await seed(locale,theme);
  assert.match(await evaluate(`document.querySelector('.cp-time-stats strong').textContent`),/2 hr 19 min/);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-time-point').length`),12);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-time-stats strong')[1].textContent`),'1 hr 30 min');
  assert.ok(await evaluate(`document.querySelector('.cp-time-chart').textContent.includes('3 hr')&&document.querySelector('.cp-time-chart').textContent.includes('1 hr 30 min')`));
  assert.equal(await evaluate(`!!document.querySelector('.cp-four-weeks')`),false);
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await shot('overview',locale,theme,width,height);
  }
  const overviewTitle=await evaluate(`document.querySelector('.cp-time-overview h2').textContent`);
  const tapWeek=async index=>{
   const point=await evaluate(`(()=>{const r=document.querySelectorAll('.cp-time-week .cp-time-point')[${index}].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
   await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
   await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  };
  // Real touch input must select a historical week and keep the card in view.
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate(`document.querySelector('.cp-time-overview').scrollIntoView()`);
  const scroll=await evaluate(`document.querySelector('.cp-page').scrollTop`);
  await tapWeek(10);
  assert.equal(await evaluate(`document.querySelector('.cp-time-stats strong').textContent`),'52 min');
  assert.equal(await evaluate(`document.querySelector('.cp-page').scrollTop`),scroll);
  const expectedRange=[addDays(monday,-7),addDays(monday,-1)].map(d=>new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',year:'numeric'}).format(new Date(d+'T12:00:00'))).join(' – ');
  assert.equal(await evaluate(`document.querySelector('.cp-time-overview h2').textContent`),expectedRange);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-time-week[aria-pressed=true]').length`),1);
  // Keyboard selection uses the same total, highlight and focused week after render.
  await evaluate(`document.querySelectorAll('.cp-time-week')[9].focus()`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert.equal(await evaluate(`document.querySelector('.cp-time-stats strong').textContent`),'1 hr 9 min');
  assert.equal(await evaluate(`document.activeElement.getAttribute('aria-pressed')`),'true');
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await shot('selected-week',locale,theme,width,height);
  }
  await evaluate(`document.querySelectorAll('.cp-time-week')[11].focus()`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  assert.equal(await evaluate(`document.querySelector('.cp-time-overview h2').textContent`),overviewTitle);
  assert.equal(await evaluate(`document.querySelector('.cp-time-stats strong').textContent`),'2 hr 19 min');
  await evaluate(`document.querySelector('[data-action=progress-time]').click()`);
  assert.equal(await evaluate(`document.querySelector('.cp-nav [data-action=progress]').getAttribute('aria-current')`),'page');
  await evaluate(`document.querySelector('[data-action=progress-time-range][data-id="7d"]').click()`);assert.equal(await total(),'2 hr 19 min');
  await select('progress-time-type','repertoire');assert.equal(await total(),'2 hr 14 min');
  await select('progress-time-work','a');assert.equal(await total(),'2 hr 4 min');
  await select('progress-time-type','free');assert.equal(await total(),'0 min');
  assert.equal(await evaluate(`!!document.querySelector('.cp-time-empty')`),true);
  await select('progress-time-type','repertoire');
  for(const range of ['7d','1m','3m','6m','ytd','1y']){
   await evaluate(`document.querySelector('[data-action=progress-time-range][data-id="${range}"]').click()`);
   assert.equal(await evaluate(`document.querySelector('#progress-time-work').value`),'a');
   assert.equal(await evaluate(`document.activeElement.dataset.id`),range);
   await evaluate(`document.querySelector('.cp-time-week:last-of-type').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
   assert.equal(await total(),'2 hr 4 min');
   assert.equal(await evaluate(`document.querySelectorAll('.cp-time-week[aria-pressed=true]').length`),1);
   // Range changes restore the full filtered total, even when selecting the same range.
   await evaluate(`document.querySelector('[data-action=progress-time-range][data-id="${range}"]').click()`);
   assert.equal(await evaluate(`document.querySelectorAll('.cp-time-week[aria-pressed=true]').length`),0);
   assert.equal(await evaluate(`!!document.querySelector('.cp-time-reset')`),false);
  }
  await evaluate(`document.querySelector('[data-action=progress-time-range][data-id="3m"]').click()`);
  for(const [width,height] of [[320,640],[390,844],[844,390],[768,1024],[1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await shot('piece-detail',locale,theme,width,height);
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate(`document.querySelector('.cp-time-chart').scrollIntoView({block:'center'})`);
  const previousWeekIndex=await evaluate(`[...document.querySelectorAll('.cp-time-week')].findIndex(e=>e.dataset.id==='${addDays(monday,-7)}')`);
  await tapWeek(previousWeekIndex);
  assert.equal(await total(),'22 min');
  assert.equal(await evaluate(`document.querySelector('.cp-time-detail h2').textContent`),expectedRange);
  assert.equal(await evaluate(`!!document.querySelector('.cp-time-reset')`),true);
  for(const [width,height] of [[320,640],[390,844],[844,390],[768,1024],[1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.querySelector('.cp-time-detail').scrollIntoView()`);await shot('selected-detail-week',locale,theme,width,height);
  }
  await select('progress-time-type','free');assert.equal(await total(),'0 min');
  assert.equal(await evaluate(`document.querySelector('.cp-time-week[aria-pressed=true]').dataset.id`),addDays(monday,-7));
  await select('progress-time-type','repertoire');assert.equal(await total(),'22 min');
  await evaluate(`document.querySelector('.cp-time-reset').click()`);assert.equal(await total(),'7 hr 56 min');
  assert.equal(await evaluate(`document.querySelectorAll('.cp-time-week[aria-pressed=true]').length`),0);
  await evaluate(`document.querySelector('[data-action=progress-time-range][data-id="7d"]').click()`);
  await evaluate(`document.querySelector('.cp-time-week:last-of-type').focus()`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert.equal(await total(),'2 hr 4 min');
  assert.equal(await evaluate(`document.activeElement.getAttribute('aria-pressed')`),'true');
  assert.equal(await evaluate(`document.querySelector('.cp-time-detail h2').textContent`),new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',year:'numeric'}).format(new Date(today+'T12:00:00')));
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.querySelector('.cp-time-detail').scrollIntoView()`);await shot('selected-detail-day',locale,theme,width,height);
  }
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  assert.equal(await evaluate(`document.activeElement.getAttribute('aria-pressed')`),'false');
  assert.equal(await evaluate(`!!document.querySelector('.cp-time-reset')`),false);
  await evaluate(`document.querySelector('.cp-time-week').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);assert.equal(await total(),'0 min');
  await evaluate(`document.querySelector('[data-action=progress-time-range][data-id="3m"]').click()`);
  await evaluate(`document.querySelector('.cp-time-values').open=true`);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-time-values tbody tr').length===document.querySelectorAll('.cp-time-point').length`),true);
  await evaluate(`window.dispatchEvent(new Event('spino:back',{cancelable:true}))`);assert.equal(await evaluate(`!!document.querySelector('.cp-time-overview')`),true);
  await evaluate(`document.querySelector('[data-action=progress-time]').click()`);assert.equal(await evaluate(`document.querySelector('#progress-time-work').value`),'a');
  const after=await evaluate(`new Promise(r=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{q.result.transaction('state').objectStore('state').get('current').onsuccess=e=>r(e.target.result)}})`);
  assert.deepEqual(after,notebook);
 }
 const noGoal=emptyData();noGoal.preferences.weeklyMinutes=0;await seed('es','light',noGoal);
 await evaluate(`document.querySelectorAll('.cp-time-week')[0].dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
 assert.equal(await evaluate(`document.querySelector('.cp-time-stats strong').textContent`),'0 min');
 assert.equal(await evaluate(`!!document.querySelector('.cp-time-week[aria-pressed=true][data-id="${addDays(monday,-77)}"]')`),true);
 assert.equal(await evaluate(`document.querySelectorAll('.cp-time-stats strong').length`),1);
 await send('Emulation.setDeviceMetricsOverride',{width:320,height:640,deviceScaleFactor:1,mobile:true});await shot('selected-empty-week','es','light',320,640);
 await evaluate(`document.querySelector('[data-action=progress-time]').click()`);
 assert.equal(await total(),'0 min');await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await shot('empty','es','light',390,844);
 assert.deepEqual(errors,[]);
 if(capture){const sourceHashes={};for(const path of ['src/companion/progress-time.js','src/companion/progress-duration.js','src/companion/progress-time.css','src/companion/app.js','src/companion/progress-metrics.js','src/companion/locale-ca.js','tests/progress-time.browser.test.js'])sourceHashes[path]=hash(await readFile(path));await writeFile(`${capture}/metadata.json`,JSON.stringify({capturedAt:new Date().toISOString(),kind:'responsive-browser',nativeAcceptance:false,gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:'Existing uncommitted work preserved; this run is identified by source hashes.',build:'Vite production build',buildIndexSha256:hash(await readFile('dist/index.html')),browser:await send('Browser.getVersion'),today,sourceHashes,frames,runtimeErrors:errors},null,2));}
});
