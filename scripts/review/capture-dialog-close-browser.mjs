import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from '../../tests/browser.js';
const folder=process.env.SPINO_DIALOG_CAPTURE||'docs/quality-review/captures/dialogs/'+new Date().toISOString().replace(/[.:]/g,'-')+'-top-close';
await mkdir(folder,{recursive:true});
test('scrolling companion dialogs retain their top close control and clean up the warm-up player',{timeout:90000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const id=setInterval(()=>{if(${condition}){clearInterval(id);resolve();}else if(++n>500){clearInterval(id);reject(Error('Missing dialog review state'));}},20);})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=reading]').click();const c=document.querySelector('[name=context]');c.value='piano';c.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#prepare-form').requestSubmit()`);
 await wait(`document.querySelector('[data-action=warmup-guide]')`);
 await evaluate(`document.querySelector('[data-action=warmup-guide]').click()`);
 await wait(`document.querySelector('#cp-dialog [data-hanon-animation]')?.dataset.ready==='true'`);
 const frames=[];
 async function capture(surface,theme,layout,width,height){
  for(const scroll of ['top','bottom']){
   await evaluate(`{const body=document.querySelector('#cp-dialog .cp-dialog-body');body.scrollTop=${scroll==='top'?'0':'body.scrollHeight'};}`);
   const state=await evaluate(`(()=>{const d=document.querySelector('#cp-dialog'),body=d.querySelector('.cp-dialog-body'),head=d.querySelector('.cp-dialog-head'),close=head.querySelector('button'),r=close.getBoundingClientRect(),h=head.getBoundingClientRect(),b=body.getBoundingClientRect();return {modal:d.matches(':modal'),visible:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,uncovered:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===close,bodyBelowHeader:b.top>=h.bottom-1,scrollTop:body.scrollTop,scrollRange:body.scrollHeight-body.clientHeight,overflow:d.scrollWidth>d.clientWidth+1||document.documentElement.scrollWidth>innerWidth+1,label:close.textContent};})()`);
   assert.equal(state.modal,true,JSON.stringify({surface,theme,layout,scroll,state}));assert.equal(state.visible,true);assert.equal(state.uncovered,true);assert.equal(state.bodyBelowHeader,true);assert.equal(state.overflow,false);
   if(scroll==='bottom'&&state.scrollRange>1)assert.ok(state.scrollTop>=state.scrollRange-1);
   const file=`${surface}-${theme}-${layout}-${scroll}.png`,shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({file,surface,theme,layout,width,height,scroll,...state});
  }
 }
 for(const theme of ['light','dark'])for(const [layout,width,height]of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768],['narrow-landscape',568,320]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme='${theme}'`);
  await capture('hanon-guide',theme,layout,width,height);
 }
 await send('Emulation.setDeviceMetricsOverride',{width:568,height:320,deviceScaleFactor:1,mobile:true});
 assert.equal(await evaluate(`(()=>{const h=document.querySelector('#cp-dialog .cp-dialog-head h2'),old=h.textContent;h.textContent='W'.repeat(200);const button=h.parentElement.querySelector('button'),r=button.getBoundingClientRect(),body=document.querySelector('#cp-dialog .cp-dialog-body');body.scrollTop=body.scrollHeight;const visible=r.top>=0&&r.bottom<=innerHeight&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===button;h.textContent=old;return visible;})()`),true,'An unbroken long title cannot hide the top Close control');
 await evaluate(`window.__closingHanon=document.querySelector('#cp-dialog [data-hanon-animation]');__closingHanon.querySelector('[data-ha-play]').click();document.querySelector('#cp-dialog .cp-dialog-head button').click()`);
 await wait(`!document.querySelector('#cp-dialog').open&&__closingHanon.dataset.playing==='false'`);
 await evaluate(`document.querySelector('[data-action=discard-session]').click()`);
 const saving=await evaluate(`(()=>{const d=document.querySelector('#cp-dialog');d.querySelector('#cp-confirm').click();const cancel=new Event('cancel',{cancelable:true});d.dispatchEvent(cancel);d.querySelector('.cp-dialog-head button').click();return {open:d.open,busy:d.getAttribute('aria-busy'),closeDisabled:d.querySelector('.cp-dialog-head button').disabled,cancelPrevented:cancel.defaultPrevented};})()`);
 assert.deepEqual(saving,{open:true,busy:'true',closeDisabled:true,cancelPrevented:true});await wait(`!document.querySelector('#cp-dialog').open`);
 await evaluate(`document.querySelector('.cp-app-header [data-action=settings]').click();document.querySelector('[data-action=profile-edit]').click()`);
 for(const [layout,width,height]of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await capture('profile-form','dark',layout,width,height);
 }
 await evaluate(`document.querySelector('#cp-dialog .cp-dialog-head button').click()`);assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`),false);
 assert.deepEqual(errors,[]);
 await writeFile(folder+'/verification.json',JSON.stringify({kind:'Responsive Chromium; production app dialogs; disposable synthetic notebook',date:new Date().toISOString(),version:'6.1.1-beta.4',build:80,buildIndexSHA256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex'),frames,playerStoppedOnClose:true,runtimeErrors:errors},null,2)+'\n');
});
test('tour can close from its top control in a short landscape viewport without changing the notebook',{timeout:30000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en',onboarding:true});
 await send('Emulation.setDeviceMetricsOverride',{width:568,height:320,deviceScaleFactor:1,mobile:true});await send('Page.navigate',{url});
 await evaluate(`new Promise((resolve,reject)=>{let n=0;const id=setInterval(()=>{if(document.querySelector('#cp-walkthrough[open] .cp-tour-head button')){clearInterval(id);resolve();}else if(++n>400){clearInterval(id);reject(Error('Missing tour'));}},20);})`);
 const notebook=()=>evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,r=db.transaction('state').objectStore('state').get('current');r.onsuccess=()=>{resolve(r.result);db.close();}}})`),before=await notebook();
 assert.equal(await evaluate(`(()=>{const card=document.querySelector('.cp-tour-card');card.scrollTop=card.scrollHeight;const b=card.querySelector('.cp-tour-head button'),r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b;})()`),true);
 await evaluate(`document.querySelector('.cp-tour-head button').click()`);assert.equal(await evaluate(`document.querySelector('#cp-walkthrough').open`),false);assert.deepEqual(await notebook(),before);assert.deepEqual(errors,[]);
});
