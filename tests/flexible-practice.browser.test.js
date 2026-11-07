import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';
import { flexiblePracticeFixture } from '../scripts/review/flexible-practice-fixture.mjs';
import { saveSession, validateData, block, beginSession } from '../src/companion/model.js';
import { settleSuspendedBlocks } from '../src/companion/session-edit.js';

test('direct block entry retains separate times, PDF position and warm-up through recovery and final save',{timeout:120000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});
 const evidence=process.env.SPINO_FLEXIBLE_EVIDENCE;const coreLayouts={};
 if(evidence)await mkdir(evidence,{recursive:true});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.__practiceNow=Date.now();Date.now=()=>window.__practiceNow;'});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(${condition}){clearInterval(t);resolve()}else if(n++>900){clearInterval(t);reject(Error('Timeout: '+${JSON.stringify(condition)}))}},20)})`);
 const action=(name,id)=>evaluate(`document.querySelector('[data-action="${name}"]${id?`[data-id="${id}"]`:''}').click()`);
 const read=()=>evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{db.close();resolve(q.result)}}})`);
 const advance=async ms=>{await evaluate(`window.__practiceNow+=${ms}`);await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');};
 const capture=async name=>{if(evidence){const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(evidence+'/'+name+'.png',Buffer.from(shot.data,'base64'));}};
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 const fixture=flexiblePracticeFixture();
 fixture.data.active.blocks.push(block('free',{id:'synthetic-free-block',minutes:5}));
 await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${JSON.stringify(fixture.data)},'current');for(const a of ${JSON.stringify(fixture.assets)})tx.objectStore('assets').put(a);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=reject;}})`);
 await send('Page.reload');await wait(`document.querySelector('[data-action=resume-session]')`);await action('resume-session');await wait(`document.querySelector('.cp-session-stand')`);
 for(const theme of ['light','dark'])for(const [name,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await evaluate(`document.documentElement.dataset.theme='${theme}'`);
  assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth>document.querySelector('.cp-page').clientWidth+1`),false);
  assert.equal(await evaluate(`!!document.querySelector('.cp-session-heading [data-action=leave-session]')&&!document.querySelector('.cp-session-heading [data-action=session-end]')`),true);
  assert.equal(await evaluate(`(()=>{const finish=document.querySelector('.cp-session-leave [data-action=session-end]').getBoundingClientRect(),discard=document.querySelector('.cp-session-discard').getBoundingClientRect();return finish.left>discard.left&&Math.abs(finish.top-discard.top)<2&&getComputedStyle(document.querySelector('.cp-session-discard')).textDecorationLine==='underline'})()`),true);
  await capture(theme+'-session-'+name);
 }
 await send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:true});
 const point=await evaluate(`(()=>{const r=document.querySelector('[data-action=session-select-block][data-id=synthetic-satie-block]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
 await wait(`document.querySelector('.pdf-paper[aria-busy=false]')`);
 assert.equal(await evaluate(`document.querySelector('.pdf-widget .pdf-time').textContent`),'0:00');
 assert.equal(await evaluate(`document.querySelector('.pdf-viewer .practice-total-clock b').textContent`),'13:00');
 await advance(10000);
 assert.equal(await evaluate(`document.querySelector('.pdf-widget .pdf-time').textContent`),'0:10');
 assert.equal(await evaluate(`document.querySelector('.pdf-viewer .practice-total-clock b').textContent`),'13:10');
 await evaluate(`document.querySelector('[data-pdf=timer]').click();document.querySelector('[data-pdf=next]').click()`);
 await wait(`document.querySelector('.pdf-page-count').textContent.includes('2')`);
 for(const theme of ['light','dark'])for(const [name,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme='${theme}'`);await capture(theme+'-pdf-'+name);
  coreLayouts[theme+'-'+name]=await evaluate(`Object.fromEntries([...document.querySelectorAll('.pdf-viewer [data-practice-role]')].filter(e=>!e.hidden).map(e=>{const r=e.getBoundingClientRect();return[e.dataset.practiceRole,{left:r.left,top:r.top,width:r.width,height:r.height}]}))`);
  if(width<=600||height<=500){
   const compact=await evaluate(`(()=>{const w=document.querySelector('.pdf-widget').getBoundingClientRect(),record=document.querySelector('[data-pdf=record]').getBoundingClientRect(),grip=document.querySelector('[data-pdf=drag]').getBoundingClientRect(),count=document.querySelector('.pdf-page-count').getBoundingClientRect();return{height:w.height,left:w.left,right:w.right,recordY:record.y,gripY:grip.y,countWidth:count.width,countLeft:count.left,arrows:[...document.querySelectorAll('.pdf-pagination button')].some(e=>e.getClientRects().length)}})()`);
   assert.ok(compact.height<75&&compact.left>=0&&compact.right<=width,JSON.stringify(compact));
   assert.ok(Math.abs(compact.recordY-compact.gripY)<1,JSON.stringify(compact));
   assert.equal(compact.arrows,false);assert.ok(compact.countWidth>0&&compact.countLeft<50);
  }
  const bounds=await evaluate(`(()=>{const a=document.querySelector('.pdf-viewer .practice-total-clock').getBoundingClientRect(),b=document.querySelector('.pdf-widget').getBoundingClientRect();return{left:a.left,top:a.top,right:a.right,width:innerWidth,overlap:a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top}})()`);assert.ok(bounds.left>=0&&bounds.top>=0&&bounds.right<=bounds.width);assert.equal(bounds.overlap,false);
 }
 await send('Emulation.setDeviceMetricsOverride',{width:320,height:568,deviceScaleFactor:1,mobile:true});
 await wait(`document.querySelector('.pdf-paper[aria-busy=false]')`);
 assert.equal(await evaluate(`(()=>{const r=document.querySelector('.pdf-widget').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height<75})()`),true);
 assert.equal(await evaluate(`(()=>{const a=document.querySelector('.pdf-pagination').getBoundingClientRect(),b=document.querySelector('[data-pdf=record]').getBoundingClientRect();return a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom})()`),true,'The narrow-phone page indicator must not cover recording');
 await capture('small-phone-pdf');
 const tapPdfEdge=async side=>{
  const point=await evaluate(`(()=>{const r=document.querySelector('.pdf-paper').getBoundingClientRect();return{x:${side==='prev'?'Math.max(0,r.left)+5':'Math.min(innerWidth,r.right)-5'},y:Math.max(100,r.top+100)}})()`);
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 };
 await tapPdfEdge('prev');await wait(`document.querySelector('.pdf-page-count').textContent.trim().startsWith('1')&&document.querySelector('.pdf-paper[aria-busy=false]')`);
 await tapPdfEdge('next');await wait(`document.querySelector('.pdf-page-count').textContent.trim().startsWith('2')&&document.querySelector('.pdf-paper[aria-busy=false]')`);
 await evaluate(`document.querySelector('[data-pdf=close]').click()`);await wait(`!document.querySelector('.pdf-viewer')`);
 await action('session-select-block','synthetic-bach-block');await wait(`document.querySelector('.pdf-paper[aria-busy=false]')`);assert.equal(await evaluate(`document.querySelector('.pdf-widget .pdf-time').textContent`),'8:00');
 await advance(5000);await evaluate(`document.querySelector('[data-pdf=timer]').click();document.querySelector('[data-pdf=close]').click()`);await wait(`!document.querySelector('.pdf-viewer')`);
 await action('session-select-block','synthetic-satie-block');await wait(`document.querySelector('.pdf-paper[aria-busy=false]')`);assert.equal(await evaluate(`document.querySelector('.pdf-widget .pdf-time').textContent`),'0:10');
 assert.match(await evaluate(`document.querySelector('.pdf-page-count').textContent`),/2/);
 await evaluate(`document.querySelector('[data-pdf=finish]').click()`);await wait(`!document.querySelector('.pdf-viewer')`);
 assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`),false,'Stop returns to the multi-block menu without final feedback');
 await action('session-select-block','synthetic-warmup');await wait(`!document.querySelector('#reader-view').hidden`);
 if(await evaluate(`!!document.querySelector('[data-warmup-start]')`))await evaluate(`document.querySelector('[data-warmup-start]').click()`);
 await advance(3000);
 assert.equal(await evaluate(`__sr.settings.layoutMode`),'page');
 assert.equal(await evaluate(`document.querySelector('#practice-clock').textContent`),'5:03');
 assert.equal(await evaluate(`document.querySelector('body > div:has(> .practice-total-clock) .practice-total-clock b').textContent`),'13:18');
 await capture('warmup-two-clocks');
 for(const theme of ['light','dark'])for(const [name,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768],['reported-portrait',516,1267],['narrow-phone',320,568]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme='${theme}'`);
  await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  const geometry=await evaluate(`(()=>{const widget=document.querySelector('.managed-practice-widget');return{core:Object.fromEntries([...widget.querySelectorAll('[data-practice-role]')].filter(e=>!e.hidden).map(e=>{const r=e.getBoundingClientRect();return[e.dataset.practiceRole,{left:r.left,top:r.top,width:r.width,height:r.height}]})),systems:__sr.layout.rows.length,overflow:document.documentElement.scrollWidth>innerWidth+1}})()`);
  assert.equal(geometry.overflow,false,theme+' '+name+' '+JSON.stringify(geometry));
  const sheet=await evaluate(`(()=>{const surface=document.querySelector('#staff-wrap'),r=surface.getBoundingClientRect(),heads=[...document.querySelectorAll('#staff .vf-notehead')].map(n=>n.getBoundingClientRect().bottom);return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,radius:getComputedStyle(surface).borderRadius,lastNote:Math.max(...heads)}})()`);
  assert.deepEqual({left:sheet.left,top:sheet.top,right:sheet.right,bottom:sheet.bottom,radius:sheet.radius},{left:0,top:0,right:width,bottom:height,radius:'0px'},'Physical-piano sheet fills the viewport without an outer frame');
  assert.ok(height-sheet.lastNote>=96,'The last notation keeps a clear bottom margin '+JSON.stringify(sheet));
  if(coreLayouts[theme+'-'+name])for(const [role,rect]of Object.entries(geometry.core))for(const dim of ['left','top','width','height'])assert.ok(Math.abs(rect[dim]-coreLayouts[theme+'-'+name][role][dim])<1,theme+' '+name+' '+role+' '+dim+' must match the PDF widget '+JSON.stringify({actual:rect,expected:coreLayouts[theme+'-'+name][role]}));
  if(height>800)assert.ok(geometry.systems>1,'Tall screens show multiple systems');
  await capture(theme+'-warmup-'+name);
 }
 const beforePage=await evaluate(`__sr.line.pageStart||0`);
 const edge=await evaluate(`(()=>{const r=document.querySelector('#staff-wrap').getBoundingClientRect();return{left:r.left+4,right:r.right-4,y:r.top+r.height/2}})()`);
 const tapEdge=async x=>{await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:edge.y,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');};
 assert.equal(await evaluate(`getComputedStyle(document.querySelector('#score-next')).display`),'none');
 await tapEdge(edge.right);assert.ok(await evaluate(`__sr.line.pageStart`)>beforePage,'The score right edge opens the next page');
 await tapEdge(edge.left);assert.equal(await evaluate(`__sr.line.pageStart`),beforePage,'The score left edge returns to the earlier page');
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:edge.right,y:edge.y,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:edge.left,y:edge.y,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:edge.right,y:edge.y,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await evaluate(`__sr.line.pageStart`),beforePage,'A swipe that returns to the edge must not turn a page');
 assert.equal((await read()).active.elapsedMs,798000,'Page browsing does not add practice time');
 await evaluate(`document.querySelector('#practice-return').click()`);await wait(`!document.querySelector('#app-shell').hidden`);
 await action('session-select-block','synthetic-free-block');await wait(`document.querySelector('.cp-free-practice')`);
 assert.equal(await evaluate(`document.querySelector('.managed-practice-widget').hidden`),false);
 for(const [name,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  const core=await evaluate(`Object.fromEntries([...document.querySelectorAll('.managed-practice-widget [data-practice-role]')].map(e=>{const r=e.getBoundingClientRect();return[e.dataset.practiceRole,{left:r.left,top:r.top,width:r.width,height:r.height}]}))`);
  for(const [role,rect]of Object.entries(core))for(const dim of ['left','top','width','height'])assert.ok(Math.abs(rect[dim]-coreLayouts['light-'+name][role][dim])<1,'Free practice '+name+' '+role+' '+dim+' matches PDF');
  await capture('free-shared-widget-'+name);
 }
 await evaluate(`document.querySelector('[data-managed=stop]').click()`);await wait(`document.querySelector('.cp-session-stand')&&!document.querySelector('#cp-dialog').open`);
 await send('Page.reload');await wait(`document.querySelector('[data-action=resume-session]')`);await action('resume-session');await wait(`document.querySelector('.cp-session-stand')`);
 const recovered=await read();assert.equal(recovered.active.id,'synthetic-flexible-session');assert.equal(recovered.active.elapsedMs,798000);
 assert.deepEqual(recovered.active.blocks.map(b=>b.id),fixture.data.active.blocks.map(b=>b.id));
 await action('session-end');await wait(`document.querySelector('[name=practicedMinutes]')`);
 assert.equal(await evaluate(`document.querySelectorAll('.cp-work-parts input').length`),2);
 await evaluate(`document.querySelector('#cp-dialog form').requestSubmit(document.querySelector('button[value=save]'))`);await wait(`document.querySelector('.cp-today')&&!document.querySelector('#cp-dialog').open`);
 const saved=(await read()).sessions[0];assert.equal(saved.elapsedMs,798000);assert.equal(saved.results.reduce((n,r)=>n+r.elapsedMs,0),798000);
 const assets=await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,q=db.transaction('assets').objectStore('assets').getAll();q.onsuccess=()=>{db.close();resolve(q.result)}}})`);
 for(const original of fixture.assets){const retained=assets.find(asset=>asset.id===original.id);assert.equal(retained.base64,original.base64);assert.deepEqual(retained.annotations,original.annotations);}
 assert.deepEqual(errors,[]);
 if(evidence){await writeFile(evidence+'/fixture.json',JSON.stringify(fixture,null,2));await writeFile(evidence+'/verification.json',JSON.stringify({scope:'Responsive production browser; synthetic notebook',saved,errors},null,2));}
});

test('repeat a saved practice keeps its warm-up type and both hands instead of silently replacing it with Reading',{timeout:30000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(${condition}){clearInterval(t);resolve()}else if(n++>600){clearInterval(t);reject(Error('Timeout: '+${JSON.stringify(condition)}))}},20)})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 const fixture=flexiblePracticeFixture();saveSession(fixture.data,settleSuspendedBlocks(fixture.data.active));
 await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${JSON.stringify(fixture.data)},'current');for(const a of ${JSON.stringify(fixture.assets)})tx.objectStore('assets').put(a);tx.oncomplete=()=>{db.close();resolve()}}})`);
 await send('Page.reload');await wait(`document.querySelector('[data-action=session-detail]')`);
 await evaluate(`document.querySelector('[data-action=session-detail]').click();document.querySelector('[data-action=repeat-session]').click()`);
 assert.equal(await evaluate(`document.querySelector('[name=type-0]').value`),'warmup');
 await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);await wait(`document.querySelector('.cp-session-stand')`);
 const data=await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{db.close();resolve(q.result)}}})`);
 validateData(data);assert.equal(data.active.blocks.length,3);assert.equal(data.active.blocks[0].type,'warmup');assert.equal(data.active.blocks[0].hand,'both');assert.deepEqual(data.active.blocks[0].exercises,['hanon-1']);assert.deepEqual(errors,[]);
});

