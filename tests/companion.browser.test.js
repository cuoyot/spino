import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser, disableWarmup } from './browser.js';

test('two-hand reading and technique work on physical piano and evaluate both MIDI notes on a phone', {timeout:90000},async t=>{
  const {send,evaluate,errors,url}=await openBrowser(t,{companion:true});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`let time=1000,id=0;const frames=new Map();performance.now=()=>time;window.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};window.cancelAnimationFrame=id=>frames.delete(id);window.frameAt=at=>{time=at;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(time));};`});
  await send('Page.navigate',{url});
  const wait=exp=>evaluate(`new Promise((resolve,reject)=>{let i=0;const timer=setInterval(()=>{if(${exp}){clearInterval(timer);resolve(true);}else if(++i>1000){clearInterval(timer);reject(Error('timeout'));}},20);})`);
  await wait(`document.querySelector('#app-shell h1')`);
  await disableWarmup(evaluate);
  for(const type of ['reading','technique']) for(const context of ['piano','midi']){
    await evaluate(`__sr.midi.simulateDevices(['Test piano']);document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action="prepare"][data-id="${type}"]').click();{const context=document.querySelector('[name="context"]');context.value='${context}';context.dispatchEvent(new Event('change',{bubbles:true}));}`);
    assert.ok(await evaluate(`!!document.querySelector('[name="hand-0"] option[value="both"]')`));
    await evaluate(`document.querySelector('[name="hand-0"]').value='both';document.querySelector('[name="presentation-0"]').value='${context==='piano'?'page':'scroll'}';document.querySelector('#prepare-form').requestSubmit()`);
    await wait(`document.querySelector('[data-action="open-reader"]')`);
    await evaluate(`document.querySelector('[data-action="open-reader"]').click()`);
    await wait(`__sr.timed`);await evaluate(`frameAt(__sr.timed.t0)`);
    assert.deepEqual(await evaluate(`__sr.line.notes.slice(0,2).map(n=>n.clef)`),['treble','bass']);
    if(context==='midi'){
      await evaluate(`__sr.midi.simulateNote(__sr.line.notes[1].midi)`);
      assert.equal(await evaluate(`__sr.line.idx`),0);
      await evaluate(`__sr.midi.simulateNote(__sr.line.notes[0].midi)`);
      assert.deepEqual(await evaluate(`__sr.line.states.slice(0,2)`),['correct','correct']);
      assert.equal(await evaluate(`__sr.line.idx`),2);
    }else{
      const grid=await evaluate(`(() => {const l=__sr.layout;return {step:l.xAtBeat(1)-l.xAtBeat(0),crossing:l.xAtBeat(4.01)-l.xAtBeat(3.99),alignment:__sr.line.onsets.slice(0,l.to).map((b,i)=>Math.abs(l.xAtBeat(b)-l.xOfNote(i)))};})()`);
      assert.ok(Math.abs(grid.crossing-grid.step*.02)<.001,'No jump at the bar boundary');
      assert.ok(grid.alignment.every(delta=>delta<.01),'Cursor remains aligned with both note heads');
      await evaluate(`frameAt(__sr.timed.t0+5000)`);
      assert.equal(await evaluate(`Number(document.querySelector('#s-wrong').textContent)`),0);
    }
    await evaluate(`document.querySelector('#practice-return').click();document.querySelector('[data-action="discard-session"]').click();document.querySelector('#cp-confirm').click()`);
    await wait(`document.querySelector('.cp-today')`);
  }
  assert.deepEqual(errors,[]);
});

