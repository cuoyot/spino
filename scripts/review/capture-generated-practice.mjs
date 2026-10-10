// Capture the production generated-practice UI in disposable browser notebooks.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { openBrowser } from '../../tests/browser.js';
import {
  generatedPracticeFixtures,
  generatedPracticeStateLabels,
  REVIEW_DATE,
  REVIEW_NOW,
} from './generated-practice-fixtures.mjs';
import { writeGallery } from './build-gallery.mjs';

const runId = process.argv[2];
assert.match(runId || '', /^[a-z0-9][a-z0-9-]+$/, 'Pass a unique capture ID, for example 2026-10-04-baseline.');
const folder = resolve('docs/quality-review/captures/generated-practice', runId);
await mkdir(folder, { recursive: false }).catch(error => {
  if (error.code === 'ENOENT') return mkdir(resolve('docs/quality-review/captures/generated-practice'), { recursive: true }).then(() => mkdir(folder));
  throw error;
});

const cleanup = [];
const fixtures = generatedPracticeFixtures();
const noteNames = process.argv.includes('--names');
const manualPiano = process.argv.includes('--piano');
if (manualPiano) {
  fixtures['timed-technique'] = fixtures['self-paced-technique'];
  delete fixtures['self-paced-technique']; delete fixtures['self-paced-reading']; delete fixtures['adapted-range'];
  for (const fixture of Object.values(fixtures)) {
    fixture.active.context = 'piano';
    for (const block of fixture.active.blocks) { block.timing = 'timed'; block.hand = 'both'; }
  }
}
if (noteNames) {
  delete fixtures['adapted-range'];
  delete fixtures['next-block'];
  for (const fixture of Object.values(fixtures)) for (const block of fixture.active.blocks) block.input = 'names';
}
const results = [];
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
  console.log('Opening disposable Chromium profile...');
  const browser = await openBrowser({ after: fn => cleanup.push(fn) }, { companion: true, language: 'es' });
  console.log('Chromium connected.');
  const { send, evaluate, url, errors } = browser;
  await send('Emulation.setTimezoneOverride', { timezoneId: 'Europe/Madrid' });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `{
    const OriginalDate = Date, fixed = ${Date.parse(REVIEW_NOW)};
    window.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [fixed])); } static now() { return fixed; } };
    let seed = 4042026; Math.random = () => ((seed = seed * 1664525 + 1013904223 >>> 0) / 4294967296);
    window.reviewTapKey = async midi => {
      if (${noteNames}) {
        const note = window.__sr.line.notes[window.__sr.line.idx];
        const wrong = midi !== note.midi;
        const letter = wrong ? ['c','d','e','f','g','a','b'].find(l => l !== note.letter) : note.letter;
        const mod = wrong ? 0 : ({'#':1,'b':-1}[note.acc] || 0);
        if (mod) document.querySelector('#names [data-mod="'+mod+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
        document.querySelector('#names [data-letter="'+letter+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
        await new Promise(resolve => setTimeout(resolve, 200));
        return;
      }
      const key = document.querySelector('#piano [data-midi="'+midi+'"]');
      if (!key) throw Error('Expected visible key '+midi);
      key.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:91,pointerType:'touch'}));
      key.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:91,pointerType:'touch'}));
      await new Promise(resolve => setTimeout(resolve, 200));
    };
  }` });
  const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{let ok=false;try{ok=!!(${condition});}catch{}if(ok){clearInterval(timer);resolve();}else if(++n>750){clearInterval(timer);reject(Error('Review capture timed out: '+${JSON.stringify(condition)}));}},20);})`);
  const settle = () => evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  await send('Page.navigate', { url });
  await wait(`document.querySelector('.cp-today')`);
  console.log('Production app loaded.');

  const writeFixture = async data => {
    await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};})`);
    await send('Page.reload');
    await wait(`document.querySelector('[data-action=resume-session]')`);
    await evaluate(`document.fonts.ready`);
  };

  for (const [state, data] of Object.entries(fixtures)) {
    await writeFile(join(folder, `${state}.fixture.json`), JSON.stringify(data, null, 2) + '\n');
    for (const device of devices) {
      console.log(`Capturing ${state}/${device.id}...`);
      await send('Emulation.setDeviceMetricsOverride', {
        width: device.width,
        height: device.height,
        deviceScaleFactor: 1,
        mobile: true,
        screenOrientation: { type: device.width > device.height ? 'landscapePrimary' : 'portraitPrimary', angle: device.width > device.height ? 90 : 0 },
      });
      await writeFixture(data);
      await evaluate(`document.querySelector('[data-action=resume-session]').click()`);
      await wait(`document.querySelector('[data-action=open-reader]')`);
      await evaluate(`document.querySelector('[data-action=open-reader]').click()`);
      await wait(`!document.querySelector('#reader-view').hidden && (window.__sr?.waiting || window.__sr?.timed)`);
      assert.equal(await evaluate(`document.querySelector('#cp-toast').hidden`), true, 'Practice notifications must use the feedback row rather than cover answer controls.');
      await evaluate(`__sr.settings.soundMode='off';__sr.settings.metronome=false`);

      if (manualPiano || state === 'timed-reading' || state === 'next-block') {
        await evaluate(`{const count=document.querySelector('#count-in');if(count)count.hidden=true;if(__sr.timed)document.querySelector('#start').click();}`);
        assert.equal(await evaluate(`document.querySelector('#feedback').textContent`), 'En pausa', 'Pausing count-in must replace the countdown status.');
        await evaluate(`document.querySelector('#start').click()`);
        assert.equal(await evaluate(`document.querySelector('#feedback').textContent`), 'Cuenta atrás…', 'Resuming the initial count-in must restore its status.');
        await evaluate(`document.querySelector('#start').click()`);
      } else if (state === 'self-paced-reading') {
        await evaluate(`(async()=>{await reviewTapKey(__sr.line.notes[__sr.line.idx].midi);const expected=__sr.line.notes[__sr.line.idx].midi;const wrong=[...document.querySelectorAll('#piano [data-midi]')].map(k=>Number(k.dataset.midi)).find(m=>m!==expected);await reviewTapKey(wrong);})()`);
      } else if (state === 'adapted-range') {
        await evaluate(`(async()=>{await reviewTapKey(__sr.line.notes[__sr.line.idx].midi);const slider=document.querySelector('#kb-shift');slider.value=String(Math.min(Number(slider.max),Number(slider.value)+5));slider.dispatchEvent(new Event('input',{bubbles:true}));slider.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await wait(`window.__sr?.waiting?.paused === true`);
      } else {
        await evaluate(`reviewTapKey(__sr.line.notes[__sr.line.idx].midi)`);
      }
      await settle();
      const metrics = await evaluate(`(()=>{
        const box=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom,right:b.right}};
        const controls=[...document.querySelectorAll('#reader-view button:not([hidden]),#reader-view input:not([hidden])')].filter(e=>e.offsetParent);
        return {
          viewport:{width:innerWidth,height:innerHeight},
          reader:box(document.querySelector('#reader-view')),
          score:box(document.querySelector('#staff')),
          keyboard:box(document.querySelector(${manualPiano ? "'#input-area'" : noteNames ? "'#names'" : "'#piano'"})),
          horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
          verticalOverflow:document.documentElement.scrollHeight>innerHeight+1,
          correct:Number(document.querySelector('#s-correct').textContent),
          wrong:Number(document.querySelector('#s-wrong').textContent),
          feedback:document.querySelector('#feedback').textContent.trim(),
          timing:__sr.settings.timing,
          paused:__sr.settings.timing==='wait' ? !!__sr.waiting?.paused : !__sr.timed,
          rows:__sr.layout.rows.length,
          controls:controls.map(e=>({id:e.id,label:(e.getAttribute('aria-label')||e.textContent||'').trim(),...box(e)})),
        };
      })()`);
      assert.equal(metrics.horizontalOverflow, false, `${state}/${device.id}: unexpected horizontal overflow`);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const name = `${state}-${device.id}-01.png`;
      const bytes = Buffer.from(shot.data, 'base64');
      await writeFile(join(folder, name), bytes);
      const frames = [{ path: name, scrollTop: 0, sha256: hash(bytes) }];
      if ((process.argv.includes('--settings') || process.argv.includes('--tools')) && state === (manualPiano ? 'timed-reading' : noteNames ? 'self-paced-reading' : 'adapted-range')) {
        await evaluate(`document.querySelector('#q-clef').click()`);
        await wait(`document.querySelector('#settings').open && !document.querySelector('#settings [data-panel="practice"]').hidden`);
        await settle();
        const toolsShot = await send('Page.captureScreenshot', { format: 'png' });
        const toolsName = `${state}-${device.id}-settings.png`;
        const toolsBytes = Buffer.from(toolsShot.data, 'base64');
        await writeFile(join(folder, toolsName), toolsBytes);
        frames.push({ path: toolsName, interaction: 'Practice settings opened directly from the fixed settings shortcut.', scrollTop: 0, sha256: hash(toolsBytes) });
      }
      results.push({ state, ...device, metrics, frames });
    }
  }
  assert.deepEqual(errors, []);
  const metadata = {
    runId,
    createdAt: new Date().toISOString(),
    screen: manualPiano ? 'PRACTICE-04' : noteNames ? 'PRACTICE-03' : 'PRACTICE-02',
    title: manualPiano ? 'Generated practice with a physical piano' : noteNames ? 'Generated practice with note-name answers' : 'Generated practice with on-screen keyboard',
    reviewHref: manualPiano ? '../../../piano-practice.md' : noteNames ? '../../../note-name-practice.md' : '../../../generated-practice.md',
    stateLabels: { ...generatedPracticeStateLabels, 'timed-technique': 'Manual piano technique · both hands · paused' },
    label: 'Initial baseline for objective and findings; no design acceptance',
    packageVersion: JSON.parse(await readFile('package.json', 'utf8')).version,
    gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim(),
    workingTree: 'Uncommitted work included; use source hashes, not HEAD alone.',
    sourceSha256: hash(JSON.stringify(hashes)),
    sourceFiles: hashes,
    renderer: await send('Browser.getVersion'),
    locale: 'es',
    timezone: 'Europe/Madrid',
    fixedTime: REVIEW_NOW,
    date: REVIEW_DATE,
    surface: 'Production web build in Chromium with device metrics; not native-device acceptance.',
    devicePixelRatio: 1,
    fixtures: 'Synthetic isolated notebooks with one active block; no installed app data changed.',
    randomness: 'Math.random uses a fixed local seed before application code loads.',
    entryPolicy: 'Fresh fixture per state and viewport; actual Today Resume and session Open exercise actions.',
    results,
    runtimeErrors: errors,
  };
  await writeFile(join(folder, 'capture.json'), JSON.stringify(metadata, null, 2) + '\n');
  await writeGallery(folder, metadata);
  console.log(JSON.stringify({ folder: relative(process.cwd(), folder), captures: results.length, views: results.length }));
} finally {
  for (const close of cleanup.reverse()) await close();
}
