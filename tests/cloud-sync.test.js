import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeNotebooks } from '../src/companion/cloud-merge.js';
import { createNotebookCloud } from '../src/companion/cloud-sync.js';
import { backupHash } from '../src/companion/cloud-backup.js';
const book = (works = []) => ({ data: { works, sessions: [] }, assets: [] });
const clone = structuredClone;
test('three-way merge keeps additions, independent fields, deletions and annotation IDs', () => {
 const b = book([{id:'a',title:'A',notes:''},{id:'gone',title:'Old'}]);
 b.assets=[{id:'pdf',annotations:{marks:[{id:'m',text:'1'}]}}];
 const l=clone(b), r=clone(b); l.data.works[0].title='New'; l.data.works.pop();
 r.data.works[0].notes='Practice'; r.data.works.push({id:'b',title:'B'});
 l.assets[0].annotations.marks.push({id:'l',text:'2'}); r.assets[0].annotations.marks.push({id:'r',text:'3'});
 const merged=mergeNotebooks(b,l,r); assert.deepEqual(merged.conflicts,[]);
 assert.deepEqual(merged.backup.data.works,[{id:'a',title:'New',notes:'Practice'},{id:'b',title:'B'}]);
 assert.equal(merged.backup.assets[0].annotations.marks.length,3);
});
test('delete versus edit and same annotation edits require explicit choices',()=>{
 const b=book([{id:'a',title:'A'}]),l=book(),r=book([{id:'a',title:'Changed'},{id:'new'}]);
 assert.equal(mergeNotebooks(b,l,r).conflicts.length,1);
 assert.deepEqual(mergeNotebooks(b,l,r,'local').backup.data.works,[{id:'new'}]);
 assert.equal(mergeNotebooks(b,l,r,'remote').backup.data.works.length,2);
 const a={assets:[{id:'p',annotations:{marks:[{id:'m',text:'1',color:'red'}]}}]};
 const x=clone(a),y=clone(a); x.assets[0].annotations.marks[0].text='2';y.assets[0].annotations.marks[0].color='blue';
 assert.equal(mergeNotebooks(a,x,y).conflicts.length,1);
});
function device(t, shared, initial) {
 let local=clone(initial),base=null,meta={},recovery=null,allowed=true,applyAllowed=true,gate=null;
 const adapter={status:async()=>({linked:!!shared.text,name:'shared.json'}),
 create:async({text})=>{shared.text=text;return {name:'shared.json'};},
 pickBackup:async()=>({text:shared.text,name:'shared.json'}),readLinked:async()=>{if(gate)await gate;return {text:shared.text};},
 write:async({text,expectedHash})=>{assert.equal(await backupHash(shared.text),expectedHash);shared.text=text;},
 saveRecovery:async({text})=>{recovery=text;},disconnect:async()=>{}};
 const engine=createNotebookCloud({adapter,settings:{read:()=>meta,save:v=>{meta=clone(v);}},snapshot:async()=>JSON.stringify(local),
 eligible:()=>allowed,canApply:()=>applyAllowed,readBase:async()=>base,saveBase:async v=>{base=clone(v);},apply:async(text,b)=>{local=JSON.parse(text);base=clone(b);},
 validate:JSON.parse,delay:100000,backupFactory:()=>({state:{},busy:false,stop(){},setEnabled:async()=>{},markDirty(){},disconnect:async()=>{}})});
 t.after(()=>engine.stop());
 return {engine,get:()=>local,edit:fn=>{fn(local);engine.markDirty();},recovery:()=>recovery,allowed:v=>{allowed=v;},applyAllowed:v=>{applyAllowed=v;},gate:v=>{gate=v;}};
}
test('two devices combine offline additions, pull without local edits and preserve recovery',async t=>{
 const shared={};const a=device(t,shared,book([{id:'a'}])),b=device(t,shared,book([{id:'b'}]));
 await a.engine.createShared();await b.engine.joinShared();await a.engine.sync();
 assert.equal(a.get().data.works.length,2);assert.equal(b.get().data.works.length,2);
 a.edit(v=>v.data.sessions.push({id:'one'}));b.edit(v=>v.data.sessions.push({id:'two'}));
 await a.engine.sync();await b.engine.sync();await a.engine.sync();
 assert.equal(a.get().data.sessions.length,2);assert.equal(b.get().data.sessions.length,2);assert.ok(a.recovery());
 a.edit(v=>v.data.works=v.data.works.filter(w=>w.id!=='a'));await a.engine.sync();await b.engine.sync();
 assert.deepEqual(b.get().data.works,[{id:'b'}]);
});
test('conflicts retain independent records and require fresh review when remote changes again',async t=>{
 const shared={};const a=device(t,shared,book([{id:'a',title:'A'}])),b=device(t,shared,book());
 await a.engine.createShared();await b.engine.joinShared();
 a.edit(v=>v.data.works[0].title='Local');b.edit(v=>{v.data.works[0].title='Remote';v.data.works.push({id:'b'});});
 await b.engine.sync();await a.engine.sync();assert.equal(a.engine.state.status,'conflict');
 b.edit(v=>v.data.works[0].title='Remote again');await b.engine.sync();await a.engine.resolve('local');assert.equal(a.engine.state.status,'conflict');
 await a.engine.resolve('local');assert.equal(a.engine.state.status,'saved');assert.equal(a.get().data.works[0].title,'Local');assert.equal(a.get().data.works.length,2);
});
test('ineligible state, concurrent local edits and malformed input never replace local data',async t=>{
 const shared={};const a=device(t,shared,book([{id:'a'}]));await a.engine.createShared();
 a.allowed(false);shared.text=JSON.stringify(book([{id:'b'}]));await a.engine.sync();assert.equal(a.get().data.works[0].id,'a');a.allowed(true);
 let release; a.gate(new Promise(r=>{release=r;}));const pending=a.engine.sync();a.edit(v=>v.data.works.push({id:'c'}));release();await pending;assert.equal(a.engine.state.status,'waiting');
 a.gate(null);shared.text='invalid';await a.engine.sync();assert.equal(a.engine.state.status,'error');assert.equal(a.get().data.works.length,2);
});

