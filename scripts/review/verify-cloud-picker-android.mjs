// Opens and cancels the real Android picker without retaining a file grant.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const folder = process.argv[2];
assert.ok(folder, 'Pass a fresh evidence directory');
await mkdir(folder, { recursive: true });
const adb = '/Users/migue/Library/Android/sdk/platform-tools/adb';
const pkg = 'com.miguecoll.spino.beta';
const run = args => execFileSync(adb, ['-s', 'emulator-5554', ...args], { encoding: 'utf8', timeout: 15000 }).trim();
const grantHash = () => {
  try { return run(['shell', 'run-as', pkg, 'sha256sum', 'shared_prefs/spino-cloud-backup.xml']).split(/\s/)[0]; }
  catch { return null; }
};
const before = grantHash();
const pid = run(['shell', 'pidof', pkg]);
const port = run(['forward', 'tcp:0', 'localabstract:webview_devtools_remote_' + pid]);
const pages = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
const ws = new WebSocket(pages[0].webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let seq = 0;
const pending = new Map();
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id) return;
  const task = pending.get(message.id);
  pending.delete(message.id);
  message.error ? task.reject(Error(JSON.stringify(message.error))) : task.resolve(message.result);
};
const evaluate = expression => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression, returnByValue: true, userGesture: true } }));
}).then(result => { assert.equal(result.exceptionDetails, undefined); return result.result.value; });
try {
  await evaluate(`window.__pickerReview={};Capacitor.nativePromise('CloudBackup','pickBackup',{link:false}).then(value=>__pickerReview.result=value,error=>__pickerReview.error=error.message);`);
  let pickerActivity;
  for (let attempt = 0; attempt < 50; attempt++) {
    const resumed = run(['shell', 'dumpsys', 'activity', 'activities']).split('\n').filter(line => line.includes('topResumedActivity'));
    if (resumed.some(line => /documentsui.*files.FilesActivity|documentsui.*picker.PickActivity/i.test(line))) { pickerActivity = resumed; break; }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(pickerActivity, 'Android DocumentsUI must be foreground');
  run(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
  let result;
  for (let attempt = 0; attempt < 50; attempt++) {
    result = await evaluate('window.__pickerReview');
    if (result.result || result.error) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.deepEqual(result.result, { cancelled: true });
  assert.equal(result.error, undefined);
  const after = grantHash();
  assert.equal(after, before);
  const foreground = run(['shell', 'dumpsys', 'activity', 'activities']).split('\n').filter(line => line.includes('topResumedActivity'));
  assert.ok(foreground.some(line => line.includes(pkg)));
  const evidence = { date: '2026-10-15', kind: 'Native Android emulator', pickerActivity, result, foreground, cloudGrantHashBefore: before, cloudGrantHashAfter: after, scope: 'Real plugin picker launch and cancellation only. No file selected, notebook edited or grant retained. Browser tests cover the actual app button and synthetic success/error paths; real Drive linking remains separate.' };
  await writeFile(folder + '/native-picker.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence));
} finally {
  ws.close();
  run(['forward', '--remove', 'tcp:' + port]);
}
