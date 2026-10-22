import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeNotebooks } from '../src/companion/cloud-merge.js';
import { createNotebookCloud } from '../src/companion/cloud-sync.js';
import { backupHash } from '../src/companion/cloud-backup.js';
import { emptyData, block, beginSession, saveSession, validateBackup } from '../src/companion/model.js';
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
function device(t, shared, initial, delay = 100000, validate = JSON.parse) {
 let local=clone(initial),base=null,meta={},recovery=null,allowed=true,applyAllowed=true,gate=null;
 const adapter={status:async()=>({linked:!!shared.text,name:'shared.json'}),
 create:async({text})=>{shared.text=text;return {name:'shared.json'};},
 pickBackup:async()=>({text:shared.text,name:'shared.json'}),readLinked:async()=>{await shared.beforeRead?.();if(gate)await gate;return {text:shared.text};},
 write:async({text,expectedHash})=>{await shared.beforeWrite?.();if(await backupHash(shared.text)!==expectedHash)throw Object.assign(new Error('Provider revision changed'),{code:'CONFLICT'});shared.text=text;await shared.afterWrite?.();},
 saveRecovery:async({text})=>{recovery=text;},disconnect:async()=>{}};
 const engine=createNotebookCloud({adapter,settings:{read:()=>meta,save:v=>{meta=clone(v);}},snapshot:async()=>JSON.stringify(local),
 eligible:()=>allowed,canApply:()=>applyAllowed,readBase:async()=>base,saveBase:async v=>{base=clone(v);},apply:async(text,b)=>{local=JSON.parse(text);base=clone(b);},
 validate,delay,backupFactory:()=>({state:{status:'disconnected',name:'',enabled:false},busy:false,stop(){},setEnabled:async()=>{},markDirty(){},disconnect:async()=>{}})});
 t.after(()=>engine.stop());
 return {engine,adapter,base:()=>base,get:()=>local,edit:fn=>{fn(local);engine.markDirty();},recovery:()=>recovery,allowed:v=>{allowed=v;},applyAllowed:v=>{applyAllowed=v;},gate:v=>{gate=v;}};
}
test('Catalan reader settings synchronize between same-version devices using the production validator',async t=>{
 const initial={format:'cuaderno-piano',version:1,data:emptyData(),assets:[{id:'stable-score',name:'Synthetic score.pdf',type:'application/pdf',base64:'JVBERi0xLjQ=',annotations:{version:1,marks:[{id:'stable-mark',page:1,type:'text',color:'#d64545',width:.002,points:[{x:.3,y:.4}],text:'Keep original annotation'}]}}],legacy:{'sr.settings':JSON.stringify({clef:'treble',lang:'en'})}};
 initial.data.works=[{id:'stable-work',title:'Original musical title',composer:'Original composer',stage:'En estudio',notes:'',passage:'1–8',bpm:80,target:null,assetId:'stable-score'}];
 initial.data.preferences.language='en';
 const shared={},a=device(t,shared,initial,100000,validateBackup),b=device(t,shared,initial,100000,validateBackup);
 await a.engine.createShared();await b.engine.joinShared();assert.equal(b.engine.state.status,'saved');
 b.edit(v=>{v.data.preferences.language='ca';v.legacy['sr.settings']=JSON.stringify({clef:'treble',lang:'ca'});});
 a.edit(v=>{const active=beginSession({title:'Saved on the other device',context:'piano',blocks:[block('free')]});active.elapsedMs=active.blockElapsedMs=120000;saveSession(v.data,active);});
 await a.engine.sync();await b.engine.sync();assert.equal(b.engine.state.status,'saved',b.engine.state.error);
 await a.engine.sync();assert.equal(a.engine.state.status,'saved',a.engine.state.error);
 for(const d of [a,b]){
  const actual=validateBackup(JSON.stringify(d.get()));assert.equal(actual.data.sessions.length,1);
  assert.equal(actual.data.preferences.language,'ca');assert.equal(JSON.parse(actual.legacy['sr.settings']).lang,'ca');
  assert.deepEqual(actual.data.works,initial.data.works);assert.deepEqual(actual.assets,initial.assets);
 }
 const before=clone(b.get()),base=clone(b.base());shared.text=JSON.stringify({...JSON.parse(shared.text),version:99});const invalid=shared.text;
 await b.engine.sync();assert.equal(b.engine.state.status,'error');assert.deepEqual(b.get(),before);assert.deepEqual(b.base(),base);assert.equal(shared.text,invalid);
});
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

