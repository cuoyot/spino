import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { openBrowser, disableWarmup } from '../../tests/browser.js';
import { scorePDF } from '../../tests/pdf-fixture.js';
import { writeGallery } from './build-gallery.mjs';

const runId = process.argv[2];
assert.match(runId || '', /^[a-z0-9-]+$/);
const folder = resolve('docs/quality-review/captures/session', runId);
await mkdir(folder, { recursive: false });
const cleanup = [], results = [], hash = value => createHash('sha256').update(value).digest('hex');
async function sources(dir) {
  return (await Promise.all((await readdir(dir, { withFileTypes: true })).map(e => e.isDirectory() ? sources(join(dir,e.name)) : [join(dir,e.name)]))).flat();
}
const sourceFiles = Object.fromEntries(await Promise.all((await sources('src')).sort().map(async path => [path.replaceAll('\\','/'), hash(await readFile(path))])));
const devices = [
  {id:'phone-portrait',label:'Phone portrait',width:390,height:844},
  {id:'phone-landscape',label:'Phone landscape',width:844,height:390},
  {id:'tablet-portrait',label:'Tablet portrait',width:768,height:1024},
  {id:'tablet-landscape',label:'Tablet landscape',width:1024,height:768},
];
try {
  const {send,evaluate,url,errors} = await openBrowser({after:fn=>cleanup.push(fn)}, {companion:true,language:'es'});
  await send('Emulation.setTimezoneOverride',{timezoneId:'Europe/Madrid'});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`{const OriginalDate=Date;window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:['2026-10-05T12:00:00+02:00']));}static now(){return 1791194400000;}};}`});
  const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>800){clearInterval(timer);reject(Error('Capture timeout'));}},20);})`);
  const action = name => evaluate(`document.querySelector('[data-action="${name}"]').click()`);
  const control = name => evaluate(`document.querySelector('[data-pdf="${name}"]').click()`);
  const ready = () => wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);
  for (const device of devices) {
    await send('Emulation.setDeviceMetricsOverride',{...device,deviceScaleFactor:1,mobile:true});
    await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
    // Reset only this disposable browser notebook between synthetic fixtures.
    await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').clear();tx.objectStore('assets').clear();tx.oncomplete=()=>{db.close();resolve();};};})`);
    await send('Page.reload');await wait(`document.querySelector('.cp-today')`);await disableWarmup(evaluate);
    await action('piano');await action('repertoire');await action('new-work');
    await evaluate(`(()=>{const f=new DataTransfer();f.items.add(new File([Uint8Array.from(atob(${JSON.stringify(scorePDF())}),c=>c.charCodeAt(0))],'Review score.pdf',{type:'application/pdf'}));const input=document.querySelector('[name=score]');input.files=f.files;input.dispatchEvent(new Event('change'));})()`);
    await wait(`document.querySelector('[name=score]').validity.valid`);
    await evaluate(`document.querySelector('[name=title]').value='Review score';document.querySelector('#cp-dialog form').requestSubmit()`);
    await wait(`document.querySelector('[data-action=practice-work]')`);await action('practice-work');
    await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);await wait(`document.querySelector('[data-action=open-pdf]')`);
    async function capture(state) {
      await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
      const bytes=Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'),path=`${state}-${device.id}-01.png`;
      await writeFile(join(folder,path),bytes);
      results.push({state,...device,frames:[{path,scrollTop:0,sha256:hash(bytes)}]});
    }
    assert.equal(await evaluate(`!!document.querySelector('[data-action=toggle-metronome]')`),false,'Repertoire does not expose a metronome.');
    await capture('session');await action('toggle-session');await action('open-pdf');await ready();await capture('running');
    await control('timer');await wait(`document.querySelector('.pdf-viewer').dataset.running==='false'`);
    if(await evaluate(`!document.querySelector('.pdf-panel').hidden`)) await control('tools');
    await capture('paused');
    await control('tools');await wait(`!document.querySelector('.pdf-panel').hidden`);await control('annotations');await capture('annotation-tools');
    if(process.argv.includes('--edit-marks')){
      await evaluate(`{const f=document.querySelector('[data-mark-setting=width]');f.value=.7;f.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('[data-tool=highlight]').click()`);
      const points=await evaluate(`(()=>{const r=document.querySelector('.pdf-paper').getBoundingClientRect();return{a:{x:r.left+r.width*.25,y:r.top+r.height*.3},b:{x:r.left+r.width*.65,y:r.top+r.height*.35}};})()`);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...points.a,button:'left',clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...points.b,button:'left',buttons:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...points.b,button:'left',clickCount:1});
      await wait(`document.querySelector('[data-mark-id]')`);await capture('compact-annotation');
      await evaluate(`{const f=document.querySelector('[data-mark-setting=fontSize]');f.value=4;f.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('[data-finger="3"]').click()`);
      const digit=await evaluate(`(()=>{const r=document.querySelector('.pdf-paper').getBoundingClientRect();return{x:r.left+r.width*.7,y:r.top+r.height*.2};})()`);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...digit,button:'left',clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...digit,button:'left',clickCount:1});
      await wait(`document.querySelector('.pdf-marks text')`);await capture('large-fingering');
      await evaluate(`document.querySelector('[data-tool=select]').click()`);
      const middle={x:(points.a.x+points.b.x)/2,y:(points.a.y+points.b.y)/2};
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...middle,button:'left',clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...middle,button:'left',clickCount:1});
      await wait(`document.querySelector('[data-resize]')`);await capture('selected-mark');
      await control('tools');
    }
    await control('view');await ready();await wait(`document.querySelector('[data-pdf=view]').getAttribute('aria-pressed')==='true'`);await capture('framing-tools');
    await evaluate(`document.querySelector('.pdf-framing-extra').open=true`);await capture('framing-extra');
    if(process.argv.includes('--split-pages')){
      await control('split');await ready();await wait(`!document.querySelector('[data-pdf=split-done]').hidden`);
      const crop=await evaluate(`(()=>{const r=document.querySelector('.pdf-paper').getBoundingClientRect();return{a:{x:r.left+r.width*.08,y:r.top+r.height*.18},b:{x:r.left+r.width*.92,y:r.top+r.height*.36}};})()`);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...crop.a,button:'left',clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...crop.b,button:'left',buttons:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...crop.b,button:'left',clickCount:1});
      await wait(`document.querySelector('[data-section-id]')`);await capture('split-drawing');
      await control('split-done');await ready();await capture('split-reading');
      if(device.width>device.height) assert.equal(await evaluate(`document.querySelector('.pdf-viewport').classList.contains('pdf-sectioned')`),true);
    }
    await control('close');await wait(`!document.querySelector('.pdf-viewer')`);
  }
  assert.deepEqual(errors,[]);
  const metadata={runId,date:'2026-10-05',createdAt:new Date().toISOString(),title:'Repertoire PDF practice',screen:'PRACTICE-05 / SCORE-01 / SCORE-03',reviewHref:'../../../manual-practice.md',stateLabels:{session:'Session · open score',running:'PDF · practising',paused:'PDF · paused', 'annotation-tools':'PDF · annotation tools','framing-tools':'PDF · framing tools'},surface:'Production responsive Chromium browser; not native acceptance',fixtures:'Disposable notebook; synthetic two-page PDF (staff-line fixture, not real musical notation). Personal app untouched.',sourceFiles,sourceSha256:hash(JSON.stringify(sourceFiles)),packageVersion:JSON.parse(await readFile('package.json','utf8')).version,renderer:await send('Browser.getVersion'),results,runtimeErrors:errors};
  Object.assign(metadata.stateLabels,{'compact-annotation':'PDF · compact annotation mode','selected-mark':'PDF · selected mark and resize handles','large-fingering':'PDF · larger fingering number','framing-extra':'PDF · additional framing options'});
  Object.assign(metadata.stateLabels,{'split-drawing':'PDF · marking a page section','split-reading':'PDF · reading saved sections'});
  await writeFile(join(folder,'capture.json'),JSON.stringify(metadata,null,2));await writeGallery(folder,metadata);
  console.log(JSON.stringify({folder,views:results.length}));
} finally {for(const close of cleanup.reverse()) await close();}
