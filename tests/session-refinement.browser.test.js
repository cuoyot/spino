import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openBrowser } from './browser.js';
import { emptyData, block, beginSession, finishBlock } from '../src/companion/model.js';

function notebook({ sequence = false } = {}) {
  const data = emptyData();
  data.preferences.language = 'es';
  data.preferences.warmup = { enabled: false, minutes: 3, exercise: 'rotate' };
  const blocks = sequence ? [
    block('free', { id: 'finished-block', minutes: 10 }),
    block('free', { id: 'current-block', minutes: 10 }),
    block('reading', { id: 'future-reading', minutes: 10 }),
    block('technique', { id: 'future-technique', minutes: 10 }),
  ] : [block('repertoire', { id: 'current-block', minutes: 40 })];
  const source = { title: 'Session regression fixture', context: 'piano', blocks };
  data.routines.push({ ...structuredClone(source), id: 'source-routine' });
  data.active = beginSession({ ...source, planId: 'source-plan' });
  data.active.id = 'active-session';
  data.plans.push({ ...structuredClone(source), id: 'source-plan', date: data.active.date, time: '', status: 'planned', reminder: false });
  if (sequence) {
    data.active.elapsedMs = data.active.blockElapsedMs = 10 * 60000;
    finishBlock(data.active);
  }
  data.active.elapsedMs += 8 * 60000;
  data.active.blockElapsedMs = 8 * 60000;
  return data;
}

async function openSession(t, data) {
  const browser = await openBrowser(t, { companion: true });
  const { send, evaluate, url } = browser;
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__sessionTestNow = Date.now(); Date.now = () => window.__sessionTestNow;` });
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let attempts=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve();}else if(++attempts>400){clearInterval(timer);reject(Error('Session test timed out: '+${JSON.stringify(expression)}));}},25);})`);
  const read = () => evaluate(`new Promise((resolve,reject)=>{const request=indexedDB.open('cuaderno-piano',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,get=db.transaction('state').objectStore('state').get('current');get.onsuccess=()=>{resolve(get.result);db.close();};get.onerror=()=>reject(get.error);};})`);
  const waitStored = async predicate => {
    for (let attempt = 0; attempt < 200; attempt++) {
      const value = await read();
      if (predicate(value)) return value;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.fail('The expected session state was not persisted.');
  };
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const action = (name, id) => click(`[data-action="${name}"]${id == null ? '' : `[data-id="${id}"]`}`);
  await send('Page.navigate', { url });
  await wait(`document.querySelector('.cp-today')`);
  await evaluate(`new Promise((resolve,reject)=>{const request=indexedDB.open('cuaderno-piano',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};})`);
  await send('Page.reload');
  await wait(`document.querySelector('[data-action=resume-session]')`);
  await action('resume-session');
  await wait(`document.querySelector('[data-action=session-end]')`);
  return { ...browser, wait, read, waitStored, click, action };
}

test('cancelling final-block feedback keeps the current block usable and records it once', { timeout: 30000 }, async t => {
  const fixture = notebook();
  const { evaluate, wait, read, waitStored, action, click, errors } = await openSession(t, fixture);
  await action('session-end');
  await wait(`document.querySelector('#cp-dialog[open] button[value=save]')`);
  await click('#cp-dialog [data-action=close-dialog]');
  await wait(`!document.querySelector('#cp-dialog').open && document.querySelector('[data-action=toggle-session]')`);
  const paused = await read();
  assert.equal(paused.active.blockIndex, 0);
  assert.equal(paused.active.blocks[0].id, 'current-block');
  assert.equal(paused.active.results.length, 0, 'Opening feedback must not finalize a block before saving.');
  assert.equal(paused.active.elapsedMs, fixture.active.elapsedMs);
  await action('toggle-session');
  await waitStored(data => data.active.runningSince != null);
  await evaluate(`window.__sessionTestNow += 60000`);
  await action('toggle-session');
  await waitStored(data => data.active.runningSince == null && data.active.elapsedMs === fixture.active.elapsedMs + 60000);
  await action('session-end');
  await wait(`document.querySelector('#cp-dialog[open] button[value=save]')`);
  await evaluate(`document.querySelector('#cp-dialog form').requestSubmit(document.querySelector('#cp-dialog button[value=save]'))`);
  const saved = await waitStored(data => !data.active && data.sessions.length === 1);
  assert.equal(saved.sessions[0].results.length, 1);
  assert.equal(saved.sessions[0].results[0].elapsedMs, 9 * 60000);
  assert.deepEqual(errors, []);
});

