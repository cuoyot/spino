// MIDI input: native Android/iOS bridges with Web MIDI fallback for desktop browsers.
import { Capacitor, registerPlugin } from '@capacitor/core';

const Native = registerPlugin('Midi');
const listeners = { note: [], noteOff: [], control: [], devices: [], ble: [] };
let devices = [], initialization = null, webAccess = null, simulated = false;
let subscriptions = [];
const controls = new Map();
export const controllerState = () => [...controls.values()];
export const connectedDevices = () => [...devices];

export const isNative = Capacitor.isPluginAvailable('Midi');
export const systemBluetoothPicker = isNative && Capacitor.getPlatform() === 'ios';
export async function showBluetoothPicker() { await Native.showBluetoothPicker(); }

export function on(event, cb) {
  listeners[event].push(cb);
  return () => { const index = listeners[event].indexOf(cb); if (index >= 0) listeners[event].splice(index, 1); };
}

function emit(event, data) {
  if (event === 'devices') { if(JSON.stringify(devices)!==JSON.stringify(data))controls.clear(); devices = [...data]; }
  if (event === 'control') controls.set((data.channel||0)+':'+data.controller,{...data});
  listeners[event].forEach((cb) => cb(data));
}

export function initMidi() {
  if (!initialization) initialization = initialize().catch(async error => {
    await Promise.allSettled(subscriptions.map(listener => listener.remove()));
    subscriptions = []; initialization = null; throw error;
  });
  return initialization;
}
export async function refreshMidi() {
  if (simulated) return;
  await initMidi();
  if (isNative) { const result = await Native.openAll(); emit('devices', result.devices); }
  else if (webAccess) await bindWebInputs();
}
async function bindWebInputs() {
  const names = [];
  await Promise.all([...webAccess.inputs.values()].map(async input => {
    if (input.state === 'disconnected') { input.onmidimessage = null; return; }
    input.onmidimessage = m => {
      const [status, note, vel] = m.data, type = status & 0xf0;
      if (type === 0x90 && vel > 0) emit('note', { midi: note, velocity: vel, channel: status & 15, timestamp: m.timeStamp });
      else if (type === 0x80 || (type === 0x90 && vel === 0)) emit('noteOff', { midi: note, channel: status & 15, timestamp: m.timeStamp });
      else if (type === 0xb0) emit('control', { controller: note, value: vel, channel: status & 15, timestamp: m.timeStamp });
    };
    try { if (input.connection !== 'open') await input.open(); if (input.state !== 'disconnected') names.push(input.name || 'MIDI input'); }
    catch { input.onmidimessage = null; }
  }));
  emit('devices', names);
}
async function initialize() {
  if (isNative) {
    subscriptions.push(await Native.addListener('noteOn', (e) => emit('note', { midi: e.note, velocity: e.velocity, channel: e.channel || 0, timestamp: e.timestamp })));
    subscriptions.push(await Native.addListener('noteOff', (e) => emit('noteOff', { midi: e.note, channel: e.channel || 0, timestamp: e.timestamp })));
    subscriptions.push(await Native.addListener('controlChange', (e) => emit('control', { controller: e.controller, value: e.value, channel: e.channel || 0, timestamp: e.timestamp })));
    subscriptions.push(await Native.addListener('devicesChanged', (e) => emit('devices', e.devices)));
    subscriptions.push(await Native.addListener('bleDevice', (e) => emit('ble', e)));
    const { devices } = await Native.openAll();
    emit('devices', devices);
    return;
  }
  if (!navigator.requestMIDIAccess) return;
  try {
    webAccess = await navigator.requestMIDIAccess();
    webAccess.onstatechange = () => { void bindWebInputs(); };
    await bindWebInputs();
  } catch (e) {
    emit('devices', []);
    throw e;
  }
}

// Test hook: pretend MIDI inputs (dis)connected, e.g. simulateDevices(['Test keyboard']) from the console
export function simulateDevices(names) {
  simulated = true;
  emit('devices', names);
}
export function simulateControl(controller, value, timestamp = performance.now()) {
  emit('control', { controller, value, timestamp });
}
export function simulateNote(midi, on = true, timestamp = performance.now()) {
  emit(on ? 'note' : 'noteOff', on ? { midi, velocity: 80, timestamp } : { midi, timestamp });
}

export async function scanBluetooth() {
  if (!isNative) throw new Error('Bluetooth scan is only available in the Android app');
  await Native.scanBluetooth({ seconds: 10 });
}

export async function connectBluetooth(address) {
  const { devices } = await Native.connectBluetooth({ address });
  emit('devices', devices);
}
