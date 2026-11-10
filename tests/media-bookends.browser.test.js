import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {openBrowser} from './browser.js';
import {driveNotebookBootstrap} from '../scripts/review/drive-notebook-fixture.mjs';

const bytes=await readFile('tests/fixtures/media/bookends-portrait.webm');
const fixture=draft=>({id:'synthetic-persistent-video',workId:'synthetic-work',title:'Take title',workTitle:'Synthetic piece',createdAt:new Date().toISOString(),durationMs:3000,kind:'video',draft,base64:bytes.toString('base64')});
const waitSource=expression=>`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve()}else if(++n>1800){clearInterval(timer);reject(Error('Missing '+${JSON.stringify(expression)}))}},20)})`;
const readCache=evaluate=>evaluate(`new Promise(resolve=>{const q=indexedDB.open('spino-local-media-prepared',1);q.onsuccess=()=>{const db=q.result,r=db.transaction('exports').objectStore('exports').getAll();r.onsuccess=async()=>{db.close();resolve(await Promise.all(r.result.map(async row=>({id:row.id,fileId:row.fileId,takeId:row.takeId,duration:row.durationMs,hash:[...new Uint8Array(await crypto.subtle.digest('SHA-256',await row.blob.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join('')}))))}}})`);
async function setup(t,draft=false){
 const browser=await openBrowser(t,{companion:true});const {send,evaluate,url}=browser;
 await send('Page.addScriptToEvaluateOnNewDocument',{source:driveNotebookBootstrap({localMedia:fixture(draft)})+`;
 delete window.CapacitorCustomPlatform;delete window.androidBridge;delete window.Capacitor;
 window.shareAttempts=0;window.encodeCount=0;
 const Recorder=window.MediaRecorder;window.MediaRecorder=new Proxy(Recorder,{construct(target,args){if(sessionStorage.getItem('deny-video-encoding'))throw Error('Unexpected video regeneration');encodeCount++;return Reflect.construct(target,args)}});
 Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
 Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{shareAttempts++;window.lastSharedFile=data.files[0];if(window.failNextShare){window.failNextShare=false;throw Error('Synthetic chooser failure')}}});
 `});
 const wait=expression=>evaluate(waitSource(expression));
 const click=selector=>send('Runtime.evaluate',{expression:`document.querySelector(${JSON.stringify(selector)}).click()`,userGesture:true,awaitPromise:true});
 const library=async()=>{await wait(`document.querySelector('.cp-nav [data-action=piano]')`);await click('.cp-nav [data-action=piano]');await click('[data-action=multimedia]');await wait(`document.querySelector('[data-action=media-share],[data-action=media-play]')`);};
 await send('Page.navigate',{url});await library();return {...browser,wait,click,library};
}
async function capture(send,evaluate,state){
 const folder=process.env.SPINO_PERSISTENT_VIDEO_EVIDENCE;if(!folder)return;await mkdir(folder,{recursive:true});
 for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme='${theme}'`);
  await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  await writeFile(`${folder}/${theme}-${state}-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 }
}

