import { midiIndicatorMarkup } from '../midi-indicator.js';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { readMusicXML, bytesFromBase64 } from './musicxml-document.js';
import { excerptXML } from './musicxml-segments.js';
import { scoreFullscreen } from './platform.js';
import { scoreIcon } from './score-controls.js';
import { digest } from './library.js';
import { ui, localizeMessage } from './locale.js';
import './pdf-viewer.css';

export async function openMusicScore({ asset, selection, start = 0, end, session = null, onRendered = async () => {}, onClose = () => {} }) {
  const bytes = bytesFromBase64(asset.base64);
  if (await digest(bytes) !== asset.sha256) throw new Error(ui('The local score hash has changed. Revalidate it before viewing.', 'El archivo local de la partitura ha cambiado. Valídalo de nuevo antes de abrirlo.'));
  const validated = readMusicXML(bytes, asset.format);
  const xml = excerptXML(validated.xml, selection, start, end);
  const fullscreen = await scoreFullscreen(), modal = document.createElement('dialog');
  modal.className = 'pdf-viewer xml-score-viewer'; modal.setAttribute('aria-label', session ? ui('MusicXML practice', 'Práctica con MusicXML') : ui('MusicXML review preview', 'Vista previa de MusicXML'));
  modal.innerHTML = `<div class="xml-score-scroll" style="position:absolute;inset:0;overflow:auto;background:#fff"><div class="xml-score" style="min-width:320px;color:#111"></div></div><aside class="pdf-widget"><div class="pdf-widget-bar">${midiIndicatorMarkup()}<button data-xml="drag" aria-label="${ui('Move controls', 'Mover controles')}">${scoreIcon('drag')}</button><span class="xml-time"></span><button data-xml="pause" aria-label="${ui('Pause practice', 'Pausar práctica')}">${scoreIcon('pause')}</button><button data-xml="out" aria-label="${ui('Zoom out', 'Reducir zoom')}">−</button><button data-xml="in" aria-label="${ui('Zoom in', 'Ampliar zoom')}">+</button><button data-xml="prev" aria-label="${ui('Previous page', 'Página anterior')}">${scoreIcon('prev')}</button><button data-xml="next" aria-label="${ui('Next page', 'Página siguiente')}">${scoreIcon('next')}</button>${session?.finish ? `<button data-xml="finish" class="pdf-finish">${ui('Finish practice', 'Terminar práctica')}</button>` : ''}<button data-xml="close" aria-label="${ui('Back', 'Volver')}">${scoreIcon('close')}</button></div><p class="xml-status" style="margin:4px 8px;font-size:12px">${ui('Loading score…', 'Cargando partitura…')}</p></aside>`;
  document.body.append(modal); modal.showModal();
  const scroll = modal.querySelector('.xml-score-scroll'), target = modal.querySelector('.xml-score'), widget = modal.querySelector('.pdf-widget');
  let closed = false, timer, zoom = 1, drag = null;
  const running = () => !!session?.read().running;
  const controls = () => {
    const info = session?.read(); modal.dataset.running = String(running());
    modal.querySelector('.xml-time').textContent = info?.time || ui('Review', 'Revisión');
    const pause = modal.querySelector('[data-xml=pause]'); pause.hidden = !session; pause.innerHTML = scoreIcon(running() ? 'pause' : 'play'); pause.setAttribute('aria-label', running() ? ui('Pause practice', 'Pausar práctica') : ui('Resume practice', 'Continuar práctica'));
    for (const action of ['close', 'out', 'in']) modal.querySelector(`[data-xml=${action}]`).hidden = running();
    modal.querySelector('[data-xml=finish]')?.toggleAttribute('hidden', running());
    modal.querySelector('.xml-status').hidden = running();
  };
  const display = new OpenSheetMusicDisplay(target, { backend: 'svg', autoResize: true, drawingParameters: 'default', drawTitle: true, pageFormat: 'A4_P' });
  async function close() {
    if (closed) return;
    if (running()) { await session.toggle(); controls(); return; }
    closed = true; clearInterval(timer); display.AutoResizeEnabled = false; display.clear(); await fullscreen.exit(); modal.close(); modal.remove(); onClose(); return true;
  }
  modal.addEventListener('cancel', event => { event.preventDefault(); void close(); });
  modal.addEventListener('click', async event => {
    const action = event.target.closest('[data-xml]')?.dataset.xml;
    if (action === 'finish' && !running() && session?.finish) { if (await close()) await session.finish(); return; }
    if (action === 'close') await close();
    if (action === 'pause') { await session.toggle(); controls(); }
    if (action === 'next' || action === 'prev') scroll.scrollBy({ top: (action === 'next' ? 1 : -1) * scroll.clientHeight * .9, behavior: 'instant' });
    if (!running() && ['in', 'out'].includes(action)) { zoom = Math.max(.6, Math.min(2, zoom + (action === 'in' ? .2 : -.2))); display.Zoom = zoom; display.render(); }
  });
  const handle = modal.querySelector('[data-xml=drag]'); handle.style.touchAction = 'none';
  handle.onpointerdown = e => { e.preventDefault(); handle.setPointerCapture(e.pointerId); const r = widget.getBoundingClientRect(); drag = { x: e.clientX - r.x, y: e.clientY - r.y }; };
  handle.onpointermove = e => { if (!drag) return; widget.style.right = 'auto'; widget.style.bottom = 'auto'; widget.style.left = `${Math.max(8, Math.min(modal.clientWidth - widget.offsetWidth - 8, e.clientX - drag.x))}px`; widget.style.top = `${Math.max(8, Math.min(modal.clientHeight - widget.offsetHeight - 8, e.clientY - drag.y))}px`; };
  handle.onpointerup = handle.onpointercancel = () => { drag = null; };
  controls(); timer = setInterval(controls, 500);
  try {
    await display.load(xml); if (closed) return { close };
    display.render();
    if (!target.querySelector('svg')) throw new Error(ui('The renderer did not produce a score.', 'No se ha podido dibujar la partitura.'));
    await onRendered();
    modal.querySelector('.xml-status').textContent = ui('Written score · manual practice · no automatic note evaluation', 'Partitura escrita · práctica manual · sin evaluación automática de notas');
  } catch (error) { if (running()) await session.toggle(); controls(); modal.querySelector('.xml-status').textContent = `${ui('Could not display the score', 'No se ha podido mostrar la partitura')}: ${localizeMessage(error.message)}`; }
  return { close };
}
