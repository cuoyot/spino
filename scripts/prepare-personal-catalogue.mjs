// Explicit personal-test acquisition through the installed app. Keeps existing notebook data.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const adb = join(process.env.USERPROFILE, 'Android', 'sdk', 'platform-tools', 'adb.exe');
const run = args => execFileSync(adb, args, { encoding: 'utf8', windowsHide: true }).trim();

const pid = run(['shell', 'pidof', 'com.miguelcoll.sightreader']);
assert.match(pid, /^\d+$/);
const port = run(['forward', 'tcp:0', `localabstract:webview_devtools_remote_${pid}`]);
let socket;
try {
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const pending = new Map(), errors = []; let id = 0;
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (!message.id) return;
    const task = pending.get(message.id); pending.delete(message.id);
    if (message.error) task.reject(Error(JSON.stringify(message.error))); else task.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 45000 });
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails)); return result.result.value;
  };
  const wait = expression => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve(true);}else if(++n>1000){clearInterval(timer);reject(Error('Timeout: '+${JSON.stringify(expression)}));}},30);})`);
  const snapshot = () => evaluate(`new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction(['state','assets']),state=tx.objectStore('state').get('current'),assets=tx.objectStore('assets').getAll();tx.oncomplete=()=>{resolve({works:state.result.works,assets:assets.result,sessions:state.result.sessions,active:state.result.active});db.close();};tx.onerror=reject;};})`);
  await send('Runtime.enable'); await wait(`document.querySelector('#app-shell h1')`);
  assert.ok(await evaluate(`Capacitor.isNativePlatform() && !document.querySelector('dialog[open]')`));
  const before = await snapshot(); assert.ok(!before.active?.runningSince, 'Pause practice before running the diagnostic.');
  await evaluate(`document.querySelector('[data-action=piano]').click();document.querySelector('[data-action=catalog]')?.click()`);
  await wait(`document.querySelector('[data-count=records]')`);

  await evaluate(`document.querySelector('#library-personal-testing').checked=true;document.querySelector('#library-personal-testing').dispatchEvent(new Event('change',{bubbles:true}));`);
  const state = () => evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('state').objectStore('state').get('repertoire-library-v2');q.onsuccess=()=>{const v=q.result;resolve({personalTesting:v.personalTesting,records:Object.values(v.manifests).filter(m=>m.descriptor.enabled_by_default).flatMap(m=>m.snapshot.pieces).map(r=>({id:r.piece_id,title:r.display_title,group:r.catalogue_group})),executions:Object.fromEntries(Object.entries(v.executions).map(([id,e])=>[id,{assetId:e.assetId,sha256:e.sha256,analysis:e.analysis?.status,parts:e.parts,selection:e.selection,segments:e.segments?.length||0,render:e.render,reviews:e.reviews,job:e.job}]))});db.close();};};})`);
  for(let n=0;n<50 && !(await state()).personalTesting;n++)await new Promise(r=>setTimeout(r,100));
  assert.equal((await state()).personalTesting,true);
  await evaluate(`document.querySelector('[data-action=library-candidates-download]').click()`);
  const started=Date.now();let lastLog=0;
  while(true){
    const v=await state(),entries=Object.values(v.executions),pending=entries.filter(e=>['queued','downloading','waiting-wifi'].includes(e.job?.status));
    if(Date.now()-lastLog>10000){console.log(JSON.stringify({downloaded:entries.filter(e=>e.assetId).length,analyzed:entries.filter(e=>e.analysis==='complete').length,pending:pending.length,failed:entries.filter(e=>e.job?.status==='failed').length}));lastLog=Date.now();}
    if(!pending.length)break;
    if(pending.some(e=>e.job?.status==='waiting-wifi'))throw Error('Wi-Fi policy is waiting; network preferences were not changed.');
    if(Date.now()-started>1200000)throw Error('Acquisition time limit reached; inspect Downloads to resume.');
    await new Promise(r=>setTimeout(r,2000));
  }
  const downloaded=await state(),renderResults=[];
  for(const record of downloaded.records.filter(r=>r.group==='piano_candidates')){
    const e=downloaded.executions[record.id];if(!e?.assetId||e.analysis!=='complete'||!e.selection?.length)continue;
    try{
      await evaluate(`document.querySelector('[data-action=catalog]')?.click()`);
      await wait(`document.querySelector('#library-search')`);
      await evaluate(`document.querySelector('#library-search [name=query]').value=${JSON.stringify(record.id)};document.querySelector('#library-search').requestSubmit();document.querySelector('[data-action=library-detail]').click();document.querySelector('[data-action=library-preview]').click()`);
      await wait(`document.querySelector('.xml-status') && !document.querySelector('.xml-status').textContent.startsWith('Loading')`);
      const rendered=await evaluate(`document.querySelector('.xml-status').textContent`);
      renderResults.push({id:record.id,status:rendered});
      await evaluate(`document.querySelector('[data-xml=close]').click()`);await wait(`!document.querySelector('.xml-score-viewer')`);
      console.log(JSON.stringify({preview:record.id,status:rendered}));
    }catch(error){renderResults.push({id:record.id,error:error.message});await evaluate(`document.querySelector('[data-xml=close]')?.click()`).catch(()=>{});}
  }
  await evaluate(`document.querySelector('[data-action=catalog]')?.click();document.querySelector('[data-action=library-downloadable]').click()`);
  const final=await state(),after=await snapshot();
  assert.deepEqual(after.works,before.works);assert.deepEqual(after.sessions,before.sessions);assert.equal(after.active?.id,before.active?.id);assert.equal(after.active?.elapsedMs,before.active?.elapsedMs);
  for(const asset of before.assets)assert.deepEqual(after.assets.find(a=>a.id===asset.id),asset);
  const report={counts:await evaluate(`Object.fromEntries([...document.querySelectorAll('[data-count]')].map(e=>[e.dataset.count,Number(e.textContent)]))`),downloaded:Object.values(final.executions).filter(e=>e.assetId).length,analyzed:Object.values(final.executions).filter(e=>e.analysis==='complete').length,segments:Object.values(final.executions).reduce((n,e)=>n+e.segments,0),rightsApprovals:Object.values(final.executions).filter(e=>e.reviews?.rights?.approved).length,failures:Object.entries(final.executions).filter(([,e])=>e.job?.status==='failed').map(([id,e])=>({id,error:e.job.error})),renderResults,existingNotebookPreserved:true,frontendErrors:errors};
  await mkdir('artifacts/repertoire',{recursive:true});await writeFile('artifacts/repertoire/personal-test-report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));

} finally {
  socket?.close(); run(['forward', '--remove', `tcp:${port}`]);
}
