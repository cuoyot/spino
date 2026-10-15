// Native smoke test: use only namespaced synthetic databases; never seed the installed notebook.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {emptyData} from '../../src/companion/model.js';
import {scorePDF} from '../../tests/pdf-fixture.js';
const folder=process.argv[2];assert.ok(folder,'Pass a fresh dated evidence directory');await mkdir(folder,{recursive:true});
const adb='/Users/migue/Library/Android/sdk/platform-tools/adb',pkg='com.miguecoll.spino.beta',apk='android/app/build/outputs/apk/debug/app-debug.apk';
const run=args=>execFileSync(adb,args,{encoding:'utf8',maxBuffer:20e6,timeout:15000}).trim(),hash=b=>createHash('sha256').update(b).digest('hex');
const files=()=>run(['shell','run-as',pkg,'find','app_webview/Default/IndexedDB','-type','f']).split('\n').filter(Boolean);
const fileHashes=()=>Object.fromEntries(files().map(file=>[file,run(['shell','run-as',pkg,'sha256sum',file]).split(/\s/)[0]]));
run(['shell','am','force-stop',pkg]);const before=fileHashes();
const install=run(['install','-r',apk]);assert.match(install,/Success/);const after=fileHashes();assert.deepEqual(after,before);
const apkArtifact='artifacts/review/stand-recording-2026-10-15/spino-6.1.0-beta.1-review.apk';await mkdir('artifacts/review/stand-recording-2026-10-15',{recursive:true});await copyFile(apk,apkArtifact);
const handoff={date:'2026-10-15',kind:'Native Android emulator; local review APK, same beta1 version; not published',apkArtifact,apkSha256:hash(await readFile(apk)),replacementInstall:install,indexedDBBefore:before,indexedDBAfter:after,retainedFiles:Object.keys(before).length};
await writeFile(folder+'/handoff.json',JSON.stringify(handoff,null,2));
run(['shell','input','keyevent','KEYCODE_WAKEUP']);run(['shell','wm','dismiss-keyguard']);
run(['shell','am','start','-n',pkg+'/com.miguecoll.spino.MainActivity']);
let pid;for(let n=0;n<40;n++){try{pid=run(['shell','pidof',pkg]);if(pid)break;}catch{}await new Promise(r=>setTimeout(r,250));}
const port=run(['forward','tcp:0','localabstract:webview_devtools_remote_'+pid]);let pages;
for(let n=0;n<40;n++){try{pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();if(pages[0]?.webSocketDebuggerUrl)break;}catch{}await new Promise(r=>setTimeout(r,250));}
const ws=new WebSocket(pages[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let seq=0;const pending=new Map(),errors=[];
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(!m.id)return;const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=async expression=>{for(let n=0;n<180;n++){try{if(await evaluate('Boolean('+expression+')'))return;}catch(error){if(!/context|Cannot find context/i.test(error.message))throw error;}await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+expression);};
const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const shot=async name=>writeFile(folder+'/'+name+'.png',execFileSync(adb,['exec-out','screencap','-p'],{maxBuffer:20e6}));
let isolatedScript;
try{
 await send('Page.enable');await send('Runtime.enable');await wait(`document.readyState==='complete'`);handoff.originalNotebookStartupErrors=[...errors];errors.length=0;
 handoff.foreground=run(['shell','dumpsys','activity','activities']).split('\n').filter(l=>/topResumedActivity|mResumedActivity/.test(l));assert.ok(handoff.foreground.some(l=>l.includes(pkg)));
 const prefix='spino-review-recording-'+folder.split('/').at(-1)+'-';
 isolatedScript=(await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.search.includes('review=recording-permissions')){window.__SPINO_DISABLE_TOUR=true;const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,...args){return open.call(this,${JSON.stringify(prefix)}+name,...args);};const storage=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),clear:()=>storage.clear()}});}`})).identifier;
 await send('Page.navigate',{url:'https://localhost/?review=recording-permissions'});await wait(`location.search.includes('review=recording-permissions')&&document.querySelector('.cp-today')`);
 const fixture=emptyData();fixture.preferences={...fixture.preferences,language:'en',theme:'light',warmup:{enabled:false,minutes:2,exercise:'hanon-1'}};fixture.works=[{id:'native-review-piece',title:'Synthetic native score',composer:'Review composer',stage:'En estudio',onStand:true,bpm:60,target:null,notes:'',passage:''}];
 const asset={id:'native-review-pdf',name:'Synthetic score.pdf',type:'application/pdf',base64:scorePDF(),annotations:{version:1,marks:[]}};
 await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.objectStore('assets').put(${JSON.stringify(asset)});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};})`);
 await evaluate(`window.__reviewBeforeReload=true`);await send('Page.reload');await wait(`!window.__reviewBeforeReload&&document.querySelector('.cp-today')`);
 await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=repertoire]').click();document.querySelector('.cp-practice-stand button').click();document.querySelector('#prepare-form').requestSubmit();`);
 await wait(`document.querySelector('.cp-session [data-action=record-work]')`);await shot('native-session-before-record');
 const takes=[];
 for(const kind of ['audio','video']){
  await click('.cp-session [data-action=record-work]');await wait(`document.querySelector('[data-media=${kind}]')`);await click('[data-media='+kind+']');
  // Read the actual Android permission UI and grant only the expected foreground capture request.
  for(let n=0;n<12;n++){
   if(await evaluate(`!!document.querySelector('[data-media-clock]')`))break;
   await new Promise(r=>setTimeout(r,500));if(await evaluate(`!!document.querySelector('[data-media-clock]')`))break;
   run(['shell','uiautomator','dump','/sdcard/spino-review-permissions.xml']);const xml=run(['shell','cat','/sdcard/spino-review-permissions.xml']);
   const node=xml.match(/<node[^>]*resource-id="[^"]*:id\/permission_allow_foreground_only_button"[^>]*>/)?.[0];
   if(node){await shot('native-'+kind+'-permission');const b=node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/).slice(1).map(Number);run(['shell','input','tap',String(Math.round((b[0]+b[2])/2)),String(Math.round((b[1]+b[3])/2))]);}
   const error=await evaluate(`document.querySelector('#cp-media-capture [role=alert]')?.textContent`);assert.ok(!error,error);
  }
  await wait(`document.querySelector('[data-media-clock]')`);
  await wait(`Number(document.querySelector('[data-media-clock]')?.textContent.split(':')[0])*60+Number(document.querySelector('[data-media-clock]')?.textContent.split(':')[1])>=2`);await shot('native-'+kind+'-recording');
  await click('[data-media=stop]');await wait(`document.querySelector('#media-title')&&!document.querySelector('[data-media=save]').disabled`);await shot('native-'+kind+'-review');
  const previewReady=await evaluate(`!!document.querySelector('#cp-media-capture '+${JSON.stringify(kind==='video'?'video':'audio')})`);
  await click('[data-media=save]');await wait(`document.querySelector('#cp-media-capture').hidden`);takes.push({kind,previewReady});
 }
 const recordings=await evaluate(`new Promise(resolve=>{const r=indexedDB.open('spino-local-media');r.onsuccess=()=>{const db=r.result,q=db.transaction('recordings').objectStore('recordings').getAll();q.onsuccess=()=>{resolve(q.result.map(r=>({kind:r.kind,workId:r.workId,bytes:r.blob.size,type:r.blob.type,draft:r.draft})));db.close();};};})`);assert.equal(recordings.length,2);assert.ok(recordings.every(r=>r.bytes>0&&!r.draft));
 await click('.cp-session [data-action=session-end]');await wait(`document.querySelector('#cp-dialog [data-action=discard-session]')`);await click('#cp-dialog [data-action=discard-session]');await click('#cp-confirm');await wait(`document.querySelector('.cp-today')`);
 await evaluate(`window.__reviewBeforeReload=true`);await send('Page.reload');await wait(`!window.__reviewBeforeReload&&document.querySelector('.cp-today')`);
 await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=repertoire]').click();document.querySelector('.cp-practice-stand button').click();`);
 await shot('native-preparation-handoff');
 await writeFile(folder+'/native-verification.json',JSON.stringify({...handoff,takes,recordings,errors,fixture,scope:'Packaged repertoire-session capture with actual emulator microphone/camera streams and Android runtime dialogs; isolated namespaced databases and in-memory localStorage. Physical-device acceptance remains open.'},null,2));
 console.log(JSON.stringify({recordings,foreground:handoff.foreground,retainedFiles:handoff.retainedFiles,errors}));
}finally{
 if(isolatedScript)await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:isolatedScript});
 ws.close();run(['forward','--remove','tcp:'+port]);run(['shell','am','start','-n',pkg+'/com.miguecoll.spino.MainActivity']);
 await writeFile(folder+'/handoff.json',JSON.stringify(handoff,null,2));
}
