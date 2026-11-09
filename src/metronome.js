import { ac } from './audio.js';
import processorURL from './metronome-processor.js?url&no-inline';

let moduleReady;
export function preloadMetronome() {
  try {
    const context = ac();
    moduleReady ||= context.audioWorklet.addModule(processorURL).catch(error => { moduleReady = null; throw error; });
    return moduleReady;
  } catch (error) { return Promise.reject(error); }
}
export function createMetronome(onBeat = () => {}, onError = error => console.error('Metronome unavailable.', error)) {
  const context = ac();
  let node, stopped = false, config;
  const ready = preloadMetronome().then(() => {
    if (stopped) return;
    node = new AudioWorkletNode(context, 'spino-metronome', {numberOfInputs: 0, outputChannelCount: [1]});
    node.port.onmessage = ({data}) => { if (!stopped) onBeat(data); };
    node.connect(context.destination);
    if (config) node.port.postMessage(config);
  }).catch(onError);
  return {
    ready,
    configure(value) { config = value; node?.port.postMessage(value); },
    stop() { stopped = true; config = null; if (node) { node.port.postMessage(null); node.port.close(); node.disconnect(); } },
  };
}
