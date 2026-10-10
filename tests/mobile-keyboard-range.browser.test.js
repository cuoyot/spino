import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';

async function prepare(t, type, timing) {
  const browser = await openBrowser(t, { companion: true });
  const { send, evaluate, url } = browser;
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const nativeFrame=requestAnimationFrame.bind(window);
    window.settleScore=()=>new Promise(resolve=>nativeFrame(()=>nativeFrame(resolve)));
    let time=1000,id=0;const frames=new Map();performance.now=()=>time;
    requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};cancelAnimationFrame=id=>frames.delete(id);
    window.frameAt=at=>{time=at;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(time));};
    window.noteState=()=>({notes:__sr.line.notes,onsets:__sr.line.onsets,states:__sr.line.states,idx:__sr.line.idx,pageStart:__sr.line.pageStart});
    window.counts=()=>({correct:Number(document.querySelector('#s-correct').textContent),wrong:Number(document.querySelector('#s-wrong').textContent)});
    window.savedPractice=()=>new Promise((resolve,reject)=>{const request=indexedDB.open('cuaderno-piano',1);request.onerror=reject;request.onsuccess=()=>{const db=request.result,read=db.transaction('state').objectStore('state').get('current');read.onerror=reject;read.onsuccess=()=>{db.close();resolve(read.result.active);};};});
    window.playable=()=>{const keys=[...document.querySelectorAll('#piano [data-midi]')].map(k=>Number(k.dataset.midi));return __sr.line.notes.every(n=>keys.includes(n.midi));};
    window.tapKey=async midi=>{
      const key=document.querySelector('#piano [data-midi="'+midi+'"]');if(!key)throw Error('Unavailable key '+midi);
      key.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1}));
      key.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
      await new Promise(resolve=>setTimeout(resolve,180));
    };
    window.gesture=(pinch=false)=>{
      const piano=document.querySelector('#piano'),keys=[...piano.querySelectorAll('.key.white')].filter(k=>Number(k.dataset.midi)!==__sr.line.notes[__sr.line.idx].midi);
      const left=keys[0],right=keys[keys.length-1];
      const point=k=>{const r=k.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height*.75};};
      const a=point(left),b=point(right),line=__sr.line,oldRange=piano.dataset.range;
      const dispatch=(target,type,id,p)=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:'touch',clientX:p.x,clientY:p.y}));
      dispatch(left,'pointerdown',21,a);dispatch(right,'pointerdown',22,b);
      const endA={x:a.x-(pinch?70:90),y:a.y},endB={x:b.x+(pinch?70:-90),y:b.y};
      dispatch(piano,'pointermove',21,endA);dispatch(piano,'pointermove',22,endB);frameAt(performance.now());
      const changedDuring=oldRange!==piano.dataset.range,sameLineDuring=line===__sr.line;
      dispatch(piano,'pointerup',21,endA);dispatch(piano,'pointerup',22,endB);
      return {changedDuring,sameLineDuring,replaced:line!==__sr.line};
    };
  ` });
  await send('Page.navigate', { url });
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let attempts=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve();}else if(++attempts>500){clearInterval(timer);reject(Error('Timeout: '+${JSON.stringify(expression)}));}},20);})`);
  await wait(`document.querySelector('.cp-today')`);
  await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=${type}]').click()`);
  await evaluate(`{const field=document.querySelector('[name=timing-0]');field.value='${timing}';field.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[name=input-0]').value='piano';document.querySelector('#prepare-form').requestSubmit();}`);
  await wait(`document.querySelector('[data-action=open-reader]')`);
  await evaluate(`document.querySelector('[data-action=open-reader]').click()`);
  await wait(`!document.querySelector('#reader-view').hidden && (__sr.waiting || __sr.timed)`);
  await evaluate(`__sr.settings.soundMode='off';__sr.settings.metronome=false;settleScore()`);
  return { ...browser, wait };
}

