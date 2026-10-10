import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {openBrowser} from '../../tests/browser.js';
import {writeGallery} from './build-gallery.mjs';
const folder=resolve('docs/quality-review/captures/generated-practice',process.argv[2]),cleanup=[],results=[];
await mkdir(folder,{recursive:true});
try {
 const {send,evaluate,url,errors}=await openBrowser({after:fn=>cleanup.push(fn)},{companion:true});
 const wait=c=>evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(${c}){clearInterval(t);resolve();}else if(++n>500){clearInterval(t);reject(Error('Quick timeout'));}},20);})`);
 for(const device of [{id:'phone-portrait',label:'Phone portrait',width:390,height:844},{id:'phone-landscape',label:'Phone landscape',width:844,height:390},{id:'tablet-portrait',label:'Tablet portrait',width:768,height:1024},{id:'tablet-landscape',label:'Tablet landscape',width:1024,height:768}]) {
  await send('Emulation.setDeviceMetricsOverride',{width:device.width,height:device.height,deviceScaleFactor:1,mobile:true});await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click()`);
  const capture=async state=>{const shot=await send('Page.captureScreenshot',{format:'png'}),bytes=Buffer.from(shot.data,'base64'),path=`${state}-${device.id}-01.png`;await writeFile(join(folder,path),bytes);results.push({...device,state,frames:[{path,scrollTop:0,sha256:createHash('sha256').update(bytes).digest('hex')}]});};
  await capture('entry');await evaluate(`document.querySelector('[data-action=quick-practice]').click()`);await wait(`document.querySelector('#app-shell').hidden`);assert.equal(await evaluate(`__sr.settings.timing`),'wait');assert.equal(await evaluate(`__sr.settings.input`),'piano');assert.ok(Number.isInteger(await evaluate(`__sr.settings.kbLo`)));await capture('playing');
  await evaluate(`document.querySelector('#practice-return').click();document.querySelector('[data-action=session-end]').click();document.querySelector('[data-action=discard-session]').click();document.querySelector('#cp-confirm').click()`);await wait(`!document.querySelector('#cp-dialog').open`);
 }
 assert.deepEqual(errors,[]);const metadata={date:'2026-10-06',title:'One-tap quick practice',surface:'Responsive browser, not native acceptance',fixtures:'Disposable notebook, randomized clef and keyboard start',sourceSha256:createHash('sha256').update(await readFile('src/companion/quick-practice.js')).digest('hex'),results,runtimeErrors:errors};await writeFile(join(folder,'capture.json'),JSON.stringify(metadata,null,2));await writeGallery(folder,metadata);console.log(JSON.stringify({folder,views:results.length}));
}finally{for(const close of cleanup.reverse())await close();}
