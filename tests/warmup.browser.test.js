import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser, disableWarmup } from './browser.js';

test('piano sessions open with a Hanon warm-up that explains itself, rotates and can be switched off', { timeout: 90000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url });
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve(true);}else if(++n>500){clearInterval(timer);reject(Error('Timeout: '+${JSON.stringify(expression)}));}},20);})`);
  const action = (name, id = '') => evaluate(`document.querySelector('[data-action="${name}"]${id ? `[data-id="${id}"]` : ''}').click()`);
  const read = () => evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{resolve(q.result);db.close();};};})`);
  const prepare = async context => {
    await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=reading]').click()`);
    await evaluate(`{const c=document.querySelector('[name=context]');c.value='${context}';c.dispatchEvent(new Event('change',{bubbles:true}));}`);
    await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);
    await wait(`document.querySelector('[data-action=session-end]')`);
  };
  await wait(`document.querySelector('#app-shell h1')`);

  // Without a piano there is no warm-up to play.
  await prepare('mobile');
  assert.equal(await evaluate(`document.querySelector('.cp-session-card .eyebrow').textContent`), 'Bloque 1 de 1 · Lectura');
  await action('discard-session'); await evaluate(`document.querySelector('#cp-confirm').click()`); await wait(`document.querySelector('.cp-today')`);

  // With a piano the session starts with Hanon No. 1, shown on the keyboard with both hands.
  assert.match(await evaluate(`(document.querySelector('.cp-nav [data-action=practice]').click(),document.querySelector('[data-action=prepare][data-id=reading]').click(),document.querySelector('[name=context]').value='piano',document.querySelector('[name=context]').dispatchEvent(new Event('change',{bubbles:true})),document.querySelector('.cp-practice-warmup')?.textContent||'')`), /Incluir calentamiento Hanon · 3 min/);
  await evaluate(`document.querySelector('#prepare-form').requestSubmit()`); await wait(`document.querySelector('[data-action=session-end]')`);
  assert.equal(await evaluate(`document.querySelector('.cp-session-card .eyebrow').textContent`), 'Bloque 1 de 2 · Calentamiento');
  // At pianist level 1 three minutes hold two exercises, played one after another.
  assert.equal(await evaluate(`document.querySelector('#session-current-title').textContent`), 'Hanon n.º 1 · 2');
  assert.equal(await evaluate(`document.querySelectorAll('.cp-session-warmup .ha-poster').length`), 1);
  assert.equal(await evaluate(`document.querySelector('.cp-session-warmup img').getAttribute('src')`), './warmups/hanon-frames-v2/posters/hanon-1-both.webp');
  const stored = await read();
  assert.deepEqual(stored.active.blocks.map(b => b.type), ['warmup', 'reading']);
  assert.equal(stored.active.blocks[0].hand, 'both');

  // "How to play" opens the guide with its demonstration; the demo lights keys and fingers.
  await action('warmup-guide'); await wait(`document.querySelector('#cp-dialog[open] .cp-warmup-guide')`);
  assert.equal(await evaluate(`document.querySelectorAll('#cp-dialog .wg-figure li').length`), 16);
  assert.equal(await evaluate(`document.querySelector('#cp-dialog .wg-set b').textContent`), 'Ejercicio 1 de 2');
  await evaluate(`document.querySelector('#cp-dialog [data-warmup-step="1"]').click()`);
  assert.match(await evaluate(`document.querySelector('#cp-dialog .wg-focus').textContent`), /Hanon n\.º 2/);
  await evaluate(`document.querySelector('#cp-dialog [data-warmup-step="0"]').click()`);
  await wait(`document.querySelector('#cp-dialog [data-hanon-animation]')?.dataset.ready==='true'`);
  assert.equal(await evaluate(`document.querySelectorAll('#cp-dialog canvas').length`), 1);
  assert.equal(await evaluate(`document.querySelector('#cp-dialog [data-hanon-animation]').dataset.playing`), undefined);
  await evaluate(`(async()=>{const r=document.querySelector('#cp-dialog [data-hanon-animation]');await r.hanonPlayer.seek(0);const original=window.requestAnimationFrame;window.requestAnimationFrame=callback=>{window.requestAnimationFrame=original;return original(time=>callback(time-80));};r.querySelector('[data-ha-play]').click();})()`);
  await wait(`Number(document.querySelector('#cp-dialog [data-hanon-animation]').dataset.event)>0`);
  await evaluate(`document.querySelector('#cp-dialog [data-ha-play]').click();document.querySelector('#cp-dialog [data-hanon-animation]').hanonPlayer.seek(3)`);
  await wait(`document.querySelector('#cp-dialog [data-hanon-animation]').dataset.frame==='3'`);
  await evaluate(`document.querySelector('#cp-dialog [data-ha-next]').click()`);
  await wait(`document.querySelector('#cp-dialog [data-hanon-animation]').dataset.event==='1'`);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('#cp-dialog .wg-figure li.is-playing b')].map(el=>el.textContent)`), ['2','4']);
  await evaluate(`document.querySelector('#cp-dialog [data-ha-play]').click()`);
  await wait(`document.querySelector('#cp-dialog [data-hanon-animation]').dataset.playing==='true'`);
  await wait(`Number(document.querySelector('#cp-dialog [data-hanon-animation]').dataset.event)>1`);
  await evaluate(`document.querySelector('#cp-dialog [data-ha-play]').click()`);
  assert.equal(await evaluate(`document.querySelector('#cp-dialog [data-hanon-animation]').dataset.playing`), 'false');
  await evaluate(`document.querySelector('#cp-dialog [data-action=close-dialog]').click()`);
  await wait(`!document.querySelector('#cp-dialog').open`);

  // The guide is available on demand; the exercise opens directly with fingering on the grand staff.
  await action('open-reader'); await wait(`__sr.timed && __sr.timed.suspendedAt==null`);
  const reader = await evaluate(`({title:document.querySelector('#practice-title').textContent,guide:!document.querySelector('#practice-guide').hidden,advance:document.querySelector('#practice-advance').getAttribute('aria-label'),fingers:document.querySelector('#finger-btn').title,clef:__sr.layout.rows?__sr.layout.rows.length:0,treble:__sr.line.notes.filter(n=>n.clef==='treble').slice(0,5).map(n=>n.letter+n.octave+n.finger).join(' '),bass:__sr.line.notes.filter(n=>n.clef==='bass').slice(0,5).map(n=>n.letter+n.octave+n.finger).join(' ')})`);
  assert.equal(reader.title, 'Calentamiento · Hanon n.º 1 · 2');
  assert.match(await evaluate(`document.querySelector('#key-name').textContent`), /Hanon n\.º 1 · 1\/2/);
  assert.ok(reader.guide); assert.equal(reader.advance, 'Siguiente: Lectura');
  assert.match(reader.fingers, /Sí|On/);
  assert.equal(reader.treble, 'c41 e42 f43 g44 a45');
  assert.equal(reader.bass, 'c35 e34 f33 g32 a31');
  // Common controls stay directly visible; Settings opens the Practice tab without
  // putting a settings entry inside another menu.
  const quickAccess = await evaluate(`({
    menu:!!document.querySelector('#practice-tools-toggle'),
    settings:document.querySelector('#q-clef').parentElement.className,
    sound:document.querySelector('#q-sound').parentElement.id,
    guide:document.querySelector('#guide-btn').parentElement.id,
    fingers:document.querySelector('#finger-btn').parentElement.id,
    recenter:document.querySelector('#kb-auto').parentElement.id,
    range:document.querySelector('#kb-shift').parentElement.id,
    soundLabel:document.querySelector('#q-sound').getAttribute('aria-label'),
    clock:document.querySelector('#practice-clock').closest('#start')!==null
  })`);
  assert.deepEqual(quickAccess, { menu:false, settings:'quick', sound:'practice-settings-shortcuts', guide:'practice-settings-shortcuts', fingers:'practice-settings-shortcuts', recenter:'managed-keyboard-position', range:'managed-keyboard-position', soundLabel:'Sonido: Piano', clock:true });
  await evaluate(`document.querySelector('#q-clef').click()`); await wait(`document.querySelector('#settings').open`);
  assert.equal(await evaluate(`document.querySelector('#settings [data-tab="practice"]').classList.contains('on') && !document.querySelector('#settings [data-panel="practice"]').hidden`), true);
  await evaluate(`document.querySelector('#settings button[value="close"]').click()`); await wait(`!document.querySelector('#settings').open`);
  // The toolbar "?" reopens the guide while pausing; the session continues afterwards.
  await evaluate(`document.querySelector('#practice-guide').click()`); await wait(`document.querySelector('#cp-dialog[open] .cp-warmup-guide')`);
  assert.ok(await evaluate(`__sr.timed.suspendedAt!=null`));
  await evaluate(`document.querySelector('[data-warmup-start]').click()`); await wait(`__sr.timed && __sr.timed.suspendedAt==null`);

  // Finishing the block moves on to the reading; saving the session makes the next warm-up Hanon No. 2.
  await evaluate(`document.querySelector('#practice-advance').click()`); await wait(`document.querySelector('.cp-session-card .eyebrow')?.textContent.includes('Bloque 2 de 2')`);
  assert.equal((await read()).active.results[0].block.type, 'warmup');
  await action('session-end'); await wait(`document.querySelector('#cp-dialog[open] button[value=save]')`);
  await evaluate(`document.querySelector('#cp-dialog form').requestSubmit(document.querySelector('#cp-dialog button[value=save]'))`);
  await wait(`document.querySelector('.cp-today')`);
  assert.equal((await read()).sessions[0].results.map(r => r.block.type).join(','), 'warmup,reading');
  await prepare('piano');
  assert.equal(await evaluate(`document.querySelector('#session-current-title').textContent`), 'Hanon n.º 2 · 3');
  await action('discard-session'); await evaluate(`document.querySelector('#cp-confirm').click()`); await wait(`document.querySelector('.cp-today')`);

  // Practice preferences switch the warm-up off.
  await disableWarmup(evaluate);
  await prepare('piano');
  assert.equal(await evaluate(`document.querySelector('.cp-session-card .eyebrow').textContent`), 'Bloque 1 de 1 · Lectura');
  assert.deepEqual(errors, []);
});
