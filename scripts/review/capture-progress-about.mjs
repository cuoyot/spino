import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {openBrowser} from '../../tests/browser.js';
import {writeGallery} from './build-gallery.mjs';
const folder=resolve('docs/quality-review/captures/profile',process.argv[2]),cleanup=[],results=[];
await mkdir(folder,{recursive:true});
try {
 const {send,evaluate,url,errors}=await openBrowser({after:fn=>cleanup.push(fn)},{companion:true,language:'es'});
 const wait=c=>evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(${c}){clearInterval(t);resolve();}else if(++n>500){clearInterval(t);reject(Error('Profile timeout'));}},20);})`);
 const click=a=>evaluate(`document.querySelector('[data-action="${a}"]').click()`);
 for(const device of [{id:'phone-portrait',label:'Phone portrait',width:390,height:844},{id:'phone-landscape',label:'Phone landscape',width:844,height:390},{id:'tablet-portrait',label:'Tablet portrait',width:768,height:1024},{id:'tablet-landscape',label:'Tablet landscape',width:1024,height:768}]) {
  await send('Emulation.setDeviceMetricsOverride',{width:device.width,height:device.height,deviceScaleFactor:1,mobile:true});await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
  const capture=async state=>{const shot=await send('Page.captureScreenshot',{format:'png'}),bytes=Buffer.from(shot.data,'base64'),path=`${state}-${device.id}-01.png`;await writeFile(join(folder,path),bytes);results.push({...device,state,frames:[{path,scrollTop:0,sha256:createHash('sha256').update(bytes).digest('hex')}]});};
  assert.equal(await evaluate(`document.querySelector('.cp-nav [data-action=progress]').textContent`),'Progreso');
  assert.ok(await evaluate(`[...document.querySelectorAll('.cp-nav button')].every(e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight;})`),'Navigation fits viewport');
  await click('progress');assert.equal(await evaluate(`document.querySelector('#app-shell h1').textContent`),'Progreso');assert.equal(await evaluate(`document.querySelector('.cp-nav [aria-current=page]').dataset.action`),'progress');await capture('progress');
  await click('settings');assert.equal(await evaluate(`document.querySelector('.cp-profile [data-action=progress]')`),null);assert.match(await evaluate(`document.querySelector('[data-action=about]').textContent`),/5\.2\.1/);await capture('profile');
  await click('about');await wait(`document.querySelector('#cp-dialog').open`);assert.equal(await evaluate(`document.querySelectorAll('.cp-about details').length`),6);assert.match(await evaluate(`document.querySelector('.cp-about').textContent`),/Créditos/);await capture('credits');
  await evaluate(`const d=document.querySelector('.cp-about details');d.scrollIntoView();document.querySelectorAll('.cp-about details')[1].open=true`);await capture('release-notes');
  await evaluate(`window.dispatchEvent(new Event('spino:back',{cancelable:true}))`);assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`),false);assert.ok(await evaluate(`document.querySelector('.cp-profile')`));
 }
 assert.deepEqual(errors,[]);
 const metadata={date:'2026-10-06',title:'Progress navigation and About',surface:'Responsive Chromium, not native acceptance',fixtures:'Disposable browser notebook',sourceSha256:createHash('sha256').update(await readFile('src/companion/about-view.js')).digest('hex'),results,runtimeErrors:errors};await writeFile(join(folder,'capture.json'),JSON.stringify(metadata,null,2));await writeGallery(folder,metadata);console.log(JSON.stringify({folder,views:results.length,errors}));
} finally {for(const close of cleanup.reverse())await close();}
