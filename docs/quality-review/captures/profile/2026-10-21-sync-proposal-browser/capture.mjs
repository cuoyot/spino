import test from 'node:test';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from '/Users/migue/Source/spino/tests/browser.js';
import {driveNotebookBootstrap} from '/Users/migue/Source/spino/scripts/review/drive-notebook-fixture.mjs';
import {syncIndicatorMarkup} from '/Users/migue/Source/spino/src/companion/sync-indicator.js';
const dir='/Users/migue/Source/spino/docs/quality-review/captures/profile/2026-10-21-sync-proposal-browser';
const css=`#app-shell .cp-sync-status,#app-shell .cp-sync-status[data-attention=true]{background:transparent;border:0;color:#617c78;padding:12px;width:44px;height:44px;box-shadow:none;}#app-shell .cp-sync-status svg{width:19px;height:19px;stroke-width:1.6;}#app-shell .cp-sync-status[data-attention=true]{color:#b5473e;}#app-shell .cp-sync-badge{display:none;}#app-shell .cp-header-status{gap:0;}@media(max-width:599px){#app-shell .cp-header-middle{gap:8px;}#app-shell:has(.cp-page[data-view=calendar]) .cp-app-header h1{font-size:18px;}#app-shell .cp-app-header .cp-segment button{font-size:12px;padding:6px 7px;}}`;
test('render proposed subtle sync indicator across screens',{timeout:60000},async t=>{
const b=await openBrowser(t,{companion:true});await b.send('Page.addScriptToEvaluateOnNewDocument',{source:driveNotebookBootstrap({language:'es'})});await b.send('Page.navigate',{url:b.url});
await b.evaluate(`new Promise(resolve=>{const id=setInterval(()=>{if(document.querySelector('.cp-today')){clearInterval(id);resolve();}},20);})`);
await b.evaluate(`document.querySelector('[data-action=settings]').click();document.querySelector('[data-action=profile-backup]').click();document.querySelector('[data-action=drive-connect]').click()`);
await b.evaluate(`new Promise(r=>{const id=setInterval(()=>{const f=document.querySelector('[data-drive-picker]');if(f){clearInterval(id);f.requestSubmit();r();}},20);})`);
await b.evaluate(`new Promise(r=>{const id=setInterval(()=>{if(document.querySelector('[data-sync-status=saved]')){clearInterval(id);r();}},20);})`);
await b.evaluate(`{const style=document.createElement('style');style.textContent=${JSON.stringify(css)};document.head.append(style);}`);
for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
for(const screen of ['home','practice','calendar','settings']){
await b.evaluate(`document.querySelector('[data-action="${screen}"]').click()`);
for(const status of ['saved','error']){
const markup=syncIndicatorMarkup({name:'Synthetic.json',enabled:true,status},{},'es');
await b.evaluate(`document.querySelector('[data-sync-indicator]').innerHTML=${JSON.stringify(markup)};{const detail=document.querySelector('[data-action=profile-backup] small');if(detail)detail.textContent=${JSON.stringify(status==='saved'?'synthetic-owner@example.invalid · Conectado a Google Drive':'synthetic-owner@example.invalid · Requiere atención')};}`);
await b.evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
const shot=await b.send('Page.captureScreenshot',{format:'png'});await writeFile(`${dir}/${screen}-${status}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));
}
}
}
});
