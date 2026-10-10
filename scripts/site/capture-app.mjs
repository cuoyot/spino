// Current website imagery, isolated from personal notebooks and prior evidence.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { openBrowser } from '../../tests/browser.js';
import { storeNotebook } from '../store/store-fixtures.mjs';
import { beginSession, saveSession, addDays } from '../../src/companion/model.js';
import { quickPractice } from '../../src/companion/quick-practice.js';
import { emptyQuickScore, addQuickAnswer } from '../../src/companion/quick-score.js';

const folder = resolve('docs/quality-review/captures/website', process.argv[2] || '2026-10-07-current-app-07');
const cleanup = [], frames = [];
await mkdir(folder, { recursive: true });
try {
  const { send, evaluate, url, errors } = await openBrowser({ after: fn => cleanup.push(fn) }, { companion: true });
  const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('Website capture timeout: '+${JSON.stringify(condition)}));}},20);})`);
  for (const language of ['en', 'es', 'ca']) {
    await send('Emulation.setDeviceMetricsOverride', { width: 432, height: 768, deviceScaleFactor: 2.5, mobile: true });
    await send('Page.navigate', { url }); await wait(`document.querySelector('.cp-today')`);
    const fixture = storeNotebook(language === 'ca' ? 'es' : language);
    fixture.preferences.language = language;
    fixture.preferences.weeklyMinutes = 90;
    // Keep the reusable sequence and its add/total/save controls visible in one phone frame.
    fixture.routines[0].blocks = fixture.routines[0].blocks.filter(b => b.type !== 'technique');
    for (const row of [...fixture.plans, ...fixture.events, ...fixture.sessions]) row.date = addDays(row.date, 6);
    if (language === 'ca') {
      fixture.routines[0].title = 'La meva rutina de 40 minuts';
      fixture.routines[1].title = 'Lectura sense piano';
      fixture.plans.forEach(p => { p.title = 'Lectura i repertori'; });
      fixture.events.forEach(e => { e.title = e.type === 'Clase' ? 'Classe de piano' : 'Audició de tardor'; });
      fixture.sessions.forEach(s => { s.title = 'Pràctica de piano'; s.notes = 'Pols més estable. Repassar el canvi de posició.'; });
      fixture.works[0].passage = 'Compassos 1–8';
    }
    const prior = beginSession(quickPractice(fixture.preferences));
    prior.title = language === 'ca' ? 'Pràctica ràpida' : language === 'es' ? 'Práctica rápida' : 'Quick practice';
    prior.quickScore = addQuickAnswer(emptyQuickScore(), true, 3000);
    saveSession(fixture, prior);
    await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve();};};})`);
    await send('Page.navigate', { url }); await wait(`document.querySelector('.cp-today')`);
    assert.equal(await evaluate(`document.documentElement.lang`), language);
    const capture = async (name, device = 'phone') => {
      await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
      const { data } = await send('Page.captureScreenshot', { format: 'png' });
      const bytes = Buffer.from(data, 'base64'), path = `${language}/${device}/${name}.png`;
      await mkdir(join(folder, language, device), { recursive: true });
      await writeFile(join(folder, path), bytes);
      frames.push({ language, device, path, sha256: createHash('sha256').update(bytes).digest('hex') });
      console.log(path);
    };
    await capture('01-today');
    await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=routines]').click();document.querySelector('[data-action=edit-routine][data-id="store-routine"]').click()`);
    await wait(`document.querySelector('.cp-routine-builder')`); await capture('02-routine');
    await evaluate(`document.querySelector('.cp-nav [data-action=piano]').click()`);
    await wait(`document.querySelector('[data-view=piano],[data-view=repertoire]')`); await capture('03-repertoire');
    await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=quick-practice]').click()`);
    await wait(`document.querySelector('#app-shell').hidden`);
    for (let i = 0; i < 2; i++) {
      await evaluate(`(()=>{const note=__sr.line.notes[__sr.line.idx],key=document.querySelector('#piano [data-midi="'+note.midi+'"]');key.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1}));key.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));})()`);
      await wait(`Number(document.querySelector('#s-correct').textContent)===${i + 1}`);
    }
    await evaluate(`new Promise(resolve=>setTimeout(resolve,1400))`); await capture('04-quick-practice');
    await evaluate(`document.querySelector('#practice-advance').click()`); await wait(`document.querySelector('[data-action=quick-finish]')`);
    await evaluate(`document.querySelector('[data-action=quick-finish]').click()`); await wait(`document.querySelector('.cp-quick-result')`);
    await evaluate(`new Promise(resolve=>setTimeout(resolve,700))`); await capture('05-quick-result');
    await evaluate(`document.querySelector('[data-action=close-dialog]').click();document.querySelector('.cp-nav [data-action=progress]').click()`);
    await wait(`document.querySelector('.cp-progress-page')`); await capture('06-progress');
    await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 2, mobile: true });
    // A synthetic pending two-hand block opens through the real session entry.
    const active = beginSession({ title: language === 'ca' ? 'Lectura a dues mans' : language === 'es' ? 'Lectura a dos manos' : 'Two-hand reading', context: 'piano', blocks: [fixture.routines[0].blocks.find(b => b.type === 'reading')] });
    fixture.active = active;
    await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve();};};})`);
    await send('Page.navigate', { url }); await wait(`document.querySelector('.cp-today')`);
    await evaluate(`document.querySelector('[data-action=resume-session]').click()`); await wait(`document.querySelector('[data-action=open-reader]')`);
    await evaluate(`document.querySelector('[data-action=open-reader]').click()`); await wait(`document.querySelector('#app-shell').hidden`);
    await evaluate(`new Promise(resolve=>setTimeout(resolve,4500))`);
    await capture('wide-reading', 'tablet');
    if (language === 'ca') {
      for (const device of [{ id: 'phone-landscape', width: 844, height: 390 }, { id: 'tablet-portrait', width: 768, height: 1024 }]) {
        await send('Emulation.setDeviceMetricsOverride', { width: device.width, height: device.height, deviceScaleFactor: 1, mobile: true });
        await evaluate(`new Promise(resolve=>setTimeout(resolve,350))`);
        await capture('reading', device.id);
      }
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(join(folder, 'capture.json'), JSON.stringify({ date: '2026-10-07', surface: 'Responsive browser, not native-device acceptance', fixture: 'Disposable synthetic notebook; no personal data', sourceSha256: createHash('sha256').update(await readFile('src/companion/locale-ca.js')).digest('hex'), frames }, null, 2));
} catch (error) {
  console.error(error);
  throw error;
} finally { for (const close of cleanup.reverse()) await close(); }