test('a failed feedback save preserves the pending session and can be retried exactly once', { timeout: 30000 }, async t => {
  const fixture = notebook();
  const { evaluate, wait, read, waitStored, action, errors } = await openSession(t, fixture);
  await action('session-end');
  await evaluate(`window.originalPut=IDBObjectStore.prototype.put;window.failNextWrite=true;IDBObjectStore.prototype.put=function(value,key,...rest){if(key==='current'&&value.active===null&&window.failNextWrite){window.failNextWrite=false;throw Error('Simulated feedback save failure');}return originalPut.call(this,value,key,...rest);};document.querySelector('#cp-dialog [name=notes]').value='Keep this feedback after retry';document.querySelector('#cp-dialog form').requestSubmit(document.querySelector('#cp-dialog button[value=save]'))`);
  await wait(`document.querySelector('#cp-form-error').textContent.includes('Simulated feedback save failure')`);
  const failed = await read();
  assert.equal(failed.active.id, fixture.active.id);
  assert.equal(failed.active.elapsedMs, fixture.active.elapsedMs);
  assert.deepEqual(failed.active.results, fixture.active.results);
  assert.equal(failed.sessions.length, 0);
  assert.equal(failed.plans[0].status, 'planned');
  await evaluate(`IDBObjectStore.prototype.put=originalPut;document.querySelector('#cp-dialog form').requestSubmit(document.querySelector('#cp-dialog button[value=save]'))`);
  await wait(`!document.querySelector('#cp-dialog').open && document.querySelector('.cp-today')`);
  const saved = await waitStored(data => !data.active && data.sessions.length === 1);
  assert.equal(saved.sessions[0].id, fixture.active.id);
  assert.equal(saved.sessions[0].notes, 'Keep this feedback after retry');
  assert.equal(saved.sessions[0].results.length, 1);
  assert.equal(saved.plans[0].sessionId, fixture.active.id);
  assert.deepEqual(errors, []);
});

test('a simulated background pause refreshes the manual timer control before resuming', { timeout: 30000 }, async t => {
  const { evaluate, wait, waitStored, action, errors } = await openSession(t, notebook());
  const label = () => evaluate(`document.querySelector('[data-action=toggle-session]').getAttribute('aria-label')`);
  const pausedLabel = await label();
  await action('toggle-session');
  await waitStored(data => data.active.runningSince != null);
  const runningLabel = await label();
  assert.notEqual(runningLabel, pausedLabel);
  // This exercises the visibility handler; it does not emulate native OS suspension.
  await evaluate(`window.__sessionTestNow+=60000;Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));`);
  await waitStored(data => data.active.runningSince == null);
  await wait(`document.querySelector('[data-action=toggle-session]').getAttribute('aria-label')===${JSON.stringify(pausedLabel)}`);
  await action('toggle-session');
  await waitStored(data => data.active.runningSince != null);
  assert.equal(await label(), runningLabel);
  assert.deepEqual(errors, []);
});

