import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readdir,readFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
import {scorePDF} from './pdf-fixture.js';

test('light appearance keeps main screens, form labels and floating PDF tools legible in four layouts', {timeout:120000}, async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});
 const wait=c=>evaluate(`new Promise((resolve,reject)=>{let n=0;const id=setInterval(()=>{if(${c}){clearInterval(id);resolve()}else if(++n>500){clearInterval(id);reject(Error('Timeout'))}},20)})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 await evaluate(`document.querySelector('[data-action=settings]').click();document.querySelector('[data-action=profile-appearance]').click();document.querySelector('[data-action=set-theme][data-id=light]').click();document.querySelector('[data-action=close-dialog]').click()`);
 const folder='docs/quality-review/captures/themes/2026-10-14-light-contrast';await mkdir(folder,{recursive:true});
 const pdfCSS=(await readdir('dist/assets')).find(n=>/^pdf-viewer-.*\.css$/.test(n));
 await evaluate(`new Promise(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/${pdfCSS}';link.onload=resolve;document.head.append(link)})`);
 const results=[];
 const audit=async state=>{
  const failures=await evaluate(`(()=>{
   const rgb=s=>(s.match(/[\\d.]+/g)||[]).map(Number),lum=c=>c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
   const out=[];
   for(const e of document.querySelectorAll('#app-shell *,dialog[open] *')){
    if(!e.getClientRects().length||e.closest('[hidden]')||e.matches(':disabled')||!Array.from(e.childNodes).some(n=>n.nodeType===3&&n.textContent.trim()))continue;
    const s=getComputedStyle(e);if(Number(s.opacity)<1)continue;
    let bg=[243,245,250];for(let p=e;p;p=p.parentElement){const b=rgb(getComputedStyle(p).backgroundColor);if(b.length>=3&&(b[3]??1)>.9){bg=b;break;}}
    const a=lum(rgb(s.color)),b=lum(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05),large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&Number(s.fontWeight)>=700);
    if(ratio<(large?3:4.5))out.push({tag:e.tagName,class:e.className,text:e.textContent.trim().slice(0,60),color:s.color,bg,ratio});
   }return out;
  })()`);
  results.push({state,failures});assert.deepEqual(failures,[],state);
 };
 let chunk;for(const n of (await readdir('dist/assets')).filter(n=>/^pdf-viewer-.*\.js$/.test(n)))if(/\bas openScore\b/.test(await readFile(`dist/assets/${n}`,'utf8')))chunk=n;
 for(const [layout,width,height] of [['phone-portrait',402,874],['phone-landscape',874,402],['tablet-portrait',820,1180],['tablet-landscape',1180,820]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  const capture=async state=>{await audit(`${layout}/${state}`);const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${folder}/${state}-${layout}.png`,Buffer.from(shot.data,'base64'));};
  for(const view of ['home','practice','calendar','piano','progress','settings']){await evaluate(`document.querySelector('[data-action=${view}]').click()`);await capture(view);}
  for(const action of ['profile-practice','profile-backup','profile-reminders','profile-appearance']){await evaluate(`document.querySelector('[data-action=settings]').click();document.querySelector('[data-action=${action}]').click()`);await capture(action);await evaluate(`document.querySelector('#cp-dialog[open] [data-action=close-dialog]')?.click()`);}
  await evaluate(`document.querySelector('[data-action=settings]').click();document.querySelector('[data-action=profile-edit]').click()`);await capture('profile-form');await evaluate(`document.querySelector('[data-action=close-dialog]').click()`);
  await evaluate(`(async()=>{window.reviewPDF=await(await import('/assets/${chunk}')).openScore({asset:${JSON.stringify({id:'contrast-fixture',type:'application/pdf',base64:scorePDF()})},save:async()=>{}})})()`);
  await wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);
  await evaluate(`document.querySelector('[data-pdf=tools]').click()`);await capture('pdf-tools');
  await evaluate(`document.querySelector('[data-pdf=view]').click()`);await capture('pdf-framing');
  assert.match(await evaluate(`getComputedStyle(document.querySelector('.pdf-widget')).backgroundColor`),/^rgba\(255, 255, 255, 0\.96/);
  await evaluate(`reviewPDF.close()`);await wait(`!document.querySelector('.pdf-viewer')`);
 }
 await writeFile(`${folder}/contrast.json`,JSON.stringify(results,null,2));assert.deepEqual(errors,[]);
});
