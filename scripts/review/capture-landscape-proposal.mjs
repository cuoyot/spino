import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {openBrowser} from '../../tests/browser.js';
import {emptyData,beginSession} from '../../src/companion/model.js';
import {quickPractice} from '../../src/companion/quick-practice.js';
import {emptyQuickScore} from '../../src/companion/quick-score.js';
const folder=resolve('docs/quality-review/captures/generated-practice/2026-10-07-landscape-sidebars-proposal-03'),cleanup=[];
await mkdir(folder,{recursive:true});
try {
 const {send,evaluate,url}=await openBrowser({after:fn=>cleanup.push(fn)},{companion:true,language:'ca'});
 const wait=c=>evaluate(`new Promise(resolve=>{const t=setInterval(()=>{if(${c}){clearInterval(t);resolve();}},20);})`);
 await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 const fixture=emptyData();fixture.preferences.language='ca';fixture.active=beginSession(quickPractice(fixture.preferences,()=>.2));fixture.active.quickScore=emptyQuickScore();fixture.active.title='Pràctica ràpida';
 await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve();};};})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('[data-action=resume-session]')`);
 await evaluate(`document.querySelector('[data-action=resume-session]').click();document.querySelector('[data-action=open-reader]').click()`);await wait(`document.querySelector('#app-shell').hidden`);
 const capture=async name=>{const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,name+'.png'),Buffer.from(shot.data,'base64'));};
 const before=await evaluate(`document.querySelector('#piano').getBoundingClientRect().height`);await capture('current');
 const css=await readFile('scripts/review/proposals/landscape-sidebars.css','utf8');
 await evaluate(`{const style=document.createElement('style');style.textContent=${JSON.stringify(css)};document.head.append(style);window.dispatchEvent(new Event('resize'));}`);
 await evaluate(`new Promise(resolve=>setTimeout(resolve,400))`);await capture('proposal');
 const after=await evaluate(`document.querySelector('#piano').getBoundingClientRect().height`);
 await writeFile(join(folder,'capture.json'),JSON.stringify({date:'2026-10-07',surface:'Responsive browser proposal only; CSS not imported by app',width:844,height:390,keyboardHeightBefore:before,keyboardHeightAfter:after,fixture:'Disposable synthetic quick practice'},null,2));
 console.log({before,after,folder});
}finally{for(const close of cleanup.reverse())await close();}
