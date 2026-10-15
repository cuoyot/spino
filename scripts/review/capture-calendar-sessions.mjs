import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {openBrowser} from '../../tests/browser.js';
import {emptyData,block,beginSession,saveSession,localDate,weekOf,addDays} from '../../src/companion/model.js';
import {agendaCard,agendaEntries} from '../../src/companion/agenda.js';
import {setAppLanguage} from '../../src/companion/locale.js';
import {writeGallery} from './build-gallery.mjs';

const folder=resolve('docs/quality-review/captures/calendar/2026-10-15-compact-sessions');
await mkdir(folder,{recursive:true});
const data=emptyData(),today=localDate(),monday=weekOf(today),cleanup=[],results=[];
data.preferences.language='es';data.preferences.theme='light';setAppLanguage('es');
for(const [day,titles] of [[0,['Lectura y repertorio','Repertorio','Repertorio']],[1,['Repertorio','Práctica de piano','Repertorio']],[2,['Lectura con un título muy largo que debe conservarse completo en el detalle','Escalas','Repertorio','Práctica libre','Arpegios','Lectura']]]){
 for(const [i,title] of titles.entries()){
  const date=addDays(monday,day),now=new Date(date+`T${String(9+i).padStart(2,'0')}:00:00`).getTime();
  const type=['reading','repertoire','repertoire','free','technique','reading'][i];
  const active=beginSession({title,context:'piano',blocks:[block(type)]},now);
  active.id=`review-session-${day}-${i}`;active.elapsedMs=active.blockElapsedMs=[9,17,44,10,35,24][i]*60000;
  if(day===0&&i===0){data.plans.push({id:'review-linked',title,date,time:'09:00',context:'piano',blocks:active.blocks,status:'planned'});active.planId='review-linked';}
  saveSession(data,active,{mood:i%2?4:null,partial:day===2&&i===4,notes:'Synthetic note: preserve the phrase and the steady pulse.',next:'Return to bars 2–4.'},now+active.elapsedMs);
 }
}
data.events=[{id:'review-lesson',title:'Clase con Carles',date:addDays(monday,1),time:'08:00',type:'Clase',place:'',notes:'',workIds:[],milestones:[]}];
data.plans.push({id:'review-next',title:'Preparar la próxima clase',date:addDays(monday,3),time:'18:00',context:'piano',blocks:[block('technique')],status:'planned',reminder:false});
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
   const metrics=await evaluate(`(()=>{const p=document.querySelector('.cp-page'),chips=[...document.querySelectorAll('.cp-session-chip')];return {overflow:p.scrollWidth>p.clientWidth+1,count:chips.length,invalid:chips.filter(e=>{const r=e.getBoundingClientRect();return r.height<44||r.width<44||e.scrollWidth>e.clientWidth+1}).length,dayHeight:document.querySelector('[data-agenda-date="${monday}"]').getBoundingClientRect().height}})()`);
   assert.equal(metrics.count,12);assert.equal(metrics.overflow,false);assert.equal(metrics.invalid,0,JSON.stringify({theme,width,metrics}));
   assert.equal(await evaluate(`document.querySelectorAll('[data-entry-id=review-linked]').length`),1);
   const frames=[];
   for(const [suffix,selector] of [['01','.cp-agenda-week'],['02',`[data-agenda-date="${addDays(monday,2)}"]`]]){
    await evaluate(`document.querySelector('${selector}').scrollIntoView({block:'start'})`);
    const shot=await send('Page.captureScreenshot',{format:'png'}),bytes=Buffer.from(shot.data,'base64'),path=`${theme}-${width}x${height}-${suffix}.png`;
    await writeFile(join(folder,path),bytes);frames.push({path,scrollTop:await evaluate(`document.querySelector('.cp-page').scrollTop`),sha256:sha(bytes)});
   }
   // Compare identical data against the former full-card presentation.
   const legacy=agendaEntries(data,monday).map(e=>agendaCard(e)).join('');
   const before=await evaluate(`(()=>{const e=document.querySelector('[data-agenda-date="${monday}"] .cp-day-content'),html=e.innerHTML;e.innerHTML=${JSON.stringify(legacy)};const h=e.parentElement.getBoundingClientRect().height;e.innerHTML=html;return h})()`);
   assert.ok(metrics.dayHeight<before*.65,JSON.stringify({theme,width,before,after:metrics.dayHeight}));
   results.push({state:theme,id:`${width}x${height}`,label:`${width<600?'Phone':'Wide'} ${width<height?'portrait':'landscape'}`,width,height,frames,metrics:{...metrics,previousDayHeight:before}});
  }
 }
 // Open linked, ad-hoc, long-title and partial records through their actual buttons.
 for(const session of [data.sessions[0],data.sessions[1],data.sessions[6],data.sessions[10]]){
  await evaluate(`document.querySelector('.cp-session-chip[data-id="${session.id}"]').click()`);await wait('[data-action=edit-saved-practice]');
  assert.equal(await evaluate(`document.querySelector('.cp-app-header h1').textContent`),session.title);
  assert.ok(await evaluate(`document.querySelector('.cp-page').textContent.includes('Synthetic note: preserve the phrase and the steady pulse.')`));
  await evaluate(`document.querySelector('.cp-nav [data-action=calendar]').click()`);
 }
 await evaluate(`document.querySelector('[data-action=calendar-mode][data-id=month]').click();document.querySelector('[data-action=select-day][data-id="${monday}"]').click()`);
 assert.equal(await evaluate(`document.querySelectorAll('.cp-agenda > .cp-session-chip').length`),3);
 await evaluate(`document.querySelector('.cp-agenda > .cp-session-chip').click()`);await wait('[data-action=edit-saved-practice]');
 await evaluate(`document.querySelector('.cp-nav [data-action=calendar]').click();document.querySelector('[data-action=calendar-mode][data-id=week]').click();document.querySelector('[data-action=add-on-day][data-id="${monday}"]').click()`);
 assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`),true);
 assert.deepEqual(errors,[]);
 const sourceFiles=['src/companion/agenda.js','src/companion/app.js','src/companion/app.css','src/companion/browse-surfaces.css','scripts/review/capture-calendar-sessions.mjs'];
 const metadata={title:'Compact calendar sessions',runId:'2026-10-15-compact-sessions',date:today,reviewHref:'../../../calendar.md',kind:'responsive-browser',nativeAcceptance:false,fixture:'fixture.json',packageVersion:JSON.parse(await readFile('package.json','utf8')).version,gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),buildIndexSha256:sha(await readFile('dist/index.html')),browser:await send('Browser.getVersion'),sourceHashes:Object.fromEntries(await Promise.all(sourceFiles.map(async path=>[path,sha(await readFile(path))]))),results,runtimeErrors:errors};
 await writeFile(join(folder,'capture.json'),JSON.stringify(metadata,null,2)+'\n');await writeGallery(folder,metadata);
 console.log(JSON.stringify({folder,frames:results.reduce((n,r)=>n+r.frames.length,0),checks:'No overflow; 44px targets; >35% day-height reduction; exact linked/ad-hoc/partial detail; month detail; Add day',errors}));
}finally{for(const close of cleanup.reverse())await close();}
