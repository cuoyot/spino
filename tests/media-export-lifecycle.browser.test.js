import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {driveNotebookBootstrap} from '../scripts/review/drive-notebook-fixture.mjs';

test('native original sharing skips conversion, keeps staging across lock and presents only after returning',{timeout:30000},async t=>{
 const bytes=await readFile('tests/fixtures/media/bookends-portrait.webm');
 const take={id:'synthetic-fast-export',workId:'synthetic-work',title:'Synthetic video',workTitle:'Synthetic piece',createdAt:new Date().toISOString(),durationMs:3000,kind:'video',draft:false,base64:bytes.toString('base64')};
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const wait=expression=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve()}else if(++n>700){clearInterval(timer);reject(Error('Missing '+${JSON.stringify(expression)}))}},20)})`);
 await send('Page.addScriptToEvaluateOnNewDocument',{source:driveNotebookBootstrap({localMedia:take})+`
 window.exportHidden=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>exportHidden});
 window.nativeShareCalls=[];window.exportParts=[];window.trimCalls=0;
 const native=Capacitor.nativePromise;
 Capacitor.PluginHeaders.push({name:'MediaShare',methods:['begin','writeChunk','share','abort'].map(name=>({name,rtype:'promise'}))});
 Capacitor.PluginHeaders.push({name:'MediaTrim',methods:['begin'].map(name=>({name,rtype:'promise'}))});
 Capacitor.nativePromise=async(plugin,method,args)=>{
  if(plugin==='MediaTrim'){trimCalls++;throw Error('Original sharing must not transcode');}
  if(plugin!=='MediaShare')return native(plugin,method,args);
  if(method==='begin')return {token:'synthetic-staging'};
  if(method==='writeChunk'){exportParts.push(args);exportHidden=true;document.dispatchEvent(new Event('visibilitychange'));return {};}
  if(method==='abort'){window.stagingAborted=true;return {};}
  if(method==='share'){nativeShareCalls.push({hidden:document.hidden,...args});return {cancelled:true};}
 };
 `});
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-nav [data-action=piano]')`);
 const click=selector=>send('Runtime.evaluate',{expression:`document.querySelector(${JSON.stringify(selector)}).click()`,userGesture:true,awaitPromise:true});
 await click('.cp-nav [data-action=piano]');await click('[data-action=multimedia]');await wait(`document.querySelector('[data-action=media-share]')`);
 await click('[data-action=media-share]');await wait(`document.querySelector('[data-export-choice=original]')`);await click('[data-export-choice=original]');
 await wait(`exportParts.length>0&&document.hidden`);
 assert.equal(await evaluate(`nativeShareCalls.length`),0);assert.equal(await evaluate(`trimCalls`),0);
 assert.equal(await evaluate(`!!document.querySelector('[data-media-export] progress')`),true);
 await evaluate(`exportHidden=false;document.dispatchEvent(new Event('visibilitychange'))`);await wait(`nativeShareCalls.length===1`);
 assert.equal(await evaluate(`nativeShareCalls[0].hidden`),false);assert.equal(await evaluate(`window.stagingAborted||false`),false);
 const staged=await evaluate(`(async()=>{const parts=exportParts.map(p=>Uint8Array.from(atob(p.base64),c=>c.charCodeAt(0))),blob=new Blob(parts);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join('')})()`);
 assert.equal(staged,createHash('sha256').update(bytes).digest('hex'));assert.deepEqual(errors,[]);
});
