// Inspect Android navigation without saving profile or notebook edits.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const adb = join(process.env.USERPROFILE, 'Android', 'sdk', 'platform-tools', 'adb.exe');
const run = args => execFileSync(adb, args, { encoding: 'utf8', windowsHide: true }).trim();
let pid = '';
for (let attempt = 0; attempt < 40 && !pid; attempt++) {
  try { pid = run(['shell', 'pidof', 'com.miguecoll.spino']); } catch { /* The activity may still be starting after installation. */ }
  if (!pid) await new Promise(resolve => setTimeout(resolve, 250));
}
assert.match(pid, /^\d+$/);
const port = run(['forward', 'tcp:0', `localabstract:webview_devtools_remote_${pid}`]);
let socket;
try {
  let pages = [];
  for (let attempt = 0; attempt < 60 && !pages[0]?.webSocketDebuggerUrl; attempt++) {
    try { pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch { /* Wait for the activity's WebView debugging socket. */ }
    if (!pages[0]?.webSocketDebuggerUrl) await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(pages[0]?.webSocketDebuggerUrl, 'The app WebView must finish starting.');
  socket = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const pending = new Map(), errors = []; let id = 0;
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (!message.id) return;
    const task = pending.get(message.id); pending.delete(message.id);
    message.error ? task.reject(Error(JSON.stringify(message.error))) : task.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>400){clearInterval(timer);reject(Error('UI timed out'));}},25);})`);
  const action = name => evaluate(`document.querySelector('[data-action="${name}"]').click()`);
  const snapshot = () => evaluate(`new Promise((resolve,reject)=>{const request=indexedDB.open('cuaderno-piano',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction(['state','assets']),data=tx.objectStore('state').get('current'),assets=tx.objectStore('assets').getAll();tx.oncomplete=()=>{resolve({data:data.result,assets:assets.result});db.close();};tx.onerror=()=>reject(tx.error);};})`);
  const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  await send('Runtime.enable');
  await wait(`document.querySelector('.cp-profile-nav')`);
  const before = await snapshot();
  assert.ok(!before.data.active?.runningSince, 'Do not navigate away from a running practice.');
  const language = await evaluate('document.documentElement.lang');
  const expected = language === 'es' ? ['Hoy','Practicar','Calendario','Biblioteca'] : ['Today','Practice','Calendar','Library'];
  await action('home');
  if (process.argv.includes('--compact')) {
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.cp-today-focus')).borderRadius"), '14px', 'The installed APK contains the compact variant.');
  }
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.cp-nav button > span:not(.cp-avatar)')].map(e=>e.textContent.trim())"), expected);
  assert.equal(await evaluate("document.querySelector('.cp-profile-nav').getAttribute('aria-label')"), language === 'es' ? 'Perfil' : 'Profile');
  assert.equal(await evaluate("!!document.querySelector('.cp-nav [data-midi-indicator]')"),false);
  const status = await evaluate("(()=>{const r=document.querySelector('.cp-midi-status').getBoundingClientRect();return{visible:r.top>=0&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,width:r.width,height:r.height};})()");
  assert.ok(status.visible && status.width>=44 && status.height>=44);
  await action('practice');
  assert.equal(await evaluate("document.querySelectorAll('.cp-practice-hub [data-action=prepare]').length"),4);
  run(['shell','input','keyevent','4']);
  await wait("document.querySelector('.cp-today')");
  await action('piano');
  assert.equal(await evaluate("document.querySelector('#app-shell h1').textContent"),expected[3]);
  assert.equal(await evaluate("!!document.querySelector('.cp-dashboard-week')"),false);
  await action('settings');await action('progress');
  assert.ok(await evaluate("!!document.querySelector('.cp-dashboard-week')"));
  assert.equal(await evaluate("document.querySelector('.cp-nav [aria-current=page]').dataset.action"),'settings');
  await action('home');
  const after = await snapshot();
  assert.equal(hash(after),hash(before),'Navigation preserves the notebook, scores and annotations.');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({platform:'Android emulator',language,navigation:expected,back:true,midiStatus:status,notebookUnchanged:true,assets:after.assets.length}));
} finally {
  socket?.close();run(['forward','--remove',`tcp:${port}`]);
}
