import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { openBrowser } from '../../tests/browser.js';
import { musicXMLFixture } from '../../tests/musicxml-fixture.js';
import { writeGallery } from './build-gallery.mjs';

const runId=process.argv[2]; assert.match(runId||'',/^[a-z0-9-]+$/);
const folder=resolve('docs/quality-review/captures/session',runId);
await mkdir(folder,{recursive:false});
const hash=b=>createHash('sha256').update(b).digest('hex'), cleanup=[],results=[];
const xml=musicXMLFixture(),asset={base64:Buffer.from(xml).toString('base64'),format:'musicxml',sha256:hash(xml)};
const devices=[{id:'phone-portrait',label:'Phone portrait',width:390,height:844},{id:'phone-landscape',label:'Phone landscape',width:844,height:390},{id:'tablet-portrait',label:'Tablet portrait',width:768,height:1024},{id:'tablet-landscape',label:'Tablet landscape',width:1024,height:768}];
try{
 const {send,evaluate,url,errors}=await openBrowser({after:fn=>cleanup.push(fn)},{companion:true,language:'es'});
 const chunk=(await readdir('dist/assets')).find(n=>/^musicxml-viewer-.*\.js$/.test(n));assert.ok(chunk);
 const viewerCSS=(await readdir('dist/assets')).filter(n=>/^pdf-viewer-.*\.css$/.test(n));
 const wait=c=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${c}){clearInterval(timer);resolve();}else if(++n>600){clearInterval(timer);reject(Error('MusicXML capture timeout'));}},20);})`);
 for(const device of devices){
  await send('Emulation.setDeviceMetricsOverride',{...device,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
  await evaluate(`Promise.all(${JSON.stringify(viewerCSS)}.map(name=>new Promise(resolve=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/'+name;link.onload=resolve;document.head.append(link);})))`);
  await evaluate(`(async()=>{window.reviewMarks=[];window.reviewRunning=true;window.reviewViewer=await(await import('/assets/${chunk}')).openMusicScore({asset:${JSON.stringify(asset)},selection:['P'],end:8,saveMarks:async value=>{reviewMarks=value;},session:{read:()=>({running:reviewRunning,time:'8:00'}),toggle:()=>{reviewRunning=!reviewRunning;},finish:async()=>{},measurement:()=>({correct:0,wrong:0})}});})()`);
  await wait(`document.querySelector('.xml-score svg')`);
  for(const state of ['running','paused','follow','annotations']){
   if(state==='annotations'){
    await evaluate(`document.querySelector('[data-xml-digit="2"]').click();document.querySelector('[data-xml-color="#2878c8"]').click()`);
    const note=await evaluate(`(()=>{const r=document.querySelector('[data-xml-note]').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};})()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...note,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...note,button:'left',clickCount:1});
    await wait(`reviewMarks.length===1`);
    await evaluate(`document.querySelector('[data-xml-digit="3"]').click();document.querySelector('[data-xml-color="#22845a"]').click()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...note,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...note,button:'left',clickCount:1});
    await wait(`reviewMarks.length===1&&reviewMarks[0].digit==='3'&&reviewMarks[0].color==='#22845a'`);
    assert.equal(await evaluate(`!!document.querySelector('[data-xml-mark="highlight"]')`),false);
   }
   if(state==='paused')await evaluate(`document.querySelector('[data-xml=pause]').click()`);
   if(state==='follow'){
    await evaluate(`document.querySelector('[data-xml=options]')?.click();const z=document.querySelector('[data-xml-zoom]');if(z){z.value='80';z.dispatchEvent(new Event('change',{bubbles:true}));}`);
    await evaluate(`{const button=document.querySelector('[data-xml=follow]');if(button.getAttribute('aria-pressed')!=='true')button.click();}`);
    await wait(`document.querySelector('[data-xml=follow]').getAttribute('aria-pressed')==='true'`);
   }
   await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
   const bytes=Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'),path=`${state}-${device.id}-01.png`;
   await writeFile(join(folder,path),bytes);
   const probes=await evaluate(`(()=>{const w=document.querySelector('.pdf-widget'),r=w.getBoundingClientRect();return{widget:{x:r.x,y:r.y,width:r.width,height:r.height},followPending:document.querySelector('.xml-score-viewer').dataset.followPending,buttons:[...w.querySelectorAll('button')].filter(b=>!b.hidden).map(b=>({action:b.dataset.xml,label:b.getAttribute('aria-label')||b.textContent}))};})()`);
   results.push({state,...device,probes,frames:[{path,scrollTop:0,sha256:hash(bytes)}]});
   if(state==='paused'&&await evaluate(`!!document.querySelector('[data-xml=options]')`)){
    assert.equal(await evaluate(`document.querySelector('[data-xml=pause] .pdf-time').textContent`),'8:00');
    assert.equal(await evaluate(`document.querySelector('[data-xml=pause]').nextElementSibling.dataset.xml`),'finish');
   }
  }
  if(process.argv.includes('--verify-reflow')){
   const original=await evaluate(`JSON.stringify(reviewMarks)`);
   await evaluate(`{document.querySelector('[data-xml=done]').click();document.querySelector('[data-xml=options]').click();const z=document.querySelector('[data-xml-zoom]');z.value='120';z.dispatchEvent(new Event('change',{bubbles:true}));}`);
   assert.equal(await evaluate(`JSON.stringify(reviewMarks)`),original);
   assert.equal(await evaluate(`document.querySelector('.xml-score span')?.textContent`),'3');
   await send('Emulation.setDeviceMetricsOverride',{width:device.height,height:device.width,deviceScaleFactor:1,mobile:true});
   await wait(`document.querySelector('.xml-score span')?.textContent==='3'`);
   await evaluate(`reviewViewer.close()`);
   await evaluate(`new Promise(resolve=>{const req=indexedDB.open('cuaderno-piano',1);req.onsuccess=()=>{const db=req.result,tx=db.transaction('assets','readwrite');tx.objectStore('assets').put({...${JSON.stringify(asset)},id:'review-xml',musicxmlMarks:reviewMarks});tx.oncomplete=()=>{db.close();resolve();};};})`);
   await evaluate(`(async()=>{const saved=await new Promise(resolve=>{const req=indexedDB.open('cuaderno-piano',1);req.onsuccess=()=>{const db=req.result,q=db.transaction('assets').objectStore('assets').get('review-xml');q.onsuccess=()=>{resolve(q.result);db.close();};};});reviewViewer=await(await import('/assets/${chunk}')).openMusicScore({asset:saved,selection:['P'],end:8});})()`);
   await wait(`document.querySelector('.xml-score span')?.textContent==='3'`);
   assert.equal(await evaluate(`document.querySelector('.xml-score span').style.color`),'rgb(34, 132, 90)');
  }
  await evaluate(`reviewViewer.close()`);
 }
 assert.deepEqual(errors,[]);
 const metadata={runId,date:'2026-10-05',createdAt:new Date().toISOString(),title:'MusicXML practice baseline',reviewHref:'../../../manual-practice.md',screen:'PRACTICE-05 / SCORE MusicXML',surface:'Responsive production Chromium, not native acceptance',fixtures:'Disposable browser notebook; original synthetic MusicXML piano part; direct viewer entry with synthetic session clock, no personal data or real MIDI.',stateLabels:{running:'MusicXML · practising',paused:'MusicXML · paused',follow:'MusicXML · MIDI follow (no device)'},sourceSha256:hash(await readFile('src/companion/musicxml-viewer.js')),buildSha256:hash(await readFile(`dist/assets/${chunk}`)),fixtureSha256:asset.sha256,renderer:await send('Browser.getVersion'),results,runtimeErrors:errors};
 await writeFile(join(folder,'capture.json'),JSON.stringify(metadata,null,2));await writeGallery(folder,metadata);
 console.log(JSON.stringify({folder,views:results.length}));
}finally{for(const close of cleanup.reverse())await close();}
