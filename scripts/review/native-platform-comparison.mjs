// Native comparison runner. Only use disposable simulators/emulators named in the run metadata.
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { todayFixtures } from './today-fixtures.mjs';
import { beginSession, block, validateData, VERSION } from '../../src/companion/model.js';
import { WARMUP_IDS } from '../../src/companion/warmups.js';
import { importLibrary, catalogueRecords, digest } from '../../src/companion/library.js';
import { processScore } from '../../src/companion/library-pipeline.js';
import { mxlFixture } from '../../tests/musicxml-fixture.js';
import { scorePDF } from '../../tests/pdf-fixture.js';

const folder = resolve(process.env.AUDIT_FOLDER || 'artifacts/platform-comparison/2026-10-11');
const adb = '/Users/migue/Library/Android/sdk/platform-tools/adb';
const targets = [
  { id: 'android-phone', platform: 'android', size: 'phone', serial: 'emulator-5580' },
  { id: 'android-tablet', platform: 'android', size: 'tablet', serial: 'emulator-5582' },
  { id: 'ios-phone', platform: 'ios', size: 'phone', serial: '4CED2D29-8CEE-430A-88CC-D5D2928373A6' },
  { id: 'ios-tablet', platform: 'ios', size: 'tablet', serial: '366CFB65-006B-4E60-8017-7747661A9371' },
].filter(t => !process.env.AUDIT_TARGETS || process.env.AUDIT_TARGETS.split(',').includes(t.id));
const delay = ms => new Promise(r => setTimeout(r, ms));
const sha = b => createHash('sha256').update(b).digest('hex');
const queues = new Map(), pending = new Map(), clients = new Set(); let seq = 0;
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/next') {
    const key = url.searchParams.get('device'); clients.add(key);
    const queue = queues.get(key) || [];
    res.setHeader('Content-Type', 'application/json');res.end(JSON.stringify(queue.shift() || {}));return;
  }
  if (url.pathname === '/result') {
    let body = '';for await (const b of req) body += b;
    const value = JSON.parse(body), p = pending.get(value.id);pending.delete(value.id);
    if (p) {clearTimeout(p.timer);value.error ? p.reject(Error(value.error)) : p.resolve(value.value);}
    res.end('ok');return;
  }
  res.writeHead(404).end();
});
server.listen(Number(process.env.AUDIT_PORT || 8767), '127.0.0.1');
function command(target, data) {
  return new Promise((resolve, reject) => {
    const id = ++seq, timer = setTimeout(() => { pending.delete(id);reject(Error('Native command timed out: '+target.id)); }, 45000);
    pending.set(id, {resolve,reject,timer});
    if (!queues.has(target.id)) queues.set(target.id, []);
    queues.get(target.id).push({id,...data});
  });
}
async function android(target) {
  const pid = execFileSync(adb, ['-s', target.serial, 'shell','pidof','com.miguecoll.spino.test'], {encoding:'utf8'}).trim();
  const port = execFileSync(adb, ['-s',target.serial,'forward','tcp:0',`localabstract:webview_devtools_remote_${pid}`],{encoding:'utf8'}).trim();
  let pages;for(let attempt=0;attempt<60;attempt++){try{pages=await(await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(1500)})).json();if(pages.some(p=>p.type==='page'))break;}catch{}await delay(250);}if(!pages?.some(p=>p.type==='page'))throw Error('Android WebView inspection endpoint did not become ready');
  const socket = new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let seq=0;const pending=new Map();
  socket.onmessage=({data})=>{const m=JSON.parse(data);if(!m.id)return;const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);};
  const call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++seq,{resolve,reject});socket.send(JSON.stringify({id:seq,method,params}));});
  await call('Page.enable');await call('Runtime.enable');
  await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.__auditBootToken=sessionStorage.getItem('auditGeneration');window.__auditErrors=[];window.addEventListener('error',e=>__auditErrors.push(e.message));window.addEventListener('unhandledrejection',e=>__auditErrors.push(String(e.reason)));const AuditDate=Date;window.Date=class extends AuditDate{constructor(...args){super(...(args.length?args:['2026-10-01T10:00:00Z']))}static now(){return 1790848800000}};let auditSeed=123456;Math.random=()=>((auditSeed=(auditSeed*1664525+1013904223)>>>0)/4294967296);`});
  target.evaluate = async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,timeout:40000});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  target.reload=()=>call('Page.reload');
  target.close=()=>socket.close();
}
const fixtures = todayFixtures();
fixtures.typical.works[0].assetId = 'audit-pdf';
for (const name of ['pending']) fixtures[name].works[0].assetId = 'audit-pdf';
for (const [name,type,context,input] of [['reading','reading','mobile','piano'],['names','reading','mobile','names'],['technique','technique','mobile','piano'],['piano','reading','piano','none'],['midi','reading','midi','none'],['free','free','piano','none'],['repertoire','repertoire','piano','none'],['warmup','warmup','piano','none'],['theory','theory','mobile','piano']]) {
  const d=structuredClone(fixtures.typical);
  d.active=beginSession({title:'Synthetic comparison session',context,blocks:[block(type,{id:'audit-block',minutes:15,target:type==='warmup'?WARMUP_IDS[0]:'G-major',hand:context==='piano'&&['reading','technique','warmup'].includes(type)?'both':'right',input:input==='none'?'piano':input,timing:'wait',workId:type==='repertoire'?'review-work':''})]},Date.parse('2026-10-01T10:00:00Z'));
  d.active.id='audit-session';d.active.date='2026-10-01';d.active.elapsedMs=d.active.blockElapsedMs=120000;fixtures[name]=validateData(d);
}
const snapshots=await readFile(resolve('artifacts/platform-comparison/2026-10-11-native-01/reader-snapshots.json'),'utf8').then(JSON.parse).catch(()=>({}));
for(const [name,snapshot] of Object.entries(snapshots))if(fixtures[name]?.active)fixtures[name].active.readerSnapshot=snapshot;
const asset={id:'audit-pdf',name:'Synthetic score.pdf',type:'application/pdf',format:'pdf',base64:scorePDF()};
const a=(name,id)=>`[data-action="${name}"]${id?`[data-id="${id}"]`:''}`;
const js=script=>({script});
const cases=[];
const add=(id,surface,title,steps=[],fixture='typical',ready)=>cases.push({id,surface,title,steps,fixture,ready});
add('today-empty','TODAY-01','Today empty',[],'empty');
add('today','TODAY-01 TODAY-02 TODAY-05','Today populated');
add('today-pending','TODAY-03','Pending session',[],'pending');
add('practice','HUB-01','Practice chooser',[a('practice')]);
add('calendar-week','CAL-01','Week calendar',[a('calendar')]);
add('calendar-month','CAL-02','Month calendar',[a('calendar'),a('calendar-mode','month')]);
add('calendar-add','CAL-03','Add on day',[a('calendar'),a('add-on-day')]);
add('weekly-planner','CAL-04','Weekly planner',[a('calendar'),a('weekly-planner')]);
add('planned-detail','CAL-05','Planned practice detail',[a('calendar'),a('plan-detail','review-next')]);
add('planned-edit','PREP-03','Edit planned practice',[a('calendar'),a('plan-detail','review-next'),a('edit-plan','review-next')]);
add('planned-date','CAL-05','Reschedule planned practice',[a('calendar'),a('plan-detail','review-next'),a('reschedule-plan','review-next')]);
add('planned-delete','CAL-05','Delete planned practice confirmation',[a('calendar'),a('plan-detail','review-next'),a('delete-plan','review-next')]);
add('event-new','CAL-06','New event form',[a('new-event')]);
add('event-detail','CAL-07','Event detail',[a('event-detail','review-audition')]);
add('event-edit','CAL-06','Edit event form',[a('event-detail','review-audition'),a('edit-event','review-audition')]);
add('event-delete','CAL-07','Delete event confirmation',[a('event-detail','review-audition'),a('delete-event','review-audition')]);
add('manual-log','CAL-09','Log completed practice',[a('calendar'),a('add-on-day'),a('manual-session')]);
for(const type of ['reading','technique','repertoire','free']) add('prepare-'+type,'PREP-01','Prepare '+type,[a('practice'),a('prepare',type)]);
add('prepare-more','PREP-02','Practice organization',[a('practice'),a('prepare','reading'),a('prepare-more')]);
add('prepare-schedule','PREP-03','Schedule practice form',[a('practice'),a('prepare','reading'),a('prepare-more'),a('schedule-draft')]);
add('prepare-name','PREP-02','Save practice as routine',[a('practice'),a('prepare','reading'),a('prepare-more'),a('save-routine')]);
add('routines','PIANO-04','Routines list',[a('practice'),a('routines')]);
add('routine-new','PREP-02','New routine editor',[a('practice'),a('routines'),a('new-routine')]);
add('routine-add','PREP-02','Routine activity picker',[a('practice'),a('routines'),a('new-routine'),a('routine-add')]);
add('routine-block','PREP-02','Routine block form',[a('practice'),a('routines'),a('new-routine'),a('routine-add'),a('routine-add-type','reading')]);
add('routine-edit','PIANO-04','Edit saved routine',[a('practice'),a('routines'),a('edit-routine','review-routine')]);
add('routine-delete','PIANO-04','Delete routine confirmation',[a('practice'),a('routines'),a('delete-routine','review-routine')]);
add('routine-cancel','PREP-02','Discard routine draft',[a('practice'),a('routines'),a('new-routine'),a('routine-cancel')]);
add('session','PRACTICE-01','Session overview',[a('resume-session')],'reading');
add('session-add','PRACTICE-08','Add session block',[a('resume-session'),a('session-add-block')],'reading');
add('session-edit','PRACTICE-09','Edit session block',[a('resume-session'),a('session-block-edit','audit-block')],'reading');
add('session-feedback','PRACTICE-06','Finish session feedback',[a('resume-session'),a('session-end')],'reading');
add('session-discard','PRACTICE-06','Discard pending session',[a('resume-session'),a('discard-session')],'reading');
add('midi-disconnected','PRACTICE-04 MIDI-02','MIDI session without instrument',[a('resume-session')],'midi');
for (const type of ['reading','names','technique','piano']) {
  const path=[a('resume-session'),a('open-reader'),js(`document.querySelector('#start')?.click()` )];
  add('reader-'+type,type==='names'?'PRACTICE-03':type==='piano'?'PRACTICE-04':'PRACTICE-02','Generated '+type,path,type,'#reader-view:not([hidden])');
  add('reader-'+type+'-settings','READER-01','Practice settings '+type,[...path,'#open-settings'],type,'#settings[open]');
}
add('warmup-guide','READER-05','Warm-up guide',[a('resume-session'),a('warmup-guide')],'warmup');
add('free-practice','PRACTICE-05','Free practice and metronome',[a('resume-session'),a('open-free-practice'),a('toggle-session')],'free');
add('repertoire-session','PRACTICE-05','Repertoire session',[a('resume-session')],'repertoire');
add('repertoire-change','PRACTICE-05','Change piece',[a('resume-session'),a('session-change-work')],'repertoire');
add('quick-practice','PRACTICE-02','Quick practice game',[a('practice'),a('quick-practice'),js(`document.querySelector('#start')?.click()`)],'empty','#reader-view:not([hidden])');
add('quick-exit','PRACTICE-06','Quick-practice exit choice',[a('practice'),a('quick-practice'),'#practice-return'],'empty','#cp-dialog[open]');
add('quick-result','PRACTICE-06','Quick-practice result',[a('practice'),a('quick-practice'),'#practice-return',a('quick-finish')],'empty','#cp-dialog[open]');
add('library','PIANO-01 REP-01','Library / Repertoire',[a('piano')]);
add('work-detail','REP-02','Work detail',[a('piano'),a('work-detail','review-work')]);
add('work-new','REP-03','New work form',[a('piano'),a('new-work')]);
add('work-details','REP-03','New work study details',[a('piano'),a('new-work'),js(`document.querySelectorAll('#cp-dialog details').forEach(d=>d.open=true)`) ]);
add('work-edit','REP-03','Edit work',[a('piano'),a('work-detail','review-work'),a('edit-work','review-work')]);
add('work-delete','REP-02','Trash work confirmation',[a('piano'),a('work-detail','review-work'),a('delete-work','review-work')]);
add('pdf-remove','REP-04','Remove PDF confirmation',[a('settings'),a('profile-files'),a('profile-file','audit-pdf'),a('profile-file-remove','review-work')]);
add('catalogue','CAT-01','Catalogue MusicXML',[a('piano'),a('catalog')]);
add('catalogue-filters','CAT-01 CAT-05','Catalogue expanded filters',[a('piano'),a('catalog'),js(`document.querySelectorAll('#app-shell details').forEach(d=>d.open=true)`) ]);
add('catalogue-pdf','CAT-02','Catalogue PDF',[a('piano'),a('catalog'),a('library-pdfs')]);
add('catalogue-research','CAT-03','Catalogue research',[a('piano'),a('catalog'),a('library-research')]);
add('catalogue-reference','CAT-04','Unavailable catalogue detail',[a('piano'),a('catalog'),a('library-research'),a('library-detail','czerny_op821_001')]);
add('catalogue-attach','CAT-08','Attach local edition',[a('piano'),a('catalog'),a('library-research'),a('library-detail','czerny_op821_001'),a('library-attach','czerny_op821_001')]);
add('downloads','CAT-10','Download jobs',[a('settings'),a('profile-files'),a('downloads')]);
add('progress','PIANO-02','Progress',[a('progress')]);
add('session-history','PIANO-03','Saved session detail',[a('progress'),a('session-detail','review-today-result')]);
add('history-feedback','PIANO-03','Edit saved feedback',[a('progress'),a('session-detail','review-today-result'),a('edit-session-notes','review-today-result')]);
add('history-delete','PIANO-03','Delete saved session',[a('progress'),a('session-detail','review-today-result'),a('delete-session','review-today-result')]);
add('profile','PROFILE-01','Profile',[a('settings')]);
add('profile-edit','PROFILE-02','Edit profile form',[a('settings'),a('profile-edit')]);
add('profile-photo','PROFILE-02','Choose profile photo',[a('settings'),a('profile-photo')]);
add('practice-defaults','PROFILE-03','Practice defaults',[a('settings'),a('profile-practice')]);
add('local-scores','PROFILE-04','Saved scores',[a('settings'),a('profile-files')]);
add('local-file','PROFILE-04','Local score detail',[a('settings'),a('profile-files'),a('profile-file','audit-pdf')]);
add('reminders','PROFILE-05','Reminders',[a('settings'),a('profile-reminders')]);
add('local-data','PROFILE-06','Local data dialog',[a('settings'),a('profile-data')]);
add('erase-confirm','PROFILE-06','Erase notebook confirmation only',[a('settings'),a('profile-data'),a('erase-data')]);
add('about','PROFILE-01','Credits and version',[a('settings'),a('about')]);
add('release-notes','PROFILE-01','Release notes expanded',[a('settings'),a('about'),js(`document.querySelectorAll('#cp-dialog details').forEach(d=>d.open=true)`) ]);
add('backup','CLOUD-01 CLOUD-05','Backup and sync',[a('settings'),a('profile-backup')]);
add('backup-connect','CLOUD-02','Connect backup form',[a('settings'),a('profile-backup'),a('cloud-setup')]);
add('backup-help','CLOUD-06','Backup help',[a('settings'),a('profile-backup'),a('cloud-help')]);
add('instrument','MIDI-01 MIDI-02','Instrument and pedals',[a('midi-settings')]);
for(const tab of ['practice','levels','exercise','general'])add('legacy-settings-'+tab,'READER-01 READER-02 READER-03 READER-04','Retained reader '+tab,[js(`location.hash='reader';location.reload();true`),js(`document.querySelector('#open-settings').click()`),`[data-tab="${tab}"]`],'empty');
for(const [name,steps,surface] of [
  ['viewer',[],'SCORE-01 SCORE-03'],['tools',['[data-pdf=tools]'],'SCORE-03'],
  ['annotations',['[data-pdf=tools]','[data-pdf=annotations]'],'SCORE-04'],
  ['framing',['[data-pdf=tools]','[data-pdf=view]'],'SCORE-05'],
  ['split',['[data-pdf=tools]','[data-pdf=view]','[data-pdf=split]'],'SCORE-05'],
  ['page-two',['[data-pdf=next]'],'SCORE-01']
])add('pdf-'+name,surface,'PDF '+name,[a('piano'),a('work-detail','review-work'),a('open-pdf','review-work'),...steps],'typical','.pdf-paper[aria-busy=false]');

const xmlId='mt_eb69b7b3cfc165d7';
const xmlRaw=mxlFixture(),xmlBytes=Buffer.from(xmlRaw).toString('base64');
const baseLibrary=await importLibrary({read:path=>readFile(resolve('public/repertoire',path),'utf8')});
const xmlLibrary=structuredClone(baseLibrary);
const xmlRecord=catalogueRecords(xmlLibrary).find(r=>r.piece_id===xmlId),xmlDescriptor=xmlRecord.assets[0];
const xmlSHA=await digest(xmlRaw),xmlAsset={id:'audit-xml',name:'Synthetic piano selection.mxl',format:'mxl',type:'application/vnd.recordare.musicxml',pieceId:xmlId,sourceAssetId:xmlDescriptor.asset_id,base64:xmlBytes,sha256:xmlSHA,origin:xmlDescriptor};
const xmlProcessed=await processScore(xmlAsset,xmlRecord,{includeSegments:true});
xmlLibrary.executions[xmlId]={...xmlProcessed,assetId:xmlAsset.id,sourceAssetId:xmlAsset.sourceAssetId,sha256:xmlSHA,job:{status:'complete',loaded:xmlRaw.length,total:xmlRaw.length,error:''}};
const xmlSetup=[a('piano'),a('catalog'),a('library-detail',xmlId),js(`document.querySelectorAll('.cp-library-maintenance').forEach(e=>e.open=true)` )];
add('xml-downloaded','CAT-04','Downloaded synthetic MusicXML',xmlSetup);
add('xml-parts','CAT-06','Piano parts and hand assignments',[...xmlSetup,a('library-parts',xmlId),js(`document.querySelectorAll('#cp-dialog details').forEach(e=>e.open=true)`)]);
add('xml-suitability','CAT-07','Suitability review form',[...xmlSetup,a('library-suitability',xmlId)]);
add('xml-rights','CAT-07','Edition rights review form',[...xmlSetup,a('library-rights',xmlId)]);
add('xml-preview','SCORE-01 SCORE-02','Synthetic MusicXML full score',[...xmlSetup,a('library-preview',xmlId)],'xml','.xml-score svg');
add('xml-excerpt','CAT-09','Excerpt boundary review',[...xmlSetup,a('library-segment')],'xml');
add('xml-excerpt-preview','CAT-09','Excerpt preview',[...xmlSetup,a('library-segment'),a('library-segment-preview')],'xml','.xml-score svg');
add('xml-prepare','PREP-04','Prepare catalogue score',[...xmlSetup,a('library-practice',xmlId)]);
add('legacy-reader','READER-06','Direct reader',[js(`location.hash='reader';location.reload();true`)],'empty');

for(const c of cases.filter(c=>c.id.startsWith('xml-')))c.fixture='xml';
fixtures.xml=structuredClone(fixtures.typical);
for(const id of ['event-new','work-new','profile-edit','manual-log','planned-date','prepare-name']){
 const original=cases.find(c=>c.id===id);
 add(id+'-keyboard-dismissed',original.surface,original.title+' (keyboard dismissed)',[...original.steps,js(`document.activeElement?.blur();await new Promise(r=>setTimeout(r,500))`)],original.fixture,original.ready);
}

const remoteData=structuredClone(fixtures.typical);remoteData.preferences.name='Remote synthetic profile';remoteData.works[0].notes='Remote synthetic edit';
const remoteBackup=JSON.stringify({format:'cuaderno-piano',version:VERSION,exportedAt:'2026-10-01T10:00:00Z',data:remoteData,assets:[asset],legacy:{}});
const mockProvider=js(`window.auditNativePromise=Capacitor.nativePromise.bind(Capacitor);Capacitor.nativePromise=(plugin,method,options)=>plugin==='CloudBackup'?Promise.resolve(['pickBackup','readLinked'].includes(method)?{text:${JSON.stringify(remoteBackup)},name:'Synthetic shared notebook.json',linked:true,lastHash:'synthetic'}:method==='create'?{name:'Synthetic shared notebook.json',linked:true,cancelled:false}:{linked:true,name:'Synthetic shared notebook.json'}):auditNativePromise(plugin,method,options)`);
const backupMockSteps=[a('settings'),a('profile-backup'),mockProvider];
const awaitManage=js(`await new Promise((ok,no)=>{let n=0;const t=setInterval(()=>{if(document.querySelector('[data-action=cloud-manage]')){clearInterval(t);ok()}else if(++n>100){clearInterval(t);no(Error('Mock provider did not connect'))}},100)})`);
add('backup-manage-mock','CLOUD-03','Manage connection (offline mock provider)',[...backupMockSteps,a('cloud-setup'),a('cloud-connect'),awaitManage,a('cloud-manage')]);
add('backup-disconnect-mock','CLOUD-03','Disconnect confirmation (offline mock provider)',[...backupMockSteps,a('cloud-setup'),a('cloud-connect'),awaitManage,a('cloud-manage'),a('cloud-disconnect')]);
add('backup-conflicts-mock','CLOUD-04','Review conflicts (offline mock provider)',[...backupMockSteps,a('cloud-setup'),a('cloud-join-shared'),awaitManage,a('cloud-manage'),a('cloud-conflicts')]);
add('backup-restore-mock','CLOUD-05','Restore review (offline mock provider)',[...backupMockSteps,js(`document.querySelector('[data-action=cloud-restore],[data-action=import-backup]').click();await new Promise(r=>setTimeout(r,500))`)]);
add('reader-scale','READER-05','Generated scale guide',[a('resume-session'),a('open-reader'),'#key-scale'],'reading','#scale-dialog[open]');

add('archived-learning','PRACTICE-07','Retained archived learning block',[a('resume-session')],'theory');
add('legacy-custom-exercise','READER-02','Custom exercise editor',[js(`location.hash='reader';location.reload();true`),'#open-settings','[data-tab="levels"]','#tpl-customize'],'empty');
for(const id of ['session-edit','routine-block']){const original=cases.find(c=>c.id===id);add(id+'-expanded',original.surface,original.title+' expanded',[...original.steps,js(`document.querySelectorAll('#cp-dialog details').forEach(e=>e.open=true)`)],original.fixture);}
add('repertoire-timer-options','PRACTICE-05 TODAY-04','Manual timer background options',[a('resume-session'),js(`document.querySelectorAll('.cp-session-timer-options').forEach(e=>e.open=true)`)],'repertoire');

add('weekly-planner-series','CAL-04 CAL-08','Weekly series with tutor form',[a('calendar'),a('weekly-planner'),js(`const f=document.querySelector('#weekly-plan-form');f.elements.weeks.value='4';f.elements.tutor.checked=true;f.elements.tutor.dispatchEvent(new Event('change',{bubbles:true}))`)]);
add('xml-options','SCORE-02 SCORE-03','MusicXML options and fingering',[...xmlSetup,a('library-preview',xmlId),'[data-xml=options]'],'xml','.xml-score svg');
const textDialogStep=js(`await new Promise((ok,no)=>{let n=0;const t=setInterval(()=>{if(document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'){clearInterval(t);ok()}else if(document.querySelector('#cp-toast')?.textContent.includes('withResolvers')||++n>100){clearInterval(t);no(Error('PDF text editor blocked by viewer readiness'))}},100)});document.querySelector('[data-pdf=tools]').click();document.querySelector('[data-pdf=annotations]').click();document.querySelector('[data-tool=text]').click();const v=document.querySelector('.pdf-viewport'),c=document.querySelector('.pdf-paper canvas'),r=c.getBoundingClientRect();v.setPointerCapture=()=>{};for(const type of ['pointerdown','pointerup'])c.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:42,pointerType:'touch',isPrimary:true,button:0,clientX:r.x+r.width*.5,clientY:r.y+r.height*.5}));`);
add('pdf-text','SCORE-04','Text annotation form (synthetic pointer entry)',[a('piano'),a('work-detail','review-work'),a('open-pdf','review-work'),textDialogStep],'typical','.pdf-text-dialog[open]');

const compatibilityScript=js(`if(!Promise.withResolvers){const shim="Promise.withResolvers=function(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};";eval(shim);const NativeWorker=Worker;window.Worker=class extends NativeWorker{constructor(url,options){if(String(url).includes('pdf.worker')){super(URL.createObjectURL(new Blob([shim+'import('+JSON.stringify(String(url))+');'],{type:'text/javascript'})),{...options,type:'module'})}else super(url,options)}};window.__auditCompatibility='Promise.withResolvers shim in main page and PDF worker';}`);
for(const original of cases.filter(c=>c.id.startsWith('pdf-')&&c.ready))add(original.id+'-compat',original.surface,original.title+' (temporary old-WebView compatibility shim)',[compatibilityScript,...original.steps],original.fixture,original.ready);

fixtures['download-any']=structuredClone(fixtures.typical);fixtures['download-any'].preferences.wifiOnly=false;
const mockTransfer=js(`const original=Capacitor.nativePromise.bind(Capacitor);Capacitor.nativePromise=(plugin,method,options)=>plugin==='Notebook'&&method==='downloadScore'?Promise.resolve({complete:true,base64:${JSON.stringify(xmlBytes)},httpStatus:200}):original(plugin,method,options);const originalFetch=fetch;window.fetch=(url,options)=>String(url).startsWith('https://raw.githubusercontent.com/')?Promise.resolve(new Response(Uint8Array.from(atob(${JSON.stringify(xmlBytes)}),c=>c.charCodeAt(0)),{headers:{'Content-Type':'application/octet-stream'}})):originalFetch(url,options)`);
const transferSteps=[a('piano'),a('catalog'),a('library-detail',xmlId),mockTransfer,a('library-download',xmlId),js(`await new Promise(r=>setTimeout(r,1800))`)];
add('download-wifi-only','CAT-04 CAT-10 SYSTEM-04','Wi-Fi-only download (synthetic transport)',transferSteps);
add('download-other-networks','CAT-04 CAT-10 SYSTEM-04','Download allowing other networks (synthetic transport)',transferSteps,'download-any');

add('native-backup-create-picker','CLOUD-02','Native create backup picker (cancelled)',[a('settings'),a('profile-backup'),a('cloud-setup'),a('cloud-connect'),js(`await new Promise(r=>setTimeout(r,1000))`)]);
add('native-backup-open-picker','CLOUD-02 CLOUD-05','Native open backup picker (cancelled)',[a('settings'),a('profile-backup'),a('cloud-setup'),a('cloud-join-shared'),js(`await new Promise(r=>setTimeout(r,1000))`)]);

const selected=cases.filter(c=>!process.env.AUDIT_CASES||new RegExp(process.env.AUDIT_CASES).test(c.id));
await mkdir(folder,{recursive:true});await writeFile(join(folder,'scenarios.json'),JSON.stringify(cases,null,2));await writeFile(join(folder,'fixtures.json'),JSON.stringify({fixtures,asset,xmlAsset,xmlLibrary},null,2));
const wait = async (t, condition, timeout=20000) => {
  const start=Date.now();while(Date.now()-start<timeout){let state;try{state=await t.evaluate(`({ready:!!(${condition}),error:document.querySelector('.pdf-paper[aria-busy=true]')&&document.querySelector('#cp-toast')?.textContent.includes('withResolvers')?document.querySelector('#cp-toast').textContent:null})`)}catch{}if(state?.error)throw Error(state.error);if(state?.ready)return;await delay(100);}throw Error('Missing/timeout: '+condition);
};
async function reset(t,c) {
  t.nativeState=null;
  if(t.platform==='ios'){await t.evaluate(`(async()=>{if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});return true})()`);await command(t,{dismiss:true});}
  if(t.platform==='android'&&t.nativePickerOpen){execFileSync(adb,['-s',t.serial,'shell','input','keyevent','4']);t.nativePickerOpen=false;}
  if(t.platform==='android')await t.evaluate(`window.Capacitor.nativePromise('Notebook','scoreFullscreen',{enabled:false})`);
  const token=String(Date.now())+String(Math.random());
  await t.evaluate(`(async()=>{const r=indexedDB.open('cuaderno-piano',1);const db=await new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});await new Promise((ok,no)=>{const tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${JSON.stringify(fixtures[c.fixture])},'current');tx.objectStore('assets').clear();tx.objectStore('assets').put(${JSON.stringify(asset)});tx.objectStore('state').put(${JSON.stringify(baseLibrary)},'repertoire-library-v2');tx.objectStore('state').delete('cloud-sync-base-v1');${c.fixture==='xml'?`tx.objectStore('assets').put(${JSON.stringify(xmlAsset)});tx.objectStore('state').put(${JSON.stringify(xmlLibrary)},'repertoire-library-v2');`:''}tx.oncomplete=ok;tx.onerror=()=>no(tx.error)});db.close();for(const key of ['sr.settings','sr.templates','sr.progress','sr.stats','sr.startedL1'])localStorage.removeItem(key);localStorage.removeItem('spino.cloud-backup.device.v1');localStorage.removeItem('spino.cloud-sync.device.v1');sessionStorage.setItem('auditGeneration',${JSON.stringify(token)});location.hash='';return true;})()`);
  await t.reload();await delay(200);await wait(t,`window.__auditBootToken===${JSON.stringify(token)}&&document.querySelector('.cp-page')&&document.querySelector('#app-shell h1')`,25000);
}
async function step(t,s) {
  if(typeof s!=='string' && s.script.includes('location.reload()')){await t.evaluate("(()=>{location.hash='reader';return true})()");await t.reload();await wait(t,"document.querySelector('#reader-view:not([hidden])')");return;}
  if(typeof s==='string'&&s==='[data-pdf=next]')await wait(t,`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'&&document.querySelector('[data-pdf=next]')?.disabled===false`);
  if(typeof s!=='string'){await t.evaluate(`(async()=>{${s.script};return true})()`);await delay(220);return;}
  await t.evaluate(`(async()=>{const selector=${JSON.stringify(s)};let e;for(let n=0;n<140;n++){e=document.querySelector(selector);if(e)break;await new Promise(r=>setTimeout(r,25))}if(!e)throw Error('Missing: '+selector);if(e.disabled)throw Error('Disabled: '+selector);e.click();await new Promise(r=>setTimeout(r,150));return true})()`);

}
const measure=`(()=>{const visible=e=>e.getClientRects().length&&!e.closest('[hidden]'),box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}},els=[...document.querySelectorAll('button,input,select,textarea,summary')].filter(visible),dialog=document.querySelector('dialog[open]'),scope=dialog||document.querySelector('#reader-view:not([hidden])')||document.querySelector('#app-shell');const canvas=document.querySelector('.pdf-paper canvas');let pdfCanvas=null;if(canvas){try{const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let dark=0,samples=0;for(let i=0;i<pixels.length;i+=128){samples++;if(pixels[i+3]>100&&(pixels[i]<225||pixels[i+1]<225||pixels[i+2]<225))dark++}pdfCanvas={width:canvas.width,height:canvas.height,darkSamples:dark,samples,busy:document.querySelector('.pdf-paper')?.getAttribute('aria-busy')}}catch(e){pdfCanvas={error:String(e)}}}const controls=els.filter(e=>scope?.contains(e)).map(e=>({tag:e.tagName,action:e.dataset.action||e.dataset.pdf||e.id||e.name,label:e.getAttribute('aria-label')||e.textContent.trim().slice(0,100)||e.name,type:e.type,value:e.tagName==='SELECT'?e.value:undefined,disabled:e.disabled,...box(e)}));const marker=document.createElement('div');marker.style='padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);position:fixed';document.body.append(marker);const style=getComputedStyle(marker),safe=[style.paddingTop,style.paddingRight,style.paddingBottom,style.paddingLeft];marker.remove();return{focus:{tag:document.activeElement?.tagName,id:document.activeElement?.id},scrollContainers:[...document.querySelectorAll('dialog[open],dialog[open] *, .cp-page')].filter(e=>e.getClientRects().length&&['auto','scroll'].includes(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+4).map(e=>({tag:e.tagName,id:e.id,class:e.className,top:e.scrollTop,max:e.scrollHeight-e.clientHeight})),visibility:document.visibilityState,pdfCanvas,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,visualHeight:visualViewport?.height,visualTop:visualViewport?.offsetTop},safeArea:safe,title:dialog?.querySelector('h1,h2')?.textContent||document.querySelector('#app-shell h1')?.textContent,view:document.querySelector('.cp-page')?.dataset.view,text:scope?.innerText.slice(0,16000),controls,nav:[...document.querySelectorAll('.cp-nav button')].filter(visible).map(e=>({action:e.dataset.action,label:e.getAttribute('aria-label')||e.textContent.trim(),...box(e)})),toast:document.querySelector('#cp-toast')?.textContent, horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2,errors:window.__auditErrors||[],native:window.Capacitor?.isNativePlatform(),readerSnapshot:window.__sr?.line?{line:window.__sr.line,settings:window.__sr.settings,beat:0}:null,compatibility:window.__auditCompatibility||null,capabilities:{promiseWithResolvers:typeof Promise.withResolvers,fullscreen:document.fullscreenEnabled},plugins:['Notebook','CloudBackup','ScorePrinter','SystemBars'].map(p=>({name:p,available:window.Capacitor?.isPluginAvailable(p)}))};})()`;
async function screenshot(t,file) {
  let bytes;
  if(t.platform==='android') bytes=execFileSync(adb,['-s',t.serial,'exec-out','screencap','-p'],{maxBuffer:20e6});
  else {execFileSync('xcrun',['simctl','io',t.serial,'screenshot',file],{stdio:['ignore','pipe','pipe']});bytes=await readFile(file);}
  if(bytes.length<1000)throw Error('Empty native screenshot');
  await writeFile(file,bytes);return sha(bytes);
}
async function capture(t,c,orientation) {
  if(c.id.startsWith('native-'))t.nativePickerOpen=true;
  if(!c.id.startsWith('native-'))await t.evaluate(`(async()=>{await document.fonts.ready;document.querySelector('#cp-toast')?.setAttribute('hidden','');await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return true})()`);
  const metrics=await t.evaluate(measure),frames=[];if(t.nativeState)metrics.nativePresentation=t.nativeState;
  const dir=join(folder,t.id,orientation);await mkdir(dir,{recursive:true});
  const save=async(index,scroll,state='Scrolled content')=>{const path=`${t.id}/${orientation}/${c.id}-${String(index).padStart(2,'0')}.png`;frames.push({path,scroll,state,sha256:await screenshot(t,join(folder,path))});};
  await save(1,0,'Initial focus state');
  if(c.id.startsWith('native-')){t.nativePickerOpen=true;return {case:c.id,surface:c.surface,title:c.title,orientation,target:t.id,status:'captured',metrics,frames,nativePicker:true};}
  const scrollable=await t.evaluate(`(()=>{const candidates=[...document.querySelectorAll('dialog[open],dialog[open] *,#settings[open] *, .cp-page')].filter(e=>{const s=getComputedStyle(e);return e.getClientRects().length&&['auto','scroll'].includes(s.overflowY)&&e.scrollHeight>e.clientHeight+4});const e=candidates.sort((a,b)=>(b.scrollHeight-b.clientHeight)-(a.scrollHeight-a.clientHeight))[0];if(!e)return null;e.dataset.auditScroll='true';return{height:e.clientHeight,max:e.scrollHeight-e.clientHeight,top:e.scrollTop};})()`);
  frames[0].scroll=scrollable?.top||0;
  const scan=async(state)=>{if(!scrollable)return;let at=0,index=frames.length+1;const limit=frames.length+10;while(at<scrollable.max&&index<=limit){at=Math.min(scrollable.max,at+Math.max(150,scrollable.height*.8));await t.evaluate(`(()=>{document.querySelector('[data-audit-scroll=true]').scrollTop=${at};return true})()`);await delay(80);await save(index++,at,state);}if(at<scrollable.max){await t.evaluate(`(()=>{document.querySelector('[data-audit-scroll=true]').scrollTop=${scrollable.max};return true})()`);await delay(80);await save(frames.length+1,scrollable.max,state);}};
  if(scrollable?.top>2){await t.evaluate(`(()=>{document.querySelector('[data-audit-scroll=true]').scrollTop=0;return true})()`);await delay(80);await save(frames.length+1,0,'Top of content');}
  await scan('Scrolled content');
  if(t.platform==='ios'&&await t.evaluate(`!!document.querySelector('dialog[open]')&&(visualViewport.height<innerHeight-100||document.activeElement?.tagName==='SELECT')`)){
    await t.evaluate(`(async()=>{document.activeElement?.blur();await new Promise(r=>setTimeout(r,400));const e=document.querySelector('[data-audit-scroll=true]');if(e)e.scrollTop=0;return true})()`);
    await save(frames.length+1,0,'Keyboard / selector dismissed');await scan('Keyboard / selector dismissed, scrolled');
  }

  return {case:c.id,surface:c.surface,title:c.title,orientation,target:t.id,status:'captured',metrics,frames};
}
async function run(t) {
  if(t.platform==='android'){const name=execFileSync(adb,['-s',t.serial,'emu','avd','name'],{encoding:'utf8'}).split('\n')[0].trim();if(name!==(t.size==='phone'?'AuditPhone':'AuditTablet'))throw Error('Refusing to seed a non-audit AVD: '+name);}
  else{const devices=JSON.parse(execFileSync('xcrun',['simctl','list','devices','--json'],{encoding:'utf8'})).devices;const device=Object.values(devices).flat().find(d=>d.udid===t.serial);if(!device?.name.startsWith('SPino Audit '))throw Error('Refusing to seed a non-audit iOS simulator');}
  if(t.platform==='android')await android(t);else{t.evaluate=script=>command(t,{script});t.reload=()=>command(t,{reload:true});while(!clients.has(t.id))await delay(200);}
  if(process.env.AUDIT_PROBE){console.log(JSON.stringify(await t.evaluate(process.env.AUDIT_PROBE)));t.close?.();return [];}
  await wait(t,"document.querySelector('#app-shell h1')",45000);
  const results=[];const resultPath=join(folder,t.id+'-results.json');
  for(const orientation of (process.env.AUDIT_ORIENTATIONS||'portrait,landscape').split(',')) {
    if(t.nativePickerOpen){if(t.platform==='android')execFileSync(adb,['-s',t.serial,'shell','input','keyevent','4']);else await command(t,{dismiss:true});t.nativePickerOpen=false;await delay(350);}
    if(t.platform==='android'){execFileSync(adb,['-s',t.serial,'shell','settings','put','system','accelerometer_rotation','0']);execFileSync(adb,['-s',t.serial,'shell','settings','put','system','user_rotation',orientation==='portrait'?'0':'1']);await delay(800);}else await command(t,{orientation});
    const viewport = await t.evaluate('({width:innerWidth,height:innerHeight})');
    if ((viewport.width > viewport.height) !== (orientation === 'landscape')) throw Error('Native orientation did not take effect: '+t.id+' '+orientation+' '+JSON.stringify(viewport));
    for(const c of selected){
      const existing=await readFile(resultPath,'utf8').then(JSON.parse).catch(()=>[]);
      if(process.env.AUDIT_RESUME&&existing.some(r=>r.case===c.id&&r.orientation===orientation&&r.status==='captured'&&r.frames?.every(f=>f.sha256!=='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')) )continue;
      let row;try{await reset(t,c);for(const s of c.steps)await step(t,s);if(c.id.startsWith('native-')&&t.platform==='ios'){let state;for(let n=0;n<60;n++){state=await command(t,{nativeState:true});if(state?.presented?.includes('DocumentPicker')&&!state.presenting)break;await delay(250)}t.nativeState=state;if(!state?.presented?.includes('DocumentPicker'))throw Error('Native document picker did not become visible');await delay(350);}
      if(c.id.startsWith('native-'))await delay(3500);
      if(c.ready)await wait(t,`document.querySelector(${JSON.stringify(c.ready)})`,20000);row=await capture(t,c,orientation);}catch(e){row={case:c.id,surface:c.surface,title:c.title,orientation,target:t.id,status:'blocked',error:String(e)};try{row.metrics=await t.evaluate(measure);row.frames=[{path:`${t.id}/${orientation}/${c.id}-blocked.png`}];await mkdir(join(folder,t.id,orientation),{recursive:true});row.frames[0].sha256=await screenshot(t,join(folder,row.frames[0].path));}catch{};}
      results.push(row);const keep=existing.filter(r=>!(r.case===c.id&&r.orientation===orientation));await writeFile(resultPath,JSON.stringify([...keep,row],null,2));
      console.log(JSON.stringify({target:t.id,orientation,case:c.id,status:row.status,error:row.error}));
    }
  }
  if(t.nativePickerOpen){if(t.platform==='android')execFileSync(adb,['-s',t.serial,'shell','input','keyevent','4']);else await command(t,{dismiss:true});}
  t.close?.();return results;
}
console.log('Audit server ready on 127.0.0.1:8767');
if(process.env.AUDIT_SERVER_ONLY){setInterval(()=>{},10000);}else {
  try {await Promise.all(targets.map(run));}finally{server.close();}
}
