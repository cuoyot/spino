// Kept outside the synchronized notebook so restore/merge cannot remove local takes.
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
  return {
    installation,
    async put(record) {
      if (!record.id || !record.workId || !(record.blob instanceof Blob) || !record.blob.size || !/^(audio|video)\//.test(record.blob.type)) throw Error('The recording is empty or invalid.');
      const tx = db.transaction('recordings', 'readwrite'), committed = done(tx);
      tx.objectStore('recordings').put({...record, installation}); await committed;
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
    async remove(id) { const tx = db.transaction('recordings','readwrite'), committed = done(tx); tx.objectStore('recordings').delete(id); await committed; },
    async clear() { const tx = db.transaction('recordings','readwrite'), committed = done(tx); tx.objectStore('recordings').clear(); await committed; },
    close: () => db.close(),
  };
}
