// Google Play screenshots from the production web build, in disposable browser notebooks.
// Usage: npm run build && node scripts/store/capture-play-screenshots.mjs [es|en ...]
// Output: docs/play-store/screenshots/<lang>/<device>/NN-<screen>.png (existing files are replaced).
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { openBrowser } from '../../tests/browser.js';
import { storeNotebook, STORE_NOW } from './store-fixtures.mjs';

// Play requires 320–3840 px with the long side at most twice the short side.
const DEVICES = [
  { id: 'phone', width: 432, height: 768, scale: 2.5 },        // 1080 × 1920
  { id: 'tablet-7', width: 600, height: 960, scale: 2 },       // 1200 × 1920
  { id: 'tablet-10', width: 1280, height: 800, scale: 2 },     // 2560 × 1600
];
const languages = process.argv.slice(2).length ? process.argv.slice(2) : ['es', 'en'];
const cleanup = [];
try {
  for (const lang of languages) for (const device of DEVICES) {
    const folder = resolve('docs/play-store/screenshots', lang, device.id);
    await rm(folder, { recursive: true, force: true }); await mkdir(folder, { recursive: true });
    const { send, evaluate, url, errors } = await openBrowser({ after: fn => cleanup.push(fn) }, { companion: true, language: lang });
    await send('Emulation.setTimezoneOverride', { timezoneId: 'Europe/Madrid' });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `{ const O = Date, fixed = ${Date.parse(STORE_NOW)}; window.Date = class extends O { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } }; }` });
    await send('Emulation.setDeviceMetricsOverride', { width: device.width, height: device.height, deviceScaleFactor: device.scale, mobile: true, screenOrientation: { type: device.width > device.height ? 'landscapePrimary' : 'portraitPrimary', angle: device.width > device.height ? 90 : 0 } });
    const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{let ok=false;try{ok=!!(${condition});}catch{}if(ok){clearInterval(timer);resolve();}else if(++n>750){clearInterval(timer);reject(Error('Timeout: '+${JSON.stringify(condition)}));}},20);})`);
    const settle = () => evaluate(`new Promise(r=>setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(r)),250))`);
    const act = (name, id) => evaluate(`document.querySelector('[data-action="${name}"]${id ? `[data-id="${id}"]` : ''}').click()`);
    let index = 0;
    const shot = async name => {
      await evaluate(`{const t=document.querySelector('#cp-toast');if(t)t.hidden=true;const c=document.querySelector('#count-in');if(c)c.hidden=true;}`);
      await settle();
      const image = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(join(folder, `${String(++index).padStart(2, '0')}-${name}.png`), Buffer.from(image.data, 'base64'));
    };
    await send('Page.navigate', { url });
    await wait(`document.querySelector('.cp-today')`);
    await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const tx=r.result.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(storeNotebook(lang))},'current');tx.oncomplete=()=>{r.result.close();resolve();};tx.onerror=()=>reject(tx.error);};})`);
    await send('Page.reload'); await wait(`document.querySelector('.cp-today')`); await evaluate(`document.fonts.ready`);
    await evaluate(`window.__sr.midi.simulateDevices(['Digital piano'])`);
    await shot('today');

    // A planned practice opens with the Hanon warm-up and its hand-position guide.
    await act('start-plan', 'store-next'); await wait(`document.querySelector('.cp-session-warmup svg')`);
    await shot('warmup-session');
    await act('warmup-guide'); await wait(`document.querySelector('#cp-dialog[open] .cp-warmup-guide')`);
    await shot('warmup-guide');
    await evaluate(`document.querySelector('#cp-dialog').close()`);
    await act('open-reader'); await wait(`document.querySelector('#cp-dialog[open] [data-warmup-start]')`);
    await evaluate(`document.querySelector('[data-warmup-start]').click()`); await wait(`window.__sr.timed && window.__sr.timed.suspendedAt==null`);
    await evaluate(`new Promise(r=>setTimeout(r,600))`); await evaluate(`document.querySelector('#start').click()`);
    await evaluate(`document.querySelector('#feedback').textContent=''`);
    await shot('warmup-score');

    // Two-hand sight-reading on the grand staff, with the bass holding its pattern.
    await evaluate(`document.querySelector('#practice-advance').click()`); await wait(`document.querySelector('[data-action=open-reader]')`);
    await act('next-block'); await wait(`document.querySelector('.cp-session-card .eyebrow')?.textContent.includes('3')`);
    await act('open-reader'); await wait(`window.__sr.timed && window.__sr.timed.suspendedAt==null`);
    await evaluate(`new Promise(r=>setTimeout(r,600))`); await evaluate(`document.querySelector('#start').click()`);
    await evaluate(`document.querySelector('#feedback').textContent=''`);
    await shot('reading-two-hands');
    await evaluate(`document.querySelector('#practice-return').click()`); await wait(`document.querySelector('[data-action=discard-session]')`);
    await act('discard-session'); await evaluate(`document.querySelector('#cp-confirm').click()`); await wait(`document.querySelector('.cp-today')`);

    // Reading without a piano: the on-screen keyboard.
    await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=reading]').click()`);
    await evaluate(`{const c=document.querySelector('[name=context]');c.value='mobile';c.dispatchEvent(new Event('change',{bubbles:true}));}`);
    await evaluate(`document.querySelector('#prepare-form').requestSubmit()`); await wait(`document.querySelector('[data-action=open-reader]')`);
    await act('open-reader'); await wait(`window.__sr.timed && window.__sr.timed.suspendedAt==null`);
    await evaluate(`new Promise(r=>setTimeout(r,600))`); await evaluate(`document.querySelector('#start').click()`);
    await evaluate(`document.querySelector('#feedback').textContent=''`);
    await shot('reading-keyboard');
    await evaluate(`document.querySelector('#practice-return').click()`); await wait(`document.querySelector('[data-action=discard-session]')`);
    await act('discard-session'); await evaluate(`document.querySelector('#cp-confirm').click()`); await wait(`document.querySelector('.cp-today')`);

    // Planning and the repertoire library.
    await evaluate(`document.querySelector('.cp-nav [data-action=calendar]').click()`); await wait(`document.querySelector('.cp-page[data-view=calendar]')`);
    await shot('calendar');
    await evaluate(`document.querySelector('.cp-nav [data-action=piano]').click()`); await wait(`document.querySelector('.cp-page[data-view=piano]')`);
    await act('catalog'); await wait(`document.querySelector('.cp-page[data-view=catalog]') && !document.querySelector('.cp-page [role=status]')?.textContent.includes('…')`);
    await shot('catalogue');
    if (errors.length) throw new Error(`${lang}/${device.id}: ${JSON.stringify(errors[0])}`);
    console.log(`${lang}/${device.id}: ${index} screenshots`);
    while (cleanup.length) await cleanup.pop()();
  }
} finally {
  while (cleanup.length) await cleanup.pop()().catch(() => {});
}
