import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {openBrowser} from '../../tests/browser.js';
import {writeGallery} from './build-gallery.mjs';
const runId=process.argv[2];assert.match(runId||'',/^[a-z0-9-]+$/);
const folder='docs/quality-review/captures/profile/'+runId;await mkdir('docs/quality-review/captures/profile',{recursive:true});await mkdir(folder,{recursive:false});
const cleanup=[],results=[],hash=bytes=>createHash('sha256').update(bytes).digest('hex');
try {
 const {send,evaluate,url,errors}=await openBrowser({after:fn=>cleanup.push(fn)},{companion:true,releaseNotice:true});
 const wait=exp=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${exp}){clearInterval(timer);resolve();}else if(++n>1000){clearInterval(timer);reject(Error('Notice capture timeout'));}},20)})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 for(const language of ['es','en','ca','de','hu'])for(const theme of ['light','dark']) {
  await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite'),os=tx.objectStore('state'),q=os.get('current');q.onsuccess=()=>{q.result.preferences.language=${JSON.stringify(language)};q.result.preferences.theme=${JSON.stringify(theme)};os.put(q.result,'current');};tx.oncomplete=()=>{db.close();localStorage.removeItem('spino.release-notice.v1');resolve();};};})`);
  await send('Page.reload');await wait(`document.querySelector('[data-release-notice]')`);
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   await evaluate(`document.querySelector('.cp-dialog-body').scrollTop=0`);
   assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth+1`),false);
   const frames=[];
   for(const state of ['overview','actions']){
    if(state==='actions')await evaluate(`document.querySelector('.cp-dialog-body').scrollTop=10000`);
    const bytes=Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'),name=`${language}-${theme}-${width}x${height}-${state}.png`;
    await writeFile(folder+'/'+name,bytes);frames.push({path:name,sha256:hash(bytes),scrollTop:await evaluate(`document.querySelector('.cp-dialog-body').scrollTop`)});
   }
   results.push({state:language+'-'+theme,id:width+'x'+height,label:width+' × '+height,width,height,frames});
  }
  await evaluate(`document.querySelector('[data-release-notice] [data-action=close-dialog]').click()`);await wait(`!document.querySelector('#cp-dialog').open`);
 }
 assert.deepEqual(errors,[]);
 const metadata={runId,title:'Update highlights and optional rating',date:'2026-11-09',surface:'Responsive production browser; disposable synthetic notebook; not native-device acceptance',reviewHref:'../../../profile-release-notice.md',sourceSha256:hash(await readFile('src/companion/release-notice.js')),stylesheetSha256:hash(await readFile('src/companion/release-notice.css')),buildSha256:hash(await readFile('dist/index.html')),results,runtimeErrors:errors};
 await writeFile(folder+'/capture.json',JSON.stringify(metadata,null,2));await writeGallery(folder,metadata);console.log(JSON.stringify({folder,views:results.length}));
}finally{for(const close of cleanup.reverse())await close();}
