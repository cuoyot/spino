import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { openBrowser } from './browser.js';
import { storeNotebook } from '../scripts/store/store-fixtures.mjs';
import { addDays } from '../src/companion/model.js';

test('main routes share header geometry and library tabs stay below it while scrolling', {timeout:120000}, async t => {
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
  const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('Header parity timeout: '+${JSON.stringify(condition)}))}},20)})`);
  const click=action=>evaluate(`document.querySelector('[data-action=${action}]').click()`);
  const folder=process.env.HEADER_PARITY_CAPTURE, measurements=[];
  if(folder)await mkdir(folder,{recursive:true});
  await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
  for(const language of ['es','en','ca'])for(const theme of ['light','dark']){
    const fixture=storeNotebook(language==='ca'?'es':language);fixture.preferences.language=language;fixture.preferences.theme=theme;
    for(const row of [...fixture.plans,...fixture.events,...fixture.sessions])row.date=addDays(row.date,14);
    fixture.works=Array.from({length:24},(_,i)=>({...fixture.works[0],id:i===0?'store-work':`header-work-${i}`,title:i===0?'A deliberately long musical title that still retains its complete original wording in the notebook':`${fixture.works[0].title} · ${i+1}`,onStand:i<4}));
    await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve()}}})`);
    await send('Page.reload');await wait(`document.querySelector('.cp-today')`);await evaluate(`document.fonts.ready`);
    for(const [width,height] of [[320,640],[360,800],[390,844],[599,900],[600,900],[844,390],[768,1024],[1024,768]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
      const insets=width===390?{top:59,bottom:34,left:0,right:0}:width===844?{top:0,bottom:21,left:62,right:62}:width>=600?{top:24,bottom:20,left:0,right:0}:{top:0,bottom:0,left:0,right:0};
      await send('Emulation.setSafeAreaInsetsOverride',{insets});
      let baseline;
      for(const route of ['home','practice','calendar','calendar-month','piano','catalog','progress','settings']){
        if(route==='calendar-month')await evaluate(`document.querySelector('[data-action=calendar-mode][data-id=month]').click()`);else await click(route);
        if(route==='piano')await click('repertoire');
        if(route==='calendar')await evaluate(`document.querySelector('[data-action=calendar-mode][data-id=week]').click()`);
        if(route==='catalog')await wait(`document.querySelector('#library-search')`);
        await evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
        const measure=()=>evaluate(`(()=>{const h=document.querySelector('.cp-app-header'),p=document.querySelector('.cp-page'),title=h.querySelector('h1'),box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right}};return{header:box(h),profile:box(h.querySelector('[data-action=settings]')),midi:box(h.querySelector('.cp-midi-status')),title:box(title),font:getComputedStyle(title).fontSize,pageTop:p.getBoundingClientRect().top,overflow:h.scrollWidth>h.clientWidth+1||p.scrollWidth>p.clientWidth+1,choices:[...h.querySelectorAll('.cp-choice-group button')].map(e=>({...box(e),clipped:e.scrollWidth>e.clientWidth+1}))}})()`);
        const before=await measure(),context=`${language}/${theme}/${width}/${route}`;
        baseline ||= before;
        assert.equal(before.header.h,68,context);
        for(const key of ['header','profile','midi','font','pageTop'])assert.deepEqual(before[key],baseline[key],`${context}: ${key} changed between routes`);
        assert.equal(before.title.x,baseline.title.x,context);
        assert.ok(Math.abs(before.title.y+before.title.h/2-(before.profile.y+before.profile.h/2))<=1,`${context}: title baseline`);
        assert.equal(before.overflow,false,context);
        for(const b of before.choices)assert.ok(b.h>=44&&b.w>=44&&!b.clipped&&b.y>=before.header.y&&b.bottom<=before.header.bottom,context);
        await evaluate(`document.querySelector('.cp-page').scrollTop=500`);
        const after=await measure();assert.deepEqual(after.header,before.header,context);assert.deepEqual(after.profile,before.profile,context);assert.deepEqual(after.midi,before.midi,context);
        if(['piano','catalog'].includes(route)){
          assert.equal(await evaluate(`(()=>{const h=document.querySelector('.cp-app-header'),p=document.querySelector('.cp-page'),tabs=p.querySelector(':scope > .cp-library-navigation'),r=tabs.getBoundingClientRect(),pr=p.getBoundingClientRect();return !h.querySelector('.cp-library-navigation')&&r.top>=pr.top-1&&r.bottom<=pr.bottom&&[...tabs.querySelectorAll('button')].every(b=>b.getBoundingClientRect().height>=44)})()`),true,`${context}: sticky page tabs`);
        }
        await evaluate(`document.querySelector('.cp-page').scrollTop=0`);
        const row={language,theme,width,height,route,insets,bounds:before};
        if(folder&&language==='es'&&[390,844,768,1024].includes(width)&&['home','practice','calendar','piano','progress','settings'].includes(route)){
          const shot=await send('Page.captureScreenshot',{format:'png'}),path=`${theme}-${route}-${width}x${height}.png`;await writeFile(`${folder}/${path}`,Buffer.from(shot.data,'base64'));row.capture=path;
        }
        measurements.push(row);
        if(route==='piano'){
          await evaluate(`document.querySelector('[data-action=work-detail][data-id=store-work]').click()`);
          const detail=await measure();assert.deepEqual(detail.header,before.header,`${context}: long title`);assert.deepEqual(detail.profile,before.profile,`${context}: long title profile`);
          assert.ok(detail.title.y>=detail.header.y&&detail.title.bottom<=detail.header.bottom,`${context}: long title containment`);
          assert.equal(await evaluate(`document.querySelector('.cp-app-header h1').title`),fixture.works[0].title);
          await click('piano');
        }
      }
    }
  }
  assert.deepEqual(errors,[]);
  if(folder){const paths=['src/companion/app.js','src/companion/app.css','src/companion/browse-surfaces.css'];const hash=b=>createHash('sha256').update(b).digest('hex');await writeFile(`${folder}/metadata.json`,JSON.stringify({surface:'Responsive browser; native acceptance remains separate.',fixture:'Disposable synthetic store notebook with 24 works.',sourceHashes:Object.fromEntries(await Promise.all(paths.map(async p=>[p,hash(await readFile(p))]))),browser:await send('Browser.getVersion'),measurements,errors},null,2));}
});