test('continued edits after a deferred upload do not conflict with this device itself',async t=>{
 const shared={},a=device(t,shared,book([{id:'a',title:'Original'}])),b=device(t,shared,book());
 await a.engine.createShared();await b.engine.joinShared();
 a.applyAllowed(false);b.edit(v=>v.data.works.push({id:'remote'}));await b.engine.sync();
 a.edit(v=>v.data.works[0].title='First');await a.engine.sync();assert.equal(a.engine.state.status,'waiting');
 a.edit(v=>v.data.works[0].title='Second');await a.engine.sync();assert.equal(a.engine.state.status,'waiting');
 assert.deepEqual(JSON.parse(shared.text).data.works,[{id:'a',title:'Second'},{id:'remote'}]);
 a.applyAllowed(true);await a.engine.sync();assert.equal(a.engine.state.status,'saved');
 assert.deepEqual(a.get().data.works,[{id:'a',title:'Second'},{id:'remote'}]);
});

test('edits during a successful provider write retain the acknowledged baseline',async t=>{
 const shared={},a=device(t,shared,book([{id:'a',title:'Original'}]));await a.engine.createShared();
 a.edit(v=>v.data.works[0].title='First');shared.afterWrite=()=>{delete shared.afterWrite;a.edit(v=>v.data.works[0].title='Second');};
 await a.engine.sync();assert.equal(a.engine.state.status,'waiting');
 await a.engine.sync();assert.equal(a.engine.state.status,'saved');assert.equal(JSON.parse(shared.text).data.works[0].title,'Second');
});

test('provider contention re-reads and merges independent changes automatically',async t=>{
 const shared={},a=device(t,shared,book([{id:'a',title:'Original'}]));await a.engine.createShared();
 a.edit(v=>v.data.works[0].title='Local');shared.beforeWrite=()=>{delete shared.beforeWrite;const remote=JSON.parse(shared.text);remote.data.sessions.push({id:'remote'});shared.text=JSON.stringify(remote);};
 await a.engine.sync();assert.equal(a.engine.state.status,'saved');
 assert.equal(a.get().data.works[0].title,'Local');assert.equal(a.get().data.sessions[0].id,'remote');
});

test('contention on the same field still requires a user choice',async t=>{
 const shared={},a=device(t,shared,book([{id:'a',title:'Original'}]));await a.engine.createShared();
 a.edit(v=>v.data.works[0].title='Local');shared.beforeWrite=()=>{delete shared.beforeWrite;const remote=JSON.parse(shared.text);remote.data.works[0].title='Remote';shared.text=JSON.stringify(remote);};
 await a.engine.sync();assert.equal(a.engine.state.status,'conflict');assert.equal(a.get().data.works[0].title,'Local');assert.equal(JSON.parse(shared.text).data.works[0].title,'Remote');
});

test('persistent contention is bounded and remains retryable without losing local edits',async t=>{
 const shared={},a=device(t,shared,book([{id:'a'}]));await a.engine.createShared();a.edit(v=>v.data.works[0].title='Local');
 let attempts=0;shared.beforeWrite=()=>{attempts++;throw Object.assign(new Error('Busy'),{code:'LOCKED'});};
 await a.engine.sync();assert.equal(attempts,3);assert.equal(a.engine.state.status,'waiting');assert.equal(a.get().data.works[0].title,'Local');
 delete shared.beforeWrite;await a.engine.sync();assert.equal(a.engine.state.status,'saved');
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
 assert.match(setup,/data-action="cloud-create-shared"/);assert.match(setup,/data-action="device-link"/);assert.doesNotMatch(setup,/data-action="cloud-join-shared"/);
 assert.match(setup,/data-action="cloud-connect"/);assert.match(setup,/iCloud Drive o Google Drive/);
});

