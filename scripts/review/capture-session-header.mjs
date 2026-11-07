// Responsive browser evidence with disposable synthetic data only.
import {openBrowser} from '../../tests/browser.js';
import {flexiblePracticeFixture} from './flexible-practice-fixture.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const cleanup=[];
try {
 const {send,evaluate,url,errors}=await openBrowser({after:f=>cleanup.push(f)},{companion:true});
 const wait=c=>evaluate(`new Promise((ok,no)=>{let n=0;const t=setInterval(()=>{if(${c}){clearInterval(t);ok()}else if(n++>500){clearInterval(t);no(Error('timeout'))}},20)})`);
 await send('Page.navigate',{url});await wait("document.querySelector('.cp-today')");
 const {data,assets}=flexiblePracticeFixture();
 data.preferences.language='es';data.active.title='Repertorio';
 Object.assign(data.active,{elapsedMs:4078000,blockElapsedMs:1946000});
 data.active.blockRuntime[0].elapsedMs=2132000;
 await evaluate(`new Promise(ok=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const tx=r.result.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');for(const a of ${JSON.stringify(assets)})tx.objectStore('assets').put(a);tx.oncomplete=()=>{r.result.close();ok()}}})`);
 await send('Page.reload');await wait("document.querySelector('[data-action=resume-session]')");await evaluate("document.querySelector('[data-action=resume-session]').click()");
 await wait("document.querySelector('.cp-session-total')");
 await wait("document.querySelector('#cp-toast').hidden");
 const dir='docs/quality-review/captures/session/2026-11-07-session-total-header-01';
 await mkdir(dir,{recursive:true});
 const results=[];
 for(const theme of ['light','dark'])for(const [name,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768],['narrow-phone',320,640]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  await evaluate(`document.documentElement.dataset.theme='${theme}';new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  const state=await evaluate(`(()=>{const a=document.querySelector('.cp-session-total'),b=document.querySelector('.cp-session-finish'),h=document.querySelector('.cp-session-heading'),r=a.getBoundingClientRect(),s=b.getBoundingClientRect();return {clock:a.querySelector('b').textContent,fontSize:parseFloat(getComputedStyle(a.querySelector('b')).fontSize),headerHeight:h.getBoundingClientRect().height,sameRow:r.top<s.bottom&&s.top<r.bottom,overlap:r.left<s.right&&r.right>s.left&&r.top<s.bottom&&r.bottom>s.top,overflow:document.querySelector('.cp-page').scrollWidth>document.querySelector('.cp-page').clientWidth+1}})()`);
  assert.equal(state.clock,'67:58');assert.ok(state.fontSize>=32);assert.equal(state.sameRow,true);assert.equal(state.overlap,false);assert.equal(state.overflow,false);
  const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(dir+'/'+theme+'-'+name+'.png',Buffer.from(shot.data,'base64'));
  results.push({theme,name,width,height,...state});
 }
 assert.deepEqual(errors,[]);
 await writeFile(dir+'/verification.json',JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify(results));
} finally {for(const f of cleanup)await f()}
