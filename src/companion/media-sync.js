import {mediaHash,recordingChecksum} from './drive-media.js';

const takeId=record=>record.mediaTakeId||record.id;

// Copies are additive. Deleting a local take keeps its cloud copy and records a local exclusion.
export function createMediaSync({store, connection, getContext, eligible, changed=()=>{}, refreshed=()=>{}, network=async()=>({online:true,wifi:true,metered:false}), delay=30000}) {
  let state={status:'idle',completed:0,total:0,percent:0,error:'',issues:[]},task=null,timer=null,controller=null,stopped=false;
  const publish=next=>{state={...state,...next};changed();};
  const contextKey=c=>c&&c.accountId+'.'+c.notebookId;
  const current=(key)=>eligible()&&contextKey(getContext())===key&&!controller?.signal.aborted;
  const schedule=(ms=delay)=>{if(!stopped&&!timer)timer=setTimeout(()=>{timer=null;void sync();},ms);};
  async function sync(){
    if(stopped)return;
    if(task)return task;
    const context=getContext();if(!context||!eligible()){schedule();return;}
    controller=new AbortController();const signal=controller.signal,key=contextKey(context);
    task=(async()=>{
      let client,completed=0;
      const issues=[],blockedTakes=new Set(),blockedFiles=new Set();
      const recordIssue=(record,error,remote=false)=>{
        const issueTakeId=remote?record?.appProperties?.takeId:(record?takeId(record):undefined);
        const fileId=remote?record?.id:record?.cloud?.fileId;
        if(issueTakeId)blockedTakes.add(issueTakeId);
        if(fileId)blockedFiles.add(fileId);
        issues.push({takeId:issueTakeId,fileId,title:(remote?record?.name:record?.title)||'',message:error.message||String(error)});
      };
      const attempt=async(record,operation,remote=false)=>{
        try{await operation();return true;}
        catch(error){
          if(!current(key))return false;
          recordIssue(record,error,remote);
          // File problems do not stop independent copies; connection/storage failures do.
          if(!['INVALID_MEDIA','INTEGRITY','IDENTITY_CONFLICT'].includes(error.code))throw error;
          return false;
        }
      };
      const integrity=message=>Object.assign(Error(message),{code:'INTEGRITY'});
      try{
        const policy=await network();if(!policy.online||context.wifiOnly&&(!policy.wifi||policy.metered)){publish({status:policy.online?'wifi':'offline'});return;}
        publish({status:'checking',completed:0,total:0,percent:0,error:'',issues:[]});
        client=await connection(context);if(!current(key))return;
        const byTake=new Map();for(const f of await client.list({onInvalid:(file,error)=>recordIssue(file,error,true)})){const previous=byTake.get(f.appProperties.takeId);if(previous&&(recordingChecksum(previous)!==recordingChecksum(f)||previous.appProperties.workId!==f.appProperties.workId))recordIssue(f,Error('Recording identity conflict. Local recordings were kept.'),true);if(!previous)byTake.set(f.appProperties.takeId,f);}
        if(!current(key))return;
        const local=await store.index(),works=new Map(context.works.map(w=>[w.id,w]));
        for(const r of local)if(r.cloud?.accountId===context.accountId&&r.cloud?.notebookId===context.notebookId&&blockedFiles.has(r.cloud.fileId))blockedTakes.add(takeId(r));
        const remote=[...byTake.values()].filter(f=>!blockedTakes.has(f.appProperties.takeId));
        const uploads=local.filter(r=>!blockedTakes.has(takeId(r))&&!r.draft&&(r.workId===''||works.has(r.workId))&&(!r.cloud||r.cloud.accountId===context.accountId&&r.cloud.notebookId===context.notebookId)&&!remote.some(f=>f.appProperties.takeId===takeId(r)));
        const downloads=[];
        for(const f of remote){const p=f.appProperties;if(!(p.workId===''||works.has(p.workId))||await store.ignored(key,p.takeId))continue;const exists=local.find(r=>takeId(r)===p.takeId);if(!exists)downloads.push(f);else if(exists.workId!==p.workId||exists.cloud?.sha256&&exists.cloud.sha256!==p.sha256)recordIssue(f,Error('Recording identity conflict. Local recordings were kept.'),true);}
        const total=uploads.length+downloads.length;
        if(total)publish({status:'copying',completed,total,percent:0,error:''});
        for(const row of uploads){
          if(!current(key))return;
          const record=await store.get(row.id);if(!record||record.draft||takeId(record)!==takeId(row))continue;
          const copied=await attempt(record,async()=>{
          await store.attachCloud(record.id,{accountId:context.accountId,notebookId:context.notebookId,pending:true},takeId(record));
          const file=await client.upload({takeId:takeId(record),workId:record.workId,title:record.title,blob:record.blob,createdAt:record.createdAt,durationMs:record.durationMs,signal,onProgress:(done,bytes)=>publish({percent:Math.floor(done/bytes*100)})});
          if(!current(key))return;
          await store.attachCloud(record.id,{accountId:context.accountId,notebookId:context.notebookId,fileId:file.id,sha256:recordingChecksum(file)},takeId(record));
          });
          if(copied&&current(key))publish({completed:++completed,percent:0});
        }
        for(const file of downloads){
          if(!current(key))return;
          const copied=await attempt(file,async()=>{
          const result=await client.download(file.id);
          try{
            if(!current(key))return;
            const p=file.appProperties,blob=result.blob;
            if(!(blob instanceof Blob)||blob.size!==Number(file.size)||!result.verified&&await mediaHash(blob)!==recordingChecksum(file))throw integrity('Downloaded recording failed verification. Local recordings were kept.');
            const durationMs=Number(p.durationMs),createdAt=p.createdAt;
            if(!Number.isFinite(durationMs)||durationMs<0||!Number.isFinite(Date.parse(createdAt)))throw integrity('Invalid recording dates or duration.');
            await store.importRemote({id:p.takeId,workId:p.workId,workTitle:works.get(p.workId)?.title||'',title:file.name,createdAt,durationMs,kind:file.mimeType.startsWith('video/')?'video':'audio',draft:false,blob,cloud:{accountId:context.accountId,notebookId:context.notebookId,fileId:file.id,sha256:p.sha256}},key);
          }finally{await result.cleanup?.();}
          },true);
          if(copied&&current(key))publish({completed:++completed,percent:0});
        }
        // Attach existing copies after a lost response, without rewriting titles edited locally.
        for(const f of remote){
          if(!current(key))return;
          const r=local.find(r=>takeId(r)===f.appProperties.takeId);if(r&&!blockedTakes.has(takeId(r))&&(!r.cloud||r.cloud.pending)&&!r.draft&&(r.workId===''||works.has(r.workId)))await attempt(r,async()=>{const record=await store.get(r.id);if(record&&await mediaHash(record.blob)!==recordingChecksum(f))throw integrity('Recording identity conflict. Local recordings were kept.');if(record&&current(key))await store.attachCloud(r.id,{accountId:context.accountId,notebookId:context.notebookId,fileId:f.id,sha256:recordingChecksum(f)},takeId(r));});
        }
        if(current(key))publish(issues.length?{status:'error',completed,total,issues,error:'Some recording copies need attention. Local files are kept.',percent:0}:{status:'saved',completed,total,issues:[],error:'',percent:100,lastCheckedAt:new Date().toISOString()});
      }catch(error){if(current(key))publish({status:'error',issues,error:error.message||String(error)});}
      finally{try{if(completed&&current(key))await refreshed();}finally{task=null;controller=null;schedule();}}
    })();return task;
  }
  return {get state(){return {...state};},get busy(){return !!task;},sync,markDirty:()=>{if(timer)clearTimeout(timer);timer=null;schedule(1500);},pause(){controller?.abort();publish({status:'paused'});},stop(){stopped=true;clearTimeout(timer);timer=null;controller?.abort();}};
}