test('legacy video prepares once; failed sharing, metadata changes and app restart reuse the persistent file',{timeout:90000},async t=>{
 const {send,evaluate,wait,click,library,errors}=await setup(t);
 await click('[data-action=media-share]');await wait(`document.querySelector('[data-export-choice=decorated]')`);await capture(send,evaluate,'prepare-once');
 await click('[data-export-choice=decorated]');await wait(`document.querySelector('[data-export-choice=share]')`);await capture(send,evaluate,'saved-ready');
 const first=await readCache(evaluate);assert.equal(first.length,1);assert.equal(first[0].duration,8000);
 await evaluate(`window.failNextShare=true`);await click('[data-export-choice=share]');await wait(`!document.querySelector('[data-action=media-share]').disabled`);
 assert.match(await evaluate(`document.querySelector('#cp-toast').textContent`),/reintentarlo/);
 await click('[data-action=media-share]');await wait(`shareAttempts===2&&!document.querySelector('[data-action=media-share]').disabled`);
 assert.equal(await evaluate(`!!document.querySelector('[data-media-export][open]')`),false);assert.equal(await evaluate(`encodeCount`),1);
 const sharedHash=await evaluate(`(async()=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await lastSharedFile.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join(''))()`);assert.equal(sharedHash,first[0].hash);
 await evaluate(`new Promise(resolve=>{const q=indexedDB.open('spino-local-media',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction('recordings','readwrite'),store=tx.objectStore('recordings'),r=store.get('synthetic-persistent-video');r.onsuccess=()=>store.put({...r.result,title:'Renamed display title',workTitle:'New display piece',createdAt:new Date().toISOString()});tx.oncomplete=()=>{db.close();resolve()}}});sessionStorage.setItem('deny-video-encoding','true');`);
 await send('Page.reload');await library();await click('[data-action=media-share]');await wait(`shareAttempts===1&&!document.querySelector('[data-action=media-share]').disabled`);
 assert.equal(await evaluate(`encodeCount`),0);assert.equal(await evaluate(`!!document.querySelector('[data-media-export][open]')`),false);assert.deepEqual(await readCache(evaluate),first);
 const output=await evaluate(`(async()=>{const video=document.createElement('video');video.src=URL.createObjectURL(lastSharedFile);await new Promise((r,j)=>{video.onloadeddata=r;video.onerror=j});const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;await new Promise(r=>{video.onseeked=r;video.currentTime=4});const x=c.getContext('2d');x.drawImage(video,0,0);return {duration:video.duration,width:c.width,height:c.height,red:x.getImageData(5,5,1,1).data[0]}})()`);
 assert.ok(Math.abs(output.duration-8)<.3,JSON.stringify(output));assert.deepEqual([output.width,output.height],[360,640]);assert.ok(output.red>200);
 // A missing derived file is rebuilt from the retained original, without accumulating cards.
 await evaluate(`sessionStorage.removeItem('deny-video-encoding');new Promise(resolve=>{const q=indexedDB.open('spino-local-media-prepared',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction('exports','readwrite');tx.objectStore('exports').clear();tx.oncomplete=()=>{db.close();resolve()}}})`);
 await click('[data-action=media-share]');await wait(`document.querySelector('[data-export-choice=decorated]')`);await click('[data-export-choice=decorated]');await wait(`document.querySelector('[data-export-choice=share]')`);
 const rebuilt=await readCache(evaluate);assert.notEqual(rebuilt[0].fileId,first[0].fileId);assert.equal(rebuilt[0].duration,8000);await click('[data-export-choice=share]');await wait(`shareAttempts===2`);
 const original=await evaluate(`new Promise(resolve=>{const q=indexedDB.open('spino-local-media',1);q.onsuccess=()=>{const db=q.result,r=db.transaction('recordings').objectStore('recordings').get('synthetic-persistent-video');r.onsuccess=()=>{db.close();resolve({bytes:r.result.blob.size,duration:r.result.durationMs,id:r.result.id})}}})`);
 assert.deepEqual(original,{bytes:bytes.length,duration:3000,id:'synthetic-persistent-video'});assert.deepEqual(errors,[]);
 if(process.env.SPINO_PERSISTENT_VIDEO_EVIDENCE)await writeFile(process.env.SPINO_PERSISTENT_VIDEO_EVIDENCE+'/persistent.json',JSON.stringify({first,rebuilt,output,original},null,2));
});

test('saving a video prepares its durable copy before Share; restart shares without encoding',{timeout:60000},async t=>{
 const {send,evaluate,wait,click,library,errors}=await setup(t,true);
 await click('[data-action=media-play]');await wait(`document.querySelector('[data-media=save]')`);await click('[data-media=save]');
 await wait(`document.querySelector('[data-media=share]')&&!document.querySelector('[data-media=share]').disabled&&!document.querySelector('[data-media-export][open]')`);
 const prepared=await readCache(evaluate);assert.equal(prepared.length,1);await capture(send,evaluate,'saved-review');
 await click('[data-media=share]');await wait(`shareAttempts===1`);assert.equal(await evaluate(`encodeCount`),1);
 await click('[data-media=close]');await evaluate(`sessionStorage.setItem('deny-video-encoding','true')`);await send('Page.reload');await library();await click('[data-action=media-share]');await wait(`shareAttempts===1`);
 assert.deepEqual(await readCache(evaluate),prepared);assert.equal(await evaluate(`encodeCount`),0);assert.deepEqual(errors,[]);
});