test('automatic sync uploads local changes while editing and defers incoming adoption',async t=>{
 const shared={},a=device(t,shared,book([{id:'a'}])),b=device(t,shared,book());
 await a.engine.createShared();await b.engine.joinShared();
 a.applyAllowed(false);a.edit(v=>v.data.sessions.push({id:'practice'}));b.edit(v=>v.data.works.push({id:'remote'}));await b.engine.sync();await a.engine.sync();
 assert.equal(a.engine.state.status,'waiting');assert.equal(a.get().data.works.length,1);assert.equal(JSON.parse(shared.text).data.sessions[0].id,'practice');assert.equal(a.recovery(),null);
 a.applyAllowed(true);await a.engine.sync();assert.equal(a.engine.state.status,'saved');assert.equal(a.get().data.works.length,2);assert.equal(a.get().data.sessions[0].id,'practice');
});

test('QR join checks notebook identity and maintains it across two-device edits',async t=>{
 const shared={},a=device(t,shared,book([{id:'a'}])),b=device(t,shared,book([{id:'b'}]));await a.engine.createShared();const link=await a.engine.deviceLink();
 assert.equal(JSON.parse(shared.text).cloudBackup.sharedNotebookId,link.id);await b.engine.joinShared(link.code);await a.engine.sync();assert.equal(b.engine.state.notebookId,link.id);assert.equal(a.get().data.works.length,2);
 const c=device(t,shared,book());const wrong=link.code.replace(link.id,'6ce8d640-d2e3-4fcb-8fa3-885d36b2cc52');await c.engine.joinShared(wrong);assert.equal(c.engine.state.status,'error');assert.deepEqual(c.get(),book());assert.equal(b.engine.state.notebookId,link.id);assert.equal(b.get().data.works.length,2);
});

test('reviewed cloud choice waits safely then applies without reopening the same conflict',async t=>{
 const shared={},a=device(t,shared,book([{id:'a',title:'Original'}])),b=device(t,shared,book());await a.engine.createShared();await b.engine.joinShared();
 a.edit(v=>v.data.works[0].title='Local');b.edit(v=>v.data.works[0].title='Cloud');await b.engine.sync();await a.engine.sync();assert.equal(a.engine.state.status,'conflict');
 a.applyAllowed(false);const before=shared.text;await a.engine.resolve('remote');assert.equal(a.engine.state.status,'waiting');assert.equal(shared.text,before);assert.equal(a.get().data.works[0].title,'Local');assert.equal(a.engine.state.resolution.preference,'remote');
 a.applyAllowed(true);await a.engine.sync();assert.equal(a.engine.state.status,'saved');assert.equal(a.get().data.works[0].title,'Cloud');assert.equal(a.engine.state.resolution,null);assert.ok(a.recovery());
});
test('deferred conflict choice requires fresh review after a new remote edit',async t=>{
 const shared={},a=device(t,shared,book([{id:'a',title:'Original'}])),b=device(t,shared,book());await a.engine.createShared();await b.engine.joinShared();a.edit(v=>v.data.works[0].title='Local');b.edit(v=>v.data.works[0].title='Cloud');await b.engine.sync();await a.engine.sync();a.applyAllowed(false);await a.engine.resolve('remote');b.edit(v=>v.data.works[0].title='Changed after review');await b.engine.sync();a.applyAllowed(true);await a.engine.sync();assert.equal(a.engine.state.status,'conflict');assert.equal(a.get().data.works[0].title,'Local');assert.equal(a.engine.state.resolution,null);
});

