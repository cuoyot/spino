import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {openBrowser} from '../../tests/browser.js';
import {writeGallery} from './build-gallery.mjs';
import {emptyData,beginSession,saveSession} from '../../src/companion/model.js';
import {quickPractice} from '../../src/companion/quick-practice.js';
import {emptyQuickScore,addQuickAnswer} from '../../src/companion/quick-score.js';
const folder=resolve('docs/quality-review/captures/generated-practice',process.argv[2]),cleanup=[],results=[];
await mkdir(folder,{recursive:true});
try {
 const {send,evaluate,url,errors}=await openBrowser({after:fn=>cleanup.push(fn)},{companion:true});
 const wait=c=>evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(${c}){clearInterval(t);resolve();}else if(++n>500){clearInterval(t);reject(Error('Score timeout'));}},20);})`);
 for(const device of [{id:'phone-portrait',label:'Phone portrait',width:390,height:844},{id:'phone-landscape',label:'Phone landscape',width:844,height:390},{id:'tablet-portrait',label:'Tablet portrait',width:768,height:1024},{id:'tablet-landscape',label:'Tablet landscape',width:1024,height:768}]) {
  await send('Emulation.setDeviceMetricsOverride',{width:device.width,height:device.height,deviceScaleFactor:1,mobile:true});await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
  const fixture=emptyData();fixture.preferences.language='es';const prior=beginSession(quickPractice(fixture.preferences));prior.quickScore=addQuickAnswer(emptyQuickScore(),true,3000);saveSession(fixture,prior);
  await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve();};};})`);
  await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=quick-practice]').click()`);await wait(`document.querySelector('#app-shell').hidden`);
  const capture=async state=>{const shot=await send('Page.captureScreenshot',{format:'png'}),bytes=Buffer.from(shot.data,'base64'),path=`${state}-${device.id}-01.png`;await writeFile(join(folder,path),bytes);results.push({...device,state,frames:[{path,scrollTop:0,sha256:createHash('sha256').update(bytes).digest('hex')}]});};
  await capture('playing');await evaluate(`(()=>{const n=__sr.line.notes[__sr.line.idx],k=document.querySelector('#piano [data-midi="'+n.midi+'"]');k.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1}));k.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));})()`);await wait(`Number(document.querySelector('#s-correct').textContent)===1`);
  await evaluate(`(()=>{const n=__sr.line.notes[__sr.line.idx],k=document.querySelector('#piano [data-midi="'+n.midi+'"]');k.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:2}));k.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:2}));})()`);await wait(`Number(document.querySelector('#s-correct').textContent)===2`);assert.equal(await evaluate(`document.querySelector('#timing-mode').classList.contains('is-record')`),true);await capture('record-beaten');
  await evaluate(`document.querySelector('#practice-advance').click()`);await wait(`document.querySelector('[data-action=quick-finish]')`);await capture('exit-choice');await evaluate(`document.querySelector('[data-action=quick-finish]').click()`);await wait(`document.querySelector('.cp-quick-result')`);await evaluate(`new Promise(resolve=>setTimeout(resolve,700))`);await capture('result');await evaluate(`document.querySelector('[data-action=close-dialog]').click()`);await capture('practice-first');await evaluate(`document.querySelector('.cp-quick-records').scrollIntoView()`);await capture('records');
  assert.ok(await evaluate(`document.querySelector('.cp-quick-records li')`));
 }
 assert.deepEqual(errors,[]);const metadata={date:'2026-10-06',title:'Quick practice game HUD and personal best',surface:'Responsive browser, not native acceptance',fixtures:'Disposable notebook, 100-point previous record and two real answers per layout',sourceSha256:createHash('sha256').update(await readFile('src/companion/quick-score.js')).digest('hex'),results,runtimeErrors:errors};await writeFile(join(folder,'capture.json'),JSON.stringify(metadata,null,2));await writeGallery(folder,metadata);console.log(JSON.stringify({folder,views:results.length}));
}finally{for(const close of cleanup.reverse())await close();}
