// Replacement-install and verify event time controls with disposable namespaced storage.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {emptyData} from '../../src/companion/model.js';
const releaseVersion=JSON.parse(await readFile('package.json','utf8')).version;
const releaseBuild=Number((await readFile('android/app/build.gradle','utf8')).match(/versionCode\s+(\d+)/)[1]);
const folder=process.argv[2];assert.ok(folder,'Pass a fresh evidence directory');await mkdir(folder,{recursive:true});
const adb='/Users/migue/Library/Android/sdk/platform-tools/adb',pkg='com.miguecoll.spino.beta',apk='android/app/build/outputs/apk/debug/app-debug.apk';
const run=args=>execFileSync(adb,args,{encoding:'utf8',maxBuffer:20e6,timeout:args[0]==='install'?60000:30000}).trim();
const quote=value=>"'"+value.replaceAll("'","'\\''")+"'";
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fileHashes=only=>{let names;try{names=run(['shell','run-as',pkg,'find','app_webview/Default/IndexedDB','-type','f']);}catch(error){if(String(error.stderr||'').includes('No such file or directory'))return {};throw error;}
  return Object.fromEntries(names.split('\n').filter(path=>path&&(!only||only.includes(path))).sort().map(path=>[path,run(['shell','run-as',pkg,'sha256sum',path]).split(/\s/)[0]]));};
