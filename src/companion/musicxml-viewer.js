import { midiIndicatorMarkup } from '../midi-indicator.js';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { readMusicXML, bytesFromBase64 } from './musicxml-document.js';
import { excerptXML } from './musicxml-segments.js';
import { scoreFullscreen } from './platform.js';
import { scoreIcon } from './score-controls.js';
import { digest } from './library.js';
import { ui, localizeMessage } from './locale.js';
import { marginTurn, turnEdge } from './pdf-annotations.js';
import { onPedalTurn } from './pedals.js';
import './pdf-viewer.css';

export async function openMusicScore({ asset, selection, start = 0, end, session = null, onRendered = async () => {}, onClose = () => {} }) {
  const bytes = bytesFromBase64(asset.base64);
  if (await digest(bytes) !== asset.sha256) throw new Error(ui('The local score hash has changed. Revalidate it before viewing.', 'El archivo local de la partitura ha cambiado. Valídalo de nuevo antes de abrirlo.'));
  const validated = readMusicXML(bytes, asset.format);
  const xml = excerptXML(validated.xml, selection, start, end);
  const fullscreen = await scoreFullscreen(), modal = document.createElement('dialog');
  modal.className = 'pdf-viewer xml-score-viewer'; modal.setAttribute('aria-label', session ? ui('MusicXML practice', 'Práctica con MusicXML') : ui('MusicXML review preview', 'Vista previa de MusicXML'));
  modal.innerHTML = `<div class="xml-score-scroll" style="position:absolute;inset:0;overflow:hidden;background:#fff;touch-action:none"><div class="xml-score" style="min-width:320px;color:#111"></div></div><div class="xml-page-mask" aria-hidden="true"></div><div class="pdf-turn-zone" data-side="prev" aria-hidden="true"></div><div class="pdf-turn-zone" data-side="next" aria-hidden="true"></div><aside class="pdf-widget"><div class="pdf-widget-bar">${midiIndicatorMarkup()}<button data-xml="drag" aria-label="${ui('Move controls', 'Mover controles')}">${scoreIcon('drag')}</button><span class="xml-time"></span><button data-xml="pause" aria-label="${ui('Pause practice', 'Pausar práctica')}">${scoreIcon('pause')}</button><button data-xml="out" aria-label="${ui('Zoom out', 'Reducir zoom')}">−</button><button data-xml="in" aria-label="${ui('Zoom in', 'Ampliar zoom')}">+</button><button data-xml="prev" aria-label="${ui('Previous page', 'Página anterior')}">${scoreIcon('prev')}</button><span class="xml-page-count" aria-live="polite"></span><button data-xml="next" aria-label="${ui('Next page', 'Página siguiente')}">${scoreIcon('next')}</button>${session?.finish ? `<button data-xml="finish" class="pdf-finish">${ui('Finish practice', 'Terminar práctica')}</button>` : ''}<button data-xml="close" aria-label="${ui('Back', 'Volver')}">${scoreIcon('close')}</button></div><p class="xml-status" style="margin:4px 8px;font-size:12px">${ui('Loading score…', 'Cargando partitura…')}</p></aside>`;
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
  const display = new OpenSheetMusicDisplay(target, { backend: 'svg', autoResize: true, drawingParameters: 'default', drawTitle: true, pageFormat: 'Endless' });

  // Screen-sized pages: each ends after the last whole system that fits, so turning never cuts a line.
  let pages = [], pageIndex = 0, zoneTimer = 0, resizeTimer = 0;
  function systemBoxes() {
    const unit = 10 * display.Zoom, svg = target.querySelector('svg'), boxes = [];
    if (!svg || !display.GraphicSheet) return boxes;
    const offset = svg.getBoundingClientRect().top - scroll.getBoundingClientRect().top + scroll.scrollTop;
    for (const page of display.GraphicSheet.MusicPages) for (const system of page.MusicSystems) {
      const shape = system.PositionAndShape, y = shape.AbsolutePosition.y;
      boxes.push({ top: offset + (y + shape.BorderTop) * unit, bottom: offset + (y + shape.BorderBottom) * unit });
    }
    return boxes.sort((a, b) => a.top - b.top);
  }
  function paginate() {
    const height = scroll.clientHeight, boxes = systemBoxes(), anchor = pages[pageIndex]?.top ?? 0;
    pages = [];
    for (let i = 0; i < boxes.length;) {
      const top = pages.length ? Math.max(0, boxes[i].top - 16) : 0;
      let j = i;
      while (j + 1 < boxes.length && boxes[j + 1].bottom + 8 - top <= height) j++;
      pages.push({ top, bottom: boxes[j].bottom + 8 }); i = j + 1;
    }
    if (!pages.length) pages = [{ top: 0, bottom: scroll.scrollHeight }];
    pageIndex = Math.max(0, pages.findLastIndex(page => page.top <= anchor + 1));
    showPage();
  }
  function showPage() {
    const page = pages[pageIndex]; if (!page) return;
    scroll.scrollTop = page.top;
    const mask = modal.querySelector('.xml-page-mask');
    mask.style.top = `${Math.min(scroll.clientHeight, page.bottom - page.top)}px`;
    modal.querySelector('.xml-page-count').textContent = `${pageIndex + 1} / ${pages.length}`;
    modal.querySelector('[data-xml=prev]').disabled = pageIndex <= 0;
    modal.querySelector('[data-xml=next]').disabled = pageIndex >= pages.length - 1;
    showTurnZones();
  }
  function turn(delta) {
    const next = Math.max(0, Math.min(pages.length - 1, pageIndex + delta));
    if (next === pageIndex) return;
    pageIndex = next; showPage();
  }
  function showTurnZones() {
    const edge = turnEdge(scroll.clientWidth);
    for (const zone of modal.querySelectorAll('.pdf-turn-zone')) {
      const prev = zone.dataset.side === 'prev';
      Object.assign(zone.style, { left: `${prev ? 0 : scroll.clientWidth - edge}px`, width: `${edge}px`, top: '0px', height: `${scroll.clientHeight}px` });
      zone.hidden = prev ? pageIndex <= 0 : pageIndex >= pages.length - 1;
      zone.classList.add('visible');
    }
    clearTimeout(zoneTimer);
    zoneTimer = setTimeout(() => modal.querySelectorAll('.pdf-turn-zone').forEach(zone => zone.classList.remove('visible')), 2500);
  }
  // Short taps at the left or right margin turn the page, like the PDF viewer.
  let tap = null;
  scroll.addEventListener('pointerdown', e => { tap = { x: e.clientX, y: e.clientY, t: performance.now(), pointers: (tap?.pointers || 0) + 1 }; });
  scroll.addEventListener('pointerup', e => {
    const start = tap; tap = null; if (!start) return;
    const r = scroll.getBoundingClientRect();
    const delta = marginTurn({ x: e.clientX - r.left, width: r.width, duration: performance.now() - start.t, distance: Math.hypot(e.clientX - start.x, e.clientY - start.y), pointers: start.pointers, tool: 'read', zoom: 1 });
    if (delta) turn(delta);
  });
  scroll.addEventListener('wheel', e => { e.preventDefault(); if (Math.abs(e.deltaY) > 20 && !scroll.dataset.wheel) { turn(e.deltaY > 0 ? 1 : -1); scroll.dataset.wheel = '1'; setTimeout(() => delete scroll.dataset.wheel, 350); } }, { passive: false });
  modal.addEventListener('keydown', e => { if (['ArrowRight', 'PageDown', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); turn(['ArrowRight', 'PageDown'].includes(e.key) ? 1 : -1); } });
  const stopPedals = onPedalTurn(turn);
  const resized = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (!closed && target.querySelector('svg')) paginate(); }, 400); });
  resized.observe(scroll);
  async function close() {
    if (closed) return;
    if (running()) { await session.toggle(); controls(); return; }
    closed = true; clearInterval(timer); clearTimeout(zoneTimer); clearTimeout(resizeTimer); resized.disconnect(); stopPedals(); display.AutoResizeEnabled = false; display.clear(); await fullscreen.exit(); modal.close(); modal.remove(); onClose(); return true;
  }
  modal.addEventListener('cancel', event => { event.preventDefault(); void close(); });
  modal.addEventListener('click', async event => {
    const action = event.target.closest('[data-xml]')?.dataset.xml;
    if (action === 'finish' && !running() && session?.finish) { if (await close()) await session.finish(); return; }
    if (action === 'close') await close();
    if (action === 'pause') { await session.toggle(); controls(); }
    if (action === 'next' || action === 'prev') turn(action === 'next' ? 1 : -1);
    if (!running() && ['in', 'out'].includes(action)) { zoom = Math.max(.6, Math.min(2, zoom + (action === 'in' ? .2 : -.2))); display.Zoom = zoom; display.render(); paginate(); }
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
    paginate();
    await onRendered();
    modal.querySelector('.xml-status').textContent = ui('Written score · manual practice · no automatic note evaluation', 'Partitura escrita · práctica manual · sin evaluación automática de notas');
  } catch (error) { if (running()) await session.toggle(); controls(); modal.querySelector('.xml-status').textContent = `${ui('Could not display the score', 'No se ha podido mostrar la partitura')}: ${localizeMessage(error.message)}`; }
  return { close };
}
