import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,mkdir,writeFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';

const waitFor=(evaluate,condition)=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('Timeout: '+${JSON.stringify(condition)}))}},20)})`);

test('preparation puts warm-up first, borrows its minutes and shows static piano keys', {timeout:60000},async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});
  await send('Page.navigate',{url});await waitFor(evaluate,`document.querySelector('.cp-today')`);
  await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=repertoire]').click()`);
  const field=(name,value)=>evaluate(`{const input=document.querySelector('[name="${name}"]');${typeof value==='boolean'?`input.checked=${value}`:`input.value=${JSON.stringify(value)}`};input.dispatchEvent(new Event('change',{bubbles:true}))}`);
  assert.equal(await evaluate(`document.querySelector('[name=include-warmup]').checked`),false);
  assert.equal(await evaluate(`document.querySelector('[name=warmup-kind]').disabled||document.querySelector('[name=warmup-kind]').matches(':disabled')`),true);
  assert.equal(await evaluate(`document.querySelector('[name=bpm-0]')`),null);
  assert.equal(await evaluate(`document.querySelector('.cp-total-duration').nextElementSibling.matches('.cp-preparation-warmup')`),true);
  assert.equal(await evaluate(`document.querySelector('[name=passage-0]').closest('details')`),null);
  assert.equal(await evaluate(`document.querySelector('[name=passage-0]').getBoundingClientRect().height>0`),true);
  assert.equal(await evaluate(`document.querySelector('[name=type-0]').closest('.cp-details')`),null);
  await field('type-0','reading');
  await field('context','mobile');
  const contextTop=await evaluate(`document.querySelector('[name=context]').getBoundingClientRect().top`);
  for(const context of ['piano','midi','mobile','piano']) {
    await field('context',context);
    assert.equal(await evaluate(`document.querySelector('[name=context]').getBoundingClientRect().top`),contextTop);
    assert.equal(await evaluate(`document.querySelector('[name=context]').getBoundingClientRect().bottom < document.querySelector('.cp-total-duration').getBoundingClientRect().top`),true);
    assert.equal(await evaluate(`document.querySelector('#practice-duration').value`),'40');
  }
  await field('type-0','repertoire');
  const typeTop=await evaluate(`document.querySelector('[name=type-0]').getBoundingClientRect().top`);
  await field('type-0','technique');
  assert.equal(await evaluate(`document.querySelector('[name=type-0]').getBoundingClientRect().top`),typeTop);
  await field('type-0','repertoire');await field('include-warmup',true);
  assert.equal(await evaluate(`document.querySelector('#practice-duration').value`),'40');
  assert.equal(await evaluate(`document.querySelector('[name=minutes-0]').value`),'37');
  await field('warmup-kind','scales');await field('warmup-target','F#-harmonic');
  assert.equal(await evaluate(`document.querySelector('.cp-preparation-warmup svg').getAttribute('aria-label')`),'F♯ · G♯ · A · B · C♯ · D · E♯ · F♯');
  assert.equal(await evaluate(`document.querySelector('.cp-preparation-warmup video, .cp-preparation-warmup [data-hanon-animation]')`),null);
  await evaluate(`document.querySelector('[name=warmup-duration]').value=4;document.querySelector('[name=warmup-duration]').dispatchEvent(new Event('input',{bubbles:true}))`);
  assert.equal(await evaluate(`document.querySelector('#practice-duration').value`),'40');
  assert.equal(await evaluate(`document.querySelector('[name=minutes-0]').value`),'36');
  assert.equal(await evaluate(`document.querySelectorAll('.cp-scale-piano [data-marked=true]').length`),8);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.cp-scale-piano .scale-degree')].map(el=>el.textContent).sort()`),['I','I','II','III','IV','V','VI','VII']);
  assert.equal(await evaluate(`document.querySelector('.cp-preparation-warmup .wg-figure')`),null);
  await field('include-warmup',false);
  assert.equal(await evaluate(`document.querySelector('[name=minutes-0]').value`),'40');
  await field('include-warmup',true);
  assert.equal(await evaluate(`document.querySelector('[name=minutes-0]').value`),'36');
  const folder=process.env.PRACTICE_REVISION_EVIDENCE;
  if(folder) {
    await mkdir(folder,{recursive:true});
    for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]) {
      await evaluate(`document.documentElement.dataset.theme='${theme}'`);
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
      assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth<=document.querySelector('.cp-page').clientWidth+1`),true);
      for(const [name,selector] of [['block-header','[name=type-0]'],['scale-warmup','.cp-preparation-warmup']]) {
        await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);
        await writeFile(`${folder}/${theme}-${name}-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
      }
    }
  }
  await evaluate(`document.querySelector('#prepare-form').requestSubmit()`);await waitFor(evaluate,`document.querySelector('.cp-session')`);
  const active=await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{resolve(q.result.active);db.close()}}})`);
  assert.equal(active.blocks.length,2);assert.equal(active.blocks[0].type,'technique');assert.equal(active.blocks[0].target,'F#-harmonic');assert.equal(active.blocks[0].minutes,4);
  assert.equal(active.blocks[1].type,'repertoire');assert.equal(active.blocks[1].minutes,36);assert.equal(active.blocks.reduce((n,b)=>n+b.minutes,0),40);assert.deepEqual(errors,[]);
});

test('worklet audio grid continues through a blocked UI and clock digits keep their own animation', {timeout:30000},async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  await send('Page.navigate',{url});await waitFor(evaluate,`document.querySelector('.cp-today')`);
  const processor=(await readdir('dist/assets')).find(file=>file.startsWith('metronome-processor-'));
  await send('Runtime.evaluate',{expression:`window.audioTest=new AudioContext();audioTest.resume()`,userGesture:true,awaitPromise:true});
  const beats=await evaluate(`(async()=>{
    await audioTest.audioWorklet.addModule('/assets/${processor}');
    const node=new AudioWorkletNode(audioTest,'spino-metronome',{numberOfInputs:0,outputChannelCount:[1]}),events=[];
    node.port.onmessage=({data})=>events.push({...data,received:performance.now()});node.connect(audioTest.destination);
    node.port.postMessage({bpm:137,beats:4,origin:audioTest.currentTime+.05,volume:0});
    await new Promise(resolve=>setTimeout(resolve,700));
    const until=performance.now()+1800;while(performance.now()<until){}
    await new Promise(resolve=>setTimeout(resolve,250));node.port.postMessage(null);node.disconnect();await audioTest.close();return events;
  })()`);
  assert.ok(beats.length>=6);
  for(let i=1;i<beats.length;i++)assert.ok(Math.abs(beats[i].time-beats[i-1].time-60/137)<1/44100,'Blocked interface must not move the audio beat.');
  assert.ok(beats.some((b,i)=>i>0&&b.received-beats[i-1].received>1000),'The test actually blocked interface message delivery.');
  await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=free]').click();document.querySelector('#prepare-form').requestSubmit()`);
  await waitFor(evaluate,`document.querySelector('[data-action=open-free-practice]')`);
  await evaluate(`document.querySelector('[data-action=open-free-practice]').click()`);
  await waitFor(evaluate,`document.querySelector('.clock-track')`);
  const clocks=await evaluate(`(async()=>{
    const digit=document.querySelector('.managed-practice-widget .clock-track'),animation=digit.getAnimations()[0],before=animation.currentTime;
    const until=performance.now()+1400;while(performance.now()<until){}
    await new Promise(resolve=>setTimeout(resolve,50));return {elapsed:animation.currentTime-before,transform:getComputedStyle(digit).transform,tracks:document.querySelectorAll('.clock-track').length};
  })()`);
  assert.ok(clocks.elapsed>=1300);assert.ok(clocks.tracks>=3);
  if(process.env.PRACTICE_REVISION_EVIDENCE)await writeFile(process.env.PRACTICE_REVISION_EVIDENCE+'/running-clock.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  assert.deepEqual(errors,[]);
});