for (const type of ['reading', 'technique']) for (const timing of ['wait', 'timed']) {
  test(`mobile ${type} (${timing}) adapts to the keyboard only after a committed range change`, { timeout: 60000 }, async t => {
    const browser = await prepare(t, type, timing);
    const { evaluate, send, wait, errors } = browser;
    if (timing === 'timed') await evaluate('frameAt(__sr.timed.t0)');
    await evaluate('tapKey(__sr.line.notes[__sr.line.idx].midi)');
    const counts = await evaluate('counts()');
    assert.equal(counts.correct, 1);
    const settings = await evaluate('({clef:__sr.settings.clef,bpm:__sr.settings.bpm,key:__sr.line.key})');
    const before = await evaluate('noteState()');

    await evaluate(`{const slider=document.querySelector('#kb-shift');slider.value=String(Math.min(Number(slider.max),Number(slider.value)+7));slider.dispatchEvent(new Event('input'));}`);
    assert.deepEqual(await evaluate('noteState()'), before, 'Dragging the range control keeps the score fixed');
    await evaluate(`document.querySelector('#kb-shift').dispatchEvent(new Event('change'))`);
    assert.equal(await evaluate('playable()'), true, 'The replacement line fits every visible key');
    assert.equal(await evaluate('__sr.line.idx'), 0);
    assert.deepEqual(await evaluate('counts()'), counts, 'Changing range preserves completed answers');
    assert.deepEqual(await evaluate('({clef:__sr.settings.clef,bpm:__sr.settings.bpm,key:__sr.line.key})'), settings, 'The selected staff, scale and tempo are retained');
    assert.equal(await evaluate(`__sr.timed===null && ${timing === 'wait' ? '__sr.waiting?.paused===true' : '!__sr.waiting'}`), true, 'A replacement line waits for an explicit restart');
    if (process.env.UI_SCREENSHOTS && type === 'reading' && timing === 'wait') {
      await evaluate('settleScore()');
      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      await mkdir('artifacts', { recursive: true });
      await writeFile('artifacts/mobile-keyboard-range-paused.png', Buffer.from(screenshot.data, 'base64'));
    }
    const replaced = await evaluate('noteState()');
    await evaluate('frameAt(performance.now()+60000)');
    assert.deepEqual(await evaluate('noteState()'), replaced, 'Paused replacement cannot accrue missed notes');
    assert.deepEqual(await evaluate('counts()'), counts);

    if (type === 'technique') {
      await evaluate(`{const slider=document.querySelector('#kb-shift');slider.value=slider.min;slider.dispatchEvent(new Event('input'));slider.dispatchEvent(new Event('change'));}`);
      assert.equal(await evaluate('playable()'), true, 'A range near A0 also replaces high prefetched notes');
      assert.deepEqual(await evaluate('counts()'), counts);
      assert.equal(await evaluate('__sr.settings.clef'), 'bass', 'Moving to low keys switches to bass clef');
      await evaluate(`{const slider=document.querySelector('#kb-shift');slider.value=slider.max;slider.dispatchEvent(new Event('input'));slider.dispatchEvent(new Event('change'));}`);
      assert.equal(await evaluate('__sr.settings.clef'), 'treble', 'Moving to high keys switches to treble clef');
      assert.equal(await evaluate('playable()'), true);
      assert.deepEqual(await evaluate('counts()'), counts);
      // Leave room for the subsequent rightward pan instead of starting at C8.
      await evaluate(`{const slider=document.querySelector('#kb-shift');slider.value=String(Math.floor((Number(slider.min)+Number(slider.max))/2));slider.dispatchEvent(new Event('input'));slider.dispatchEvent(new Event('change'));}`);
    }

    await evaluate(`document.querySelector('#start').click();window.sameRangeLine=__sr.line;window.sameRangeClock=__sr.timed;document.querySelector('#kb-shift').dispatchEvent(new Event('change'));`);
    assert.equal(await evaluate('__sr.line===sameRangeLine && __sr.timed===sameRangeClock'), true, 'Committing an unchanged range does not interrupt practice');
    if (timing === 'wait') assert.equal(await evaluate('__sr.waiting.paused'), false);

    for (const pinch of [false, true]) {
      const result = await evaluate(`gesture(${pinch})`);
      assert.deepEqual(result, { changedDuring: true, sameLineDuring: true, replaced: true }, `${pinch ? 'Pinching' : 'Panning'} commits once, after release`);
      await evaluate('new Promise(resolve=>setTimeout(resolve,180))');
      assert.equal(await evaluate('playable()'), true);
      assert.deepEqual(await evaluate('counts()'), counts, 'A two-finger gesture is not an answer');
      assert.equal(await evaluate('__sr.timed===null && (!__sr.waiting || __sr.waiting.paused)'), true);
      await evaluate(`document.querySelector('#start').click()`);
    }

    if (timing === 'timed') {
      const wheel = await evaluate(`(async()=>{const line=__sr.line;document.querySelector('#piano').dispatchEvent(new WheelEvent('wheel',{bubbles:true,deltaX:80}));const unchanged=line===__sr.line;await new Promise(resolve=>setTimeout(resolve,400));return {unchanged,replaced:line!==__sr.line,playable:playable(),paused:!__sr.timed};})()`);
      assert.deepEqual(wheel, { unchanged: true, replaced: true, playable: true, paused: true }, 'Horizontal scrolling commits after its debounce');
      await evaluate(`document.querySelector('#start').click();document.querySelector('#kb-auto').click()`);
      assert.equal(await evaluate('__sr.settings.kbLo'), null, 'Automatic centering restores the default range');
      assert.equal(await evaluate('playable() && !__sr.timed'), true);
      assert.deepEqual(await evaluate('counts()'), counts);
      const staleTouch = await evaluate(`(async()=>{
        const key=document.querySelector('#piano .key');
        key.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:31}));
        key.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:31}));
        const slider=document.querySelector('#kb-shift');slider.value=String(Number(slider.value)+1);slider.dispatchEvent(new Event('input'));slider.dispatchEvent(new Event('change'));
        await new Promise(resolve=>setTimeout(resolve,180));return {paused:!__sr.timed,counts:counts(),playable:playable()};
      })()`);
      assert.deepEqual(staleTouch, { paused: true, counts, playable: true }, 'A deferred touch on the old keys cannot start the replacement line');
    }

    if (timing === 'wait' && type === 'reading') {
      const line = await evaluate(`(async()=>{const start=__sr.line.pageStart||0;let answers=0;while((__sr.line.pageStart||0)===start&&answers<64){await tapKey(__sr.line.notes[__sr.line.idx].midi);answers++;}return {answers,page:__sr.line.pageStart,playable:playable()};})()`);
      assert.ok(line.answers > 0 && line.answers < 64);
      assert.ok(line.page > 0);
      assert.equal(line.playable, true, 'Subsequent generated lines use the selected window');

      const savedCounts = await evaluate('counts()');
      const savedRange = await evaluate('__sr.settings.kbLo');
      const savedNotes = await evaluate('noteState()');
      await evaluate(`document.querySelector('#practice-return').click()`);
      await wait(`document.querySelector('[data-action=open-reader]')`);
      await evaluate(`new Promise((resolve,reject)=>{let attempts=0;const poll=async()=>{const active=await savedPractice();if(active?.currentMeasurement?.correct===${savedCounts.correct})resolve();else if(++attempts>100)reject(Error('Answers were not checkpointed'));else setTimeout(poll,20);};poll();})`);
      await send('Page.reload');
      await wait(`document.querySelector('[data-action=resume-session]')`);
      await evaluate(`document.querySelector('[data-action=resume-session]').click();document.querySelector('[data-action=open-reader]').click()`);
      await wait(`__sr.waiting && !document.querySelector('#reader-view').hidden`);
      assert.equal(await evaluate('__sr.settings.kbLo'), savedRange);
      assert.deepEqual(await evaluate('noteState()'), savedNotes);
      assert.equal(await evaluate('playable()'), true);
      const recovered = await evaluate('savedPractice()');
      assert.equal(recovered.currentMeasurement.correct, savedCounts.correct, 'Recovery preserves the earlier answers in session totals');
      await evaluate(`(async()=>{await tapKey(__sr.line.notes[__sr.line.idx].midi);document.querySelector('#practice-return').click();})()`);
      await evaluate(`new Promise((resolve,reject)=>{let attempts=0;const poll=async()=>{const active=await savedPractice();if(active?.currentMeasurement?.correct===${savedCounts.correct + 1})resolve();else if(++attempts>100)reject(Error('Recovered totals did not include the new answer'));else setTimeout(poll,20);};poll();})`);
    }
    assert.deepEqual(errors, [], 'No browser exceptions');
  });
}