test('an older client can update a format 1 file without retaining additive QR metadata',async t=>{
 const shared={},a=device(t,shared,book([{id:'stable-work',title:'Original'}]));await a.engine.createShared();const id=a.engine.state.notebookId;const oldClient=JSON.parse(shared.text);delete oldClient.cloudBackup;oldClient.data.works[0].title='Stable app change';shared.text=JSON.stringify(oldClient);await a.engine.sync();assert.equal(a.engine.state.status,'saved');assert.equal(a.get().data.works[0].id,'stable-work');assert.equal(a.get().data.works[0].title,'Stable app change');assert.equal(JSON.parse(shared.text).cloudBackup.sharedNotebookId,id);
});

test('file selection is only offered while disconnected and sharing lives in manage',async()=>{
 const {deviceLinkMarkup}=await import('../src/companion/device-link.js');const {cloudSetupMarkup,cloudManageMarkup,cloudBackupMarkup}=await import('../src/companion/cloud-backup-view.js');
 for(const lang of ['en','es','ca']){const options={lang,available:true};assert.match(deviceLinkMarkup({},options),/data-action="cloud-join-shared"/);assert.doesNotMatch(cloudSetupMarkup(options),/data-action="cloud-join-shared"/);const manage=cloudManageMarkup({mode:'sync',name:'shared.json'},options);assert.doesNotMatch(manage,/data-action="device-link"|data-action="cloud-setup"/);assert.match(manage,/data-action="device-link-show"/);}
 const html=cloudBackupMarkup({mode:'sync',name:'shared.json',status:'waiting',waitReason:'practice'},{available:true,lang:'es'});assert.match(html,/Termina y guarda/);assert.match(html,/resume-session/);
});

test('a reviewed choice survives outbound transfer deferral',async t=>{
 const shared={},a=device(t,shared,book([{id:'a',title:'Original'}])),b=device(t,shared,book());await a.engine.createShared();await b.engine.joinShared();a.edit(v=>v.data.works[0].title='Local');b.edit(v=>v.data.works[0].title='Cloud');await b.engine.sync();await a.engine.sync();a.allowed(false);await a.engine.resolve('remote');assert.equal(a.engine.state.status,'waiting');a.allowed(true);await a.engine.sync();assert.equal(a.engine.state.status,'saved');assert.equal(a.get().data.works[0].title,'Cloud');
});

const waitUntil = async predicate => {
 const deadline=Date.now()+3000;
 while(!predicate() && Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,5));
 assert.ok(predicate(),'Expected synchronization state before timeout');
};
test('transient provider reads retry automatically and preserve pending edits',async t=>{
 const shared={},a=device(t,shared,book([{id:'a'}]),10);await a.engine.createShared();
 a.edit(v=>v.data.works[0].title='Pending');let reads=0;
 shared.beforeRead=()=>{if(++reads===1)throw Object.assign(Error('Provider unavailable'),{code:'PROVIDER_ERROR'});};
 await a.engine.sync();assert.equal(a.engine.state.operation,'read');assert.equal(a.engine.state.retryable,true);
 await waitUntil(()=>a.engine.state.status==='saved');
 assert.equal(JSON.parse(shared.text).data.works[0].title,'Pending');assert.equal(a.engine.state.retryCount,0);
});
test('persistent provider failures stop after three scheduled retries and manual retry recovers',async t=>{
 const shared={},a=device(t,shared,book([{id:'a'}]),10);await a.engine.createShared();let reads=0;
 shared.beforeRead=()=>{reads++;throw Object.assign(Error('Provider unavailable'),{code:'PROVIDER_ERROR'});};
 await a.engine.sync();await waitUntil(()=>a.engine.state.retryCount===4);
 assert.equal(a.engine.state.retryable,false);await new Promise(resolve=>setTimeout(resolve,60));assert.equal(reads,4);
 delete shared.beforeRead;await a.engine.retry();assert.equal(a.engine.state.status,'saved');
});
test('invalid cloud content is identified as validation failure and is not automatically retried',async t=>{
 const shared={},a=device(t,shared,book([{id:'a'}]),10);await a.engine.createShared();shared.text='broken';
 await a.engine.sync();assert.equal(a.engine.state.operation,'validate');assert.equal(a.engine.state.retryable,false);
 await new Promise(resolve=>setTimeout(resolve,40));assert.equal(a.engine.state.status,'error');assert.equal(a.get().data.works[0].id,'a');
});
test('overview exposes escaped error details and retry without implying every failure is connectivity',async()=>{
 const {cloudBackupMarkup}=await import('../src/companion/cloud-backup-view.js');
 const html=cloudBackupMarkup({mode:'sync',enabled:true,status:'error',name:'shared.json',operation:'snapshot',error:'IndexedDB <unavailable>'},{available:true,lang:'es'});
 assert.match(html,/Lectura del cuaderno local/);assert.match(html,/IndexedDB &lt;unavailable&gt;/);assert.match(html,/data-action="cloud-sync"/);assert.doesNotMatch(html,/Revisa la conexión/);
});

