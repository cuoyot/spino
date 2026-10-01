// Verify catalogue access from preparation without saving practices or selecting assets.
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
  const snapshot = () => evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['state','assets']),state=tx.objectStore('state').get('current'),assets=tx.objectStore('assets').getAll();tx.oncomplete=()=>{resolve({plans:state.result.plans,events:state.result.events,sessions:state.result.sessions,works:state.result.works,assets:assets.result,running:!!state.result.active?.runningSince});db.close();};tx.onerror=reject;};})`);
  await send('Runtime.enable'); const before=await snapshot(); assert.equal(before.running,false,'Pause practice first.');
  assert.equal(await evaluate(`!!document.querySelector('dialog[open]')`),false);
  await evaluate(`document.querySelector('[data-action=calendar]').click();document.querySelector('[data-action=add-on-day]').click();document.querySelector('[data-action=plan-practice]').click()`);
  await wait(`document.querySelector('#prepare-form')`);
  await evaluate(`document.querySelector('[name="minutes-0"]').value='19';document.querySelector('[data-action=choose-catalogue]').click()`);
  await wait(`document.querySelector('#library-search')`);
  assert.ok(await evaluate(`!!document.querySelector('[data-action=return-to-preparation]')`));
  assert.ok(await evaluate(`document.querySelectorAll('.cp-library-list [data-piece-id]').length>0`));
  await evaluate(`document.querySelector('[data-action=return-to-preparation]').click()`);
  assert.equal(await evaluate(`document.querySelector('[name="minutes-0"]').value`),'19');
  await evaluate(`document.querySelector('[data-action=home]').click()`);
  assert.deepEqual(await snapshot(),before);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({catalogueFromPreparation:true,draftPreserved:true,notebookUnchanged:true,errors},null,2));
} finally { socket?.close(); run(['forward','--remove',`tcp:${port}`]); }
