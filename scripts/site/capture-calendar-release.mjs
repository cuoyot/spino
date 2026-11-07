// Synthetic browser evidence for the owner-reviewed Calendar, Library and Progress release.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from '../../tests/browser.js';
const folder='docs/quality-review/captures/website/2026-11-07-calendar-library-progress-01';
const fixture=JSON.parse(await readFile(`${folder}/fixture.json`,'utf8'));
const cleanup=[],frames=[];
try{
 const {send,evaluate,url,errors}=await openBrowser({after:fn=>cleanup.push(fn)},{companion:true});
 const wait=expression=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('Release capture timeout'));}},20);})`);
 for(const lang of ['es','en','ca','de','hu']){
  await send('Emulation.setDeviceMetricsOverride',{width:432,height:768,deviceScaleFactor:2.5,mobile:true});
  await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
  const data=structuredClone(fixture.data);data.preferences.language=lang;data.preferences.theme='light';
  const copy={es:['Lectura y coordinación','Repertorio','Calentamiento','Clase de piano'],en:['Reading and coordination','Repertoire','Warm-up','Piano lesson'],ca:['Lectura i coordinació','Repertori','Escalfament','Classe de piano'],de:['Lesen und Koordination','Repertoire','Aufwärmen','Klavierunterricht'],hu:['Olvasás és koordináció','Repertoár','Bemelegítés','Zongoraóra']}[lang];
  for(const p of data.plans)p.title=p.id==='reference-repertoire'?copy[1]:p.id==='reference-warmup'?copy[2]:copy[0];
  data.events[0].title=copy[3];
  await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');for(const asset of ${JSON.stringify(fixture.assets)})tx.objectStore('assets').put(asset);tx.oncomplete=()=>{db.close();resolve();}}})`);
  await send('Page.reload');await wait(`document.querySelector('.cp-today')`);
  for(const [route,name] of [['piano','03-repertoire'],['progress','06-progress'],['calendar','09-calendar']]){
   await evaluate(`document.querySelector('.cp-nav [data-action=${route}]').click()`);
   await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))))`);
   const png=Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64');
   const path=`${lang}/phone/${name}.png`;await mkdir(`${folder}/${lang}/phone`,{recursive:true});await writeFile(`${folder}/${path}`,png);
   frames.push({language:lang,path,sha256:createHash('sha256').update(png).digest('hex')});
  }
 }
 if(errors.length)throw Error(JSON.stringify(errors));
 await writeFile(`${folder}/verification.json`,JSON.stringify({kind:'responsive-browser-synthetic',version:'6.2.1-beta.5',nativeAcceptance:false,frames,errors},null,2));
 console.log(`${frames.length} localized release frames verified.`);
}finally{for(const clean of cleanup.reverse())await clean();}