test('circular metronome marker is centered on all four cardinal directions',{timeout:30000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});await send('Page.navigate',{url});await waitFor(evaluate,`document.querySelector('.cp-today')`);
 await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=free]').click();document.querySelector('#prepare-form').requestSubmit()`);await waitFor(evaluate,`document.querySelector('[data-action=open-free-practice]')`);await evaluate(`document.querySelector('[data-action=open-free-practice]').click()`);
 const folder=process.env.PRACTICE_REVISION_EVIDENCE,geometry=[];
 if(folder)await mkdir(folder,{recursive:true});
 for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
  for(const angle of [0,90,180,270]) {
   const result=await evaluate(`(()=>{const d=document.querySelector('.cp-tempo-dial');d.style.setProperty('--beat-angle','${angle}deg');const s=getComputedStyle(d,'::before'),r=d.getBoundingClientRect(),b=parseFloat(getComputedStyle(d).borderTopWidth);return {x:r.x,y:r.y,width:r.width,height:r.height,inset:parseFloat(s.top),border:b,background:s.backgroundImage}})()`);
   assert.equal(result.inset,-result.border);assert.ok(result.background.includes(`${angle-6}deg`));geometry.push({width,height,angle,...result});
   if(folder)await writeFile(`${folder}/dial-${angle}-${width}x${height}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png',clip:{x:result.x-2,y:result.y-2,width:result.width+4,height:result.height+4,scale:1}})).data,'base64'));
  }
 }
 if(folder)await writeFile(`${folder}/dial-geometry.json`,JSON.stringify(geometry,null,2));assert.deepEqual(errors,[]);
});
