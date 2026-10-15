import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {openBrowser} from './browser.js';
import {emptyData,block,localDate,weekOf,addDays,beginSession,saveSession} from '../src/companion/model.js';
test('Navigation palette covers both themes while preserving practice screens', {timeout:90000}, async t=>{
 const capture=process.env.BROWSE_CAPTURE,frames=[];
 const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
 if(capture){await mkdir(dirname(capture),{recursive:true});await mkdir(capture);}
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
 if(capture)await send('Emulation.setTimezoneOverride',{timezoneId:'Europe/Madrid'});
 await send('Page.navigate',{url});await evaluate(`new Promise(r=>{const i=setInterval(()=>{if(document.querySelector('.cp-today')){clearInterval(i);r()}},20)})`);
 const data=emptyData(),today=localDate(),start=weekOf(today);
 data.works=[{id:'stand-piece',title:'Synthetic prelude',composer:'Review composer',stage:'En estudio',onStand:true},{id:'collection-piece',title:'Synthetic waltz',composer:'Review composer',stage:'Mantenimiento',onStand:false}].map(w=>({notes:'',passage:'Bars 1–8',bpm:60,target:null,...w}));
 data.routines=[{id:'routine',title:'Daily piano',context:'piano',blocks:[block('reading',{minutes:5}),block('repertoire',{workId:'stand-piece',minutes:15})]}];
 data.plans=['reading','technique','repertoire','free'].map((type,i)=>({id:'plan-'+i,title:['Read a new melody','Scale with both hands','Prelude · bars 1–8','Explore a harmony'][i],context:'piano',date:addDays(start,i),time:'18:00',status:'planned',blocks:[block(type,{minutes:15,...(type==='repertoire'?{workId:'stand-piece'}:{})})]}));
 data.events=[{id:'lesson',title:'Piano lesson',type:'Clase',date:addDays(start,4),time:'17:00',place:'Music school',notes:'',workIds:['stand-piece'],milestones:[]}];
 const active=beginSession({title:'Saved synthetic practice',context:'piano',blocks:[block('repertoire',{workId:'stand-piece'})]});active.date=today;active.elapsedMs=active.blockElapsedMs=25*60000;saveSession(data,active,{});
 if(capture)await writeFile(`${capture}/fixture.json`,JSON.stringify(data,null,2)+'\n');
 await evaluate(`new Promise((resolve,reject)=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}})`);
 await send('Page.reload');await evaluate(`new Promise(r=>{const i=setInterval(()=>{if(document.querySelector('.cp-today')){clearInterval(i);r()}},20)})`);
 for(const theme of ['light','dark']){
  let choiceStyle=null;
  await evaluate(`document.querySelector('[data-action=settings]').click();document.querySelector('[data-action=profile-appearance]').click();document.querySelector('[data-action=set-theme][data-id=${theme}]').click();document.querySelector('[data-action=close-dialog]').click()`);
  for(const route of ['home','practice','calendar','calendar-month','piano','catalog','progress','settings']){
   if(route==='calendar-month')await evaluate(`document.querySelector('[data-action=calendar-mode][data-id=month]').click()`);
   else if(route==='calendar')await evaluate(`document.querySelector('[data-action=calendar]').click();document.querySelector('[data-action=calendar-mode][data-id=week]').click()`);
   else await evaluate(`document.querySelector('[data-action=${route}]').click()`);
   if(route==='piano')await evaluate(`document.querySelector('[data-action=repertoire]').click()`);
   if(route==='catalog'){
    await evaluate(`new Promise(r=>{const i=setInterval(()=>{if(document.querySelector('[data-action=library-all]')){clearInterval(i);r()}},20)})`);
    await evaluate(`document.querySelector('[data-action=library-clear]').click()`);
   }
   assert.equal(await evaluate(`document.querySelector('.cp-page').classList.contains('cp-browse-surface')`),true);
   const contrast=await evaluate(`(()=>{
    const rgb=s=>(s.match(/[\\d.]+/g)||[]).map(Number),lum=c=>c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);
    return [...document.querySelectorAll('.cp-shortcuts .cp-icon,.cp-repertoire-section .cp-dashboard-count,.cp-agenda-week-title .cp-tag,.cp-repertoire-table .cp-stand-icon[aria-pressed=true],.cp-library-tabs [aria-pressed=true],.cp-choice-group button[aria-pressed=true],.cp-choice-group button[aria-current=page]')].map(e=>{const s=getComputedStyle(e),a=lum(rgb(s.color)),b=lum(rgb(s.backgroundColor));return {element:e.className,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}});
   })()`);
   assert.ok(contrast.every(c=>c.ratio>=4.5),`${theme}/${route}: ${JSON.stringify(contrast)}`);

   if(['calendar','calendar-month','progress'].includes(route)){
    const style=await evaluate(`(()=>{const e=document.querySelector('.cp-choice-group'),s=getComputedStyle(e),active=e.querySelector('[aria-pressed=true],[aria-current=page]'),inactive=e.querySelector('button:not([aria-pressed=true],[aria-current=page])');return {background:s.backgroundColor,radius:s.borderRadius,gap:s.gap,active:getComputedStyle(active).backgroundColor,inactive:getComputedStyle(inactive).backgroundColor}})()`);
    assert.notEqual(style.background,'rgb(255, 255, 255)');assert.equal(style.inactive,'rgba(0, 0, 0, 0)');
    if(choiceStyle)assert.deepEqual(style,choiceStyle);else choiceStyle=style;
   }
   for(const [width,height] of [...[[390,844],[844,390],[768,1024],[1024,768]],...(['practice','calendar','calendar-month','progress'].includes(route)?[[360,800],[320,640]]:[])]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth<=document.querySelector('.cp-page').clientWidth+1`),true,`${route}/${width}`);
    if(['calendar','calendar-month','progress'].includes(route))assert.equal(await evaluate(`Array.from(document.querySelectorAll('.cp-choice-group button')).every(e=>e.scrollWidth<=e.clientWidth+1)`),true,`${route}/${width}: clipped choice label`);
    if(route==='practice'){
     const bounds=await evaluate(`(()=>{const title=document.querySelector('.cp-app-header h1').getBoundingClientRect(),action=document.querySelector('.cp-app-header [data-action=quick-practice]').getBoundingClientRect(),header=document.querySelector('.cp-app-header');return {gap:action.left-title.right,centerOffset:Math.abs((title.top+title.bottom)/2-(action.top+action.bottom)/2),overflow:header.scrollWidth>header.clientWidth+1}})()`);
     assert.ok(bounds.gap>=4&&bounds.centerOffset<=1&&!bounds.overflow,`${theme}/${width}: ${JSON.stringify(bounds)}`);
    }
    if(capture){const shot=await send('Page.captureScreenshot',{format:'png'}),bytes=Buffer.from(shot.data,'base64'),path=`${theme}-${route}-${width}x${height}.png`;await writeFile(`${capture}/${path}`,bytes);frames.push({path,theme,route,width,height,sha256:sha256(bytes)});}
   }
  }
 }
 await evaluate(`document.querySelector('[data-action=practice]').click()`);
 assert.equal(await evaluate(`!!document.querySelector('.cp-browse-surface')`),true);
 await evaluate(`document.querySelector('[data-action=prepare][data-id=repertoire]').click()`);
 assert.equal(await evaluate(`!!document.querySelector('.cp-browse-surface')`),false);
 await evaluate(`document.querySelector('[data-action=prepare-other-pieces]').click();document.querySelector('#cp-dialog [data-action=choose-catalogue]').click()`);
 assert.equal(await evaluate(`!!document.querySelector('.cp-browse-surface')`),false);
 assert.deepEqual(errors,[]);
 if(capture){
  const sourcePaths=['src/companion/browse-surfaces.css','src/companion/app.css','src/companion/theme.css','src/companion/app.js','src/companion/views.js','src/companion/agenda.js','src/companion/dashboard.css','src/companion/profile.css','tests/browse-surfaces.browser.test.js','tests/browser.js'];
  const sourceHashes=Object.fromEntries(await Promise.all(sourcePaths.map(async path=>[path,sha256(await readFile(path))])));
  await writeFile(`${capture}/metadata.json`,JSON.stringify({capturedAt:new Date().toISOString(),kind:'responsive-browser',nativeAcceptance:false,packageVersion:JSON.parse(await readFile('package.json','utf8')).version,gitHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:'Includes existing uncommitted work; source hashes identify this run.',build:'Vite production build',buildIndexSha256:sha256(await readFile('dist/index.html')),browser:await send('Browser.getVersion'),locale:'es',timezone:'Europe/Madrid',date:today,fixture:'fixture.json; disposable synthetic notebook',sourceHashes,frames,runtimeErrors:errors},null,2)+'\n');
 }
});
