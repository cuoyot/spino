import { on } from '../midi.js';

// Page-turn pedals, stored on this device only (like the instrument pairing). Pianos differ in what they
// send: the defaults are the standard sostenuto (middle, CC 66) and soft (left, CC 67) pedals, and the
// MIDI settings can learn any other controller.
const KEY = 'spino.pedals.v1';
export const DEFAULT_PEDALS = { next: 66, prev: 67 };
export const PEDAL_NAMES = { 64: ['right pedal', 'pedal derecho'], 66: ['middle pedal', 'pedal central'], 67: ['left pedal', 'pedal izquierdo'] };
const controller = value => Number.isInteger(value) && value >= 0 && value <= 127 ? value : null;

export function readPedals(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage?.getItem(KEY) || '{}');
    return { next: controller(value.next) ?? DEFAULT_PEDALS.next, prev: controller(value.prev) ?? DEFAULT_PEDALS.prev };
  } catch { return { ...DEFAULT_PEDALS }; }
}
export function savePedals(pedals, storage = globalThis.localStorage) {
  const value = { next: controller(pedals.next) ?? DEFAULT_PEDALS.next, prev: controller(pedals.prev) ?? DEFAULT_PEDALS.prev };
  storage?.setItem(KEY, JSON.stringify(value));
  return value;
}

// Calls turn(+1 | -1) once per press of a mapped pedal (holding it does not repeat). Returns an unsubscribe function.
export function onPedalTurn(turn, { storage = globalThis.localStorage, subscribe = on } = {}) {
  const down = {};
  return subscribe('control', ({ controller: cc, value }) => {
    const pedals = readPedals(storage), pressed = value >= 64, was = down[cc];
    down[cc] = pressed;
    if (!pressed || was) return;
    if (cc === pedals.next) turn(1);
    else if (cc === pedals.prev) turn(-1);
  });
}