test('reading, note names and technique share the floating controls without covering the playable keyboard',{timeout:90000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});const baseline={};
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const id=setInterval(()=>{if(${condition}){clearInterval(id);resolve()}else if(n++>700){clearInterval(id);reject(Error('Timeout '+${JSON.stringify(condition)}))}},20)})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 for(const [name,context,type,input]of [['keyboard','mobile','reading','piano'],['names','mobile','reading','names'],['technique','piano','technique','piano'],['manual-reading','piano','reading','piano']]){
  const {data}=flexiblePracticeFixture();data.active=beginSession({title:'Synthetic shared controls',context,blocks:[block(type,{id:'shared-'+name,input})]});
  await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=()=>{db.close();resolve()}}})`);
  await send('Page.reload');await wait(`document.querySelector('[data-action=resume-session]')`);await evaluate(`document.querySelector('[data-action=resume-session]').click();document.querySelector('[data-action=session-select-block]').click()`);await wait(`document.querySelector('.managed-practice-widget')?.hidden===false`);
  for(const [layout,width,height]of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
   const state=await evaluate(`(()=>{const timer=document.querySelector('.managed-practice-widget [data-practice-role=timer]').getBoundingClientRect(),keys=document.querySelector('#input-area').getBoundingClientRect();return{core:Object.fromEntries([...document.querySelectorAll('.managed-practice-widget [data-practice-role]')].map(e=>{const r=e.getBoundingClientRect();return[e.dataset.practiceRole,[r.left,r.top,r.width,r.height]]})),keysBottom:keys.bottom,timerTop:timer.top,overflow:document.documentElement.scrollWidth>innerWidth+1}})()`);
   assert.equal(state.overflow,false,name+' '+layout);
   if(context==='mobile')assert.ok(state.keysBottom<=state.timerTop,name+' '+layout+' widget must leave keys clear '+JSON.stringify(state));
   if(baseline[layout])assert.deepEqual(state.core,baseline[layout]);else baseline[layout]=state.core;
  }
  await evaluate(`document.querySelector('[data-managed=options]').click()`);assert.equal(await evaluate(`document.querySelector('.managed-practice-widget .pdf-panel').hidden`),false);
  await evaluate(`document.querySelector('[data-managed=return]').click()`);await wait(`!document.querySelector('#app-shell').hidden`);
 }
 assert.deepEqual(errors,[]);
});
