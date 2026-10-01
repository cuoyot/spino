import { CloudBackup, backupHash, createCloudBackup } from './cloud-backup.js';
import { validateBackup } from './model.js';
import { mergeNotebooks, notebookContent, stableJSON } from './cloud-merge.js';

const KEY = 'spino.cloud-sync.device.v1';
const defaultSettings = {
  read: () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } },
  save: value => localStorage.setItem(KEY, JSON.stringify(value)),
};

export function createNotebookCloud({ adapter = CloudBackup, settings = defaultSettings, snapshot, eligible,
  readBase, saveBase, apply, changed = () => {}, adopted = () => {}, delay = 30000,
  validate = validateBackup, backupFactory = createCloudBackup }) {
  let state = { mode: 'backup', enabled: false, status: 'disconnected', name: '', ...settings.read() };
  let task = null, timer = null, revision = 0, applying = false;
  const independent = backupFactory({ adapter, snapshot, eligible, changed, delay });
  const publish = () => { settings.save(state); changed(); };
  const schedule = () => {
    clearTimeout(timer);
    if (state.mode === 'sync' && state.enabled && !['error', 'conflict'].includes(state.status)) timer = setTimeout(() => void sync(), delay);
  };
  const content = text => notebookContent(validate(text));
  const encode = backup => {
    const text = JSON.stringify({ ...backup, exportedAt: new Date().toISOString() });
    if (new TextEncoder().encode(text).length > 60000000) throw new Error('The shared notebook exceeds the 60 MB backup limit.');
    validate(text);
    return text;
  };
  async function reconcile(preference) {
    const captured = revision;
    const original = await snapshot();
    const local = content(original);
    const remoteFile = await adapter.readLinked();
    const remote = content(remoteFile.text);
    const base = await readBase();
    const result = mergeNotebooks(base, local, remote, preference);
    const conflictHash = result.conflicts.length ? await backupHash(stableJSON({ local, remote })) : null;
    if (result.conflicts.length && (!preference || state.conflictHash !== conflictHash)) {
      state.status = 'conflict'; state.conflicts = result.conflicts;
      state.conflictHash = conflictHash;
      state.error = 'Both devices changed the same data. Choose which conflicting values to keep. Independent changes will be kept from both devices.';
      return;
    }
    const merged = content(encode(result.backup));
    if (!eligible() || captured !== revision) { state.status = 'waiting'; return; }
    const localChanged = stableJSON(local) !== stableJSON(merged);
    if (!eligible() || captured !== revision) { state.status = 'waiting'; return; }
    if (stableJSON(remote) !== stableJSON(merged)) {
      await adapter.write({ text: encode(merged), expectedHash: await backupHash(remoteFile.text) });
    }
    // An edit during provider I/O must be merged on the next pass, never replaced.
    if (!eligible() || captured !== revision) { state.status = 'waiting'; return; }
    if (localChanged) {
      await adapter.saveRecovery({ text: original });
      if (!eligible() || captured !== revision) { state.status = 'waiting'; return; }
      applying = true;
      try { await apply(encode(merged), merged); } finally { applying = false; }
    } else await saveBase(merged);
    state.status = 'saved'; state.error = ''; state.conflicts = []; state.conflictHash = null; state.lastWrittenAt = new Date().toISOString();
    publish();
    if (localChanged) adopted();
  }
  async function sync(preference = null) {
    if (state.mode !== 'sync') return independent.retry();
    if (task || !state.enabled) return task;
    clearTimeout(timer);
    if (!eligible()) { state.status = 'waiting'; publish(); schedule(); return; }
    task = (async () => {
      try { state.status = 'writing'; state.error = ''; publish(); await reconcile(preference); }
      catch (error) { state.status = 'error'; state.error = error.message || String(error); }
      finally { task = null; publish(); schedule(); }
    })();
    return task;
  }
  async function connectShared(join) {
    if (task || independent.busy) throw new Error('Wait for the current backup operation.');
    if (!eligible()) throw new Error('Finish practice and close editors and downloads before connecting a shared notebook.');
    clearTimeout(timer); independent.stop();
    await independent.setEnabled(false);
    const previous = { ...state };
    let linked = false;
    task = (async () => {
      try {
        const local = content(await snapshot());
        const result = join ? await adapter.pickBackup({ link: true }) : await adapter.create({ text: encode(local), name: 'SPino-shared.json', mode: 'sync' });
        if (result.cancelled || (join && !result.text)) return;
        linked = true;
        state = { mode: 'sync', name: result.name, enabled: false, status: 'paused', error: '', conflicts: [] };
        publish();
        await saveBase(null);
        if (join) content(result.text);
        if (!join) await saveBase(local);
        state.enabled = true;
        state.status = 'writing'; publish();
        await adapter.acknowledgeSetup?.();
        await reconcile();
      } catch (error) {
        if (!linked) state = previous;
        state.status = 'error'; state.error = error.message || String(error);
      } finally { task = null; publish(); schedule(); if (state.mode === 'backup') independent.markDirty(); }
    })();
    return task;
  }
  return {
    get state() { return state.mode === 'sync' ? { ...state } : { ...independent.state, mode: 'backup' }; },
    get busy() { return !!task || independent.busy; },
    async init() {
      const destination = await adapter.status();
      if (destination.linked && destination.setupPending) {
        if (destination.mode === 'sync') {
          await saveBase(null);
          state = { mode: 'sync', enabled: true, status: 'pending', name: destination.name, error: '' };
          publish(); await adapter.acknowledgeSetup?.();
        } else { state = { mode: 'backup', enabled: false }; publish(); }
      }
      if (state.mode !== 'sync') return independent.init();
      if (!destination.linked) { state.enabled = false; state.status = 'disconnected'; state.name = ''; }
      else state.name = destination.name;
      publish(); schedule();
    },
    async connect() {
      if (task) throw new Error('Wait for synchronization.');
      clearTimeout(timer);
      const connected = await independent.connect();
      // Cancellation leaves the shared destination and selected mode unchanged.
      if (connected) {
        state = { mode: 'backup', enabled: false }; publish();
      } else schedule();
    },
    createShared: () => connectShared(false),
    joinShared: () => connectShared(true),
    resolve: preference => sync(preference),
    markDirty() { if (applying) return; revision++; if (state.mode === 'sync') schedule(); else independent.markDirty(); },
    async setEnabled(enabled) {
      if (state.mode !== 'sync') return independent.setEnabled(enabled);
      if (task) throw new Error('Wait for synchronization.');
      state.enabled = enabled; state.status = enabled ? 'pending' : 'paused'; publish(); schedule();
    },
    async disconnect() {
      clearTimeout(timer); if (task) await task; clearTimeout(timer);
      await independent.disconnect(); await saveBase(null);
      state = { mode: 'backup', enabled: false }; publish();
    },
    retry: () => sync(), sync: () => sync(),
    stop() { clearTimeout(timer); independent.stop(); },
  };
}
