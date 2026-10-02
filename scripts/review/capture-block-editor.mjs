import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { openBrowser } from '../../tests/browser.js';
import { sessionFixtures } from './session-fixtures.mjs';
import { writeGallery } from './build-gallery.mjs';

const runId = process.argv[2], sourceRun = process.argv[3];
assert.match(runId || '', /^[a-z0-9-]+$/); assert.match(sourceRun || '', /^[a-z0-9-]+$/);
const folder = resolve('docs/quality-review/captures/session', runId);
await mkdir(folder);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const source = JSON.parse(await readFile(resolve(folder, '..', sourceRun, 'capture.json'), 'utf8'));
for (const [file, expected] of Object.entries(source.sourceFiles)) assert.equal(hash(await readFile(file)), expected, 'Capture source must match ' + file);
const sizes = [{ id:'phone-portrait',width:390,height:844 },{ id:'phone-landscape',width:844,height:390 },{ id:'tablet-portrait',width:768,height:1024 },{ id:'tablet-landscape',width:1024,height:768 }];
const cleanup = [], results = [];
try {
  const { send, evaluate, url, errors } = await openBrowser({after: fn => cleanup.push(fn)}, { companion:true });
  const wait = condition => evaluate('new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if('+condition+'){clearInterval(timer);resolve();}else if(++n>600){clearInterval(timer);reject(Error("Editor capture timed out"));}},20);})');
  await send('Page.navigate',{url}); await wait('document.querySelector(".cp-today")');
  for (const language of ['en','es']) {
    const fixture = sessionFixtures().resumed; fixture.preferences.language = language;
    await writeFile(join(folder,language+'.fixture.json'),JSON.stringify(fixture,null,2)+'\n');
    for (const device of sizes) {
      await send('Emulation.setDeviceMetricsOverride',{width:device.width,height:device.height,deviceScaleFactor:1,mobile:true});
      await evaluate('new Promise(resolve=>{const r=indexedDB.open("cuaderno-piano",1);r.onsuccess=()=>{const tx=r.result.transaction("state","readwrite");tx.objectStore("state").put('+JSON.stringify(fixture)+',"current");tx.oncomplete=()=>{r.result.close();resolve();};};})');
      await send('Page.reload'); await wait('document.querySelector("[data-action=resume-session]")');
      await evaluate('document.querySelector("[data-action=resume-session]").click();document.querySelector("[aria-current=step] [data-action=session-block-edit]").click();document.querySelector("#cp-toast").hidden=true');
      await wait('document.querySelector("#session-block-form")'); await evaluate('document.fonts.ready');
      for (const expanded of [false,true]) {
        await evaluate('document.querySelector(".cp-block-editor-more").open='+expanded+';document.querySelector(".cp-dialog-body").scrollTop=0');
        const metrics = await evaluate('(()=>{const e=document.querySelector(".cp-dialog-body"),r=e.getBoundingClientRect(),b=document.querySelector("#session-block-form button[type=submit]").getBoundingClientRect();return{scrollHeight:e.scrollHeight,page:{height:e.clientHeight},horizontalOverflow:e.scrollWidth>e.clientWidth+1,submitVisible:b.bottom<=r.bottom&&b.top>=r.top}})()');
        assert.equal(metrics.horizontalOverflow,false);
        const max = Math.max(0,metrics.scrollHeight-metrics.page.height), offsets = [0];
        while(offsets.at(-1)<max) offsets.push(Math.min(max,offsets.at(-1)+Math.floor(metrics.page.height*.8)));
        const state = language+(expanded?'-more':'-basic'), frames = [];
        for(const [index,offset] of offsets.entries()) {
          await evaluate('document.querySelector(".cp-dialog-body").scrollTop='+offset+';new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
          const shot=await send('Page.captureScreenshot',{format:'png'}), bytes=Buffer.from(shot.data,'base64');
          const name=state+'-'+device.id+'-'+(index+1)+'.png';await writeFile(join(folder,name),bytes);
          frames.push({path:name,scrollTop:await evaluate('document.querySelector(".cp-dialog-body").scrollTop'),sha256:hash(bytes)});
        }
        results.push({state,...device,label:device.id,metrics,frames});
      }
    }
  }
  assert.deepEqual(errors,[]);
  const metadata={runId,title:'Edit practice block',reviewHref:'../../../session.md',screen:'PRACTICE-09',stateLabels:{'en-basic':'English · main fields','es-basic':'Español · main fields','en-more':'English · more settings','es-more':'Español · more settings'},label:'Block editor · responsive browser evidence',createdAt:new Date().toISOString(),surface:'Disposable Chromium notebooks; not native-device acceptance.',fixture:'Resumed fixture per language; Today Resume → current block Edit. No installed data changed.',sourceSha256:source.sourceSha256,sourceFiles:source.sourceFiles,sourceRun,renderer:await send('Browser.getVersion'),results,runtimeErrors:errors};
  await writeFile(join(folder,'capture.json'),JSON.stringify(metadata,null,2)+'\n');await writeGallery(folder,metadata);
  console.log(JSON.stringify({folder,views:results.length,captures:results.reduce((n,r)=>n+r.frames.length,0)}));
} finally { for(const close of cleanup.reverse())await close(); }
