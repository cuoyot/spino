async function pdfViewerChunk() {
  const names = (await readdir('dist/assets')).filter(name => /^pdf-viewer-.*\.js$/.test(name));
  for (const name of names) if (/\bas openScore\b/.test(await readFile(`dist/assets/${name}`, 'utf8'))) return name;
  throw new Error('The built PDF viewer export was not found.');
}
// Verify native immersive PDF practice without writing notebook data.
import { execFileSync } from 'node:child_process';
import { mkdir, readdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { scorePDF } from '../tests/pdf-fixture.js';

const adb = join(process.env.USERPROFILE, 'Android', 'sdk', 'platform-tools', 'adb.exe');
const run = args => execFileSync(adb, args, { encoding: 'utf8', windowsHide: true }).trim();
const pid = run(['shell', 'pidof', 'com.miguelcoll.sightreader']);
assert.match(pid, /^\d+$/);
const port = run(['forward', 'tcp:0', `localabstract:webview_devtools_remote_${pid}`]);
let socket;
try {
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const pending = new Map(), errors = []; let id = 0;
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (!message.id) return;
    const task = pending.get(message.id); pending.delete(message.id);
    if (message.error) task.reject(Error(JSON.stringify(message.error))); else task.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 30000 });
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails)); return result.result.value;
  };
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve(true);}else if(++n>400){clearInterval(timer);reject(Error('Timeout: '+${JSON.stringify(expression)}));}},30);})`);
  const control = name => evaluate(`document.querySelector('[data-pdf="${name}"]').click()`);
  const ready = () => wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);
  const shot = async name => writeFile(`artifacts/emulator/pdf-practice-${name}.png`, execFileSync(adb, ['exec-out', 'screencap', '-p'], { windowsHide: true }));
  const snapshot = () => evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['state','assets']),state=tx.objectStore('state').get('current'),assets=tx.objectStore('assets').getAll();tx.oncomplete=()=>{resolve({works:state.result.works,assets:assets.result,running:!!state.result.active?.runningSince});db.close();};tx.onerror=reject;};})`);
  await send('Runtime.enable');
  assert.ok(await evaluate(`Capacitor.isNativePlatform() && !document.querySelector('dialog[open]')`), 'Close existing dialogs before running this check.');
  const before = await snapshot(); assert.equal(before.running, false, 'Pause practice before running this check.');
  const originalHeight = await evaluate('innerHeight');
  const bundled = await readdir('dist/assets'), module = await pdfViewerChunk(), style = bundled.find(name => /^pdf-viewer-.*\.css$/.test(name));
  // Direct imports bypass Vite's lazy CSS preloader.
  await evaluate(`new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/${style}';link.onload=()=>resolve(true);link.onerror=reject;document.head.append(link);})`);
  await evaluate(`(async()=>{window.practiceModule=await import('/assets/${module}');window.practiceRunning=true;window.practiceAsset={name:'Practice.pdf',base64:${JSON.stringify(scorePDF())}};window.practiceOptions={asset:practiceAsset,session:{finish:()=>{window.practiceFinished=true;},read:()=>({running:practiceRunning,time:'02:34'}),toggle:async()=>{practiceRunning=!practiceRunning;}},save:async marks=>{practiceAsset.annotations=marks;},saveView:async view=>{practiceAsset.scoreView=view;}};window.practiceViewer=await practiceModule.openScore(practiceOptions);})()`);
  await ready(); await wait(`innerHeight>${originalHeight}`);
  // Android's first-use fullscreen coachmark takes focus and consumes Back.
  run(['shell', 'uiautomator', 'dump', '/sdcard/spino-window.xml']);
  const nativeUI = run(['shell', 'cat', '/sdcard/spino-window.xml']);
  if (nativeUI.includes('immersive_cling_title')) {
    const button = nativeUI.match(/resource-id="com\.android\.systemui:id\/ok"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    assert.ok(button, 'The Android fullscreen coachmark needs to be dismissed.');
    run(['shell', 'input', 'tap', String(Math.round((+button[1] + +button[3]) / 2)), String(Math.round((+button[2] + +button[4]) / 2))]);
  }
  const immersive = await evaluate(`({height:innerHeight,width:innerWidth,screenHeight:screen.height,screenWidth:screen.width,backHidden:document.querySelector('[data-pdf=close]').hidden,toolsHidden:document.querySelector('[data-pdf=tools]').hidden,viewport:document.querySelector('.pdf-viewport').clientHeight})`);
  assert.equal(immersive.height, immersive.screenHeight); assert.equal(immersive.width, immersive.screenWidth);
  assert.equal(immersive.viewport, immersive.height); assert.ok(immersive.backHidden && immersive.toolsHidden);
  await mkdir('artifacts/emulator', { recursive: true }); await shot('running');
  run(['shell', 'input', 'keyevent', '4']);
  await wait(`document.querySelector('.pdf-viewer')?.dataset.running==='false'`);
  assert.ok(await evaluate(`!practiceRunning && !document.querySelector('.pdf-panel').hidden && !document.querySelector('[data-pdf=close]').hidden`));
  await evaluate(`document.querySelector('[data-finger="3"]').click();document.querySelector('[data-color="#2878c8"]').click()`);
  const point = await evaluate(`(()=>{const r=document.querySelector('.pdf-paper').getBoundingClientRect();return {x:r.left+r.width*.3,y:r.top+r.height*.25};})()`);
  await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 1 }] });
  await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait(`practiceAsset.annotations?.marks.length===1`);
  assert.deepEqual(await evaluate(`({type:practiceAsset.annotations.marks[0].type,text:practiceAsset.annotations.marks[0].text,color:practiceAsset.annotations.marks[0].color})`), { type: 'fingering', text: '3', color: '#2878c8' });
  await shot('paused');
  await control('tools');
  await evaluate(`document.querySelector('[data-pdf=drag]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}))`);
  const anchoredBottom = await evaluate(`document.querySelector('.pdf-widget').getBoundingClientRect().bottom`);
  for (let i = 0; i < 3; i++) { await control('tools'); await control('tools'); }
  assert.ok(Math.abs(await evaluate(`document.querySelector('.pdf-widget').getBoundingClientRect().bottom`) - anchoredBottom) < 2);
  assert.equal(await evaluate(`document.querySelector('[data-pdf=finish]').textContent`), 'Finish practice');
  await control('tools');
  await control('view'); await control('in'); await ready(); await control('in'); await ready();
  await evaluate(`document.querySelector('.pdf-viewport').scrollTo(130,200)`);
  await control('save-view'); await wait(`!!practiceAsset.scoreView?.portrait`);
  assert.equal(await evaluate(`practiceAsset.scoreView.portrait.zoom`), 1.5);
  await control('next'); await ready(); assert.equal(await evaluate(`document.querySelector('.pdf-zoom-value').textContent`), '150 %');
  await control('prev'); await ready(); await shot('framing');
  run(['shell', 'input', 'keyevent', '4']); await wait(`!document.querySelector('.pdf-viewer')`); await wait(`innerHeight===${originalHeight}`);
  await evaluate(`(async()=>{practiceRunning=true;practiceViewer=await practiceModule.openScore(practiceOptions);})()`); await ready();
  assert.equal(await evaluate(`document.querySelector('.pdf-zoom-value').textContent`), '150 %');
  assert.equal(await evaluate(`document.querySelectorAll('.pdf-marks [data-mark-id]').length`), 1);
  await control('timer'); await control('finish'); await wait(`!document.querySelector('.pdf-viewer')`); await wait(`innerHeight===${originalHeight}`);
  assert.equal(await evaluate('window.practiceFinished'), true);
  await shot('restored'); assert.deepEqual(await snapshot(), before); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ immersive, originalHeight, androidBackPausesFirst: true, fingering: true, framingRestored: true, systemBarsRestored: true, notebookUnchanged: true, errors }, null, 2));
} finally { socket?.close(); run(['forward', '--remove', `tcp:${port}`]); }
