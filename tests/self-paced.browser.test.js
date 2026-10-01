import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';

async function captureScore(send, width, height) {
  if (!process.env.UI_SCREENSHOTS) return;
  await mkdir('artifacts', { recursive: true });
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`artifacts/self-paced-${width}x${height}.png`, Buffer.from(screenshot.data, 'base64'));
}

async function openSelfPacedBrowser(t) {
  const browser = await openBrowser(t, { companion: true });
  const { send, evaluate, url } = browser;
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const nativeFrame=requestAnimationFrame.bind(window);
    window.settleScore=()=>new Promise(resolve=>nativeFrame(()=>nativeFrame(resolve)));
    let time=1000,id=0;const frames=new Map();performance.now=()=>time;
    requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};cancelAnimationFrame=id=>frames.delete(id);
    window.frameAt=at=>{time=at;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time));};
    window.tapKey=async midi=>{
      const key=document.querySelector('#piano [data-midi="'+midi+'"]');
      if(!key)throw Error('Expected note is outside the keyboard: '+midi);
      key.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1}));
      key.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
      await new Promise(resolve=>setTimeout(resolve,180));
    };
    window.tapName=note=>{
      const press=button=>{
        button.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1}));
        button.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
      };
      if(note.acc==='#'||note.acc==='b')press(document.querySelector('#names [data-mod="'+(note.acc==='#'?1:-1)+'"]'));
      press(document.querySelector('#names [data-letter="'+note.letter.toLowerCase()+'"]'));
    };
    window.scoreGeometry=()=>[...document.querySelectorAll('#staff .vf-stave,#staff .vf-notehead')].map(el=>{
      const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height];
    });
    window.noteState=()=>({notes:__sr.line.notes,onsets:__sr.line.onsets,states:__sr.line.states,
      idx:__sr.line.idx,pageStart:__sr.line.pageStart,waitBars:__sr.line.waitBars});
  ` });
  await send('Page.navigate', { url });
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let attempts=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve();}else if(++attempts>500){clearInterval(timer);reject(Error('Timeout: '+${JSON.stringify(expression)}));}},20);})`);
  await wait(`document.querySelector('.cp-today')`);
  return { ...browser, wait };
}

async function prepareSelfPaced({ evaluate, wait }, type, input = 'piano') {
  await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=${type}]').click()`);
  assert.equal(await evaluate(`document.querySelector('[name=timing-0]').value`), 'timed', 'Existing practice keeps its tempo default');
  await evaluate(`{const field=document.querySelector('[name=timing-0]');field.value='wait';field.dispatchEvent(new Event('change',{bubbles:true}));}`);
  assert.equal(await evaluate(`!!document.querySelector('[name=bpm-0]')`), false, 'A self-paced block does not ask for a tempo');
  await evaluate(`document.querySelector('[name=input-0]').value='${input}';document.querySelector('#prepare-form').requestSubmit()`);
  await wait(`document.querySelector('[data-action=open-reader]')`);
  await evaluate(`document.querySelector('[data-action=open-reader]').click()`);
  await wait(`__sr.waiting && !document.querySelector('#reader-view').hidden`);
  await evaluate(`__sr.settings.soundMode='off';__sr.settings.metronome=false;settleScore()`);
}

