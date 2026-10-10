import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {openBrowser} from '../../tests/browser.js';
import {scorePDF} from '../../tests/pdf-fixture.js';
import {writeGallery} from './build-gallery.mjs';
const runId=process.argv[2],folder=resolve('docs/quality-review/captures/repertoire',runId);
await mkdir(folder,{recursive:true});const cleanup=[],results=[],hash=b=>createHash('sha256').update(b).digest('hex');
try{
 const {send,evaluate,url,errors}=await openBrowser({after:fn=>cleanup.push(fn)},{companion:true,language:'es'});
 const wait=c=>evaluate(`new Promise((resolve,reject)=>{let n=0;const t=setInterval(()=>{if(${c}){clearInterval(t);resolve();}else if(++n>700){clearInterval(t);reject(Error('Import capture timeout'));}},20);})`);
 for(const device of [{id:'phone-portrait',label:'Phone portrait',width:390,height:844},{id:'phone-landscape',label:'Phone landscape',width:844,height:390},{id:'tablet-portrait',label:'Tablet portrait',width:768,height:1024},{id:'tablet-landscape',label:'Tablet landscape',width:1024,height:768}]){
  await send('Emulation.setDeviceMetricsOverride',{...device,deviceScaleFactor:1,mobile:true});await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
  await evaluate(`document.querySelector('[data-action=piano]').click();document.querySelector('[data-action=repertoire]').click()`);
  for(const state of ['empty','new-work','study-details','pdf-selected']){
   if(state==='new-work')await evaluate(`document.querySelector('[data-action=new-work]').click()`);
   if(state==='study-details')await evaluate(`document.querySelector('#cp-dialog details').open=true`);
   if(state==='pdf-selected'){
    await evaluate(`(()=>{const f=new DataTransfer();f.items.add(new File([Uint8Array.from(atob(${JSON.stringify(scorePDF())}),c=>c.charCodeAt(0))],'Review score.pdf',{type:'application/pdf'}));const input=document.querySelector('[name=score]');input.files=f.files;input.dispatchEvent(new Event('change'));})()`);
    await wait(`document.querySelector('[name=score]').validity.valid&&!document.querySelector('#cp-dialog button[type=submit]')?.disabled`);
   }
   const path=`${state}-${device.id}-01.png`,bytes=Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64');await writeFile(join(folder,path),bytes);results.push({state,...device,frames:[{path,scrollTop:0,sha256:hash(bytes)}]});
  }
 }
 const metadata={runId,date:'2026-10-06',title:'Repertoire and import baseline',reviewHref:'../../../repertoire-import.md',surface:'Responsive Chromium production browser, not native acceptance',fixtures:'Disposable empty notebook; synthetic PDF; no personal data',stateLabels:{empty:'Repertoire · empty','new-work':'Add work','study-details':'Add work · study details','pdf-selected':'Add work · PDF selected'},sourceSha256:hash(await readFile('src/companion/score-import.js')),results,runtimeErrors:errors};await writeFile(join(folder,'capture.json'),JSON.stringify(metadata,null,2));await writeGallery(folder,metadata);console.log(JSON.stringify({folder,views:results.length,errors}));
}finally{for(const close of cleanup.reverse())await close();}
