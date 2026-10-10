import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseTags,repertoirePage,setWorkTrashed,isOnStand,setWorkOnStand} from '../src/companion/repertoire.js';
import {emptyData,validateData,block,beginSession,saveSession,finishBlock,repertoireParts,applyWorkParts} from '../src/companion/model.js';
import {editSession} from '../src/companion/session-edit.js';
import {feedbackFields,readFeedback} from '../src/companion/views.js';
import {workPickerMarkup} from '../src/companion/session-view.js';

test('large repertoire supports accent-insensitive search, combined filters and bounded pages',()=>{
  const works=Array.from({length:205},(_,i)=>({id:String(i),title:`Étude ${i}`,composer:'Chopin',stage:'En estudio',tags:['Recital'],favorite:i%2===0,onStand:false}));
  assert.equal(repertoirePage(works).works.length,40);
  assert.equal(repertoirePage(works,{},99).works.length,5);
  assert.equal(repertoirePage(works,{search:'etude chopin',scope:'favorites',tag:'Recital',stage:'En estudio'}).total,103);
  assert.equal(repertoirePage(works,{search:'Mozart'}).total,0);
  assert.deepEqual(parseTags('Lesson, lesson, Récital, recital'),['lesson','recital']);
  assert.throws(()=>parseTags('x'.repeat(41)),/40/);
});

test('trash preserves stable IDs, attachments and references and survives backup validation',()=>{
  const data=emptyData();
  data.works.push({id:'w',title:'Work',composer:'Composer',stage:'En estudio',notes:'Notes',passage:'Bar 2',bpm:60,target:null,assetId:'pdf',tags:['Recital'],favorite:true});
  const blocks=[block('repertoire',{workId:'w',target:null})];
  data.plans.push({id:'plan',title:'Practice',context:'piano',date:'2026-10-01',time:'',status:'planned',blocks});
  saveSession(data,beginSession({title:'Yesterday',context:'piano',blocks}));
  const original=structuredClone(data);
  setWorkTrashed(data,'w',true);
  assert.equal(repertoirePage(data.works).total,0);
  assert.equal(repertoirePage(data.works,{scope:'trash'}).total,1);
  assert.equal(validateData(data).works[0].assetId,'pdf');
  setWorkTrashed(data,'w',false);
  assert.deepEqual(data,original);
  assert.throws(()=>validateData({...data,works:[{...data.works[0],favorite:'yes'}]}));
});

test('the music stand lists current pieces in full and pages the rest of the repertoire',()=>{
  const works=[
    {id:'a',title:'Arabesque',composer:'Burgmüller',stage:'En estudio'},
    {id:'b',title:'Ballade',composer:'Burgmüller',stage:'Mantenimiento'},
    {id:'c',title:'Clair de lune',composer:'Debussy',stage:'Por empezar',onStand:false},
    {id:'d',title:'Gymnopédie',composer:'Satie',stage:'Archivada',onStand:true},
    {id:'e',title:'Old',composer:'',stage:'En estudio',trashedAt:'2026-10-01T00:00:00Z'},
  ];
  // Without the flag, pieces in study count as on the stand; maintenance and archived ones do not.
  assert.deepEqual(works.filter(isOnStand).map(w=>w.id),['a','d']);
  const page=repertoirePage(works);
  assert.deepEqual(page.stand.map(w=>w.id),['a','d']);
  assert.deepEqual(page.works.map(w=>w.id),['b','c']);
  assert.equal(page.total,4); assert.equal(page.restTotal,2);
  assert.deepEqual(repertoirePage(works,{search:'burgmuller'}).stand.map(w=>w.id),['a']);
  assert.deepEqual(repertoirePage(works,{scope:'trash'}).stand,[]);
  const data={...emptyData(),works:structuredClone(works.slice(0,4)).map(w=>({notes:'',passage:'',bpm:60,target:null,...w}))};
  setWorkOnStand(data,'b',true); setWorkOnStand(data,'a',false);
  assert.deepEqual(data.works.filter(isOnStand).map(w=>w.id),['b','d']);
  assert.equal(validateData(data).works[1].onStand,true);
  assert.throws(()=>validateData({...data,works:[{...data.works[0],onStand:'yes'}]}));
  // The picker offers the stand first and the rest on demand.
  const picker=workPickerMarkup(data);
  assert.ok(picker.indexOf('Ballade')<picker.indexOf('<details'));
  assert.ok(picker.indexOf('Arabesque')>picker.indexOf('<details'));
});

test('repertoire blocks can leave the piece open, switch pieces and record the part worked on',()=>{
  const data=emptyData();
  data.works.push({id:'w1',title:'Arabesque',composer:'',stage:'En estudio',notes:'',passage:'',bpm:60,target:null},{id:'w2',title:'Ballade',composer:'',stage:'En estudio',notes:'',passage:'Coda',bpm:72,target:null});
  // A planned block without a piece is valid.
  const plan=block('repertoire',{workId:'',target:null,minutes:20});
  assert.ok(validateData({...data,routines:[{id:'r',title:'R',context:'piano',blocks:[plan]}]}));
  let active=beginSession({title:'Repertoire',context:'piano',blocks:[plan]},0);
  active.blocks[0].workId='w1';
  active.runningSince=0; active.elapsedMs=0;
  // Switching after five minutes keeps Arabesque's time as its own part and starts Ballade fresh.
  active.blockElapsedMs=300000; active.elapsedMs=300000; active.runningSince=null;
  active=editSession(active,{type:'update',blockId:plan.id,values:{workId:'w2',passage:'Coda'}}).active;
  assert.equal(active.results.length,1); assert.equal(active.results[0].block.workId,'w1'); assert.equal(active.results[0].elapsedMs,300000);
  assert.equal(active.blocks[0].workId,'w2'); assert.equal(active.blockElapsedMs,0);
  assert.deepEqual(repertoireParts(active).map(b=>b.workId),['w1','w2']);
  const form=feedbackFields(active,data.works);
  assert.match(form,/name="part-0"/); assert.match(form,/name="part-1" maxlength="1000" value="Coda"/);
  data.active=active;
  const saved=saveSession(data,active,{parts:['bars 1–8','Coda, bars 40–52']},600000);
  assert.deepEqual(saved.results.map(r=>[r.block.workId,r.block.passage]),[['w1','bars 1–8'],['w2','Coda, bars 40–52']]);
  assert.deepEqual(saved.workIds,['w1','w2']);
  // The save dialog reads each part field by its position.
  const fields=new FormData(); fields.set('title','Repertoire'); fields.set('part-1','Coda only'); fields.set('part-0','bars 1–8');
  assert.deepEqual(readFeedback(fields).parts,['bars 1–8','Coda only']);
  applyWorkParts(saved,[undefined,'Coda']);
  assert.equal(saved.results[0].block.passage,'bars 1–8'); assert.equal(saved.results[1].block.passage,'Coda');
  assert.ok(validateData(data));
});