test('mobile self-paced reading advances only after answers and replaces a complete fixed line', { timeout: 60000 }, async t => {
  const browser = await openSelfPacedBrowser(t);
  const { evaluate, send, wait, errors } = browser;
  await prepareSelfPaced(browser, 'reading');
  assert.deepEqual(await evaluate(`({timing:__sr.settings.timing,timed:__sr.timed,page:__sr.layout.page,rows:__sr.layout.rows.length,paused:__sr.waiting.paused})`),
    { timing: 'wait', timed: null, page: true, rows: 1, paused: false });
  await captureScore(send, 390, 844);

  await t.test('idle time never scrolls, advances or marks a missed note', async () => {
    const before = await evaluate(`({notes:noteState(),geometry:scoreGeometry(),wrong:Number(document.querySelector('#s-wrong').textContent)})`);
    await evaluate(`frameAt(performance.now()+120000)`);
    const after = await evaluate(`({notes:noteState(),geometry:scoreGeometry(),wrong:Number(document.querySelector('#s-wrong').textContent)})`);
    assert.deepEqual(after, before);
  });

  await t.test('the first answer counts immediately and errors leave the score in place', async () => {
    const geometry = await evaluate('scoreGeometry()');
    await evaluate(`tapKey(__sr.line.notes[__sr.line.idx].midi)`);
    assert.equal(await evaluate(`Number(document.querySelector('#s-correct').textContent)`), 1, 'No count-in consumes the first answer');
    assert.equal(await evaluate('__sr.line.idx'), 1);
    assert.deepEqual(await evaluate('scoreGeometry()'), geometry);
    const before = await evaluate('noteState()');
    await evaluate(`tapKey(Number([...document.querySelectorAll('#piano .key')].find(key=>Number(key.dataset.midi)!==__sr.line.notes[__sr.line.idx].midi).dataset.midi))`);
    assert.deepEqual(await evaluate('noteState()'), before);
    assert.deepEqual(await evaluate('scoreGeometry()'), geometry);
    assert.equal(await evaluate(`Number(document.querySelector('#s-wrong').textContent)`), 1);
  });

  await t.test('rotation keeps the current line and its progress', async () => {
    const before = await evaluate('noteState()');
    for (const [width, height] of [[844, 390], [390, 844]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
      await evaluate('settleScore()');
      assert.deepEqual(await evaluate('noteState()'), before, `${width}x${height}: rotating must not replace or shorten a partially answered line`);
      assert.equal(await evaluate('__sr.layout.rows.length'), 1);
      assert.equal(await evaluate('__sr.waiting.paused'), false);
      if (width > height) await captureScore(send, width, height);
    }
  });

  await t.test('all measures in the current line stay fixed until its final answer', async () => {
    const result = await evaluate(`(async()=>{
      const pageStart=__sr.line.pageStart,end=pageStart+__sr.line.waitBars*4,geometry=JSON.stringify(scoreGeometry());
      let answers=0;const prematureChanges=[];
      while(__sr.line.pageStart===pageStart&&answers<64){
        const next=__sr.line.onsets[__sr.line.idx+1];
        await tapKey(__sr.line.notes[__sr.line.idx].midi);answers++;
        if(next<end&&(pageStart!==__sr.line.pageStart||geometry!==JSON.stringify(scoreGeometry())))prematureChanges.push(answers);
      }
      return {answers,prematureChanges,pageStart:__sr.line.pageStart,end,currentOnset:__sr.line.onsets[__sr.line.idx],states:__sr.line.states.slice(0,__sr.line.idx)};
    })()`);
    assert.ok(result.answers > 1 && result.answers < 64, 'A complete line was answered');
    assert.deepEqual(result.prematureChanges, []);
    assert.equal(result.pageStart, result.end);
    assert.equal(result.currentOnset, result.end);
    assert.ok(result.states.every(state => state === 'correct'));
  });

  await t.test('pausing ignores input and resuming keeps the same notes and progress', async () => {
    await evaluate(`tapKey(__sr.line.notes[__sr.line.idx].midi);document.querySelector('#start').click()`);
    assert.equal(await evaluate('__sr.waiting.paused'), true);
    const before = await evaluate('noteState()');
    await evaluate(`frameAt(performance.now()+60000);tapKey(__sr.line.notes[__sr.line.idx].midi)`);
    assert.deepEqual(await evaluate('noteState()'), before);
    await evaluate(`document.querySelector('#start').click()`);
    assert.equal(await evaluate('__sr.waiting.paused'), false);
    assert.deepEqual(await evaluate('noteState()'), before);
  });

  await t.test('an interrupted session restores its current line and answer states', async () => {
    const before = await evaluate('noteState()');
    await evaluate(`document.querySelector('#practice-return').click()`);
    const measurement = await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onerror=reject;r.onsuccess=()=>{const db=r.result;let attempts=0;const poll=()=>{const q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{if(q.result?.active?.readerSnapshot?.line?.idx===${before.idx}){db.close();resolve(q.result.active.currentMeasurement);}else if(++attempts>500){db.close();reject(Error('Reader checkpoint was not saved'));}else setTimeout(poll,20);};q.onerror=reject;};poll();};})`);
    assert.equal(measurement.timing, 'wait');
    assert.equal(measurement.bpm, null, 'Self-paced results must not claim a measured tempo');
    await send('Page.reload');
    await wait(`document.querySelector('[data-action=resume-session]')`);
    await evaluate(`document.querySelector('[data-action=resume-session]').click();document.querySelector('[data-action=open-reader]').click()`);
    await wait(`__sr.waiting && !document.querySelector('#reader-view').hidden`);
    assert.deepEqual(await evaluate('noteState()'), before);
    assert.equal(await evaluate('__sr.timed'), null);
    await evaluate(`tapKey(__sr.line.notes[__sr.line.idx].midi)`);
    assert.equal(await evaluate('__sr.line.idx'), before.idx + 1);
  });
  assert.deepEqual(errors, [], 'No browser exceptions');
});

test('mobile technique also supports self-paced note-name answers', { timeout: 60000 }, async t => {
  const browser = await openSelfPacedBrowser(t);
  const { evaluate, errors } = browser;
  await prepareSelfPaced(browser, 'technique', 'names');
  assert.equal(await evaluate('__sr.settings.input'), 'names');
  assert.equal(await evaluate(`document.querySelector('#names').hidden`), false);
  const before = await evaluate('scoreGeometry()');
  await evaluate(`tapName(__sr.line.notes[__sr.line.idx])`);
  assert.equal(await evaluate('__sr.line.idx'), 1);
  assert.equal(await evaluate(`Number(document.querySelector('#s-correct').textContent)`), 1);
  assert.deepEqual(await evaluate('scoreGeometry()'), before);
  const notes = await evaluate('noteState()');
  await evaluate(`frameAt(performance.now()+120000)`);
  assert.deepEqual(await evaluate('noteState()'), notes);
  await evaluate(`tapName({letter:['c','d','e','f','g','a','b'].find(letter=>({c:0,d:2,e:4,f:5,g:7,a:9,b:11})[letter]!==__sr.line.notes[__sr.line.idx].midi%12),acc:''})`);
  assert.equal(await evaluate(`Number(document.querySelector('#s-wrong').textContent)`), 1);
  assert.deepEqual(await evaluate('noteState()'), notes, 'A wrong note name must not skip the expected note');
  assert.deepEqual(await evaluate('scoreGeometry()'), before);
  assert.equal(await evaluate('__sr.timed'), null);
  assert.deepEqual(errors, [], 'No browser exceptions');
});
