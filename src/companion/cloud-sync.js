import { validNotebookId, parseDeviceLink, encodeDeviceLink } from './device-link.js';
import { CloudBackup, backupHash, createCloudBackup } from './cloud-backup.js';
import { validateBackup } from './model.js';
import { mergeNotebooks, notebookContent, stableJSON } from './cloud-merge.js';
import { cloudErrorCode } from './cloud-errors.js';
import {driveNotebookContent} from './notebook-transport.js';

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
    if (state.mode === 'sync' && state.enabled && state.status !== 'conflict' && (state.status !== 'error' || state.retryable)) timer = setTimeout(() => { timer = null; void sync(null, true); }, state.status === 'error' ? Math.min(60000, delay * 2 ** (state.retryCount || 0)) : delay);
  };
  const shared = value => adapter.transport === 'drive' ? driveNotebookContent(value) : value;
  const content = text => shared(notebookContent(validate(text)));
  const encode = backup => {
    const text = JSON.stringify({ ...backup, ...(state.notebookId ? { cloudBackup: { sharedNotebookId: state.notebookId } } : {}), exportedAt: new Date().toISOString() });
    if (new TextEncoder().encode(text).length > 60000000) throw new Error('The shared notebook exceeds the 60 MB backup limit.');
    validate(text);
    return text;
  };
  async function reconcile(preference) {
    const captured = revision;
    state.operation = 'snapshot';
    const original = await snapshot();
    if (!state.enabled) return;
    const local = content(original);
    state.operation = 'read';
    const remoteFile = await adapter.readLinked();
    if (!state.enabled) return;
    state.operation = 'validate';
    const remoteId = JSON.parse(remoteFile.text).cloudBackup?.sharedNotebookId;
    if (remoteId && !validNotebookId(remoteId)) throw new Error('The shared notebook identity is invalid.');
    if (state.notebookId && remoteId && state.notebookId !== remoteId) throw new Error('The linked file belongs to another notebook. Select the original sync file.');
    state.notebookId ||= remoteId || crypto.randomUUID();
    const remote = content(remoteFile.text);
    state.operation = 'baseline';
    const base = shared(await readBase());
    if (!state.enabled) return;
    state.operation = 'merge';
    let result = mergeNotebooks(base, local, remote);
    const conflictHash = result.conflicts.length ? await backupHash(stableJSON({ local, remote })) : null;
    if (!state.enabled) return;
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
      state.operation = 'write';
      const expectedHash = await backupHash(remoteFile.text);
      if (!state.enabled) return;
      await adapter.write({ text: encode(merged), expectedHash });
    }
    // The provider has accepted this local snapshot, even if incoming changes
    // cannot yet be adopted. Advancing to `merged` here would turn those pending
    // incoming additions into deletions on the next pass. Keeping the old base
    // instead would conflict with our own already-published edits.
    state.operation = 'baseline';
    await saveBase(local);
    if (!state.enabled) return;
    // An edit during provider I/O must be merged on the next pass, never replaced.
    if (!eligible() || captured !== revision) { state.status = 'waiting'; return; }
    if (localChanged && !canApply()) { state.status = 'waiting'; state.waitReason = applyBlocker(); return; }
    if (localChanged) {
      state.operation = 'recovery';
      await adapter.saveRecovery({ text: original });
      if (!state.enabled) return;
      if (!eligible() || !canApply() || captured !== revision) { state.status = 'waiting'; return; }
      state.operation = 'apply';
      applying = true;
      try { await apply(encode(merged), merged); } finally { applying = false; }
      if (!state.enabled) return;
    }
    state.operation = null; state.errorCode = ''; state.retryable = false; state.retryCount = 0;
    state.status = 'saved'; state.resolution = null; state.waitReason = null; state.error = ''; state.conflicts = []; state.conflictHash = null; state.lastWrittenAt = new Date().toISOString();
    publish();
    if (localChanged) adopted();
  }
  async function reconcileWithRetry(preference) {
    // A changed provider revision is contention, not a user data conflict.
    // Re-read and merge afresh; never retry the stale serialized write.
    for (let attempt = 0; attempt < 3; attempt++) {
      try { await reconcile(preference); return; }
      catch (error) {
        if (!['CONFLICT', 'LOCKED', 'BUSY'].includes(error.code)) throw error;
        if (!state.enabled) return;
        state.status = 'waiting';
        if (!eligible() || attempt === 2) return;
      }
    }
  }
  async function sync(preference = null, automatic = false) {
    if (state.mode !== 'sync') return independent.retry();
    if (task || !state.enabled) return task;
    clearTimeout(timer); timer = null;
    if (!automatic) state.retryCount = 0;
    if (!eligible()) { state.status = 'waiting'; publish(); schedule(); return; }
    task = (async () => {
      try {
        state.status = 'writing'; state.waitReason = null; state.error = ''; publish();
        await reconcileWithRetry(preference);
      }
      catch (error) {
        if (!state.enabled) return;
        state.status = 'error'; state.error = error.message || String(error);
        state.errorCode = cloudErrorCode(error);
        // Retry only failed provider reads. A failed write may already have
        // committed; malformed data and local storage failures need attention.
        state.retryCount = (state.retryCount || 0) + 1;
        state.retryable = state.operation === 'read' && state.errorCode === 'PROVIDER_ERROR' && state.retryCount <= 3;
      }
      finally { task = null; publish(); schedule(); }
    })();
    return task;
  }
  const requireDisconnected = () => {
    if ((state.mode === 'sync' ? state : independent.state).name) throw new Error('Disconnect the current notebook before connecting another one.');
  };
  async function connectShared(join, link = null) {
    requireDisconnected();
    if (task || independent.busy) throw new Error('Wait for the current backup operation.');
    if (!eligible()) throw new Error('Finish practice and close editors and downloads before connecting a shared notebook.');
    clearTimeout(timer); timer = null; independent.stop();
    const previous = { ...state }, previousBackupEnabled = independent.state.enabled;
    await independent.setEnabled(false);
    let linked = false;
    task = (async () => {
      try {
        const local = content(await snapshot());
        if (!join) state = { ...state, notebookId: adapter.transport === 'drive' ? (state.notebookId || adapter.pendingNotebookId?.() || crypto.randomUUID()) : crypto.randomUUID() };
        const result = join ? await adapter.pickBackup({ link: true, ...(link ? { expectedNotebookId: link.id } : {}) }) : await adapter.create({ text: encode(local), name: 'SPino-shared.json', mode: 'sync' });
        if (result.joined) join = true;
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
        await reconcileWithRetry();
      } catch (error) {
        if (!linked) state = { ...previous, connectionError: error.message || String(error) };
        state.status = 'error'; state.error = error.message || String(error);
      } finally { task = null; if (!linked && previousBackupEnabled) await independent.setEnabled(true); publish(); schedule(); if (state.mode === 'backup') independent.markDirty(); }
    })();
    return task;
  }
  return {
    get state() { return state.mode === 'sync' ? { ...state, ...adapter.info } : { ...independent.state, ...adapter.info, ...(state.connectionError ? { status: 'error', error: state.connectionError } : {}), mode: 'backup' }; },
    get busy() { return !!task || independent.busy; },
    async init() {
      const destination = await adapter.status();
      if (destination.linked && destination.setupPending) {
        if (destination.mode === 'sync') {
          if (!destination.preserveSyncBase) await saveBase(null);
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
      requireDisconnected();
      if (task) throw new Error('Wait for synchronization.');
      clearTimeout(timer); timer = null;
      const connected = await independent.connect();
      // Cancellation leaves the shared destination and selected mode unchanged.
      if (connected) {
        state = { mode: 'backup', enabled: false }; publish();
      } else schedule();
    },
    async migrateToDrive() {
      if (!adapter.drive) throw new Error('Google Drive is unavailable.');
      if (task || independent.busy) throw new Error('Wait for synchronization.');
      if (!eligible() || !canApply()) throw new Error('Finish practice and close editors before moving your notebook to Google Drive.');
      clearTimeout(timer); timer = null; independent.stop();
      const previous = { ...state }, notebookId = state.notebookId || adapter.drive.pendingNotebookId?.() || crypto.randomUUID();
      if (state.mode === 'sync') { state.enabled = false; publish(); }
      else independent.continueLocal();
      let switched = false;
      task = (async () => {
        try {
          const original = await snapshot(), local = driveNotebookContent(notebookContent(validate(original)));
          await adapter.saveRecovery({text: original});
          const files = (await adapter.drive.list()).filter(f => f.appProperties.notebookId === notebookId);
          if (files.length > 1) throw new Error('More than one Drive file uses this notebook identity. Select the intended notebook before connecting.');
          let result;
          if (files.length) { adapter.drive.choose(files[0].id); result = await adapter.drive.pickBackup({expectedNotebookId:notebookId}); }
          else result = await adapter.drive.create({text:JSON.stringify({...local,cloudBackup:{sharedNotebookId:notebookId},exportedAt:new Date().toISOString()}),name:previous.name || 'SPino notebook.json'});
          adapter.useDrive(); switched = true;
          state = {notebookId,mode:'sync',enabled:false,status:'paused',name:result.name,error:'',conflicts:[]}; publish();
          if (!files.length && !result.joined) await saveBase(local);
          else if (previous.mode !== 'sync' || previous.notebookId !== notebookId) await saveBase(null);
          await adapter.acknowledgeSetup?.();
          await adapter.clearLegacyLink?.();
          state.enabled = true; state.status = 'writing'; publish();
          await reconcileWithRetry();
        } catch (error) {
          state = {...(switched ? state : previous),enabled:false,status:'error',error:error.message,connectionError:error.message,errorCode:cloudErrorCode(error)};
        } finally { task = null; publish(); schedule(); }
      })();
      return task;
    },
    createShared: () => connectShared(false),
    joinShared: code => connectShared(true, code ? parseDeviceLink(code) : null),
    async relink() {
      if (state.mode !== 'sync' || !state.notebookId) throw new Error('Connect a shared notebook first.');
      if (task || independent.busy) throw new Error('Wait for synchronization.');
      clearTimeout(timer); timer = null;
      task = (async () => {
        try {
          // Regrant access to the same notebook without forgetting its merge history.
          const result = await adapter.pickBackup({ link: true, expectedNotebookId: state.notebookId, reconnect: true });
          if (result.cancelled) return;
          if (JSON.parse(result.text).cloudBackup?.sharedNotebookId !== state.notebookId) throw new Error('The selected file does not match the notebook QR. Your current connection was kept.');
          content(result.text);
          state.name = result.name; state.enabled = true; state.status = 'pending';
          state.error = ''; state.errorCode = ''; state.retryable = false; state.retryCount = 0;
          publish();
          await adapter.acknowledgeSetup?.();
        } catch (error) { state.status = 'error'; state.error = error.message || String(error); state.errorCode = cloudErrorCode(error); state.retryable = false; }
        finally { task = null; publish(); schedule(); }
      })();
      await task;
      if (state.status === 'pending') await sync();
    },
    continueLocal() {
      if (state.mode !== 'sync') return independent.continueLocal();
      clearTimeout(timer); timer = null;
      // Do not wait for a stalled provider. Late I/O cannot apply incoming data.
      revision++; state.enabled = false; state.status = 'paused'; state.waitReason = null;
      state.retryable = false; state.retryCount = 0; state.resolution = null;
      publish();
    },
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
      if (!enabled) return this.continueLocal();
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
