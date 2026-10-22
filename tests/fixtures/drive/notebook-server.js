// In-memory Drive REST fixture. Never connects to Google or reads a personal notebook.
export function syntheticNotebookDrive(){
 const state={files:new Map(),requests:[],nextID:1,offline:false,revoked:false,dropMediaResponse:false,beforePatch:null,beforeRead:null,beforeCommit:null,omitEtag:false,separateMediaEtag:true,changes:[],includeChecksum:false,checksums:new Map(),responseBytes:0};
 const response=(status,text='',etag=null)=>{const body=typeof text==='string'?text:JSON.stringify(text);state.responseBytes+=new TextEncoder().encode(body).length;return {status,text:body,etag};};
 const metadata=f=>({id:f.id,name:f.name,mimeType:f.mimeType,version:String(f.revision||1),appProperties:{...f.appProperties},size:String(new TextEncoder().encode(f.text||'').length),trashed:false,...(state.includeChecksum&&state.checksums.has(f.id)?{sha256Checksum:state.checksums.get(f.id)}:{})});
 const etag=f=>'"drive-revision-'+f.revision+'"';
 state.touch=file=>state.changes.push({fileId:file.id,file:metadata(file)});
 state.native=(id='synthetic-owner')=>{
  let connected={id,email:id+'@example.invalid',name:'Synthetic Google account'};
  return {status:async()=>({account:connected}),connect:async()=>{if(state.offline)throw Object.assign(Error('Synthetic offline connection'),{code:'PROVIDER_ERROR'});connected={id,email:id+'@example.invalid',name:'Synthetic Google account'};state.revoked=false;return connected;},disconnect:async()=>{connected=null;},
   request:async options=>{
    if(state.offline)throw Object.assign(Error('Synthetic offline connection'),{code:'PROVIDER_ERROR'});
    if(state.revoked)throw Object.assign(Error('Synthetic revoked permission'),{code:'PERMISSION_REQUIRED'});
    if(!connected||options.accountId!==connected.id)throw Object.assign(Error('Account mismatch'),{code:'ACCOUNT_MISMATCH'});
    state.requests.push(structuredClone(options));
    const u=new URL(options.path,'https://www.googleapis.com'),method=options.method||'GET';
    if(u.pathname==='/drive/v3/changes/startPageToken')return response(200,{startPageToken:String(state.changes.length)});
    if(u.pathname==='/drive/v3/changes'){
     const start=Number(u.searchParams.get('pageToken')),end=Math.min(start+1000,state.changes.length);
     return response(200,{changes:state.changes.slice(start,end).filter(c=>state.files.get(c.fileId)?.owner===id),...(end<state.changes.length?{nextPageToken:String(end)}:{newStartPageToken:String(end)})});
    }
    if(u.pathname==='/drive/v3/files/generateIds')return response(200,{ids:['synthetic-file-'+state.nextID++]});
    if(u.pathname==='/drive/v3/files'&&method==='GET'){
     const q=u.searchParams.get('q')||'',constraints=[...q.matchAll(/key='([^']+)' and value='([^']+)'/g)],types=constraints.filter(m=>m[1]==='spinoType').map(m=>m[2]);
     const matches=[...state.files.values()].filter(f=>f.owner===id&&(!types.length||types.includes(f.appProperties?.spinoType))&&constraints.filter(m=>m[1]!=='spinoType').every(m=>f.appProperties?.[m[1]]===m[2]));
     const start=Number(u.searchParams.get('pageToken')||0),end=Math.min(start+100,matches.length);
     return response(200,{files:matches.slice(start,end).map(metadata),...(end<matches.length?{nextPageToken:String(end)}:{})});
    }
    if(u.pathname==='/upload/drive/v3/files'&&method==='POST'&&options.contentType?.startsWith('multipart/related')){
     const boundary=options.contentType.split('boundary=')[1],parts=options.text.split('--'+boundary),payload=part=>part.slice(part.indexOf('\r\n\r\n')+4).replace(/\r\n$/,'');
     const meta=JSON.parse(payload(parts[1])),text=payload(parts[2]);
     if(state.files.has(meta.id))return response(409);
     if(meta.appProperties.spinoType==='spino-commit-v2'&&state.beforeCommit)await state.beforeCommit(meta,text);
     const file={...meta,owner:id,text,revision:1};state.checksums.set(file.id,Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(v=>v.toString(16).padStart(2,'0')).join(''));state.files.set(file.id,file);state.touch(file);
     if(state.dropMediaResponse){state.dropMediaResponse=false;throw Object.assign(Error('Synthetic lost upload response'),{code:'PROVIDER_ERROR'});}
     return response(200,metadata(file));
    }
    if(u.pathname==='/drive/v3/files'&&method==='POST'){
     const f=JSON.parse(options.text);if(state.files.has(f.id))return response(409);
     const file={...f,owner:id,text:'',revision:1};state.files.set(f.id,file);state.touch(file);return response(200,{id:f.id});
    }
    const file=state.files.get(u.pathname.split('/').pop());
    if(!file||file.owner!==id)return response(404);
    if(method==='GET'){
     if(u.searchParams.get('alt')==='media'&&state.beforeRead){const hook=state.beforeRead;state.beforeRead=null;hook(file);}
     const expected=u.searchParams.get('alt')==='media'&&state.separateMediaEtag?'"media-'+file.revision+'"':etag(file);
     if(options.etag&&options.etag!==expected)return response(412);
     const data=u.pathname.startsWith('/drive/v2/')?{id:file.id,title:file.name,mimeType:file.mimeType,properties:Object.entries(file.appProperties).map(([key,value])=>({key,value,visibility:'PRIVATE'})),fileSize:metadata(file).size,labels:{trashed:false},...(state.omitEtag?{}:{etag:etag(file)})}:metadata(file);
     return response(200,u.searchParams.get('alt')==='media'?file.text:data);
    }
    if(method==='PUT'&&u.pathname.includes('/drive/v2/files/')){
     if(state.beforePatch){const hook=state.beforePatch;state.beforePatch=null;hook(file);}
     if(options.etag&&options.etag!==etag(file))return response(412);
     if(u.pathname.startsWith('/upload/'))file.text=options.text;
     else {const changes=JSON.parse(options.text);if(changes.title)file.name=changes.title;if(changes.properties)for(const p of changes.properties)if(p.visibility==='PRIVATE')file.appProperties[p.key]=p.value;}
     file.revision++;state.touch(file);
     if(state.dropMediaResponse&&u.pathname.startsWith('/upload/')){state.dropMediaResponse=false;throw Object.assign(Error('Synthetic lost upload response'),{code:'PROVIDER_ERROR'});}
     return response(200,{id:file.id},etag(file));
    }
    return response(400);
   }};
 };
 return state;
}
