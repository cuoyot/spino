import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readdir,readFile} from 'node:fs/promises';
import {openBrowser,disableWarmup} from './browser.js';
import {scorePDF} from './pdf-fixture.js';
import {musicXMLFixture} from './musicxml-fixture.js';

test('raised score timer advances through checkpoints, pauses and resumes in four layouts', {timeout:120000}, async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const id=setInterval(()=>{if(${condition}){clearInterval(id);resolve()}else if(++n>800){clearInterval(id);reject(Error('Timeout'))}},20)})`);
 const action=name=>evaluate(`document.querySelector('[data-action="${name}"]').click()`);
 await send('Page.navigate',{url});await wait(`document.querySelector('#app-shell h1')`);await disableWarmup(evaluate);
 await action('piano');await action('repertoire');await action('new-work');
 await evaluate(`(()=>{const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(${JSON.stringify(scorePDF())}),c=>c.charCodeAt(0))],'Timer synthetic.pdf',{type:'application/pdf'}));const input=document.querySelector('[name=score]');input.files=dt.files;input.dispatchEvent(new Event('change'));})()`);
 await wait(`document.querySelector('[name=score]').validity.valid`);await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`);await wait(`document.querySelector('[data-action=practice-work]')`);
 await action('practice-work');await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);await wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);
 await evaluate(`window.timerSeconds=()=>{const [m,s]=document.querySelector('.score-timer .pdf-time').textContent.split(':').map(Number);return m*60+s};window.timerStart=timerSeconds()`);
 await wait(`timerSeconds()>=timerStart+7`);
 assert.equal(await evaluate(`document.querySelector('.score-timer').dataset.running`),'true');
 const folder=process.env.SPINO_SCORE_TIMER_EVIDENCE||'artifacts/score-timer';await mkdir(folder,{recursive:true});
 const grip=async()=>evaluate(`(()=>{const r=document.querySelector('.pdf-widget-bar [data-pdf=drag],.pdf-widget-bar [data-xml=drag]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,id:1}})()`);
 const tap=async()=>{await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[await grip()]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
 const minimized=()=>evaluate(`document.querySelector('.pdf-widget').classList.contains('score-widget-minimized')`);
 const checkMinimize=async(name)=>{
  const running=await evaluate(`document.querySelector('.score-timer').dataset.running`);
  const score=await evaluate(`document.querySelector('.pdf-paper,.xml-score').getBoundingClientRect().width`);
  await tap();assert.equal(await minimized(),false,'A single tap keeps the full bar');
  await tap();assert.equal(await minimized(),true,'Two real touch taps minimize');
  assert.deepEqual(await evaluate(`[...document.querySelector('.pdf-widget-bar').children].filter(e=>e.getClientRects().length).map(e=>e.dataset.pdf||e.dataset.xml)`),name.startsWith('pdf')?['drag','timer']:['drag','pause']);
  assert.equal(await evaluate(`document.querySelector('.score-timer').dataset.running`),running);
  assert.equal(await evaluate(`document.querySelector('.pdf-paper,.xml-score').getBoundingClientRect().width`),score);
  const r=await evaluate(`(()=>{const r=document.querySelector('.pdf-widget').getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom}})()`);
  assert.ok(r.x>=0&&r.y>=0&&r.right<=await evaluate('innerWidth')&&r.bottom<=await evaluate('innerHeight'));
  await writeFile(`${folder}/${name}-minimized.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await tap();await tap();assert.equal(await minimized(),false,'Double-tap restores the full bar');
  assert.equal(await evaluate(`document.querySelector('.score-timer').dataset.running`),running,'Restoring must not click the newly exposed clock');
 };
 const geometry=async()=>{
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.score-timer')).color`),'rgb(245, 255, 255)');
  assert.equal(await evaluate(`document.querySelector('[data-pdf=tools],[data-xml=options]').hidden`),false);
  assert.equal(await evaluate(`document.querySelector('[data-pdf=finish],[data-xml=finish]').hidden`),false);
  const results=await evaluate(`Array.from(document.querySelectorAll('.pdf-widget-bar button:not([hidden]),.pdf-widget-bar .score-timer')).filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return{action:e.dataset.pdf||e.dataset.xml,x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height}})`);
  for(const r of results){assert.ok(r.x>=0&&r.y>=0&&r.right<=await evaluate('innerWidth')&&r.bottom<=await evaluate('innerHeight'),JSON.stringify(r));assert.ok(r.w>=(await evaluate('innerWidth')<=350&&r.action!=='drag'?36:44)&&r.h>=44,JSON.stringify(r));}
 };
 for(const [layout,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768],['small-phone',320,568]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await evaluate(`new Promise(resolve=>setTimeout(resolve,550))`);
  for(const theme of ['light','dark']){
   await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);await geometry();
   await writeFile(`${folder}/pdf-${theme}-${layout}-running.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
   await checkMinimize(`pdf-${theme}-${layout}`);
   await evaluate(`document.querySelector('[data-pdf=timer]').click()`);await wait(`document.querySelector('.score-timer').dataset.running==='false'`);
   const paused=await evaluate('timerSeconds()');await evaluate(`new Promise(r=>setTimeout(r,1100))`);assert.equal(await evaluate('timerSeconds()'),paused);
   await geometry();await writeFile(`${folder}/pdf-${theme}-${layout}-paused.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
   await evaluate(`document.querySelector('[data-pdf=timer]').click()`);await wait(`document.querySelector('.score-timer').dataset.running==='true'`);
  }
 }
 // A real drag between taps must never count as the second tap.
 await send('Emulation.setDeviceMetricsOverride',{width:768,height:1024,deviceScaleFactor:1,mobile:true});
 await tap();const point=await grip();
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
 await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...point,x:60,y:180}]});
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await minimized(),false);
 await tap();await tap();assert.equal(await minimized(),true);
 await evaluate(`document.querySelector('[data-pdf=timer]').click()`);
 await wait(`document.querySelector('.score-timer').dataset.running==='false'`);
 await evaluate(`document.querySelector('[data-pdf=timer]').click()`);
 await wait(`document.querySelector('.score-timer').dataset.running==='true'`);
 await evaluate(`document.querySelector('[data-pdf=drag]').focus()`);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 assert.equal(await minimized(),false,'Keyboard activation restores the dragged bar');
 // MusicXML uses the same dial with its own viewer lifecycle and synthetic score.
 await evaluate(`document.querySelector('[data-pdf=timer]').click();document.querySelector('[data-pdf=close]').click()`);await wait(`!document.querySelector('.pdf-viewer')`);
 const assets=await readdir('dist/assets');let xmlChunk;
 for(const name of assets.filter(n=>/^musicxml-viewer-.*\.js$/.test(n)))if(/\bas openMusicScore\b/.test(await readFile(`dist/assets/${name}`,'utf8')))xmlChunk=name;
 assert.ok(xmlChunk);
 await evaluate(`(async()=>{const text=${JSON.stringify(musicXMLFixture())},bytes=new TextEncoder().encode(text),sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');window.xmlTiming={running:true,elapsed:0,since:Date.now()};window.xmlReview=await(await import('/assets/${xmlChunk}')).openMusicScore({asset:{base64:btoa(text),sha256,format:'musicxml'},selection:['P'],session:{read:()=>({running:xmlTiming.running,time:'0:'+String(Math.floor((xmlTiming.elapsed+(xmlTiming.running?Date.now()-xmlTiming.since:0))/1000)).padStart(2,'0')}),toggle:()=>{if(xmlTiming.running)xmlTiming.elapsed+=Date.now()-xmlTiming.since;else xmlTiming.since=Date.now();xmlTiming.running=!xmlTiming.running},finish:()=>{}}})})()`);
 await wait(`document.querySelector('.xml-score svg')`);await wait(`Number(document.querySelector('.score-timer .pdf-time').textContent.split(':')[1])>=7`);
 for(const [layout,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await evaluate(`new Promise(resolve=>setTimeout(resolve,550))`);
  await geometry();await writeFile(`${folder}/xml-${layout}-running.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await checkMinimize(`xml-${layout}`);
  await evaluate(`document.querySelector('[data-xml=pause]').click()`);await geometry();await writeFile(`${folder}/xml-${layout}-paused.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  const positions=()=>evaluate(`Object.fromEntries([...document.querySelectorAll('.pdf-widget-bar button')].filter(b=>b.getBoundingClientRect().width).map(b=>{const r=b.getBoundingClientRect();return[['options','done'].includes(b.dataset.xml)?'edit':b.dataset.xml,{x:r.x,y:r.y,w:r.width,h:r.height}]}))`);
  const pausedPositions=await positions();
  await evaluate(`document.querySelector('[data-xml=options]').click()`);
  assert.equal(await evaluate(`document.querySelector('[data-xml=pause]').disabled&&!document.querySelector('[data-xml=pause]').hidden`),true);
  const editingPositions=await positions();assert.deepEqual(Object.keys(editingPositions).sort(),Object.keys(pausedPositions).sort());
  for(const [action,box] of Object.entries(editingPositions))for(const key of ['x','y','w','h'])assert.ok(Math.abs(box[key]-pausedPositions[action][key])<1,`MusicXML ${layout}: ${action} ${key} moved`);
  await evaluate(`document.querySelector('[data-xml=pause]').click()`);assert.equal(await evaluate(`xmlTiming.running`),false);
  await writeFile(`${folder}/xml-${layout}-editing.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await evaluate(`document.querySelector('[data-xml=done]').click()`);
 }
 assert.deepEqual(errors,[]);
});
