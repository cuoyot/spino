import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';
import {scorePDF} from './pdf-fixture.js';
import {mxlFixture} from './musicxml-fixture.js';

test('management print icons invoke printing without opening score or custom preview', {timeout:90000},async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    const getter=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'contentWindow').get;
    Object.defineProperty(HTMLIFrameElement.prototype,'contentWindow',{get(){const child=getter.call(this);if(child)child.print=()=>{window.printed=(window.printed||0)+1;window.pages=child.document.images.length;child.dispatchEvent(new Event('afterprint'));};return child;}});
  `});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url});
  const wait=c=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${c}){clearInterval(timer);resolve();}else if(++n>1000){clearInterval(timer);reject(Error('Management print timeout'));}},20);})`);
  const click=action=>evaluate(`document.querySelector('[data-action=${action}]').click()`);
  await wait(`document.querySelector('.cp-today')`);
  await evaluate(`window.fixture=${JSON.stringify(scorePDF())};window.originalFileClick=HTMLInputElement.prototype.click;HTMLInputElement.prototype.click=function(){if(this.type==='file'){const transfer=new DataTransfer();transfer.items.add(new File([Uint8Array.from(atob(fixture),c=>c.charCodeAt(0))],'Printing fixture.pdf',{type:'application/pdf'}));this.files=transfer.files;this.dispatchEvent(new Event('change'));}else originalFileClick.call(this);};`);
  await click('piano');await click('repertoire');await click('import-pdf');
  await wait(`document.querySelector('#cp-dialog [name=score]')?.validity.valid`);
  await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`);await wait(`document.querySelector('[data-action=print-work]')`);
  await click('print-work');await wait(`window.printed===1`);assert.equal(await evaluate('window.pages'),2);
  assert.equal(await evaluate(`!!document.querySelector('.pdf-viewer,.score-print-preview')`),false);
  await click('piano');await click('repertoire');
  await mkdir('docs/quality-review/captures/printing/2026-10-07-direct-print',{recursive:true});
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth<=document.querySelector('.cp-page').clientWidth+1`),true);
    const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`docs/quality-review/captures/printing/2026-10-07-direct-print/repertoire-${width}x${height}.png`,Buffer.from(shot.data,'base64'));
  }
  await click('print-work');await wait(`window.printed===2`);
  const id='mt_eb69b7b3cfc165d7',base64=Buffer.from(mxlFixture()).toString('base64');
  await click('catalog');await click('downloads');await evaluate(`document.querySelector('#wifi-only').checked=false;document.querySelector('#wifi-only').dispatchEvent(new Event('change',{bubbles:true}))`);
  await click('catalog');await click('library-clear');
  await evaluate(`document.querySelector('#library-search [name=query]').value='${id}';document.querySelector('#library-search').requestSubmit();document.querySelector('[data-action=library-detail]').click()`);
  assert.equal(await evaluate(`!!document.querySelector('[data-action=library-print]')`),false,'No print action before the file is acquired');
  await evaluate(`window.originalFetch=fetch;window.fetch=(url,options)=>String(url).startsWith('https://raw.githubusercontent.com/')?Promise.resolve(new Response(Uint8Array.from(atob(${JSON.stringify(base64)}),c=>c.charCodeAt(0)),{headers:{'Content-Type':'application/octet-stream'}})):originalFetch(url,options)`);
  await click('library-download');await wait(`document.querySelector('[data-action=library-print]')`);
  await click('library-print');await wait(`window.printed===3`);
  assert.equal(await evaluate(`!!document.querySelector('.pdf-viewer,.score-print-preview')`),false);
  await click('catalog');await wait(`document.querySelector('.cp-library-list [data-action=library-print]')`);
  await click('library-print');await wait(`window.printed===4`);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await mkdir('docs/quality-review/captures/printing/2026-10-07-direct-print',{recursive:true});
  const image=await send('Page.captureScreenshot',{format:'png'});await writeFile('docs/quality-review/captures/printing/2026-10-07-direct-print/catalog-phone.png',Buffer.from(image.data,'base64'));
  assert.deepEqual(errors,[]);
});
