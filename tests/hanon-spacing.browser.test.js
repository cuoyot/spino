import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {emptyData,beginSession,block,validateData} from '../src/companion/model.js';
import {HANON,warmupCycle,warmupUnit} from '../src/companion/warmups.js';

// Read actual note glyphs, finger labels and drawn bar lines from the production SVG.
function scoreSpacing() {
 const {layout,line}=__sr,beats=4;
 const bars=(layout.endBeat-layout.startBeat)/layout.rows.length/beats;
 const rows=[...document.querySelectorAll('#staff .page-row')].map((row,index)=>{
  const svg=row.querySelector('svg');
  const segment=path=>path.getAttribute('d').match(/^M(-?[\d.]+) (-?[\d.]+)L(-?[\d.]+) (-?[\d.]+)$/)?.slice(1).map(Number);
  const screenX=x=>new DOMPoint(x,0).matrixTransform(svg.getScreenCTM()).x;
  const staffLines=[...row.querySelectorAll('.vf-stave path')].map(segment).filter(p=>p&&p[1]===p[3]&&p[2]-p[0]>100);
  const edges=[screenX(Math.min(...staffLines.map(p=>p[0]))),
   ...[...svg.children].filter(p=>p.tagName==='path').map(segment).filter(p=>p&&p[0]===p[2]&&p[3]-p[1]>30).map(p=>screenX(p[0])),
   screenX(Math.max(...staffLines.map(p=>p[2])))];
  const notes=[];
  for(let i=layout.from;i<layout.to;i++)if(layout.systemOf(line.onsets[i])===index){
   const group=layout.elementOf(i),head=group.querySelector('.vf-notehead > text'),finger=group.querySelector('.vf-annotation text');
   const box=head.getBoundingClientRect(),label=finger?.getBoundingClientRect();
   const bar=Math.floor((line.onsets[i]-layout.rows[index].sysStart)/beats);
   notes.push({index:i,bar,leftGap:Math.min(box.left,label?.left??box.left)-edges[bar],
    rightGap:edges[bar+1]-Math.max(box.right,label?.right??box.right),
    cursorDelta:Math.abs(layout.xAtBeat(line.onsets[i])-layout.xOfNote(i))});
  }
  return {edges,notes};
 });
 return {bars,systems:rows.length,zoom:layout.zoom,startBeat:layout.startBeat,endBeat:layout.endBeat,rows,
  pageLabel:document.querySelector('#score-page-label').textContent,
  overflow:document.documentElement.scrollWidth>innerWidth};
}

const devices=[
 {id:'phone-portrait',width:390,height:844},
 {id:'phone-landscape',width:844,height:390},
 {id:'tablet-portrait',width:768,height:1024},
 {id:'tablet-landscape',width:1024,height:768},
];

