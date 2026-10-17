import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {openBrowser} from './browser.js';
import {emptyData,beginSession,block,finishBlock,saveSession,localDate,weekOf,addDays} from '../src/companion/model.js';
const folder=process.env.RHYTHM_CAPTURE;
test('musical streak detail and weekly/monthly recording navigation preserve notebook and recordings',async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
 const wait=selector=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(document.querySelector(${JSON.stringify(selector)})){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('Missing '+${JSON.stringify(selector)}))}},20)})`);
 const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);

 await send('Page.navigate',{url});await wait('.cp-today');
 const fixture=emptyData(),today=localDate(),monday=weekOf(today),frames=[];
 Object.assign(fixture.preferences,{language:'es',theme:'light',weeklyMinutes:90});
 fixture.works=['a','b'].map(id=>({id,title:id==='a'?'Prélude en do majeur':'Synthetic étude',composer:'Review fixture',stage:'En estudio',notes:'',passage:'',target:null,bpm:60}));
 for(let i=0;i<7;i++){
  const now=new Date(addDays(monday,-7*i)+'T12:00:00').getTime(),s=beginSession({title:'Synthetic practice',context:'piano',blocks:[block('repertoire',{workId:'a'})]},now);s.elapsedMs=s.blockElapsedMs=40*60000;finishBlock(s,null,now);saveSession(fixture,s,{},now);
 }
 const records=[['audio-now','audio','a',today,false],['video-now','video','a',today,false],['audio-week','audio','b',monday,false],['audio-old','audio','a',addDays(monday,-8),false],['video-old','video','b',addDays(monday,-35),false],['draft-now','video','a',today,true]].map(([id,kind,workId,date,draft])=>({id,kind,workId,workTitle:fixture.works.find(w=>w.id===workId).title,title:id,createdAt:date+'T10:00:00',durationMs:1000,draft}));
 await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const tx=q.result.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{q.result.close();resolve()}}})`);
 await evaluate(`new Promise(resolve=>{const q=indexedDB.open('spino-local-media');q.onsuccess=()=>{const db=q.result,tx=db.transaction(['meta','recordings'],'readwrite');tx.objectStore('meta').get('installation').onsuccess=e=>{for(const r of ${JSON.stringify(records)})tx.objectStore('recordings').put({...r,installation:e.target.result,blob:new Blob(['synthetic'],{type:r.kind+'/webm'})})};tx.oncomplete=()=>{db.close();resolve()}}})`);
 await send('Page.reload');await wait('.cp-today');await click('.cp-nav [data-action=progress]');
 assert.equal(await evaluate(`document.querySelector('.cp-rhythm-emblem strong').textContent`),'7');assert.equal(await evaluate(`document.querySelector('.cp-recordings-total').textContent`),'4');
 const capture=async(state,width,height,theme)=>{
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});if(state.startsWith('media-')&&state!=='media-list')await evaluate(`document.querySelector('.cp-media-calendar-panel').scrollIntoView({block:'start'})`);await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
  assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth>document.querySelector('.cp-page').clientWidth+1`),false,state+'/'+width);
  const geometry=await evaluate(`(()=>{const el=document.querySelector('#cp-dialog[open]')||document.querySelector('.cp-media .cp-activity-calendar')||document.querySelector('.cp-progress-highlights'),r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:el.clientWidth,overflow:el.scrollWidth>el.clientWidth+1}})()`);
  assert.ok(geometry.left>=-1&&geometry.right<=width+1,JSON.stringify({state,width,geometry}));assert.equal(geometry.overflow,false,JSON.stringify({state,width,geometry}));
  if(state.startsWith('media-')) {
   const indicators=await evaluate(`(()=>{const header=document.querySelector('.cp-media .cp-activity-calendar header'),buttons=header.querySelectorAll('button'),left=buttons[0].getBoundingClientRect(),title=buttons[1].getBoundingClientRect(),right=buttons[2].getBoundingClientRect();const mixed=[...document.querySelectorAll('.cp-media .cp-activity-day')].find(d=>d.querySelector('.cp-media-day-audio')&&d.querySelector('.cp-media-day-video'));return {headerPositions:{leftEnd:left.right,titleStart:title.left,titleEnd:title.right,rightStart:right.left,display:getComputedStyle(header).display,columns:getComputedStyle(header).gridTemplateColumns},headerInline:left.right<=title.left+1&&title.right<=right.left+1,emptyNeutral:[...document.querySelectorAll('.cp-media .cp-activity-day:not(.has-recordings)')].every(e=>{const c=getComputedStyle(e);return c.backgroundColor==='rgba(0, 0, 0, 0)'&&c.backgroundImage==='none'&&c.boxShadow==='none'}),recordingsColored:[...document.querySelectorAll('.cp-media .cp-activity-day.has-recordings')].every(e=>getComputedStyle(e).backgroundColor!=='rgba(0, 0, 0, 0)'),contained:[...document.querySelectorAll('.cp-media-day-kind')].every(e=>{const r=e.getBoundingClientRect(),d=e.closest('.cp-activity-day').getBoundingClientRect();return r.left>=d.left&&r.right<=d.right&&r.top>=d.top&&r.bottom<=d.bottom}),inline:!mixed||Math.abs(mixed.querySelector('.cp-media-day-video').getBoundingClientRect().top-mixed.querySelector('.cp-media-day-audio').getBoundingClientRect().top)<1,compact:[...document.querySelectorAll('.cp-media .cp-activity-day')].every(e=>e.getBoundingClientRect().height<=72),noCounts:!document.querySelector('.cp-media-day-icons small')}})()`);
   assert.equal(indicators.headerInline,true,JSON.stringify({state,width,indicators}));assert.equal(indicators.emptyNeutral,true,JSON.stringify({state,width,indicators}));assert.equal(indicators.recordingsColored,true,JSON.stringify({state,width,indicators}));assert.equal(indicators.contained,true,JSON.stringify({state,width,indicators}));assert.equal(indicators.inline,true,JSON.stringify({state,width,indicators}));assert.equal(indicators.compact,true,JSON.stringify({state,width,indicators}));assert.equal(indicators.noCounts,true);
  }
  if(folder){const path=`${theme}-${state}-${width}x${height}.png`,shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+path,Buffer.from(shot.data,'base64'));frames.push({path,state,width,height,theme,geometry});}
 };
 if(folder){await mkdir(folder,{recursive:true});await writeFile(folder+'/fixture.json',JSON.stringify(fixture,null,2));await writeFile(folder+'/recordings.json',JSON.stringify(records,null,2));}
 const layouts=[[390,844],[844,390],[768,1024],[1024,768],[320,640]];
 for(const theme of ['light','dark'])for(const [w,h] of layouts){await evaluate(`document.querySelector('.cp-progress-highlights').scrollIntoView({block:'center'})`);await capture('overview',w,h,theme);}
 await click('[data-action=progress-streak]');assert.equal(await evaluate(`document.querySelector('.cp-streak-summary strong').textContent`),'7 semanas');
 for(const theme of ['light','dark'])for(const [w,h] of layouts)await capture('streak-detail',w,h,theme);
 const heading=await evaluate(`document.querySelector('.cp-streak-detail h3').textContent`);await click('[data-action=streak-month][data-id="-1"]');assert.notEqual(await evaluate(`document.querySelector('.cp-streak-detail h3').textContent`),heading);await click('[data-action=streak-month][data-id="1"]');assert.equal(await evaluate(`document.querySelector('.cp-streak-detail h3').textContent`),heading);
 await evaluate(`window.dispatchEvent(new Event('spino:back',{cancelable:true}))`);assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`),false);
 await click('[data-action=progress-media-week]');await wait('.cp-media');assert.equal(await evaluate(`document.querySelectorAll('.cp-media .cp-activity-day').length`),7);assert.equal(await evaluate(`document.querySelectorAll('.cp-media select,.cp-media input,[data-action=media-calendar-mode]').length`),0);assert.equal(await evaluate(`document.querySelector('[data-action=media-toggle-month]').getAttribute('aria-expanded')`),'false');assert.equal(await evaluate(`document.querySelectorAll('.cp-media-calendar-title small,.cp-media-calendar-title i').length`),0);assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),4);
 assert.equal(await evaluate(`document.querySelectorAll('.cp-media-kind-video').length`),2);assert.equal(await evaluate(`document.querySelectorAll('.cp-media-kind-audio').length`),2);
 for(const theme of ['light','dark'])for(const [w,h] of layouts)await capture('media-week',w,h,theme);
 // Calendar icons and the visible filter buttons toggle the same exclusive type filter.
 const count=()=>evaluate(`document.querySelectorAll('.cp-media-list article').length`);
 const pressed=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).getAttribute('aria-pressed')`);
 const audio='.cp-media-filters [data-id=audio]',video='.cp-media-filters [data-id=video]',piece='[data-action=media-filter-work]';
 await click('.cp-media-day-audio');assert.equal(await count(),2);assert.equal(await pressed(audio),'true');
 assert.equal(await evaluate(`document.querySelectorAll('.cp-media-day-video').length`),0);
 await click('.cp-media-day-audio');assert.equal(await count(),4);assert.equal(await pressed(audio),'false');
 await click(video);assert.equal(await count(),2);assert.equal(await pressed(video),'true');
 await click(audio);assert.equal(await count(),2);assert.equal(await pressed(video),'false');
 await click(piece);await wait('.cp-media-piece-choices');await click('[data-action=media-select-work][data-id=b]');
 assert.equal(await count(),1);assert.equal(await pressed(piece),'true');assert.equal(await pressed(audio),'true');
 assert.equal(await evaluate(`document.activeElement.dataset.action`),'media-filter-work');
 for(const theme of ['light','dark'])for(const [w,h] of layouts)await capture('media-filtered-piece',w,h,theme);
 await click(video);assert.equal(await count(),0);assert.match(await evaluate(`document.querySelector('.cp-media-list').textContent`),/estos filtros/);
 for(const theme of ['light','dark'])for(const [w,h] of layouts)await capture('media-filtered-empty',w,h,theme);
 await click('[data-action=media-toggle-month]');assert.equal(await pressed(video),'true');assert.equal(await pressed(piece),'true');
 await click('[data-action=media-toggle-month]');await click('[data-action=media-month][data-id="-1"]');assert.equal(await pressed(video),'true');assert.equal(await pressed(piece),'true');await click('[data-action=media-month][data-id="1"]');
 await click(piece);
 for(const theme of ['light','dark'])for(const [w,h] of layouts)await capture('media-piece-picker',w,h,theme);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});assert.equal(await pressed(piece),'true');
 await click(piece);await click('[data-action=media-select-work][data-id=""]');assert.equal(await pressed(piece),'false');assert.equal(await count(),2);
 // Keyboard activation clears the type; active styling is backed by an accessible pressed state.
 await evaluate(`document.querySelector(${JSON.stringify(video)}).focus()`);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});assert.equal(await count(),4);assert.equal(await pressed(video),'false');
 // The weekly Progress shortcut clears any previous filters.
 await click(audio);await click(piece);await click('[data-action=media-select-work][data-id=b]');
 await click('.cp-nav [data-action=progress]');await click('[data-action=progress-media-week]');await wait('.cp-media');assert.equal(await count(),4);assert.equal(await pressed(audio),'false');assert.equal(await pressed(piece),'false');

 await click('[data-action=media-toggle-month]');assert.equal(await evaluate(`document.querySelector('[data-action=media-toggle-month]').getAttribute('aria-expanded')`),'true');assert.equal(await evaluate(`document.activeElement.dataset.action`),'media-toggle-month');assert.ok(await evaluate(`document.querySelectorAll('.cp-media .cp-activity-day').length>=28`));assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),records.filter(r=>r.createdAt.slice(0,7)===today.slice(0,7)).length);
 for(const theme of ['light','dark'])for(const [w,h] of layouts)await capture('media-month',w,h,theme);
 const previousMonth=new Date(today.slice(0,7)+'-01T12:00:00');previousMonth.setMonth(previousMonth.getMonth()-1);
 await click('[data-action=media-month][data-id="-1"]');assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),records.filter(r=>r.createdAt.slice(0,7)===localDate(previousMonth).slice(0,7)).length);
 await click('[data-action=media-month][data-id="1"]');assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),records.filter(r=>r.createdAt.slice(0,7)===today.slice(0,7)).length);
 await click('[data-action=media-toggle-month]');assert.equal(await evaluate(`document.querySelector('[data-action=media-toggle-month]').getAttribute('aria-expanded')`),'false');assert.equal(await evaluate(`document.querySelectorAll('.cp-media .cp-activity-day').length`),7);assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),4);
 await click('[data-action=media-month][data-id="-1"]');assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),0);assert.match(await evaluate(`document.querySelector('.cp-media-list').textContent`),/esta semana/);
 await click('[data-action=media-month][data-id="-1"]');assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),1);
 await click('[data-action=media-month][data-id="1"]');await click('[data-action=media-month][data-id="1"]');assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),4);
 await click('[data-action=media-month][data-id="1"]');assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),0);
 for(const theme of ['light','dark'])for(const [w,h] of layouts)await capture('media-empty-week',w,h,theme);
 await click('.cp-nav [data-action=progress]');await click('[data-action=progress-streak]');await click('[data-action=close-dialog]');await click('[data-action=progress-media-week]');await wait('.cp-media');assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),4);
 const after=await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{q.result.transaction('state').objectStore('state').get('current').onsuccess=e=>{q.result.close();resolve(e.target.result)}}})`);assert.deepEqual(after,fixture);
 const ids=await evaluate(`new Promise(resolve=>{const q=indexedDB.open('spino-local-media');q.onsuccess=()=>{q.result.transaction('recordings').objectStore('recordings').getAll().onsuccess=e=>{q.result.close();resolve(e.target.result.map(r=>r.id).sort())}}})`);assert.deepEqual(ids,records.map(r=>r.id).sort());
 let boundary=monday;
 for(let i=0;i<6&&boundary.slice(0,7)===addDays(boundary,6).slice(0,7);i++){await click('[data-action=media-month][data-id="-1"]');boundary=addDays(boundary,-7);}
 const boundaryHeading=await evaluate(`document.querySelector('.cp-media-calendar-title').textContent`);
 for(const date of [boundary,addDays(boundary,6)])assert.ok(boundaryHeading.includes(new Intl.DateTimeFormat('es',{month:'long'}).format(new Date(date+'T12:00:00'))));
 for(const theme of ['light','dark'])for(const [w,h] of layouts)await capture('media-boundary-week',w,h,theme);
 await click('.cp-nav [data-action=progress]');await click('[data-action=progress-media-week]');await wait('.cp-media');
 for(const theme of ['light','dark'])for(const [w,h] of layouts){await evaluate(`document.querySelector('.cp-media-list').scrollIntoView({block:'start'})`);await capture('media-list',w,h,theme);}
 await click('.cp-nav [data-action=progress]');await click('[data-action=progress-streak]');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`),false);
 assert.deepEqual(errors,[]);
 if(folder){const sourceHashes={};for(const path of ['src/companion/app.js','src/companion/progress-rhythm.js','src/companion/activity-calendar.js','src/companion/activity-calendar.css','src/companion/media-view.js','src/companion/media.css','src/companion/locale-ca.js','tests/progress-rhythm.browser.test.js'])sourceHashes[path]=createHash('sha256').update(await readFile(path)).digest('hex');await writeFile(folder+'/metadata.json',JSON.stringify({capturedAt:new Date().toISOString(),kind:'responsive-browser',nativeAcceptance:false,gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),build:'Vite production build',buildIndexSha256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex'),sourceHashes,frames,runtimeErrors:errors,notebookUnchanged:true,recordingIdsUnchanged:true},null,2));}
});
