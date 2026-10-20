import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {emptyData,beginSession,block} from '../src/companion/model.js';

test('returning from generated practice keeps every main header control in its own row',{timeout:90000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
 const folder=process.env.SPINO_RETURN_HEADER_EVIDENCE,results=[];
 if(folder)await mkdir(folder,{recursive:false});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>600){clearInterval(timer);reject(Error('Header return timeout'))}},20)})`);
 const read=()=>evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{db.close();resolve(q.result)}}})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 for(const theme of ['light','dark']){
  const fixture=emptyData();fixture.preferences.theme=theme;fixture.preferences.language='es';
  fixture.active=beginSession({title:'Synthetic header return',context:'piano',blocks:[block('warmup',{target:'hanon-5',exercises:['hanon-5'],minutes:3,figures:'2',hand:'both',presentation:'page'})]});
  await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve()}}})`);
  await send('Page.reload');await wait(`document.querySelector('[data-action=resume-session]')`);
  await evaluate(`document.querySelector('[data-action=resume-session]').click();document.querySelector('[data-action=open-reader]').click()`);
  await wait(`__sr.layout`);await evaluate(`document.querySelector('[data-warmup-start]')?.click();__sr.settings.soundMode='off';__sr.settings.metronome=false`);await wait(`__sr.timed`);
  await evaluate(`document.querySelector('#practice-return').click()`);
  assert.equal(await evaluate(`document.body.classList.contains('managed-practice')`),true,'Exercise context remains available for resuming');
  for(const [name,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768],['narrow-phone',320,568],['reported-local',823,1253]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   for(const route of ['home','practice','calendar','piano','multimedia','progress','settings']){
    await evaluate(`document.querySelector('[data-action=${route}]').click()`);
    if(route==='piano')await evaluate(`document.querySelector('.cp-library-navigation [data-action=repertoire]').click()`);
    await wait(`document.querySelector('.cp-page').dataset.view===${JSON.stringify(route==='piano'?'repertoire':route)}`);
    const metrics=await evaluate(`(()=>{const header=document.querySelector('.cp-app-header'),rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};return{header:rect(header),grid:getComputedStyle(header).gridTemplateColumns,controls:[...header.querySelectorAll('button')].filter(e=>e.getClientRects().length).map(e=>({action:e.dataset.action,...rect(e)})),title:rect(header.querySelector('h1')),nav:rect(document.querySelector('.cp-nav')),overflow:document.documentElement.scrollWidth>innerWidth+1}})()`);
    const label=`${theme} ${name} ${route}`;
    assert.equal(metrics.overflow,false,label);
    for(const control of metrics.controls){
     assert.ok(control.y>=metrics.header.y&&control.bottom<=metrics.header.bottom+.5,label+' control below header: '+control.action);
     assert.ok(control.x>=metrics.header.x&&control.right<=metrics.header.right+.5,label+' control outside header: '+control.action);
    }
    assert.ok(metrics.title.y>=metrics.header.y&&metrics.title.bottom<=metrics.header.bottom+.5,label+' title containment');
    const midi=metrics.controls.find(c=>c.action==='midi-settings');assert.ok(midi,label+' MIDI action');
    assert.ok(midi.x>metrics.header.x+metrics.header.width/2,label+' MIDI on right');
    const result={theme,layout:name,width,height,route,metrics};results.push(result);
    if(folder&&['home','practice','calendar','settings'].includes(route)&&name!=='narrow-phone'){
     result.capture=`${theme}-${route}-${name}.png`;
     await writeFile(folder+'/'+result.capture,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    }
   }
  }
  const stored=await read();assert.equal(stored.active.id,fixture.active.id);assert.deepEqual(stored.sessions,[]);
 }
 assert.deepEqual(errors,[]);
 if(folder)await writeFile(folder+'/verification.json',JSON.stringify({date:new Date().toISOString(),surface:'Responsive browser, disposable notebooks after returning from a real generated practice; not native-device acceptance',results,sourceSHA256:Object.fromEntries(await Promise.all(['src/layout.css','src/companion/app.js','src/companion/app.css','dist/index.html'].map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')]))),errors},null,2));
});
