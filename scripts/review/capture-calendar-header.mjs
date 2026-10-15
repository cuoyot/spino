import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from '../../tests/browser.js';
const folder='docs/quality-review/captures/calendar/'+(process.argv[2]||'2026-10-15-inline-header');await mkdir(folder,{recursive:true});
const fixture=JSON.parse(await readFile('docs/quality-review/captures/calendar/2026-10-15-session-circles/fixture.json','utf8')),cleanup=[],results=[];
const sha=b=>createHash('sha256').update(b).digest('hex');
try{
 const {send,evaluate,url,errors}=await openBrowser({after:fn=>cleanup.push(fn)},{companion:true,language:'es'});
 const wait=()=>evaluate(`new Promise(r=>{const t=setInterval(()=>{if(document.querySelector('.cp-today')){clearInterval(t);r()}},20)})`);
 await send('Page.navigate',{url});await wait();
 for(const language of ['es','en','ca']){
  const data=structuredClone(fixture);data.preferences.language=language;data.preferences.theme='light';
  await evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}})`);
  await send('Page.reload');await wait();
  for(const theme of ['light','dark']){
   await evaluate(`document.querySelector('[data-action=settings]').click();document.querySelector('[data-action=profile-appearance]').click();document.querySelector('[data-action=set-theme][data-id=${theme}]').click();document.querySelector('[data-action=close-dialog]').click();document.querySelector('.cp-nav [data-action=calendar]').click()`);
   for(const [width,height] of [[320,640],[360,800],[390,844],[599,844],[600,900],[844,390],[768,1024],[1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    const insets=width===390?{top:59,bottom:34,left:0,right:0}:width===844?{top:0,bottom:21,left:62,right:62}:width>=600?{top:24,bottom:20,left:0,right:0}:{top:0,bottom:0,left:0,right:0};
    await send('Emulation.setSafeAreaInsetsOverride',{insets});
    for(const mode of ['week','month']){
     await evaluate(`document.querySelector('[data-action=calendar-mode][data-id=${mode}]').click()`);
     const bounds=await evaluate(`(()=>{const header=document.querySelector('.cp-app-header'),title=header.querySelector('h1'),group=header.querySelector('.cp-choice-group'),buttons=[...group.querySelectorAll('button')],box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,center:r.y+r.height/2}},a=box(title),b=box(group);return{header:box(header),title:box(title),selector:box(group),gap:b.x-a.right,centerOffset:Math.abs(a.center-b.center),overflow:header.scrollWidth>header.clientWidth+1,clipped:title.scrollWidth>title.clientWidth+1||buttons.some(e=>e.scrollWidth>e.clientWidth+1),small:buttons.some(e=>{const r=box(e);return r.h<44||r.w<44}),titleText:title.textContent,choices:buttons.map(b=>b.textContent)}})()`);
     assert.ok(bounds.gap>=4&&bounds.centerOffset<=1&&!bounds.overflow&&!bounds.clipped&&!bounds.small&&bounds.header.h<=82,JSON.stringify({language,theme,width,mode,bounds}));
     const item={language,theme,width,height,mode,insets,bounds};
     if((language==='es'&&mode==='week'&&[390,844,768,1024].includes(width))||([320,390].includes(width))){
      const path=`${language}-${theme}-${mode}-${width}x${height}.png`,clip={x:bounds.header.x,y:bounds.header.y,width:bounds.header.w,height:bounds.header.h+115,scale:1};
      const shot=await send('Page.captureScreenshot',{format:'png',clip}),bytes=Buffer.from(shot.data,'base64');await writeFile(`${folder}/${path}`,bytes);item.capture={path,sha256:sha(bytes)};
     }
     results.push(item);
    }
   }
  }
 }
 assert.deepEqual(errors,[]);
 const sourcePaths=['src/companion/app.css','src/companion/browse-surfaces.css','src/companion/app.js'];
 await writeFile(`${folder}/metadata.json`,JSON.stringify({kind:'responsive-browser; not native acceptance',date:'2026-10-15',fixture:'../2026-10-15-session-circles/fixture.json',browser:await send('Browser.getVersion'),buildIndexSha256:sha(await readFile('dist/index.html')),sourceHashes:Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,sha(await readFile(p))]))),results,errors},null,2));
 console.log(JSON.stringify({states:results.length,captures:results.filter(r=>r.capture).length,errors}));
}finally{for(const close of cleanup.reverse())await close();}
process.exit(0);
