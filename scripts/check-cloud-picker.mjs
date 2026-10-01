// Verify the Android backup bridge with a synthetic local file; never replace an existing destination.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import assert from 'node:assert/strict';

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
  const snapshot = () => evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['state','assets']),state=tx.objectStore('state').get('current'),assets=tx.objectStore('assets').getAll();tx.oncomplete=()=>{resolve({works:state.result.works,assets:assets.result,running:!!state.result.active?.runningSince});db.close();};tx.onerror=reject;};})`);
  await send('Runtime.enable');
  const before = await snapshot(); assert.equal(before.running, false);
  const call = (method, args = {}) => evaluate(`Capacitor.nativePromise('CloudBackup',${JSON.stringify(method)},${JSON.stringify(args)})`);
  assert.equal((await call('status')).linked, false, 'Existing backup destinations must not be changed by this diagnostic.');
  await evaluate(`document.querySelector('[data-action=settings]').click()`);
  assert.match(await evaluate(`document.querySelector('#cloud-backup').textContent`), /Google Drive/);
  await call('removeAllListeners');
  const name = `SPino-picker-test-${Date.now()}.json`, original = JSON.stringify({diagnostic:1,padding:'x'.repeat(3000000)}), updated = JSON.stringify({diagnostic:2});
  await evaluate(`window.cloudDiagnostic=null;Capacitor.nativePromise('CloudBackup','create',${JSON.stringify({name,text:original})}).then(v=>window.cloudDiagnostic={value:v},e=>window.cloudDiagnostic={error:e.message});void 0`);
  console.log('PICKER_OPEN: save the new diagnostic file in local Downloads.');
  let result;
  for(let count=0;count<180;count++) { result = await evaluate('window.cloudDiagnostic'); if(result) break; await new Promise(resolve=>setTimeout(resolve,1000)); }
  assert.ok(result?.value?.name, JSON.stringify(result));
  const { createHash } = await import('node:crypto');
  const hash = text => createHash('sha256').update(text).digest('hex');
  assert.equal((await call('status')).lastHash,hash(original));
  assert.equal((await call('status')).setupPending,true);
  await call('acknowledgeSetup');
  assert.equal((await call('status')).setupPending,false);
  assert.equal((await call('readLinked')).text,original);
  assert.equal((await call('write',{text:updated,expectedHash:hash(original)})).providerAccepted,true);
  assert.equal((await call('readRecovery')).text,original);
  const conflict = await evaluate(`Capacitor.nativePromise('CloudBackup','write',${JSON.stringify({text:'overwrite',expectedHash:hash(original)})}).then(()=>null,e=>e.code)`);
  assert.equal(conflict,'CONFLICT'); assert.equal((await call('status')).lastHash,hash(updated));
  await call('disconnect'); assert.equal((await call('status')).linked,false);
  assert.equal(run(['shell','cat',`/sdcard/Download/${name}`]),updated);
  assert.deepEqual(await snapshot(),before);
  console.log(JSON.stringify({nativeProviderCreate:true,verifiedWrite:true,recovery:true,conflictProtection:true,disconnectRetainsFile:true,notebookUnchanged:true,diagnosticFile:name,largePickerPayloadBytes:original.length,setupReceipt:true}));
  await send('Page.reload');
} finally { socket?.close(); run(['forward','--remove',`tcp:${port}`]); }
