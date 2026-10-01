// Exercise the installed Android form and bundled OCR without saving any test work.
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { headerPDF, scannedFixtureScript } from '../tests/score-metadata-fixture.js';

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
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 55000 });
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails)); return result.result.value;
  };
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve(true);}else if(++n>1000){clearInterval(timer);reject(Error(document.querySelector('#cp-score-status')?.textContent||'Timeout'));}},40);})`);
  const action = name => evaluate(`document.querySelector('[data-action="${name}"]').click()`);
  const snapshot = () => evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['state','assets']);const state=tx.objectStore('state').get('current'),assets=tx.objectStore('assets').count();tx.oncomplete=()=>{resolve({works:state.result.works,assets:assets.result,running:!!state.result.active?.runningSince});db.close();};tx.onerror=reject;};})`);
  const choose = base64 => evaluate(`(()=>{const files=new DataTransfer();files.items.add(new File([Uint8Array.from(atob(${base64}),c=>c.charCodeAt(0))],'partitura.pdf',{type:'application/pdf'}));const input=document.querySelector('#cp-dialog [name=score]');input.files=files.files;input.dispatchEvent(new Event('change'));})()`);
  await send('Runtime.enable');
  assert.ok(await evaluate(`Capacitor.isNativePlatform() && !document.querySelector('dialog[open]')`));
  const before = await snapshot(); assert.equal(before.running, false, 'Pause practice before the diagnostic.');
  await action('piano'); await action('repertoire'); await action('new-work');
  await mkdir('artifacts/emulator', { recursive: true });
  await writeFile('artifacts/emulator/add-work-pdf.png', execFileSync(adb, ['exec-out', 'screencap', '-p'], { windowsHide: true }));
  const rect = await evaluate(`(()=>{const r=document.querySelector('#cp-dialog [name=score]').getBoundingClientRect();return {visible:r.top>=0&&r.bottom<innerHeight,width:r.width};})()`);
  assert.ok(rect.visible && rect.width > 100);
  await choose(JSON.stringify(headerPDF())); await wait(`document.querySelector('#cp-score-status').textContent.startsWith('Sugerencias del PDF:')`);
  assert.deepEqual(await evaluate(`['title','composer','bpm'].map(key=>document.querySelector('#cp-dialog [name='+key+']').value)`), ['Nocturne', 'Clara Schumann', '88']);
  await action('close-dialog'); await action('new-work'); await evaluate(scannedFixtureScript);
  await choose('window.scannedFixture'); await wait(`document.querySelector('#cp-score-status').textContent.startsWith('Sugerencias OCR:')`);
  const result = await evaluate(`({values:['title','composer','bpm','tempoMark'].map(key=>document.querySelector('#cp-dialog [name='+key+']').value),status:document.querySelector('#cp-score-status').textContent})`);
  assert.deepEqual(result.values.slice(0, 3), ['Noche serena', 'Clara Schumann', '96']);
  assert.match(result.values[3], /96/);
  await writeFile('artifacts/emulator/add-work-ocr.png', execFileSync(adb, ['exec-out', 'screencap', '-p'], { windowsHide: true }));
  await action('close-dialog'); assert.deepEqual(await snapshot(), before); assert.deepEqual(errors, []);
  await action('home');
  console.log(JSON.stringify({ native: true, pickerVisible: true, textAndOCR: result, notebookUnchanged: true, errors }, null, 2));
} finally { socket?.close(); run(['forward', '--remove', `tcp:${port}`]); }