test('cloud overview opens a separate conflict review with escaped paths and both choices', async () => {
 const { cloudBackupMarkup, cloudConflictMarkup, cloudSetupMarkup } = await import('../src/companion/cloud-backup-view.js');
 const state={mode:'sync',enabled:true,status:'conflict',name:'<file>',error:'Review',conflicts:['/data/works/<id>']};
 const options={available:true,platform:'ios',lang:'es'};
 const html = cloudBackupMarkup(state,options), review=cloudConflictMarkup(state,options), setup=cloudSetupMarkup(options);
 assert.match(html,/data-action="cloud-conflicts"/);assert.doesNotMatch(html,/data-action="cloud-resolve-/);
 assert.match(review,/data-action="cloud-resolve-local"/);assert.match(review,/data-action="cloud-resolve-remote"/);
 assert.match(review,/Repertorio/);assert.match(review,/&lt;id&gt;/);assert.ok(!html.includes('<file>'));
 assert.match(setup,/data-action="cloud-create-shared"/);assert.match(setup,/data-action="cloud-join-shared"/);
 assert.match(setup,/data-action="cloud-connect"/);assert.match(setup,/iCloud Drive o Google Drive/);
});

test('automatic sync uploads local changes while editing and defers incoming adoption',async t=>{
 const shared={},a=device(t,shared,book([{id:'a'}])),b=device(t,shared,book());
 await a.engine.createShared();await b.engine.joinShared();
 a.applyAllowed(false);a.edit(v=>v.data.sessions.push({id:'practice'}));b.edit(v=>v.data.works.push({id:'remote'}));await b.engine.sync();await a.engine.sync();
 assert.equal(a.engine.state.status,'waiting');assert.equal(a.get().data.works.length,1);assert.equal(JSON.parse(shared.text).data.sessions[0].id,'practice');assert.equal(a.recovery(),null);
 a.applyAllowed(true);await a.engine.sync();assert.equal(a.engine.state.status,'saved');assert.equal(a.get().data.works.length,2);assert.equal(a.get().data.sessions[0].id,'practice');
});
