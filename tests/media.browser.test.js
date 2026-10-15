import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {emptyData,block,beginSession} from '../src/companion/model.js';
const fixture=emptyData();fixture.preferences.language='en';fixture.preferences.theme='light';fixture.preferences.warmup={enabled:false,minutes:2,exercise:'hanon-1'};
fixture.works=[{id:'media-work-a',title:'Synthetic étude',composer:'Test composer',stage:'En estudio',notes:'Disposable review fixture',passage:'Bars 1–8',bpm:60,target:null,tags:[],favorite:false},{id:'media-work-b',title:'Synthetic second piece',composer:'Test composer',stage:'En estudio',notes:'',passage:'',bpm:60,target:null,tags:[],favorite:false}];
fixture.active=beginSession({title:'Synthetic repertoire practice',context:'piano',blocks:[block('repertoire',{workId:'media-work-a',target:null})]});
const until = expression => `new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{try{if(${expression}){clearInterval(t);resolve(true);}}catch{}if(++n>500){clearInterval(t);reject(Error('Timed out: '+${JSON.stringify(expression)}));}},20);})`;
test('local audio/video capture, playback, restart, quota retry, device isolation and notebook restore',async t=>{
 let closePageSend; t.after(async()=>{if(closePageSend){await closePageSend('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});await closePageSend('Page.close').catch(()=>{});}});
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});
 const folder=process.env.SPINO_MEDIA_EVIDENCE || 'artifacts/review/multimedia/'+new Date().toISOString().replaceAll(':','-');await mkdir(folder,{recursive:true});const frames=[];
 const capture=async(state,theme,name,width,height)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);const file=`${theme}-${state}-${name}.png`,shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({file,width,height,theme,state});};
 const layouts=[['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768]];
 await send('Page.navigate',{url});await evaluate(until("document.querySelector('.cp-today')"));
 await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};})`);
 closePageSend=send;
 await send('Page.navigate',{url});await evaluate(until("document.querySelector('.cp-today')"));
 const click=selector=>send('Runtime.evaluate',{expression:`document.querySelector(${JSON.stringify(selector)}).click()`,userGesture:true,awaitPromise:true});
 const setupStreams=()=>evaluate(`window.captureTracks=[];window.denyCapture=false;Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async constraints=>{if(window.denyCapture)throw new DOMException('Denied','NotAllowedError');const context=new AudioContext(),oscillator=context.createOscillator(),destination=context.createMediaStreamDestination();oscillator.connect(destination);oscillator.start();await context.resume();const tracks=[...destination.stream.getAudioTracks()];if(constraints.video){const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d');ctx.fillStyle='#174da6';ctx.fillRect(0,0,320,180);ctx.fillStyle='#fff';ctx.font='20px sans-serif';ctx.fillText('Synthetic practice',30,90);tracks.push(...canvas.captureStream(10).getVideoTracks());}window.captureTracks.push(...tracks);return new MediaStream(tracks);}});`);
 await setupStreams();
 await click('[data-action=resume-session]');await evaluate(until("document.querySelector('.cp-session [data-action=record-work]')"));
 await click('.cp-session [data-action=record-work]');
 for(const [name,width,height] of layouts)await capture('choose','light',name,width,height);
 await evaluate(`window.denyCapture=true`);await click('[data-media=audio]');await evaluate(until("document.querySelector('#cp-media-capture [role=alert]')?.textContent.includes('denied')"));
 assert.equal(await evaluate(`document.querySelectorAll('#cp-media-capture [data-media=audio]').length`),1);
 await evaluate(`window.denyCapture=false;window.originalCapture=navigator.mediaDevices.getUserMedia;Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async constraints=>{const stream=await originalCapture(constraints);window.pendingCaptureStream=stream;await new Promise(resolve=>window.resolveCapturePermission=resolve);return stream;}});`);
 // Cancel both before permission resolves and after acquisition while waiting for foreground.
 for(const acquiredWhileHidden of [false,true]){
  await click('[data-media=audio]');await evaluate(until('!!window.resolveCapturePermission'));
  if(acquiredWhileHidden){await evaluate(`Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));resolveCapturePermission();resolveCapturePermission=null;`);await evaluate(`new Promise(resolve=>requestAnimationFrame(resolve))`);}
  await click('[data-media=cancel-request]');
  if(!acquiredWhileHidden)await evaluate(`resolveCapturePermission();resolveCapturePermission=null;`);
  await evaluate(until("pendingCaptureStream.getTracks().every(t=>t.readyState==='ended')"));
  assert.equal(await evaluate(`!!document.querySelector('[data-media-clock]')`),false);
  if(acquiredWhileHidden)await evaluate(`Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));`);
 }
 await evaluate(`Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:originalCapture})`);
 await click('[data-media=audio]');await evaluate(until("document.querySelector('[data-media-clock]')?.textContent==='0:02'"));
 await click('[data-media=stop]');await evaluate(until("document.querySelector('#media-title')&&!document.querySelector('[data-media=save]').disabled"));
 assert.equal(await evaluate(`captureTracks.every(t=>t.readyState==='ended')`),true);
 // Force a failed final write, keeping the automatically stored draft and preview.
 await evaluate(`window.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...args){if(this.name==='recordings'&&value.draft===false)throw new DOMException('Synthetic quota failure','QuotaExceededError');return originalPut.call(this,value,...args);};document.querySelector('#media-title').value='Audio progress take';`);
 await click('[data-media=save]');await evaluate(until("document.querySelector('[data-media-error]')?.textContent.includes('Could not save')"));
 assert.equal(await evaluate(`document.querySelector('#media-title').value`),'Audio progress take');
 await evaluate(`IDBObjectStore.prototype.put=originalPut`);await click('[data-media=save]');await evaluate(until("document.querySelector('#cp-media-capture').hidden"));
 await click('.cp-nav [data-action=piano]');await click('[data-action=multimedia]');await evaluate(until("document.querySelectorAll('.cp-media-list article').length===1"));
 assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),1);
 await click('[data-action=media-play]');await evaluate(until("document.querySelector('#cp-media-capture audio')?.readyState>=1"));
 assert.ok(await evaluate(`document.querySelector('#cp-media-capture audio').duration>0`));await click('[data-media=close]');
 // Video entry from Repertoire, using the same piece and the active session link.
 await click('[data-action=work-detail][data-id=media-work-a]');await click('[data-action=record-work]');await click('[data-media=video]');await evaluate(until("document.querySelector('[data-media-clock]')?.textContent==='0:02'"));
 for(const [name,width,height] of layouts)await capture('recording','light',name,width,height);
 // Controls stay usable in the score viewers' modal top layer.
 await evaluate(`window.syntheticScore=document.createElement('dialog');syntheticScore.className='synthetic-score';document.body.append(syntheticScore);syntheticScore.showModal();`);
 await evaluate(until("document.querySelector('.synthetic-score #cp-media-capture')"));
 await click('[data-media=minimize]');assert.equal(await evaluate(`getComputedStyle(document.querySelector('.cp-media-live')).display`),'none');
 await click('[data-media=stop]');await evaluate(until("document.querySelector('#media-title')&&!document.querySelector('[data-media=save]').disabled"));
 await evaluate(`syntheticScore.close();syntheticScore.remove();`);await evaluate(until("document.body===document.querySelector('#cp-media-capture').parentElement"));
 await evaluate(`document.querySelector('#media-title').value='Video progress take'`);await click('[data-media=save]');await evaluate(until("document.querySelector('#cp-media-capture').hidden"));
 await click('[data-action=work-media]');await evaluate(until("document.querySelectorAll('.cp-media-list article').length===2"));assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),2);
 await click('[data-action=media-play]');await evaluate(until("document.querySelector('#cp-media-capture video')?.readyState>=1"));assert.ok(await evaluate(`document.querySelector('#cp-media-capture video').videoWidth>0`));await click('[data-media=close]');
 // Separate installations, missing blobs and metadata from other devices never appear.
 const source=await readFile('src/companion/media-store.js','utf8');
 const storage=await evaluate(`(async()=>{const {openMediaStore}=await import(URL.createObjectURL(new Blob([${JSON.stringify(source)}],{type:'text/javascript'})));const a=await openMediaStore(),before=await a.index(),a2=await openMediaStore(),b=await openMediaStore('synthetic-other-device');const first=await a.get(before[0].id);await new Promise((resolve,reject)=>{const r=indexedDB.open('spino-local-media');r.onsuccess=()=>{const tx=r.result.transaction('recordings','readwrite'),s=tx.objectStore('recordings');s.put({...first,id:'foreign-take',installation:b.installation});s.put({...first,id:'missing-file',blob:null});tx.oncomplete=()=>{r.result.close();resolve();};tx.onerror=()=>reject(tx.error);};});const result={same:a.installation===a2.installation,different:a.installation!==b.installation,local:(await a.index()).length,other:(await b.index()).length,foreign:await a.get('foreign-take'),missing:await a.get('missing-file'),bytes:before.map(r=>r.bytes),session:first.sessionId};a.close();a2.close();b.close();return result;})()`);
 assert.equal(storage.same,true);assert.equal(storage.different,true);assert.equal(storage.local,2);assert.equal(storage.other,0);assert.equal(storage.foreign,null);assert.equal(storage.missing,null);assert.ok(storage.bytes.every(n=>n>0));assert.equal(storage.session,fixture.active.id);
 // A normal notebook replacement does not touch the separate local recording database.
 await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const tx=r.result.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${JSON.stringify({...fixture,active:null})},'current');tx.objectStore('assets').clear();tx.oncomplete=()=>{r.result.close();resolve();};};})`);
 await send('Page.navigate',{url});await evaluate(until("document.querySelector('.cp-today')"));await click('.cp-nav [data-action=piano]');await click('[data-action=multimedia]');await evaluate(until("document.querySelectorAll('.cp-media-list article').length===2"));
 assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),2);
 await evaluate(`document.querySelector('#media-type').value='audio';document.querySelector('#media-type').dispatchEvent(new Event('change',{bubbles:true}));`);assert.equal(await evaluate(`document.querySelectorAll('.cp-media-list article').length`),1);
 await evaluate(`document.querySelector('#media-type').value='';document.querySelector('#media-type').dispatchEvent(new Event('change',{bubbles:true}));`);
 // Dated responsive evidence from synthetic data only.
 await writeFile(folder+'/notebook.fixture.json',JSON.stringify(fixture,null,2));
 for(const theme of ['light','dark'])for(const [name,width,height] of layouts){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
  for(const state of ['library','preview']){
   if(state==='preview'){await click('[data-action=media-play]');await evaluate(until("document.querySelector('#media-title')"));}
   assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth+1`),false);
   if(state==='preview')assert.ok(await evaluate(`(()=>{const r=document.querySelector('#cp-media-capture').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;})()`));
   const file=`${theme}-${state}-${name}.png`,shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({file,width,height,theme,state});if(state==='preview')await click('[data-media=close]');
  }
 }
 await writeFile(folder+'/capture.json',JSON.stringify({date:'2026-10-15',surface:'Responsive Chromium browser; synthetic streams, not native-device camera/microphone acceptance',sourceHashes:Object.fromEntries(await Promise.all(['media-store.js','media-view.js','media.css','app.js','score-controls.js','session-view.js'].map(async f=>[f,createHash('sha256').update(await readFile('src/companion/'+f)).digest('hex')]))),frames,storage,runtimeErrors:errors},null,2));
 // Changing pieces must stop the old take without changing its piece link.
 await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const tx=r.result.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{r.result.close();resolve();};};})`);
 await send('Page.reload');await evaluate(until("document.querySelector('.cp-today')"));await setupStreams();
 await click('[data-action=resume-session]');await click('.cp-session [data-action=record-work]');await click('[data-media=audio]');await evaluate(until("document.querySelector('[data-media-clock]')?.textContent==='0:01'"));
 await click('[data-action=session-change-work]');await click('#cp-dialog [data-action=session-pick-work][data-id=media-work-b]');
 await evaluate(until("document.querySelector('#media-title')&&!document.querySelector('[data-media=save]').disabled"));
 assert.equal(await evaluate(`document.querySelector('#cp-media-capture header b').textContent`),'Synthetic étude');
 assert.equal(await evaluate(`captureTracks.every(t=>t.readyState==='ended')`),true);
 await click('[data-media=delete]');await evaluate(until("document.querySelector('#cp-media-capture').hidden"));
 // Backgrounding stops capture, persists its pending draft and releases every track.
 await click('.cp-session [data-action=record-work]');await click('[data-media=audio]');await evaluate(until("document.querySelector('[data-media-clock]')?.textContent==='0:01'"));
 await evaluate(`Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});`);
 await evaluate(until("document.querySelector('#media-title')&&!document.querySelector('[data-media=save]').disabled"));
 assert.ok(await evaluate(`document.querySelector('#cp-media-capture').textContent.includes('background')`));assert.equal(await evaluate(`captureTracks.every(t=>t.readyState==='ended')`),true);
 const draft=await evaluate(`new Promise(resolve=>{const r=indexedDB.open('spino-local-media');r.onsuccess=()=>{const q=r.result.transaction('recordings').objectStore('recordings').getAll();q.onsuccess=()=>{resolve(q.result.filter(r=>r.draft).map(r=>({id:r.id,workId:r.workId,bytes:r.blob.size})));r.result.close();};};})`);
 assert.equal(draft.length,1);assert.equal(draft[0].workId,'media-work-b');assert.ok(draft[0].bytes>0);
 await click('[data-media=save]');await evaluate(until("document.querySelector('#cp-media-capture').hidden"));
 assert.deepEqual(errors,[]);
});
