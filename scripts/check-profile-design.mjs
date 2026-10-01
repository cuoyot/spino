// Inspect the installed Android UI without changing the notebook or cloud destination.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const adb = join(process.env.USERPROFILE,'Android','sdk','platform-tools','adb.exe');
const run = args => execFileSync(adb,args,{encoding:'utf8',windowsHide:true}).trim();
const pid = run(['shell','pidof','com.miguelcoll.sightreader']);
assert.match(pid,/^\d+$/);
const port = run(['forward','tcp:0',`localabstract:webview_devtools_remote_${pid}`]);
let socket;
try {
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  const pending = new Map(), errors=[];let id=0;
  socket.onmessage=({data})=>{
    const message=JSON.parse(data);
    if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);
    if(!message.id)return;
    const task=pending.get(message.id);pending.delete(message.id);
    if(message.error)task.reject(Error(JSON.stringify(message.error)));else task.resolve(message.result);
  };
  const send=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const value=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,timeout:15000});assert.equal(value.exceptionDetails,undefined,JSON.stringify(value.exceptionDetails));return value.result.value;};
  const wait=expression=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve();}else if(++n>300){clearInterval(timer);reject(Error('UI timed out'));}},25);})`);
  const action=name=>evaluate(`document.querySelector('[data-action="${name}"]').click()`);
  const snapshot=()=>evaluate(`new Promise((resolve,reject)=>{const request=indexedDB.open('cuaderno-piano',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction(['state','assets']);const data=tx.objectStore('state').get('current'),assets=tx.objectStore('assets').getAll();tx.oncomplete=()=>{const value=data.result;resolve({data:JSON.stringify(value),assets:JSON.stringify(assets.result),running:Boolean(value.active?.runningSince)});db.close();};tx.onerror=()=>reject(tx.error);};})`);
  await send('Runtime.enable');
  await wait(`document.querySelector('.cp-profile-nav')`);
  const before=await snapshot();
  assert.equal(before.running,false,'Do not navigate away from an active practice.');
  await mkdir('artifacts/profile-emulator',{recursive:true});
  for(const [actionName,name] of [['settings','profile'],['profile-practice','preferences'],['settings',null],['profile-backup','backup'],['settings',null],['profile-files','scores'],['midi-settings','instrument'],['piano','piano']]) {
    await action(actionName);
    if(actionName==='profile-files')await wait(`!document.querySelector('.cp-file-list').textContent.includes('Cargando')`);
    if(!name)continue;
    assert.equal(await evaluate(`document.querySelector('.cp-page').scrollWidth>document.querySelector('.cp-page').clientWidth+1`),false,`${name} width`);
    assert.equal(await evaluate(`document.querySelector('.cp-profile-nav [data-midi-indicator]')!==null`),false);
    assert.ok(await evaluate(`document.querySelector('.cp-midi-nav [data-midi-indicator]')!==null`));
    await writeFile(`artifacts/profile-emulator/${name}.png`,execFileSync(adb,['exec-out','screencap','-p'],{windowsHide:true}));
  }
  await action('settings');await action('profile-backup');
  if(!await evaluate(`Boolean(document.querySelector('[data-action=cloud-help]'))`))await action('cloud-manage');
  await action('cloud-help');
  run(['shell','input','keyevent','4']);
  await wait(`!document.querySelector('#cp-dialog').open`);
  assert.equal(await evaluate(`document.querySelector('#app-shell h1').textContent`),'Copia y sincronización');
  run(['shell','input','keyevent','4']);
  await wait(`document.querySelector('.cp-profile-identity')`);
  const after=await snapshot();
  const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(hash(after),hash(before),'Navigation preserves notebook data, scores and annotations.');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({screens:6,nativeBack:true,notebookUnchanged:true,midiSeparate:true}));
} finally {
  socket?.close();run(['forward','--remove',`tcp:${port}`]);
}
