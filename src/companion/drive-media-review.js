import {Capacitor} from '@capacitor/core';
import {connectDriveReview,driveNativeAvailable} from './drive-media-native.js';
import {createDriveMedia} from './drive-media.js';
import {syntheticDrive} from './drive-media-fixture.js';
import {finalizeMediaDuration} from './media-duration.js';
import fixtureURL from '../../tests/fixtures/media/two-minute-stream.webm?url';
import './drive-media-review.css';

const demo=new URL(location.href).searchParams.get('demo')==='1';
const root=document.querySelector('#drive-review');
root.innerHTML=`<a href="./">← Return to SPino</a><h1>Google Drive transfer check</h1><p class="notice">${demo?'Synthetic browser preview — no Google account is connected.':'Android beta review — connect your own Google Drive account.'}</p><p>This check uses a synthetic two-minute tone. Your notebook and personal recordings are not accessed.</p><label for="notebook">Test notebook code</label><input id="notebook" value="spino-drive-media-poc-20261016" maxlength="160" pattern="[\\w-]+"><div class="actions"><button id="connect">${demo?'Open synthetic preview':'Connect with Google'}</button><button id="upload" disabled>Upload test recording</button><button id="refresh" disabled>Find test recordings</button></div><output id="status" role="status">Use the same test notebook code and Google account on both devices.</output><ul id="recordings"></ul><div id="player"></div><p>Review only. Automatic recording sync and migration are not enabled.</p>`;
const status=root.querySelector('#status'),list=root.querySelector('#recordings');
let connection=null,busy=false,objectURL='';
const store=new Map(),fake=demo?syntheticDrive():null;
function controls(){root.querySelector('#connect').disabled=busy;root.querySelector('#notebook').disabled=busy||!!connection;for(const id of ['upload','refresh'])root.querySelector('#'+id).disabled=busy||!connection;list.querySelectorAll('button').forEach(b=>b.disabled=busy);}
async function run(task){if(busy)return;busy=true;controls();try{await task();}catch(error){status.textContent=error.message||'Drive check failed.';}finally{busy=false;controls();}}
async function refresh(){
  const files=await connection.client.list();list.replaceChildren();
  for(const file of files){const li=document.createElement('li'),name=document.createElement('strong'),button=document.createElement('button');name.textContent=file.name;button.textContent='Download and verify';button.onclick=()=>run(async()=>{
    status.textContent='Downloading and verifying…';const result=await connection.client.download(file.id);
    if(objectURL)URL.revokeObjectURL(objectURL);
    objectURL=result.blob?URL.createObjectURL(result.blob):Capacitor.convertFileSrc(result.path);
    const player=document.createElement('audio');player.controls=true;player.src=objectURL;root.querySelector('#player').replaceChildren(player);status.textContent='Recording downloaded and SHA-256 verified. Press Play to listen.';
  });li.append(name,button);list.append(li);}
  status.textContent=`${files.length} verified test recording(s) found.`;
}
root.querySelector('#connect').onclick=()=>run(async()=>{
  const notebookId=root.querySelector('#notebook').value.trim();if(!/^[\w-]{1,160}$/.test(notebookId))throw new Error('Enter a test notebook code using letters, numbers, hyphens or underscores.');
  if(demo)connection={account:{id:'synthetic-account'},client:createDriveMedia({request:fake.request,state:{get:async k=>store.get(k),set:async(k,v)=>store.set(k,structuredClone(v))},accountId:'synthetic-account',notebookId})};
  else {if(!driveNativeAvailable())throw new Error('Open this check in the Android review APK. Browser and iOS authorization are not configured.');connection=await connectDriveReview(notebookId);}
  status.textContent=demo?'Synthetic account connected.':`Connected to ${connection.account.email||connection.account.name||'your Google Drive'}.`;
});
root.querySelector('#upload').onclick=()=>run(async()=>{
  const key=`spino.drive-media-review.take.${connection.account.id}.${root.querySelector('#notebook').value.trim()}`;
  let takeId=localStorage.getItem(key);if(!takeId){takeId=crypto.randomUUID();localStorage.setItem(key,takeId);}
  status.textContent='Preparing synthetic recording…';const response=await fetch(fixtureURL);if(!response.ok)throw new Error('Synthetic recording is unavailable.');
  const blob=await finalizeMediaDuration(new Blob([await response.arrayBuffer()],{type:'audio/webm'}),120000);
  await connection.client.upload({takeId,workId:'synthetic-drive-work',title:'SPino synthetic two-minute transfer check',blob,onProgress:(done,total)=>status.textContent=`Uploading test recording: ${Math.floor(done/total*100)}%`});await refresh();
});
root.querySelector('#refresh').onclick=()=>run(refresh);
window.addEventListener('pagehide',()=>{if(objectURL.startsWith('blob:'))URL.revokeObjectURL(objectURL);});
