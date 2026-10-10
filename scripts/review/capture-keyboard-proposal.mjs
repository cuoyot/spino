// Inject a proposed material skin into a disposable browser only. No production CSS changes.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { openBrowser } from '../../tests/browser.js';
import { writeGallery } from './build-gallery.mjs';
import { emptyData, beginSession } from '../../src/companion/model.js';
import { quickPractice } from '../../src/companion/quick-practice.js';
import { emptyQuickScore } from '../../src/companion/quick-score.js';

const neutral = process.argv.includes('--neutral');
const labels = process.argv.includes('--labels');
const premium = process.argv.includes('--premium');
const runId = premium ? '2026-10-07-keyboard-depth-premium-proposal' : labels ? '2026-10-07-keyboard-depth-neutral-labels-proposal' : neutral ? '2026-10-07-keyboard-depth-neutral-proposal' : '2026-10-07-keyboard-depth-proposal', folder = resolve('docs/quality-review/captures/generated-practice', runId);
const css = await readFile('scripts/review/proposals/keyboard-depth.css', 'utf8') + (neutral ? '\n' + await readFile('scripts/review/proposals/keyboard-depth-neutral.css', 'utf8') : '') + (labels ? '\n' + await readFile('scripts/review/proposals/keyboard-depth-labels.css', 'utf8') : '') + (premium ? '\n' + await readFile('scripts/review/proposals/keyboard-depth-premium.css', 'utf8') : ''), cleanup = [], results = [];
await mkdir(folder, { recursive: true });
try {
  const { send, evaluate, url, errors } = await openBrowser({ after: fn => cleanup.push(fn) }, { companion: true, language: 'ca' });
  const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(${condition}){clearInterval(t);resolve();}else if(++n>300){clearInterval(t);reject(Error('Keyboard proposal timeout'));}},20);})`);
  for (const device of [{id:'phone-portrait',label:'Phone portrait',width:390,height:844},{id:'phone-landscape',label:'Phone landscape',width:844,height:390},{id:'tablet-portrait',label:'Tablet portrait',width:768,height:1024},{id:'tablet-landscape',label:'Tablet landscape',width:1024,height:768}]) {
    await send('Emulation.setDeviceMetricsOverride', {...device, deviceScaleFactor:1, mobile:true});
    await send('Page.navigate', {url}); await wait(`document.querySelector('.cp-today')`);
    const fixture = emptyData(); fixture.preferences.language = 'ca';
    fixture.active = beginSession(quickPractice(fixture.preferences, () => .2));
    fixture.active.title = 'Pràctica ràpida'; fixture.active.quickScore = emptyQuickScore();
    await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve();};};})`);
    await send('Page.navigate',{url}); await wait(`document.querySelector('[data-action=resume-session]')`);
    await evaluate(`document.querySelector('[data-action=resume-session]').click()`); await wait(`document.querySelector('[data-action=open-reader]')`);
    await evaluate(`document.querySelector('[data-action=open-reader]').click()`); await wait(`document.querySelector('#app-shell').hidden`);
    const geometry = () => evaluate(`([...document.querySelectorAll('#piano .key,#piano .key-edge')].map(k=>{const r=k.getBoundingClientRect();return {midi:k.dataset.midi||'decorative-edge',black:k.classList.contains('black'),x:r.x,y:r.y,width:r.width,height:r.height};}))`);
    const capture = async state => {
      const {data} = await send('Page.captureScreenshot',{format:'png'}), path = `${state}-${device.id}.png`;
      const bytes = Buffer.from(data,'base64'); await writeFile(join(folder,path),bytes);
      results.push({...device,state,frames:[{path,scrollTop:0,sha256:createHash('sha256').update(bytes).digest('hex')}]});
      if (device.id === 'tablet-landscape' && state !== 'baseline') {
        const clip = await evaluate(`(()=>{const r=document.querySelector('#piano').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
        const shot = await send('Page.captureScreenshot',{format:'png',clip});
        await writeFile(join(folder,`${state}-keyboard-detail.png`),Buffer.from(shot.data,'base64'));
      }
    };
    await capture('baseline'); const before = await geometry();
    await evaluate(`{const style=document.createElement('style');style.textContent=${JSON.stringify(css)};document.head.append(style);}`);
    assert.deepEqual(await geometry(),before,'The skin must not change any key or decorative edge geometry');
    await capture('proposal-idle');
    for (const [state,selector] of [['white-pressed','#piano .white'],['black-pressed','#piano .black']]) {
      const point = await evaluate(`(()=>{const keys=[...document.querySelectorAll('${selector}')];const k=keys[Math.floor(keys.length/2)],r=k.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height*.85,midi:k.dataset.midi};})()`);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
      await evaluate(`new Promise(resolve=>setTimeout(resolve,120))`);
      assert.equal(await evaluate(`document.querySelector('#piano [data-midi="${point.midi}"]').classList.contains('down')`),true);
      assert.deepEqual(await geometry(),before,'Press feedback must preserve key geometry and the 88-key window');
      await capture(state);
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
    }
    console.log(device.id+' geometry and real press probes passed');
  }
  assert.deepEqual(errors,[]);
  const metadata = {date:'2026-10-07',runId,title:'Keyboard depth proposal — not applied',reviewHref:'../../../generated-practice.md',surface:'Responsive browser CSS injection only; not product or native acceptance',language:'ca',fixtures:'Disposable synthetic quick practice; real pointer press demonstration',geometry:'All key MIDI IDs, widths, heights, positions and decorative half-black edges equal before/after. No transforms or hit-area changes.',cssSha256:createHash('sha256').update(css).digest('hex'),results,stateLabels:{baseline:'Current flat keys', 'proposal-idle':'Proposal · ivory and textured ebony','white-pressed':'Proposal · white key held','black-pressed':'Proposal · black key held'}};
  await writeFile(join(folder,'capture.json'),JSON.stringify(metadata,null,2)); await writeGallery(folder,metadata);
  const html=await readFile(join(folder,'index.html'),'utf8'); await writeFile(join(folder,'index.html'),html.replace('Spanish UI','Catalan UI').replace('Actual UI captures with the same synthetic notebook.','Current app with a review-only CSS skin injected into the browser. Production styles are unchanged.'));
} finally { for(const close of cleanup.reverse())await close(); }
