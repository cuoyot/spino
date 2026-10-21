// Binary copies stay independent of notebook restore/merge; remote copies never delete local takes.
const result = request => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
const done = transaction => new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onabort = transaction.onerror = () => reject(transaction.error || Error('Could not save the recording.')); });
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
      await committed;onChange();
    },
    async get(id) {
      const record = await result(db.transaction('recordings').objectStore('recordings').get(id));
      return record?.installation === installation && record.blob instanceof Blob && record.blob.size ? record : null;
    },
    async index() {
      const rows = [];
      await new Promise((resolve, reject) => {
        const cursor = db.transaction('recordings').objectStore('recordings').openCursor();
        cursor.onerror = () => reject(cursor.error);
        cursor.onsuccess = () => {
          const entry = cursor.result; if (!entry) return resolve();
          const {blob, ...record} = entry.value;
          if (record.installation === installation && blob instanceof Blob && blob.size) rows.push({...record, bytes:blob.size});
          entry.continue();
        };
      });
      return rows.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    },
    async attachCloud(id, cloud, expectedTakeId) {
      const tx=db.transaction('recordings','readwrite'),committed=done(tx),records=tx.objectStore('recordings'),q=records.get(id);
      q.onsuccess=()=>{try{if(q.result&&(!expectedTakeId||(q.result.mediaTakeId||id)===expectedTakeId))records.put({...q.result,cloud});}catch{tx.abort();}};await committed;
    },
    async ignored(scope, id) {return !!await result(db.transaction('meta').objectStore('meta').get('removed.'+scope+'.'+id));},
    async importRemote(record, scope) {
      const tx=db.transaction(['recordings','meta'],'readwrite'),committed=done(tx),records=tx.objectStore('recordings'),meta=tx.objectStore('meta');let inserted=false;
      const ignored=meta.get('removed.'+scope+'.'+record.id);ignored.onsuccess=()=>{if(ignored.result)return;const exists=records.get(record.id);exists.onsuccess=()=>{if(!exists.result){try{records.put({...record,installation});inserted=true;}catch{tx.abort();}}};};await committed;return inserted;
    },
    async remove(id) {
      const tx=db.transaction(['recordings','meta'],'readwrite'),committed=done(tx),records=tx.objectStore('recordings'),q=records.get(id);
      q.onsuccess=()=>{try{const cloud=q.result?.cloud;if(cloud)tx.objectStore('meta').put(true,'removed.'+cloud.accountId+'.'+cloud.notebookId+'.'+(q.result.mediaTakeId||id));records.delete(id);}catch{tx.abort();}};await committed;onChange();
    },
    async clear() { const tx = db.transaction(['recordings','meta'],'readwrite'), committed = done(tx); tx.objectStore('recordings').clear();tx.objectStore('meta').clear();tx.objectStore('meta').put(installation,'installation'); await committed; },
    close: () => db.close(),
  };
}
