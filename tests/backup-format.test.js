import test from 'node:test';import assert from 'node:assert/strict';
import {emptyData} from '../src/companion/model.js';
import {inspectBackup,convertBackup,backupCounts} from '../src/companion/backup-format.js';
import {LANGUAGES} from '../src/i18n.js';
const fixture=()=>({format:'cuaderno-piano',version:1,exportedAt:'2026-10-12T00:00:00Z',data:{...emptyData(),works:[{id:'stable-work',title:'Original musical title',composer:'Original composer',stage:'En estudio',notes:'Original user notes',passage:'1–8',bpm:80,target:null,assetId:'stable-score'}]},assets:[{id:'stable-score',name:'Original title.pdf',type:'application/pdf',base64:'JVBERi0xLjQ=',annotations:{version:1,marks:[{id:'stable-mark',page:1,type:'text',color:'#d64545',width:.002,points:[{x:.3,y:.4}],text:'Keep original annotation'}]},scoreView:{version:1,portrait:{zoom:1.5,centerX:.5,centerY:.6}}}],legacy:{}});
test('every supported reader language survives both backup formats with scores and annotations intact',()=>{
 for(const lang of Object.keys(LANGUAGES)){
  const source=fixture();source.data.preferences.language='ca';source.legacy['sr.settings']=JSON.stringify({clef:'treble',lang});
  const text=JSON.stringify(source),compatible=inspectBackup(text).backup;
  assert.equal(JSON.parse(compatible.legacy['sr.settings']).lang,lang);
  assert.deepEqual(compatible.data.works,source.data.works);assert.deepEqual(compatible.assets,source.assets);
  assert.deepEqual(inspectBackup(convertBackup(text,2)).backup,compatible);
  assert.deepEqual(inspectBackup(convertBackup(convertBackup(text,2),1)).backup,compatible);
  assert.equal(JSON.stringify(source),text,'Validation and conversion leave the source notebook intact');
 }
 const invalid=fixture();invalid.legacy['sr.settings']=JSON.stringify({clef:'treble',lang:'unsupported'});
 assert.throws(()=>inspectBackup(JSON.stringify(invalid)),/invalid/);
});
test('organized backup round trip preserves repertoire, score IDs, bytes and annotations',()=>{
 const book=fixture();const text=JSON.stringify(book),organized=convertBackup(text,2),parsed=JSON.parse(organized);assert.equal(parsed.version,2);assert.equal(parsed.scores[0].id,'stable-score');assert.equal(parsed.annotations[0].assetId,'stable-score');assert.equal(parsed.scores[0].annotations,undefined);
 assert.deepEqual(inspectBackup(organized).backup,inspectBackup(text).backup);assert.deepEqual(JSON.parse(convertBackup(organized,1)),JSON.parse(text));assert.equal(JSON.stringify(book),text);assert.equal(backupCounts(inspectBackup(text).backup).annotatedScores,1);
});
test('future and corrupt backup containers are refused before any restoration',()=>{
 for(const text of [JSON.stringify({...fixture(),version:99}),JSON.stringify({format:'spino-backup',version:99}),'{'])assert.throws(()=>inspectBackup(text));
 const organized=JSON.parse(convertBackup(JSON.stringify(fixture()),2));organized.annotations.push({...organized.annotations[0]});assert.throws(()=>inspectBackup(JSON.stringify(organized)),/duplicate/);
 organized.annotations=[{assetId:'missing',value:{}}];assert.throws(()=>inspectBackup(JSON.stringify(organized)),/missing/);
});
