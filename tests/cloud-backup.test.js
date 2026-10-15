import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudBackup, backupHash } from '../src/companion/cloud-backup.js';
import { cloudBackupMarkup, cloudSetupMarkup, cloudManageMarkup, cloudHelpMarkup } from '../src/companion/cloud-backup-view.js';

test('native setup receipt restores configuration after activity recreation', async t => {
  let saved, acknowledged = false;
  const engine = createCloudBackup({ settings: { read: () => null, save: value => { saved = value; } },
    snapshot: async () => '{}', eligible: () => false, delay: 100000,
    adapter: { status: async () => ({ linked: true, name: 'selected.json', lastHash: 'native-hash', setupPending: true, mode: 'backup' }),
      acknowledgeSetup: async () => { assert.equal(saved.enabled, true); acknowledged = true; } } });
  t.after(() => engine.stop());
  await engine.init();
  assert.equal(engine.state.enabled, true); assert.equal(engine.state.name, 'selected.json');
  assert.equal(engine.state.hash, 'native-hash'); assert.equal(acknowledged, true);
});

function fixture(t, delay = 100000) {
  let metadata = null, remote = null, version = 1, allowed = true, writes = 0, cancelled = false, failure = null, gate = null;
  const options = { settings: { read: () => metadata, save: value => { metadata = structuredClone(value); } },
    snapshot: async () => JSON.stringify({ format: 'cuaderno-piano', version: 1, data: { version }, assets: [{ annotations: ['kept'], base64: 'original' }], exportedAt: new Date().toISOString() }),
    eligible: () => allowed, delay,
    adapter: {
      status: async () => ({ linked: remote != null, name: 'backup.json' }),
      create: async ({ text }) => { if (cancelled) return { cancelled: true }; remote = text; return { name: 'backup.json' }; },
      write: async ({ text, expectedHash }) => {
        if (failure) throw Error(failure);
        if (await backupHash(remote) !== expectedHash) throw Object.assign(Error('Changed externally'), { code: 'CONFLICT' });
        writes++; if (gate) await gate; remote = text;
      },
      disconnect: async () => {},
    },
  };
  const engine = createCloudBackup(options); t.after(() => engine.stop());
  return { engine, options, remote: () => remote, writes: () => writes, change: () => { version++; engine.markDirty(); }, external: () => { remote = 'External data'; }, allowed: value => { allowed = value; }, cancel: value => { cancelled = value; }, fail: value => { failure = value; }, gate: value => { gate = value; } };
}

test('cloud backup is opt-in, keeps full attachments and skips unchanged snapshots', async t => {
  const f = fixture(t); await f.engine.init(); f.change(); await f.engine.sync(); assert.equal(f.remote(), null);
  await f.engine.connect(); assert.equal(f.engine.state.enabled, true);
  const backup = JSON.parse(f.remote()); assert.deepEqual(backup.assets[0].annotations, ['kept']); assert.equal(backup.cloudBackup.deviceId, f.engine.state.deviceId);
  assert.equal(backup.cloudBackup.hash, undefined); assert.equal(backup.cloudBackup.destination, undefined);
  f.engine.markDirty(); await f.engine.sync(); assert.equal(f.writes(), 0);
  f.change(); await f.engine.sync(); assert.equal(f.writes(), 1); assert.equal(f.engine.state.status, 'saved');
});

test('automatic copies wait for foreground idle eligibility and coalesce changes', async t => {
  const f = fixture(t); await f.engine.connect(); f.allowed(false); f.change(); f.change();
  await f.engine.sync(); assert.equal(f.writes(), 0); assert.equal(f.engine.state.status, 'waiting');
  f.allowed(true); await f.engine.sync(); assert.equal(f.writes(), 1);
  await f.engine.setEnabled(false); f.change(); await f.engine.sync(); assert.equal(f.writes(), 1);
  await f.engine.setEnabled(true); await f.engine.sync(); assert.equal(f.writes(), 2);
});

test('provider errors and external modifications never advance the last successful backup hash', async t => {
  const f = fixture(t); await f.engine.connect(); const initialHash = f.engine.state.hash, original = f.remote();
  f.fail('Permission revoked'); f.change(); await f.engine.sync(); assert.equal(f.engine.state.status, 'error'); assert.equal(f.engine.state.hash, initialHash); assert.equal(f.remote(), original);
  f.fail(null); await f.engine.retry(); assert.equal(f.engine.state.status, 'saved'); const savedHash = f.engine.state.hash;
  f.external(); f.change(); await f.engine.sync(); assert.equal(f.engine.state.status, 'conflict'); assert.equal(f.engine.state.hash, savedHash); assert.equal(f.remote(), 'External data');
});

