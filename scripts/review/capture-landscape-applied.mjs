import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {openBrowser} from '../../tests/browser.js';
import {emptyData,beginSession} from '../../src/companion/model.js';
import {quickPractice} from '../../src/companion/quick-practice.js';
import {emptyQuickScore} from '../../src/companion/quick-score.js';
const language=process.argv[2] || 'ca';
if(!['en','es','ca'].includes(language)) throw new Error('Unsupported language');
const folder=resolve(`docs/quality-review/captures/website/2026-10-07-landscape-5.2.5/${language}`),cleanup=[];
await mkdir(folder,{recursive:true});
try {
 const {send,evaluate,url}=await openBrowser({after:fn=>cleanup.push(fn)},{companion:true,language});
 const wait=c=>evaluate(`new Promise(resolve=>{const t=setInterval(()=>{if(${c}){clearInterval(t);resolve();}},20);})`);
 await send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 const fixture=emptyData();fixture.preferences.language=language;fixture.active=beginSession(quickPractice(fixture.preferences,()=>.2));fixture.active.quickScore=emptyQuickScore();fixture.active.title={en:'Quick practice',es:'Práctica rápida',ca:'Pràctica ràpida'}[language];
 await evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve();};};})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('[data-action=resume-session]')`);
 await evaluate(`document.querySelector('[data-action=resume-session]').click();document.querySelector('[data-action=open-reader]').click()`);await wait(`document.querySelector('#app-shell').hidden`);
 const capture=async name=>{const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,name+'.png'),Buffer.from(shot.data,'base64'));};
 const before=await evaluate(`document.querySelector('#piano').getBoundingClientRect().height`);await capture('quick-phone-landscape');
 const after=await evaluate(`document.querySelector('#piano').getBoundingClientRect().height`);
 await writeFile(join(folder,'capture.json'),JSON.stringify({date:'2026-10-07',version:'5.2.5',language,surface:'Responsive browser production layout; synthetic notebook',width:844,height:390,keyboardHeightBefore:before,keyboardHeightAfter:after,fixture:'Disposable synthetic quick practice'},null,2));
 console.log({before,after,folder});
}finally{for(const close of cleanup.reverse())await close();}
