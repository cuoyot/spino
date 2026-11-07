import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
import {historyFixture} from './progress-history-fixture.js';
import {localDate,addDays,weekOf,block,validateData} from '../src/companion/model.js';

test('compact calendar, unified work entry and Progress preserve notebook contents', {timeout:120000}, async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error(${JSON.stringify(condition)}));}},20);})`);
 const click=(action)=>evaluate(`document.querySelector('[data-action="${action}"]').click()`);
 const {data,assets}=historyFixture(),today=localDate(),week=weekOf(today);
 data.preferences.weeklyMinutes=0;
 data.works[1].onStand=false;
 data.works.push({...data.works[0],id:'collection',title:'Nocturne',composer:'Clara Schumann',assetId:null,onStand:false});
 // Put several saved and planned practices together to expose horizontal scrolling.
 data.sessions.forEach(s=>s.date=week);
 data.plans=[0,1,2].map(i=>({id:'compact-plan-'+i,title:i===0?'Lectura y coordinación de manos':'Práctica prevista '+i,date:week,time:'18:00',context:'piano',blocks:[block('reading')],status:'planned',reminder:false}));
 data.plans.push({id:'reference-repertoire',title:'Repertorio',date:addDays(week,3),time:'',context:'piano',blocks:[block('repertoire',{minutes:20,workId:'history-prelude'})],status:'planned',reminder:false},
 {id:'reference-warmup',title:'Calentamiento',date:addDays(week,3),time:'',context:'piano',blocks:[block('warmup',{minutes:10,target:'hanon-1'})],status:'planned',reminder:false});
 data.events=[{id:'reference-lesson',title:'Clase de piano',type:'Clase',date:addDays(week,1),time:'15:30',place:'',notes:'',workIds:[],milestones:[],reminder:false}];
 validateData(structuredClone(data));
 const read=()=>evaluate(`new Promise(r=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets']);const state=tx.objectStore('state').get('current'),assets=tx.objectStore('assets').getAll();tx.oncomplete=()=>{r({data:state.result,assets:assets.result});db.close();}}})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 await evaluate(`new Promise(r=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');for(const a of ${JSON.stringify(assets)})tx.objectStore('assets').put(a);tx.oncomplete=()=>{db.close();r();}}})`);
 await send('Page.reload');await wait(`document.querySelector('.cp-today')`);
 const before=await read();
 const folder=process.env.NAVIGATION_EVIDENCE;
 if(folder){await mkdir(folder,{recursive:true});await writeFile(folder+'/fixture.json',JSON.stringify({data,assets},null,2));}
 const capture=async name=>{if(folder){await evaluate(`document.documentElement.dataset.theme='${name.startsWith('dark-')?'dark':'light'}'`);await new Promise(r=>setTimeout(r,150));const image=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${folder}/${name}.png`,Buffer.from(image.data,'base64'));}};
 for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,568]]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await evaluate(`document.documentElement.dataset.theme='${theme}'`);
  for(const route of ['calendar','piano','progress']) {
   await click(route);
   if(route==='calendar') {
    await click('calendar-today');await wait(`Math.abs(document.querySelector('[data-week-start="${week}"]').getBoundingClientRect().top-document.querySelector('.cp-page').getBoundingClientRect().top-document.querySelector('.cp-agenda-toolbar').offsetHeight-12)<2`);
    const geometry=await evaluate(`(()=>{const row=document.querySelector('[data-agenda-date="${week}"]'),strip=row.querySelector('.cp-day-strip'),cards=[...strip.children],r=strip.getBoundingClientRect();return{count:cards.length,overflow:strip.scrollWidth>strip.clientWidth,oneRow:cards.every(c=>Math.abs(c.getBoundingClientRect().top-cards[0].getBoundingClientRect().top)<1),peek:cards[0].getBoundingClientRect().right<r.right,heights:cards.map(c=>c.offsetHeight)};})()`);
    assert.equal(geometry.count,8);assert.equal(geometry.overflow,true);assert.equal(geometry.oneRow,true);assert.equal(geometry.peek,true);assert.deepEqual([...new Set(geometry.heights)],[56]);
    assert.doesNotMatch(await evaluate(`document.querySelector('.cp-week-agenda').textContent`),/%/);
    await capture(`${theme}-calendar-${width}x${height}`);
    await evaluate(`(()=>{const strip=document.querySelector('[data-agenda-date="${week}"] .cp-day-strip');strip.scrollLeft=strip.children[3].offsetLeft-strip.children[0].offsetLeft;})()`);
    await capture(`${theme}-calendar-saved-${width}x${height}`);
    await evaluate(`document.querySelector('.cp-page').scrollTop=document.querySelector('.cp-page').scrollHeight`);
    await wait(`!document.querySelector('.cp-calendar-today').hidden`);
    await capture(`${theme}-calendar-away-${width}x${height}`);
    await click('calendar-today');await wait(`document.querySelector('.cp-calendar-today').hidden`);
    await evaluate(`document.querySelector('.cp-page').scrollTop=0`);
    await wait(`document.querySelectorAll('[data-week-start]').length>=5`);
    const weeks=await evaluate(`[...document.querySelectorAll('[data-week-start]')].map(e=>e.dataset.weekStart)`);
    for(let i=1;i<weeks.length;i++)assert.equal((Date.parse(weeks[i])-Date.parse(weeks[i-1]))/86400000,7);
    assert.equal(new Set(weeks).size,weeks.length);
    await evaluate(`document.querySelector('[data-agenda-date="${week}"] [data-action=plan-detail]').click()`);
    assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`),true);await click('close-dialog');
    await evaluate(`document.querySelector('[data-agenda-date="${week}"] [data-action=session-detail]').click()`);
    await wait(`document.querySelector('.cp-page[data-view=session-detail]')`);await click('calendar');
   } else if(route==='piano') {
    assert.equal(await evaluate(`document.querySelectorAll('.cp-repertoire-heading button').length`),1);
    assert.equal(await evaluate(`!!document.querySelector('.cp-repertoire-heading [data-action=import-pdf]')`),false);
    await capture(`${theme}-library-${width}x${height}`);
    await click('add-work');await capture(`${theme}-add-work-${width}x${height}`);
    await click('new-work');assert.ok(await evaluate(`!!document.querySelector('#cp-dialog [name=score]')`));await click('close-dialog');
   } else {
    for(const section of ['activity','repertoire','technique']) {
     await evaluate(`document.querySelector('[data-action=progress-section][data-id=${section}]').click()`);
     await capture(`${theme}-progress-${section}-${width}x${height}`);
    }
   }
   assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth>document.querySelector('.cp-page').clientWidth+1`),false,`${route} ${theme} ${width}`);
  }
  if(width===390)for(const route of ['home','practice']){await click(route);await capture(`${theme}-${route}-${width}x${height}`);}
 }
 assert.deepEqual(await read(),before,'navigation and previews preserve notebook records and original score bytes');
 assert.deepEqual(errors,[]);
 if(folder)await writeFile(folder+'/verification.json',JSON.stringify({kind:'responsive-browser-synthetic-notebook',baseCommit:'e7e1af9',browser:await send('Browser.getVersion'),notebookAndAssetsUnchanged:true,nativeAcceptance:false,sourceHashes:Object.fromEntries(await Promise.all(['src/companion/app.js','src/companion/agenda.js','src/companion/navigation-refinement.css','src/companion/saved-session-card.js','src/companion/saved-session-card.css'].map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')]))),buildIndexSha256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex'),errors},null,2));
});
