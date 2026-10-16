// In-memory Drive REST fixture. Never connects to Google or reads a personal notebook.
export function syntheticNotebookDrive(){
 const state={files:new Map(),requests:[],nextID:1,offline:false,revoked:false,dropMediaResponse:false,beforePatch:null,beforeRead:null,omitEtag:false};
 const response=(status,text='',etag=null)=>({status,text:typeof text==='string'?text:JSON.stringify(text),etag});
 const metadata=f=>({id:f.id,name:f.name,mimeType:f.mimeType,appProperties:{...f.appProperties},size:String(new TextEncoder().encode(f.text||'').length),trashed:false});
 const etag=f=>'"drive-revision-'+f.revision+'"';
 state.native=(id='synthetic-owner')=>{
   let connected={id,email:id+'@example.invalid',name:'Synthetic Google account'};
   return {status:async()=>({account:connected}),connect:async()=>{if(state.offline)throw Object.assign(Error('Synthetic offline connection'),{code:'PROVIDER_ERROR'});connected={id,email:id+'@example.invalid',name:'Synthetic Google account'};state.revoked=false;return connected;},disconnect:async()=>{connected=null;},
    request:async options=>{
     if(state.offline)throw Object.assign(Error('Synthetic offline connection'),{code:'PROVIDER_ERROR'});
     if(state.revoked)throw Object.assign(Error('Synthetic revoked permission'),{code:'PERMISSION_REQUIRED'});
     if(!connected||options.accountId!==connected.id)throw Object.assign(Error('Account mismatch'),{code:'ACCOUNT_MISMATCH'});
     state.requests.push(structuredClone(options));
     const u=new URL(options.path,'https://www.googleapis.com'),method=options.method||'GET';
     if(u.pathname==='/drive/v3/files/generateIds')return response(200,{ids:['synthetic-file-'+state.nextID++]});
     if(u.pathname==='/drive/v3/files'&&method==='GET')return response(200,{files:[...state.files.values()].filter(f=>f.owner===id&&f.appProperties?.ready==='1'&&f.appProperties?.spinoType==='spino-notebook-v1').map(metadata)});
     if(u.pathname==='/drive/v3/files'&&method==='POST'){
       const f=JSON.parse(options.text);if(state.files.has(f.id))return response(409);
       state.files.set(f.id,{...f,owner:id,text:'',revision:1});return response(200,{id:f.id});
     }
     const file=state.files.get(u.pathname.split('/').pop());
     if(!file||file.owner!==id)return response(404);
     if(method==='GET'){
       if(u.searchParams.get('alt')==='media'&&state.beforeRead){const hook=state.beforeRead;state.beforeRead=null;hook(file);}
       if(options.etag&&options.etag!==etag(file))return response(412);
       // v3 has no ETag header; v2 exposes the file ETag in the JSON resource.
       const data=u.pathname.startsWith('/drive/v2/')?{id:file.id,title:file.name,mimeType:file.mimeType,properties:Object.entries(file.appProperties).map(([key,value])=>({key,value,visibility:'PRIVATE'})),fileSize:metadata(file).size,labels:{trashed:false},...(state.omitEtag?{}:{etag:etag(file)})}:metadata(file);
       return response(200,u.searchParams.get('alt')==='media'?file.text:data);
     }
     if(method==='PUT'&&u.pathname.includes('/drive/v2/files/')){
       if(state.beforePatch){const hook=state.beforePatch;state.beforePatch=null;hook(file);}
       if(!options.etag||options.etag!==etag(file))return response(412);
       if(u.pathname.startsWith('/upload/'))file.text=options.text;
       else {const changes=JSON.parse(options.text);if(changes.properties)for(const p of changes.properties)if(p.visibility==='PRIVATE')file.appProperties[p.key]=p.value;}
       file.revision++;
       if(state.dropMediaResponse&&u.pathname.startsWith('/upload/')){state.dropMediaResponse=false;throw Object.assign(Error('Synthetic lost upload response'),{code:'PROVIDER_ERROR'});}
       return response(200,{id:file.id},etag(file));
     }
     return response(400);
    }};
 };
 return state;
}
