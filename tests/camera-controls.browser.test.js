import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {syntheticCameraSource} from './fixtures/camera-controls.js';

test('camera controls preserve the full frame, encode brightness/zoom, lock exposure and recover from rejected settings',{timeout:120000},async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});
  const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const i=setInterval(()=>{if(${condition}){clearInterval(i);resolve()}else if(++n>500){clearInterval(i);reject(Error('Missing '+${JSON.stringify(condition)}))}},20)})`);
  const click=selector=>send('Runtime.evaluate',{expression:`document.querySelector(${JSON.stringify(selector)}).click()`,userGesture:true,awaitPromise:true});
  const slider=async(selector,value)=>{await evaluate(`(()=>{const e=document.querySelector('${selector}');e.value=${value};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await wait(`!document.querySelector('[data-camera-zoom]').disabled`);};
  await send('Page.addScriptToEvaluateOnNewDocument',{source:syntheticCameraSource});await send('Page.navigate',{url});await wait(`document.querySelector('[data-action=record-media]')`);
  const baseline=await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,r=db.transaction('state').objectStore('state').get('current');r.onsuccess=()=>{resolve(JSON.stringify(r.result));db.close()}}})`);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await click('[data-action=record-media]');await click('[data-media=video]');await wait(`document.querySelector('.cp-media-live')?.readyState>=2`);
  assert.equal(await evaluate(`document.querySelector('[data-media=camera-settings]').getAttribute('aria-expanded')`),'false');
  await click('[data-media=camera-settings]');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(await evaluate(`document.querySelector('[data-media=camera-settings]').getAttribute('aria-expanded')`),'false');assert.equal(await evaluate(`!!document.querySelector('.cp-media-studio[open] .cp-media-live')`),true);await click('[data-media=camera-settings]');
  assert.equal(await evaluate(`document.querySelector('[data-camera-zoom]').value`),'1');
  assert.equal(await evaluate(`cameraTracks[0].getSettings().zoom`),1);
  assert.equal(await evaluate(`cameraRequests[0].video.width.ideal`),1920);
  const pixels=()=>evaluate(`(()=>{const v=document.querySelector('.cp-media-live')||document.querySelector('#cp-media-capture video'),c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const x=c.getContext('2d');x.drawImage(v,0,0);return{width:c.width,height:c.height,edge:[...x.getImageData(10,Math.round(c.height/2),1,1).data],center:[...x.getImageData(c.width/2,c.height/2,1,1).data]}})()`);
  await wait(`document.querySelector('.cp-media-live').videoWidth===1080`);
  const initial=await pixels();assert.equal(initial.height,1920);assert.ok(initial.edge[0]>initial.edge[1]*2,'Full sensor edge is visible in portrait');
  await slider('[data-camera-brightness]',125);await new Promise(r=>setTimeout(r,150));const brighter=await pixels();assert.ok(brighter.center[0]>initial.center[0]*1.2);
  await click('[data-media=exposure-lock]');await wait(`document.querySelector('[data-media=exposure-lock]').getAttribute('aria-pressed')==='true'`);
  assert.equal(await evaluate(`cameraTracks[0].getSettings().exposureMode`),'manual');
  await slider('[data-camera-zoom]',2);assert.equal(await evaluate(`cameraTracks[0].getSettings().zoom`),2);
  await evaluate(`window.cameraReject=true`);await slider('[data-camera-zoom]',3);assert.equal(await evaluate(`document.querySelector('[data-camera-zoom]').value`),'2');assert.match(await evaluate(`document.querySelector('[data-camera-error]').textContent`),/Could not apply/);
  await evaluate(`window.cameraReject=false`);await slider('[data-camera-zoom]',1);assert.equal(await evaluate(`document.querySelector('[data-camera-error]').textContent`),'');
  const folder=process.env.SPINO_CAMERA_CAPTURE,frames=[];
  if(folder)await mkdir(folder,{recursive:true});
  const capture=async state=>{
    for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme='${theme}'`);
      const geometry=await evaluate(`(()=>{const p=document.querySelector('#cp-media-capture'),r=p.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:p.scrollWidth>p.clientWidth+1,previewHeight:p.querySelector('.cp-camera-preview').getBoundingClientRect().height,actionsBottom:p.querySelector('.cp-media-capture-actions').getBoundingClientRect().bottom,controls:[...p.querySelectorAll('.cp-camera-controls input')].filter(e=>e.getClientRects().length).map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))}})()`);
      assert.ok(geometry.left>=0&&geometry.right<=width+1&&geometry.top>=0&&geometry.bottom<=height+1);assert.equal(geometry.overflow,false);assert.ok(geometry.actionsBottom<=height,'Capture actions stay visible');assert.ok(geometry.previewHeight>=height*.5,'Preview uses most of the screen');assert.ok(geometry.controls.every(r=>r.height>=44&&r.width>80));
      if(folder){const file=theme+'-'+state+'-'+width+'x'+height+'.png',shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({file,state,theme,width,height,geometry});}
    }
  };
  await capture('hardware-settings');await click('[data-media=camera-settings]');await capture('hardware-preview');await click('[data-media=camera-settings]');
  await evaluate(`const select=document.querySelector('[data-media-camera]');select.value='rear';select.dispatchEvent(new Event('change',{bubbles:true}))`);await wait(`!document.querySelector('[data-media-camera]').disabled&&document.querySelector('.cp-camera-controls').textContent.includes('Digital zoom')`);
  assert.equal(await evaluate(`!!document.querySelector('[data-media=exposure-lock]')`),false);
  assert.equal(await evaluate(`document.querySelector('[data-camera-brightness]').value`),'100');
  await slider('[data-camera-zoom]',2);await slider('[data-camera-brightness]',125);await new Promise(r=>setTimeout(r,150));const cropped=await pixels();assert.ok(Math.abs(cropped.edge[0]-cropped.edge[1])<10,'Digital zoom removes the red sensor edge');
  await click('[data-media=camera-settings]');await capture('digital-preview');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await new Promise(r=>setTimeout(r,100));
  await click('[data-media=start-video]');await wait(`document.querySelector('[data-media=stop]')&&!document.querySelector('[data-media=stop]').disabled`);
  await capture('recording');await click('[data-media=camera-settings]');await slider('[data-camera-brightness]',120);
  await new Promise(r=>setTimeout(r,350));await click('[data-media=stop]');await wait(`document.querySelector('[data-media=save]')&&!document.querySelector('[data-media=save]').disabled&&document.querySelector('#cp-media-capture video')?.readyState>=2`);
  await wait(`(()=>{const v=document.querySelector('#cp-media-capture video'),c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.drawImage(v,-v.videoWidth/2,-v.videoHeight/2);return x.getImageData(0,0,1,1).data[3]===255})()`);
  const encoded=await pixels();assert.equal(encoded.width,1080);assert.equal(encoded.height,1920);assert.ok(Math.abs(encoded.edge[0]-encoded.edge[1])<15);assert.ok(encoded.center[0]>initial.center[0]*1.15,'Saved video includes chosen brightness: '+JSON.stringify({initial,encoded}));
  await click('[data-media=delete]');await wait(`!document.querySelector('.cp-media-studio[open]')`);
  assert.equal(await evaluate(`cameraTracks.every(t=>t.readyState==='ended')`),true);
  const after=await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,r=db.transaction('state').objectStore('state').get('current');r.onsuccess=()=>{resolve(JSON.stringify(r.result));db.close()}}})`);
  assert.equal(after,baseline);assert.deepEqual(errors,[]);
  if(folder)await writeFile(folder+'/verification.json',JSON.stringify({date:new Date().toISOString(),kind:'responsive-browser-synthetic-camera',nativeAcceptance:false,frames,initial,brighter,cropped,encoded,hardwareZoomReset:true,hardwareExposureLock:true,rejectedSettingRecovered:true,digitalZoomEncoded:true,brightnessEncoded:true,notebookUnchanged:true,tracksReleased:true,errors,sourceHashes:Object.fromEntries(await Promise.all(['src/companion/camera-controls.js','src/companion/media-view.js','src/companion/media.css','src/companion/locale-ca.js','tests/camera-controls.browser.test.js','tests/fixtures/camera-controls.js'].map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')]))),buildIndexSha256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex')},null,2));
});

test('portrait format and manual quarter turns are encoded with the correct corner orientation',{timeout:120000},async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});
  const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const i=setInterval(()=>{if(${condition}){clearInterval(i);resolve()}else if(++n>500){clearInterval(i);reject(Error('Missing '+${JSON.stringify(condition)}))}},20)})`);
  const click=selector=>send('Runtime.evaluate',{expression:`document.querySelector(${JSON.stringify(selector)}).click()`,userGesture:true,awaitPromise:true});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:syntheticCameraSource});await send('Page.navigate',{url});await wait(`document.querySelector('[data-action=record-media]')`);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const folder=process.env.SPINO_ROTATION_CAPTURE,takes=[];if(folder)await mkdir(folder,{recursive:true});
  for(const sample of [
    {name:'portrait-sensor',sensorPortrait:true,format:'9:16',turns:0,order:[0,1,2,3]},
    {name:'rotated-landscape-sensor',sensorPortrait:false,format:'9:16',turns:1,order:[3,0,1,2]},
    {name:'manual-landscape',sensorPortrait:false,format:'16:9',turns:3,order:[1,2,3,0]},
  ]){
    await evaluate(`window.cameraPortraitSensor=${sample.sensorPortrait}`);await click('[data-action=record-media]');await click('[data-media=video]');await wait(`document.querySelector('.cp-media-live')?.readyState>=2`);
    if(sample.format==='16:9')await click('[data-media=camera-format]');
    for(let n=0;n<sample.turns;n++)await click('[data-media=rotate-camera]');
    const read=()=>evaluate(`(()=>{const v=document.querySelector('#cp-media-capture video'),c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const x=c.getContext('2d');x.drawImage(v,0,0);const sw=${sample.sensorPortrait?1080:1920},sh=${sample.sensorPortrait?1920:1080},odd=${sample.turns%2===1},w=odd?sh:sw,h=odd?sw:sh,scale=Math.min(c.width/w,c.height/h),dw=w*scale,dh=h*scale,left=(c.width-dw)/2,top=(c.height-dh)/2;return{width:c.width,height:c.height,corners:[[.02,.02],[.98,.02],[.98,.98],[.02,.98]].map(([a,b])=>[...x.getImageData(Math.floor(left+dw*a),Math.floor(top+dh*b),1,1).data])}})()`);
    const expected=[[240,32,32],[32,224,32],[224,224,32],[32,32,224]];
    const check=frame=>{assert.deepEqual([frame.width,frame.height],sample.format==='9:16'?[1080,1920]:[1920,1080]);frame.corners.forEach((color,index)=>{assert.equal(color[3],255);for(let c=0;c<3;c++)assert.ok(Math.abs(color[c]-expected[sample.order[index]][c])<35,JSON.stringify({sample,frame,index}));});};
    await new Promise(r=>setTimeout(r,120));const preview=await read();check(preview);
    await click('[data-media=start-video]');await wait(`document.querySelector('[data-media=stop]')&&!document.querySelector('[data-media=stop]').disabled`);
    assert.equal(await evaluate(`!!document.querySelector('[data-media=camera-format]')`),false,'Active take keeps its encoded dimensions');
    // A full turn during capture retains the original recorder and final orientation.
    for(let n=0;n<4;n++)await click('[data-media=rotate-camera]');
    if(folder){const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+sample.name+'-recording.png',Buffer.from(shot.data,'base64'));}
    await new Promise(r=>setTimeout(r,300));await click('[data-media=stop]');await wait(`document.querySelector('[data-media=save]')&&!document.querySelector('[data-media=save]').disabled&&document.querySelector('#cp-media-capture video')?.readyState>=2`);
    await wait(`(()=>{const v=document.querySelector('#cp-media-capture video'),c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');x.drawImage(v,-v.videoWidth/2,-v.videoHeight/2);return x.getImageData(0,0,1,1).data[3]===255})()`);
    const encoded=await read();check(encoded);
    if(folder){const data=await evaluate(`(()=>{const v=document.querySelector('#cp-media-capture video'),c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);return c.toDataURL('image/png')})()`);await writeFile(folder+'/'+sample.name+'-decoded.png',Buffer.from(data.split(',')[1],'base64'));}
    takes.push({...sample,preview,encoded});await click('[data-media=delete]');await wait(`!document.querySelector('.cp-media-studio[open]')`);
  }
  assert.equal(await evaluate(`cameraTracks.every(t=>t.readyState==='ended')`),true);assert.deepEqual(errors,[]);
  if(folder)await writeFile(folder+'/verification.json',JSON.stringify({date:new Date().toISOString(),kind:'responsive-browser-synthetic-camera',nativeAcceptance:false,takes,rotationDuringRecording:true,errors,sourceHashes:Object.fromEntries(await Promise.all(['src/companion/media-view.js','src/companion/media.css','tests/camera-controls.browser.test.js','tests/fixtures/camera-controls.js'].map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')]))),buildIndexSha256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex')},null,2));
});