test('changes arriving during a write are retained, cancellation preserves linkage, disconnect keeps remote files', async t => {
  const f = fixture(t); await f.engine.connect(); f.cancel(true); await f.engine.connect(); assert.equal(f.engine.state.enabled, true);
  let release; f.gate(new Promise(resolve => { release = resolve; })); f.change(); const writing = f.engine.sync();
  while (!f.writes()) await new Promise(resolve => setTimeout(resolve, 1));
  f.change(); release(); await writing; assert.equal(f.engine.state.status, 'pending');
  f.gate(null); await f.engine.sync(); assert.equal(f.writes(), 2);
  const remote = f.remote(); await f.engine.disconnect(); f.change(); await f.engine.sync(); assert.equal(f.remote(), remote); assert.equal(f.engine.state.enabled, false);
});

test('a missing or moved native destination disables automatic backup after restart', async t => {
  const f = fixture(t); await f.engine.connect(); const options = { ...f.options, adapter: { ...f.options.adapter, status: async () => ({ linked: false }) } };
  const second = createCloudBackup(options); t.after(() => second.stop()); await second.init();
  assert.equal(second.state.enabled, false); assert.equal(second.state.name, '');
});

test('cloud UI separates the status overview from setup and detailed provider guidance', () => {
  const state = { status: 'saved', name: '<file>', lastWrittenAt: '2026-09-30T10:00:00Z', enabled: true };
  const ios = cloudBackupMarkup(state, { available: true, platform: 'ios' });
  assert.equal((ios.match(/<button /g) || []).length, 2);
  assert.match(ios, /data-action="cloud-sync"/); assert.match(ios, /data-action="cloud-manage"/);
  assert.match(ios, /Saved to your file provider/); assert.match(ios, /&lt;file&gt;/);
  assert.doesNotMatch(ios, /data-action="cloud-disconnect"|data-action="cloud-create-shared"/);
  const setup = cloudSetupMarkup({ platform: 'ios' }), help = cloudHelpMarkup();
  assert.match(setup, /iCloud Drive or Google Drive/);
  assert.doesNotMatch(cloudSetupMarkup({ platform: 'android' }), /iCloud/);
  assert.match(help, /Restoration is always manual/); assert.match(help, /not completion/);
  assert.doesNotMatch(cloudBackupMarkup(state, { available: false, platform: 'web' }), /data-action="cloud-/);
});

test('cloud controls remain localized and expose paused state accessibly', () => {
  const state = { mode: 'sync', status: 'paused', name: 'SPino.json', enabled: false };
  const options = { available: true, platform: 'android', lang: 'es' };
  const overview = cloudBackupMarkup(state, options), management = cloudManageMarkup(state, options);
  assert.match(overview, /Actualizaciones automáticas en pausa/);
  assert.match(overview, /data-action="cloud-toggle"[^>]*data-id="true"/);
  assert.match(management, /role="switch"[^>]*aria-checked="false"/);
  assert.doesNotMatch(management, /data-action="cloud-restore"|data-action="export-backup"/);
  assert.match(management, /data-action="cloud-recovery"/);
  assert.doesNotMatch(overview, /Shared notebook|Automatic updates|Not connected/);
  const writing = cloudBackupMarkup({ ...state, status: 'writing' }, options);
  assert.equal((writing.match(/<button [^>]*disabled/g) || []).length, 2);
});

test('committed changes trigger a debounced automatic write without pressing sync', async t => {
  const f = fixture(t, 20);
  await f.engine.connect(); f.change(); f.change();
  const deadline = Date.now() + 3000;
  while (f.writes() === 0 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(f.writes(), 1);
  assert.equal(JSON.parse(f.remote()).data.version, 3);
  assert.equal(f.engine.state.status, 'saved');
});

test('manual write failure cancels the scheduled attempt and remains stopped after restart', async t => {
  const f = fixture(t, 20); await f.engine.connect(); f.change(); f.fail('Offline');
  await f.engine.sync(); f.fail(null);
  await new Promise(resolve => setTimeout(resolve, 80));
  assert.equal(f.writes(), 0); assert.equal(f.engine.state.status, 'error');
  const second = createCloudBackup(f.options); t.after(() => second.stop()); await second.init();
  await new Promise(resolve => setTimeout(resolve, 80));
  assert.equal(second.state.status, 'error'); assert.equal(f.writes(), 0);
  await second.retry(); assert.equal(f.writes(), 1);
});

test('local backup pause survives restart and a late write without losing the acknowledged hash',async t=>{
 const f=fixture(t);await f.engine.connect();let release;f.gate(new Promise(resolve=>{release=resolve;}));f.change();const pending=f.engine.sync();
 while(!f.writes())await new Promise(resolve=>setTimeout(resolve,1));
 f.engine.continueLocal();f.change();assert.equal(f.engine.state.enabled,false);assert.equal(f.engine.state.status,'paused');
 release();await pending;assert.equal(f.engine.state.status,'paused');
 const second=createCloudBackup(f.options);t.after(()=>second.stop());await second.init();assert.equal(second.state.enabled,false);assert.equal(second.state.status,'paused');
 f.gate(null);await second.setEnabled(true);await second.sync();assert.equal(second.state.status,'saved');assert.equal(JSON.parse(f.remote()).data.version,3);
});
