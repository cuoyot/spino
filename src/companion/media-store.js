// Binary copies stay independent of notebook restore/merge; remote copies never delete local takes.
const result = request => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
const done = transaction => new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onabort = transaction.onerror = () => reject(transaction.error || Error('Could not save the recording.')); });
// Original blobs are immutable; trimming assigns a new mediaTakeId. UI language and
// the take's filename do not invalidate a rendered piece-title/date card.
export const preparedVideoKey = record => JSON.stringify(['video-bookends-v1',record.id,record.mediaTakeId||record.id,record.blob?.size,record.blob?.type]);
export async function openMediaStore(name = 'spino-local-media') {
  const request = indexedDB.open(name, 1);
  request.onupgradeneeded = () => { request.result.createObjectStore('meta'); request.result.createObjectStore('recordings', {keyPath:'id'}); };
  const db = await result(request);
  // Read and initialize in one transaction, including when two windows open together.
  const tx = db.transaction('meta', 'readwrite'), committed = done(tx), meta = tx.objectStore('meta');
  const identity = meta.get('installation');
  let installation;
  identity.onsuccess = () => { installation = identity.result || crypto.randomUUID(); if (!identity.result) meta.put(installation, 'installation'); };
  await committed;
  // Keep derived files separate from original recordings and their cloud/backup metadata.
  const preparedName=name+'-prepared';
  const preparedId=id=>installation+':'+id;
  async function preparedDatabase() {
    const q=indexedDB.open(preparedName,1);
    q.onupgradeneeded=()=>q.result.createObjectStore('exports',{keyPath:'id'});
    return result(q);
  }
  async function removePrepared(id=null) {
    const prepared=await preparedDatabase();
    try {const tx=prepared.transaction('exports','readwrite'),committed=done(tx),rows=tx.objectStore('exports');if(id===null)rows.clear();else rows.delete(preparedId(id));await committed;}
    finally {prepared.close();}
  }
  let onChange=()=>{};
  return {
    installation,onChange:callback=>{onChange=callback;},
    async put(record) {
      if (!record.id || typeof record.workId !== 'string' || !(record.blob instanceof Blob) || !record.blob.size || !/^(audio|video)\//.test(record.blob.type)) throw Error('The recording is empty or invalid.');
      const tx = db.transaction('recordings', 'readwrite'), committed = done(tx);
      const records=tx.objectStore('recordings'),existing=records.get(record.id);existing.onsuccess=()=>{try{records.put({...record,...(existing.result?{blob:existing.result.blob,cloud:existing.result.cloud||record.cloud}:{}),installation});}catch{tx.abort();}};await committed;onChange();
    },
    async replaceTrim(record, expectedTakeId) {
      if (!record.mediaTakeId || record.mediaTakeId === expectedTakeId || !(record.blob instanceof Blob) || !record.blob.size || !record.blob.type.startsWith(record.kind+'/')) throw Error('Invalid trimmed recording.');
      // Commit the replacement and exclusion together; quota/conflict failures keep the old bytes.
      const tx=db.transaction(['recordings','meta'],'readwrite'),committed=done(tx),records=tx.objectStore('recordings'),q=records.get(record.id);
      q.onsuccess=()=>{try{
        const old=q.result;
        if(!old || old.installation!==installation || (old.mediaTakeId||old.id)!==expectedTakeId || old.workId!==record.workId){tx.abort();return;}
        const cloud=old.cloud;
        if(cloud)tx.objectStore('meta').put(true,'removed.'+cloud.accountId+'.'+cloud.notebookId+'.'+expectedTakeId);
        records.put({...old,...record,title:old.title,cloud:undefined,installation});
      }catch{tx.abort();}};
      await committed;await removePrepared(record.id).catch(()=>{});onChange();
    },
    async get(id) {
      const record = await result(db.transaction('recordings').objectStore('recordings').get(id));
      return record?.installation === installation && record.blob instanceof Blob && record.blob.size ? record : null;
    },
    async getPrepared(record) {
      if(record.kind!=='video')return null;
      const original=await result(db.transaction('recordings').objectStore('recordings').get(record.id));
      if(original?.installation!==installation||preparedVideoKey(original)!==preparedVideoKey(record))return null;
      const prepared=await preparedDatabase();
      try {const cached=await result(prepared.transaction('exports').objectStore('exports').get(preparedId(record.id)));
        return cached?.installation===installation&&cached.sourceKey===preparedVideoKey(record)&&cached.blob instanceof Blob&&cached.blob.size&&cached.blob.type.startsWith('video/')&&Number.isFinite(cached.durationMs)&&cached.durationMs>0 ? {fileId:cached.fileId,blob:cached.blob,durationMs:cached.durationMs} : null;
      }finally {prepared.close();}
    },
    async putPrepared(record,output) {
      if(record.kind!=='video'||!(output.blob instanceof Blob)||!output.blob.size||output.blob.size>250*1024*1024||!output.blob.type.startsWith('video/')||!Number.isFinite(output.durationMs)||output.durationMs<=0)throw Error('Invalid prepared video.');
      const original=await result(db.transaction('recordings').objectStore('recordings').get(record.id));
      if(original?.installation!==installation||preparedVideoKey(original)!==preparedVideoKey(record))throw Error('The recording changed. Prepare it again.');
      const prepared=await preparedDatabase();
      try {const tx=prepared.transaction('exports','readwrite'),committed=done(tx);tx.objectStore('exports').put({id:preparedId(record.id),fileId:crypto.randomUUID(),recordId:record.id,takeId:record.mediaTakeId||record.id,installation,sourceKey:preparedVideoKey(record),blob:output.blob,durationMs:output.durationMs,preparedAt:new Date().toISOString()});await committed;}
      finally {prepared.close();}
    },
    async index() {
      const rows = [];
      await new Promise((resolve, reject) => {
        const cursor = db.transaction('recordings').objectStore('recordings').openCursor();
        cursor.onerror = () => reject(cursor.error);
        cursor.onsuccess = () => {
          const entry = cursor.result; if (!entry) return resolve();
          const {blob, ...record} = entry.value;
          if (record.installation === installation && (blob instanceof Blob && blob.size || record.remoteOnly)) rows.push({...record, bytes:blob?.size || record.bytes});
          entry.continue();
        };
      });
      return rows.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    },
    async rememberRemote(record) {
      const tx=db.transaction('recordings','readwrite'),committed=done(tx),records=tx.objectStore('recordings'),q=records.get(record.id);
      q.onsuccess=()=>{if(!q.result||q.result.remoteOnly)records.put({...record,installation,remoteOnly:true});};
      await committed;
    },
    async releaseLocal(id) {
      const current=await result(db.transaction('recordings').objectStore('recordings').get(id));
      if(!current?.cloud?.fileId||current.cloud.pending)throw Error('The recording is not backed up.');
      await removePrepared(id);
      const tx=db.transaction(['recordings','meta'],'readwrite'),committed=done(tx),records=tx.objectStore('recordings'),q=records.get(id);
      q.onsuccess=()=>{const r=q.result;if(!r?.cloud?.fileId||r.cloud.pending){tx.abort();return;}const {blob,...meta}=r;records.put({...meta,bytes:blob?.size||r.bytes,remoteOnly:true});tx.objectStore('meta').put(true,'removed.'+r.cloud.accountId+'.'+r.cloud.notebookId+'.'+(r.mediaTakeId||id));};
      await committed;onChange();
    },
    async attachCloud(id, cloud, expectedTakeId) {
      const tx=db.transaction('recordings','readwrite'),committed=done(tx),records=tx.objectStore('recordings'),q=records.get(id);
      q.onsuccess=()=>{try{if(q.result&&(!expectedTakeId||(q.result.mediaTakeId||id)===expectedTakeId))records.put({...q.result,cloud});}catch{tx.abort();}};await committed;
    },
    async ignored(scope, id) {return !!await result(db.transaction('meta').objectStore('meta').get('removed.'+scope+'.'+id));},
    async importRemote(record, scope, force=false) {
      const tx=db.transaction(['recordings','meta'],'readwrite'),committed=done(tx),records=tx.objectStore('recordings'),meta=tx.objectStore('meta');let inserted=false;
      const ignored=meta.get('removed.'+scope+'.'+record.id);ignored.onsuccess=()=>{if(ignored.result&&!force)return;const exists=records.get(record.id);exists.onsuccess=()=>{if(!exists.result||exists.result.remoteOnly){try{records.put({...record,remoteOnly:false,installation});inserted=true;}catch{tx.abort();}}};};await committed;return inserted;
    },
    async remove(id) {
      await removePrepared(id);
      const tx=db.transaction(['recordings','meta'],'readwrite'),committed=done(tx),records=tx.objectStore('recordings'),q=records.get(id);
      q.onsuccess=()=>{try{const cloud=q.result?.cloud;if(cloud)tx.objectStore('meta').put(true,'removed.'+cloud.accountId+'.'+cloud.notebookId+'.'+(q.result.mediaTakeId||id));records.delete(id);}catch{tx.abort();}};await committed;onChange();
    },
    async clear() { await removePrepared();const tx = db.transaction(['recordings','meta'],'readwrite'), committed = done(tx); tx.objectStore('recordings').clear();tx.objectStore('meta').clear();tx.objectStore('meta').put(installation,'installation'); await committed; },
    close: () => db.close(),
  };
}