test('Hanon notes and fingering clear every bar across exercises, rhythms, pages and rotation',{timeout:120000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 const folder=process.env.HANON_SPACING_EVIDENCE,results=[],fixtures=[];
 if(folder)await mkdir(folder,{recursive:false});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.scoreSpacing=${scoreSpacing.toString()};`});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('Hanon spacing timeout'))}},20)})`);
 const settle=()=>evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
 const read=()=>evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,r=db.transaction('state').objectStore('state').get('current');r.onsuccess=()=>{db.close();resolve(r.result)}}})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 for(const exercise of HANON)for(const figures of exercise.number===5?['1','2','4']:['2']){
  const fixture=emptyData();fixture.preferences.language='es';fixture.preferences.theme='light';
  fixture.active=beginSession({title:'Hanon score spacing review',context:'piano',blocks:[block('warmup',{
   id:`spacing-${exercise.id}-${figures}`,target:exercise.id,exercises:[exercise.id],minutes:3,bpm:60,figures,hand:'both',presentation:'page',
  })]},Date.parse('2026-10-20T12:00:00+02:00'));
  validateData(fixture);fixtures.push(fixture);
  await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve()}}})`);
  await send('Page.reload');await wait(`document.querySelector('[data-action=resume-session]')`);
  await evaluate(`document.querySelector('[data-action=resume-session]').click()`);await wait(`document.querySelector('[data-action=open-reader]')`);
  await evaluate(`document.querySelector('[data-action=open-reader]').click()`);await wait(`__sr.layout`);
  await evaluate(`document.querySelector('[data-warmup-start]')?.click();__sr.settings.soundMode='off';__sr.settings.metronome=false`);await wait(`__sr.timed`);
  await evaluate(`if(__sr.timed.suspendedAt==null)document.querySelector('#start').click()`);
  await evaluate('document.fonts.ready');
  const original=await evaluate('JSON.stringify(__sr.line.notes.slice(0,64))');
  const cycleBeats=warmupCycle(exercise,{unit:warmupUnit(figures)}).length/4;
  for(const device of [...devices,...(exercise.number===5&&figures==='2'?[{id:'narrow-phone',width:320,height:568}]:[])]){
   await send('Emulation.setDeviceMetricsOverride',{...device,deviceScaleFactor:1,mobile:true});await settle();
   await evaluate(`while(!document.querySelector('#score-prev').disabled)document.querySelector('#score-prev').click()`);await settle();
   let page=0;
   do{
    const metrics=await evaluate('scoreSpacing()'),label=`${exercise.id} rhythm ${figures} ${device.id} page ${page+1}`;
    assert.equal(metrics.overflow,false,label+' page overflow');
    for(const row of metrics.rows){
     assert.equal(row.edges.length,metrics.bars+1,label+' bar boundaries');
     for(const note of row.notes){
      assert.ok(note.leftGap>=4,label+` note ${note.index} left margin ${note.leftGap}`);
      assert.ok(note.rightGap>=4,label+` note ${note.index} right margin ${note.rightGap}`);
      assert.ok(note.cursorDelta<.01,label+' cursor alignment');
     }
    }
    const result={exercise:exercise.id,figures,device,page:++page,metrics};results.push(result);
    if(folder&&exercise.number===5&&figures==='2'&&(page===1||metrics.endBeat>=cycleBeats)){
     result.screenshot=`hanon-5-${device.id}-${page===1?'first':'tonic'}.png`;
     await writeFile(folder+'/'+result.screenshot,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
    }
    if(metrics.endBeat>=cycleBeats)break;
    await evaluate(`document.querySelector('#score-next').click()`);await settle();
   }while(page<40);
   assert.equal(await evaluate('JSON.stringify(__sr.line.notes.slice(0,64))'),original,`Rotation/page turns retain ${exercise.id} notes and fingering`);
  }
  if(exercise.number===5){
   // The layout shortcut redraws the same generated material; scrolling must use its real rhythm too.
   await evaluate(`while(!document.querySelector('#score-prev').disabled)document.querySelector('#score-prev').click();document.querySelector('#q-clef').click()`);
   await wait(`document.querySelector('#settings').open`);
   await evaluate(`{const el=document.querySelector('#settings [name=layoutMode]');el.value='scroll';el.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#settings button[value=close]').click()}`);
   await settle();
   const scrolling=await evaluate(`(()=>{
    const {line,layout}=__sr,svg=document.querySelector('#staff .score-strip svg');
    const edges=[...svg.children].filter(p=>p.tagName==='path').map(p=>p.getAttribute('d').match(/^M(-?[\\d.]+) (-?[\\d.]+)L(-?[\\d.]+) (-?[\\d.]+)$/)?.slice(1).map(Number)).filter(p=>p&&p[0]===p[2]&&p[3]-p[1]>30).map(p=>new DOMPoint(p[0],0).matrixTransform(svg.getScreenCTM()).x);
    const gaps=[];
    for(let i=layout.from;i<layout.to;i++){
     const head=layout.elementOf(i).querySelector('.vf-notehead > text').getBoundingClientRect(),bar=line.notes[i].bar;
     if(edges[bar]!=null)gaps.push(edges[bar]-head.right);
     if(bar>0&&edges[bar-1]!=null)gaps.push(head.left-edges[bar-1]);
    }
    return {page:!!layout.page,ppb:layout.ppb,minMargin:Math.min(...gaps)};
   })()`);
   assert.equal(scrolling.page,false);assert.ok(scrolling.minMargin>=2,`Hanon rhythm ${figures} clears scrolling bar lines: ${scrolling.minMargin}`);
   results.push({exercise:exercise.id,figures,scrolling});
  }
  const stored=await read();assert.equal(stored.active.id,fixture.active.id);assert.deepEqual(stored.sessions,[]);
  await evaluate(`document.querySelector('#practice-return').click()`);
 }
 assert.deepEqual(errors,[]);
 if(folder){
  const hashes=Object.fromEntries(await Promise.all(['src/main.js','src/render.js','src/page-layout.js','dist/index.html'].map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])));
  await writeFile(folder+'/fixtures.json',JSON.stringify(fixtures,null,2));
  await writeFile(folder+'/verification.json',JSON.stringify({date:'2026-10-20',surface:'Responsive Chromium browser; disposable notebooks; not native-device acceptance',sources:hashes,results,runtimeErrors:errors},null,2));
 }
});
