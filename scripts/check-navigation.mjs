// Verify Android Back navigation without writing notebook data.
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
  assert.ok(await evaluate(`Capacitor.isNativePlatform() && !document.querySelector('dialog[open]')`), 'Close existing dialogs before running this check.');
  const before = await snapshot(); assert.equal(before.running, false, 'Pause practice before running this check.');

  const action = name => evaluate(`document.querySelector('[data-action="${name}"]').click()`);
  const title = () => evaluate(`document.querySelector('#app-shell h1').textContent`);
  const back = async expression => { run(['shell','input','keyevent','4']); await wait(expression); };
  await action('home');
  await action('piano'); const piano = await title();
  await action('repertoire'); const repertoire = await title();
  await action('new-work'); await wait(`document.querySelector('#cp-dialog').open`);
  await back(`!document.querySelector('#cp-dialog').open`); assert.equal(await title(), repertoire);
  await back(`document.querySelector('#app-shell h1').textContent===${JSON.stringify(piano)}`);
  await action('catalog'); await wait(`document.querySelector('#library-search')`);
  await action('library-research');
  await evaluate(`document.querySelector('#library-search [name=query]').value='Czerny Op.821';document.querySelector('#library-search').requestSubmit();document.querySelector('.cp-page').scrollTop=300`);
  const offset=await evaluate(`document.querySelector('.cp-page').scrollTop`);
  await action('library-detail'); const piece=await title(); await action('settings');
  await back(`document.querySelector('#app-shell h1').textContent===${JSON.stringify(piece)}`);
  await back(`!!document.querySelector('#library-search')`);
  assert.equal(await evaluate(`document.querySelector('#library-search [name=query]').value`),'Czerny Op.821');
  assert.match(await evaluate(`document.querySelector('#library-results').textContent`),/^160 resultados/);
  assert.equal(await evaluate(`document.querySelector('.cp-page').scrollTop`),offset);
  await back(`document.querySelector('#app-shell h1').textContent===${JSON.stringify(piano)}`);
  await back(`document.querySelector('#app-shell h1').textContent==='Hoy'`);
  assert.ok(run(['shell','dumpsys','activity','activities']).includes('com.miguecoll.spino/.MainActivity'));
  assert.deepEqual(await snapshot(),before); assert.deepEqual(errors,[]);
  console.log(JSON.stringify({androidBack:true,dialogClosesFirst:true,screenHistory:true,filtersAndScrollRestored:true,notebookUnchanged:true,errors},null,2));
} finally { socket?.close(); run(['forward','--remove',`tcp:${port}`]); }
