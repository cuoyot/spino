import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,validateData,validateBackup,VERSION} from '../src/companion/model.js';
import {mergeNotebooks} from '../src/companion/cloud-merge.js';
import {workDetailMarkup} from '../src/companion/work-detail.js';
import {setAppLanguage} from '../src/companion/locale.js';

const notebook=()=>({...emptyData(),works:[{id:'piece',title:'Piece',composer:'',stage:'En estudio',target:null,bpm:60,notes:'',passage:''}]});
test('optional work added date survives validation, backup and independent cloud edits',()=>{
 const base=notebook();
 assert.equal(validateData(base).works[0].addedAt,undefined);
 const local=structuredClone(base),remote=structuredClone(base);
 local.works[0].addedAt='2026-09-14T10:00:00Z';remote.works[0].notes='New passage';
 const merged=mergeNotebooks({data:base},{data:local},{data:remote});
 assert.deepEqual(merged.conflicts,[]);
 assert.equal(merged.backup.data.works[0].addedAt,local.works[0].addedAt);
 assert.equal(merged.backup.data.works[0].notes,'New passage');
 const backup=validateBackup(JSON.stringify({format:'cuaderno-piano',version:VERSION,data:merged.backup.data,assets:[]}));
 assert.equal(backup.data.works[0].addedAt,local.works[0].addedAt);
 local.works[0].addedAt='not a date';assert.throws(()=>validateData(local));
});
test('legacy work date is explicitly unknown and longer practice totals use hours and minutes',()=>{
 setAppLanguage('es');
 const markup=workDetailMarkup(notebook().works[0],{totalMs:95*60000});
 assert.match(markup,/Fecha no registrada/);assert.match(markup,/1 hr 35 min/);assert.doesNotMatch(markup,/cp-work-added[^]*?<time/);
 setAppLanguage('en');
});
