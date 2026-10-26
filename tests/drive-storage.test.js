import test from 'node:test';import assert from 'node:assert/strict';
import {createDriveStorage} from '../src/companion/drive-storage.js';
import {emptyData} from '../src/companion/model.js';
import {inspectCompleteBackup} from '../src/companion/complete-backup.js';
import {createIncrementalNotebookAdapter} from '../src/companion/drive-incremental.js';
function fixture(){
 let revision=1,index=1;const props={storageVersion:'1',storageFolder:'folder',copiesFolder:'copies',mediaFolder:'media',principalId:'device-a',principalName:'Phone A',backupEnabled:'1',backupWifiOnly:'1',backupAccount:'archive-account',backupFolder:'copies',backupFolderLabel:'Archives'};
 const files=new Map(),trashed=[];const drive={storageLink:()=>({id:'root',folderId:'objects',notebookId:'book',accountId:'account'}),storageRequest:async(path,o={})=>{const url=new URL('https://example.test'+path);let result;
  if(url.pathname==='/drive/v2/files/root'){if(o.method==='PUT'){if(o.etag!==`"${revision}"`)throw Object.assign(Error('Conflict'),{code:'CONFLICT'});for(const p of JSON.parse(o.text).properties)props[p.key]=p.value;revision++;}result={id:'root',title:'Spino.json',etag:`"${revision}"`,properties:Object.entries(props).map(([key,value])=>({key,value,visibility:'PRIVATE'}))};}
  else if(url.pathname.endsWith('/copies'))result={id:'copies',name:'Archives',mimeType:'application/vnd.google-apps.folder'};
  else if(url.pathname.endsWith('/generateIds'))result={ids:['file-'+index++]};
  else if(url.pathname==='/drive/v3/files'){result={files:[...files.values()].filter(f=>!f.trashed&&f.appProperties.complete==='1')};}
  else {const id=url.pathname.split('/').at(-1),f=files.get(id);if(!f)throw Error('Missing '+id);if(o.method==='PATCH'){const update=JSON.parse(o.text);if(update.trashed){f.trashed=true;trashed.push(id);}Object.assign(f.appProperties,update.appProperties||{});}result=f;}
  return {status:200,text:JSON.stringify(result)};
 }};
 const book={format:'cuaderno-piano',version:1,data:emptyData(),assets:[],legacy:{}},upload=async({blob,fileId,properties})=>{await inspectCompleteBackup(blob);files.set(fileId,{id:fileId,name:'copy.zip',size:blob.size,appProperties:{...properties,complete:'0'}});};
 const backupDrive={requireAccount:async id=>{assert.equal(id,'archive-account');return {id,email:'backups@example.invalid'};},request:async(id,path,options)=>{assert.equal(id,'archive-account');assert.ok(!path.startsWith('/drive/v2/'),'Archive API must never edit synchronization control');return JSON.parse((await drive.storageRequest(path,options)).text);}};
 const args={drive,backupDrive,deviceId:'device-a',deviceName:'Phone A',snapshot:async()=>JSON.stringify(book),mediaStore:{index:async()=>[]},mediaClient:async()=>({list:async()=>[]}),network:async()=>({online:true,wifi:true}),eligible:()=>true,upload,now:()=>new Date('2026-10-24T12:00:00Z')};
 return {args,props,files,trashed,book,upload,steal:()=>{props.principalId='device-b';revision++;}};
}
test('daily backup writes a verified ZIP and retains the latest seven, without rewriting unchanged days',async()=>{const f=fixture();for(let i=0;i<7;i++)f.files.set('old-'+i,{id:'old-'+i,appProperties:{complete:'1',createdAt:'2026-10-'+(10+i)}});const m=createDriveStorage(f.args);await m.daily();assert.equal(m.state.status,'saved',m.state.error);assert.equal(f.props.lastBackupDate,'2026-10-24');assert.deepEqual(f.trashed,['old-0']);await m.daily();assert.equal(m.state.status,'unchanged');assert.equal(f.files.size,8);});
test('a secondary device cannot create or prune copies',async()=>{const f=fixture();f.args.deviceId='device-b';const m=createDriveStorage(f.args);await m.daily();assert.equal(m.state.status,'secondary');assert.equal(f.files.size,0);assert.equal(f.trashed.length,0);});
test('changing principal during upload prevents completing or pruning the former principal copy',async()=>{const f=fixture();f.args.upload=async o=>{await f.upload(o);f.steal();};const m=createDriveStorage(f.args);await m.daily();assert.equal(m.state.status,'error');assert.equal(f.props.lastBackupAt,undefined);assert.equal([...f.files.values()][0].appProperties.complete,'0');assert.equal(f.trashed.length,0);});
test('missing lesson recording blocks complete export and retains last backup',async()=>{const f=fixture();f.book.data.events=[{recordingIds:['not-uploaded']}];const m=createDriveStorage(f.args);await assert.rejects(m.complete(),/have not reached/);assert.equal(f.files.size,0);});
test('offline principal and disallowed mobile network do not create copies',async()=>{for(const network of [{online:false,wifi:false},{online:true,wifi:false,metered:true}]){const f=fixture();f.args.network=async()=>network;const m=createDriveStorage(f.args);await m.daily();assert.equal(m.state.status,network.online?'wifi':'offline');assert.equal(f.files.size,0);}});
test('retention is retried on an unchanged day after a previous prune interruption',async()=>{const f=fixture(),m=createDriveStorage(f.args);await m.daily();for(let i=0;i<9;i++)f.files.set('extra-'+i,{id:'extra-'+i,appProperties:{complete:'1',createdAt:'2026-10-'+(10+i)}});await m.daily();assert.equal(m.state.status,'unchanged');assert.equal([...f.files.values()].filter(f=>!f.trashed).length,7);});
test('new principal starts copying and former principal stops without deleting its previous copies',async()=>{const f=fixture(),first=createDriveStorage(f.args);await first.daily();const second=createDriveStorage({...f.args,deviceId:'device-b',deviceName:'Phone B'});await second.claimPrincipal();assert.equal(f.props.principalId,'device-b');await first.daily();assert.equal(first.state.status,'secondary');await second.daily();assert.equal(second.state.status,'unchanged');assert.equal(f.files.size,1);});
test('explicit guided backup can proceed with its progress dialog open without bypassing ownership',async()=>{const f=fixture();f.args.eligible=manual=>manual===true;const manager=createDriveStorage(f.args);await manager.daily();assert.equal(f.files.size,0);await manager.daily({manual:true});assert.equal(manager.state.status,'saved');assert.equal(f.files.size,1);});

