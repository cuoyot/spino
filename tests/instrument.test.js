import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInstrumentController, instrumentMarkup, readInstrumentPreferences } from '../src/companion/instrument-view.js';

const ADDRESS = 'AA:BB:CC:DD:EE:01';
function fixture(t, initial = {}, native = true) {
  const events = { devices: new Set(), ble: new Set() };
  let devices = [], stored = JSON.stringify(initial), scans = 0, connections = 0, refreshes = 0, error = null;
  const emit = (event, value) => { if (event === 'devices') devices = value; events[event].forEach(listener => listener(value)); };
  const storage = { getItem: () => stored, setItem: (key, value) => { assert.equal(key, 'spino.instrument.v1'); stored = value; } };
  const midi = { isNative: native, connectedDevices: () => [...devices], on: (event, listener) => { events[event].add(listener); return () => events[event].delete(listener); },
    refreshMidi: async () => { refreshes++; emit('devices', devices); }, scanBluetooth: async () => { scans++; if (error) throw error; },
    connectBluetooth: async address => { assert.equal(address, ADDRESS); connections++; if (error) throw error; emit('devices', ['Piano USB port name']); } };
  const controller = createInstrumentController({ midi, storage, scanTimeoutMs: 10, webAvailable: !native });
  t.after(() => controller.dispose());
  return { controller, emit, midi, storage, get scans() { return scans; }, get connections() { return connections; }, get refreshes() { return refreshes; }, set error(value) { error = value; } };
}

test('connecting finds Bluetooth instruments only on request and remembers an opened input', async t => {
  const f = fixture(t);
  await f.controller.init();
  assert.equal(f.scans, 0);
  f.emit('ble', { address: ADDRESS, name: 'Ignored before scanning' });
  assert.equal(f.controller.state.nearby.length, 0);
  await f.controller.connect();
  f.emit('ble', { address: ADDRESS, name: 'My piano' });
  f.emit('ble', { address: ADDRESS.toLowerCase(), name: 'My piano' });
  f.emit('ble', { address: '<invalid>', name: 'Invalid device' });
  assert.equal(f.scans, 1);
  assert.equal(f.controller.state.nearby.length, 1);
  assert.equal(f.controller.state.scanning, true);
  assert.match(instrumentMarkup(f.controller.state), /data-action="instrument-device" data-id="AA:BB:CC:DD:EE:01" >Connect<\/button>/);
  await f.controller.connectDevice(ADDRESS);
  assert.equal(f.connections, 1);
  assert.deepEqual(f.controller.state.devices, ['Piano USB port name']);
  assert.deepEqual(readInstrumentPreferences(f.storage).remembered, [{ address: ADDRESS, name: 'My piano', connectedName: 'Piano USB port name' }]);
  assert.equal(f.controller.state.autoConnect, false);
  f.controller.setAutoConnect(true);
  assert.equal(readInstrumentPreferences(f.storage).autoConnect, true);
});

test('launch reconnects a remembered piano only when enabled and never starts a Bluetooth scan', async t => {
  const initial = { autoConnect: true, remembered: [{ address: ADDRESS, name: 'My piano', connectedName: 'Piano USB port name' }] };
  const f = fixture(t, initial);
  await Promise.all([f.controller.init(), f.controller.init()]);
  assert.equal(f.connections, 1);
  assert.equal(f.scans, 0);
  f.controller.forgetDevice(ADDRESS);
  assert.deepEqual(f.controller.state.remembered, []);
  assert.equal(readInstrumentPreferences(f.storage).autoConnect, false);
  assert.equal(f.controller.state.devices.length, 1, 'Forgetting does not close a playing input');

  const disabled = fixture(t, { ...initial, autoConnect: false });
  await disabled.controller.init();
  assert.equal(disabled.connections, 0);
});

test('instrument view keeps unsupported actions hidden and provides localized concise errors', async t => {
  const f = fixture(t);
  await f.controller.connect();
  f.emit('ble', { address: ADDRESS, name: '<Keyboard & Piano>' });
  f.error = new Error('Bluetooth permission denied');
  await f.controller.connectDevice(ADDRESS);
  assert.equal(f.controller.state.error, 'permission');
  assert.equal(f.controller.state.remembered.length, 0);
  const spanish = instrumentMarkup(f.controller.state, { lang: 'es' });
  assert.match(spanish, /Permite el acceso a MIDI o Bluetooth/);
  assert.match(spanish, /&lt;Keyboard &amp; Piano&gt;/);
  assert.doesNotMatch(spanish, /data-action="instrument-autoconnect"/);

  const browser = fixture(t, {}, false);
  await browser.controller.init();
  assert.equal(browser.refreshes, 0, 'Profile initialization must not ask for Web MIDI permission');
  await browser.controller.connect();
  assert.equal(browser.refreshes, 1);
  assert.equal(browser.scans, 0);
  assert.doesNotMatch(instrumentMarkup(browser.controller.state), /data-action="instrument-autoconnect"|data-action="instrument-device"/);
  browser.controller.state.available = false;
  assert.doesNotMatch(instrumentMarkup(browser.controller.state), /data-action="instrument-connect"/);
  assert.match(instrumentMarkup(browser.controller.state), /MIDI is unavailable/);
});

test('failed native connection without an opened input does not create a saved instrument', async t => {
  const f = fixture(t);
  f.midi.connectBluetooth = async () => {};
  await f.controller.connect();
  f.emit('ble', { address: ADDRESS, name: 'My piano' });
  await f.controller.connectDevice(ADDRESS);
  assert.equal(f.controller.state.error, 'noInput');
  assert.equal(f.controller.state.remembered.length, 0);
});

test('device preferences discard malformed and duplicate Bluetooth identifiers', () => {
  const storage = { getItem: () => JSON.stringify({ autoConnect: 'true', remembered: [{ address: ADDRESS.toLowerCase(), name: 'Piano' }, { address: ADDRESS, name: 'Duplicate' }, { address: 'not a Bluetooth address', name: 'Invalid' }, null] }) };
  assert.deepEqual(readInstrumentPreferences(storage), { autoConnect: false, remembered: [{ address: ADDRESS, name: 'Piano', connectedName: 'Piano' }] });
  assert.deepEqual(readInstrumentPreferences({ getItem() { throw Error('Unavailable'); } }), { autoConnect: false, remembered: [] });
});