test('live session edits preserve completed work, source plans and routines across reload', { timeout: 40000 }, async t => {
  const fixture = notebook({ sequence: true });
  fixture.works.push({ id: 'repertoire-work', title: 'Study in G', composer: '', stage: 'En estudio', notes: '', passage: 'Bars 1–8', target: 'G-major', bpm: 72 });
  const { send, evaluate, wait, waitStored, action, errors } = await openSession(t, fixture);
  assert.equal(await evaluate(`document.querySelector('[data-session-minutes="finished-block"]')`), null, 'Completed blocks are read-only.');
  await action('open-free-practice');
  await waitStored(data => data.active.runningSince != null);
  await evaluate(`window.__sessionTestNow+=60000;document.querySelector('[data-action=free-return]').click();const input=document.querySelector('[data-session-minutes="current-block"]');input.value='17';input.dispatchEvent(new Event('change',{bubbles:true}));`);
  let changed = await waitStored(data => data.active.blocks[1].minutes === 17);
  assert.equal(changed.active.runningSince, null, 'Editing pauses and retains the time already played.');
  assert.equal(changed.active.elapsedMs, 19 * 60000);
  assert.equal(changed.active.blockElapsedMs, 9 * 60000);

  await action('session-block-up', 'future-technique');
  await waitStored(data => data.active.blocks[2].id === 'future-technique');
  await action('session-block-down', 'future-technique');
  await waitStored(data => data.active.blocks[3].id === 'future-technique');

  // Moving the current block temporarily must restore its own elapsed time on return.
  await action('session-block-down', 'current-block');
  changed = await waitStored(data => data.active.blocks[data.active.blockIndex].id === 'future-reading');
  assert.equal(changed.active.elapsedMs, 19 * 60000);
  assert.equal(changed.active.blockElapsedMs, 0);
  await action('session-block-up', 'current-block');
  changed = await waitStored(data => data.active.blocks[data.active.blockIndex].id === 'current-block');
  assert.equal(changed.active.blockElapsedMs, 9 * 60000);

  await action('session-add-block');
  await wait(`document.querySelector('#session-add-form')`);
  await evaluate(`const select=document.querySelector('#session-add-form [name=type]');select.value='repertoire';select.dispatchEvent(new Event('change',{bubbles:true}));`);
  assert.deepEqual(await evaluate(`({visible:!document.querySelector('#session-add-form [data-session-work]').hidden,required:document.querySelector('#session-add-form [name=workId]').required})`), { visible: true, required: false }, 'The piece can also be chosen at practice time.');
  await evaluate(`document.querySelector('#session-add-form [name=workId]').value='repertoire-work';`);
  await evaluate(`document.querySelector('#session-add-form [name=minutes]').value='6';document.querySelector('#session-add-form').requestSubmit()`);
  await wait(`!document.querySelector('#cp-dialog').open`);
  changed = await waitStored(data => data.active.blocks.length === 5);
  const added = changed.active.blocks.at(-1);
  assert.equal(added.type, 'repertoire');
  assert.equal(added.minutes, 6);
  assert.equal(added.workId, 'repertoire-work');
  assert.equal(added.target, 'G-major');
  assert.equal(added.bpm, 72);
  assert.equal(added.passage, 'Bars 1–8');
  assert.ok(!fixture.active.blocks.some(item => item.id === added.id));

  await action('session-block-remove', 'future-reading');
  changed = await waitStored(data => !data.active.blocks.some(item => item.id === 'future-reading'));
  const expectedOrder = ['finished-block', 'current-block', 'future-technique', added.id];
  assert.deepEqual(changed.active.blocks.map(item => item.id), expectedOrder);
  assert.equal(changed.active.id, fixture.active.id);
  assert.equal(changed.active.blocks[changed.active.blockIndex].id, 'current-block');
  assert.deepEqual(changed.active.results, fixture.active.results);
  assert.deepEqual(changed.routines, fixture.routines);
  assert.deepEqual(changed.plans, fixture.plans);
  assert.deepEqual(changed.works, fixture.works);

  await send('Page.reload');
  await wait(`document.querySelector('[data-action=resume-session]')`);
  await action('resume-session');
  await wait(`document.querySelector('[data-session-minutes="current-block"]')`);
  changed = await waitStored(data => data.active?.id === fixture.active.id);
  assert.deepEqual(changed.active.blocks.map(item => item.id), expectedOrder);
  assert.equal(changed.active.blocks[1].minutes, 17);
  assert.equal(changed.active.elapsedMs, 19 * 60000);
  assert.equal(changed.active.blockElapsedMs, 9 * 60000);
  assert.equal(changed.active.runningSince, null);
  assert.deepEqual(changed.active.results, fixture.active.results);
  assert.deepEqual(changed.routines, fixture.routines);
  assert.deepEqual(changed.plans, fixture.plans);
  assert.deepEqual(errors, []);
});

