// Verify the Android backup bridge with a synthetic local file; never replace an existing destination.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const adb = join(process.env.USERPROFILE, 'Android', 'sdk', 'platform-tools', 'adb.exe');
const run = args => execFileSync(adb, args, { encoding: 'utf8', windowsHide: true }).trim();
const pid = run(['shell', 'pidof', 'com.miguecoll.spino']);
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
  const snapshot = () => evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['state','assets']),state=tx.objectStore('state').get('current'),assets=tx.objectStore('assets').getAll();tx.oncomplete=()=>{resolve({works:state.result.works,assets:assets.result,running:!!state.result.active?.runningSince});db.close();};tx.onerror=reject;};})`);
  await send('Runtime.enable');
  const before = await snapshot(); assert.equal(before.running, false);
  const call = (method, args = {}) => evaluate(`Capacitor.nativePromise('CloudBackup',${JSON.stringify(method)},${JSON.stringify(args)})`);
  assert.equal((await call('status')).linked, false, 'Existing backup destinations must not be changed by this diagnostic.');
  await evaluate(`document.querySelector('[data-action=settings]').click()`);
  assert.match(await evaluate(`document.querySelector('#cloud-backup').textContent`), /Google Drive/);

  await evaluate(`document.querySelector('[data-action=cloud-connect]').click()`);
  console.log('PICKER_OPEN: save a new notebook backup in local Downloads.');
  let metadata;
  for(let count=0;count<180;count++) { metadata=await evaluate(`JSON.parse(localStorage.getItem('spino.cloud-backup.device.v1')||'{}')`); if(metadata.enabled && metadata.status==='saved')break; await new Promise(r=>setTimeout(r,1000)); }
  assert.equal(metadata.enabled,true); assert.equal(metadata.status,'saved');
  assert.equal((await call('status')).linked,true); assert.equal((await call('status')).setupPending,false);
  await send('Page.reload');
  await wait(`document.querySelector('[data-action=settings]')`);
  await evaluate(`document.querySelector('[data-action=settings]').click()`);
  await wait(`document.querySelector('[data-action=cloud-toggle][data-id=false]')`);
  assert.deepEqual(await snapshot(),before);
  const connectedName=metadata.name;
  await call('disconnect');
  await send('Page.reload');
  console.log(JSON.stringify({appReturned:true,configurationPersisted:true,enabledAfterReload:true,notebookUnchanged:true,localDiagnosticFile:connectedName}));
} finally { socket?.close(); run(['forward','--remove',`tcp:${port}`]); }