run(['shell','am','force-stop',pkg]);
// Preserve a private raw recovery archive before installation or opening WebView.
const backupDirectory=resolve('output/native-review-backups');await mkdir(backupDirectory,{recursive:true,mode:0o700});
const privateBackup=backupDirectory+'/'+pkg+'-'+randomUUID()+'.tar';
const backupBytes=execFileSync(adb,['exec-out','run-as',pkg,'tar','-cf','-','app_webview','files','shared_prefs'],{maxBuffer:512e6,timeout:30000});
await writeFile(privateBackup,backupBytes,{mode:0o600});
const before=fileHashes();
const install=run(['install','-r',apk]);assert.match(install,/Success/);const installed=fileHashes();assert.deepEqual(installed,before);
run(['shell','input','keyevent','KEYCODE_WAKEUP']);run(['shell','wm','dismiss-keyguard']);
run(['shell','am','start','-n',pkg+'/com.miguecoll.spino.MainActivity','--es','spinoReview','storage-check']);
let pages,port;for(let n=0;n<100;n++){
  try{const pid=run(['shell','pidof',pkg]);if(!port)port=run(['forward','tcp:0','localabstract:webview_devtools_remote_'+pid]);pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();if(pages.find(p=>p.webSocketDebuggerUrl))break;}catch{}
  await new Promise(r=>setTimeout(r,200));
}
assert.ok(pages?.[0]?.webSocketDebuggerUrl,'WebView did not become available');
const ws=new WebSocket(pages[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let seq=0;const pending=new Map(),errors=[];
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(!m.id)return;const p=pending.get(m.id);pending.delete(m.id);if(!p)return;m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('WebView did not respond: '+method));},45000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value;};
try{
  await send('Page.enable');await send('Runtime.enable');let ready=false;for(let i=0;i<100;i++){if(await evaluate(`location.pathname==='/licenses/webm-duration-mit.txt'&&!!document.body?.textContent`)){ready=true;break;}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,'Static storage-check asset did not load');
  const location=await evaluate(`location.pathname`);assert.equal(location,'/licenses/webm-duration-mit.txt');
  // IndexedDB shares LevelDB logs across database names: compare logical original stores,
  // and immutable blob files, rather than expecting log bytes to survive synthetic writes.
  const prefix='spino-release-languages-review-'+randomUUID()+'-';
  const notebookSnapshot=()=>evaluate(`(async()=>{
    const normalize=async value=>{if(value instanceof Blob)return {blobType:value.type,blobSize:value.size,blobSHA256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await value.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('')};if(Array.isArray(value))return Promise.all(value.map(normalize));if(value&&typeof value==='object'){const out={};for(const key of Object.keys(value).sort())out[key]=await normalize(value[key]);return out;}return value;};
    const result={};for(const {name} of (await indexedDB.databases()).filter(d=>!d.name.startsWith(${JSON.stringify(prefix)})).sort((a,b)=>a.name.localeCompare(b.name))){const db=await new Promise((resolve,reject)=>{const r=(window.__reviewOriginalIDBOpen||IDBFactory.prototype.open).call(indexedDB,name);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});result[name]={};for(const store of db.objectStoreNames){const rows=await new Promise((resolve,reject)=>{const tx=db.transaction(store),os=tx.objectStore(store),k=os.getAllKeys(),v=os.getAll();tx.oncomplete=()=>resolve({keys:k.result,values:v.result});tx.onerror=()=>reject(tx.error);});const text=JSON.stringify(await normalize(rows));result[name][store]={count:rows.keys.length,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,'0')).join('')};}db.close();}return result;
  })()`);
  const originalStoresBefore=await notebookSnapshot();
  await writeFile(folder+'/baseline.json',JSON.stringify({version:releaseVersion,build:releaseBuild,originalStoresBefore,privateBackup,privateBackupSHA256:hash(backupBytes)},null,2));
  const fixture=emptyData();fixture.preferences.language='en';fixture.preferences.theme='light';
  await writeFile(folder+'/fixture.json',JSON.stringify(fixture,null,2));
  const script=(await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.search.includes('review=release-languages')){window.__SPINO_DISABLE_TOUR=true;const open=IDBFactory.prototype.open;window.__reviewOriginalIDBOpen=open;IDBFactory.prototype.open=function(name,...args){return open.call(this,${JSON.stringify(prefix)}+name,...args)};const storage=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),clear:()=>storage.clear()}});}`})).identifier;
  const wait=async condition=>{for(let n=0;n<200;n++){try{if(await evaluate(condition))return;}catch(error){if(!/context/i.test(error.message))throw error;}await new Promise(r=>setTimeout(r,100));}throw Error('Timeout: '+condition);};
  const shot=async name=>{await writeFile(folder+'/'+name+'.png',execFileSync(adb,['exec-out','screencap','-p'],{maxBuffer:20e6}));};
  await send('Page.navigate',{url:'https://localhost/?review=release-languages'});await wait(`document.querySelector('.cp-today')`);
  for(const lang of ['de','hu']){
    await evaluate(`document.querySelector('.cp-profile-nav').click()`);
    await wait(`document.querySelector('[data-action=profile-edit]')`);
    await evaluate(`document.querySelector('[data-action=profile-edit]').click()`);
    await wait(`document.querySelector('#profile-identity-form')`);
    await evaluate(`{const f=document.querySelector('#profile-identity-form');f.elements.language.value='${lang}';f.requestSubmit()}`);
    await wait(`!document.querySelector('#cp-dialog').open`);
    await evaluate('window.__beforeLanguageReload=true');await send('Page.reload');await wait(`!window.__beforeLanguageReload && document.querySelector('.cp-profile-nav') && document.documentElement.lang==='${lang}' && window.__sr?.settings.lang==='${lang}'`);
    assert.equal(await evaluate('document.documentElement.lang'),lang);
    assert.equal(await evaluate('__sr.settings.lang'),lang);
    await evaluate(`document.querySelector('.cp-profile-nav').click()`);await wait(`document.querySelector('[data-action=about]')`);
    await shot(lang+'-profile');
    await evaluate(`document.querySelector('[data-action=about]').click()`);await wait(`document.querySelector('.cp-about')`);
    const text=await evaluate(`document.querySelector('.cp-about').innerText`);
    assert.ok(text.includes(releaseVersion));assert.doesNotMatch(text,/\bbeta\b|trial version|versión de prueba/i);
    await shot(lang+'-about');
    await evaluate(`document.querySelector('[data-action=close-dialog]').click()`);
  }
  const originalStoresAfter=await notebookSnapshot();assert.deepEqual(originalStoresAfter,originalStoresBefore);
  const blobFiles=Object.keys(before).filter(path=>path.includes('.indexeddb.blob/')),after=fileHashes(blobFiles);assert.ok(blobFiles.every(path=>after[path]===before[path]));
  const foreground=run(['shell','dumpsys','activity','activities']).split('\n').filter(line=>/mResumedActivity|topResumedActivity/.test(line)).join('\n');assert.match(foreground,/com\.miguecoll\.spino\.MainActivity/);await shot('native-final-foreground');
  await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script});assert.deepEqual(errors,[]);
  await writeFile(folder+'/native.json',JSON.stringify({date:new Date().toISOString(),kind:'native-android-emulator',version:releaseVersion,build:releaseBuild,apkSha256:hash(await readFile(apk)),replacementInstall:install,foreground,originalStoresBefore,originalStoresAfter,originalStoresUnchanged:true,retainedBlobFiles:blobFiles.length,privateBackup,privateBackupSHA256:hash(backupBytes),disposableStoragePrefix:prefix,languageChecks:{german:true,hungarian:true,readerLanguage:true,persistence:true,stableCopy:true},physicalDeviceAcceptance:false,errors},null,2));
  console.log('Native German/Hungarian selection, persistence, reader language, stable copy and notebook retention pass.');
}finally{ws.close();if(port)run(['forward','--remove','tcp:'+port]);}
