import { ui } from './companion/locale.js';
import { on, connectedDevices } from './midi.js';

let context = null, lastNote = null, timer;
export const midiIndicatorMarkup = () => `<span data-midi-indicator role="img" aria-label="${ui('MIDI disconnected','MIDI desconectado')}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v10h3V4m4 0v10h3V4M7 14v6m5-6v6m5-6v6"/></svg><i class="midi-connection"></i><i class="midi-activity"></i></span>`;
export function setMidiContext(value) { context = value; refresh(); }
function refresh() {
  if (typeof document === 'undefined') return;
  const devices = connectedDevices();
  const message = devices.length ? `${ui('MIDI connected: ','MIDI conectado: ')}${devices.join(', ')}. ${context === 'midi' ? ui('MIDI input selected.','Entrada MIDI seleccionada.') : context ? ui('This practice does not evaluate MIDI. Select MIDI piano.','Esta práctica no evalúa MIDI. Selecciona Piano MIDI.') : ui('Ready for a MIDI practice.','Listo para practicar con MIDI.')}${lastNote != null ? ui(` Last received note: ${lastNote}.`,` Última nota recibida: ${lastNote}.`) : ''}` : ui('MIDI disconnected. No open input port.','MIDI desconectado. No hay puertos de entrada abiertos.');
  document.querySelectorAll('[data-midi-indicator]').forEach(el => {
    el.dataset.connected = String(devices.length > 0);
    el.dataset.input = context === 'midi' ? 'midi' : context ? 'manual' : 'none';
    el.title = message; el.setAttribute('aria-label', message);
  });
}
on('devices', () => { lastNote = null; refresh(); });
on('note', event => {
  if (typeof document === 'undefined') return;
  lastNote = event.midi; refresh(); clearTimeout(timer);
  document.querySelectorAll('[data-midi-indicator]').forEach(el => {
    el.dataset.active = 'true';
    el.querySelector('.midi-activity')?.animate?.([{ opacity: .25 }, { opacity: 1, offset: .2 }, { opacity: .25 }], { duration: 240 });
  });
  timer = setTimeout(() => document.querySelectorAll('[data-midi-indicator]').forEach(el => { el.dataset.active = 'false'; }), 240);
});
// Screens and modal widgets mount dynamically; new indicators inherit the current connection.
if (typeof document !== 'undefined') new MutationObserver(records => {
  if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches('[data-midi-indicator]') || node.querySelector('[data-midi-indicator]'))))) refresh();
}).observe(document.documentElement, { childList: true, subtree: true });

if (typeof window !== 'undefined') window.addEventListener('spino:language', refresh);