test('piano companion: local planning, practice, history, recovery and responsive navigation', {timeout:120000}, async t=>{
  const {send,evaluate,errors,url}=await openBrowser(t,{companion:true});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url});
  const wait=expression=>evaluate(`new Promise((resolve,reject)=>{let attempts=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve(true);}else if(++attempts>200){clearInterval(timer);reject(new Error('Timeout: '+${JSON.stringify(expression)}));}},25);})`);
  await wait(`document.querySelector('#app-shell h1')`);
  await disableWarmup(evaluate);
  const action=async (name,id=null)=>{await evaluate(`document.querySelector('[data-action="${name}"]${id?`[data-id="${id}"]`:''}').click()`);};
  const stored=()=>evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result;const q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{resolve(q.result);db.close();};q.onerror=reject;};r.onerror=reject;})`);
  await t.test('creates a modal reading session and records only time practised',async()=>{
    await action('practice');await action('prepare','reading');
    await evaluate(`document.querySelector('[name="target-0"]').value='D-dorian';document.querySelector('#prepare-form').requestSubmit()`);
    await wait(`document.querySelector('[data-action="open-reader"]')`);await action('open-reader');
    await wait(`window.__sr?.timed`);
    const initial=await evaluate(`({key:__sr.line.key,notes:__sr.line.notes.map(n=>n.midi%12),input:__sr.settings.input,visible:!document.querySelector('#reader-view').hidden})`);
    assert.equal(initial.key,'C');assert.equal(initial.input,'piano');assert.ok(initial.visible);assert.ok(initial.notes.every(n=>[0,2,4,5,7,9,11].includes(n)));
    await evaluate(`document.querySelector('#practice-return').click();document.querySelector('[data-action="session-end"]').click()`);
    await evaluate(`document.querySelector('#cp-dialog [name="notes"]').value='Practiqué Re dórico';document.querySelector('#cp-dialog [name="mood"][value="4"]').checked=true;document.querySelector('#cp-dialog [name="title"]').value='Mi primera lección';document.querySelector('#cp-dialog form').requestSubmit(document.querySelector('#cp-dialog button[value="save"]'))`);
    await wait(`document.querySelector('.cp-today')`);
    const data=await stored();assert.equal(data.sessions.length,1);assert.equal(data.active,null);assert.equal(data.sessions[0].results[0].measurement.source,'screen');assert.equal(data.sessions[0].notes,'Practiqué Re dórico');
    assert.equal(data.sessions[0].mood,4);assert.equal(data.sessions[0].title,'Mi primera lección');
  });
  await t.test('plans a practice and completes the linked card without duplicating a session',async()=>{
    await action('calendar');
    await action('add-on-day', await evaluate(`document.querySelector('.selected-day').dataset.agendaDate`));
    await action('plan-practice');
    await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);
    await wait(`document.querySelector('#cp-dialog[open]')`);
    await evaluate(`document.querySelector('#cp-dialog [name="title"]').value='Sesión planificada';document.querySelector('#cp-dialog form').requestSubmit()`);
    await wait(`document.querySelector('[data-action="start-plan"]')`);
    const before=await stored();assert.equal(before.plans.length,1);
    await action('start-plan');await wait(`document.querySelector('[data-action="session-end"]')`);await action('session-end');
    await evaluate(`document.querySelector('#cp-dialog form').requestSubmit(document.querySelector('#cp-dialog button[value="save"]'))`);
    await wait(`document.querySelector('.cp-today')`);
    const after=await stored();assert.equal(after.sessions.length,2);assert.equal(after.plans[0].sessionId,after.sessions[0].id);assert.equal(after.plans[0].status,'completed');
  });
  await t.test('persists repertoire and events, escaping user-provided titles',async()=>{
    await action('piano');await action('repertoire');await action('new-work');
    await evaluate(`document.querySelector('#cp-dialog [name="title"]').value='<img src=x onerror=alert(1)>';document.querySelector('#cp-dialog form').requestSubmit()`);
    await wait(`document.querySelector('[data-action="practice-work"]')`);
    assert.equal(await evaluate(`document.querySelector('#app-shell img[onerror]')!==null`),false);
    assert.equal(await evaluate(`document.querySelector('#app-shell h1').textContent`),'<img src=x onerror=alert(1)>');
    await action('calendar');await action('add-on-day');await action('new-event');
    await evaluate(`document.querySelector('#cp-dialog [name="title"]').value='Audición';document.querySelector('#cp-dialog [name="workIds"]').checked=true;document.querySelector('#cp-dialog form').requestSubmit()`);
    await wait(`document.querySelector('[data-milestone]')`);
    const data=await stored();assert.equal(data.events.length,1);assert.equal(data.events[0].workIds[0],data.works[0].id);
  });
  await t.test('recovers an interrupted session paused and preserves earlier history',async()=>{
    await action('practice');await action('prepare','free');
    await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);await wait(`document.querySelector('[data-action="open-free-practice"]')`);
    await action('open-free-practice');await action('toggle-session');await action('free-return');await action('leave-session');
    const before=await stored();assert.ok(before.active);const id=before.active.id;
    await send('Page.reload');await wait(`document.querySelector('[data-action="resume-session"]')`);
    const after=await stored();assert.equal(after.active.id,id);assert.equal(after.active.runningSince,null);assert.equal(after.sessions.length,2);
  });
  await t.test('phone/tablet portrait/landscape keep navigation and controls within the viewport',async()=>{
    for(const [width,height] of [[320,568],[390,844],[844,390],[768,1024],[1180,820]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
      await action('home');
      const layout=await evaluate(`new Promise(r=>setTimeout(()=>r({overflow:document.querySelector('.cp-page').scrollWidth>document.querySelector('.cp-page').clientWidth+1,buttons:[...document.querySelectorAll('.cp-nav button')].map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height};})}),80))`);
      assert.equal(layout.overflow,false,`${width}x${height}`);
      for(const b of layout.buttons){assert.ok(b.x>=0&&b.y>=0&&b.right<=width+1&&b.bottom<=height+1);assert.ok(b.height>=44);}
      if(process.env.UI_SCREENSHOTS){await mkdir('artifacts/companion',{recursive:true});const screenshot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`artifacts/companion/home-${width}x${height}.png`,Buffer.from(screenshot.data,'base64'));}
    }
  });
  await t.test('downloads stay separate from repertoire and backup round-trips attachments and history',async()=>{
    await evaluate(`window.nativeFetch=window.fetch;window.fetch=(url,...rest)=>String(url).includes('mutopiaproject')?Promise.resolve(new Response('%PDF-1.4\\n%%EOF',{headers:{'Content-Type':'application/pdf'}})):nativeFetch(url,...rest);`);
    await action('piano');await action('catalog');await wait(`document.querySelector('[data-action=downloads]')`);await action('downloads');
    await evaluate(`document.querySelector('#wifi-only').checked=false;document.querySelector('#wifi-only').dispatchEvent(new Event('change',{bubbles:true}))`);
    await action('catalog');await action('library-pdfs');await action('download-piece','mutopia-75');
    await wait(`document.querySelector('[data-action="open-pdf"][data-id="mutopia-75"]')`);
    let data=await stored();assert.equal(data.downloads.length,1);assert.equal(data.works.length,1);
    await action('add-catalog-work','mutopia-75');await wait(`document.querySelector('[data-action="work-detail"]')`);
    data=await stored();assert.equal(data.works.length,2);assert.equal(data.works[1].assetId,data.downloads[0].assetId);
    await action('settings');await action('profile-backup');
    await evaluate(`window.nativeObjectURL=URL.createObjectURL;URL.createObjectURL=blob=>{window.exportedBlob=blob;return nativeObjectURL(blob);};window.nativeAnchorClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(!this.download)nativeAnchorClick.call(this);};`);
    await action('export-backup');await evaluate(`document.querySelector('#cp-dialog form').requestSubmit()`);await wait(`window.exportedBlob`);
    const backup=await evaluate(`exportedBlob.text().then(text=>{window.backupText=text;return JSON.parse(text);})`);
    assert.equal(backup.assets.length,1);assert.equal(backup.data.sessions.length,2);assert.ok(backup.data.sessions[0].results);
    await action('settings');await action('profile-edit');
    await evaluate(`document.querySelector('#profile-identity-form [name="name"]').value='Antes de restaurar';document.querySelector('#profile-identity-form').requestSubmit()`);
    await wait(`!document.querySelector('#cp-dialog').open`);await action('profile-backup');
    await evaluate(`window.nativeInputClick=HTMLInputElement.prototype.click;HTMLInputElement.prototype.click=function(){if(this.type==='file'){const transfer=new DataTransfer();transfer.items.add(new File([window.backupText],'backup.json',{type:'application/json'}));this.files=transfer.files;this.dispatchEvent(new Event('change'));}else nativeInputClick.call(this);};`);
    await action('import-backup');await wait(`document.querySelector('#cp-confirm')`);
    await evaluate(`setTimeout(()=>document.querySelector('#cp-confirm').click(),10);true`);
    let restored=false;
    for(let i=0;i<100&&!restored;i++){
      await new Promise(r=>setTimeout(r,40));
      try{restored=await evaluate(`document.querySelector('#app-shell h1')?.textContent==='Hoy'`);}catch(e){if(!/navigated|context|closed/i.test(e.message))throw e;}
    }
    assert.ok(restored,'restoration returns to Today');
    data=await stored();assert.equal(data.preferences.name,'');assert.equal(data.downloads.length,1);assert.equal(data.sessions.length,2);assert.equal(data.active.runningSince,null);
  });
  assert.deepEqual(errors,[]);
});

test('connected practice: manual mode never creates errors and MIDI disconnect freezes evaluation', {timeout:60000},async t=>{
  const {send,evaluate,errors,url}=await openBrowser(t,{companion:true});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`let time=1000,id=0;const frames=new Map();performance.now=()=>time;window.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};window.cancelAnimationFrame=id=>frames.delete(id);window.frameAt=at=>{time=at;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(time));};`});
  await send('Page.navigate',{url});
  const wait=exp=>evaluate(`new Promise((resolve,reject)=>{let i=0;const id=setInterval(()=>{if(${exp}){clearInterval(id);resolve(true);}else if(++i>200){clearInterval(id);reject(Error('timeout'));}},20);})`);
  await wait(`document.querySelector('#app-shell h1')`);
  await disableWarmup(evaluate);
  await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action="prepare"][data-id="reading"]').click();document.querySelector('[name="context"]').value='piano';document.querySelector('#prepare-form').requestSubmit()`);
  await wait(`document.querySelector('[data-action="open-reader"]')`);
  await evaluate(`document.querySelector('[data-action="open-reader"]').click();frameAt(__sr.timed.t0+5000)`);
  assert.equal(await evaluate(`Number(document.querySelector('#s-wrong').textContent)`),0);
  await evaluate(`document.querySelector('#practice-return').click();document.querySelector('[data-action="discard-session"]').click();document.querySelector('#cp-confirm').click()`);
  await wait(`document.querySelector('.cp-today')`);
  await evaluate(`__sr.midi.simulateDevices(['Test piano']);document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action="prepare"][data-id="reading"]').click();document.querySelector('[name="context"]').value='midi';document.querySelector('#prepare-form').requestSubmit()`);
  await wait(`document.querySelector('[data-action="open-reader"]')`);
  await evaluate(`document.querySelector('[data-action="open-reader"]').click()`);await wait(`__sr.timed`);
  await evaluate(`frameAt(__sr.timed.t0);__sr.midi.simulateNote(__sr.line.notes[0].midi);window.statesBefore=JSON.stringify(__sr.line.states);__sr.midi.simulateDevices([]);frameAt(performance.now()+60000);`);
  assert.ok(await evaluate(`__sr.timed.suspendedAt!=null&&JSON.stringify(__sr.line.states)===statesBefore&&!document.querySelector('#app-shell').hidden`));
  assert.ok(await evaluate(`!!document.querySelector('[data-action="continue-piano"]')`));
  const retained = await evaluate(`({notes:JSON.stringify(__sr.line.notes),correct:document.querySelector('#s-correct').textContent,wrong:document.querySelector('#s-wrong').textContent})`);
  await evaluate(`__sr.midi.simulateDevices(['Test piano'])`);
  await wait(`document.querySelector('[data-action="open-reader"]')`);
  assert.ok(await evaluate(`__sr.timed.suspendedAt!=null`), 'Reconnection does not start practice automatically.');
  await evaluate(`document.querySelector('[data-action="open-reader"]').click()`);
  await wait(`__sr.timed.suspendedAt==null`);
  assert.equal(await evaluate(`JSON.stringify(__sr.line.notes)`), retained.notes, 'Reconnect keeps generated material.');
  assert.equal(await evaluate(`document.querySelector('#s-correct').textContent`), retained.correct);
  await evaluate(`__sr.midi.simulateDevices([])`);
  await wait(`document.querySelector('[data-action="continue-piano"]')`);
  await evaluate(`document.querySelector('[data-action="continue-piano"]').click()`);
  await wait(`document.querySelector('[data-action="open-reader"]')`);
  await evaluate(`document.querySelector('[data-action="open-reader"]').click()`);
  await wait(`__sr.timed.suspendedAt==null`);
  assert.equal(await evaluate(`document.body.dataset.context`), 'piano');
  await evaluate(`frameAt(performance.now()+60000)`);
  assert.equal(await evaluate(`document.querySelector('#s-wrong').textContent`), retained.wrong, 'Manual fallback does not introduce missed-note errors.');
  assert.deepEqual(errors,[]);
});
