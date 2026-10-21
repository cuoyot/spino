import test from 'node:test';import assert from 'node:assert/strict';import {writeFile,mkdir,readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {openBrowser} from '../../tests/browser.js';
const folder='docs/quality-review/captures/warmups/2026-10-20-hanon-no1-static-beta80/browser';await mkdir(folder,{recursive:true});
test('Reviewed No.1 guide in the actual app dialog uses a disposable synthetic notebook in four orientations',{timeout:90000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});const wait=condition=>evaluate(`new Promise((r,j)=>{let n=0;const id=setInterval(()=>{if(${condition}){clearInterval(id);r(true);}else if(++n>500){clearInterval(id);j(Error('Missing app review state'));}},20);})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=reading]').click();const c=document.querySelector('[name=context]');c.value='piano';c.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#prepare-form').requestSubmit()`);
 await wait(`document.querySelector('[data-action=warmup-guide]')`);await evaluate(`document.querySelector('[data-action=warmup-guide]').click()`);await wait(`document.querySelector('#cp-dialog [data-hanon-animation]')?.dataset.ready==='true'`);
 const frames=[];
 for(const theme of ['light','dark'])for(const [layout,width,height]of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768],['narrow',320,740]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme='${theme}'`);
  for(const [stage,frame]of [['opening',3],['descending',735]]){
   await evaluate(`(async()=>{const d=document.querySelector('#cp-dialog');await d.querySelector('[data-hanon-animation]').hanonPlayer.seek(${frame});d.scrollTop=0;})()`);
   const state=await evaluate(`(()=>{const d=document.querySelector('#cp-dialog'),r=d.getBoundingClientRect(),c=d.querySelector('canvas').getBoundingClientRect();return {modal:d.matches(':modal'),pageOverflow:document.documentElement.scrollWidth>innerWidth+1,dialogOverflow:d.scrollWidth>d.clientWidth+1,bounds:r.x>=0&&r.right<=innerWidth+1&&r.y>=0&&r.bottom<=innerHeight+1,canvas:[c.width,c.height],exercise:d.querySelector('.cp-warmup-guide').dataset.exercise};})()`);
   assert.equal(state.modal,true);assert.equal(state.pageOverflow,false);assert.equal(state.dialogOverflow,false);assert.equal(state.bounds,true);assert.ok(Math.abs(state.canvas[0]/state.canvas[1]-1.8)<.01);
   const file=`${theme}-${layout}-${stage}.png`,image=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(image.data,'base64'));frames.push({file,theme,layout,width,height,stage,frame,...state});
  }
 }
 const fixture=await evaluate(`new Promise(r=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,g=db.transaction('state').objectStore('state').get('current');g.onsuccess=()=>{r(g.result);db.close();}};})`);await writeFile(folder+'/fixture.json',JSON.stringify(fixture,null,2)+'\n');
 assert.deepEqual(errors,[]);await writeFile(folder+'/verification.json',JSON.stringify({version:'6.1.1-beta.4',build:80,kind:'Actual production app dialog; responsive Chromium; disposable synthetic notebook',date:new Date().toISOString(),animationIndexSHA256:createHash('sha256').update(await readFile('public/warmups/hanon-frames-v2/index.json')).digest('hex'),buildIndexSHA256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex'),frames,runtimeErrors:errors},null,2)+'\n');
});