test('a missing Android provider requires reselecting the file rather than scheduled retries',async t=>{
 const shared={},a=device(t,shared,book([{id:'a'}]),10);await a.engine.createShared();let reads=0;
 shared.beforeRead=()=>{reads++;throw Object.assign(Error('Shared notebook could not be read: No content provider: content://com.google.android.apps.docs.storage/document/synthetic'),{code:'PROVIDER_ERROR'});};
 await a.engine.sync();assert.equal(a.engine.state.errorCode,'PROVIDER_UNAVAILABLE');assert.equal(a.engine.state.retryable,false);
 await new Promise(resolve=>setTimeout(resolve,80));assert.equal(reads,1);
 const {cloudManageMarkup}=await import('../src/companion/cloud-backup-view.js');
 const html=cloudManageMarkup(a.engine.state,{available:true,lang:'es'});
 assert.match(html,/data-action="cloud-relink"/);assert.match(html,/data-action="cloud-continue-local"/);assert.match(html,/comprueba tu cuenta/);
});

test('local mode cancels scheduled retries and resumes with local and remote records and annotations intact',async t=>{
 const shared={},initial=book([{id:'work'}]);initial.assets=[{id:'score',base64:'original-pdf',annotations:{marks:[{id:'mark',text:'fingering'}]}}];
 const a=device(t,shared,initial,10);await a.engine.createShared();const original=shared.text;
 shared.beforeRead=()=>{throw Object.assign(Error('Offline'),{code:'PROVIDER_ERROR'});};await a.engine.sync();
 a.engine.continueLocal();a.edit(v=>v.data.sessions.push({id:'local-session'}));
 await new Promise(resolve=>setTimeout(resolve,80));assert.equal(a.engine.state.status,'paused');assert.equal(shared.text,original);
 delete shared.beforeRead;const remote=JSON.parse(shared.text);remote.data.works.push({id:'remote-work'});shared.text=JSON.stringify(remote);
 await a.engine.setEnabled(true);await a.engine.sync();assert.equal(a.engine.state.status,'saved');
 assert.equal(a.get().data.sessions[0].id,'local-session');assert.equal(a.get().data.works.length,2);assert.deepEqual(a.get().assets,initial.assets);
});

for(const lateFailure of [false,true])test(`local mode immediately releases a pending provider read (${lateFailure?'late failure':'late changes'})`,async t=>{
 const shared={},a=device(t,shared,book([{id:'a',title:'Original'}]));await a.engine.createShared();
 let release,entered;const started=new Promise(resolve=>{entered=resolve;});const gate=new Promise(resolve=>{release=resolve;});
 shared.beforeRead=async()=>{entered();await gate;if(lateFailure)throw Object.assign(Error('Provider unavailable'),{code:'PROVIDER_ERROR'});};
 const pending=a.engine.sync();await started;a.engine.continueLocal();
 a.edit(v=>v.data.works[0].title='Local practice');const remote=JSON.parse(shared.text);remote.data.works[0].title='Late remote';shared.text=JSON.stringify(remote);
 assert.equal(a.engine.state.enabled,false);assert.equal(a.engine.state.status,'paused');release();await pending;
 assert.equal(a.get().data.works[0].title,'Local practice');assert.equal(a.engine.state.status,'paused');assert.equal(a.engine.state.retryable,false);
});

