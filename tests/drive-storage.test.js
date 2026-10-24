import test from 'node:test';import assert from 'node:assert/strict';
import {createDriveStorage} from '../src/companion/drive-storage.js';
import {emptyData} from '../src/companion/model.js';
import {inspectCompleteBackup} from '../src/companion/complete-backup.js';
function fixture(){
 let revision=1,index=1;const props={storageVersion:'1',storageFolder:'folder',copiesFolder:'copies',mediaFolder:'media',principalId:'device-a',principalName:'Phone A',backupEnabled:'1',backupWifiOnly:'1'};
 const files=new Map(),trashed=[];const drive={storageLink:()=>({id:'root',folderId:'objects',notebookId:'book',accountId:'account'}),storageRequest:async(path,o={})=>{const url=new URL('https://example.test'+path);let result;
  if(url.pathname==='/drive/v2/files/root'){if(o.method==='PUT'){if(o.etag!==`"${revision}"`)throw Object.assign(Error('Conflict'),{code:'CONFLICT'});for(const p of JSON.parse(o.text).properties)props[p.key]=p.value;revision++;}result={id:'root',title:'Spino.json',etag:`"${revision}"`,properties:Object.entries(props).map(([key,value])=>({key,value,visibility:'PRIVATE'}))};}
  else if(url.pathname.endsWith('/generateIds'))result={ids:['file-'+index++]};
  else if(url.pathname==='/drive/v3/files'){result={files:[...files.values()].filter(f=>!f.trashed&&f.appProperties.complete==='1')};}
  else {const id=url.pathname.split('/').at(-1),f=files.get(id);if(!f)throw Error('Missing '+id);if(o.method==='PATCH'){const update=JSON.parse(o.text);if(update.trashed){f.trashed=true;trashed.push(id);}Object.assign(f.appProperties,update.appProperties||{});}result=f;}
  return {status:200,text:JSON.stringify(result)};
 }};
 const book={format:'cuaderno-piano',version:1,data:emptyData(),assets:[],legacy:{}},upload=async({blob,fileId,properties})=>{await inspectCompleteBackup(blob);files.set(fileId,{id:fileId,name:'copy.zip',size:blob.size,appProperties:{...properties,complete:'0'}});};
 const args={drive,deviceId:'device-a',deviceName:'Phone A',snapshot:async()=>JSON.stringify(book),mediaStore:{index:async()=>[]},mediaClient:async()=>({list:async()=>[]}),network:async()=>({online:true,wifi:true}),eligible:()=>true,upload,now:()=>new Date('2026-10-24T12:00:00Z')};
 return {args,props,files,trashed,book,upload,steal:()=>{props.principalId='device-b';revision++;}};
}
test('daily backup writes a verified ZIP and retains the latest seven, without rewriting unchanged days',async()=>{const f=fixture();for(let i=0;i<7;i++)f.files.set('old-'+i,{id:'old-'+i,appProperties:{complete:'1',createdAt:'2026-10-'+(10+i)}});const m=createDriveStorage(f.args);await m.daily();assert.equal(m.state.status,'saved',m.state.error);assert.equal(f.props.lastBackupDate,'2026-10-24');assert.deepEqual(f.trashed,['old-0']);await m.daily();assert.equal(m.state.status,'unchanged');assert.equal(f.files.size,8);});
test('a secondary device cannot create or prune copies',async()=>{const f=fixture();f.args.deviceId='device-b';const m=createDriveStorage(f.args);await m.daily();assert.equal(m.state.status,'secondary');assert.equal(f.files.size,0);assert.equal(f.trashed.length,0);});
test('changing principal during upload prevents completing or pruning the former principal copy',async()=>{const f=fixture();f.args.upload=async o=>{await f.upload(o);f.steal();};const m=createDriveStorage(f.args);await m.daily();assert.equal(m.state.status,'error');assert.equal(f.props.lastBackupAt,undefined);assert.equal([...f.files.values()][0].appProperties.complete,'0');assert.equal(f.trashed.length,0);});
test('missing lesson recording blocks complete export and retains last backup',async()=>{const f=fixture();f.book.data.events=[{recordingIds:['not-uploaded']}];const m=createDriveStorage(f.args);await assert.rejects(m.complete(),/have not reached/);assert.equal(f.files.size,0);});
test('offline principal and disallowed mobile network do not create copies',async()=>{for(const network of [{online:false,wifi:false},{online:true,wifi:false,metered:true}]){const f=fixture();f.args.network=async()=>network;const m=createDriveStorage(f.args);await m.daily();assert.equal(m.state.status,network.online?'wifi':'offline');assert.equal(f.files.size,0);}});
