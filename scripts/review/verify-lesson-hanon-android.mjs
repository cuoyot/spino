// Verify the installed beta through actual WebView assets and disposable namespaced notebooks.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {emptyData,beginSession,block} from '../../src/companion/model.js';
import {scorePDF} from '../../tests/pdf-fixture.js';

const folder=process.argv[2];if(!folder)throw Error('Pass a new native evidence folder');
await mkdir(folder,{recursive:false});
const adb=process.env.ADB||'/Users/migue/Library/Android/sdk/platform-tools/adb',pkg='com.miguecoll.spino.beta';
const run=args=>execFileSync(adb,args,{encoding:'utf8',timeout:60000,maxBuffer:20e6}).trim();
const pid=run(['shell','pidof',pkg]),port=run(['forward','tcp:0','localabstract:webview_devtools_remote_'+pid]);
const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
const page=pages.find(p=>p.type==='page'&&p.webSocketDebuggerUrl);assert.ok(page,'Installed WebView must be available');
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
let sequence=0;const pending=new Map(),errors=[],checks=[];
ws.onmessage=({data})=>{const message=JSON.parse(data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);if(!message.id)return;const request=pending.get(message.id);if(!request)return;pending.delete(message.id);message.error?request.reject(Error(JSON.stringify(message.error))):request.resolve(message.result)};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('Native verification timeout: '+method))},45000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}});ws.send(JSON.stringify({id,method,params}))});
const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(result.exceptionDetails,undefined,JSON.stringify(result.exceptionDetails));return result.result.value};
const wait=async condition=>{for(let attempt=0;attempt<240;attempt++){try{if(await evaluate(condition))return}catch(error){if(!/context|Cannot find/.test(String(error)))throw error}await new Promise(resolve=>setTimeout(resolve,100))}throw Error('Native state timeout: '+condition)};
const shot=async name=>{await writeFile(folder+'/'+name+'.png',execFileSync(adb,['exec-out','screencap','-p'],{maxBuffer:20e6,timeout:30000}))};
const prefix='spino-beta613-review-'+randomUUID()+'-';
const originalSnapshot=()=>evaluate(`(async()=>{
 const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 const normalize=async value=>{if(value instanceof Blob)return {type:value.type,size:value.size,sha256:await hash(await value.arrayBuffer())};if(Array.isArray(value))return Promise.all(value.map(normalize));if(value&&typeof value==='object'){const out={};for(const key of Object.keys(value).sort())out[key]=await normalize(value[key]);return out}return value};
 const result={};for(const {name} of (await indexedDB.databases()).filter(d=>!d.name.startsWith(${JSON.stringify(prefix)})).sort((a,b)=>a.name.localeCompare(b.name))){
  const db=await new Promise((resolve,reject)=>{const q=(window.__reviewOriginalIDBOpen||IDBFactory.prototype.open).call(indexedDB,name);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});result[name]={};
  for(const store of db.objectStoreNames){const rows=await new Promise((resolve,reject)=>{const tx=db.transaction(store),object=tx.objectStore(store),keys=object.getAllKeys(),values=object.getAll();tx.oncomplete=()=>resolve({keys:keys.result,values:values.result});tx.onerror=()=>reject(tx.error)});result[name][store]={count:rows.keys.length,sha256:await hash(new TextEncoder().encode(JSON.stringify(await normalize(rows))))}}db.close();
 }return result;
})()`);
let script;
try{
 await send('Page.enable');await send('Runtime.enable');
 await wait(`location.pathname==='/licenses/webm-duration-mit.txt'&&!!document.body?.textContent`);
 assert.equal(await evaluate('location.pathname'),'/licenses/webm-duration-mit.txt','Begin at the inert storage-check asset');
 const before=await originalSnapshot();
 script=(await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.search.includes('review=beta613')){window.__SPINO_DISABLE_TOUR=true;const open=IDBFactory.prototype.open;window.__reviewOriginalIDBOpen=open;IDBFactory.prototype.open=function(name,...args){return open.call(this,${JSON.stringify(prefix)}+name,...args)};const values=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),clear:()=>values.clear()}})}`})).identifier;
 await send('Page.navigate',{url:'https://localhost/?review=beta613'});await wait(`document.querySelector('.cp-today')`);
 const fixture=emptyData();fixture.preferences.language='en';fixture.preferences.theme='light';
 fixture.works=[{id:'native-lesson-score',title:'Synthetic lesson score',composer:'',stage:'En estudio',notes:'',passage:'',target:null,bpm:60,assetId:'native-lesson-pdf'}];
 fixture.events=[{id:'native-lesson',type:'Clase',title:'Synthetic lesson',date:'2026-10-20',time:'12:00',place:'',notes:'',workIds:['native-lesson-score'],milestones:[]}];
 const seed=async data=>{
  await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.objectStore('assets').put({id:'native-lesson-pdf',name:'Synthetic.pdf',type:'application/pdf',base64:${JSON.stringify(scorePDF())}});tx.oncomplete=()=>{db.close();resolve()}}})`);
  const origin=await evaluate('performance.timeOrigin');
  await send('Page.reload');await wait(`performance.timeOrigin!==${origin}`);await wait(`document.querySelector('.cp-today')`);
 };
 const read=()=>evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,r=db.transaction('state').objectStore('state').get('current');r.onsuccess=()=>{db.close();resolve(r.result)}}})`);
 const verifyLessonPDF=!process.argv.includes('--skip-legacy-pdf');
 if(verifyLessonPDF){
 await seed(fixture);await writeFile(folder+'/lesson-fixture.json',JSON.stringify(fixture,null,2));
 await evaluate(`document.querySelector('[data-action=event-detail][data-id=native-lesson]').click()`);
 let firstTime,practiceId;
 for(let visit=0;visit<2;visit++){
  await wait(`document.querySelector('[data-action=lesson-score]')`);await evaluate(`document.querySelector('[data-action=lesson-score]').click()`);
  await wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);
  assert.equal(await evaluate(`document.querySelector('.score-timer').dataset.running`),'true');
  assert.equal(await evaluate(`!!document.querySelector('#prepare-form')`),false);
  await wait(`Number(document.querySelector('.score-timer .pdf-time').textContent.split(':').at(-1))>=${visit?2:1}`);
  await shot('lesson-score-running-'+visit);
  if(visit)run(['shell','input','keyevent','4']);else await evaluate(`document.querySelector('[data-pdf=timer]').click()`);
  await wait(`!document.querySelector('.pdf-viewer')&&document.querySelector('[data-action=lesson-score]')`);
  const saved=await read(),practice=saved.events[0].scorePractices[0];assert.equal(saved.active,null);assert.equal(saved.sessions.length,0);assert.equal(practice.runningSince,null);
  if(!visit){firstTime=practice.elapsedMs;practiceId=practice.id;await new Promise(resolve=>setTimeout(resolve,1100));assert.equal((await read()).events[0].scorePractices[0].elapsedMs,firstTime)}
  else {assert.equal(practice.id,practiceId);assert.ok(practice.elapsedMs>firstTime)}
  await shot('lesson-returned-'+visit);
 }
 const measured=(await read()).events[0].scorePractices[0].elapsedMs;
 await evaluate(`document.querySelector('[data-action=complete-lesson]').click()`);await wait(`document.querySelector('#lesson-form')`);await evaluate(`document.querySelector('#lesson-form').requestSubmit()`);await wait(`!document.querySelector('#cp-dialog').open&&!document.querySelector('[data-action=lesson-score]')`);
 const completed=await read();assert.equal(completed.sessions.length,1);assert.equal(completed.sessions[0].results.find(r=>r.block.workId==='native-lesson-score').elapsedMs,measured);assert.equal(completed.sessions[0].results.reduce((sum,r)=>sum+r.elapsedMs,0),completed.sessions[0].elapsedMs);await shot('lesson-completed');
 checks.push({lessonDirectScore:true,timerStopReturns:true,nativeBackReturns:true,pausedTimeExcluded:true,resumedPracticeIdRetained:true,measuredPieceMs:measured,creditedExactlyOnce:true});
 }else checks.push({lessonPDFVerified:false,reason:'The existing Android WebView 113 stalls while loading PDF.js. Direct lesson opening, pause, Back, reload/resume and exact piece-time accounting are verified separately in production-browser tests.'});
 const warmup=emptyData();warmup.preferences.language='en';warmup.preferences.theme='light';warmup.active=beginSession({title:'Synthetic Hanon spacing',context:'piano',blocks:[block('warmup',{target:'hanon-5',exercises:['hanon-5'],minutes:3,figures:'2',hand:'both',presentation:'page'})]});await seed(warmup);await writeFile(folder+'/hanon-fixture.json',JSON.stringify(warmup,null,2));
 await evaluate(`document.querySelector('[data-action=resume-session]').click();document.querySelector('[data-action=open-reader]').click()`);await wait(`__sr.layout`);await evaluate(`document.querySelector('[data-warmup-start]')?.click();__sr.settings.metronome=false;__sr.settings.soundMode='off'`);await wait(`__sr.timed`);await evaluate(`if(__sr.timed.suspendedAt==null)document.querySelector('#start').click()`);await shot('hanon-score');
 const hanon=await evaluate(`({width:innerWidth,height:innerHeight,barsPerSystem:(__sr.layout.endBeat-__sr.layout.startBeat)/__sr.layout.rows.length/4,systems:__sr.layout.rows.length,page:__sr.layout.page})`);assert.equal(hanon.page,true);checks.push({hanon});
 await evaluate(`document.querySelector('#practice-return').click()`);
 for(const action of ['home','practice','calendar','settings']){
  await evaluate(`document.querySelector('[data-action=${action}]').click()`);
  const header=await evaluate(`(()=>{const h=document.querySelector('.cp-app-header'),r=h.getBoundingClientRect();return {title:h.querySelector('h1').textContent,grid:getComputedStyle(h).gridTemplateColumns,controls:[...h.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>{const q=b.getBoundingClientRect();return {action:b.dataset.action,inside:q.y>=r.y&&q.bottom<=r.bottom+.5&&q.x>=r.x&&q.right<=r.right+.5}})}})()`);
  assert.ok(header.controls.every(c=>c.inside),'Native header actions stay within their row: '+action);checks.push({route:action,header});await shot('header-after-practice-'+action);
 }
 const after=await originalSnapshot();assert.deepEqual(after,before,'Original logical notebooks and assets must remain unchanged');
 const foreground=run(['shell','dumpsys','activity','activities']).split('\n').filter(line=>line.includes('topResumedActivity'));assert.ok(foreground.some(line=>line.includes(pkg+'/com.miguecoll.spino.MainActivity')));
 assert.deepEqual(errors,[]);
 await writeFile(folder+'/native-verification.json',JSON.stringify({date:new Date().toISOString(),version:'6.1.1-beta.3',build:79,kind:'Installed Android emulator WebView; disposable namespaced notebooks; not physical-device acceptance',storagePrefix:prefix,originalStoresBefore:before,originalStoresAfter:after,originalStoresUnchanged:true,checks,foreground,runtimeErrors:errors},null,2));
 console.log(JSON.stringify({lessonPDFVerified:verifyLessonPDF,hanon,headerAfterPractice:true,originalStoresUnchanged:true,foreground:true}));
}catch(error){
 await writeFile(folder+'/failure.json',JSON.stringify({message:String(error),checks,runtimeErrors:errors,screen:await evaluate(`document.body.innerText.slice(-3000)`).catch(()=>null)},null,2));await shot('failed-state').catch(()=>{});throw error;
}finally{
 if(script)await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script}).catch(()=>{});
 ws.close();run(['forward','--remove','tcp:'+port]);
}
