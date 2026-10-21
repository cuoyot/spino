// Inspect real canvas pixels and Android compositor screenshots after full playback acceptance.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {emptyData,beginSession,block} from '../../src/companion/model.js';

const folder=process.argv[2];if(!folder)throw Error('Pass a new native evidence folder');
const expanded=process.argv.includes('--expanded');
const exerciseNumbers=expanded?Array.from({length:10},(_,i)=>i+1):[1];
const prior=null,resumePath=null;
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
 const canvas=await evaluate(`(()=>{const c=document.querySelector('#cp-dialog [data-hanon-animation] canvas'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let min=255,max=0,opaque=0;for(let i=0;i<p.length;i+=4){min=Math.min(min,p[i],p[i+1],p[i+2]);max=Math.max(max,p[i],p[i+1],p[i+2]);if(p[i+3]===255)opaque++}return {png:c.toDataURL('image/png').split(',')[1],min,max,opaque,width:c.width,height:c.height}})()`);
 assert.ok(canvas.max-canvas.min>100&&canvas.opaque>canvas.width*canvas.height*.95,'Canvas must contain the actual opaque keyboard and hands');
 await writeFile(folder+'/'+name+'-canvas.png',Buffer.from(canvas.png,'base64'));delete canvas.png;
 let osScreenshot=false;
 if(name.includes('-both-735')||name.includes('7-right-735')){await new Promise(r=>setTimeout(r,300));await writeFile(folder+'/'+name+'-android.png',execFileSync(adb,['exec-out','screencap','-p'],{timeout:15000,maxBuffer:20e6}));osScreenshot=true;}
 return {...canvas,osScreenshot};
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
 for(const number of exerciseNumbers)for(const hand of (number===7?['both','right']:['both'])){
  console.log('Native compositor/canvas inspection',number,hand);await seed(hand,number);
  await evaluate(`document.querySelector('${selector}').hanonPlayer.seek(735)`);
  const pixels=await shot('hanon-'+number+'-'+hand+'-735');
  await evaluate(`document.querySelector('#cp-dialog [data-action=close-dialog]').click()`);await wait(`!document.querySelector('#cp-dialog').open`);
  checks.push({number,hand,pixels});
 }
 await writeFile(folder+'/synthetic-fixture.json',JSON.stringify(fixture,null,2));
 const after=await originalSnapshot();assert.deepEqual(after,before,'Original logical notebooks and assets must remain unchanged');
 await send('Page.navigate',{url:'https://localhost/licenses/webm-duration-mit.txt'});await wait(`location.pathname==='/licenses/webm-duration-mit.txt'`);
 const foreground=run(['shell','dumpsys','activity','activities']).split('\n').filter(line=>line.includes('topResumedActivity'));assert.ok(foreground.some(line=>line.includes(pkg+'/com.miguecoll.spino.MainActivity')));assert.deepEqual(errors,[]);
 const allChecks=[...(prior?.checks||[]),...checks];
 assert.equal(allChecks.length,exerciseNumbers.length+1);
 await writeFile(folder+'/native-verification.json',JSON.stringify({date:new Date().toISOString(),version:installedVersion,build:installedBuild,exerciseNumbers,kind:'Installed Android emulator WebView; actual app modal; disposable namespaced notebooks; not physical-device acceptance',screenshotMethod:'Android OS screencap plus exact installed canvas readback; no composite substitution',storagePrefix:prefix,originalStoresBefore:before,originalStoresAfter:after,originalStoresUnchanged:true,checks:allChecks,playback,priorCheckpoint:prior?{path:resumePath,evidence:prior}:null,foreground,runtimeErrors:errors},null,2));
 console.log('Native canvas/compositor evidence and logical notebook retention pass.');
}catch(error){
 await writeFile(folder+'/failure.json',JSON.stringify({message:String(error),checks,runtimeErrors:errors,screen:await evaluate(`document.body.innerText.slice(-3000)`).catch(()=>null)},null,2));await shot('failed-state').catch(()=>{});throw error;
}finally{
 if(reviewActivated)await send('Page.navigate',{url:'https://localhost/licenses/webm-duration-mit.txt'}).catch(()=>{});
 if(script)await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script}).catch(()=>{});
 ws.close();run(['forward','--remove','tcp:'+port]);
}
