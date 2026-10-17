// Replacement-install and verify musical rhythm/media navigation using disposable namespaced storage.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const releaseVersion=JSON.parse(await readFile('package.json','utf8')).version;
const releaseBuild=Number((await readFile('android/app/build.gradle','utf8')).match(/versionCode\s+(\d+)/)[1]);
const notebookReview=process.argv.includes('--notebook');
const folder=process.argv[2];assert.ok(folder,'Pass a fresh evidence directory');await mkdir(folder,{recursive:true});
const adb='/Users/migue/Library/Android/sdk/platform-tools/adb',pkg='com.miguecoll.spino.beta',apk='android/app/build/outputs/apk/debug/app-debug.apk';
const run=args=>execFileSync(adb,args,{encoding:'utf8',maxBuffer:20e6,timeout:args[0]==='install'?60000:30000}).trim();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fileHashes=()=>{let names;try{names=run(['shell','run-as',pkg,'find','app_webview/Default/IndexedDB','-type','f']);}catch(error){if(String(error.stderr||'').includes('No such file or directory'))return {};throw error;}
  return Object.fromEntries(names.split('\n').filter(Boolean).sort().map(path=>[path,run(['shell','run-as',pkg,'sha256sum',path]).split(/\s/)[0]]));};
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
const originalRotation={auto:run(['shell','settings','get','system','accelerometer_rotation']),rotation:run(['shell','settings','get','system','user_rotation'])};
const ws=new WebSocket(pages[0].webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let seq=0;const pending=new Map(),errors=[];
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(!m.id)return;const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value;};
try{
  await send('Page.enable');await send('Runtime.enable');let ready=false;for(let i=0;i<100;i++){if(await evaluate(`location.pathname==='/licenses/webm-duration-mit.txt'&&!!document.body?.textContent`)){ready=true;break;}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,'Static storage-check asset did not load');
  const location=await evaluate(`location.pathname`);assert.equal(location,'/licenses/webm-duration-mit.txt');
  // IndexedDB shares LevelDB logs across database names: compare logical original stores,
  // and immutable blob files, rather than expecting log bytes to survive synthetic writes.
  const notebookSnapshot=()=>evaluate(`(async()=>{
    const normalize=async value=>{if(value instanceof Blob)return {blobType:value.type,blobSize:value.size,blobSHA256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await value.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('')};if(Array.isArray(value))return Promise.all(value.map(normalize));if(value&&typeof value==='object'){const out={};for(const key of Object.keys(value).sort())out[key]=await normalize(value[key]);return out;}return value;};
    const result={};for(const {name} of (await indexedDB.databases()).filter(d=>!d.name.startsWith('spino-drive-profile-')).sort((a,b)=>a.name.localeCompare(b.name))){const db=await new Promise((resolve,reject)=>{const r=(window.__reviewOriginalIDBOpen||IDBFactory.prototype.open).call(indexedDB,name);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});result[name]={};for(const store of db.objectStoreNames){const rows=await new Promise((resolve,reject)=>{const tx=db.transaction(store),os=tx.objectStore(store),k=os.getAllKeys(),v=os.getAll();tx.oncomplete=()=>resolve({keys:k.result,values:v.result});tx.onerror=()=>reject(tx.error);});const text=JSON.stringify(await normalize(rows));result[name][store]={count:rows.keys.length,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,'0')).join('')};}db.close();}return result;
  })()`);
  const originalStoresBefore=await notebookSnapshot();
  // Exercise the real Android platform predicate and Profile action with disposable storage.
  const prefix='spino-drive-profile-'+randomUUID()+'-';
  const script=(await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.search.includes('review=drive-profile')){window.__SPINO_DISABLE_TOUR=true;const open=IDBFactory.prototype.open;window.__reviewOriginalIDBOpen=open;IDBFactory.prototype.open=function(name,...args){return open.call(this,${JSON.stringify(prefix)}+name,...args);};const storage=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),clear:()=>storage.clear()}});}`})).identifier;
  const wait=async expression=>{for(let i=0;i<180;i++){try{if(await evaluate(expression))return;}catch(error){if(!/context/i.test(error.message))throw error;}await new Promise(r=>setTimeout(r,100));}throw Error('Timeout: '+expression);};
  await send('Page.navigate',{url:'https://localhost/?review=drive-profile'});
  await wait(`location.search.includes('review=drive-profile')&&!!document.querySelector('.cp-profile-nav')`);
  await new Promise(r=>setTimeout(r,1500));
  assert.equal(await evaluate(`globalThis.__SPINO_DISABLE_TOUR`),true,'Disposable storage script must be active');
  assert.ok(await evaluate(`indexedDB.databases().then(dbs=>dbs.some(d=>d.name.startsWith(${JSON.stringify(prefix)})))`),'Synthetic notebook must use its own database');
  const fixture=JSON.parse(await readFile('docs/quality-review/captures/progress/2026-10-16-beta15-rhythm/fixture.json','utf8'));
  fixture.works.push({...fixture.works[0],id:'other',title:'Synthetic other piece',onStand:false});
  await writeFile(folder+'/fixture.json',JSON.stringify(fixture,null,2));
  const records=JSON.parse(await readFile('docs/quality-review/captures/progress/2026-10-16-beta15-rhythm/recordings.json','utf8'));
  await evaluate(`new Promise((resolve,reject)=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}})`);
  await evaluate(`new Promise((resolve,reject)=>{const q=indexedDB.open('spino-local-media');q.onsuccess=()=>{const db=q.result,tx=db.transaction(['meta','recordings'],'readwrite');tx.objectStore('meta').get('installation').onsuccess=e=>{for(const r of ${JSON.stringify(records)})tx.objectStore('recordings').put({...r,installation:e.target.result,blob:new Blob(['synthetic calendar metadata fixture'],{type:r.kind+'/webm'})})};tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}})`);
  await send('Page.reload');await new Promise(r=>setTimeout(r,1200));await wait(`!!document.querySelector('.cp-today')`);
  await evaluate(`document.querySelector('.cp-nav [data-action=progress]').click()`);await wait(`!!document.querySelector('.cp-progress-highlights')`);await evaluate(`document.querySelector('.cp-progress-highlights').scrollIntoView({block:'center'})`);
  await wait(`!!document.querySelector('.cp-recordings-total')`);
  assert.equal(await evaluate(`document.querySelector('.cp-recordings-total').textContent`),'4');
  const shot=async name=>{await new Promise(r=>setTimeout(r,200));await writeFile(folder+'/'+name+'.png',execFileSync(adb,['exec-out','screencap','-p'],{maxBuffer:20e6}));};
  await shot('native-progress');
  await evaluate(`document.querySelector('[data-action=progress-streak]').click()`);await wait(`document.querySelector('#cp-dialog').open`);await shot('native-streak');
  run(['shell','input','keyevent','KEYCODE_BACK']);await wait(`!document.querySelector('#cp-dialog').open`);
  await evaluate(`document.querySelector('[data-action=progress-media-week]').click()`);await wait(`!!document.querySelector('.cp-media')`);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-media .cp-activity-day').length`),7);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-media select,.cp-media input,[data-action=media-calendar-mode],.cp-media-calendar-title small,.cp-media-calendar-title i').length`),0);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),4);await shot('native-media-week');
  await evaluate(`document.querySelector('[data-action=media-toggle-month]').click()`);
  assert.ok(await evaluate(`document.querySelectorAll('.cp-media .cp-activity-day').length>=28`));await shot('native-media-month');
  await evaluate(`document.querySelector('[data-action=media-toggle-month]').click();document.querySelector('[data-action=media-month][data-id="-1"]').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),0);
  await evaluate(`document.querySelector('[data-action=media-month][data-id="1"]').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),4);
  const geometry=await evaluate(`(()=>{const days=[...document.querySelectorAll('.cp-media .cp-activity-day')],header=document.querySelector('.cp-media .cp-activity-calendar header'),buttons=header.querySelectorAll('button'),left=buttons[0].getBoundingClientRect(),title=buttons[1].getBoundingClientRect(),right=buttons[2].getBoundingClientRect();return {emptyDatesNeutral:days.filter(d=>!d.classList.contains('has-recordings')).every(d=>getComputedStyle(d).backgroundColor==='rgba(0, 0, 0, 0)'),headerInline:left.right<=title.left+1&&title.right<=right.left+1,noOverflow:document.querySelector('.cp-page').scrollWidth<=document.querySelector('.cp-page').clientWidth+1,monthTitle:buttons[1].textContent}})()`);
  assert.equal(geometry.emptyDatesNeutral,true);assert.equal(geometry.headerInline,true);assert.equal(geometry.noOverflow,true);
  await evaluate(`document.querySelector('.cp-media-filters [data-action=media-filter-type][data-id=audio]').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),2);
  assert.equal(await evaluate(`document.querySelector('.cp-media-filters [data-id=audio]').getAttribute('aria-pressed')`),'true');await shot('native-audio-filter');
  await evaluate(`document.querySelector('.cp-media-filters [data-id=audio]').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),4);
  await evaluate(`document.querySelector('[data-action=media-filter-work]').click();document.querySelector('[data-action=media-select-work][data-id=a]').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),3);await shot('native-piece-filter');
  await evaluate(`document.querySelector('[data-action=record-media]').click()`);
  await wait(`!!document.querySelector('.cp-media-studio[open] [data-media-picker]')`);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('[data-media-picker] [data-media-work]')].map(e=>e.dataset.mediaWork)`),['','a','b']);
  assert.equal(await evaluate(`document.querySelector('[data-media-work=a]').getAttribute('aria-pressed')`),'true');await shot('native-record-stand');
  const modes=await evaluate(`(()=>{const b=[...document.querySelectorAll('.cp-media-mode')].map(e=>e.getBoundingClientRect());return {equalWidth:Math.abs(b[0].width-b[1].width)<1,equalHeight:b[0].height===b[1].height,aligned:b[0].top===b[1].top,avatar:document.querySelector('.cp-app-header .cp-avatar')?.getBoundingClientRect().width}})()`);
  assert.equal(modes.equalWidth,true);assert.equal(modes.equalHeight,true);assert.equal(modes.aligned,true);
  await evaluate(`document.querySelector('[data-media=other-pieces]').click();const s=document.querySelector('[data-media-search]');s.value='Synthetic other';s.dispatchEvent(new Event('input',{bubbles:true}))`);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('[data-media-results] [data-media-work]')].map(e=>e.dataset.mediaWork)`),['other']);await shot('native-record-other');
  run(['shell','input','keyevent','KEYCODE_BACK']);await wait(`!!document.querySelector('[data-media-picker]')`);
  run(['shell','input','keyevent','KEYCODE_BACK']);await wait(`!document.querySelector('.cp-media-studio').open`);
  await evaluate(`document.querySelector('[data-action=media-filter-work]').click();document.querySelector('[data-action=media-select-work][data-id=""]').click()`);
  const nativeVideo=[];
  for(const [orientation,rotation] of [['portrait','0'],['landscape','1']]){
    run(['shell','settings','put','system','accelerometer_rotation','0']);run(['shell','settings','put','system','user_rotation',rotation]);
    await wait(orientation==='portrait'?`innerHeight>innerWidth`:`innerWidth>innerHeight`);
    await evaluate(`document.querySelector('[data-action=record-media]').click();document.querySelector('[data-media-work="${orientation==='portrait'?'a':''}"]').click();document.querySelector('[data-media=video]').click()`);
    await wait(`document.querySelector('[data-media=start-video]')&&document.querySelector('.cp-media-live')?.readyState>=2`);
    assert.equal(await evaluate(`!!document.querySelector('[data-media=stop]')`),false);
    if(orientation==='portrait'){
      const ids=await evaluate(`[...document.querySelectorAll('[data-media-camera] option')].map(e=>e.value)`);
      for(const id of ids){await evaluate(`(()=>{const s=document.querySelector('[data-media-camera]');s.value=${JSON.stringify(id)};s.dispatchEvent(new Event('change',{bubbles:true}))})()`);await wait(`!document.querySelector('[data-media-camera]').disabled&&document.querySelector('.cp-media-live')?.readyState>=2&&document.querySelector('.cp-media-live').srcObject.getVideoTracks()[0].getSettings().deviceId===${JSON.stringify(id)}`);}
    }

    const preview=await evaluate(`(()=>{const v=document.querySelector('.cp-media-live');return{width:v.videoWidth,height:v.videoHeight,cameras:[...document.querySelectorAll('[data-media-camera] option')].map(e=>e.textContent)}})()`);await shot('native-video-preview-'+orientation);
    await evaluate(`document.querySelector('[data-media=start-video]').click()`);await wait(`!!document.querySelector('[data-media-clock]')`);await new Promise(r=>setTimeout(r,1200));
    await evaluate(`document.querySelector('[data-media=pause-video]').click()`);const clock=await evaluate(`document.querySelector('[data-media-clock]').textContent`);await new Promise(r=>setTimeout(r,1100));assert.equal(await evaluate(`document.querySelector('[data-media-clock]').textContent`),clock);await shot('native-video-paused-'+orientation);
    await evaluate(`document.querySelector('[data-media=pause-video]').click()`);await new Promise(r=>setTimeout(r,350));await evaluate(`document.querySelector('[data-media=stop]').click()`);await wait(`document.querySelector('[data-media=save]')&&!document.querySelector('[data-media=save]').disabled&&document.querySelector('.cp-media-studio video')?.readyState>=1`);
    await wait(`document.querySelector('.cp-media-studio video')?.readyState>=2`);
    const encoded=await evaluate(`(()=>{const v=document.querySelector('.cp-media-studio video');return{width:v.videoWidth,height:v.videoHeight,duration:v.duration,title:document.querySelector('#media-title').value}})()`);assert.ok(encoded.width>0&&encoded.height>0&&Number.isFinite(encoded.duration));assert.equal(encoded.height>encoded.width,orientation==='portrait','Encoded orientation must follow device orientation at start');const overlayPixel=await evaluate(`(()=>{const v=document.querySelector('.cp-media-studio video'),c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const x=c.getContext('2d');x.drawImage(v,0,0);return [...x.getImageData(30,c.height-30,1,1).data]})()`);assert.ok(overlayPixel[0]+overlayPixel[1]+overlayPixel[2]<160,'Encoded caption frame retains dark contrast');await shot('native-video-review-'+orientation);
    nativeVideo.push({orientation,preview,encoded,overlayPixel,captionFrameEncoded:true,previewInitiallyNotRecording:true,pauseClockFrozen:true});
    await evaluate(`document.querySelector('[data-media=delete]').click()`);await wait(`!document.querySelector('.cp-media-studio').open`);
  }
  run(['shell','settings','put','system','user_rotation',originalRotation.rotation]);run(['shell','settings','put','system','accelerometer_rotation',originalRotation.auto]);
  const originalStoresAfter=await notebookSnapshot();assert.deepEqual(originalStoresAfter,originalStoresBefore);
  const after=fileHashes(),blobFiles=Object.keys(before).filter(path=>path.includes('.indexeddb.blob/'));
  assert.ok(blobFiles.every(path=>after[path]===before[path]),'Existing immutable media blobs must stay unchanged');
  const foreground=run(['shell','dumpsys','activity','activities']).split('\n').filter(line=>/mResumedActivity|topResumedActivity/.test(line)).join('\n');assert.match(foreground,/com\.miguecoll\.spino\.MainActivity/);
  await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:script});assert.deepEqual(errors,[]);
  await writeFile(folder+'/native.json',JSON.stringify({date:new Date().toISOString(),kind:'native-android-emulator',version:releaseVersion,build:releaseBuild,apkSha256:hash(await readFile(apk)),replacementInstall:install,foreground,indexedDBBefore:before,indexedDBAfter:after,originalStoresBefore,originalStoresAfter,originalLogicalStoreCount:Object.keys(originalStoresBefore).length,originalStoresUnchanged:true,retainedBlobFiles:blobFiles.length,privateBackup,privateBackupSHA256:hash(backupBytes),disposableStoragePrefix:prefix,physicalCaptureTested:false,emulatorCameraCaptureTested:true,nativeVideo,syntheticMediaMetadata:true,checks:{weeklyRecordingCount:true,musicalStreakDialog:true,hardwareBack:true,defaultWeek:true,headingExpandCollapse:true,noObsoleteCalendarControls:true,typeToggle:true,pieceFilter:true,standOnlyPicker:true,otherPiecesSearch:true,recordingBack:true,modeButtons:modes,previousNextWeek:true,periodLists:true,...geometry},errors},null,2));
  console.log('Native '+releaseVersion+' passes: replacement install, foreground, retained stores/blobs, media filters, stand-only recording picker, Other pieces search and aligned mode buttons.');
}finally{run(['shell','settings','put','system','user_rotation',originalRotation.rotation]);run(['shell','settings','put','system','accelerometer_rotation',originalRotation.auto]);ws.close();if(port)run(['forward','--remove','tcp:'+port]);}