test('duration sliders and block editing preserve source plans and recover from failed saves', { timeout: 30000 }, async t => {
  const fixture = notebook({ sequence: true });
  const { evaluate, wait, read, waitStored, action, send, errors } = await openSession(t, fixture);
  assert.equal(await evaluate('document.querySelector("[data-session-block=finished-block] [data-action=session-block-edit]")'), null);
  await evaluate('const slider=document.querySelector("[data-session-duration=current-block]");slider.value=23;slider.dispatchEvent(new Event("input",{bubbles:true}));');
  assert.equal(await evaluate('document.querySelector("[data-session-minutes=current-block]").value'), '23');
  assert.equal((await read()).active.blocks[1].minutes, 10, 'Previewing a slider does not write on every movement.');
  await evaluate('document.querySelector("[data-session-duration=current-block]").dispatchEvent(new Event("change",{bubbles:true}))');
  let changed = await waitStored(data => data.active.blocks[1].minutes === 23);
  assert.equal(changed.active.blockElapsedMs, 480000);
  await action('session-block-edit', 'current-block');
  await wait('document.querySelector("#session-block-form")');
  await evaluate('var form=document.querySelector("#session-block-form");form.elements.type.value="reading";form.elements.type.dispatchEvent(new Event("change"));form.elements.target.value="G-major";');
  await evaluate('document.querySelector("#cp-dialog [data-action=close-dialog]").click()');
  assert.equal((await read()).active.blocks[1].type, 'free');
  await action('session-block-edit', 'current-block');
  await evaluate('var form=document.querySelector("#session-block-form");form.elements.type.value="reading";form.elements.type.dispatchEvent(new Event("change"));form.elements.target.value="G-major";form.elements.hand.value="both";form.elements.bpm.value=84;form.elements.level.value=2;form.elements.minutes.value=18;');
  await evaluate('window.originalPut=IDBObjectStore.prototype.put;window.rejectEdit=true;IDBObjectStore.prototype.put=function(value,key,...rest){if(key==="current"&&value.active?.blocks[1]?.target==="G-major"&&window.rejectEdit){window.rejectEdit=false;throw Error("Simulated block save failure");}return originalPut.call(this,value,key,...rest);};document.querySelector("#session-block-form").requestSubmit();');
  await wait('document.querySelector("#cp-form-error").textContent.includes("Simulated block save failure")');
  assert.equal((await read()).active.blocks[1].type, 'free');
  assert.equal(await evaluate('document.querySelector("#session-block-form").elements.target.value'), 'G-major');
  await evaluate('IDBObjectStore.prototype.put=originalPut;document.querySelector("#session-block-form").requestSubmit()');
  await wait('!document.querySelector("#cp-dialog").open');
  changed = await waitStored(data => data.active.blocks[1].target === 'G-major');
  assert.equal(changed.active.blocks[1].id, 'current-block');
  assert.equal(changed.active.blocks[1].hand, 'both');
  assert.equal(changed.active.blocks[1].bpm, 84);
  assert.equal(changed.active.blocks[1].level, 2);
  assert.equal(changed.active.blockElapsedMs, 0);
  assert.equal(changed.active.elapsedMs, fixture.active.elapsedMs);
  assert.equal(changed.active.results.at(-1).elapsedMs, 480000);
  assert.equal(changed.active.results.at(-1).block.type, 'free');
  assert.deepEqual(changed.routines, fixture.routines); assert.deepEqual(changed.plans, fixture.plans);
  await send('Page.reload'); await wait('document.querySelector("[data-action=resume-session]")'); await action('resume-session');
  assert.equal((await read()).active.blocks[1].minutes, 18);
  assert.deepEqual(errors, []);
});

