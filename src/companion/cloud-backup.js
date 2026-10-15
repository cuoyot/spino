import { Capacitor, registerPlugin } from '@capacitor/core';
import { cloudErrorCode } from './cloud-errors.js';

export const CloudBackup = registerPlugin('CloudBackup');
export const cloudAvailable = () => Capacitor.isPluginAvailable('CloudBackup');
export const cloudPlatform = () => Capacitor.getPlatform();
const META_KEY = 'spino.cloud-backup.device.v1';
export const cloudSettings = {
  read: () => { try { return JSON.parse(localStorage.getItem(META_KEY) || 'null'); } catch { return null; } },
  save: value => localStorage.setItem(META_KEY, JSON.stringify(value)),
};
export const backupHash = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(n => n.toString(16).padStart(2, '0')).join('');

// One device owns one backup file. Restoration is always a separate, explicit operation.
export function createCloudBackup({ adapter = CloudBackup, settings = cloudSettings, snapshot, eligible, changed = () => {}, delay = 5000, hash = backupHash }) {
  let state = { deviceId: crypto.randomUUID(), enabled: false, hash: null, contentHash: null, lastWrittenAt: null, name: '', status: 'disconnected', error: '', ...settings.read() };
  let timer = null, task = null, revision = 0, dirty = false;
  const publish = () => { settings.save(state); changed({ ...state }); };
  const schedule = () => { if (timer) return; if (state.enabled && dirty) timer = setTimeout(() => { timer = null; void sync(); }, delay); };
  async function payload() {
    const backup = JSON.parse(await snapshot());
    // Export time does not make unchanged notebook data a new backup.
    delete backup.exportedAt;
    const contentHash = await hash(JSON.stringify(backup));
    backup.exportedAt = new Date().toISOString();
    backup.cloudBackup = { deviceId: state.deviceId, formatVersion: 1 };
    const text = JSON.stringify(backup);
    if (new TextEncoder().encode(text).length > 60000000) throw new Error('The backup exceeds the 60 MB restore limit. Export and manage your attachments before enabling automatic backup.');
    return { text, contentHash, hash: await hash(text) };
  }
  async function sync() {
    if (task || !state.enabled || !dirty) return task;
    clearTimeout(timer); timer = null;
    if (!eligible()) { state.status = 'waiting'; publish(); schedule(); return; }
    const capturedRevision = revision;
    task = (async () => {
      try {
        state.status = 'writing'; state.error = ''; publish();
        const value = await payload();
        if (!state.enabled) return;
        if (!eligible()) { state.status = 'waiting'; return; }
        if (value.contentHash !== state.contentHash) {
          await adapter.write({ text: value.text, expectedHash: state.hash });
          state.hash = value.hash; state.contentHash = value.contentHash; state.lastWrittenAt = new Date().toISOString();
        }
        dirty = revision !== capturedRevision;
        state.status = !state.enabled ? 'paused' : dirty ? 'pending' : 'saved';
      } catch (error) {
        if (!state.enabled) return;
        state.status = error.code === 'CONFLICT' ? 'conflict' : 'error'; state.error = error.message || String(error);
        state.errorCode = cloudErrorCode(error);
        // Failed writes need an explicit retry; never spin on a revoked permission or conflict.
      } finally { task = null; publish(); if (dirty && ['pending', 'waiting'].includes(state.status)) schedule(); }
    })();
    return task;
  }
  return {
    get state() { return { ...state }; },
    get busy() { return !!task; },
    async init() {
      const destination = await adapter.status();
      if (destination.linked && destination.setupPending && destination.mode === 'backup') {
        state = { ...state, enabled: true, name: destination.name, hash: destination.lastHash, contentHash: null, status: 'pending', error: '' };
        publish();
        await adapter.acknowledgeSetup?.();
      }
      if (!destination.linked) { state.enabled = false; state.status = 'disconnected'; state.name = ''; state.hash = null; state.contentHash = null; }
      else if (state.enabled && state.hash) { state.name = destination.name; state.hash = destination.lastHash || state.hash; dirty = true; if (!['error', 'conflict'].includes(state.status)) { state.status = 'pending'; schedule(); } }
      else { state.enabled = false; state.status = 'paused'; }
      publish();
    },
    async connect() {
      if (task) throw new Error('Wait for the current backup operation.');
      if (!eligible()) throw new Error('Pause practice, close the score and finish any downloads before choosing a backup destination.');
      const previous = { ...state };
      task = (async () => {
        try {
          state.status = 'writing'; state.error = ''; publish();
          const value = await payload();
          const result = await adapter.create({ text: value.text, name: `SPino-${state.deviceId.slice(0, 8)}.json` });
          if (result.cancelled) { state = previous; return; }
          state = { ...state, enabled: true, name: result.name, hash: value.hash, contentHash: value.contentHash, status: 'saved', error: '', lastWrittenAt: new Date().toISOString() };
          // Changes made while the system picker was open must be backed up next.
          dirty = true;
          publish();
          await adapter.acknowledgeSetup?.();
          return true;
        } catch (error) { state = { ...previous, error: error.message, status: 'error' }; }
        finally { task = null; publish(); schedule(); }
      })();
      return task;
    },
    markDirty() { revision++; dirty = true; if (state.enabled && !['error', 'conflict'].includes(state.status)) { if (!task) state.status = 'pending'; schedule(); } },
    continueLocal() { clearTimeout(timer); timer = null; revision++; state.enabled = false; state.status = 'paused'; publish(); },
    async setEnabled(enabled) { if (!enabled) return this.continueLocal(); if (task) throw new Error('Wait for the current backup operation.'); state.enabled = true; dirty = true; state.status = 'pending'; schedule(); publish(); },
    async disconnect() { clearTimeout(timer); timer = null; if (task) await task; clearTimeout(timer); timer = null; state.enabled = false; await adapter.disconnect(); dirty = false; state = { ...state, status: 'disconnected', hash: null, contentHash: null, name: '', error: '' }; publish(); },
    async retry() { dirty = true; return sync(); },
    sync,
    stop() { clearTimeout(timer); timer = null; },
  };
}
