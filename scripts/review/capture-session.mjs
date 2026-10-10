// Capture the actual production UI in disposable browser notebooks; never seed the installed app.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { openBrowser } from '../../tests/browser.js';
import { sessionFixtures, sessionStateLabels, REVIEW_DATE, REVIEW_NOW } from './session-fixtures.mjs';
import { writeGallery } from './build-gallery.mjs';

const runId = process.argv[2];
assert.match(runId || '', /^[a-z0-9][a-z0-9-]+$/, 'Pass a unique capture ID, for example 2026-10-01-baseline.');
const folder = resolve('docs/quality-review/captures/session', runId);
await mkdir(folder, { recursive: false }).catch(error => {
  if (error.code === 'ENOENT') return mkdir(resolve('docs/quality-review/captures/session'), { recursive: true }).then(() => mkdir(folder));
  throw error; // Evidence sets are immutable: choose another run ID rather than overwriting.
});
const cleanup = [], fixtures = sessionFixtures(), results = [];
const manualReview = process.argv.includes('--manual');
if (manualReview) {
  const free = structuredClone(fixtures.running);
  if (process.argv.includes('--mixer')) free.active.freeMetronome={bpm:50,volume:70,favorites:[40,50,60],mode:'both',beats:4,subdivision:1};
  const repertoire = structuredClone(free);
  repertoire.active.title = 'Repertorio';
  repertoire.active.blocks[0].type = 'repertoire';
  repertoire.active.blocks[0].workId = repertoire.works[0].id;
  for (const key of Object.keys(fixtures)) delete fixtures[key];
  Object.assign(fixtures, { 'free-paused': free, running: structuredClone(free), 'repertoire-paused': repertoire });
}
const devices = [
  { id: 'phone-portrait', label: 'Phone portrait', width: 390, height: 844 },
  { id: 'phone-landscape', label: 'Phone landscape', width: 844, height: 390 },
  { id: 'tablet-portrait', label: 'Tablet portrait', width: 768, height: 1024 },
  { id: 'tablet-landscape', label: 'Tablet landscape', width: 1024, height: 768 },
];
const hash = value => createHash('sha256').update(value).digest('hex');
async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : [join(dir, entry.name)]))).flat();
}
const paths = [...await sourceFiles('src'), 'index.html', 'package.json', 'package-lock.json', 'vite.config.js'].sort();
const hashes = Object.fromEntries(await Promise.all(paths.map(async file => [file.replaceAll('\\', '/'), hash(await readFile(file))])));
try {
  const browser = await openBrowser({ after: fn => cleanup.push(fn) }, { companion: true, language: 'es' });
  const { send, evaluate, url, errors } = browser;
  await send('Emulation.setTimezoneOverride', { timezoneId: 'Europe/Madrid' });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `{
    const OriginalDate = Date, fixed = ${Date.parse(REVIEW_NOW)};
    window.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
  }` });
  const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>600){clearInterval(timer);reject(Error('Review capture timed out'));}},25);})`);
  await send('Page.navigate', { url });
  await wait(`document.querySelector('.cp-today')`);
  const writeFixture = async data => {
    await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};})`);
    await send('Page.reload'); await wait(`document.querySelector('.cp-today')`);
    await evaluate(`document.fonts.ready`);
    await evaluate(`document.querySelector('#cp-toast').hidden=true`);
  };
  for (const [state, data] of Object.entries(fixtures)) {
    await writeFile(join(folder, `${state}.fixture.json`), JSON.stringify(data, null, 2) + '\n');
    for (const device of devices) {
      await send('Emulation.setDeviceMetricsOverride', { width: device.width, height: device.height, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: device.width > device.height ? 'landscapePrimary' : 'portraitPrimary', angle: device.width > device.height ? 90 : 0 } });
      await writeFixture(data);
      await evaluate(state === 'planned' ? `document.querySelector('.cp-today-focus [data-action=start-plan]').click()` : `document.querySelector('.cp-today-focus [data-action=resume-session]').click()`);
      await wait(`document.querySelector('.cp-session-card')`);
      if (state === 'running') await evaluate(`document.querySelector('[data-action=open-free-practice]').click()`);
      if (process.argv.includes('--free-screen') && state === 'free-paused') await evaluate(`document.querySelector('[data-action=open-free-practice]').click();document.querySelector('[data-action=toggle-session]').click()`);
      if (process.argv.includes('--free-screen') && state === 'running') await evaluate(`document.querySelector('[data-metro-setting=mode]').value='visual';document.querySelector('[data-metro-setting=mode]').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-action=toggle-metronome]').click();new Promise(resolve=>setTimeout(resolve,80))`);
      if (state === 'disconnected') assert.ok(await evaluate(`!!document.querySelector('[data-action=continue-piano]')`), 'The disconnected fixture needs no open MIDI input.');
      await evaluate(`document.querySelector('#cp-toast').hidden=true;document.querySelector('.cp-page').scrollTop=0;new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
      const metrics = await evaluate(`(()=>{const p=document.querySelector('.cp-page'),r=p.getBoundingClientRect(),box=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom}},buttons=[...document.querySelectorAll('.cp-content button')];return{timer:document.querySelector('[data-session-clock], [data-block-clock]').textContent,sessionTitle:document.querySelector('#app-shell h1').textContent,page:box(p),scrollHeight:p.scrollHeight,horizontalOverflow:p.scrollWidth>p.clientWidth+1,actions:buttons.map(b=>({action:b.dataset.action,id:b.dataset.id,label:b.textContent.trim(),...box(b),fullyVisible:b.getBoundingClientRect().top>=r.top&&b.getBoundingClientRect().bottom<=r.bottom})),nav:[...document.querySelectorAll('.cp-nav button')].map(b=>({label:b.textContent.trim(),...box(b)}))};})()`);
      assert.equal(metrics.horizontalOverflow, false, `${state}/${device.id}: unexpected horizontal overflow`);
      const max = Math.max(0, metrics.scrollHeight - metrics.page.height);
      const offsets = [0];
      while (offsets.at(-1) < max) offsets.push(Math.min(max, offsets.at(-1) + Math.floor(metrics.page.height * .85)));
      const frames = [];
      for (const [index, offset] of offsets.entries()) {
        await evaluate(`document.querySelector('.cp-page').scrollTop=${offset};new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        const name = `${state}-${device.id}-${String(index + 1).padStart(2, '0')}.png`;
        const bytes = Buffer.from(shot.data, 'base64'); await writeFile(join(folder, name), bytes);
        frames.push({ path: name, scrollTop: await evaluate(`document.querySelector('.cp-page').scrollTop`), sha256: hash(bytes) });
      }
      if (state === 'resumed' && process.argv.includes('--hold')) {
        await send('Emulation.setTouchEmulationEnabled', { enabled: true });
        await evaluate('document.querySelector("[aria-current=step] .cp-session-block-copy").scrollIntoView({block:"center"})');
        const point = await evaluate('(()=>{const r=document.querySelector("[aria-current=step] .cp-session-block-copy").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,id:1}})()');
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
        await wait('document.querySelector(".cp-session-drag-ghost")');
        const shot = await send('Page.captureScreenshot', { format: 'png' });
        const name = state + '-' + device.id + '-hold.png', bytes = Buffer.from(shot.data, 'base64');
        await writeFile(join(folder, name), bytes);
        frames.push({ path: name, interaction: 'Long press: lifted block and bin; gesture cancelled after capture.', scrollTop: await evaluate('document.querySelector(".cp-page").scrollTop'), sha256: hash(bytes) });
        await send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await wait('!document.querySelector(".cp-session-drag-ghost")');
      }
      results.push({ state, ...device, metrics, frames });
    }
  }
  assert.deepEqual(errors, []);
  const metadata = { runId, createdAt: new Date().toISOString(), screen: 'PRACTICE-01', title: 'Session overview', reviewHref: '../../../session.md', stateLabels: sessionStateLabels, label: 'Compact session with live block editing; visual review pending', packageVersion: JSON.parse(await readFile('package.json', 'utf8')).version, gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim(), workingTree: 'Uncommitted work included; use source hashes, not HEAD alone.', sourceSha256: hash(JSON.stringify(hashes)), sourceFiles: hashes, renderer: await send('Browser.getVersion'), locale: 'es', timezone: 'Europe/Madrid', fixedTime: REVIEW_NOW, date: REVIEW_DATE, surface: 'Production web build in Chromium with device metrics; not native-device acceptance.', devicePixelRatio: 1, fixtures: 'Synthetic, isolated notebooks; no installed app data changed.', toastPolicy: 'Recovery toast hidden after load to capture stable screen; transient notices remain unreviewed.', entryPolicy: 'Fresh fixture per state and viewport; actual Today Start or Resume; free practice then starts its timer. Date frozen for deterministic timer text.', results, runtimeErrors: errors };
  await writeFile(join(folder, 'capture.json'), JSON.stringify(metadata, null, 2) + '\n');
  if (manualReview) {
    Object.assign(metadata, { screen: 'PRACTICE-05', title: 'Free and repertoire practice', reviewHref: '../../../manual-practice.md', stateLabels: { running: 'Free practice · running', 'free-paused': 'Free practice · paused', 'repertoire-paused': 'Repertoire without score · paused' } });
    await writeFile(join(folder, 'capture.json'), JSON.stringify(metadata, null, 2) + '\n');
  }
  await writeGallery(folder, metadata);
  console.log(JSON.stringify({ folder: relative(process.cwd(), folder), captures: results.reduce((n, r) => n + r.frames.length, 0), views: results.length }));
} finally {
  for (const close of cleanup.reverse()) await close();
}