test('pausing during an acknowledged write keeps its baseline without adopting incoming data',async t=>{
 const shared={},a=device(t,shared,book([{id:'a',title:'Original'}]));await a.engine.createShared();
 const remote=JSON.parse(shared.text);remote.data.works.push({id:'remote'});shared.text=JSON.stringify(remote);
 a.edit(v=>v.data.works[0].title='First');let release,entered;const started=new Promise(resolve=>{entered=resolve;});
 shared.afterWrite=async()=>{entered();await new Promise(resolve=>{release=resolve;});};
 const pending=a.engine.sync();await started;a.engine.continueLocal();a.edit(v=>v.data.works[0].title='Second');release();await pending;
 assert.equal(a.engine.state.status,'paused');assert.equal(a.get().data.works.length,1);assert.equal(a.base().data.works[0].title,'First');
 delete shared.afterWrite;await a.engine.setEnabled(true);await a.engine.sync();assert.equal(a.engine.state.status,'saved');assert.equal(a.get().data.works[0].title,'Second');assert.equal(a.get().data.works.length,2);
});

test('reselecting the same notebook preserves deletions, baseline, cancellation and identity checks',async t=>{
 const shared={},a=device(t,shared,book([{id:'a',title:'Original'},{id:'deleted'}]));await a.engine.createShared();a.engine.continueLocal();
 a.edit(v=>{v.data.works.pop();v.data.sessions.push({id:'local'});});const beforeBase=clone(a.base()),before=clone(a.get()),id=a.engine.state.notebookId;
 a.adapter.pickBackup=async()=>({cancelled:true});await a.engine.relink();assert.equal(a.engine.state.status,'paused');assert.deepEqual(a.base(),beforeBase);
 a.adapter.pickBackup=async()=>({text:JSON.stringify({...JSON.parse(shared.text),cloudBackup:{sharedNotebookId:crypto.randomUUID()}})});await a.engine.relink();assert.equal(a.engine.state.status,'error');assert.deepEqual(a.get(),before);assert.deepEqual(a.base(),beforeBase);
 const remote=JSON.parse(shared.text);remote.data.sessions.push({id:'remote'});shared.text=JSON.stringify(remote);
 a.adapter.pickBackup=async options=>{assert.deepEqual(options,{link:true,expectedNotebookId:id,reconnect:true});return {text:shared.text,name:'reselected.json'};};
 await a.engine.relink();assert.equal(a.engine.state.status,'saved');assert.equal(a.engine.state.name,'reselected.json');assert.deepEqual(a.get().data.works,[{id:'a',title:'Original'}]);assert.equal(a.get().data.sessions.length,2);
});

test('a connected or paused notebook cannot be replaced through join, create or backup setup',async t=>{
 const shared={},a=device(t,shared,book([{id:'kept'}]));await a.engine.createShared();
 let picks=0,creates=0;a.adapter.pickBackup=async()=>{picks++;throw Error('Unexpected picker');};a.adapter.create=async()=>{creates++;throw Error('Unexpected create');};
 for(const paused of [false,true]){
  if(paused)a.engine.continueLocal();
  const before=clone(a.engine.state),base=clone(a.base()),local=clone(a.get()),remote=shared.text;
  for(const action of [()=>a.engine.joinShared(),()=>a.engine.createShared(),()=>a.engine.connect()])await assert.rejects(action,/Disconnect the current notebook/);
  assert.deepEqual(a.engine.state,before);assert.deepEqual(a.base(),base);assert.deepEqual(a.get(),local);assert.equal(shared.text,remote);
 }
 assert.equal(picks,0);assert.equal(creates,0);
 await a.engine.disconnect();a.adapter.pickBackup=async()=>{picks++;return {cancelled:true};};await a.engine.joinShared();assert.equal(picks,1);assert.equal(a.engine.state.name,'');assert.deepEqual(a.get().data.works,[{id:'kept'}]);
});

