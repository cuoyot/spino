import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser, disableWarmup } from './browser.js';
import { measureScoreGuides } from './score-geometry.js';

function aligned(result, label) {
  assert.ok(Math.abs(result.playhead.cy - result.staffCentre) < 1, `${label}: cursor centre ${result.playhead.cy}, staff centre ${result.staffCentre}`);
  assert.ok(Math.abs(result.light.cy - result.staffCentre) < 1, `${label}: light centre ${result.light.cy}, staff centre ${result.staffCentre}`);
  assert.ok(result.playhead.top < result.staffTop && result.playhead.bottom > result.staffBottom, `${label}: cursor spans every staff`);
  for (const head of result.heads) assert.ok(Math.abs(head.cx - result.playhead.cx) < 1.2, `${label}: ${head.duration} head ${head.cx}, cursor ${result.playhead.cx}`);
}

test('score cursor and light follow actual notation in page and scrolling layouts', { timeout: 60000 }, async t => {
  const { send, evaluate, errors, url } = await openBrowser(t, { companion: true });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const nativeFrame=requestAnimationFrame.bind(window);
    window.settleScore=()=>new Promise(resolve=>nativeFrame(()=>nativeFrame(resolve)));
    let now=1000,id=0;const frames=new Map();performance.now=()=>now;
    requestAnimationFrame=callback=>{frames.set(++id,callback);return id;};cancelAnimationFrame=id=>frames.delete(id);
    window.scoreBeat=beat=>{now=__sr.timed.t0+beat*60000/__sr.settings.bpm;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(now));};
    window.measureScoreGuides=${measureScoreGuides.toString()};
  ` });
  await send('Page.navigate', { url });
  await evaluate(`new Promise(resolve=>{const timer=setInterval(()=>{if(document.querySelector('#app-shell h1')){clearInterval(timer);resolve(true);}},20);})`);
  await disableWarmup(evaluate);
  await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=reading]').click();document.querySelector('[name=context]').value='piano';document.querySelector('[name=presentation-0]').value='page';document.querySelector('#prepare-form').requestSubmit();`);
  await evaluate(`new Promise(resolve=>{const timer=setInterval(()=>{if(document.querySelector('[data-action=open-reader]')){clearInterval(timer);resolve(true);}},20);})`);
  await evaluate(`document.querySelector('[data-action=open-reader]').click();__sr.settings.metronome=false;__sr.settings.soundMode='off';scoreBeat(0);`);
  for (const [width, height] of [[390,844], [844,390], [768,1024], [1180,820]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
    await evaluate('settleScore()');
    for (const mode of ['page', 'scroll']) for (const clef of ['treble', 'bass', 'grand']) {
      const result = await evaluate(`(()=>{
        Object.assign(__sr.settings,{layoutMode:'${mode}',pianoMode:${clef==='grand'},clef:'${clef==='grand'?'treble':clef}',zoom:1});
        document.querySelector('#new-key').click();document.querySelector('#start').click();scoreBeat(0);
        return measureScoreGuides(0);
      })()`);
      aligned(result, `${width}x${height} ${mode} ${clef}`);
      if (mode === 'page') {
        const system = await evaluate(`(()=>{const rows=__sr.layout.rows;if(rows.length<2)return null;const beat=rows[1].sysStart;scoreBeat(beat);return measureScoreGuides(beat);})()`);
        if (system) aligned(system, `${width}x${height} second system ${clef}`);
      }
    }
  }
  // Wider whole-note heads must share the same beat centre as quarter-note heads.
  for (const mode of ['page', 'scroll']) {
    const result = await evaluate(`(()=>{
      Object.assign(__sr.settings,{layoutMode:'${mode}',pianoMode:false,clef:'treble',rhythm:null,figures:{w:true,h:false,q:false,e:false,s:false}});
      document.querySelector('#new-key').click();document.querySelector('#start').click();scoreBeat(0);
      return measureScoreGuides(0);
    })()`);
    assert.equal(result.heads[0].duration,'w');
    aligned(result, `${mode} whole-note head`);
  }
  assert.deepEqual(errors, []);
});