test('storage settings remain unknown until the full linked-notebook lookup completes',async()=>{
 const f=fixture(),request=f.args.drive.storageRequest;let finish;
 f.args.drive.rememberStorage=()=>{};
 f.args.drive.storageRequest=(path,options)=>path.startsWith('/drive/v3/files/folder?')?new Promise(resolve=>finish=()=>resolve({text:JSON.stringify({name:'Cloud folder'})})):request(path,options);
 const manager=createDriveStorage(f.args),loading=manager.refresh();
 for(let n=0;n<10&&!finish;n++)await Promise.resolve();
 assert.equal(manager.state.loaded,false);assert.equal(manager.state.config,null);
 finish();await loading;assert.equal(manager.state.loaded,true);assert.equal(manager.state.config.storageFolderName,'Cloud folder');
});

test('a failed initial lookup does not mark settings as loaded; a transient later failure keeps known settings',async()=>{
 const f=fixture(),request=f.args.drive.storageRequest;let fail=true;
 f.args.drive.storageRequest=(...args)=>fail?Promise.reject(Error('Offline.')):request(...args);
 const manager=createDriveStorage(f.args);await assert.rejects(manager.refresh(),/Offline/);assert.equal(manager.state.loaded,false);assert.equal(manager.state.config,null);
 fail=false;await manager.refresh();const config=manager.state.config;fail=true;await assert.rejects(manager.refresh(),/Offline/);assert.equal(manager.state.loaded,true);assert.deepEqual(manager.state.config,config);
});

