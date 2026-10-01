import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseTags,repertoirePage,setWorkTrashed} from '../src/companion/repertoire.js';
import {emptyData,validateData,block,beginSession,saveSession} from '../src/companion/model.js';

test('large repertoire supports accent-insensitive search, combined filters and bounded pages',()=>{
  const works=Array.from({length:205},(_,i)=>({id:String(i),title:`Étude ${i}`,composer:'Chopin',stage:'En estudio',tags:['Recital'],favorite:i%2===0}));
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
