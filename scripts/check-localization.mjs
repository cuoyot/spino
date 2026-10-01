// Inspect the installed Android translations without saving profile or notebook edits.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

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
  const lang = await evaluate('document.documentElement.lang');
  const text = lang === 'es' ? { profile: 'Perfil', edit: 'Editar perfil', language: 'Idioma', catalogue: 'Catálogo', repertoire: 'Tu repertorio' } : { profile: 'Profile', edit: 'Edit profile', language: 'Language', catalogue: 'Catalogue', repertoire: 'Your repertoire' };
  await action('settings');
  assert.equal(await evaluate(`document.querySelector('#app-shell h1').textContent`), text.profile);
  await action('profile-edit');
  assert.equal(await evaluate(`document.querySelector('#cp-dialog h2').textContent`), text.edit);
  assert.equal(await evaluate(`document.querySelector('[name=language]').value`), lang);
  assert.deepEqual(await evaluate(`[...document.querySelector('[name=language]').options].map(o=>o.value)`), ['en', 'es']);
  assert.ok(await evaluate(`document.querySelector('[name=language]').closest('label').textContent.includes(${JSON.stringify(text.language)})`));
  await mkdir('artifacts/locale-emulator', { recursive: true });
  await writeFile('artifacts/locale-emulator/edit-profile.png', execFileSync(adb, ['exec-out', 'screencap', '-p'], { windowsHide: true }));
  await action('close-dialog');
  await action('piano'); await action('repertoire');
  assert.equal(await evaluate(`document.querySelector('#app-shell h1').textContent`), text.repertoire);
  if (lang === 'es') assert.doesNotMatch(await evaluate(`document.querySelector('#app-shell').innerText`), /Find, organize|Collection|Search repertoire|Sort by/);
  await action('piano'); await action('catalog');
  await wait(`document.querySelector('#library-search')`);
  if (lang === 'es') assert.doesNotMatch(await evaluate(`[...document.querySelectorAll('#app-shell button,#app-shell label')].map(e=>e.textContent).join(' ')`), /Download scores|Pending analysis|Show more|Review rights/);
  await writeFile('artifacts/locale-emulator/catalogue.png', execFileSync(adb, ['exec-out', 'screencap', '-p'], { windowsHide: true }));
  await action('settings');
  const after = await snapshot();
  assert.equal(hash(after), hash(before), 'Inspection preserves notebook, scores and annotations.');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ language: lang, profilePicker: true, screens: 4, notebookUnchanged: true, assets: after.assets.length }));
} finally {
  socket?.close(); run(['forward', '--remove', `tcp:${port}`]);
}
