import test from 'node:test';
import assert from 'node:assert/strict';
import { readPedals, savePedals, onPedalTurn, DEFAULT_PEDALS } from '../src/companion/pedals.js';

const memory = () => { const data = {}; return { getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = value; } }; };
const bus = () => { const listeners = new Set(); return { subscribe: (event, cb) => { assert.equal(event, 'control'); listeners.add(cb); return () => listeners.delete(cb); }, send: (controller, value) => listeners.forEach(cb => cb({ controller, value })), size: () => listeners.size }; };

test('pedal mapping defaults to middle/left and keeps only valid controllers', () => {
  const storage = memory();
  assert.deepEqual(readPedals(storage), DEFAULT_PEDALS);
  savePedals({ next: 64, prev: 300 }, storage);
  assert.deepEqual(readPedals(storage), { next: 64, prev: 67 });
  storage.setItem('spino.pedals.v1', '{broken');
  assert.deepEqual(readPedals(storage), DEFAULT_PEDALS);
});

test('a mapped pedal turns once per press and holding it does not repeat', () => {
  const storage = memory(), midi = bus(), turns = [];
  const stop = onPedalTurn(delta => turns.push(delta), { storage, subscribe: midi.subscribe });
  midi.send(66, 127); midi.send(66, 127); midi.send(66, 90); // held: one turn
  midi.send(66, 0); midi.send(66, 127); // pressed again
  midi.send(67, 127); midi.send(64, 127); // left back; sustain is not mapped
  assert.deepEqual(turns, [1, 1, -1]);
  savePedals({ next: 64, prev: 67 }, storage);
  midi.send(64, 0); midi.send(64, 127);
  assert.deepEqual(turns, [1, 1, -1, 1], 'a learned controller applies without resubscribing');
  stop(); assert.equal(midi.size(), 0);
});

test('MIDI settings show the last pedal signal and learn a new pedal', async () => {
  const { createInstrumentController, instrumentMarkup } = await import('../src/companion/instrument-view.js');
  const events = { devices: new Set(), ble: new Set(), control: new Set() }, storage = memory();
  const midi = { isNative: false, connectedDevices: () => [], on: (event, cb) => { events[event].add(cb); return () => events[event].delete(cb); } };
  const controller = createInstrumentController({ midi, storage, webAvailable: true });
  assert.match(instrumentMarkup(controller.state, { lang: 'en' }), /No pedal signal received yet/);
  controller.learnPedal('next');
  assert.match(instrumentMarkup(controller.state, { lang: 'en' }), /Press the pedal now/);
  events.control.forEach(cb => cb({ controller: 64, value: 127 }));
  assert.equal(controller.state.pedals.next, 64); assert.equal(controller.state.learning, null);
  assert.match(instrumentMarkup(controller.state, { lang: 'es' }), /Última señal de pedal: CC 64 · pedal derecho · 127/);
  controller.resetPedals(); assert.deepEqual(readPedals(storage), DEFAULT_PEDALS);
  controller.dispose();
});