test('switching notebooks hides old settings and rejects a late lookup from the previous connection',async()=>{
 const f=fixture(),originalLink=f.args.drive.storageLink(),request=f.args.drive.storageRequest;
 let link=originalLink,finish;
 f.args.drive.storageLink=()=>link;const manager=createDriveStorage(f.args);await manager.refresh();assert.equal(manager.state.loaded,true);
 f.args.drive.storageRequest=(...args)=>new Promise(resolve=>finish=async()=>resolve(await request(...args)));
 const loading=manager.refresh();link={...originalLink,id:'other-descriptor',notebookId:'other-notebook'};
 assert.equal(manager.state.loaded,false);assert.equal(manager.state.config,null);
 await finish();await assert.rejects(loading,/connected notebook changed/);assert.equal(manager.state.loaded,false);assert.equal(manager.state.config,null);
});

// Use the real notebook adapter so a Drive 404 has the same meaning as on Android.
function organizerFixture(){
 const notebookId='11111111-1111-4111-8111-111111111111',requests=[];
 let revision=1,nextId=1,settings={link:{id:'descriptor',rootId:'descriptor',folderId:'objects',notebookId,accountId:'account',format:'spino-notebook-v2',name:'Original.json',startToken:'start'}};
 const files=new Map([
  ['descriptor',{id:'descriptor',name:'Original.json',parents:['objects'],appProperties:{spinoType:'spino-notebook-v2',rootId:'descriptor',notebookId}}],
  ['objects',{id:'objects',mimeType:'application/vnd.google-apps.folder',parents:['private-drive-root'],appProperties:{}}],
 ]);
 const failures=new Map([['private-drive-root',404]]);
 const response=(status,value={})=>({status,text:JSON.stringify(value)});
 const native={status:async()=>({account:{id:'account'}}),request:async request=>{
  requests.push(request);const url=new URL('https://example.test'+request.path),id=url.pathname.split('/').at(-1),method=request.method||'GET';
  if(url.pathname==='/drive/v3/files'){
   if(method==='POST'){const value=JSON.parse(request.text),file={...value,id:'created-'+nextId++,appProperties:value.appProperties||{},parents:value.parents||['private-drive-root']};files.set(file.id,file);return response(200,file);}
   const q=url.searchParams.get('q');
   const parent=/^trashed = false and '([^']+)' in parents/.exec(q);
   return response(200,{files:q.includes("key='notebookId'")?[]:[...files.values()].filter(f=>f.mimeType==='application/vnd.google-apps.folder'&&(!parent||f.parents.includes(parent[1])))});
  }
  if(failures.has(id))return response(failures.get(id));
  const file=files.get(id);if(!file)return response(404);
  if(url.pathname.startsWith('/drive/v2/')){
   if(method==='PUT'){const body=JSON.parse(request.text);if(request.etag&&request.etag!==`"${revision}"`)return response(412);if(body.title)file.name=body.title;for(const p of body.properties||[])file.appProperties[p.key]=p.value;revision++;}
   return response(200,{id,title:file.name,etag:`"${revision}"`,properties:Object.entries(file.appProperties).map(([key,value])=>({key,value,visibility:'PRIVATE'}))});
  }
  if(method==='PATCH'&&!url.searchParams.has('addParents'))Object.assign(file,JSON.parse(request.text));
  if(method==='PATCH'&&url.searchParams.has('addParents')){
   const parent=url.searchParams.get('addParents');
   // Drive also rejects cycles when an ancestor cannot be inspected by the app.
   if(parent==='server-rejects-cycle')return response(403);
   file.parents=[parent];revision++;
  }
  return response(200,file);
 }};
 const values=new Map(),drive=createIncrementalNotebookAdapter({native,settings:{read:()=>settings,save:value=>{settings=value;}},journal:{get:async key=>values.get(key),set:async(key,value)=>values.set(key,value)}});
 const manager=createDriveStorage({drive,deviceId:'device-a',deviceName:'Phone A',eligible:()=>true});
 return {manager,files,failures,requests,settings:()=>settings};
}

