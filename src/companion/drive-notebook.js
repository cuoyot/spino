import {backupHash} from './cloud-backup.js';
import {validNotebookId} from './device-link.js';
import {validateBackup} from './model.js';

const marker='spino-notebook-v1',limit=60000000;
const failure=(message,code='PROVIDER_ERROR')=>Object.assign(new Error(message),{code});
const fileID=id=>{if(typeof id!=='string'||! /^[\w-]{1,180}$/.test(id))throw failure('Invalid Drive notebook file.','INVALID_REQUEST');return id;};
const fields='id,name,mimeType,appProperties,size,trashed';
const revision=etag=>{if(typeof etag!=='string'||!/^"[^"\r\n]+"$/.test(etag))throw failure('Drive did not provide a safe file revision. No changes were uploaded.','REVISION_REQUIRED');return etag;};

// Account and link metadata are local. Tokens are owned exclusively by the native adapter.
export function createDriveNotebookAdapter({native,recovery,settings,validate=validateBackup}){
  let state=settings.read()||{},selected=null,cache=null;
  const save=next=>{settings.save(next);state=next;};
  const parse=text=>{const value=validate(text);const id=JSON.parse(text).cloudBackup?.sharedNotebookId;if(!validNotebookId(id))throw failure('This Drive file has no valid notebook identity.','INVALID_NOTEBOOK');return {value,id};};
  async function account(){const result=await native.status();return result.account?.id?result.account:null;}
  async function api(path,{method='GET',text,etag,missing=false}={}){
    const connected=await account();if(!connected)throw failure('Connect your Google Drive account. Your notebook is saved locally.','PERMISSION_REQUIRED');
    if(state.link&&state.link.accountId!==connected.id)throw failure('Reconnect the Google account linked to this notebook.','ACCOUNT_MISMATCH');
    const response=await native.request({path,method,text,etag,accountId:connected.id});
    if(missing&&response.status===404)return null;
    if(response.status===412||response.status===409)throw failure('The Drive notebook changed. Reading the latest changes before retrying.','CONFLICT');
    if(response.status===401||response.status===403)throw failure('Reconnect Google Drive or check your storage and file access. Your notebook is saved locally.','PERMISSION_REQUIRED');
    if(response.status===404)throw failure('The Drive notebook is unavailable. Reconnect or choose your notebook again.','FILE_UNAVAILABLE');
    if(response.status<200||response.status>=300)throw failure('Google Drive could not complete the update. Your notebook is saved locally.');
    return response;
  }
  const json=response=>JSON.parse(response.text);
  async function metadata(id,{missing=false}={}){
    const r=await api(`/drive/v3/files/${fileID(id)}?fields=${fields}`,{missing});if(!r)return null;
    const file=json(r);if(file.trashed||file.mimeType!=='application/json'||file.appProperties?.spinoType!==marker)throw failure('This is not an available SPino Drive notebook.','INVALID_NOTEBOOK');
    if(!validNotebookId(file.appProperties.notebookId)||Number(file.size||0)>limit)throw failure('The Drive notebook identity or size is invalid.','INVALID_NOTEBOOK');
    return {...file,etag:revision(r.etag)};
  }
  async function readRemote(id,{unfinished=false}={}){
    const file=await metadata(id);
    if(!unfinished&&file.appProperties.ready!=='1')throw failure('This notebook upload is incomplete. Retry on the original device.','INCOMPLETE');
    if(cache?.id===file.id&&cache.etag===file.etag)return {...file,text:cache.text,hash:cache.hash};
    const result=await api(`/drive/v3/files/${fileID(id)}?alt=media`,{etag:file.etag});
    if(new TextEncoder().encode(result.text).length>limit)throw failure('The notebook exceeds 60 MB.','INVALID_NOTEBOOK');
    const parsed=parse(result.text);if(parsed.id!==file.appProperties.notebookId)throw failure('The Drive file belongs to another notebook.','INVALID_NOTEBOOK');
    cache={id:file.id,etag:file.etag,text:result.text,hash:await backupHash(result.text)};
    return {...file,text:cache.text,hash:cache.hash};
  }
  async function link(file){const connected=await account();save({...state,link:{id:file.id,name:file.name,notebookId:file.appProperties.notebookId,accountId:connected.id,hash:file.hash},setupPending:true,pending:null});}
  return {
    transport:'drive',
    get info(){return {transport:'drive',account:state.account||null};},
    pendingNotebookId:()=>state.pending?.notebookId,
    async connect(){const connected=await native.connect();if(state.link&&state.link.accountId!==connected.id)throw failure('Reconnect the Google account linked to this notebook.','ACCOUNT_MISMATCH');save({...state,account:connected});return connected;},
    async status(){const connected=await account();return {linked:!!state.link,name:state.link?.name||'',mode:'sync',setupPending:!!state.setupPending,account:connected,transport:'drive',recoveryAvailable:true};},
    async list(){
      const result=[];let pageToken='';
      do{
        const query=`trashed = false and appProperties has { key='spinoType' and value='${marker}' } and appProperties has { key='ready' and value='1' }`;
        const response=json(await api('/drive/v3/files?spaces=drive&pageSize=100&fields=nextPageToken,files('+fields+')&q='+encodeURIComponent(query)+(pageToken?'&pageToken='+encodeURIComponent(pageToken):'')));
        for(const f of response.files||[])if(f.appProperties?.spinoType===marker&&f.appProperties.ready==='1'&&validNotebookId(f.appProperties.notebookId)&&!f.trashed)result.push(f);
        pageToken=response.nextPageToken||'';if(result.length>1000)throw failure('Too many notebooks. Use the notebook QR to narrow the selection.');
      }while(pageToken);
      return result;
    },
    choose(id){selected=fileID(id);},
    async pickBackup({expectedNotebookId}={}){
      if(!selected)throw failure('Select your Google Drive notebook first.','SELECT_NOTEBOOK');
      const file=await readRemote(selected);
      if(expectedNotebookId&&file.appProperties.notebookId!==expectedNotebookId)throw failure('This Drive file does not match the notebook QR.','INVALID_NOTEBOOK');
      await link(file);selected=null;return {text:file.text,name:file.name};
    },
    async create({text,name='SPino notebook.json'}){
      const {id:notebookId}=parse(text);
      if(new TextEncoder().encode(text).length>limit)throw failure('The notebook exceeds 60 MB.');
      const connected=await account();if(!connected)throw failure('Connect Google Drive first.','PERMISSION_REQUIRED');
      let pending=state.pending;
      if(!pending||pending.notebookId!==notebookId||pending.accountId!==connected.id){
        const generated=json(await api('/drive/v3/files/generateIds?count=1&space=drive&type=files'));
        pending={id:fileID(generated.ids?.[0]),notebookId,accountId:connected.id};save({...state,pending});
      }
      let file=await metadata(pending.id,{missing:true});
      if(!file){
        await api('/drive/v3/files?fields=id',{method:'POST',text:JSON.stringify({id:pending.id,name,mimeType:'application/json',appProperties:{spinoType:marker,notebookId,ready:'0'}})});
        file=await metadata(pending.id);
      }
      if(file.appProperties.notebookId!==notebookId)throw failure('The pending upload belongs to another notebook.','INVALID_NOTEBOOK');
      if(file.appProperties.ready==='1'){
        const remote=await readRemote(file.id);await link(remote);return {name:remote.name,text:remote.text,joined:true};
      }
      await api(`/upload/drive/v3/files/${file.id}?uploadType=media&fields=id`,{method:'PATCH',text,etag:file.etag});
      let verified=await readRemote(file.id,{unfinished:true});
      if(verified.hash!==await backupHash(text))throw failure('Drive did not return the complete notebook. Your local copy is kept.');
      await api(`/drive/v3/files/${file.id}?fields=id`,{method:'PATCH',text:JSON.stringify({appProperties:{ready:'1'}}),etag:verified.etag});
      verified=await readRemote(file.id);await link(verified);return {name:verified.name};
    },
    async readLinked(){
      if(!state.link)throw failure('Select your Drive notebook first.','FILE_UNAVAILABLE');
      const file=await readRemote(state.link.id);
      if(file.appProperties.notebookId!==state.link.notebookId)throw failure('The linked file belongs to another notebook.','INVALID_NOTEBOOK');
      return {text:file.text,hash:file.hash};
    },
    async write({text,expectedHash}){
      if(!state.link)throw failure('Select your Drive notebook first.','FILE_UNAVAILABLE');
      const parsed=parse(text);if(parsed.id!==state.link.notebookId)throw failure('Notebook identity cannot change during synchronization.','INVALID_NOTEBOOK');
      const before=await readRemote(state.link.id);if(before.hash!==expectedHash)throw failure('The Drive notebook changed. Reading the latest changes before retrying.','CONFLICT');
      await recovery.saveRecovery({text:before.text});
      await api(`/upload/drive/v3/files/${before.id}?uploadType=media&fields=id`,{method:'PATCH',text,etag:before.etag});
      const after=await readRemote(before.id);
      // A later writer may have committed after us: re-read/merge, never overwrite it blindly.
      if(after.hash!==await backupHash(text))throw failure('The Drive notebook changed during verification.','CONFLICT');
      save({...state,link:{...state.link,hash:after.hash}});return {providerAccepted:true};
    },
    async acknowledgeSetup(){save({...state,setupPending:false});},
    saveRecovery:options=>recovery.saveRecovery(options),
    readRecovery:()=>recovery.readRecovery(),
    async disconnect(){await native.disconnect();save({});selected=null;cache=null;},
  };
}
