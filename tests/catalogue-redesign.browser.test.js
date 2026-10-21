import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';
import { workDetailFixture } from './work-detail-fixture.js';
import { importLibrary, catalogueRecords, digest } from '../src/companion/library.js';
import { processScore } from '../src/companion/library-pipeline.js';
import { mxlFixture } from './musicxml-fixture.js';
import { bytesToBase64 } from '../src/companion/musicxml-document.js';

const folder='docs/quality-review/captures/repertoire/2026-10-21-catalogue-rows-01';
test('compact unified catalogue: continuous scroll, global search, downloaded scores and repertoire lifecycle', {timeout:120000}, async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>400){clearInterval(timer);reject(Error('Timeout: '+${JSON.stringify(condition)}))}},25)})`);
  const click=action=>evaluate(action === 'library-clear' ? `(()=>{const form=document.querySelector('#library-search');form.elements.query.value='';form.elements.format.value='';form.elements.composer.value='';form.requestSubmit();document.querySelector('[data-action=library-all]').click()})()` : `document.querySelector('[data-action="${action}"]').click()`);
  const fixture=workDetailFixture(), library=await importLibrary({read:path=>readFile('Exercises_Library/'+path,'utf8')});
  const record=catalogueRecords(library).find(r=>r.assets.length), bytes=mxlFixture(), sha256=await digest(bytes);
  const asset={id:'catalogue-synthetic-xml',pieceId:record.piece_id,sourceAssetId:record.assets[0].asset_id,sha256,format:'mxl',base64:bytesToBase64(bytes)};
  library.executions[record.piece_id]={...await processScore(asset,record,{includeSegments:false}),assetId:asset.id,sourceAssetId:asset.sourceAssetId,sha256};
  fixture.assets.push(asset);
  fixture.data.downloads=[{catalogId:'mutopia-202',assetId:'history-pdf',title:'La Candeur',revision:'1'}];
  fixture.data.preferences.wifiOnly=false;
  await mkdir(folder,{recursive:true});
  await writeFile(folder+'/fixture.json',JSON.stringify({fixture,library},null,2));
  await send('Page.navigate',{url});await wait(`document.querySelector('[data-action=piano]')`);await click('piano');await click('catalog');await wait(`document.querySelector('.cp-catalogue-row')`);
  await evaluate(`new Promise((resolve,reject)=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${JSON.stringify(fixture.data)},'current');tx.objectStore('state').put(${JSON.stringify(library)},'repertoire-library-v2');for(const asset of ${JSON.stringify(fixture.assets)})tx.objectStore('assets').put(asset);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}})`);
  await send('Page.reload');await wait(`document.querySelector('[data-action=piano]')`);await click('piano');await click('catalog');await wait(`document.querySelector('.cp-catalogue-row')`);
  const shot=async name=>writeFile(`${folder}/${name}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    await click('library-clear');
    assert.equal(await evaluate(`document.querySelectorAll('.cp-catalogue-row').length`),24);
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
    assert.equal(await evaluate(`document.querySelectorAll('.cp-catalogue-row:not(:has(.is-local)) [data-action="library-add-work"],.cp-catalogue-row:not(:has(.is-local)) [data-action="add-catalog-work"]').length`),0);
    await shot(`catalogue-${width}x${height}`);
    await click('library-downloaded');assert.equal(await evaluate(`document.querySelectorAll('.cp-catalogue-row').length`),2);
    await shot(`downloaded-${width}x${height}`);
    await click('downloads');await shot(`transfers-${width}x${height}`);
    assert.equal(await evaluate(`document.querySelectorAll('.cp-card').length`),0);
    await click('catalog');
  }
  await click('library-clear');
  await evaluate(`document.querySelector('.cp-page').scrollTop=100000`);
  await wait(`document.querySelectorAll('.cp-catalogue-row').length>=48`);
  await evaluate(`document.querySelector('.cp-page').scrollTop=100000`);
  await wait(`document.querySelectorAll('.cp-catalogue-row').length===65`);
  assert.equal(await evaluate(`document.querySelector('[data-action=library-more]')`),null);
  const scroll=await evaluate(`document.querySelector('.cp-page').scrollTop`);
  await evaluate(`document.querySelector('[data-action=library-detail]').click()`);await wait(`document.querySelector('[data-action=catalog]')`);await click('catalog');
  assert.equal(await evaluate(`document.querySelectorAll('.cp-catalogue-row').length`),65);
  assert.equal(await evaluate(`Math.abs(document.querySelector('.cp-page').scrollTop-${scroll})<3`),true);
  await evaluate(`const input=document.querySelector('#catalogue-query');input.focus();input.value='Bach';input.dispatchEvent(new Event('input',{bubbles:true}))`);
  await wait(`document.querySelector('#library-results').textContent!=='65 partituras'`);
  assert.ok(await evaluate(`document.querySelectorAll('[data-pdf-id]').length>0&&document.querySelectorAll('[data-piece-id]').length>0`));
  assert.equal(await evaluate(`document.activeElement.id`),'catalogue-query');
  await click('library-downloaded');assert.equal(await evaluate(`document.querySelectorAll('.cp-catalogue-row').length`),0);
  await click('library-clear');await click('library-downloaded');
  await click('add-catalog-work');await wait(`document.querySelector('[data-pdf-id] [data-action=work-detail]')`);
  await click('library-add-work');await wait(`document.querySelector('[data-piece-id] [data-action=work-detail]')`);
  const state=await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction('state'),r=tx.objectStore('state').get('current');r.onsuccess=()=>{resolve(r.result);db.close()}}})`);
  assert.equal(state.works.filter(w=>w.catalogId==='mutopia-202').length,1);
  assert.equal(state.works.filter(w=>w.libraryId===record.piece_id).length,1);
  assert.deepEqual(state.sessions,fixture.data.sessions);
  assert.deepEqual(errors,[]);
  await writeFile(folder+'/verification.json',JSON.stringify({kind:'responsive browser',syntheticNotebook:true,viewports:4,totalScores:65,initialRows:24,continuousRows:65,globalSearch:true,downloadedFilter:true,repertoireAfterDownload:true,historyPreserved:true,errors},null,2));
});

test('download actions expose repertoire only after PDF and XML acquisition completes', {timeout:60000}, async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('Timeout: '+${JSON.stringify(condition)}))}},20)})`);
  const click=action=>evaluate(`document.querySelector('[data-action="${action}"]').click()`);
  await send('Page.navigate',{url});await wait(`document.querySelector('[data-action=piano]')`);await click('piano');await click('catalog');await wait(`document.querySelector('.cp-catalogue-row')`);
  await click('downloads');await evaluate(`const input=document.querySelector('#wifi-only');input.checked=false;input.dispatchEvent(new Event('change',{bubbles:true}))`);await click('catalog');
  const xml=Buffer.from(mxlFixture()).toString('base64');
  const {scorePDF}=await import('./pdf-fixture.js'), pdf=scorePDF();
  await evaluate(`window.catalogueOriginalFetch=fetch;window.fetch=(url,options)=>String(url).startsWith('https://raw.githubusercontent.com/')?Promise.resolve(new Response(Uint8Array.from(atob(${JSON.stringify(xml)}),c=>c.charCodeAt(0)),{headers:{'Content-Type':'application/octet-stream'}})):String(url).startsWith('https://www.mutopiaproject.org/ftp/')?Promise.resolve(new Response(Uint8Array.from(atob(${JSON.stringify(pdf)}),c=>c.charCodeAt(0)),{headers:{'Content-Type':'application/pdf'}})):catalogueOriginalFetch(url,options)`);
  const snapshot=()=>evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets']),state=tx.objectStore('state').getAll(),assets=tx.objectStore('assets').getAll();tx.oncomplete=()=>{resolve({state:state.result,assets:assets.result});db.close()}}})`);
  const beforePreview=await snapshot();
  await evaluate(`document.querySelector('[data-piece-id] [data-action=catalogue-preview]').click()`);
  await wait(`document.querySelector('[data-catalogue-preview] svg')`);
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate(`document.querySelector('#cp-dialog').getBoundingClientRect().width<=innerWidth`),true);
    await writeFile(`${folder}/preview-xml-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await click('close-dialog');assert.deepEqual(await snapshot(),beforePreview,'preview does not create downloads, repertoire, analysis or assets');
  await evaluate(`document.querySelector('[data-piece-id] [data-action=library-download]').click()`);
  await wait(`document.querySelector('[data-piece-id] [data-action=library-add-work]')`);
  await evaluate(`const form=document.querySelector('#library-search');form.elements.query.value='La Candeur';form.requestSubmit()`);
  assert.equal(await evaluate(`!!document.querySelector('[data-action=add-catalog-work]')`),false);
  const beforePDFPreview=await snapshot();
  await evaluate(`window.syntheticDownloadFetch=fetch;window.fetch=()=>Promise.reject(Error('Synthetic offline network'))`);
  await click('catalogue-preview');await wait(`document.querySelector('[data-catalogue-preview] img')`);
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate(`document.querySelector('#cp-dialog').getBoundingClientRect().width<=innerWidth`),true);
    await writeFile(`${folder}/preview-pdf-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await click('close-dialog');assert.deepEqual(await snapshot(),beforePDFPreview);
  await evaluate(`window.fetch=syntheticDownloadFetch`);
  await click('download-piece');await wait(`document.querySelector('[data-action=add-catalog-work]')`);
  await click('add-catalog-work');await wait(`document.querySelector('[data-pdf-id] [data-action=work-detail]')`);
  await click('downloads');assert.equal(await evaluate(`document.querySelectorAll('.cp-transfer-completed .cp-transfer-row').length`),2);
  assert.deepEqual(errors,[]);
});