test('creating a folder and renaming succeeds when its My Drive ancestor is outside file access',async()=>{
 const f=organizerFixture(),target=await f.manager.createFolder('My piano');
 await f.manager.organize({folderId:target.id,name:'My practice'});
 assert.equal(f.manager.state.status,'ready');assert.equal(f.settings().link.name,'My practice.json');
 assert.equal(f.settings().link.id,'descriptor');assert.equal(f.settings().link.folderId,'objects');
 assert.deepEqual(f.files.get('objects').parents,[target.id]);
 assert.equal(f.manager.state.config.storageFolder,target.id);
 assert.equal(f.manager.state.config.principalId,'device-a');
 const children=[...f.files.values()].filter(file=>file.appProperties.spinoStorage);
 assert.equal(children.length,2);assert.ok(children.every(file=>file.parents.includes(target.id)));
 await f.manager.organize({folderId:target.id,name:'My practice'});
 assert.equal([...f.files.values()].filter(file=>file.appProperties.spinoStorage).length,2);
});

test('an unavailable selected folder still blocks setup before any move or rename',async()=>{
 const f=organizerFixture();await assert.rejects(f.manager.organize({folderId:'missing',name:'New name'}),{code:'FILE_UNAVAILABLE'});
 assert.equal(f.settings().link.name,'Original.json');assert.deepEqual(f.files.get('objects').parents,['private-drive-root']);
 assert.ok(!f.requests.some(r=>r.method==='PATCH'||r.method==='PUT'));
});

test('folder access revocation is not swallowed as an inaccessible ancestor',async()=>{
 const f=organizerFixture(),target=await f.manager.createFolder('My piano');f.failures.set('private-drive-root',403);
 await assert.rejects(f.manager.organize({folderId:target.id,name:'New name'}),{code:'PERMISSION_REQUIRED'});
 assert.equal(f.settings().link.name,'Original.json');assert.ok(!f.requests.some(r=>r.method==='PATCH'||r.method==='PUT'));
});

test('a descendant folder is rejected before moving or renaming the notebook',async()=>{
 const f=organizerFixture();f.files.set('descendant',{id:'descendant',mimeType:'application/vnd.google-apps.folder',parents:['objects']});
 await assert.rejects(f.manager.organize({folderId:'descendant',name:'New name'}),/outside/);
 assert.ok(!f.requests.some(r=>r.method==='PATCH'||r.method==='PUT'));assert.equal(f.settings().link.name,'Original.json');
});

test('Drive rejection of a move beyond visible ancestors does not activate backups',async()=>{
 const f=organizerFixture();f.files.set('server-rejects-cycle',{id:'server-rejects-cycle',mimeType:'application/vnd.google-apps.folder',parents:['private-drive-root']});
 await assert.rejects(f.manager.organize({folderId:'server-rejects-cycle',name:'New name'}),{code:'PERMISSION_REQUIRED'});
 assert.equal(f.manager.state.config.storageVersion,undefined);assert.equal(f.settings().link.name,'Original.json');
 assert.deepEqual(f.files.get('objects').parents,['private-drive-root']);
 assert.ok(!f.requests.some(r=>r.method==='PUT'));
});

test('organization gives the app-owned nested data folder the notebook name and preserves selected user folders',async()=>{
 const f=organizerFixture();Object.assign(f.files.get('objects'),{name:'SPino — 2_Old',description:'SPino synchronized notebook objects. Keep this folder intact.'});const target=await f.manager.createFolder('My chosen folder');await f.manager.organize({folderId:target.id,name:'5_My piano'});assert.equal(f.files.get('objects').name,'5_My piano');assert.equal(f.files.get(target.id).name,'My chosen folder');assert.equal(f.manager.state.config.storageFolderName,'My chosen folder');assert.equal(f.settings().link.storageFolderName,'My chosen folder');
});

