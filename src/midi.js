// MIDI input: native Android plugin (USB + Bluetooth LE) with Web MIDI fallback for desktop browsers.
import { Capacitor, registerPlugin } from '@capacitor/core';

const Native = registerPlugin('Midi');
const listeners = { note: [], noteOff: [], devices: [], ble: [] };
let webDevices = [];

export const isNative = Capacitor.isNativePlatform();

export function on(event, cb) {
  listeners[event].push(cb);
}

function emit(event, data) {
  listeners[event].forEach((cb) => cb(data));
}

export async function initMidi() {
  if (isNative) {
    await Native.addListener('noteOn', (e) => emit('note', { midi: e.note, velocity: e.velocity }));
    await Native.addListener('noteOff', (e) => emit('noteOff', { midi: e.note }));
    await Native.addListener('devicesChanged', (e) => emit('devices', e.devices));
    await Native.addListener('bleDevice', (e) => emit('ble', e));
    const { devices } = await Native.openAll();
    emit('devices', devices);
    return;
  }
  if (!navigator.requestMIDIAccess) return;
  try {
    const access = await navigator.requestMIDIAccess();
    const bind = () => {
      webDevices = [];
      access.inputs.forEach((input) => {
        webDevices.push(input.name);
        input.onmidimessage = (m) => {
          const [status, note, vel] = m.data;
          const type = status & 0xf0;
          if (type === 0x90 && vel > 0) emit('note', { midi: note, velocity: vel });
          else if (type === 0x80 || (type === 0x90 && vel === 0)) emit('noteOff', { midi: note });
        };
      });
      emit('devices', webDevices);
    };
    access.onstatechange = bind;
    bind();
  } catch (e) {
    console.warn('Web MIDI unavailable', e);
  }
}

// Test hook: pretend MIDI inputs (dis)connected, e.g. simulateDevices(['Test keyboard']) from the console
export function simulateDevices(names) {
  emit('devices', names);
}
export function simulateNote(midi, on = true) {
  emit(on ? 'note' : 'noteOff', on ? { midi, velocity: 80 } : { midi });
}

export async function scanBluetooth() {
  if (!isNative) throw new Error('Bluetooth scan is only available in the Android app');
  await Native.scanBluetooth({ seconds: 10 });
}

export async function connectBluetooth(address) {
  const { devices } = await Native.connectBluetooth({ address });
  emit('devices', devices);
}
