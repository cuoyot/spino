import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';
test('quick score is shown, saved once at finish and retained after reload', {timeout:60000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const wait=c=>evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(${c}){clearInterval(t);resolve();}else if(++n>500){clearInterval(t);reject(Error('Score timeout'));}},20);})`);
 const read=()=>evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const q=r.result.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{r.result.close();resolve(q.result);};};})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=quick-practice]').click()`);await wait(`document.querySelector('#app-shell').hidden`);
 await evaluate(`(()=>{const n=__sr.line.notes[__sr.line.idx],k=document.querySelector('#piano [data-midi="'+n.midi+'"]');k.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1}));k.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));})()`);
 await wait(`Number(document.querySelector('#s-correct').textContent)===1`);await wait(`Number(document.querySelector('#practice-quick-score').textContent)>0`);
 await evaluate(`window.dispatchEvent(new Event('spino:back',{cancelable:true}))`);await wait(`document.querySelector('[data-action=quick-later]')`);
 assert.equal(await evaluate(`__sr.waiting.paused`),true);
 const pendingId=(await read()).active.id;
 await evaluate(`document.querySelector('[data-action=quick-later]').click()`);
 assert.equal((await read()).active.id,pendingId);assert.equal((await read()).sessions.length,0);
 await evaluate(`document.querySelector('[data-action=resume-session]').click();document.querySelector('[data-action=open-reader]').click()`);await wait(`document.querySelector('#app-shell').hidden`);
 await evaluate(`document.querySelector('#practice-return').click()`);await wait(`document.querySelector('[data-action=quick-continue]')`);
 await evaluate(`document.querySelector('[data-action=quick-continue]').click()`);assert.equal(await evaluate(`__sr.waiting.paused`),false);
 await evaluate(`document.querySelector('#practice-advance').click();document.querySelector('[data-action=quick-finish]').click()`);await wait(`document.querySelector('.cp-quick-result')`);assert.ok(await evaluate(`!!document.querySelector('.cp-today')`));
 const data=await read();assert.equal(data.active,null);assert.equal(data.sessions.length,1);assert.equal(data.sessions[0].quickScore.correct,1);assert.ok(data.sessions[0].quickScore.points>=100);
 assert.match(await evaluate(`document.querySelector('.cp-quick-result').textContent`),/puntos/);
 const previousBest=data.sessions[0].quickScore.points;
 await evaluate(`document.querySelector('.cp-quick-result [data-action=quick-practice]').click()`);await wait(`document.querySelector('#app-shell').hidden`);
 assert.equal(await evaluate(`Number(document.querySelector('[data-quick-best]').textContent)`),previousBest);
 for(let i=0;i<2;i++){
  await evaluate(`(()=>{const n=__sr.line.notes[__sr.line.idx],k=document.querySelector('#piano [data-midi="'+n.midi+'"]');k.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1}));k.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));})()`);
  await wait(`Number(document.querySelector('#s-correct').textContent)===${i+1}`);
 }
 assert.equal(await evaluate(`document.querySelector('#timing-mode').classList.contains('is-record')`),true);
 assert.match(await evaluate(`getComputedStyle(document.querySelector('.quick-record-banner')).animationName`),/quick-record-flash/);
 await evaluate(`document.querySelector('#practice-advance').click();document.querySelector('[data-action=quick-finish]').click()`);await wait(`document.querySelector('.cp-quick-result')`);assert.ok(await evaluate(`!!document.querySelector('.cp-today')`));
 assert.ok(await evaluate(`document.querySelector('.cp-quick-result.is-new-record')`));
 assert.match(await evaluate(`document.querySelector('.quick-result-comparison').textContent`),new RegExp(String(previousBest)));
 await evaluate(`document.querySelector('[data-action=close-dialog]').click()`);await send('Page.reload');await wait(`document.querySelector('.cp-today')`);await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click()`);
 assert.match(await evaluate(`document.querySelector('.cp-quick-records').textContent`),new RegExp(String(data.sessions[0].quickScore.points)));assert.equal((await read()).sessions.length,2);assert.deepEqual(errors,[]);
 assert.equal(await evaluate(`document.querySelector('.cp-quick-records').parentElement.lastElementChild.classList.contains('cp-quick-records')`),true,'Records follow all practice actions');
});
