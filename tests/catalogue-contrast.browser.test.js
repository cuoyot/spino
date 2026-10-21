import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';

test('catalogue native options remain readable in both themes', async t => {
  const {send,evaluate,url}=await openBrowser(t,{companion:true});
  const folder='docs/quality-review/captures/repertoire/2026-10-21-catalogue-contrast-01';
  await mkdir(folder,{recursive:true});
  await send('Page.navigate',{url});
  await evaluate(`new Promise(resolve=>{const timer=setInterval(()=>{const b=document.querySelector('[data-action=piano]');if(b){clearInterval(timer);b.click();document.querySelector('[data-action=catalog]').click();resolve()}},25)})`);
  await evaluate(`new Promise(resolve=>{const timer=setInterval(()=>{if(document.querySelector('select[name=format]')){clearInterval(timer);resolve()}},25)})`);
  const results=[];
  for(const theme of ['dark','light']) {
    await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    const result=await evaluate(`(()=>{const select=document.querySelector('select[name=format]');return {theme:document.documentElement.dataset.theme,options:[...select.options].map(o=>{const s=getComputedStyle(o);return {text:o.textContent,color:s.color,background:s.backgroundColor,scheme:s.colorScheme}}),maintenance:document.querySelectorAll('[data-action=library-reimport],[data-action=library-candidates-download]').length}})()`);
    for(const option of result.options) {
      const luminance=color=>color.match(/\d+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((v,c,i)=>v+c*[.2126,.7152,.0722][i],0);
      const a=luminance(option.color),b=luminance(option.background);
      assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5);
      assert.equal(option.scheme,theme);
    }
    assert.equal(result.maintenance,0);
    results.push(result);
    await writeFile(`${folder}/${theme}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  await writeFile(`${folder}/verification.json`,JSON.stringify(results,null,2));
});
