import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {driveNotebookBootstrap} from '../scripts/review/drive-notebook-fixture.mjs';

const bytes=await readFile('tests/fixtures/media/bookends-portrait.webm');
const take={id:'synthetic-stuck-share',workId:'synthetic-work',title:'Synthetic saved video',workTitle:'Synthetic piece',createdAt:new Date().toISOString(),durationMs:3000,kind:'video',draft:false,base64:bytes.toString('base64')};
const waitFor=expression=>`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve()}else if(++n>700){clearInterval(timer);reject(Error('Missing '+${JSON.stringify(expression)}))}},20)})`;

test('Close and Android Back dismiss a saved viewer during a stalled share without navigating or losing the video',{timeout:45000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
 const wait=expression=>evaluate(waitFor(expression));
 const click=selector=>send('Runtime.evaluate',{expression:`document.querySelector(${JSON.stringify(selector)}).click()`,userGesture:true,awaitPromise:true});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:driveNotebookBootstrap({localMedia:take})+`
 delete window.CapacitorCustomPlatform;delete window.androidBridge;delete window.Capacitor;
 window.pendingShares=[];
 Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
 Object.defineProperty(navigator,'share',{configurable:true,value:()=>new Promise((resolve,reject)=>pendingShares.push({resolve,reject}))});
 `});
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-nav [data-action=piano]')`);
 await click('.cp-nav [data-action=piano]');await click('[data-action=multimedia]');await wait(`document.querySelector('[data-action=media-play]')`);
 const heading=await evaluate(`document.querySelector('.cp-app-header h1').textContent`);
 const open=async()=>{await click('[data-action=media-play]');await wait(`document.querySelector('#cp-media-capture video')?.readyState>=2`);};
 const share=async count=>{await click('[data-media=share]');await wait(`document.querySelector('[data-export-choice=original]')`);await click('[data-export-choice=original]');await wait(`pendingShares.length===${count}`);};
 const back=()=>evaluate(`(()=>{const event=new Event('spino:back',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;})()`);
 await open();await share(1);
 assert.equal(await evaluate(`document.querySelector('[data-media=close]').disabled`),false);
 assert.equal(await evaluate(`document.querySelector('[data-media=share]').disabled`),true);
 const folder=process.env.SPINO_SHARE_CLOSE_EVIDENCE,frames=[];
 if(folder){await mkdir(folder,{recursive:true});for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme='${theme}'`);
  await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  assert.equal(await evaluate(`(()=>{const b=document.querySelector('[data-media=close]'),r=b.getBoundingClientRect();return !b.disabled&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()`),true);
  const file=`${theme}-closable-share-${width}x${height}.png`;await writeFile(folder+'/'+file,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));frames.push(file);
 }}
 await click('[data-media=close]');await wait(`document.querySelector('#cp-media-capture').hidden`);
 assert.equal(await evaluate(`document.querySelector('.cp-app-header h1').textContent`),heading);
 await open();await share(2);assert.equal(await back(),true);await wait(`document.querySelector('#cp-media-capture').hidden`);
 assert.equal(await evaluate(`document.querySelector('.cp-app-header h1').textContent`),heading);
 await open();await share(3);await evaluate(`pendingShares[0].reject(Error('Late first callback'));pendingShares[1].resolve();`);
 await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(await evaluate(`document.querySelector('[data-media=share]').disabled`),true);
 assert.equal(await evaluate(`document.querySelector('[data-media-error]').textContent`),'');
 await click('[data-media=close]');await wait(`document.querySelector('#cp-media-capture').hidden`);
 await evaluate(`pendingShares[2].resolve()`);
 await open();assert.equal(await back(),true);await wait(`document.querySelector('#cp-media-capture').hidden`);
 const original=await evaluate(`new Promise(resolve=>{const r=indexedDB.open('spino-local-media',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('recordings').objectStore('recordings').get(${JSON.stringify(take.id)});q.onsuccess=async()=>{db.close();const r=q.result;resolve({id:r.id,title:r.title,draft:r.draft,hash:[...new Uint8Array(await crypto.subtle.digest('SHA-256',await r.blob.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join('')})}}})`);
 assert.deepEqual(original,{id:take.id,title:take.title,draft:false,hash:createHash('sha256').update(bytes).digest('hex')});assert.deepEqual(errors,[]);
 if(folder)await writeFile(folder+'/verification.json',JSON.stringify({kind:'Responsive browser and simulated Android Back; not native acceptance',frames,original,errors,checks:['Close stays enabled while OS share never resolves','Android Back consumes the floating saved viewer before route history','Repeated retry and late failure do not lock or mutate a later viewer','Original recording ID/title/draft status and SHA-256 retained']},null,2));
});

test('Back cancels a stalled native staging dialog promptly, then closes the viewer before route navigation',{timeout:30000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const wait=expression=>evaluate(waitFor(expression));
 const click=selector=>send('Runtime.evaluate',{expression:`document.querySelector(${JSON.stringify(selector)}).click()`,userGesture:true,awaitPromise:true});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:driveNotebookBootstrap({localMedia:take})+`
 const native=Capacitor.nativePromise;window.stagingCount=0;window.abortCount=0;window.nativeOpened=0;
 Capacitor.PluginHeaders.push({name:'MediaShare',methods:['begin','writeChunk','share','abort'].map(name=>({name,rtype:'promise'}))});
 Capacitor.nativePromise=async(plugin,method,args)=>{
 if(plugin!=='MediaShare')return native(plugin,method,args);
 if(method==='begin')return {token:'stalled-staging'};
 if(method==='writeChunk'){stagingCount++;await new Promise(resolve=>window.finishStaging=resolve);return {};}
 if(method==='abort'){abortCount++;await new Promise(()=>{});}
 if(method==='share'){nativeOpened++;return {launched:true};}
 };
 `});
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-nav [data-action=piano]')`);
 await click('.cp-nav [data-action=piano]');await click('[data-action=multimedia]');await wait(`document.querySelector('[data-action=media-play]')`);
 await click('[data-action=media-play]');await wait(`document.querySelector('[data-media=share]')`);
 await click('[data-media=share]');await wait(`document.querySelector('[data-export-choice=original]')`);await click('[data-export-choice=original]');await wait(`stagingCount===1`);
 await evaluate(`window.dispatchEvent(new Event('spino:back',{cancelable:true}))`);
 await wait(`!document.querySelector('[data-media-export][open]')&&!document.querySelector('[data-media=share]').disabled`);
 assert.equal(await evaluate(`document.querySelector('#cp-media-capture').hidden`),false);
 await evaluate(`window.dispatchEvent(new Event('spino:back',{cancelable:true}))`);await wait(`document.querySelector('#cp-media-capture').hidden`);
 await evaluate(`finishStaging()`);await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(await evaluate(`nativeOpened`),0);assert.equal(await evaluate(`abortCount>0`),true);assert.deepEqual(errors,[]);
});

test('Back retains an edited draft and stays on its review if the local write fails',{timeout:30000},async t=>{
 const draft={...take,id:'synthetic-back-draft',draft:true};
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const wait=expression=>evaluate(waitFor(expression));
 const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 await send('Page.addScriptToEvaluateOnNewDocument',{source:driveNotebookBootstrap({localMedia:draft})+';delete window.CapacitorCustomPlatform;delete window.androidBridge;delete window.Capacitor;'});
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-nav [data-action=piano]')`);
 await click('.cp-nav [data-action=piano]');await click('[data-action=multimedia]');await wait(`document.querySelector('[data-action=media-play]')`);await click('[data-action=media-play]');await wait(`document.querySelector('#media-title')`);
 const heading=await evaluate(`document.querySelector('.cp-app-header h1').textContent`);
 await evaluate(`document.querySelector('#media-title').value='Retained edited draft';window.originalDraftPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...args){if(this.name==='recordings'&&value.id==='synthetic-back-draft')throw new DOMException('Synthetic quota','QuotaExceededError');return originalDraftPut.call(this,value,...args)};window.dispatchEvent(new Event('spino:back',{cancelable:true}))`);
 await wait(`document.querySelector('[data-media-error]')?.textContent`);
 assert.equal(await evaluate(`document.querySelector('#cp-media-capture').hidden`),false);
 assert.equal(await evaluate(`document.querySelector('#media-title').value`),'Retained edited draft');
 assert.equal(await evaluate(`document.querySelector('.cp-app-header h1').textContent`),heading);
 await evaluate(`IDBObjectStore.prototype.put=originalDraftPut;window.dispatchEvent(new Event('spino:back',{cancelable:true}))`);await wait(`document.querySelector('#cp-media-capture').hidden`);
 const saved=await evaluate(`new Promise(resolve=>{const r=indexedDB.open('spino-local-media',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('recordings').objectStore('recordings').get('synthetic-back-draft');q.onsuccess=()=>{db.close();resolve({id:q.result.id,title:q.result.title,draft:q.result.draft,bytes:q.result.blob.size})}}})`);
 assert.deepEqual(saved,{id:draft.id,title:'Retained edited draft',draft:true,bytes:bytes.length});assert.deepEqual(errors,[]);
});
