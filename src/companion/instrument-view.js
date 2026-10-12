import * as deviceMidi from '../midi.js';
import { catalanCopy } from './locale-ca.js';
import { localize } from './locale.js';
import { midiIndicatorMarkup } from '../midi-indicator.js';
import { readPedals, savePedals, DEFAULT_PEDALS, PEDAL_NAMES } from './pedals.js';

const SETTINGS_KEY = 'spino.instrument.v1';
const validAddress = value => typeof value === 'string' && /^(?:[\da-f]{2}:){5}[\da-f]{2}$/i.test(value);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const labels = {
  en: { connected: 'Connected', disconnected: 'No instrument connected', play: 'Play a note to check the signal.', connect: 'Connect instrument', another: 'Connect another instrument', connecting: 'Connecting…', scanning: 'Searching nearby…', search: 'Search again', usb: 'USB', usbHint: 'Connect the cable. SPino detects your piano automatically.', instruments: 'Connected instruments', saved: 'Saved Bluetooth instruments', nearby: 'Nearby instruments', bluetooth: 'Bluetooth MIDI', noNearby: 'Keep your piano nearby with Bluetooth MIDI enabled.', auto: 'Reconnect on launch', autoHint: 'On this device only', reconnect: 'Connect', forget: 'Forget saved instrument', signal: 'MIDI activity', unsupported: 'MIDI is unavailable on this device.', permission: 'Allow MIDI or Bluetooth access to connect.', bluetoothOff: 'Turn on Bluetooth to find your piano.', failed: 'Connection failed. Try again.', scanFailed: 'Could not search for instruments. Try again.', noInput: 'No MIDI input was opened.', storage: 'Device settings could not be saved.', disconnectedDevice: 'Not connected', empty: 'No instruments found. Check that your piano is discoverable.', pedals: 'Page-turn pedals', pedalsHint: 'Turn score pages with your piano pedals.', nextPage: 'Next page', prevPage: 'Previous page', change: 'Change', press: 'Press the pedal now…', cancel: 'Cancel', reset: 'Use default pedals', lastSignal: 'Last pedal signal', noSignal: 'No pedal signal received yet. Press a pedal to check that your piano sends it.' },
  es: { connected: 'Conectado', disconnected: 'Sin instrumento conectado', play: 'Toca una tecla para comprobar la señal.', connect: 'Conectar instrumento', another: 'Conectar otro instrumento', connecting: 'Conectando…', scanning: 'Buscando cerca…', search: 'Buscar de nuevo', usb: 'USB', usbHint: 'Conecta el cable. SPino detecta tu piano automáticamente.', instruments: 'Instrumentos conectados', saved: 'Instrumentos Bluetooth guardados', nearby: 'Instrumentos cercanos', bluetooth: 'Bluetooth MIDI', noNearby: 'Acerca el piano y activa su Bluetooth MIDI.', auto: 'Reconectar al abrir SPino', autoHint: 'Solo en este dispositivo', reconnect: 'Conectar', forget: 'Olvidar instrumento guardado', signal: 'Actividad MIDI', unsupported: 'MIDI no está disponible en este dispositivo.', permission: 'Permite el acceso a MIDI o Bluetooth para conectar.', bluetoothOff: 'Activa Bluetooth para encontrar tu piano.', failed: 'No se pudo conectar. Inténtalo de nuevo.', scanFailed: 'No se pudieron buscar instrumentos. Inténtalo de nuevo.', noInput: 'No se ha abierto ninguna entrada MIDI.', storage: 'No se han podido guardar los ajustes del dispositivo.', disconnectedDevice: 'Sin conectar', empty: 'No se han encontrado instrumentos. Comprueba que el piano esté visible.', pedals: 'Pedales para pasar página', pedalsHint: 'Pasa las páginas de la partitura con los pedales del piano.', nextPage: 'Página siguiente', prevPage: 'Página anterior', change: 'Cambiar', press: 'Pisa el pedal ahora…', cancel: 'Cancelar', reset: 'Usar pedales por defecto', lastSignal: 'Última señal de pedal', noSignal: 'Aún no ha llegado ninguna señal de pedal. Pisa un pedal para comprobar que el piano la envía.' },
};

