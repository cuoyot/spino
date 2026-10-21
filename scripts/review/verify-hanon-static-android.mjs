// Verify the installed beta through actual WebView assets and disposable namespaced notebooks.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {emptyData,beginSession,block} from '../../src/companion/model.js';

const folder=process.argv[2];if(!folder)throw Error('Pass a new native evidence folder');
const expanded=process.argv.includes('--expanded');
const exerciseNumbers=expanded?Array.from({length:10},(_,i)=>i+1):[1];
const resumePath=process.argv.find(arg=>arg.startsWith('--resume-checkpoint='))?.split('=').slice(1).join('=');
const prior=resumePath?JSON.parse(await readFile(resumePath,'utf8')):null;
if(prior){
 assert.equal(prior.runtimeErrors.length,0);
 for(const binding of [prior.failure,prior.log])assert.equal(createHash('sha256').update(await readFile(binding.path)).digest('hex'),binding.sha256);
 const artifact=JSON.parse(await readFile(new URL('../../output/app-hanon-2-10-2026-10-20/final-apk-integrity-01.json',import.meta.url),'utf8'));
 assert.equal(prior.apkSha256,artifact.sha256,'Only resume checks for the exact unchanged installed APK');
}
await mkdir(folder,{recursive:false});
const adb=process.env.ADB||'/Users/migue/Library/Android/sdk/platform-tools/adb',pkg='com.miguecoll.spino.beta';
const run=args=>execFileSync(adb,args,{encoding:'utf8',timeout:60000,maxBuffer:20e6}).trim();
const expectedVersion=JSON.parse(await readFile(new URL('../../package.json',import.meta.url),'utf8')).version;
const expectedBuild=Number((await readFile(new URL('../../android/app/build.gradle',import.meta.url),'utf8')).match(/\bversionCode\s+(\d+)/)?.[1]);
assert.ok(expectedBuild,'Expected Android versionCode must be available');
const packageInfo=run(['shell','dumpsys','package',pkg]);
const installedVersion=packageInfo.match(/\bversionName=([^\s]+)/)?.[1],installedBuild=Number(packageInfo.match(/\bversionCode=(\d+)/)?.[1]);
assert.equal(installedVersion,expectedVersion,'Review the expected installed beta');assert.equal(installedBuild,expectedBuild);
const pid=run(['shell','pidof',pkg]),port=run(['forward','tcp:0','localabstract:webview_devtools_remote_'+pid]);
const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
const page=pages.find(p=>p.type==='page'&&p.webSocketDebuggerUrl);assert.ok(page,'Installed WebView must be available');
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
let sequence=0;const pending=new Map(),errors=[],checks=[];
ws.onmessage=({data})=>{const message=JSON.parse(data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);if(!message.id)return;const request=pending.get(message.id);if(!request)return;pending.delete(message.id);message.error?request.reject(Error(JSON.stringify(message.error))):request.resolve(message.result)};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('Native verification timeout: '+method))},45000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject:error=>{clearTimeout(timer);reject(error)}});ws.send(JSON.stringify({id,method,params}))});
const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(result.exceptionDetails,undefined,JSON.stringify(result.exceptionDetails));return result.result.value};
const wait=async condition=>{for(let attempt=0;attempt<240;attempt++){try{if(await evaluate(condition))return}catch(error){if(!/context|Cannot find/.test(String(error)))throw error}await new Promise(resolve=>setTimeout(resolve,100))}throw Error('Native state timeout: '+condition)};
const shot=async name=>{
 // Read the actual installed WebView surface without blocking Android's screenshot service.
 const {data}=await send('Page.captureScreenshot',{format:'png'});
 await writeFile(folder+'/'+name+'.png',Buffer.from(data,'base64'));
};
const prefix='spino-beta614-hanon-review-'+randomUUID()+'-';
const originalSnapshot=()=>evaluate(`(async()=>{
 const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 const normalize=async value=>{if(value instanceof Blob)return {type:value.type,size:value.size,sha256:await hash(await value.arrayBuffer())};if(Array.isArray(value))return Promise.all(value.map(normalize));if(value&&typeof value==='object'){const out={};for(const key of Object.keys(value).sort())out[key]=await normalize(value[key]);return out}return value};
 const result={};for(const {name} of (await indexedDB.databases()).filter(d=>!d.name.startsWith(${JSON.stringify(prefix)})).sort((a,b)=>a.name.localeCompare(b.name))){
  const db=await new Promise((resolve,reject)=>{const q=(window.__reviewOriginalIDBOpen||IDBFactory.prototype.open).call(indexedDB,name);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});result[name]={};
  for(const store of db.objectStoreNames){const rows=await new Promise((resolve,reject)=>{const tx=db.transaction(store),object=tx.objectStore(store),keys=object.getAllKeys(),values=object.getAll();tx.oncomplete=()=>resolve({keys:keys.result,values:values.result});tx.onerror=()=>reject(tx.error)});result[name][store]={count:rows.keys.length,sha256:await hash(new TextEncoder().encode(JSON.stringify(await normalize(rows))))}}db.close();
 }return result;
})()`);
let script,reviewActivated=false;
try{
 await send('Page.enable');await send('Runtime.enable');
 await wait(`location.pathname==='/licenses/webm-duration-mit.txt'&&!!document.body?.textContent`);
 assert.equal(await evaluate('location.pathname'),'/licenses/webm-duration-mit.txt','Begin at the inert storage-check asset');
 const before=await originalSnapshot();
 await writeFile(folder+'/original-store-baseline.json',JSON.stringify(before,null,2)+'\n');
 script=(await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.search.includes('review=beta614')){window.__SPINO_DISABLE_TOUR=true;const open=IDBFactory.prototype.open;window.__reviewOriginalIDBOpen=open;IDBFactory.prototype.open=function(name,...args){return open.call(this,${JSON.stringify(prefix)}+name,...args)};const values=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key),clear:()=>values.clear()}})}`})).identifier;
 await send('Page.navigate',{url:'https://localhost/?review=beta614'});reviewActivated=true;await wait(`document.querySelector('.cp-today')`);
 const fixture=emptyData();fixture.preferences.language='en';fixture.preferences.theme='light';
 const seed=async (hand,number)=>{
  fixture.active=beginSession({title:'Synthetic Hanon static-frame review',context:'piano',blocks:[block('warmup',{target:'hanon-'+number,exercises:['hanon-'+number,'hanon-'+(number===1?2:1)],minutes:3,figures:'2',hand,presentation:'page'})]});
  await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve()}}})`);
  const origin=await evaluate('performance.timeOrigin');await send('Page.reload');await wait(`performance.timeOrigin!==${origin}`);await wait(`document.querySelector('.cp-today')`);
  await evaluate(`document.querySelector('[data-action=resume-session]').click()`);await wait(`document.querySelector('[data-action=warmup-guide]')`);
  await evaluate(`document.querySelector('[data-action=warmup-guide]').click()`);await wait(`document.querySelector('#cp-dialog [data-hanon-animation]')?.dataset.ready==='true'`);
 };
 const selector='#cp-dialog [data-hanon-animation]';
 const playback=[];
 for(const number of exerciseNumbers)for(const hand of ['both','left','right']){
  if(prior?.checks.some(check=>check.number===number&&check.hand===hand))continue;
  console.log('Preparing native No.'+number,hand);
  const started=Date.now();await seed(hand,number);
  const assets=number===1?'hanon-frames-v2':'hanon-frames-v3';
  const canonical=JSON.parse(await readFile(new URL('../../public/warmups/hanon-frames-v1/exercises/hanon-'+number+'.json',import.meta.url),'utf8'));
  const initial=await evaluate(`(()=>{const r=document.querySelector('${selector}');return {hand:r.dataset.hand,revision:r.dataset.assetRevision,canvas:[r.querySelector('canvas').width,r.querySelector('canvas').height],figures:document.querySelectorAll('#cp-dialog .wg-figure').length};})()`);
  assert.equal(initial.hand,hand);assert.match(initial.revision,number===1?/approved-blender-no1-static/:/complete-blender-hanon-2-10-static/);assert.deepEqual(initial.canvas,number===1?[1080,600]:[720,400]);assert.equal(initial.figures,hand==='both'?2:1);
  const packaged=await evaluate(`(async()=>{const responses=await Promise.all([fetch('/warmups/${assets}/exercises/hanon-${number}.json'),fetch('/warmups/${assets}/index.json')]);if(responses.some(r=>!r.ok))throw Error('Missing installed exercise/index');const [data,index]=await Promise.all(responses.map(r=>r.json()));return {events:data.events,frames:data.frames.length,both:data.both?.length,composition:data.composition,bakedKeys:index.bakedKeys};})()`);
  assert.deepEqual(packaged.events,canonical.events,'Installed canonical notes/fingering must match the score');assert.equal(packaged.frames,1440);assert.equal(packaged.both,1440);assert.equal(packaged.composition,'single-mode-sprite');assert.equal(packaged.bakedKeys,true);
  for(const frame of [3,39,91,111,675,735,799,1347,1439]){
   await evaluate(`document.querySelector('${selector}').hanonPlayer.seek(${frame})`);
   assert.equal(await evaluate(`Number(document.querySelector('${selector}').dataset.frame)`),frame);
   if([3,735,1439].includes(frame))await shot('hanon-'+number+'-'+hand+'-'+frame);
  }
  assert.equal(await evaluate(`document.querySelector('${selector}').dataset.pressed`),'false');
  await evaluate(`(async()=>{await document.querySelector('${selector}').hanonPlayer.seek(3);document.querySelector('#cp-dialog [data-ha-next]').click()})()`);
  await wait(`document.querySelector('${selector}').dataset.event==='1'`);
  const labels=await evaluate(`[...document.querySelectorAll('#cp-dialog .wg-figure li.is-playing b')].map(el=>el.textContent)`);
  const event=canonical.events[1];
  assert.deepEqual(labels,(hand==='both'?[event[3],event[1]]:hand==='left'?[event[1]]:[event[3]]).map(String));
  await evaluate(`(async()=>{const r=document.querySelector('${selector}');await r.hanonPlayer.seek(0);r.__events=new Set([Number(r.dataset.event)]);r.__observer=new MutationObserver(()=>r.__events.add(Number(r.dataset.event)));r.__observer.observe(r,{attributes:true,attributeFilter:['data-event']});document.querySelector('#cp-dialog [data-ha-play]').click()})()`);
  const samples=[];const playStarted=Date.now();
  for(let n=0;n<24;n++){
   await new Promise(resolve=>setTimeout(resolve,5000));
   const state=await evaluate(`(()=>{const r=document.querySelector('${selector}');return {frame:Number(r.dataset.frame),event:Number(r.dataset.event),playing:r.dataset.playing};})()`);samples.push(state);console.log('Native No.'+number,hand,state.frame);
   if(state.frame===1439)break;
  }
  assert.equal(samples.at(-1).frame,1439);assert.equal(samples.at(-1).playing,'false');assert.ok(samples.some(s=>s.event>=56&&s.event<112));
  const visited=await evaluate(`(()=>{const r=document.querySelector('${selector}');r.__observer.disconnect();return [...r.__events].sort((a,b)=>a-b)})()`);assert.deepEqual(visited,Array.from({length:113},(_,i)=>i),'Every canonical note must appear during actual playback');
  playback.push({number,hand,...initial,samples,visitedEvents:visited,playbackMilliseconds:Date.now()-playStarted,includingDecodeMilliseconds:Date.now()-started});
  // Switch asset banks in the same modal to catch stale index/image cache errors.
  const alternate=number===1?2:1;
  await evaluate(`window.__reviewPreviousHanonRoot=document.querySelector('${selector}');document.querySelector('#cp-dialog [data-warmup-step="1"]').click()`);await wait(`document.querySelector('#cp-dialog .cp-warmup-guide')?.dataset.exercise==='hanon-${alternate}'&&document.querySelector('${selector}')?.dataset.ready==='true'`);
  assert.equal(await evaluate('window.__reviewPreviousHanonRoot.hanonPlayer===undefined'),true,'Switching exercises must dispose the old controller');
  await evaluate(`document.querySelector('${selector}').hanonPlayer.seek(735)`);
  const alternateState=await evaluate(`({frame:document.querySelector('${selector}').dataset.frame,poster:document.querySelector('#cp-dialog .ha-poster img').getAttribute('src')})`);assert.equal(alternateState.frame,'735');assert.ok(alternateState.poster.includes(alternate===1?'hanon-frames-v2':expanded?'hanon-frames-v3':'hanon-frames-v1'));
  await evaluate(`document.querySelector('#cp-dialog [data-action=close-dialog]').click()`);await wait(`!document.querySelector('#cp-dialog').open`);
  checks.push({number,hand,initial,nextNoteLabels:labels,alternate:alternateState});
  await writeFile(folder+'/completed-checks.json',JSON.stringify({checks,playback,priorCheckpoint:resumePath||null},null,2)+'\n');
 }
 await writeFile(folder+'/synthetic-fixture.json',JSON.stringify(fixture,null,2));
 const after=await originalSnapshot();assert.deepEqual(after,before,'Original logical notebooks and assets must remain unchanged');
 await send('Page.navigate',{url:'https://localhost/licenses/webm-duration-mit.txt'});await wait(`location.pathname==='/licenses/webm-duration-mit.txt'`);
 const foreground=run(['shell','dumpsys','activity','activities']).split('\n').filter(line=>line.includes('topResumedActivity'));assert.ok(foreground.some(line=>line.includes(pkg+'/com.miguecoll.spino.MainActivity')));assert.deepEqual(errors,[]);
 const allChecks=[...(prior?.checks||[]),...checks];
 assert.equal(allChecks.length,exerciseNumbers.length*3);
 await writeFile(folder+'/native-verification.json',JSON.stringify({date:new Date().toISOString(),version:installedVersion,build:installedBuild,exerciseNumbers,kind:'Installed Android emulator WebView; actual app modal; disposable namespaced notebooks; not physical-device acceptance',screenshotMethod:'Installed WebView Page.captureScreenshot; prior run used Android OS screencap',storagePrefix:prefix,originalStoresBefore:before,originalStoresAfter:after,originalStoresUnchanged:true,checks:allChecks,playback,priorCheckpoint:prior?{path:resumePath,evidence:prior}:null,foreground,runtimeErrors:errors},null,2));
 console.log('Complete native playback for Hanon '+exerciseNumbers.join(',')+' in all three modes, cross-bank switching, original notebook retention and foreground pass.');
}catch(error){
 await writeFile(folder+'/failure.json',JSON.stringify({message:String(error),checks,runtimeErrors:errors,screen:await evaluate(`document.body.innerText.slice(-3000)`).catch(()=>null)},null,2));await shot('failed-state').catch(()=>{});throw error;
}finally{
 if(reviewActivated)await send('Page.navigate',{url:'https://localhost/licenses/webm-duration-mit.txt'}).catch(()=>{});
 if(script)await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script}).catch(()=>{});
 ws.close();run(['forward','--remove','tcp:'+port]);
}
