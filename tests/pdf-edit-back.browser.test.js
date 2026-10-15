import test from 'node:test';
import assert from 'node:assert/strict';
import {openBrowser,disableWarmup} from './browser.js';
import {scorePDF} from './pdf-fixture.js';

test('Android Back from the opened PDF editing panel returns to running practice', {timeout:45000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const id=setInterval(()=>{if(${condition}){clearInterval(id);resolve()}else if(++n>800){clearInterval(id);reject(Error('Timeout'))}},20)})`);
 const action=name=>evaluate(`document.querySelector('[data-action="${name}"]').click()`);
 await send('Page.navigate',{url});await wait(`document.querySelector('#app-shell h1')`);await disableWarmup(evaluate);
 await action('piano');await action('repertoire');await action('new-work');
 await evaluate(`(()=>{const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob(${JSON.stringify(scorePDF())}),c=>c.charCodeAt(0))],'Timer synthetic.pdf',{type:'application/pdf'}));const input=document.querySelector('[name=score]');input.files=dt.files;input.dispatchEvent(new Event('change'));})()`);
 await wait(`document.querySelector('[name=score]').validity.valid`);await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`);await wait(`document.querySelector('[data-action=practice-work]')`);
 await action('practice-work');await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);await wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);

 await evaluate(`document.querySelector('[data-pdf=timer]').click()`);
 await wait(`document.querySelector('.score-timer').dataset.running==='false'`);
 assert.equal(await evaluate(`document.querySelector('.pdf-panel').hidden`),true);
 await evaluate(`document.querySelector('[data-pdf=tools]').click()`);
 await wait(`!document.querySelector('.pdf-panel').hidden`);
 assert.equal(await evaluate(`document.querySelector('.score-timer').dataset.running`),'false');
 // Match MainActivity's cancelable Back event rather than clicking Done editing.
 const handled=await evaluate(`(()=>{const event=new Event('spino:back',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented})()`);
 assert.equal(handled,true);
 await wait(`document.querySelector('.pdf-viewer')?.dataset.running==='true'`);
 assert.equal(await evaluate(`document.querySelector('.pdf-panel').hidden`),true);
 await evaluate(`window.backTime=Number(document.querySelector('.pdf-time').textContent.split(':')[1])`);
 await wait(`Number(document.querySelector('.pdf-time').textContent.split(':')[1])>=backTime+3`);
 // Edit is directly available while running and pauses automatically.
 assert.equal(await evaluate(`document.querySelector('[data-pdf=tools]').hidden`),false);
 assert.equal(await evaluate(`document.querySelector('[data-pdf=finish]').hidden`),false);
 await evaluate(`document.querySelector('[data-pdf=tools]').click()`);
 await wait(`!document.querySelector('.pdf-panel').hidden && document.querySelector('.pdf-viewer').dataset.running==='false'`);
 await evaluate(`window.dispatchEvent(new Event('spino:back',{cancelable:true}))`);
 await wait(`document.querySelector('.pdf-viewer')?.dataset.running==='true'`);
 // Explicit tool selection follows the same return path.
 await evaluate(`document.querySelector('[data-pdf=timer]').click();document.querySelector('[data-finger="3"]').click()`);
 await evaluate(`window.dispatchEvent(new Event('spino:back',{cancelable:true}))`);
 await wait(`document.querySelector('.pdf-viewer')?.dataset.running==='true'`);
 assert.equal(await evaluate(`document.querySelector('.pdf-paper').dataset.tool`),'read');
 await evaluate(`document.querySelector('[data-pdf=timer]').click();document.querySelector('[data-pdf=close]').click()`);
 await wait(`!document.querySelector('.pdf-viewer')`);
 assert.equal(await evaluate(`document.querySelectorAll('.cp-session-primary-actions [data-action=open-score-practice]').length`),1);
 assert.equal(await evaluate(`document.querySelectorAll('.cp-session-primary-actions [data-action=toggle-session],.cp-session-primary-actions [data-action=open-pdf]').length`),0);
 await action('open-score-practice');await wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);
 assert.equal(await evaluate(`document.querySelector('.pdf-viewer').dataset.running`),'true');
 // A failed annotation save must keep editing paused rather than discard the pending mark on Finish.
 await evaluate(`document.querySelector('[data-pdf=tools]').click()`);
 await wait(`document.querySelector('.score-timer').dataset.running==='false' && !document.querySelector('.pdf-panel').hidden`);
 await evaluate(`document.querySelector('[data-finger="3"]').click();window.originalPut=IDBObjectStore.prototype.put;window.failAsset=true;IDBObjectStore.prototype.put=function(...args){if(this.name==='assets'&&window.failAsset){const tx=this.transaction;queueMicrotask(()=>tx.abort());}return originalPut.apply(this,args)}`);
 const point=await evaluate(`(()=>{const r=document.querySelector('.pdf-paper').getBoundingClientRect();for(let y=Math.max(20,r.top+20);y<Math.min(innerHeight-20,r.bottom);y+=30)for(let x=Math.max(20,r.left+20);x<Math.min(innerWidth-20,r.right);x+=30)if(document.elementFromPoint(x,y)?.closest('.pdf-viewport'))return{x,y};throw Error('No exposed score point')})()`);
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await wait(`document.querySelector('.pdf-save-state').classList.contains('error')`);
 await evaluate(`document.querySelector('[data-pdf=finish]').click()`);
 await wait(`document.querySelector('.pdf-save-state').classList.contains('error')`);
 assert.equal(await evaluate(`document.querySelector('.pdf-viewer').dataset.running`),'false');
 assert.equal(await evaluate(`!!document.querySelector('[name=practicedMinutes]')`),false);
 await evaluate(`window.failAsset=false;document.querySelector('[data-pdf=finish]').click()`);
 await wait(`document.querySelector('[name=practicedMinutes]')`);
 await action('close-dialog');await action('open-score-practice');
 await wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);
 assert.equal(await evaluate(`document.querySelectorAll('.pdf-marks [data-mark-id]').length`),1);
 // Finish is directly available while running and opens feedback without saving history automatically.
 await evaluate(`document.querySelector('[data-pdf=finish]').click()`);
 await wait(`document.querySelector('[name=practicedMinutes]')`);
 assert.equal(await evaluate(`!!document.querySelector('.pdf-viewer')`),false);
 assert.deepEqual(errors,[]);
});