test('session orientation advice follows live rotation and excludes free practice without a score', { timeout: 30000 }, async t => {
  const fixture = notebook();
  for (const owner of [fixture.active, ...fixture.routines, ...fixture.plans]) {
    owner.context = 'midi';
    owner.blocks[0].type = 'reading';
  }
  const { send, evaluate, wait, read, action, errors } = await openSession(t, fixture);
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await wait(`document.querySelector('.cp-session-orientation')?.textContent.includes('apaisado')`);
  await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
  await wait(`!document.querySelector('.cp-session-orientation')`);
  assert.equal((await read()).active.elapsedMs, fixture.active.elapsedMs, 'Rotation does not start the paused session.');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await wait(`document.querySelector('.cp-session-orientation')?.textContent.includes('apaisado')`);

  await action('discard-session');
  await evaluate(`document.querySelector('#cp-confirm').click()`);
  await wait(`document.querySelector('.cp-today')`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: true });
  await action('practice');
  await action('prepare', 'free');
  await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);
  await wait(`document.querySelector('[data-action=open-free-practice]')`);
  assert.equal(await evaluate(`document.querySelector('.cp-session-orientation')`), null, 'A free practice has no score for which to recommend orientation.');
  assert.deepEqual(errors, []);
});

test('a failed current-block removal preserves played work and a retry archives it once', { timeout: 30000 }, async t => {
  const fixture = notebook({ sequence: true });
  const { evaluate, wait, read, waitStored, action, errors } = await openSession(t, fixture);
  await evaluate(`window.originalPut=IDBObjectStore.prototype.put;window.failNextWrite=true;IDBObjectStore.prototype.put=function(value,key,...rest){if(key==='current'&&value.active&&!value.active.blocks.some(block=>block.id==='current-block')&&window.failNextWrite){window.failNextWrite=false;throw Error('Simulated session edit failure');}return originalPut.call(this,value,key,...rest);};`);
  await action('session-block-remove', 'current-block');
  await wait(`!window.failNextWrite && document.querySelector('#cp-toast').textContent.includes('Simulated session edit failure')`);
  const failed = await read();
  assert.equal(failed.active.blocks[failed.active.blockIndex].id, 'current-block');
  assert.equal(failed.active.blockElapsedMs, 8 * 60000);
  assert.equal(failed.active.elapsedMs, fixture.active.elapsedMs);
  assert.deepEqual(failed.active.results, fixture.active.results);
  assert.deepEqual(failed.active.blocks, fixture.active.blocks);
  assert.ok(await evaluate(`!!document.querySelector('[data-session-block="current-block"][aria-current=step]')`));

  await evaluate(`IDBObjectStore.prototype.put=originalPut`);
  await action('session-block-remove', 'current-block');
  const changed = await waitStored(data => !data.active.blocks.some(item => item.id === 'current-block'));
  const removed = changed.active.results.filter(item => item.block.id === 'current-block');
  assert.equal(removed.length, 1);
  assert.equal(removed[0].elapsedMs, 8 * 60000);
  assert.equal(removed[0].removed, true);
  assert.equal(changed.active.elapsedMs, fixture.active.elapsedMs);
  assert.equal(changed.active.blockElapsedMs, 0);
  assert.equal(changed.active.blocks[changed.active.blockIndex].id, 'future-reading');
  assert.deepEqual(changed.active.results[0], fixture.active.results[0]);
  assert.deepEqual(changed.routines, fixture.routines);
  assert.deepEqual(changed.plans, fixture.plans);
  assert.deepEqual(errors, []);
});
