// Inspect the real Android WebView without recording practices or changing preferences.
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { measureScoreGuides } from '../tests/score-geometry.js';

const adb = join(process.env.USERPROFILE, 'Android', 'sdk', 'platform-tools', 'adb.exe');
const run = args => execFileSync(adb, args, { encoding: 'utf8', windowsHide: true }).trim();
const pid = run(['shell', 'pidof', 'com.miguelcoll.sightreader']);
assert.match(pid, /^\d+$/);
const port = run(['forward', 'tcp:0', `localabstract:webview_devtools_remote_${pid}`]);
let socket, evaluate, call, inspecting = false;
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
  call = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  evaluate = async expression => {
    const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 15000 });
    assert.equal(r.exceptionDetails, undefined, JSON.stringify(r.exceptionDetails)); return r.result.value;
  };
  await call('Runtime.enable');
  assert.ok(await evaluate(`!document.querySelector('.pdf-viewer[open]') && (!__sr.timed || __sr.timed.suspendedAt != null)`), 'Run this diagnostic with practice paused');
  const before = await evaluate(`JSON.stringify({...localStorage})`);
  inspecting = true;
  await call('Page.navigate', { url: 'https://localhost/?score-alignment#reader' });
  await new Promise(resolve => setTimeout(resolve, 700));
  await evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(window.__sr?.layout){clearInterval(timer);resolve(true);}else if(++n>200){clearInterval(timer);reject(Error('Reading did not open'));}},25);})`);
  await evaluate(`window.measureScoreGuides=${measureScoreGuides.toString()}`);
  await mkdir('artifacts/emulator', { recursive: true });
  const results = [];
  for (const mode of ['page', 'scroll']) for (const clef of ['treble', 'bass', 'grand']) for (const duration of ['w', 'q']) {
    await evaluate(`Object.assign(__sr.settings,{layoutMode:'${mode}',pianoMode:${clef === 'grand'},clef:'${clef === 'grand' ? 'treble' : clef}',input:'names',soundMode:'off',metronome:false,figures:{w:${duration === 'w'},h:false,q:${duration === 'q'},e:false,s:false}});document.querySelector('#new-key').click();`);
    await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
    const result = await evaluate(`measureScoreGuides(0)`);
    const label = `${mode} ${clef} ${duration}`;
    const cursorError = Math.abs(result.playhead.cy - result.staffCentre);
    const lightError = Math.abs(result.light.cy - result.staffCentre);
    const headError = Math.max(...result.heads.map(head => Math.abs(head.cx - result.playhead.cx)));
    assert.ok(cursorError < 1 && lightError < 1, `${label}: vertical guide errors ${cursorError}, ${lightError}`);
    assert.ok(result.playhead.top < result.staffTop && result.playhead.bottom > result.staffBottom, `${label}: cursor covers the staves`);
    assert.ok(headError < 1.2, `${label}: notehead error ${headError}`);
    results.push({ mode, clef, duration, cursorError, lightError, headError });
    if (duration === 'q') {
      await evaluate(`__sr.layout.setState(0,'current')`);
      await writeFile(`artifacts/emulator/alignment-${mode}-${clef}.png`, execFileSync(adb, ['exec-out', 'screencap', '-p'], { windowsHide: true }));
    }
  }
  assert.equal(await evaluate(`JSON.stringify({...localStorage})`), before, 'The diagnostic must preserve preferences and results');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ cases: results.length, maxCursorError: Math.max(...results.map(r => r.cursorError)), maxLightError: Math.max(...results.map(r => r.lightError)), maxHeadError: Math.max(...results.map(r => r.headError)), frontendErrors: errors }, null, 2));
} finally {
  if (inspecting && call && socket?.readyState === WebSocket.OPEN) await call('Page.navigate', { url: 'https://localhost/' }).catch(() => {});
  socket?.close(); run(['forward', '--remove', `tcp:${port}`]);
}
