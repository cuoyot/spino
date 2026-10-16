// Transport cache/outbox lives separately from the user's notebook. Never store OAuth tokens here.
export function createDriveJournal(){
 let opened;
 const database=()=>opened??=new Promise((resolve,reject)=>{const r=indexedDB.open('spino-drive-journal-v2',1);r.onupgradeneeded=()=>r.result.createObjectStore('entries');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 return {
  async get(key){const db=await database();return new Promise((resolve,reject)=>{const r=db.transaction('entries').objectStore('entries').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});},
  async clear(){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('entries','readwrite');tx.objectStore('entries').clear();tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Could not erase the Drive cache.'));});},
  async claim(key,value){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('entries','readwrite'),store=tx.objectStore('entries'),r=store.get(key);let result;r.onsuccess=()=>{result=r.result;if(result===undefined){result=value;store.put(value,key);}};tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Could not retain a pending Drive identity.'));});},
  async set(key,value){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('entries','readwrite');tx.objectStore('entries').put(value,key);tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Could not save pending Drive changes.'));});}
 };
}
