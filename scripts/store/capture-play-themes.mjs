// Store assets from the production UI, using disposable synthetic notebooks.
// Usage: node scripts/store/capture-play-themes.mjs <new-run-id> [es en]
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { openBrowser } from '../../tests/browser.js';
import { storeNotebook } from './store-fixtures.mjs';
import { addDays, block, beginSession, saveSession, validateData } from '../../src/companion/model.js';
import { WARMUP_DEFAULTS } from '../../src/companion/warmups.js';

const run = process.argv[2];
assert.match(run || '', /^[a-z0-9][a-z0-9-]+$/, 'Pass a new dated run ID.');
const folder = resolve('docs/play-store/screenshots', run);
await mkdir(folder); // Preserve previous captures, including earlier runs of this driver.
const languages = process.argv.slice(3).length ? process.argv.slice(3) : ['es', 'en'];
const devices = [
  { id: 'phone', width: 432, height: 768, scale: 2.5 },
  { id: 'tablet-7', width: 720, height: 1280, scale: 1.5 },
  { id: 'tablet-10', width: 1280, height: 720, scale: 1.5 },
];
const fixed = Date.parse('2026-10-15T10:00:00.000Z');
const frames = [], fixtures = {}, cleanup = [];
const hash = value => createHash('sha256').update(value).digest('hex');
const labels = {
  es: ['Tu práctica de hoy', 'Elige cómo practicar', 'Planifica tu semana', 'Tu progreso', 'Tu repertorio', 'Calentamiento Hanon', 'Lectura sin piano', 'Metrónomo y práctica libre'],
  en: ['Your practice today', 'Choose your practice', 'Plan your week', 'Your progress', 'Your repertoire', 'Hanon warm-up', 'Reading without a piano', 'Metronome and free practice'],
};
try {
  for (const lang of languages) for (const theme of ['light', 'dark']) for (const device of devices) {
    const target = join(folder, lang, theme, device.id);
    await mkdir(target, { recursive: true });
    const fixture = storeNotebook(lang);
    fixture.preferences = { ...fixture.preferences, theme, weeklyMinutes: 150, warmup: { ...WARMUP_DEFAULTS, enabled: true } };
    for (const row of [...fixture.plans, ...fixture.events, ...fixture.sessions]) row.date = addDays(row.date, 14);
    fixture.works[0].onStand = true;
    fixture.works.push({ ...fixture.works[0], id: 'store-prelude', title: 'Prélude en do majeur · BWV 846', composer: 'Johann Sebastian Bach', stage: 'Por empezar', passage: '', notes: '', onStand: true },
      { ...fixture.works[0], id: 'store-gymnopedie', title: 'Gymnopédie n.º 1', composer: 'Erik Satie', stage: 'Consolidando', passage: '', notes: '', onStand: false });
    for (const [type, minutes, date, mood] of [['reading', 15, '2026-10-13', 4], ['free', 10, '2026-10-14', 5]]) {
      const active = beginSession({ title: lang === 'es' ? 'Práctica de piano' : 'Piano practice', context: 'piano', blocks: [block(type, { id: `store-${type}-block`, minutes })] }, fixed);
      active.id = `store-${type}-session`; active.date = date; active.elapsedMs = active.blockElapsedMs = minutes * 60000;
      saveSession(fixture, active, { mood }, fixed);
    }
    validateData(fixture);
    fixtures[`${lang}-${theme}`] = fixture;
    const { send, evaluate, url, errors } = await openBrowser({ after: fn => cleanup.push(fn) }, { companion: true, language: lang });
    await send('Emulation.setTimezoneOverride', { timezoneId: 'Europe/Madrid' });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: `{const O=Date;window.Date=class extends O{constructor(...args){super(...(args.length?args:[${fixed}]))}static now(){return ${fixed}}};}` });
    await send('Emulation.setDeviceMetricsOverride', { width: device.width, height: device.height, deviceScaleFactor: device.scale, mobile: true });
    const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{let ok=false;try{ok=!!(${condition})}catch{}if(ok){clearInterval(timer);resolve()}else if(++n>600){clearInterval(timer);reject(Error('Store capture timeout: '+${JSON.stringify(condition)}))}},20)})`);
    const act = (name, id) => evaluate(`document.querySelector('[data-action="${name}"]${id ? `[data-id="${id}"]` : ''}').click()`);
    const seed = async data => {
      await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=()=>{db.close();resolve()}}})`);
      await send('Page.reload'); await wait(`document.querySelector('.cp-today')`);
    };
    await send('Page.navigate', { url }); await wait(`document.querySelector('.cp-today')`); await seed(fixture);
    let index = 0;
    const shot = async name => {
      await evaluate(`document.fonts.ready;document.querySelector('#cp-toast').hidden=true;new Promise(r=>setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(r)),180))`);
      assert.equal(await evaluate(`document.documentElement.lang`), lang);
      assert.equal(await evaluate(`document.querySelector('.cp-page')?.scrollWidth>document.querySelector('.cp-page')?.clientWidth+1`), false);
      const capture = await send('Page.captureScreenshot', { format: 'png' }), bytes = Buffer.from(capture.data, 'base64');
      const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
      assert.equal(bytes[25], 2, 'Google Play images must be opaque RGB PNGs.');
      assert.ok(Math.min(width, height) >= 1080 && Math.max(width, height) <= 3840 && Math.max(width, height) / Math.min(width, height) <= 2);
      const path = `${lang}/${theme}/${device.id}/${String(++index).padStart(2, '0')}-${name}.png`;
      await writeFile(join(folder, path), bytes);
      frames.push({ path, lang, theme, device: device.id, width, height, bytes: bytes.length, sha256: hash(bytes), alt: labels[lang][index - 1] });
      console.log(path);
    };
    await shot('today');
    await act('practice'); await shot('practice');
    await act('calendar'); await shot('calendar');
    await act('progress'); await shot('progress');
    await act('piano'); await wait(`document.querySelector('[data-view=piano],[data-view=repertoire]')`); await shot('repertoire');
    await act('home'); await act('start-plan', 'store-next'); await wait(`document.querySelector('.cp-session-warmup')`); await shot('warmup');
    await seed(fixture); await act('practice'); await act('quick-practice'); await wait(`document.querySelector('#app-shell').hidden && window.__sr?.line`);
    await evaluate(`new Promise(r=>setTimeout(r,1000))`); await shot('reading-keyboard');
    const free = structuredClone(fixture);
    free.active = beginSession({ title: lang === 'es' ? 'Práctica libre' : 'Free practice', context: 'piano', blocks: [block('free', { id: 'store-free-block', minutes: 15 })] }, fixed);
    free.active.id = 'store-free-active';
    free.active.freeMetronome = { bpm: 72, volume: 60, favorites: [60, 72, 90], mode: 'both', beats: 4, subdivision: 1 };
    await seed(free); await act('resume-session'); await act('open-free-practice'); await wait(`document.querySelector('.cp-metronome')`); await shot('metronome');
    assert.deepEqual(errors, []);
    while (cleanup.length) await cleanup.pop()();
  }
  await writeFile(join(folder, 'fixtures.json'), JSON.stringify(fixtures, null, 2));
  const version = JSON.parse(await readFile('package.json', 'utf8')).version;
  await writeFile(join(folder, 'manifest.json'), JSON.stringify({ version, date: '2026-10-15', surface: 'Production responsive browser UI; native-device visual acceptance remains separate.', personalData: false, devices, frames }, null, 2));
  const esc = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  await writeFile(join(folder, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>SPino · Google Play screenshots</title><style>body{font:16px system-ui;background:#151922;color:#e8eaed;margin:24px}h1{font-size:26px}nav a{color:#9bc0ff;margin-right:20px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:20px}figure{margin:0;padding:12px;background:#252c38;border-radius:12px}img{width:100%;height:340px;object-fit:contain}a{color:inherit}figcaption{margin-top:10px;font-size:13px}</style><h1>SPino ${version} · Google Play</h1><p>Actual app UI · synthetic notebooks · light and dark · Spanish and English</p><div class="grid">${frames.map(f => `<figure><a href="${esc(f.path)}"><img loading="lazy" src="${esc(f.path)}" alt="${esc(f.alt)}"></a><figcaption>${esc(f.path)} · ${f.width}×${f.height}</figcaption></figure>`).join('')}</div>`);
  console.log(`${frames.length} verified screenshots: ${folder}`);
} finally { while (cleanup.length) await cleanup.pop()().catch(() => {}); }
