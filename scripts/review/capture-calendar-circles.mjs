import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {openBrowser} from '../../tests/browser.js';
import {emptyData,block,beginSession,saveSession,localDate,weekOf,addDays,validateData} from '../../src/companion/model.js';
import {warmupBlockValues} from '../../src/companion/warmups.js';
import {agendaCard,agendaEntries} from '../../src/companion/agenda.js';
import {setAppLanguage} from '../../src/companion/locale.js';
import {writeGallery} from './build-gallery.mjs';

const runId=process.argv[2]||'2026-10-15-session-circles';
const folder=resolve('docs/quality-review/captures/calendar',runId);
await mkdir(folder,{recursive:true});
const data=emptyData(),today=localDate(),monday=weekOf(today),cleanup=[],results=[];
data.preferences.language='es';data.preferences.theme='light';setAppLanguage('es');
for(const [day,titles] of [[0,['Lectura y repertorio','Repertorio','Repertorio']],[1,['Repertorio','Práctica de piano','Repertorio']],[2,['Lectura con un título muy largo que debe conservarse completo en el detalle','Escalas','Repertorio','Práctica libre','Arpegios','Lectura']]]){
 for(const [i,title] of titles.entries()){
  const date=addDays(monday,day),now=new Date(date+`T${String(9+i).padStart(2,'0')}:00:00`).getTime();
  const type=['reading','repertoire','technique','free','technique','reading'][i];
  const active=beginSession({title,context:'piano',blocks:day===0&&i===0?[block('warmup',warmupBlockValues(data)),block(type)]:[block(type)]},now);
  active.id=`review-session-${day}-${i}`;active.elapsedMs=active.blockElapsedMs=(day===2?[59,60,75,120,180,720]:[9,17,95,10,35,24])[i]*60000;
  if(day===0&&i===0){data.plans.push({id:'review-linked',title,date,time:'09:00',context:'piano',blocks:active.blocks,status:'planned'});active.planId='review-linked';}
  saveSession(data,active,{mood:i%2?4:null,partial:day===2&&i===4,notes:'Synthetic note: preserve the phrase and the steady pulse.',next:'Return to bars 2–4.'},now+active.elapsedMs);
 }
}
data.events=[{id:'review-lesson',title:'Clase con Carles',date:addDays(monday,1),time:'08:00',type:'Clase',place:'',notes:'',workIds:[],milestones:[]}];
data.plans.push({id:'review-next',title:'Preparar la próxima clase',date:addDays(monday,3),time:'18:00',context:'piano',blocks:[block('technique')],status:'planned',reminder:false});
validateData(data);
await writeFile(join(folder,'fixture.json'),JSON.stringify(data,null,2)+'\n');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
try{
 const {send,evaluate,url,errors}=await openBrowser({after:fn=>cleanup.push(fn)},{companion:true,language:'es'});
 const wait=selector=>evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(document.querySelector(${JSON.stringify(selector)})){clearInterval(t);resolve()}else if(++n>300){clearInterval(t);reject(Error('Timeout'))}},20)})`);
 await send('Page.navigate',{url});await wait('.cp-today');
 await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}})`);
 await send('Page.reload');await wait('.cp-today');
 for(const theme of ['light','dark']){
  await evaluate(`document.querySelector('[data-action=settings]').click();document.querySelector('[data-action=profile-appearance]').click();document.querySelector('[data-action=set-theme][data-id=${theme}]').click();document.querySelector('[data-action=close-dialog]').click();document.querySelector('.cp-nav [data-action=calendar]').click();document.querySelector('[data-action=calendar-mode][data-id=week]').click()`);
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await evaluate(`document.querySelector('.cp-agenda-week').scrollIntoView({block:'start'})`);
   const metrics=await evaluate(`(()=>{const p=document.querySelector('.cp-page'),chips=[...document.querySelectorAll('.cp-session-chip')];const overlap=(a,b)=>a.left<b.right-0.5&&a.right>b.left+0.5&&a.top<b.bottom-0.5&&a.bottom>b.top+0.5;return {overflow:p.scrollWidth>p.clientWidth+1,count:chips.length,invalid:chips.filter(e=>{const r=e.getBoundingClientRect(),duration=e.querySelector('.cp-session-chip-duration').getBoundingClientRect(),mood=e.querySelector('.cp-session-chip-mood')?.getBoundingClientRect(),symbol=e.querySelector('.cp-session-chip-icon').getBoundingClientRect();return r.height!==64||r.width!==64||duration.left<r.left||duration.right>r.right||overlap(duration,symbol)||(mood&&overlap(mood,duration))}).length,icons:chips.filter(e=>e.querySelector('.cp-session-chip-icon svg')).length,rows:[...document.querySelectorAll('.cp-session-strip')].map(strip=>({height:strip.clientHeight,width:strip.clientWidth,total:strip.scrollWidth,scrollbar:getComputedStyle(strip).scrollbarWidth,tops:[...strip.querySelectorAll('.cp-session-chip')].map(e=>Math.round(e.getBoundingClientRect().top))})),dayHeight:document.querySelector('[data-agenda-date="${monday}"]').getBoundingClientRect().height,longDurations:[...document.querySelectorAll('[data-agenda-date="${addDays(monday,2)}"] .cp-session-chip-duration')].map(e=>e.textContent.trim())}})()`);
   assert.equal(metrics.count,12);assert.equal(metrics.overflow,false);assert.equal(metrics.invalid,0,JSON.stringify({theme,width,metrics}));assert.equal(metrics.icons,12);for(const row of metrics.rows){assert.equal(new Set(row.tops).size,1);assert.ok(row.height<=84);assert.equal(row.scrollbar,'none');}if(width<=390)assert.ok(metrics.rows.some(row=>row.total>row.width));
   assert.deepEqual([...metrics.longDurations].sort(),['59 min','60 min','75 min','120 min','180 min','720 min'].sort());
   assert.equal(await evaluate(`document.querySelector('[data-entry-id=review-linked]').dataset.activity`),'reading');
   assert.equal(await evaluate(`document.querySelectorAll('[data-entry-id=review-linked]').length`),1);
   const stripSelector=`[data-agenda-date="${addDays(monday,2)}"] .cp-session-strip`;
   const scrollState=await evaluate(`(()=>{const strip=document.querySelector('${stripSelector}'),add=strip.parentElement.querySelector('.cp-add-day'),left=add.getBoundingClientRect().left;strip.scrollLeft=strip.scrollWidth;return {left:strip.scrollLeft,overflow:strip.scrollWidth>strip.clientWidth,addMoved:Math.abs(add.getBoundingClientRect().left-left)>1}})()`);
   assert.equal(scrollState.addMoved,false);if(scrollState.overflow)assert.ok(scrollState.left>0);
   if(width<=390){
    await evaluate(`document.querySelector('${stripSelector}').scrollIntoView({block:'center'});document.querySelector('${stripSelector}').scrollLeft=0;document.querySelector('${stripSelector}').focus()`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    await evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(document.querySelector('${stripSelector}').scrollLeft>0){clearInterval(t);resolve()}else if(++n>50){clearInterval(t);reject(Error('Keyboard scroll failed'))}},20)})`);
    const point=await evaluate(`(()=>{const strip=document.querySelector('${stripSelector}');strip.scrollLeft=0;strip.blur();const r=strip.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+30}})()`);
    await send('Input.synthesizeScrollGesture',{...point,xDistance:-120,yDistance:0,gestureSourceType:'touch'});
    assert.ok(await evaluate(`document.querySelector('${stripSelector}').scrollLeft>0`),'Touch scroll reaches the hidden sessions');
    await evaluate(`document.querySelector('${stripSelector}').scrollLeft=document.querySelector('${stripSelector}').scrollWidth`);
   }
   const frames=[];
   for(const [suffix,selector] of [['01','.cp-agenda-week'],['02',`[data-agenda-date="${addDays(monday,2)}"]`],['03',`[data-agenda-date="${addDays(monday,2)}"]`]]){
    if(suffix==='03')await evaluate(`document.querySelector('${stripSelector}').scrollLeft=0`);
    await evaluate(`document.querySelector('${selector}').scrollIntoView({block:'start'})`);
    const shot=await send('Page.captureScreenshot',{format:'png'}),bytes=Buffer.from(shot.data,'base64'),path=`${theme}-${width}x${height}-${suffix}.png`;
    await writeFile(join(folder,path),bytes);frames.push({path,scrollTop:await evaluate(`document.querySelector('.cp-page').scrollTop`),sha256:sha(bytes)});
   }
   // Compare identical data against the original full-card presentation.
   const legacy=agendaEntries(data,monday).map(e=>agendaCard(e)).join('');
   const before=await evaluate(`(()=>{const e=document.querySelector('[data-agenda-date="${monday}"] .cp-day-content'),html=e.innerHTML;e.innerHTML=${JSON.stringify(legacy)};const h=e.parentElement.getBoundingClientRect().height;e.innerHTML=html;return h})()`);
   assert.ok(metrics.dayHeight<before,JSON.stringify({theme,width,before,after:metrics.dayHeight}));
   results.push({state:theme,id:`${width}x${height}`,label:`${width<600?'Phone':'Wide'} ${width<height?'portrait':'landscape'}`,width,height,frames,metrics:{...metrics,previousDayHeight:before}});
  }
 }
 // Open linked, ad-hoc, long-title and partial records through their actual buttons.
 for(const session of [data.sessions[0],data.sessions[1],...data.sessions.slice(6)]){
  await evaluate(`document.querySelector('.cp-session-chip[data-id="${session.id}"]').click()`);await wait('[data-action=edit-saved-practice]');
  assert.equal(await evaluate(`document.querySelector('.cp-app-header h1').textContent`),session.title);
  assert.ok(await evaluate(`document.querySelector('.cp-page').textContent.includes('Synthetic note: preserve the phrase and the steady pulse.')`));
  await evaluate(`document.querySelector('.cp-nav [data-action=calendar]').click()`);
 }
 await evaluate(`document.querySelector('[data-action=calendar-mode][data-id=month]').click();document.querySelector('[data-action=select-day][data-id="${monday}"]').click()`);
 assert.equal(await evaluate(`document.querySelectorAll('.cp-agenda .cp-session-chip').length`),3);
 await evaluate(`document.querySelector('[data-action=select-day][data-id="${addDays(monday,2)}"]').click();document.querySelector('.cp-agenda .cp-session-chip:last-child').focus()`);
 assert.equal(await evaluate(`document.querySelectorAll('.cp-agenda .cp-session-chip').length`),6);
 assert.ok(await evaluate(`document.querySelector('.cp-agenda .cp-session-strip').scrollLeft>0`));
 assert.equal(await evaluate(`new Set([...document.querySelectorAll('.cp-agenda .cp-session-chip')].map(e=>Math.round(e.getBoundingClientRect().top))).size`),1);
 await evaluate(`document.querySelector('.cp-agenda .cp-session-chip').click()`);await wait('[data-action=edit-saved-practice]');
 await evaluate(`document.querySelector('.cp-nav [data-action=calendar]').click();document.querySelector('[data-action=calendar-mode][data-id=week]').click();document.querySelector('[data-action=add-on-day][data-id="${monday}"]').click()`);
 assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`),true);
 // Check that the page still contains its layout with a larger root font size.
 await evaluate(`document.querySelector('[data-action=close-dialog]').click()`);
 await send('Emulation.setDeviceMetricsOverride',{width:320,height:640,deviceScaleFactor:1,mobile:true});
 await evaluate(`document.documentElement.style.fontSize='125%'`);
 assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth>document.querySelector('.cp-page').clientWidth+1`),false);
 assert.deepEqual(errors,[]);
 const sourceFiles=['src/companion/agenda.js','src/companion/app.js','src/companion/app.css','src/companion/browse-surfaces.css','src/companion/icons.js','src/companion/locale-ca.js','scripts/review/capture-calendar-circles.mjs'];
 const metadata={title:'Circular calendar sessions',runId,date:today,reviewHref:'../../../calendar.md',kind:'responsive-browser',nativeAcceptance:false,fixture:'fixture.json',packageVersion:JSON.parse(await readFile('package.json','utf8')).version,gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),buildIndexSha256:sha(await readFile('dist/index.html')),browser:await send('Browser.getVersion'),sourceHashes:Object.fromEntries(await Promise.all(sourceFiles.map(async path=>[path,sha(await readFile(path))]))),results,runtimeErrors:errors};
 await writeFile(join(folder,'capture.json'),JSON.stringify(metadata,null,2)+'\n');await writeGallery(folder,metadata);
 console.log(JSON.stringify({folder,frames:results.reduce((n,r)=>n+r.frames.length,0),checks:'One row; hidden scrollbars; working horizontal scroll and fixed Add; 64px circles; no time/icon/mood overlap; 59/60/75/120/180/720 min; exact linked/ad-hoc/partial detail; month detail; Add day; 125% root font size',errors}));
}finally{for(const close of cleanup.reverse())await close();}
