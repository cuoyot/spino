// Capture the actual production UI in disposable browser notebooks; never seed the installed app.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { openBrowser } from '../../tests/browser.js';
import { todayFixtures, REVIEW_DATE, REVIEW_NOW } from './today-fixtures.mjs';
import { writeGallery } from './build-gallery.mjs';

const runId = process.argv[2];
assert.match(runId || '', /^[a-z0-9][a-z0-9-]+$/, 'Pass a unique capture ID, for example 2026-10-01-baseline.');
const folder = resolve('docs/quality-review/captures/today', runId);
await mkdir(folder, { recursive: false }).catch(error => {
  if (error.code === 'ENOENT') return mkdir(resolve('docs/quality-review/captures/today'), { recursive: true }).then(() => mkdir(folder));
  throw error; // Evidence sets are immutable: choose another run ID rather than overwriting.
});
const cleanup = [], fixtures = todayFixtures(), results = [];
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
    await writeFixture(data);
    for (const device of devices) {
      await send('Emulation.setDeviceMetricsOverride', { width: device.width, height: device.height, deviceScaleFactor: 1, mobile: true, screenOrientation: { type: device.width > device.height ? 'landscapePrimary' : 'portraitPrimary', angle: device.width > device.height ? 90 : 0 } });
      await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
      await evaluate(`document.querySelector('.cp-page').scrollTop=0`);
      const metrics = await evaluate(`(()=>{const p=document.querySelector('.cp-page'),r=p.getBoundingClientRect(),box=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom}},buttons=[...document.querySelectorAll('.cp-today button')];return{page:box(p),scrollHeight:p.scrollHeight,horizontalOverflow:p.scrollWidth>p.clientWidth+1,actions:buttons.map(b=>({action:b.dataset.action,id:b.dataset.id,label:b.textContent.trim(),...box(b),fullyVisible:b.getBoundingClientRect().top>=r.top&&b.getBoundingClientRect().bottom<=r.bottom})),nav:[...document.querySelectorAll('.cp-nav button')].map(b=>({label:b.textContent.trim(),...box(b)}))};})()`);
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
      results.push({ state, ...device, metrics, frames });
    }
  }
  // Probe two concrete Today interactions in the same disposable notebook.
  await writeFixture(fixtures.typical);
  const selectedDate = '2026-10-04';
  await evaluate(`document.querySelector('[data-action=calendar-day][data-id="${selectedDate}"]').click();document.querySelector('[data-action=home]').click();document.querySelector('[data-action=new-event]').click()`);
  const eventDate = await evaluate(`document.querySelector('#cp-dialog [name=date]').value`);
  await evaluate(`document.querySelector('[data-action=close-dialog]').click()`);
  await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 568, deviceScaleFactor: 1, mobile: true });
  await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  const smallWeekTargets = await evaluate(`[...document.querySelectorAll('.cp-today-days button')].map(b=>({day:b.dataset.id,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))`);
  await writeFixture(fixtures.pending);
  await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=technique]').click()`);
  const pendingShortcut = await evaluate(`({sessionVisible:!!document.querySelector('.cp-session-card'),preparationVisible:!!document.querySelector('#prepare-form'),message:document.querySelector('#cp-toast').textContent})`);
  assert.deepEqual(errors, []);
  const metadata = { runId, createdAt: new Date().toISOString(), screen: 'TODAY-01', label: 'Today and navigation refinement; implemented direction, awaiting visual acceptance', packageVersion: JSON.parse(await readFile('package.json', 'utf8')).version, gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim(), workingTree: 'Uncommitted work included; use source hashes, not HEAD alone.', sourceSha256: hash(JSON.stringify(hashes)), sourceFiles: hashes, renderer: await send('Browser.getVersion'), locale: 'es', timezone: 'Europe/Madrid', fixedTime: REVIEW_NOW, date: REVIEW_DATE, surface: 'Production web build in Chromium with device metrics; not native-device acceptance.', devicePixelRatio: 1, fixtures: 'Synthetic, isolated notebooks; no installed app data changed.', toastPolicy: 'Recovery toast hidden after load to capture stable screen; transient notices remain unreviewed.', results, probes: { addEventDate: { today: REVIEW_DATE, previouslySelectedCalendarDay: selectedDate, prefilledDate: eventDate }, smallWeekTargets, pendingShortcut }, runtimeErrors: errors };
  await writeFile(join(folder, 'capture.json'), JSON.stringify(metadata, null, 2) + '\n');
  await writeGallery(folder, metadata);
  console.log(JSON.stringify({ folder: relative(process.cwd(), folder), captures: results.reduce((n, r) => n + r.frames.length, 0), views: results.length, probes: metadata.probes }));
} finally {
  for (const close of cleanup.reverse()) await close();
}
