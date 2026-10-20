import test from 'node:test';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';
import {emptyData,localDate} from '../src/companion/model.js';
import {scorePDF} from './pdf-fixture.js';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('lesson opens a running score directly, stops back to lesson and resumes its clock', {timeout:60000}, async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});
 const folder=process.env.SPINO_LESSON_PRACTICE_EVIDENCE,frames=[];
 if(folder)await mkdir(folder,{recursive:false});
 const read=()=>evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,r=db.transaction('state').objectStore('state').get('current');r.onsuccess=()=>{db.close();resolve(r.result)}}})`);
 const capture=async name=>{if(folder){const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+name+'.png',Buffer.from(shot.data,'base64'));frames.push(name+'.png')}};
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>700){clearInterval(timer);reject(Error('Timeout: '+${JSON.stringify(condition)}));}},20);})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 const data=emptyData();data.works=[{id:'score',title:'Synthetic lesson score',composer:'',stage:'En estudio',notes:'',passage:'',target:null,bpm:60,assetId:'pdf'}];
 data.events=[{id:'lesson',type:'Clase',title:'Synthetic lesson',date:localDate(),time:'12:00',place:'',notes:'',workIds:['score'],milestones:[]}];
 if(folder)await writeFile(folder+'/fixture.json',JSON.stringify(data,null,2));
 await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.objectStore('assets').put({id:'pdf',name:'Synthetic.pdf',type:'application/pdf',base64:${JSON.stringify(scorePDF())}});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=reject;};})`);
 await send('Page.reload');await wait(`document.querySelector('[data-action="event-detail"][data-id="lesson"]')`);
 await evaluate(`document.querySelector('[data-action="event-detail"][data-id="lesson"]').click()`);
 let firstTime=0,practiceId;
 for(let visit=0;visit<2;visit++){
  await wait(`document.querySelector('[data-action="lesson-score"]')`);
  await evaluate(`document.querySelector('[data-action="lesson-score"]').click()`);
  await wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);
  assert.equal(await evaluate(`document.querySelector('.score-timer').dataset.running`),'true');
  assert.equal(await evaluate(`!!document.querySelector('#prepare-form')`),false);
  if(visit===1)assert.notEqual(await evaluate(`document.querySelector('.pdf-time').textContent`),'0:00');
  await wait(`Number(document.querySelector('.pdf-time').textContent.split(':').pop())>=${visit===0?1:2}`);
  if(visit===0&&folder)for(const [name,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
   await capture('lesson-score-'+name);
  }
  await evaluate(visit===0?`document.querySelector('[data-pdf="timer"]').click()`:`window.dispatchEvent(new Event('spino:back',{cancelable:true}))`);
  await wait(`!document.querySelector('.pdf-viewer')&&document.querySelector('[data-action="lesson-score"]')`);
  const paused=await read(),practice=paused.events[0].scorePractices[0];
  assert.equal(paused.active,null);assert.equal(paused.sessions.length,0);
  assert.equal(practice.blocks[0].workId,'score');assert.equal(practice.runningSince,null);
  if(visit===0){firstTime=practice.elapsedMs;practiceId=practice.id;assert.ok(firstTime>=1000);}
  else {assert.equal(practice.id,practiceId);assert.ok(practice.elapsedMs>firstTime);}
  await capture('lesson-paused-'+visit);
  if(visit===0){
   await evaluate('new Promise(resolve=>setTimeout(resolve,1100))');
   assert.equal((await read()).events[0].scorePractices[0].elapsedMs,firstTime,'Paused lesson time must not grow');
   await send('Page.reload');await wait(`document.querySelector('[data-action="event-detail"][data-id="lesson"]')`);
   await evaluate(`document.querySelector('[data-action="event-detail"][data-id="lesson"]').click()`);
  }
 }
 const measured=(await read()).events[0].scorePractices[0].elapsedMs;
 await evaluate(`document.querySelector('[data-action="complete-lesson"]').click()`);
 await wait(`document.querySelector('#lesson-form')`);
 await evaluate(`document.querySelector('#lesson-form').requestSubmit()`);
 await wait(`!document.querySelector('#cp-dialog').open&&!document.querySelector('[data-action="lesson-score"]')`);
 const stored=await read(),result=stored.sessions[0];assert.equal(stored.sessions.length,1);assert.equal(result.lessonEventId,'lesson');
 assert.equal(result.results.find(r=>r.block.workId==='score').elapsedMs,measured,'Completing credits the measured piece time exactly once');
 assert.equal(result.results.reduce((sum,r)=>sum+r.elapsedMs,0),result.elapsedMs);
 assert.deepEqual(stored.events[0].scorePractices,[]);assert.equal(stored.active,null);
 await capture('lesson-completed');
 if(folder){
  const paths=['src/companion/app.js','src/companion/lessons.js','src/companion/model.js','src/companion/pdf-viewer.js','src/companion/musicxml-viewer.js','dist/index.html'];
  await writeFile(folder+'/verification.json',JSON.stringify({date:new Date().toISOString(),kind:'Responsive Chromium browser; disposable synthetic lesson and PDF; not native acceptance',measuredPieceMs:measured,firstTime,practiceId,frames,sourceSHA256:Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')]))),checks:['Score opens directly and runs without preparation','Timer stop and Back return to the lesson','Pause excludes elapsed time; reload and resume keep the practice ID','Completion credits exact measured piece time once and retains the total breakdown'],errors},null,2));
 }
 assert.deepEqual(errors,[]);
});
