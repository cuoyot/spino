// Replacement-install and exercise only the isolated Drive review, without authorizing Google.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
const folder=process.argv[2];assert.ok(folder,'Pass a fresh evidence directory');await mkdir(folder,{recursive:true});
const adb='/Users/migue/Library/Android/sdk/platform-tools/adb',pkg='com.miguecoll.spino.beta',apk='android/app/build/outputs/apk/debug/app-debug.apk';
const run=args=>execFileSync(adb,args,{encoding:'utf8',maxBuffer:20e6,timeout:30000}).trim();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fileHashes=()=>{let names;try{names=run(['shell','run-as',pkg,'find','app_webview/Default/IndexedDB','-type','f']);}catch{return {};}
  return Object.fromEntries(names.split('\n').filter(Boolean).sort().map(path=>[path,run(['shell','run-as',pkg,'sha256sum',path]).split(/\s/)[0]]));};
run(['shell','am','force-stop',pkg]);const before=fileHashes();
const install=run(['install','-r',apk]);assert.match(install,/Success/);const installed=fileHashes();assert.deepEqual(installed,before);
run(['shell','input','keyevent','KEYCODE_WAKEUP']);run(['shell','wm','dismiss-keyguard']);
run(['shell','am','start','-n',pkg+'/com.miguecoll.spino.MainActivity','--es','spinoReview','drive-media']);
let pages,port;for(let n=0;n<100;n++){
  try{const pid=run(['shell','pidof',pkg]);if(!port)port=run(['forward','tcp:0','localabstract:webview_devtools_remote_'+pid]);pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();if(pages.find(p=>p.webSocketDebuggerUrl))break;}catch{}
  await new Promise(r=>setTimeout(r,200));
}
assert.ok(pages?.[0]?.webSocketDebuggerUrl,'WebView did not become available');
const ws=new WebSocket(pages[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let seq=0;const pending=new Map(),errors=[];
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(!m.id)return;const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value;};
try{
  await send('Runtime.enable');let ready=false;for(let i=0;i<100;i++){if(await evaluate(`!!document.querySelector('#drive-review #connect')`)){ready=true;break;}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,'Isolated review did not load');
  const location=await evaluate(`location.pathname`);assert.equal(location,'/drive-media-review.html');
  const source=Buffer.from('SPino native synthetic stage check\n'),expected=hash(source),key=randomUUID();
  const staged=await evaluate(`Capacitor.nativePromise('DriveMedia','stageChunk',{key:${JSON.stringify(key)},offset:0,total:${source.length},base64:${JSON.stringify(source.toString('base64'))}})`);assert.equal(staged.sha256,expected);
  const invalid=await evaluate(`Capacitor.nativePromise('DriveMedia','stageChunk',{key:'invalid-offset',offset:1,total:5,base64:'YQ=='}).then(()=>false,e=>e.code)`);assert.equal(invalid,'STAGING');
  const protectedRequest=await evaluate(`Capacitor.nativePromise('DriveMedia','request',{accountId:'not-authorized',url:'https://www.googleapis.com/drive/v3/files'}).then(()=>false,e=>e.code)`);assert.equal(protectedRequest,'TRANSFER');
  const stateKey='poc1.native-smoke.book.'+key;
  await evaluate(`Capacitor.nativePromise('DriveMedia','writeState',{key:${JSON.stringify(stateKey)},value:{fileId:'synthetic-id',size:33}})`);
  const persisted=await evaluate(`Capacitor.nativePromise('DriveMedia','readState',{key:${JSON.stringify(stateKey)}})`);assert.equal(persisted.value.fileId,'synthetic-id');
  assert.deepEqual(errors,[]);
  const foreground=run(['shell','dumpsys','activity','activities']).split('\n').filter(line=>/mResumedActivity|topResumedActivity/.test(line)).join('\n');assert.match(foreground,/com\.miguecoll\.spino\.MainActivity/);
  await writeFile(folder+'/native-review.png',execFileSync(adb,['exec-out','screencap','-p'],{maxBuffer:20e6}));
  run(['shell','am','force-stop',pkg]);const after=fileHashes();assert.deepEqual(after,before);
  await writeFile(folder+'/native.json',JSON.stringify({date:new Date().toISOString(),kind:'native-android-emulator',googleAuthorizationTested:false,realDriveTransferTested:false,version:'6.1.0-beta.7',build:60,apkSha256:hash(await readFile(apk)),replacementInstall:install,location,foreground,indexedDBBefore:before,indexedDBAfter:after,retainedFiles:Object.keys(before).length,checks:{boundedStagingSHA256:staged.sha256,invalidOffsetRejected:invalid,unauthorizedRequestRejected:protectedRequest,nativeStateRoundTrip:true},errors},null,2));
  run(['shell','am','start','-n',pkg+'/com.miguecoll.spino.MainActivity','--es','spinoReview','drive-media']);
  console.log('Native review passes; '+Object.keys(before).length+' original IndexedDB files retained. Google consent/remote transfer remain untested.');
}finally{ws.close();if(port)run(['forward','--remove','tcp:'+port]);}