test('new automatic settings default to local, never move notebook files, and use a verified local ZIP',async()=>{
 const f=fixture(),writes=[],commits=[];for(const key of ['storageVersion','copiesFolder','principalId','backupEnabled'])delete f.props[key];
 f.args.localArchive={save:async(blob,name,notebookId)=>{await inspectCompleteBackup(blob);writes.push({name,notebookId,bytes:blob.size});return {saved:true,bytes:blob.size,uri:'content://synthetic/backup-1'};},commit:async args=>commits.push(args)};
 const m=createDriveStorage(f.args);await m.configureAutomatic({enabled:true});assert.equal(f.props.backupDestination,'local');assert.equal(f.props.principalId,'device-a');assert.equal(f.props.storageVersion,undefined);
 await m.daily();assert.equal(m.state.status,'saved',m.state.error);assert.equal(f.files.size,0);assert.equal(writes.length,1);assert.match(writes[0].name,/^Spino_2026-10-24T12-00-00-000Z\.zip$/);assert.equal(commits.length,1);
 await m.daily();assert.equal(m.state.status,'unchanged');assert.equal(writes.length,1);
});
test('local save failure or ownership change never advances the backup pointer or prunes',async()=>{
 for(const kind of ['write','ownership']){const f=fixture(),commits=[];f.props.backupDestination='local';
 f.args.localArchive={save:async blob=>{if(kind==='write')throw Error('Disk full');f.steal();return {saved:true,bytes:blob.size,uri:'content://synthetic/copy'};},commit:async args=>commits.push(args)};
 const m=createDriveStorage(f.args);await m.daily();assert.equal(m.state.status,'error');assert.equal(f.props.lastBackupAt,undefined);assert.deepEqual(commits,[]);assert.deepEqual(f.trashed,[]);}
});
test('changing local principal clears the other device local pointer and makes a first local copy',async()=>{
 const f=fixture();Object.assign(f.props,{backupDestination:'local',lastBackupLocalUri:'content://other-device/1',lastBackupAt:'2026-10-24',lastBackupHash:'old'});
 const m=createDriveStorage({...f.args,deviceId:'device-b'});await m.claimPrincipal();assert.equal(f.props.lastBackupLocalUri,'');assert.equal(f.props.lastBackupAt,'');
});
test('automatic destination selection refuses the notebook folder without moving or renaming it',async()=>{
 const f=organizerFixture();await assert.rejects(f.manager.configureAutomatic({enabled:true,destination:'drive',folderName:'Original',accountId:'archive-account'}),/matches the notebook folder/);
 assert.equal(f.settings().link.name,'Original.json');assert.ok(!f.requests.some(r=>r.method==='PUT'||r.method==='PATCH'));
});
test('disabling automatic backups does not require the old destination to be available',async()=>{
 const f=fixture(),m=createDriveStorage(f.args);await m.configureAutomatic({enabled:false,destination:'drive',folderId:'gone'});assert.equal(f.props.backupEnabled,'0');
});

test('local backups can save cached content on cellular without uploading a remote ZIP',async()=>{
 const f=fixture();f.props.backupDestination='local';f.args.network=async()=>({online:true,wifi:false,metered:true});let saved=0;
 f.args.localArchive={save:async(blob)=>{saved++;return {saved:true,bytes:blob.size,uri:'content://local/1'};},commit:async()=>{}};
 const m=createDriveStorage(f.args);await m.daily();assert.equal(m.state.status,'saved',m.state.error);assert.equal(saved,1);assert.equal(f.files.size,0);
});
test('remote backup destination uses an explicitly connected archive account and never changes notebook location',async()=>{
 const f=fixture();f.args.backupDrive.ensureFolder=async args=>{assert.equal(args.accountId,'archive-account');assert.equal(args.name,'Spino_backup');assert.equal(args.sourceRoot,'root');return {id:'archives-new',name:args.name};};
 const m=createDriveStorage(f.args);await m.configureAutomatic({enabled:true,destination:'drive',folderName:'Spino_backup',accountId:'archive-account'});
 assert.equal(m.state.config.backupFolder,'archives-new');assert.equal(m.state.config.backupAccount,'archive-account');assert.equal(m.state.config.backupAccountLabel,'backups@example.invalid');assert.equal(m.link().folderId,'objects');assert.equal(m.state.config.name,'Spino.json');
});
test('legacy remote settings without an explicit backup account cannot reuse synchronization credentials',async()=>{
 const f=fixture();delete f.props.backupAccount;let uploads=0;f.args.upload=async()=>uploads++;const m=createDriveStorage(f.args);await m.daily();assert.equal(m.state.status,'error');assert.match(m.state.error,/Connect Google Drive for backups/);assert.equal(uploads,0);assert.equal(f.files.size,0);
});
