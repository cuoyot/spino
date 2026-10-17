import {mediaHash} from './drive-media.js';

// Copies are additive. Deleting a local take keeps its cloud copy and records a local exclusion.
export function createMediaSync({store, connection, getContext, eligible, changed=()=>{}, refreshed=()=>{}, network=async()=>({online:true,wifi:true,metered:false}), delay=30000}) {
  let state={status:'idle',completed:0,total:0,percent:0,error:''},task=null,timer=null,controller=null,stopped=false;
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
      let client;
      try{
        const policy=await network();if(!policy.online||context.wifiOnly&&(!policy.wifi||policy.metered)){publish({status:policy.online?'wifi':'offline'});return;}
        client=await connection(context);if(!current(key))return;
        const byTake=new Map();for(const f of await client.list()){const previous=byTake.get(f.appProperties.takeId);if(previous&&(previous.sha256Checksum!==f.sha256Checksum||previous.appProperties.workId!==f.appProperties.workId))throw Error('Recording identity conflict. Local recordings were kept.');if(!previous)byTake.set(f.appProperties.takeId,f);}
        const remote=[...byTake.values()],local=await store.index(),works=new Map(context.works.map(w=>[w.id,w]));
        const uploads=local.filter(r=>!r.draft&&(r.workId===''||works.has(r.workId))&&(!r.cloud||r.cloud.accountId===context.accountId&&r.cloud.notebookId===context.notebookId)&&!remote.some(f=>f.appProperties.takeId===r.id));
        const downloads=[];
        for(const f of remote){const p=f.appProperties;if(!(p.workId===''||works.has(p.workId))||await store.ignored(key,p.takeId))continue;const exists=local.find(r=>r.id===p.takeId);if(!exists)downloads.push(f);else if(exists.workId!==p.workId||exists.cloud?.sha256&&exists.cloud.sha256!==p.sha256)throw Error('Recording identity conflict. Local recordings were kept.');}
        const total=uploads.length+downloads.length;let completed=0;
        if(total)publish({status:'copying',completed,total,percent:0,error:''});
        for(const row of uploads){
          if(!current(key))return;
          const record=await store.get(row.id);if(!record||record.draft)continue;
          await store.attachCloud(record.id,{accountId:context.accountId,notebookId:context.notebookId,pending:true});
          const file=await client.upload({takeId:record.id,workId:record.workId,title:record.title,blob:record.blob,createdAt:record.createdAt,durationMs:record.durationMs,signal,onProgress:(done,bytes)=>publish({percent:Math.floor(done/bytes*100)})});
          if(!current(key))return;
          await store.attachCloud(record.id,{accountId:context.accountId,notebookId:context.notebookId,fileId:file.id,sha256:file.sha256Checksum});
          publish({completed:++completed,percent:0});
        }
        for(const file of downloads){
          if(!current(key))return;
          const result=await client.download(file.id);
          try{
            if(!current(key))return;
            const p=file.appProperties,blob=result.blob;
            if(!(blob instanceof Blob)||blob.size!==Number(file.size)||!result.verified&&await mediaHash(blob)!==p.sha256)throw Error('Downloaded recording failed verification. Local recordings were kept.');
            const durationMs=Number(p.durationMs),createdAt=p.createdAt;
            if(!Number.isFinite(durationMs)||durationMs<0||!Number.isFinite(Date.parse(createdAt)))throw Error('Invalid recording dates or duration.');
            await store.importRemote({id:p.takeId,workId:p.workId,workTitle:works.get(p.workId)?.title||'',title:file.name,createdAt,durationMs,kind:file.mimeType.startsWith('video/')?'video':'audio',draft:false,blob,cloud:{accountId:context.accountId,notebookId:context.notebookId,fileId:file.id,sha256:p.sha256}},key);
          }finally{await result.cleanup?.();}
          publish({completed:++completed,percent:0});
        }
        // Attach existing copies after a lost response, without rewriting titles edited locally.
        for(const f of remote){const r=local.find(r=>r.id===f.appProperties.takeId);if(r&&(!r.cloud||r.cloud.pending)&&!r.draft&&(r.workId===''||works.has(r.workId))){const record=await store.get(r.id);if(record&&await mediaHash(record.blob)!==f.sha256Checksum)throw Error('Recording identity conflict. Local recordings were kept.');if(record)await store.attachCloud(r.id,{accountId:context.accountId,notebookId:context.notebookId,fileId:f.id,sha256:f.sha256Checksum});}}
        if(current(key)){publish({status:'saved',completed,total,error:'',percent:100,lastCheckedAt:new Date().toISOString()});if(total)await refreshed();}
      }catch(error){if(!signal.aborted)publish({status:'error',error:error.message||String(error)});}
      finally{task=null;controller=null;schedule();}
    })();return task;
  }
  return {get state(){return {...state};},get busy(){return !!task;},sync,markDirty:()=>{if(timer)clearTimeout(timer);timer=null;schedule(1500);},pause(){controller?.abort();publish({status:'paused'});},stop(){stopped=true;clearTimeout(timer);timer=null;controller?.abort();}};
}
