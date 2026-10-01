// Native catalogue and genuine MXL verification. Downloaded test bytes stay in memory.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { CATALOG } from '../src/companion/catalog.js';

const adb = join(process.env.USERPROFILE, 'Android', 'sdk', 'platform-tools', 'adb.exe');
const run = args => execFileSync(adb, args, { encoding: 'utf8', windowsHide: true }).trim();
const artifact = JSON.parse(await readFile('artifacts/repertoire/mt_eb69b7b3cfc165d7.json', 'utf8'));
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
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 45000 });
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails)); return result.result.value;
  };
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve(true);}else if(++n>1000){clearInterval(timer);reject(Error('Timeout: '+${JSON.stringify(expression)}));}},30);})`);
  const snapshot = () => evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['state','assets']),state=tx.objectStore('state').get('current'),assets=tx.objectStore('assets').getAll();tx.oncomplete=()=>{resolve({works:state.result.works,assets:assets.result,sessions:state.result.sessions,active:state.result.active});db.close();};tx.onerror=reject;};})`);
  await send('Runtime.enable'); await wait(`document.querySelector('#app-shell h1')`);
  assert.ok(await evaluate(`Capacitor.isNativePlatform() && !document.querySelector('dialog[open]')`));
  const before = await snapshot(); assert.ok(!before.active?.runningSince, 'Pause practice before running the diagnostic.');
  await evaluate(`document.querySelector('[data-action=piano]').click();document.querySelector('[data-action=catalog]').click()`);
  await wait(`document.querySelector('[data-count=records]')`);
  const counts = await evaluate(`Object.fromEntries([...document.querySelectorAll('[data-count]')].map(e=>[e.dataset.count,Number(e.textContent)]))`);
  assert.equal(counts.records, 618); assert.equal(counts.pending + counts.ready, 618);
  await mkdir('artifacts/emulator', { recursive: true });
  const shot = name => writeFile(`artifacts/emulator/repertoire-${name}.png`, execFileSync(adb, ['exec-out', 'screencap', '-p'], { windowsHide: true }));
  await shot('catalogue');
  await evaluate(`document.querySelector('[data-action=library-pdfs]').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('[data-pdf-id]').length`),CATALOG.length);
  await shot('pdfs');
  await evaluate(`document.querySelector('[data-action=library-research]').click()`);
  await evaluate(`document.querySelector('#library-search [name=query]').value='Czerny Op.821';document.querySelector('#library-search').requestSubmit()`);
  assert.match(await evaluate(`document.querySelector('#library-results').textContent`), /^160 resultados/);
  await evaluate(`document.querySelector('[data-action=library-detail]').click()`);
  assert.ok(await evaluate(`document.querySelector('[data-action=library-practice]').disabled`));
  await shot('pending');
  const pdf = CATALOG.find(item => item.id==='mutopia-202');
  const pdfCheck = await evaluate(`(async()=>{const result=await Capacitor.Plugins.Notebook.downloadPDF({id:'pdf-diagnostic',url:${JSON.stringify(pdf.download)},wifiOnly:true});const bytes=Uint8Array.from(atob(result.base64),c=>c.charCodeAt(0));return {signature:new TextDecoder().decode(bytes.slice(0,5)),bytes:bytes.length,sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('')};})()`);
  assert.equal(pdfCheck.signature,'%PDF-');assert.equal(pdfCheck.sha256,pdf.downloadEvidence.sha256);
  const transfer = await evaluate(`(async()=>{let progress=0;const listener=await Capacitor.Plugins.Notebook.addListener('downloadProgress',e=>{if(e.id==='repertoire-diagnostic')progress++;});try{window.repertoireReceipt=await Capacitor.Plugins.Notebook.downloadScore({id:'repertoire-diagnostic',url:${JSON.stringify(artifact.asset.origin.download_url)},wifiOnly:true});return {complete:repertoireReceipt.complete,error:repertoireReceipt.error,bytes:repertoireReceipt.bytes,httpStatus:repertoireReceipt.httpStatus,progress};}finally{await listener.remove();}})()`);
  assert.ok(transfer.complete, transfer.error); assert.equal(transfer.bytes, 4745); assert.ok(transfer.progress > 0);
  const nativeHash = await evaluate(`(async()=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(atob(repertoireReceipt.base64),c=>c.charCodeAt(0))))].map(n=>n.toString(16).padStart(2,'0')).join(''))()`);
  assert.equal(nativeHash, artifact.asset.sha256);
  const bundled = await readdir('dist/assets'), module = bundled.find(name => /^musicxml-viewer-.*\.js$/.test(name)), style = bundled.find(name => /^pdf-viewer-.*\.css$/.test(name));
  await evaluate(`new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/${style}';link.onload=()=>resolve(true);link.onerror=reject;document.head.append(link);})`);
  await evaluate(`(async()=>{const module=await import('/assets/${module}');window.repertoirePreview=await module.openMusicScore({asset:{...${JSON.stringify({ ...artifact.asset, base64: undefined })},base64:repertoireReceipt.base64},selection:${JSON.stringify(artifact.execution.selection)},onRendered:async()=>{window.repertoireRendered=true;}});})()`);
  await wait(`window.repertoireRendered && document.querySelector('.xml-score svg')`);
  assert.equal(await evaluate('innerHeight'), await evaluate('screen.height'));
  await shot('real-mxl');
  run(['shell', 'input', 'keyevent', '4']); await wait(`!document.querySelector('.xml-score-viewer')`);
  assert.deepEqual(await snapshot(), before); assert.deepEqual(errors, []);
  await evaluate(`document.querySelector('[data-action=catalog]').click();document.querySelector('[data-action=library-clear]').click()`);
  const report = { counts, pdfEditions:CATALOG.length, pdfCheck, transfer, sha256: nativeHash, rendered: true, notebookUnchanged: true, frontendErrors: errors };
  await writeFile('artifacts/repertoire/native-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  socket?.close(); run(['forward', '--remove', `tcp:${port}`]);
}