test('public catalogue sources render real PDF and XML previews', {timeout:90000,skip:process.env.VERIFY_CATALOG_PREVIEWS!=='1'}, async t=>{
  const {send,evaluate,url}=await openBrowser(t,{companion:true});
  const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>1000){clearInterval(timer);reject(Error(document.querySelector('[data-catalogue-preview]')?.textContent||'Preview timeout'))}},30)})`);
  const click=action=>evaluate(`document.querySelector('[data-action="${action}"]').click()`);
  await send('Emulation.setDeviceMetricsOverride',{width:768,height:1024,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url});await wait(`document.querySelector('[data-action=piano]')`);await click('piano');await click('catalog');await wait(`document.querySelector('.cp-catalogue-row')`);
  await click('downloads');await evaluate(`const input=document.querySelector('#wifi-only');input.checked=false;input.dispatchEvent(new Event('change',{bubbles:true}))`);await click('catalog');
  await evaluate(`document.querySelector('[data-piece-id] [data-action=catalogue-preview]').click()`);
  await wait(`document.querySelector('[data-catalogue-preview] svg')`);
  await writeFile(folder+'/real-preview-xml-tablet.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await click('close-dialog');
  await evaluate(`const form=document.querySelector('#library-search');form.elements.query.value='La Candeur';form.requestSubmit()`);
  await click('catalogue-preview');await wait(`document.querySelector('[data-catalogue-preview] img')`);
  await writeFile(folder+'/real-preview-pdf-tablet.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  await click('close-dialog');
  assert.equal(await evaluate(`document.querySelector('[data-action=library-downloaded]').textContent.includes('0')`),true);
});
