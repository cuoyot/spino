import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
import {driveNotebookBootstrap} from '../scripts/review/drive-notebook-fixture.mjs';
const wav=Buffer.alloc(44+48000*3*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
for(let i=0;i<144000;i++)wav.writeInt16LE(Math.round(8000*Math.sin(2*Math.PI*(i<48000?220:i<96000?440:880)*i/48000)),44+i*2);
const take={id:'synthetic-trim-original',workId:'synthetic-work',title:'Synthetic trim test',workTitle:'Synthetic score',createdAt:new Date().toISOString(),durationMs:3000,kind:'audio',draft:false,base64:wav.toString('base64')};
const until=expression=>`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(${expression}){clearInterval(t);resolve();}else if(++n>1200){clearInterval(t);reject(Error('Timeout: '+${JSON.stringify(expression)}));}},25);})`;
test('trim replaces audio in place; quota and cancellation are safe',{timeout:90000},async t=>{
 const {send,evaluate,url}=await openBrowser(t,{companion:true});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:driveNotebookBootstrap({localMedia:take})});await send('Page.navigate',{url});
 await evaluate(until("document.querySelector('.cp-nav [data-action=piano]')"));
 const click=selector=>send('Runtime.evaluate',{expression:`document.querySelector(${JSON.stringify(selector)}).click()`,userGesture:true,awaitPromise:true});
 await click('.cp-nav [data-action=piano]');await click('[data-action=multimedia]');await evaluate(until("document.querySelector('[data-action=media-play]')"));await click('[data-action=media-play]');await evaluate(until("document.querySelector('#cp-media-capture audio')?.readyState>=1"));await click('[data-media=trim]');
 await evaluate(`document.querySelectorAll('.cp-media-trim input').forEach((input,i)=>{input.value=i?2000:1000;input.dispatchEvent(new Event('input',{bubbles:true}));})`);
 const folder=process.env.SPINO_TRIM_EVIDENCE;if(folder){await mkdir(folder,{recursive:true});for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme='${theme}'`);const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${folder}/${theme}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));}}
 await evaluate(`window.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...args){if(this.name==='recordings'&&value.trimmedFrom)throw new DOMException('Synthetic quota','QuotaExceededError');return originalPut.call(this,value,...args);}`);
 await click('.cp-media-trim .primary');await evaluate(until("document.querySelector('.cp-media-trim [role=status]')?.textContent.includes('No se ha podido')"));assert.ok(await evaluate(`!!document.querySelector('.cp-media-trim')`));
 const retained=await evaluate(`new Promise(resolve=>{const q=indexedDB.open('spino-local-media');q.onsuccess=()=>{const db=q.result,r=db.transaction('recordings').objectStore('recordings').getAll();r.onsuccess=()=>{db.close();resolve(r.result.map(r=>({id:r.id,size:r.blob.size,duration:r.durationMs})));};};})`);assert.deepEqual(retained,[{id:take.id,size:wav.length,duration:3000}]);
 await evaluate(`IDBObjectStore.prototype.put=originalPut`);await click('.cp-media-trim .primary');await evaluate(until("!document.querySelector('.cp-media-trim')"));
 const result=await evaluate(`(async()=>{const rows=await new Promise(resolve=>{const q=indexedDB.open('spino-local-media');q.onsuccess=()=>{const db=q.result,r=db.transaction('recordings').objectStore('recordings').getAll();r.onsuccess=()=>{db.close();resolve(r.result)};};});const original=rows.find(r=>r.id==='synthetic-trim-original'),copy=rows.find(r=>r.trimmedFrom);const context=new AudioContext(),decoded=await context.decodeAudioData(await copy.blob.arrayBuffer()),samples=decoded.getChannelData(0);let crossings=0;for(let i=Math.round(decoded.sampleRate*.2);i<Math.min(samples.length,decoded.sampleRate*.8);i++)if(samples[i-1]<0&&samples[i]>=0)crossings++;await context.close();return {count:rows.length,originalBytes:original.blob.size,id:copy.id,workId:copy.workId,duration:decoded.duration,crossings,cloud:!!copy.cloud,title:copy.title};})()`);
 assert.equal(result.count,1);assert.notEqual(result.originalBytes,wav.length);assert.equal(result.id,take.id);assert.equal(result.title,take.title);assert.equal(result.workId,take.workId);assert.equal(result.cloud,false);assert.ok(Math.abs(result.duration-1)<.15,JSON.stringify(result));assert.ok(result.crossings>250&&result.crossings<280,JSON.stringify(result));
 await click('[data-media=trim]');await click('.cp-media-trim .primary');await click('.cp-media-trim .cp-actions button:last-child');await evaluate(until("document.querySelector('.cp-media-trim [role=status]')?.textContent.includes('cancelado')"));
 if(folder)await writeFile(folder+'/verification.json',JSON.stringify(result,null,2));
});

test('video trim exports a decodable shortened copy',{timeout:60000},async t=>{
 const {send,evaluate,url}=await openBrowser(t,{companion:true});
 const video={...take,id:'synthetic-trim-video',kind:'video',durationMs:3000,base64:(await readFile('public/warmups/hanon-video-v1/videos/hanon-1-right.mp4')).toString('base64')};
 await send('Page.addScriptToEvaluateOnNewDocument',{source:driveNotebookBootstrap({localMedia:video})});await send('Page.navigate',{url});await evaluate(until("document.querySelector('.cp-nav [data-action=piano]')"));
 const click=selector=>send('Runtime.evaluate',{expression:`document.querySelector(${JSON.stringify(selector)}).click()`,userGesture:true,awaitPromise:true});
 await click('.cp-nav [data-action=piano]');await click('[data-action=multimedia]');await evaluate(until("document.querySelector('[data-action=media-play]')"));await click('[data-action=media-play]');await evaluate(until("document.querySelector('#cp-media-capture video')?.readyState>=1"));await click('[data-media=trim]');
 await evaluate(`document.querySelectorAll('.cp-media-trim input').forEach((input,i)=>{input.value=i?2000:1000;input.dispatchEvent(new Event('input',{bubbles:true}));})`);await click('.cp-media-trim .primary');await evaluate(until("!document.querySelector('.cp-media-trim')&&document.querySelector('#cp-media-capture video')?.readyState>=2"));
 const output=await evaluate(`(()=>{const v=document.querySelector('#cp-media-capture video');return {duration:v.duration,width:v.videoWidth,height:v.videoHeight};})()`);assert.ok(Math.abs(output.duration-1)<.2,JSON.stringify(output));assert.ok(output.width>0&&output.height>0);
});