test('reviewed conflicting values remain valid after unrelated practice and diagnostic updates',async t=>{
 const shared={},a=device(t,shared,book([{id:'a',title:'Original',notes:''}])),b=device(t,shared,book());await a.engine.createShared();await b.engine.joinShared();
 a.edit(v=>v.data.works[0].title='Local');b.edit(v=>v.data.works[0].title='Cloud');await b.engine.sync();await a.engine.sync();assert.equal(a.engine.state.status,'conflict');
 a.edit(v=>{v.data.sessions.push({id:'independent-practice'});v.data.works[0].notes='New independent note';v.library={report:{checkedAt:'2026-10-17T11:00:00Z'}};});
 await a.engine.resolve('local');assert.equal(a.engine.state.status,'saved',a.engine.state.error);assert.equal(a.get().data.works[0].title,'Local');assert.equal(a.get().data.works[0].notes,'New independent note');assert.equal(a.get().data.sessions[0].id,'independent-practice');
});
test('legacy catalogue diagnostic conflicts are repaired without choosing between notebooks',async t=>{
 const shared={},a=device(t,shared,book([{id:'a',title:'Original'}]));await a.engine.createShared();const read=a.adapter.readLinked;let pending=true,writes=0;const write=a.adapter.write;
 a.adapter.readLinked=async()=>({...await read(),conflicts:pending?['/header/library/report/checkedAt']:[]});a.adapter.write=async args=>{writes++;await write(args);pending=false;};
 await a.engine.sync();assert.equal(a.engine.state.status,'saved',a.engine.state.error);assert.equal(writes,1);assert.equal(a.get().data.works[0].title,'Original');
});

test('returning to the app resumes exhausted transient retries but retains pauses and permission errors',async t=>{
 const shared={},a=device(t,shared,book([{id:'retained-work'}]),2);await a.engine.createShared();let reads=0;
 shared.beforeRead=()=>{reads++;throw Object.assign(Error('DNS temporarily unavailable'),{code:'PROVIDER_ERROR'});};
 for(let n=0;n<100&&a.engine.state.retryable!==false;n++)await new Promise(r=>setTimeout(r,5));
 await a.engine.sync();for(let n=0;n<100&&(a.engine.state.status!=='error'||a.engine.state.retryable);n++)await new Promise(r=>setTimeout(r,5));assert.equal(a.engine.state.retryable,false);assert.equal(a.engine.state.errorCode,'PROVIDER_ERROR');
 shared.beforeRead=null;await a.engine.resumeChecks();assert.equal(a.engine.state.status,'saved');assert.equal(a.get().data.works[0].id,'retained-work');
 shared.beforeRead=()=>{reads++;throw Object.assign(Error('Permission revoked'),{code:'PERMISSION_REQUIRED'});};await a.engine.sync();const attempts=reads;await a.engine.resumeChecks();assert.equal(reads,attempts);assert.equal(a.engine.state.errorCode,'PERMISSION_REQUIRED');
 a.engine.continueLocal();shared.beforeRead=null;await a.engine.resumeChecks();assert.equal(a.engine.state.status,'paused');assert.equal(a.engine.state.enabled,false);
});

test('showing an exact Drive QR does not adopt incoming data or trigger a reload',async t=>{
 const d=device(t,{},book([{id:'a'}]));await d.engine.createShared();
 d.adapter.info={fileId:'exact-drive-file'};
 d.adapter.readLinked=async()=>{throw Error('Showing a QR must not fetch or apply incoming history');};
 const link=await d.engine.deviceLink();assert.equal(link.fileId,'exact-drive-file');assert.ok(link.code.includes('exact-drive-file'));
});
