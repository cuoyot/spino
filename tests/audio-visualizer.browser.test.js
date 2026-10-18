import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {syntheticAudioSource} from './fixtures/audio-visualizer.js';

const waitFor=condition=>`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('Missing '+${JSON.stringify(condition)}))}},20)})`;
test('live microphone art switches with one-finger swipes in all directions and retains the recording in both themes',{timeout:120000},async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:syntheticAudioSource+`window.reviewMonitorContexts=[];window.AudioContext=new Proxy(AudioContext,{construct(target,args){const c=new target(...args);reviewMonitorContexts.push(c);return c;}});`});await send('Page.navigate',{url});
  const wait=condition=>evaluate(waitFor(condition));
  const click=selector=>send('Runtime.evaluate',{expression:`document.querySelector(${JSON.stringify(selector)}).click()`,userGesture:true,awaitPromise:true});
  await wait(`document.querySelector('[data-action=record-media]')`);
  const notebook=()=>evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets']),s=tx.objectStore('state').get('current'),a=tx.objectStore('assets').getAll();tx.oncomplete=()=>{resolve(JSON.stringify([s.result,a.result]));db.close()}}})`);
  const before=await notebook();
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
  await click('[data-action=record-media]');await click('[data-media=audio]');await wait(`document.querySelector('[data-audio-canvas]')&&reviewAudioRecorders.length===1`);
  const style=()=>evaluate(`document.querySelector('[data-audio-style]').dataset.audioStyle`);
  assert.equal(await style(),'silk');assert.equal(await evaluate(`reviewAudioRecorders[0].state`),'recording');
  await wait(`document.querySelector('[data-audio-level]').value<5`);await evaluate(`reviewAudioGain.gain.value=.35`);await wait(`document.querySelector('[data-audio-signal]').textContent==='Sound detected'&&document.querySelector('[data-audio-level]').value>20`);
  const center=()=>evaluate(`(()=>{const r=document.querySelector('.cp-audio-art').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const swipe=async(x,y)=>{const start=await center();await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+x,y:start.y+y,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  for(const [x,y,expected] of [[95,0,'orbit'],[0,95,'mixer'],[-95,0,'orbit'],[0,-95,'silk']]){await swipe(x,y);assert.equal(await style(),expected);assert.equal(await evaluate(`reviewAudioRecorders.length===1&&reviewAudioRecorders[0].state==='recording'&&reviewAudioTracks.every(t=>t.readyState==='live')`),true);}
  await swipe(8,4);assert.equal(await style(),'silk','A tap is not a swipe');
  const p=await center();await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x-20,y:p.y,id:1},{x:p.x+20,y:p.y,id:2}]});await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x-80,y:p.y,id:1},{x:p.x+80,y:p.y,id:2}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await style(),'silk','Two fingers must not switch the animation');
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(await style(),'silk');
  await evaluate(`document.querySelector('[data-audio-next]').focus()`);await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});assert.equal(await style(),'orbit','Keyboard alternative uses the same style cycle');
  const folder=process.env.SPINO_AUDIO_VISUAL_CAPTURE,frames=[];if(folder)await mkdir(folder,{recursive:true});
  for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]])for(const current of ['silk','orbit','mixer']){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    for(let n=0;n<3&&await style()!==current;n++)await click('[data-audio-next]');
    await new Promise(resolve=>setTimeout(resolve,90));
    const geometry=await evaluate(`(()=>{const p=document.querySelector('#cp-media-capture'),c=document.querySelector('.cp-audio-art'),b=document.querySelector('[data-media=stop]'),s=document.querySelector('[data-audio-next]'),r=c.getBoundingClientRect();return{overflow:p.scrollWidth>p.clientWidth+1||p.scrollHeight>p.clientHeight+1,canvasWidth:r.width,canvasHeight:r.height,bottom:b.getBoundingClientRect().bottom,buttonHeight:s.getBoundingClientRect().height,color:getComputedStyle(document.querySelector('[data-audio-style]')).getPropertyValue('--audio-blue').trim(),surface:getComputedStyle(c).backgroundColor,style:document.querySelector('[data-audio-style]').dataset.audioStyle}})()`);
    assert.equal(geometry.overflow,false,JSON.stringify({theme,width,height,current,geometry}));assert.ok(geometry.canvasHeight>=100);assert.ok(geometry.bottom<=height);assert.ok(geometry.buttonHeight>=44);assert.equal(geometry.style,current);
    if(folder){const file=`${theme}-${current}-${width}x${height}.png`,shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({file,theme,current,width,height,geometry});}
  }
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await click('[data-audio-next]');assert.equal(await evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches&&reviewAudioRecorders.length===1&&reviewAudioRecorders[0].state==='recording'`),true);
  await evaluate(`reviewAudioGain.gain.value=0`);await wait(`document.querySelector('[data-audio-signal]').textContent==='Listening…'&&document.querySelector('[data-audio-level]').value<5`);
  await click('[data-media=stop]');await wait(`document.querySelector('[data-media=save]')&&!document.querySelector('[data-media=save]').disabled`);
  assert.equal(await evaluate(`reviewAudioTracks.every(t=>t.readyState==='ended')&&reviewMonitorContexts.every(c=>c.state==='closed')`),true);assert.equal(await evaluate(`document.querySelectorAll('[data-audio-canvas]').length`),0);
  await click('[data-media=save]');await wait(`document.querySelector('[data-media=share]')&&!document.querySelector('[data-media=share]').disabled`);await click('[data-media=close]');
  assert.equal(await notebook(),before);
  await click('[data-action=record-media]');await click('[data-media=audio]');await wait(`document.querySelector('[data-audio-canvas]')&&reviewAudioRecorders.length===2`);assert.equal(await style(),'silk','Each new take starts with Silk waves');await new Promise(resolve=>setTimeout(resolve,350));
  await click('[data-media=stop]');await wait(`document.querySelector('[data-media=delete]')&&!document.querySelector('[data-media=delete]').disabled`);await click('[data-media=delete]');await wait(`!document.querySelector('.cp-media-studio[open]')`);await evaluate(`Promise.all(reviewAudioContexts.map(c=>c.close()))`);
  assert.equal(await notebook(),before);assert.deepEqual(errors,[]);
  if(folder)await writeFile(folder+'/verification.json',JSON.stringify({date:new Date().toISOString(),kind:'responsive-browser-synthetic-audio',nativeAcceptance:false,frames,oneFingerFourDirections:true,twoFingerAndCancelIgnored:true,keyboardAlternative:true,defaultResetsToSilk:true,recorderRetainedDuringSwipes:true,silenceAndSignalVerified:true,notebookAndAssetsUnchanged:true,tracksReleased:true,reducedMotionSmoke:true,sources:Object.fromEntries(await Promise.all(['src/companion/audio-visualizer.js','src/companion/media-view.js','src/companion/media.css','src/companion/locale-ca.js','tests/audio-visualizer.browser.test.js','tests/fixtures/audio-visualizer.js'].map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')]))),buildIndexSha256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex'),errors},null,2));
});

test('unavailable audio analysis leaves original recording and save available',async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});await send('Page.addScriptToEvaluateOnNewDocument',{source:syntheticAudioSource+`window.AudioContext=class{constructor(){throw Error('Synthetic monitor failure')}};`});await send('Page.navigate',{url});await evaluate(waitFor(`document.querySelector('[data-action=record-media]')`));
  await send('Runtime.evaluate',{expression:`document.querySelector('[data-action=record-media]').click();document.querySelector('[data-media=audio]').click()`,userGesture:true});await evaluate(waitFor(`document.querySelector('[data-audio-signal]')?.textContent==='Audio level unavailable'`));assert.equal(await evaluate(`reviewAudioRecorders[0].state`),'recording');
  await new Promise(resolve=>setTimeout(resolve,350));await evaluate(`document.querySelector('[data-media=stop]').click()`);await evaluate(waitFor(`document.querySelector('[data-media=save]')&&!document.querySelector('[data-media=save]').disabled`));assert.equal(await evaluate(`reviewAudioTracks.every(t=>t.readyState==='ended')`),true);await evaluate(`document.querySelector('[data-media=delete]').click();Promise.all(reviewAudioContexts.map(c=>c.close()))`);assert.deepEqual(errors,[]);
});
