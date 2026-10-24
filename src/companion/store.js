import { emptyData, validateData, validateBackup, VERSION } from './model.js';
import { validateAnnotations } from './pdf-annotations.js';
import { validateScoreView } from './score-view.js';
import { LIBRARY_KEY, emptyLibrary } from './library.js';
const LEGACY_KEYS = ['sr.settings', 'sr.templates', 'sr.progress', 'sr.stats', 'sr.startedL1'];
const request = req => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
const completed = tx => new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error || new Error('No se pudieron guardar los datos.')); });
export async function openStore(name='cuaderno-piano') {
  const req = indexedDB.open(name, VERSION);
  req.onupgradeneeded = () => { req.result.createObjectStore('state'); req.result.createObjectStore('assets', { keyPath: 'id' }); };
  const db = await request(req);
  let queue = Promise.resolve();
  const listeners = new Set();
  const write = (stores, action, notify = true) => {
    const run = queue.catch(() => {}).then(async () => { const tx = db.transaction(stores, 'readwrite'); const done = completed(tx); action(tx); await done; if (notify) for (const listener of listeners) listener(); });
    queue = run; return run;
  };
  const read = (store, key) => request(db.transaction(store).objectStore(store).get(key));
  return {
    onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    syncBase: () => read('state', 'cloud-sync-base-v1'),
    saveSyncBase(value) { return write(['state'], tx => tx.objectStore('state').put(value, 'cloud-sync-base-v1'), false); },
    async load() { const saved = await read('state', 'current'); if (saved) return validateData(saved); const data = emptyData(); const locale = globalThis.navigator?.language || ''; data.preferences.language = /^ca(-|$)/i.test(locale) ? 'ca' : /^(es|gl)(-|$)/i.test(locale) ? 'es' : 'en'; return data; },
    save(data) { const snapshot = structuredClone(data); return write(['state'], tx => tx.objectStore('state').put(snapshot, 'current')); },
    asset: id => read('assets', id),
    assets: () => request(db.transaction('assets').objectStore('assets').getAll()),
    assetIndex: () => new Promise((resolve, reject) => {
      const items = [], cursor = db.transaction('assets').objectStore('assets').openCursor();
      cursor.onerror = () => reject(cursor.error);
      cursor.onsuccess = () => {
        const entry = cursor.result;
        if (!entry) { resolve(items); return; }
        const asset = entry.value, encoded = asset.base64 || '';
        const remoteOnly=asset.base64===undefined&&!!asset.remoteContent;
        items.push({ id: asset.id, name: asset.name || '', pieceId: asset.pieceId,
          format: asset.format || (asset.type === 'application/pdf' ? 'pdf' : 'musicxml'),remoteOnly,
          bytes: remoteOnly?Math.floor(asset.remoteContent.length*3/4):Math.max(0, Math.floor(encoded.length * 3 / 4) - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0)) });
        entry.continue();
      };
    }),
    async library() { return await read('state', LIBRARY_KEY) || emptyLibrary(); },
    saveLibrary(library) { const snapshot = structuredClone(library); return write(['state'], tx => tx.objectStore('state').put(snapshot, LIBRARY_KEY)); },
    commitLibraryAsset(asset, library) {
      const snapshot = structuredClone(library);
      return write(['assets', 'state'], tx => { tx.objectStore('assets').put(asset); tx.objectStore('state').put(snapshot, LIBRARY_KEY); });
    },
    putAsset(asset) { return write(['assets'], tx => tx.objectStore('assets').put(asset)); },
    saveAnnotations(id, annotations) {
      const snapshot = validateAnnotations(annotations);
      return write(['assets'], tx => {
        const assets = tx.objectStore('assets');
        const req = assets.get(id);
        req.onsuccess = () => {
          if (!req.result) { tx.abort(); return; }
          assets.put({ ...req.result, annotations: snapshot });
        };
      });
    },
    commitAsset(asset, data) {
      const snapshot = structuredClone(data);
      return write(['assets', 'state'], tx => { tx.objectStore('assets').put(asset); tx.objectStore('state').put(snapshot, 'current'); });
    },
    saveScoreView(id, scoreView) {
      const snapshot = validateScoreView(scoreView);
      return write(['assets'], tx => {
        const assets = tx.objectStore('assets'), req = assets.get(id);
        req.onsuccess = () => { if (!req.result) { tx.abort(); return; } assets.put({ ...req.result, scoreView: snapshot }); };
      });
    },
    removeAsset(id) { return write(['assets'], tx => tx.objectStore('assets').delete(id)); },
    async export(data) {
      await queue.catch(() => {});
      const tx = db.transaction(['state', 'assets']);
      const [assets, savedData, library] = await Promise.all([request(tx.objectStore('assets').getAll()), request(tx.objectStore('state').get('current')), request(tx.objectStore('state').get(LIBRARY_KEY))]);
      const legacy = Object.fromEntries(LEGACY_KEYS.map(k => [k, localStorage.getItem(k)]));
      return JSON.stringify({ format: 'cuaderno-piano', version: VERSION, exportedAt: new Date().toISOString(), data: savedData || data, assets, legacy, ...(library ? { library } : {}) });
    },
    async restore(text, { syncBase } = {}) {
      const backup = validateBackup(text);
      for(const asset of backup.assets){if(asset.base64===undefined&&asset.remoteContent){const previous=await read('assets',asset.id);if(previous?.base64&&JSON.stringify(previous.remoteContent)===JSON.stringify(asset.remoteContent))asset.base64=previous.base64;}}
      const previous=Object.fromEntries(LEGACY_KEYS.map(k=>[k,localStorage.getItem(k)]));
      try {
        for (const key of LEGACY_KEYS) {
          const value=backup.legacy?.[key];
          if(typeof value==='string')localStorage.setItem(key,value);else localStorage.removeItem(key);
        }
        await write(['state', 'assets'], tx => {
          tx.objectStore('assets').clear();
          for (const asset of backup.assets) tx.objectStore('assets').put(asset);
          tx.objectStore('state').put(backup.data, 'current');
          if (syncBase !== undefined) tx.objectStore('state').put(syncBase, 'cloud-sync-base-v1');
          else tx.objectStore('state').delete('cloud-sync-base-v1');
          if (backup.library) tx.objectStore('state').put(backup.library, LIBRARY_KEY);
          else tx.objectStore('state').delete(LIBRARY_KEY);
        });
      } catch(error) {
        for(const key of LEGACY_KEYS){try{if(previous[key]==null)localStorage.removeItem(key);else localStorage.setItem(key,previous[key]);}catch{}}
        throw error;
      }
      return backup.data;
    },
    async clear() { await write(['state', 'assets'], tx => { tx.objectStore('state').clear(); tx.objectStore('assets').clear(); }); LEGACY_KEYS.forEach(k => localStorage.removeItem(k)); },
  };
}