export function readInstrumentPreferences(storage) {
  try {
    const value = JSON.parse(storage?.getItem(SETTINGS_KEY) || '{}');
    const seen = new Set();
    const remembered = (Array.isArray(value.remembered) ? value.remembered : []).filter(device => {
      if (!device || !validAddress(device.address) || seen.has(device.address.toUpperCase())) return false;
      seen.add(device.address.toUpperCase()); return true;
    }).slice(0, 20).map(device => ({ address: device.address.toUpperCase(), name: String(device.name || 'Bluetooth MIDI').slice(0, 120), connectedName: String(device.connectedName || device.name || '').slice(0, 120) }));
    return { autoConnect: value.autoConnect === true, remembered };
  } catch { return { autoConnect: false, remembered: [] }; }
}

function errorCode(error, fallback = 'failed') {
  const message = String(error?.message || error || '').toLowerCase();
  if (/permission|denied|notallowed/.test(message)) return 'permission';
  if (/bluetooth is off/.test(message)) return 'bluetoothOff';
  if (/not supported|unavailable|only available/.test(message)) return 'unsupported';
  if (/no midi input/.test(message)) return 'noInput';
  return fallback;
}

/** Device preferences stay local: a notebook sync must not pair another device's hardware. */
export function createInstrumentController({ changed = () => {}, midi = deviceMidi, storage = globalThis.localStorage, scanTimeoutMs = 10000, webAvailable = typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function' } = {}) {
  const preferences = readInstrumentPreferences(storage);
  const state = { pedals: readPedals(storage), learning: null, lastControl: null, devices: midi.connectedDevices(), native: midi.isNative, systemBluetoothPicker: !!midi.systemBluetoothPicker, available: midi.isNative || webAvailable, remembered: preferences.remembered, autoConnect: preferences.autoConnect, nearby: [], scanning: false, searched: false, connecting: '', error: '' };
  let initialized = null, scanTimer = null, disposed = false;
  const update = () => { if (!disposed) changed(state); };
  const stopScanning = () => { clearTimeout(scanTimer); scanTimer = null; state.scanning = false; };
  const save = () => {
    try {
      if (!storage) throw new Error('Device storage unavailable');
      storage.setItem(SETTINGS_KEY, JSON.stringify({ autoConnect: state.autoConnect, remembered: state.remembered }));
    } catch { state.error = 'storage'; }
  };
  const subscriptions = [
    midi.on('devices', names => {
      if (state.devices.length === names.length && state.devices.every((name, index) => name === names[index])) return;
      state.devices = [...names]; update();
    }),
    // Pedals arrive as control changes; show the last one and, while learning, map it.
    midi.on('control', ({ controller, value }) => {
      state.lastControl = { controller, value };
      if (state.learning && value >= 64) {
        try { state.pedals = savePedals({ ...state.pedals, [state.learning]: controller }, storage); } catch { state.error = 'storage'; }
        state.learning = null;
      }
      update();
    }),
    midi.on('ble', device => {
      if (!state.scanning || !validAddress(device?.address)) return;
      const entry = { address: device.address.toUpperCase(), name: String(device.name || 'Bluetooth MIDI') };
      const existing = state.nearby.findIndex(value => value.address === entry.address);
      if (existing < 0) state.nearby.push(entry);
      else if (state.nearby[existing].name !== entry.name) state.nearby[existing] = entry;
      else return;
      update();
    }),
  ];

  async function connectDevice(address, { automatic = false } = {}) {
    if (disposed || state.connecting || !validAddress(address)) return;
    const entry = [...state.nearby, ...state.remembered].find(device => device.address === address.toUpperCase());
    if (!entry) return;
    stopScanning(); state.connecting = entry.address; state.error = ''; update();
    const previousDevices = midi.connectedDevices();
    try {
      await midi.connectBluetooth(entry.address);
      if (disposed) return;
      state.devices = midi.connectedDevices();
      const connectedName = state.devices.find(name => !previousDevices.includes(name)) || state.devices.find(name => name === entry.connectedName || name === entry.name);
      if (!connectedName) throw new Error('No MIDI input was opened');
      const remembered = { ...entry, connectedName };
      state.remembered = [remembered, ...state.remembered.filter(device => device.address !== entry.address)].slice(0, 20);
      save();
    } catch (error) { if (!automatic) state.error = errorCode(error); }
    finally { state.connecting = ''; update(); }
  }

  return {
    state,
    init() {
      if (!initialized) initialized = (async () => {
        // Web MIDI permission stays with the existing input lifecycle and the explicit Connect action.
        if (!state.available || !state.native) return;
        try { await midi.refreshMidi(); }
        catch (error) { state.error = errorCode(error); update(); return; }
        if (state.native && !state.systemBluetoothPicker && state.autoConnect) {
          for (const device of [...state.remembered]) {
            if (disposed) break;
            if (!state.devices.includes(device.connectedName)) await connectDevice(device.address, { automatic: true });
          }
        }
      })();
      return initialized;
    },
    async reconnectLast() {
      if (disposed || state.connecting || state.scanning || state.devices.length) return;
      try { await midi.refreshMidi(); } catch (error) { state.error = errorCode(error); update(); return; }
      if (state.devices.length) return;
      if (state.native && !state.systemBluetoothPicker && state.remembered.length) await connectDevice(state.remembered[0].address);
      else if (state.systemBluetoothPicker) await midi.showBluetoothPicker();
      else { state.error = state.available ? 'failed' : 'unsupported'; update(); }
    },
    async connect() {
      if (disposed || state.connecting || state.scanning) return;
      if (!state.available) { state.error = 'unsupported'; update(); return; }
      state.error = ''; state.connecting = 'usb'; update();
      try {
        await midi.refreshMidi();
        if (disposed) return;
        if (state.systemBluetoothPicker) { await midi.showBluetoothPicker(); }
        else if (state.native) {
          state.nearby = []; state.scanning = true; state.searched = true; update();
          await midi.scanBluetooth();
          if (disposed) return;
          scanTimer = setTimeout(() => { stopScanning(); update(); }, scanTimeoutMs);
        }
      } catch (error) { stopScanning(); state.error = errorCode(error, state.native ? 'scanFailed' : 'failed'); }
      finally { state.connecting = ''; update(); }
    },
    connectDevice,
    forgetDevice(address) {
      state.remembered = state.remembered.filter(device => device.address !== address);
      if (!state.remembered.length) state.autoConnect = false;
      state.error = ''; save(); update();
    },
    learnPedal(action) { state.learning = ['next', 'prev'].includes(action) && state.learning !== action ? action : null; update(); },
    resetPedals() { try { state.pedals = savePedals(DEFAULT_PEDALS, storage); } catch { state.error = 'storage'; } state.learning = null; update(); },
    setAutoConnect(enabled) { state.autoConnect = Boolean(enabled && state.remembered.length && state.native); state.error = ''; save(); update(); },
    dispose() { disposed = true; stopScanning(); subscriptions.forEach(unsubscribe => unsubscribe()); },
  };
}

const keyboard = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="3" y="8" width="26" height="18" rx="3"/><path d="M10 8v18m6-18v18m6-18v18M8 8v9h4V8m6 0v9h4V8"/></svg>';
const bluetooth = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10-5 4V3l5 4L7 17"/></svg>';

export function instrumentMarkup(state, { lang = 'en' } = {}) {
  const t = lang === 'ca' ? catalanCopy(labels.en) : labels[lang] || labels.en, esc = escapeHTML;
  const disabled = state.connecting || state.scanning;
  const deviceRow = (device, saved) => {
    const connected = state.devices.includes(device.connectedName || device.name);
    return `<li class="cp-instrument-row"><span class="cp-instrument-device-icon">${bluetooth}</span><div><strong>${esc(device.name)}</strong><small>${esc(connected ? t.connected : t.disconnectedDevice)}</small></div>${connected ? '<span class="cp-instrument-status-dot" aria-hidden="true"></span>' : `<button type="button" data-action="instrument-device" data-id="${esc(device.address)}" ${state.connecting ? 'disabled' : ''}>${esc(state.connecting === device.address ? t.connecting : t.reconnect)}</button>`}${saved ? `<button type="button" class="cp-instrument-forget" data-action="instrument-forget" data-id="${esc(device.address)}" aria-label="${esc(t.forget + ': ' + device.name)}" title="${esc(t.forget)}">×</button>` : ''}</li>`;
  };
  const nearby = state.nearby.filter(device => !state.remembered.some(saved => saved.address === device.address));
  const pedalName = cc => { const name = PEDAL_NAMES[cc]; return `CC ${cc}${name ? ' · ' + localize(name[0], name[1], lang) : ''}`; };
  const pedalRow = (action, label) => `<li class="cp-instrument-row cp-pedal-row"><div><strong>${esc(label)}</strong><small>${esc(state.learning === action ? t.press : pedalName(state.pedals[action]))}</small></div><button type="button" data-action="instrument-pedal" data-id="${action}" ${state.learning === action ? 'class="primary"' : ''}>${esc(state.learning === action ? t.cancel : t.change)}</button></li>`;
  const pedals = state.available ? `<section class="cp-card cp-instrument-devices cp-instrument-pedals"><h3>${t.pedals}</h3><p class="muted">${t.pedalsHint}</p><ul>${pedalRow('next', t.nextPage)}${pedalRow('prev', t.prevPage)}</ul><p class="muted" role="status">${state.lastControl ? `${t.lastSignal}: ${esc(pedalName(state.lastControl.controller))} · ${state.lastControl.value}` : t.noSignal}</p>${state.pedals.next !== DEFAULT_PEDALS.next || state.pedals.prev !== DEFAULT_PEDALS.prev ? `<button type="button" class="quiet" data-action="instrument-pedal-reset">${t.reset}</button>` : ''}</section>` : '';
  return `<section id="instrument-panel" class="cp-instrument-panel" aria-label="${esc(t.instruments)}">
    <div class="cp-card cp-instrument-hero"><div class="cp-instrument-hero-top"><span class="cp-instrument-keyboard">${keyboard}</span><span class="cp-instrument-signal" title="${esc(t.signal)}">${midiIndicatorMarkup()}</span></div><h2>${esc(state.devices.length ? t.connected : t.disconnected)}</h2><p>${esc(!state.available ? t.unsupported : state.devices.length ? t.play : state.native ? t.noNearby : t.usbHint)}</p>
      ${state.devices.length ? `<ul class="cp-instrument-connected">${state.devices.map(name => `<li><span class="cp-instrument-status-dot" aria-hidden="true"></span><strong>${esc(name)}</strong></li>`).join('')}</ul>` : ''}
      ${state.available ? `<button type="button" class="primary cp-instrument-connect" data-action="instrument-connect" ${disabled ? 'disabled' : ''}>${esc(state.scanning ? t.scanning : state.connecting ? t.connecting : state.devices.length ? t.another : state.searched ? t.search : t.connect)}</button>` : ''}
      ${state.error ? `<p class="cp-instrument-error" role="alert">${esc(t[state.error] || t.failed)}</p>` : ''}
    </div>
    ${state.available && state.native ? `<div class="cp-instrument-usb"><span>${keyboard}</span><div><strong>${t.usb}</strong><p>${t.usbHint}</p></div></div>` : ''}
    ${state.native && !state.systemBluetoothPicker && state.remembered.length ? `<section class="cp-card cp-instrument-devices"><h3>${t.saved}</h3><ul>${state.remembered.map(device => deviceRow(device, true)).join('')}</ul><button type="button" data-action="instrument-autoconnect" class="cp-instrument-toggle" role="switch" aria-checked="${state.autoConnect}"><span><strong>${t.auto}</strong><small>${t.autoHint}</small></span><i aria-hidden="true"></i></button></section>` : ''}
    ${state.native && !state.systemBluetoothPicker && (state.scanning || state.searched || nearby.length) ? `<section class="cp-card cp-instrument-devices"><h3>${t.nearby}${state.scanning ? '<span class="cp-instrument-searching" aria-hidden="true"></span>' : ''}</h3>${nearby.length ? `<ul>${nearby.map(device => deviceRow(device, false)).join('')}</ul>` : `<p role="status">${state.scanning ? t.scanning : t.empty}</p>`}</section>` : ''}
    ${pedals}
  </section>`;
}
