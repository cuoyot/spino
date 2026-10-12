import { validNotebookId, parseDeviceLink, encodeDeviceLink } from './device-link.js';
import { CloudBackup, backupHash, createCloudBackup } from './cloud-backup.js';
import { validateBackup } from './model.js';
import { mergeNotebooks, notebookContent, stableJSON } from './cloud-merge.js';

const KEY = 'spino.cloud-sync.device.v1';
const defaultSettings = {
  read: () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } },
  save: value => localStorage.setItem(KEY, JSON.stringify(value)),
};

export function createNotebookCloud({ adapter = CloudBackup, settings = defaultSettings, snapshot, eligible, canApply = eligible, applyBlocker = () => 'editor',
  readBase, saveBase, apply, changed = () => {}, adopted = () => {}, delay = 5000,
  validate = validateBackup, backupFactory = createCloudBackup }) {
  let state = { mode: 'backup', enabled: false, status: 'disconnected', name: '', ...settings.read() };
  let task = null, timer = null, revision = 0, applying = false;
  const independent = backupFactory({ adapter, snapshot, eligible, changed, delay });
  const publish = () => { settings.save(state); changed(); };
  const schedule = () => {
    if (timer) return;
    if (state.mode === 'sync' && state.enabled && !['error', 'conflict'].includes(state.status)) timer = setTimeout(() => { timer = null; void sync(); }, delay);
  };
  const content = text => notebookContent(validate(text));
  const encode = backup => {
    const text = JSON.stringify({ ...backup, ...(state.notebookId ? { cloudBackup: { sharedNotebookId: state.notebookId } } : {}), exportedAt: new Date().toISOString() });
    if (new TextEncoder().encode(text).length > 60000000) throw new Error('The shared notebook exceeds the 60 MB backup limit.');
    validate(text);
    return text;
  };
  async function reconcile(preference) {
    const captured = revision;
    const original = await snapshot();
    const local = content(original);
    const remoteFile = await adapter.readLinked();
    const remoteId = JSON.parse(remoteFile.text).cloudBackup?.sharedNotebookId;
    if (remoteId && !validNotebookId(remoteId)) throw new Error('The shared notebook identity is invalid.');
    if (state.notebookId && remoteId && state.notebookId !== remoteId) throw new Error('The linked file belongs to another notebook. Select the original sync file.');
    state.notebookId ||= remoteId || crypto.randomUUID();
    const remote = content(remoteFile.text);
    const base = await readBase();
    let result = mergeNotebooks(base, local, remote);
    const conflictHash = result.conflicts.length ? await backupHash(stableJSON({ local, remote })) : null;
    const selected = preference || state.resolution?.preference;
    const reviewedHash = preference ? state.conflictHash : state.resolution?.hash;
    if (result.conflicts.length && (!selected || reviewedHash !== conflictHash)) {
      state.resolution = null;
      state.status = 'conflict'; state.conflicts = result.conflicts;
      state.conflictHash = conflictHash;
      state.error = 'Both devices changed the same data. Choose which conflicting values to keep. Independent changes will be kept from both devices.';
      return;
    }
    if (result.conflicts.length) {
      result = mergeNotebooks(base, local, remote, selected);
      state.resolution = { preference: selected, hash: conflictHash };
    } else state.resolution = null;
    const merged = content(encode(result.backup));
    if (!eligible() || captured !== revision) { state.status = 'waiting'; return; }
    const localChanged = stableJSON(local) !== stableJSON(merged);
    if (!eligible() || captured !== revision) { state.status = 'waiting'; return; }
    if (localChanged && state.resolution && !canApply()) { state.status = 'waiting'; state.waitReason = applyBlocker(); return; }
    if (!remoteId || stableJSON(remote) !== stableJSON(merged)) {
      await adapter.write({ text: encode(merged), expectedHash: await backupHash(remoteFile.text) });
    }
    // An edit during provider I/O must be merged on the next pass, never replaced.
    if (!eligible() || captured !== revision) { state.status = 'waiting'; return; }
    if (localChanged && !canApply()) { state.status = 'waiting'; state.waitReason = applyBlocker(); return; }
    if (localChanged) {
      await adapter.saveRecovery({ text: original });
      if (!eligible() || !canApply() || captured !== revision) { state.status = 'waiting'; return; }
      applying = true;
      try { await apply(encode(merged), merged); } finally { applying = false; }
    } else await saveBase(merged);
    state.status = 'saved'; state.resolution = null; state.waitReason = null; state.error = ''; state.conflicts = []; state.conflictHash = null; state.lastWrittenAt = new Date().toISOString();
    publish();
    if (localChanged) adopted();
  }
  async function sync(preference = null) {
    if (state.mode !== 'sync') return independent.retry();
    if (task || !state.enabled) return task;
    clearTimeout(timer); timer = null;
    if (!eligible()) { state.status = 'waiting'; publish(); schedule(); return; }
    task = (async () => {
      try { state.status = 'writing'; state.waitReason = null; state.error = ''; publish(); await reconcile(preference); }
      catch (error) { state.status = 'error'; state.error = error.message || String(error); }
      finally { task = null; publish(); schedule(); }
    })();
    return task;
  }
  async function connectShared(join, link = null) {
    if (task || independent.busy) throw new Error('Wait for the current backup operation.');
    if (!eligible()) throw new Error('Finish practice and close editors and downloads before connecting a shared notebook.');
    clearTimeout(timer); timer = null; independent.stop();
    const previous = { ...state }, previousBackupEnabled = independent.state.enabled;
    await independent.setEnabled(false);
    let linked = false;
    task = (async () => {
      try {
        const local = content(await snapshot());
        if (!join) state = { ...state, notebookId: crypto.randomUUID() };
        const result = join ? await adapter.pickBackup({ link: true, ...(link ? { expectedNotebookId: link.id } : {}) }) : await adapter.create({ text: encode(local), name: 'SPino-shared.json', mode: 'sync' });
        if (result.cancelled || (join && !result.text)) { state = previous; return; }
        if (join && link && JSON.parse(result.text).cloudBackup?.sharedNotebookId !== link.id) throw new Error('The selected file does not match the notebook QR. Your current connection was kept.');
        const notebookId = join ? JSON.parse(result.text).cloudBackup?.sharedNotebookId : state.notebookId;
        if (notebookId && !validNotebookId(notebookId)) throw new Error('The shared notebook identity is invalid.');
        linked = true;
        state = { notebookId, mode: 'sync', name: result.name, enabled: false, status: 'paused', error: '', conflicts: [] };
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
      } finally { task = null; if (!linked && previousBackupEnabled) await independent.setEnabled(true); publish(); schedule(); if (state.mode === 'backup') independent.markDirty(); }
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
      clearTimeout(timer); timer = null;
      const connected = await independent.connect();
      // Cancellation leaves the shared destination and selected mode unchanged.
      if (connected) {
        state = { mode: 'backup', enabled: false }; publish();
      } else schedule();
    },
    createShared: () => connectShared(false),
    joinShared: code => connectShared(true, code ? parseDeviceLink(code) : null),
    async deviceLink() {
      if (state.mode !== 'sync' || !state.name || !state.enabled) throw new Error('Connect and enable shared notebook synchronization first.');
      await sync();
      if (state.status !== 'saved') throw new Error('Finish practice and resolve sync problems before showing the notebook QR.');
      return { id: state.notebookId, name: state.name, code: encodeDeviceLink({ id: state.notebookId, name: state.name }) };
    },
    resolve: preference => {
      if (!['local','remote'].includes(preference)) throw new Error('Choose local or cloud changes.');
      if (task) throw new Error('Wait for synchronization to finish before reviewing changes.');
      state.resolution = { preference, hash: state.conflictHash };
      return sync(preference);
    },
    markDirty() { if (applying) return; revision++; if (state.mode === 'sync') schedule(); else independent.markDirty(); },
    async setEnabled(enabled) {
      if (state.mode !== 'sync') return independent.setEnabled(enabled);
      if (task) throw new Error('Wait for synchronization.');
      state.enabled = enabled; state.status = enabled ? 'pending' : 'paused'; publish(); schedule();
    },
    async disconnect() {
      clearTimeout(timer); timer = null; if (task) await task; clearTimeout(timer); timer = null;
      await independent.disconnect(); await saveBase(null);
      state = { mode: 'backup', enabled: false }; publish();
    },
    retry: () => sync(), sync: () => sync(),
    stop() { clearTimeout(timer); timer = null; independent.stop(); },
  };
}
