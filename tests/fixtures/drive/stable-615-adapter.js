// Frozen stable 6.1.5 adapter (50b0e37), retained to verify beta interoperability.
import {packCheckpoint,unpackCheckpoint} from '../../../src/companion/drive-checkpoint.js';
import {createDriveRequestGate} from '../../../src/companion/drive-request.js';
import {backupHash} from '../../../src/companion/cloud-backup.js';
import {validateBackup} from '../../../src/companion/model.js';
import {validNotebookId} from '../../../src/companion/device-link.js';
import {stableJSON,mergeNotebooks} from '../../../src/companion/cloud-merge.js';
import {ATOMIC_FORMAT,atomicFailure,notebookRecords,recordsNotebook,recordChanges,validateCommit,validateChanges,mergeCommitGraph,hashPattern} from '../../../src/companion/atomic-notebook.js';
import {createDriveObjects,ROOT_MARKER,COMMIT_MARKER,OBJECT_MARKER,objectFields,validDriveId} from '../../../src/companion/drive-objects.js';
import {createDriveJournal} from '../../../src/companion/drive-journal.js';

const oldMarker='spino-notebook-v1',archivedMarker='spino-notebook-archive-v1';
const parse=response=>JSON.parse(response.text),equal=(a,b)=>stableJSON(a)===stableJSON(b);
const bytes=text=>new TextEncoder().encode(text).length;
export function createIncrementalNotebookAdapter({native,recovery,settings,journal=createDriveJournal(),validate=validateBackup,requestTimeoutMs=60000,fastReads=false,preserveLegacy=false}){
 let migrationConsent=null,destination=null,selected=null,client=null,progress=null,progressListener=()=>{},metrics={requests:0,receivedBytes:0,startedAt:0};
 const requests=createDriveRequestGate(native,{timeoutMs:requestTimeoutMs});
 const report=(stage,completed=0,total=null)=>{progress={stage,completed,total,...metrics,elapsedSeconds:Math.floor((Date.now()-metrics.startedAt)/1000)};progressListener();};
 const state=()=>settings.read()||{},save=next=>settings.save(next);
 const serialized=async fn=>requests.serialized(async()=>{metrics={requests:0,receivedBytes:0,startedAt:Date.now()};report('checking');const timer=setInterval(()=>{if(progress)report(progress.stage,progress.completed,progress.total);},1000);try{return await fn();}finally{clearInterval(timer);progress=null;progressListener();}});
 async function account(){const value=(await requests.run(()=>native.status())).account;if(!value?.id)throw atomicFailure('Connect Google Drive. Your notebook is saved locally.','PERMISSION_REQUIRED');return value;}
 async function api(path,{method='GET',text,etag,contentType,missing=false,allowConflict=false}={}){
  const connected=await account(),link=state().link;if(link&&link.accountId!==connected.id)throw atomicFailure('Reconnect the Google account linked to this notebook.','ACCOUNT_MISMATCH');
  let r;
  for(let attempt=0;;attempt++){
   const requestId=crypto.randomUUID();metrics.requests++;
   try{r=await requests.run(()=>native.request({path,method,text,etag,contentType,accountId:connected.id,requestId}),{requestId});metrics.receivedBytes+=bytes(r.text||'');
    if(method==='GET'&&[429,500,502,503,504].includes(r.status))throw atomicFailure('Drive is temporarily unavailable.','PROVIDER_ERROR');break;
   }catch(error){if(method!=='GET'||error.code!=='PROVIDER_ERROR'||attempt>=2)throw error;
    const previous=progress;report('retrying',attempt+1,2);await requests.run(()=>new Promise(resolve=>setTimeout(resolve,1000*2**attempt)));if(previous)report(previous.stage,previous.completed,previous.total);
   }
  }
  if(missing&&r.status===404)return null;
  if(allowConflict&&r.status===409)return r;
  if(r.status===409||r.status===412)throw atomicFailure('The Drive notebook changed. Reading the latest changes before retrying.','CONFLICT');
  if(r.status===401||r.status===403)throw atomicFailure('Reconnect Google Drive or check your storage and file access. Your notebook is saved locally.','PERMISSION_REQUIRED');
  if(r.status===404)throw atomicFailure('A notebook object is unavailable. Your local notebook is kept.','FILE_UNAVAILABLE');
  if(r.status<200||r.status>=300)throw atomicFailure(`Drive could not complete a notebook request (${r.status}). Your local notebook is kept.`,'PROVIDER_ERROR');return r;
 }
 const metadata=async id=>{if(!validDriveId(id))throw atomicFailure('Invalid Drive notebook ID.');return parse(await api(`/drive/v3/files/${id}?fields=${objectFields}`));};
 async function listFiles(query){let token='',files=[];do{const r=parse(await api(`/drive/v3/files?pageSize=100&spaces=drive&fields=${encodeURIComponent('nextPageToken,files('+objectFields+')')}&q=${encodeURIComponent(query)}${token?'&pageToken='+encodeURIComponent(token):''}`));if(!Array.isArray(r.files))throw atomicFailure('Invalid Drive notebook listing.');files.push(...r.files);token=r.nextPageToken||'';if(files.length>100000)throw atomicFailure('The incremental notebook exceeds the object limit.','LIMIT');}while(token);return files;}
 async function open(root){
  const connected=await account();if(client?.rootId===root.rootId&&client.accountId===connected.id&&client.folderId===root.folderId&&(!root.startToken||root.startToken===client.startToken))return client;
  if(root.format!==ATOMIC_FORMAT||!validDriveId(root.rootId)||!validNotebookId(root.notebookId)||!validDriveId(root.folderId)||(root.startToken!=null&&(typeof root.startToken!=='string'||!root.startToken.length||root.startToken.length>2000))||(root.initialHeads!=null&&(!Array.isArray(root.initialHeads)||root.initialHeads.length>1000||!root.initialHeads.every(h=>hashPattern.test(h)))))throw atomicFailure('Invalid incremental notebook descriptor.');
  const scope='atomic2/'+connected.id+'/'+root.rootId,objects=createDriveObjects({api,journal,scope,rootId:root.rootId,notebookId:root.notebookId,folderId:root.folderId,lookup:hash=>listFiles(`trashed = false and appProperties has { key='rootId' and value='${root.rootId}' } and appProperties has { key='notebookId' and value='${root.notebookId}' } and appProperties has { key='hash' and value='${hash}' }`)});
  let catalog=await journal.get(scope+'/catalog');
  const register=files=>{for(const f of files)objects.register(f);};
  root.startToken??=await journal.get(scope+'/start');
  if(!root.startToken){root.startToken=parse(await api('/drive/v3/changes/startPageToken')).startPageToken;if(typeof root.startToken!=='string')throw atomicFailure('Drive did not return a changes cursor.');if(journal.claim)root.startToken=await journal.claim(scope+'/start',root.startToken);else await journal.set(scope+'/start',root.startToken);}
  if(!catalog||catalog.startToken!==root.startToken){catalog={startToken:root.startToken,version:1,token:root.startToken,files:[]};await journal.set(scope+'/catalog',catalog);}
  const cursor=await journal.get(scope+'/cursor');if(cursor?.version===catalog.version)catalog={...catalog,token:cursor.token};
  register(catalog.files);
  client={...root,scope,accountId:connected.id,objects,catalog,graph:null};return client;
 }
 async function refresh(c,{fullScan=false}={}){
  let token=c.catalog.token,changed=false,files=new Map(c.catalog.files.map(f=>[f.id,f]));
  // A cursor alone cannot establish that this device discovered all existing commits.
  // Explicit recovery and first connection inventory the immutable notebook objects.
  let inventory=fullScan?(await listFiles(`trashed = false and appProperties has { key='rootId' and value='${c.rootId}' } and appProperties has { key='notebookId' and value='${c.notebookId}' } and (appProperties has { key='spinoType' and value='${COMMIT_MARKER}' } or appProperties has { key='spinoType' and value='${OBJECT_MARKER}' })`)).map(file=>({fileId:file.id,file})):[];
  do{
   const r=parse(await api(`/drive/v3/changes?pageSize=1000&spaces=drive&pageToken=${encodeURIComponent(token)}&fields=${encodeURIComponent('nextPageToken,newStartPageToken,changes(fileId,removed,file('+objectFields+'))')}`));
   if(!Array.isArray(r.changes))throw atomicFailure('Invalid Drive changes response.');
   for(const change of [...inventory,...r.changes]){
    const previous=files.get(change.fileId),f=change.file;
    const linked=state().link;
    if(linked?.id===change.fileId){
     if(change.removed||f?.trashed)throw atomicFailure('The Drive notebook is unavailable. Reconnect or choose your notebook again.','FILE_UNAVAILABLE');
     if(f?.appProperties?.spinoType===ROOT_MARKER){
      if(f.appProperties.rootId!==linked.rootId||f.appProperties.notebookId!==linked.notebookId)throw atomicFailure('The notebook identity does not match.');
      save({...state(),link:{...linked,name:f.name,storageFolderId:f.appProperties.storageFolder||linked.folderId,storageFolderName:(!f.appProperties.storageFolder||f.appProperties.storageFolder===linked.storageFolderId)?linked.storageFolderName||'':''}});
     }
    }
    if(previous&&(change.removed||f?.trashed)){throw atomicFailure('A synchronized notebook object was removed from Drive. Your local notebook is kept.','FILE_UNAVAILABLE');}
    if(f?.appProperties?.rootId===c.rootId&&f.appProperties.notebookId===c.notebookId&&[COMMIT_MARKER,OBJECT_MARKER].includes(f.appProperties.spinoType)){
     if(previous&&previous.appProperties.hash!==f.appProperties.hash)throw atomicFailure('An immutable notebook object was replaced. Your local notebook is kept.','INTEGRITY');
     if(previous&&!equal(previous,f)){await journal.set(c.scope+'/object/'+f.appProperties.hash,{id:f.id,verified:false});c.objects.invalidate(f.appProperties.hash);}
     if(!previous||!equal(previous,f))changed=true;
     c.objects.register(f);files.set(f.id,f);
    }
   }
   inventory=[];
   const next=r.nextPageToken||r.newStartPageToken;if(typeof next!=='string'||next===token&&r.nextPageToken)throw atomicFailure('Invalid Drive changes cursor.');token=next;if(!r.nextPageToken)break;
  }while(true);
  // Persist discovery only. Missing dependencies still block graph reconstruction and local application.
  const catalog={startToken:c.startToken,version:c.catalog.version+(changed?1:0),token,files:[...files.values()]};
  if(changed){await journal.set(c.scope+'/catalog',catalog);c.graph=null;}
  if(changed||token!==c.catalog.token)await journal.set(c.scope+'/cursor',{version:catalog.version,token});
  c.catalog=catalog;return changed;
 }
 async function graph(c,{refreshFeed=true,fullScan=false}={}){
  if(refreshFeed)await refresh(c,{fullScan});
  if(c.graph)return c.graph;
  report('receiving');
  const raw=new Map();
  if(fastReads){const checkpoints=c.catalog.files.filter(f=>Number(f.appProperties.checkpointCount)>0).sort((a,b)=>Number(b.appProperties.checkpointCount)-Number(a.appProperties.checkpointCount));
   if(checkpoints.length){report('checkpoint');try{const cached=await unpackCheckpoint(await c.objects.get(checkpoints[0].appProperties.hash));for(const [key,value] of cached)raw.set(key,value);}catch(error){if(!['INTEGRITY','LIMIT','FILE_UNAVAILABLE','INVALID_NOTEBOOK'].includes(error.code))throw error;report('receiving');}}}
  const get=async hash=>{if(raw.has(hash))return raw.get(hash);const value=await c.objects.get(hash);raw.set(hash,value);return value;};
  const commits=new Map(),pending=[...new Set([...(c.initialHeads||[]),...c.catalog.files.filter(f=>f.appProperties.spinoType===COMMIT_MARKER).map(f=>f.appProperties.hash)])];
  if(fastReads){
   // Existing notebooks have no checkpoint yet. Bound parallel reads, never writes.
   const prefetch=async hashes=>{const queue=[...new Set(hashes)].filter(h=>!raw.has(h));let index=0,failure=null,completed=0;await Promise.all(Array.from({length:Math.min(4,queue.length)},async()=>{while(index<queue.length&&!failure){const h=queue[index++];try{await get(h);report('receiving',++completed,queue.length);}catch(error){failure??=error;}}}));if(failure)throw failure;};
   await prefetch(pending);
   const parts=pending.flatMap(h=>validateCommit(raw.get(h),c.rootId,c.notebookId).parts);await prefetch(parts);
  }
  for(const hash of pending){
   if(commits.has(hash))continue;
   report('receiving',commits.size,pending.length);
   const commit=validateCommit(await get(hash),c.rootId,c.notebookId),changes=[];
   for(const part of commit.parts)changes.push(...structuredClone(validateChanges(await get(part))));
   for(const change of changes)if(change.value?.$spinoRecordParts){const refs=change.value.$spinoRecordParts;if(!Array.isArray(refs)||refs.length>1000||!refs.every(h=>hashPattern.test(h)))throw atomicFailure('Invalid large record reference.');const pieces=[];for(const h of refs){const piece=await get(h);if(piece.kind!=='large-record-part'||typeof piece.value!=='string')throw atomicFailure('Invalid large record content.');pieces.push(piece.value);}try{change.value=JSON.parse(pieces.join(''));}catch{throw atomicFailure('Invalid large record data.');}}
   if(new Set(changes.map(v=>v.key)).size!==changes.length)throw atomicFailure('An incremental commit repeats a record.');
   commits.set(hash,{...commit,changes});for(const parent of commit.parents)if(!pending.includes(parent))pending.push(parent);if(pending.length>100000)throw atomicFailure('Too many incremental commits.','LIMIT');
  }
  report('merging');
  const result=mergeCommitGraph(commits);c.graph=result;c.checkpointObjects=raw;return result;
 }
 async function publish(c,records,{force=[],base=null}={}){
  const before=base||await graph(c),changes=recordChanges(before.records,records,force).map(change=>({...change,previous:before.versions[change.key]||[]}));
  if(!changes.length)return before;
  report('sending');
  const parts=[];let chunk=[];
  for(const change of changes){
   // Oversized records are separate content objects; change batches remain small.
   let item=change;
   if(Object.hasOwn(change,'value')&&bytes(stableJSON(change))>60000){const text=stableJSON(change.value),pieces=[];for(let n=0;n<text.length;n+=200000)pieces.push(await c.objects.put({kind:'large-record-part',value:text.slice(n,n+200000)}));item={key:change.key,previous:change.previous,value:{$spinoRecordParts:pieces}};}
   if(chunk.length&&bytes(stableJSON({kind:'record-changes',changes:[...chunk,item]}))>64000){parts.push(await c.objects.put({kind:'record-changes',changes:chunk}));chunk=[];}chunk.push(item);
  }
  if(chunk.length)parts.push(await c.objects.put({kind:'record-changes',changes:chunk}));
  const commit={format:ATOMIC_FORMAT,rootId:c.rootId,notebookId:c.notebookId,parents:before.heads,parts};
  const hash=await c.objects.put(commit,{commit:true});
  // The commit is visible only after every referenced object has been verified.
  await refresh(c);return graph(c,{refreshFeed:false});
 }
 async function read(c,options){
  const materialized=await graph(c,options);if(c.lastGraph===materialized&&c.lastRead)return c.lastRead;
  report('scores');
  const result=materialized,backup=await recordsNotebook(result.records,c.objects.get,{deferred:fastReads});
  backup.cloudBackup={sharedNotebookId:c.notebookId,atomicHeads:result.heads};
  const text=stableJSON(backup);validate(text);const answer={text,hash:await backupHash(text),conflicts:result.conflicts,conflictKeys:result.conflictKeys,conflictDetails:result.conflictDetails,records:result.records,heads:result.heads,versions:result.versions};c.lastGraph=materialized;c.lastRead=answer;return answer;
 }
 async function link(root,file){const connected=await account();save({...state(),link:{id:file.id,name:file.name,notebookId:root.notebookId,rootId:root.rootId,folderId:root.folderId,startToken:root.startToken,initialHeads:root.initialHeads,accountId:connected.id,format:ATOMIC_FORMAT},setupPending:true,pending:null});}
 async function descriptor(id){const file=await metadata(id);if(file.appProperties?.spinoType!==ROOT_MARKER)throw atomicFailure('This is not an incremental SPino notebook.');const root=parse(await api(`/drive/v3/files/${id}?alt=media`));if(root.notebookId!==file.appProperties.notebookId||root.rootId!==file.appProperties.rootId)throw atomicFailure('The notebook descriptor identity does not match.');return {root,file};}
 async function allocate(key){let id=await journal.get(key);if(!id){id=parse(await api('/drive/v3/files/generateIds?count=1&space=drive&type=files')).ids?.[0];if(!validDriveId(id))throw atomicFailure('Drive did not allocate a notebook ID.');if(journal.claim)id=await journal.claim(key,id);else await journal.set(key,id);}return id;}
 async function createDescriptor(root,name,id){
  const existing=await api(`/drive/v3/files/${id}?fields=${objectFields}`,{missing:true});if(existing)return parse(existing);
  const boundary='spino_'+crypto.randomUUID().replaceAll('-',''),meta={id,name,mimeType:'application/json',parents:[root.folderId],appProperties:{spinoType:ROOT_MARKER,notebookId:root.notebookId,rootId:root.rootId,ready:root.origin?'0':'1'}};
  const text=`--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${stableJSON(root)}\r\n--${boundary}--\r\n`;
  await api('/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',text,contentType:'multipart/related; boundary='+boundary,allowConflict:true});return metadata(id);
 }
 async function createRoot(text,name,{origin=null}={}){
  const backup=validate(text),notebookId=JSON.parse(text).cloudBackup?.sharedNotebookId;if(!validNotebookId(notebookId))throw atomicFailure('Invalid notebook identity.');
  const connected=await account();if(!origin)save({...state(),pending:{notebookId,accountId:connected.id}});const id=await allocate('atomic2/'+connected.id+'/create/'+(origin||notebookId)),root={format:ATOMIC_FORMAT,rootId:origin||id,notebookId,...(origin?{origin}:{})};
  if(destination?.name)name=destination.name;
  root.folderId=destination?.folderId||await allocate('atomic2/'+connected.id+'/'+root.rootId+'/folder');
  const existingFolder=await api(`/drive/v3/files/${root.folderId}?fields=id,mimeType,trashed`,{missing:true});
  if(!existingFolder)await api('/drive/v3/files?fields=id',{method:'POST',allowConflict:true,text:JSON.stringify({id:root.folderId,name:'SPino — '+name.replace(/\.json$/i,'').slice(0,160),mimeType:'application/vnd.google-apps.folder',description:'SPino synchronized notebook objects. Keep this folder intact.'})});
  else if(parse(existingFolder).trashed||parse(existingFolder).mimeType!=='application/vnd.google-apps.folder')throw atomicFailure('The incremental notebook folder is unavailable.','FILE_UNAVAILABLE');
  const c=await open(root),records=await notebookRecords(backup,c.objects.put);await publish(c,records);
  const verified=await read(c);if(!equal(validate(verified.text).data,backup.data)||!equal(validate(verified.text).assets,backup.assets)){
   // Device-local preferences are deliberately absent from synchronized records.
   const local=await notebookRecords(backup,c.objects.put);if(!equal(local,verified.records))throw atomicFailure('The incremental notebook did not verify. Your local copy is kept.','INTEGRITY');
  }
  root.initialHeads=(await graph(c)).heads;const file=await createDescriptor(root,name,id);await descriptor(file.id);return {root,file,text:verified.text};
 }
 async function oldSnapshot(id){
  for(let attempt=0;attempt<3;attempt++){
   const query=`/drive/v2/files/${id}?fields=id,title,mimeType,properties,etag,labels(trashed)`,before=parse(await api(query));
   const properties=Object.fromEntries((before.properties||[]).filter(p=>p.visibility==='PRIVATE').map(p=>[p.key,p.value]));
   if(properties.spinoType===archivedMarker&&validDriveId(properties.atomicRoot))return {redirect:properties.atomicRoot};
   if(properties.spinoType!==oldMarker||before.labels?.trashed||before.mimeType!=='application/json'||!/^"[^"\r\n]+"$/.test(before.etag||''))throw atomicFailure('The previous notebook cannot be migrated safely. Your local copy is kept.');
   const connected=await account(),cacheKey='atomic2/'+connected.id+'/previous/'+id,cached=await journal.get(cacheKey);
   if(cached?.etag===before.etag){if(await backupHash(cached.text)!==cached.hash)throw atomicFailure('The previous notebook recovery cache is invalid.','INTEGRITY');return {...cached,backup:validate(cached.text)};}
   const text=(await api(`/drive/v3/files/${id}?alt=media`)).text,after=parse(await api(query));if(after.etag!==before.etag)continue;
   const backup=validate(text);if(JSON.parse(text).cloudBackup?.sharedNotebookId!==properties.notebookId)throw atomicFailure('The previous notebook identity does not match.');const snapshot={text,etag:after.etag,properties,name:before.title,hash:await backupHash(text)};await journal.set(cacheKey,snapshot);return {...snapshot,backup};
  }throw atomicFailure('The previous notebook is changing. Finish synchronization on the other device and retry.','CONFLICT');
 }
 async function activate(root,file){if(file.appProperties.ready==='1')return;if(root.origin){const previous=await metadata(root.origin);if(previous.appProperties?.spinoType!==archivedMarker||previous.appProperties.atomicRoot!==file.id)throw atomicFailure('The previous connection must finish migration first.','INCOMPLETE');}await api(`/drive/v2/files/${file.id}?fields=id`,{method:'PUT',text:JSON.stringify({properties:Object.entries({...file.appProperties,ready:'1'}).map(([key,value])=>({key,value,visibility:'PRIVATE'}))})});file.appProperties.ready='1';}
 async function migrate(id){
  const old=await oldSnapshot(id);if(old.redirect){const value=await descriptor(old.redirect);await read(await open(value.root));await activate(value.root,value.file);await link(value.root,value.file);return value;}
  if(preserveLegacy&&migrationConsent!==id)throw atomicFailure('Update Spino on all devices and synchronize their changes before converting this notebook.','MIGRATION_REQUIRED');
  migrationConsent=null;
  await recovery.saveRecovery({text:old.text});
  const created=await createRoot(old.text,old.name,{origin:id});
  const properties={...old.properties,spinoType:archivedMarker,atomicRoot:created.file.id};
  await api(`/drive/v2/files/${id}?fields=id`,{method:'PUT',etag:old.etag,text:JSON.stringify({properties:Object.entries(properties).map(([key,value])=>({key,value,visibility:'PRIVATE'}))})});
  await activate(created.root,created.file);await link(created.root,created.file);return created;
 }
 async function current(){
  const linkState=state().link;if(!linkState)throw atomicFailure('Select your Google Drive notebook first.','FILE_UNAVAILABLE');
  if(linkState.format!==ATOMIC_FORMAT){const migrated=await migrate(linkState.id);save({...state(),setupPending:false});return open(migrated.root);}
  return open({format:ATOMIC_FORMAT,rootId:linkState.rootId,folderId:linkState.folderId,notebookId:linkState.notebookId,startToken:linkState.startToken,initialHeads:linkState.initialHeads});
 }
 return {
  transport:'drive',
  authorizeMigration:id=>{if(!validDriveId(id))throw atomicFailure('Choose a notebook.');migrationConsent=id;},
  storageRequest:(path,options)=>serialized(()=>api(path,options)),
  storageLink:()=>({...state().link}),
  rememberStorage:({folderId,name,notebookName})=>{if(!validDriveId(folderId))throw atomicFailure('Choose a folder.');save({...state(),link:{...state().link,...(notebookName?{name:notebookName}:{}),storageFolderId:folderId,storageFolderName:name||''}});},
  setDestination:value=>{if(value&&(!validDriveId(value.folderId)||typeof value.name!=='string'||!value.name.trim()||value.name.length>200))throw atomicFailure('Choose a folder and file name.');destination=value;},
  onProgress:callback=>{progressListener=callback;},
  cancelPending:()=>requests.cancel(),
  get info(){const linked=state().link;return {transport:'drive',account:state().account||null,...(linked?{name:linked.name}:{}),fileId:linked?.id,folderId:linked?.folderId,storageFolderId:linked?.storageFolderId||linked?.folderId,storageFolderName:linked?.storageFolderName||'',notebookId:linked?.notebookId,incremental:true,syncFormat:linked?.format||'previous',progress};},
  pendingNotebookId:()=>state().pending?.notebookId,
  async connect(){const connected=await native.connect();if(state().link&&state().link.accountId!==connected.id)throw atomicFailure('Reconnect the Google account linked to this notebook.','ACCOUNT_MISMATCH');save({...state(),account:connected});return connected;},
  async status(){const result=await native.status(),linkState=state().link;return {linked:!!linkState,name:linkState?.name||'',mode:'sync',setupPending:!!state().setupPending,account:result.account,transport:'drive',recoveryAvailable:true};},
  async list(){
   const files=await listFiles(`trashed = false and (appProperties has { key='spinoType' and value='${ROOT_MARKER}' } or appProperties has { key='spinoType' and value='${oldMarker}' })`),roots=files.filter(f=>f.appProperties.spinoType===ROOT_MARKER&&f.appProperties.ready==='1'),origins=new Set(roots.map(f=>f.appProperties.rootId));
   for(const pending of files.filter(f=>f.appProperties.spinoType===ROOT_MARKER&&f.appProperties.ready!=='1')){const value=await descriptor(pending.id);try{await read(await open(value.root));await activate(value.root,value.file);roots.push(value.file);origins.add(value.root.rootId);}catch(error){if(error.code!=='INCOMPLETE')throw error;}}
   const unique=new Map();for(const file of [...roots,...files.filter(f=>f.appProperties.spinoType===oldMarker&&!origins.has(f.id))]){if(!validNotebookId(file.appProperties.notebookId))continue;const key=file.appProperties.rootId||file.id;if(!unique.has(key)||file.id<unique.get(key).id)unique.set(key,file);}return [...unique.values()];
  },
  describe:id=>serialized(async()=>{
   const file=await metadata(id);let text;
   if(file.appProperties?.spinoType===ROOT_MARKER){const value=await descriptor(id);text=(await read(await open(value.root),{fullScan:true})).text;}
   else{const old=await oldSnapshot(id);if(old.redirect){const value=await descriptor(old.redirect);text=(await read(await open(value.root),{fullScan:true})).text;}else text=old.text;}
   const backup=validate(text),sessions=backup.data.sessions||[];
   return {sessions:sessions.map(s=>({id:s.id,date:s.date,elapsedMs:s.elapsedMs||0})),works:backup.data.works?.length||0,weeklyMinutes:backup.data.preferences?.weeklyMinutes||0};
  }),
  rename:name=>serialized(async()=>{
   name=String(name).trim();if(!name||name.length>200||/[\x00-\x1f]/.test(name))throw atomicFailure('Enter a notebook name between 1 and 200 characters.');
   await current();const linked=state().link;
   const before=await metadata(linked.id);if(before.appProperties?.rootId!==linked.rootId||before.appProperties?.notebookId!==linked.notebookId)throw atomicFailure('The notebook identity does not match.');
   await api(`/drive/v2/files/${linked.id}?fields=id,title`,{method:'PUT',text:JSON.stringify({title:name})});
   const after=await metadata(linked.id);if(after.name!==name)throw atomicFailure('The new notebook name could not be verified. Retry renaming.','PROVIDER_ERROR');
   save({...state(),link:{...state().link,name}});return {name};
  }),
  choose(id){if(!validDriveId(id))throw atomicFailure('Invalid notebook ID.');selected=id;},
  pickBackup:options=>serialized(async()=>{if(!selected)throw atomicFailure('Select your Google Drive notebook first.');if(options?.expectedFileId&&selected!==options.expectedFileId)throw atomicFailure('The selected Drive file does not match the notebook QR.');const file=await metadata(selected);if(options?.expectedNotebookId&&file.appProperties?.notebookId!==options.expectedNotebookId)throw atomicFailure('The selected notebook identity does not match.');const value=file.appProperties.spinoType===ROOT_MARKER?await descriptor(selected):await migrate(selected);await activate(value.root,value.file);await link(value.root,value.file);selected=null;const r=await read(await open(value.root),{fullScan:true});return {text:r.text,name:value.file.name};}),
  create:({text,name='SPino notebook.json'})=>serialized(async()=>{const value=await createRoot(text,name);await link(value.root,value.file);return {name:value.file.name};}),
  readLinked:options=>serialized(async()=>read(await current(),options)),
  write:({text,expectedHash})=>serialized(async()=>{const c=await current(),before=await read(c);if(before.hash!==expectedHash)throw atomicFailure('The Drive notebook changed. Reading the latest changes before retrying.','CONFLICT');const backup=validate(text);if(JSON.parse(text).cloudBackup?.sharedNotebookId!==c.notebookId)throw atomicFailure('Notebook identity cannot change during synchronization.');await recovery.saveRecovery({text:before.text});const records=await notebookRecords(backup,c.objects.put);await publish(c,records,{force:before.conflictKeys,base:before});return {providerAccepted:true};}),
  resolveRemote:({local,merged,preference,expectedHash})=>serialized(async()=>{const c=await current(),before=await read(c);if(before.hash!==expectedHash)throw atomicFailure('The synchronized conflict changed. Review the latest changes.','CONFLICT');const wanted=await notebookRecords(validate(merged),c.objects.put),localRecords=await notebookRecords(validate(local),c.objects.put);for(const key of before.conflictKeys){
   if(preference!=='local'){if(Object.hasOwn(before.records,key))wanted[key]=before.records[key];else delete wanted[key];continue;}
   const detail=before.conflictDetails[key],wrap=value=>value===undefined?{}:{record:value};
   // Apply the reviewed choice only to conflicting fields, retaining independent edits in the same record.
   const resolved=mergeNotebooks(detail.hasBase?wrap(detail.base):null,wrap(localRecords[key]),wrap(before.records[key]),'local',detail.paths).backup.record;
   if(resolved!==undefined)wanted[key]=resolved;else delete wanted[key];
  }const backup=await recordsNotebook(wanted,c.objects.get);backup.cloudBackup={sharedNotebookId:c.notebookId};return stableJSON(backup);}),
  prepareCheckpoint:()=>serialized(async()=>{const c=await current();await graph(c);const packed=packCheckpoint(c.checkpointObjects||new Map());if(!packed)return {created:false};const count=[...(c.checkpointObjects||new Map()).values()].filter(v=>v?.format===ATOMIC_FORMAT).length;if(!count)return {created:false};const existing=Math.max(0,...c.catalog.files.map(f=>Number(f.appProperties.checkpointCount)||0));if(existing&&count<existing+20)return {created:true,reused:true,count:existing};report('checkpoint');await c.objects.put(packed,{checkpointCount:count});return {created:true,count};}),
  downloadAsset:id=>serialized(async()=>{const c=await current(),g=await graph(c),key='asset/'+encodeURIComponent(id);if(!g.records[key])throw atomicFailure('This score is no longer in the notebook.','FILE_UNAVAILABLE');report('scores');return {...(await recordsNotebook({header:g.records.header,[key]:g.records[key]},c.objects.get)).assets[0],remoteContent:g.records[key].content};}),
  async acknowledgeSetup(){save({...state(),setupPending:false});},
  saveRecovery:o=>recovery.saveRecovery(o),readRecovery:()=>recovery.readRecovery(),
  async clearDeviceCache(){if(requests.busy)throw atomicFailure('Wait for synchronization.','BUSY');await journal.clear();client=null;},
  async disconnect(){if(requests.busy)throw atomicFailure('Wait for synchronization.','BUSY');await native.disconnect();save({});client=null;selected=null;}
 };
}
