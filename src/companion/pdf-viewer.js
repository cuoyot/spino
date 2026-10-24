import { loadPDF, readableError } from './pdf-document.js';
export { inspectPDF } from './pdf-document.js';
import { validateAnnotations, MARK_COLORS, pagePoint, marginTurn, turnEdge, moveMark } from './pdf-annotations.js';
import { onPedalTurn } from './pedals.js';
import { validateScoreView, fittedFrame, sortSections, sectionLayout, snapSectionPoint } from './score-view.js';
import { scoreControlsMarkup, scoreIcon, updateScoreTimer, enableScoreWidgetMinimize } from './score-controls.js';
import { scoreFullscreen, native } from './platform.js';
import { ui, localizeMessage } from './locale.js';
import { watchPracticeClock } from './practice-clock.js';
import './pdf-viewer.css';
import { printScore } from './score-print.js';
import { pdfPrintPages, markNode as printableMarkNode } from './pdf-print.js';

const NS = 'http://www.w3.org/2000/svg';
const element = (name, attributes = {}) => {
  const node = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
};
export async function openScore({ asset, title, save, saveView = async () => {}, session, onClose = () => {} }) {
  let annotations = validateAnnotations(asset.annotations);
  let views = validateScoreView(asset.scoreView), viewSaving = null;
  let pdf, page = 1, pageWidth = 595, pageHeight = 842, fit = 1, zoom = 1, tool = 'read', color = MARK_COLORS[0];
  let rendering = null, renderVersion = 0, ready = false, closed = false, closing = false, resizeTimer, textDialog;
  let draft = null, gesture = null, pinch = null, dirty = false, saving = null, editVersion = 0;
  let undo = [], redo = [];
  let finger = '1', expanded = false, panel = 'annotations', wasRunning = null, orientation, dock = null, widgetDrag = null;
  let fontSize = .025, strokeWidth = .0035, selectedId = null;
  const pointers = new Map();
  // Page sections: free crops of a page that landscape reading shows one at a time, padded with white.
  let sections = views.sections || [], sectionIndex = 0, splitting = false, splitDraft = null;
  const previousFocus = document.activeElement;
  const fullscreen = await scoreFullscreen();
  const modal = document.createElement('dialog');
  modal.className = 'pdf-viewer'; modal.setAttribute('aria-label', ui('Score and annotations', 'Partitura y anotaciones'));
  modal.innerHTML = `<div class="pdf-viewport" tabindex="0" aria-label="${ui('Score. Use arrow keys or page edges to turn pages.', 'Partitura. Usa las flechas del teclado o los bordes para pasar página.')}"><div class="pdf-stage"><div class="pdf-paper" aria-busy="true"><canvas></canvas><svg class="pdf-marks"></svg><svg class="pdf-sections" style="display:none"></svg></div></div></div><div class="pdf-turn-zone" data-side="prev" aria-hidden="true"></div><div class="pdf-turn-zone" data-side="next" aria-hidden="true"></div>${scoreControlsMarkup(session)}`;
  const $ = selector => modal.querySelector(selector);
  const viewport = $('.pdf-viewport'), stage = $('.pdf-stage'), paper = $('.pdf-paper'), canvas = $('canvas'), svg = $('.pdf-marks'), widget = $('.pdf-widget'), sectionLayer = $('.pdf-sections');
  const quickPalette = document.createElement('div');
  quickPalette.className = 'pdf-quick-palette'; quickPalette.hidden = true;
  widget.append(quickPalette);
  const fingers = $('.pdf-fingers'), palette = $('.pdf-palette'), markSettings = $('.pdf-mark-settings');
  $('.pdf-hint').remove();
  $('.pdf-title').textContent = title || asset.name;
  document.body.append(modal); modal.showModal();
  const task = loadPDF(asset.base64);
  let editingRequested=false;
  const running = () => !!session?.read().running;
  const editing = () => !running() && (editingRequested || splitting || tool !== 'read');
  async function leaveEditing({ resume = true } = {}) {
    if (dirty && !await persistMarks()) return;
    if (viewSaving && !await viewSaving) return;
    await setSplitting(false);
    selectTool('read'); expanded = false; editingRequested=false;
    if (resume && session && ready && !running()) await session.toggle();
    updateTimer(); controls();
  }
  const currentOrientation = () => viewport.clientWidth > viewport.clientHeight ? 'landscape' : 'portrait';
  orientation = currentOrientation();
  const pageSections = p => sortSections(sections.filter(section => section.page === p));
  const activeSection = () => orientation === 'landscape' && !splitting ? pageSections(page)[sectionIndex] || null : null;
  // Reading positions in order: each section of a split page, or the whole page otherwise.
  function frames() {
    const list = [];
    for (let p = 1; p <= (pdf?.numPages || 0); p++) {
      const count = orientation === 'landscape' && !splitting ? pageSections(p).length : 0;
      if (count) for (let i = 0; i < count; i++) list.push([p, i]); else list.push([p, 0]);
    }
    return list;
  }
  const framePosition = list => list.findIndex(([p, i]) => p === page && i === (activeSection() ? sectionIndex : 0));

  function state(message, error = false) {
    $('.pdf-save-state').textContent = localizeMessage(message); $('.pdf-save-state').classList.toggle('error', error);
    $('.pdf-save-state').dataset.short = dirty ? ui('Saving', 'Guardando') : ready ? ui('Local', 'Local') : ui('Opening', 'Abriendo');
    if (error) { if (running()) session.toggle(); expanded = true; updateTimer(); controls(); }
  }
  function controls() {
    const list = frames(), at = framePosition(list), section = activeSection();
    $('[data-pdf=prev]').disabled = !ready || at <= 0;
    $('[data-pdf=next]').disabled = !ready || at < 0 || at >= list.length - 1;
    $('.pdf-pagination').hidden = !!pdf && list.length === 1;
    $('[data-pdf=undo]').disabled = !undo.length;
    $('[data-pdf=redo]').disabled = !redo.length;
    $('[data-pdf=out]').disabled = !ready || zoom <= 1 || !!section;
    $('[data-pdf=in]').disabled = !ready || zoom >= 3 || !!section;
    $('[data-pdf=fit]').disabled = !ready || !!section;
    $('[data-pdf=retry]').hidden = !dirty;
    $('[data-pdf=timer]')?.toggleAttribute('disabled', !ready && !running());
    if (session) updateScoreTimer($('[data-pdf=timer]'), { ...session.read(), editing: editing() });
    $('[data-pdf=save-view]').disabled = !ready || !!viewSaving || !!section;
    $('[data-pdf=split]').textContent = splitting ? ui('Done', 'Hecho') : ui('Split page', 'Dividir página');
    $('[data-pdf=split]').setAttribute('aria-pressed', String(splitting));
    $('[data-pdf=split]').disabled = !ready;
    $('[data-pdf=split-done]').hidden = !editing();
    $('[data-pdf=split-done]').innerHTML = scoreIcon('done');
    $('[data-pdf=split-done]').setAttribute('aria-label', ui('Done editing', 'Salir de edición'));
    $('[data-pdf=timer]')?.toggleAttribute('hidden', !session);
    $('[data-pdf=split-clear]').hidden = !splitting; $('[data-pdf=split-clear]').disabled = !pageSections(page).length;
    $('.pdf-split-hint').textContent = splitting ? ui('Drag over the score to mark each part, such as one or two bars. Tap × to remove a part.', 'Arrastra sobre la partitura para marcar cada parte, por ejemplo uno o dos compases. Toca × para quitar una parte.') : ui('In landscape, split pages are shown part by part, filled with white to fit the screen.', 'En apaisado, las páginas divididas se muestran parte a parte, rellenando con blanco hasta ajustar la pantalla.');
    $('[data-pdf=reset-view]').disabled = !ready || !!viewSaving;
    $('[data-pdf=fullscreen]').hidden = native || !!document.fullscreenElement || !document.fullscreenEnabled;
    modal.dataset.running = String(running());
    $('[data-pdf=close]').hidden = running() || editing(); $('[data-pdf=tools]').hidden = editing();
    $('[data-pdf=finish]')?.toggleAttribute('hidden', false);
    $('.pdf-panel').hidden = running() || !expanded;
    $('[data-pdf=tools]').setAttribute('aria-expanded', String(expanded && !running()));
    $('.pdf-annotation-panel').hidden = panel !== 'annotations'; $('.pdf-view-panel').hidden = panel !== 'view';
    for (const name of ['annotations', 'view']) $(`[data-pdf=${name}]`).setAttribute('aria-pressed', String(panel === name));
    for (const button of modal.querySelectorAll('[data-tool]')) button.setAttribute('aria-pressed', String(button.dataset.tool === tool));
    for (const button of modal.querySelectorAll('[data-finger]')) button.setAttribute('aria-pressed', String(tool === 'fingering' && button.dataset.finger === finger));
    for (const button of modal.querySelectorAll('[data-color]')) button.setAttribute('aria-pressed', String(button.dataset.color === color));
    $('.pdf-zoom-value').textContent = `${Math.round(zoom * 100)} %`;
    paper.dataset.tool = tool;
    const active = $('[data-pdf=active-tool]'), selected = annotations.marks.find(m => m.id === selectedId);
    const markType = selected?.type || tool;
    const textMark = ['text', 'fingering'].includes(markType);
    const strokeMark = ['pen', 'highlight', 'underline', 'line', 'arrow', 'ellipse', 'rectangle'].includes(markType);
    const quick = !running() && !expanded && !splitting && (textMark || strokeMark);
    quickPalette.hidden = !quick;
    const target = quick ? quickPalette : $('.pdf-annotation-panel');
    for (const node of [fingers, palette, markSettings]) if (node.parentElement !== target) target.append(node);
    fingers.hidden = quick && tool !== 'fingering';
    markSettings.querySelector('[data-mark-setting=fontSize]').closest('label').hidden = !textMark;
    markSettings.querySelector('[data-mark-setting=width]').closest('label').hidden = !strokeMark;
    markSettings.hidden = !textMark && !strokeMark;
    active.hidden = running() || expanded || tool === 'read';
    const name = tool === 'fingering' ? ui(`Finger ${finger}`, `Dedo ${finger}`) : $(`button[data-tool="${tool}"]`)?.title || tool;
    active.textContent = `${name}${selected ? ' · '+ui('Selected','Seleccionado') : ''} · ${ui('Options','Opciones')}`;
    active.style.borderColor = color;
    for (const key of ['fontSize','width']) {
      const value = (key === 'fontSize' ? fontSize : strokeWidth) * 100;
      $(`[data-mark-setting="${key}"]`).value = value;
      $(`[data-mark-output="${key}"]`).textContent = `${Number(value.toFixed(2))}%`;
    }
    clampWidget();
  }

  async function persistMarks() {
    if (saving) return saving;
    saving = (async () => {
      while (dirty) {
        const version = editVersion, snapshot = structuredClone(annotations);
        state(ui('Saving annotations…', 'Guardando anotaciones…'));
        try { await save(snapshot); }
        catch { state(ui('Could not save. Free up space and select Save before leaving.', 'No se pudo guardar. Libera espacio y pulsa Guardar antes de salir.'), true); controls(); return false; }
        if (version === editVersion) dirty = false;
      }
      state(ui('Annotations saved on this device.', 'Anotaciones guardadas en el dispositivo.')); controls(); return true;
    })();
    try { return await saving; } finally { saving = null; }
  }
  function changed(marks, history = true) {
    const next = validateAnnotations({ version: 1, marks });
    if (history) { undo.push(annotations); if (undo.length > 40) undo.shift(); redo = []; }
    annotations = next; editVersion++; dirty = true;
    paint(); controls(); void persistMarks();
  }

  function markNode(mark, dimensions = { width: pageWidth, height: pageHeight }) { return printableMarkNode(mark, dimensions); }
  function paint() {
    svg.setAttribute('viewBox', `0 0 ${pageWidth} ${pageHeight}`);
    const marks = annotations.marks.filter(m => m.page === page);
    // Transparent highlighting stays below handwriting and text.
    marks.sort((a, b) => Number(b.type === 'highlight') - Number(a.type === 'highlight'));
    svg.replaceChildren(...marks.filter(m => m.id !== draft?.id).map(mark => markNode(mark)));
    if (draft) svg.append(markNode(draft));
    const selected = draft?.id === selectedId ? draft : marks.find(m => m.id === selectedId);
    if (selected && tool === 'select' && !running()) {
      const node = svg.querySelector(`[data-mark-id="${CSS.escape(selected.id)}"]`), bounds = node.getBBox();
      svg.append(element('rect', {x:bounds.x,y:bounds.y,width:Math.max(1,bounds.width),height:Math.max(1,bounds.height),fill:'none',stroke:'#4f8cff','stroke-width':1,'vector-effect':'non-scaling-stroke','pointer-events':'none'}));
      if (selected.points.length === 2) selected.points.forEach((p,i) => svg.append(element('circle',{cx:p.x*pageWidth,cy:p.y*pageHeight,r:22*pageWidth/Math.max(1,paper.getBoundingClientRect().width),fill:'#4f8cff','fill-opacity':.3,stroke:'#fff','stroke-width':2,'vector-effect':'non-scaling-stroke','data-resize':i,tabindex:0,role:'button','aria-label':ui(`Resize endpoint ${i+1}`,`Redimensionar extremo ${i+1}`)})));
    }
  }
  function paintSections() {
    if (!splitting) { sectionLayer.style.display = 'none'; return; }
    sectionLayer.style.display = ''; sectionLayer.setAttribute('viewBox', `0 0 ${pageWidth} ${pageHeight}`);
    const radius = pageWidth * .022, nodes = [];
    pageSections(page).forEach((part, i) => {
      const x = part.x * pageWidth, y = part.y * pageHeight, w = part.w * pageWidth, h = part.h * pageHeight;
      const group = element('g', { 'data-section-id': part.id });
      group.append(element('rect', { class: 'pdf-part', x, y, width: w, height: h, 'vector-effect': 'non-scaling-stroke' }));
      const label = element('text', { class: 'pdf-part-label', x: x + radius * .5, y: y + radius * 1.4, 'font-size': radius * 1.3 }); label.textContent = String(i + 1); group.append(label);
      const remove = element('g', { 'data-section-delete': part.id, role: 'button', 'aria-label': ui(`Remove part ${i + 1}`, `Quitar parte ${i + 1}`) });
      remove.append(element('circle', { cx: x + w, cy: y, r: radius }), element('path', { d: `M${x + w - radius * .4} ${y - radius * .4}L${x + w + radius * .4} ${y + radius * .4}M${x + w + radius * .4} ${y - radius * .4}L${x + w - radius * .4} ${y + radius * .4}`, 'vector-effect': 'non-scaling-stroke' }));
      group.append(remove); nodes.push(group);
    });
    if (splitDraft) {
      const d = splitDraft;
      nodes.push(element('rect', { class: 'pdf-part pdf-part-draft', x: Math.min(d.x, d.x2) * pageWidth, y: Math.min(d.y, d.y2) * pageHeight, width: Math.abs(d.x2 - d.x) * pageWidth, height: Math.abs(d.y2 - d.y) * pageHeight, 'vector-effect': 'non-scaling-stroke' }));
    }
    sectionLayer.replaceChildren(...nodes);
  }
  async function saveSections(next) {
    const view = validateScoreView({ ...views, sections: next }), previous = viewSaving;
    views = view; sections = view.sections || []; paintSections(); controls();
    const saving = (async () => {
      await previous;
      try { await saveView(view); $('.pdf-view-status').textContent = ui('Page parts saved.', 'Partes de la página guardadas.'); return true; }
      catch { $('.pdf-view-status').textContent = ui('Could not save the page parts. Try again.', 'No se han podido guardar las partes. Vuelve a intentarlo.'); return false; }
    })();
    viewSaving = saving; controls();
    try { return await saving; } finally { if (viewSaving === saving) viewSaving = null; controls(); }
  }
  function addSection(d) {
    const x = Math.max(0, Math.min(d.x, d.x2)), y = Math.max(0, Math.min(d.y, d.y2));
    const w = Math.min(1, Math.max(d.x, d.x2)) - x, h = Math.min(1, Math.max(d.y, d.y2)) - y;
    if (w < .02 || h < .02) return;
    void saveSections([...sections, { id: crypto.randomUUID(), page, x, y, w, h }]);
  }
  async function setSplitting(next) {
    if (splitting === next) return;
    const frame = captureFrame(); splitting = next; splitDraft = null; sectionIndex = 0;
    // Drawing needs the whole page, so the panel folds away; the bar keeps a Done button.
    if (next) { selectTool('read'); expanded = false; }
    await renderPage(frame);
  }
  function paintDraft() {
    if (!draft) return;
    const previous = svg.querySelector(`[data-mark-id="${draft.id}"]`), node = markNode(draft);
    if (previous) previous.replaceWith(node); else svg.append(node);
  }

  function measure() {
    fit = Math.max(.01, Math.min(viewport.clientWidth / pageWidth, viewport.clientHeight / pageHeight));
    const section = activeSection();
    viewport.classList.toggle('pdf-sectioned', !!section);
    if (section) {
      const layout = sectionLayout(section, pageWidth, pageHeight, viewport.clientWidth, viewport.clientHeight), c = layout.clip;
      stage.style.width = `${viewport.clientWidth}px`; stage.style.height = `${viewport.clientHeight}px`;
      paper.style.width = `${layout.width}px`; paper.style.height = `${layout.height}px`;
      paper.style.left = `${layout.left}px`; paper.style.top = `${layout.top}px`;
      paper.style.clipPath = `inset(${c.top}px ${c.right}px ${c.bottom}px ${c.left}px)`;
      Object.assign(canvas.style, { position: 'absolute', left: `${c.left}px`, top: `${c.top}px`, width: `${layout.width - c.left - c.right}px`, height: `${layout.height - c.top - c.bottom}px` });
      viewport.scrollLeft = 0; viewport.scrollTop = 0;
      return layout.scale;
    }
    paper.style.clipPath = ''; canvas.removeAttribute('style');
    const width = pageWidth * fit * zoom, height = pageHeight * fit * zoom;
    const areaWidth = Math.max(viewport.clientWidth, width), areaHeight = Math.max(viewport.clientHeight, height);
    stage.style.width = `${areaWidth}px`; stage.style.height = `${areaHeight}px`;
    paper.style.width = `${width}px`; paper.style.height = `${height}px`;
    paper.style.left = `${(areaWidth - width) / 2}px`; paper.style.top = `${(areaHeight - height) / 2}px`;
    return fit * zoom;
  }
  function captureFrame() {
    if (activeSection()) return views[orientation] || fittedFrame();
    const r = viewport.getBoundingClientRect(), point = pagePoint(r.left + viewport.clientWidth / 2, r.top + viewport.clientHeight / 2, paper.getBoundingClientRect());
    return { zoom, centerX: point.x, centerY: point.y };
  }
  function applyFrame(frame) {
    zoom = frame.zoom; measure();
    if (activeSection()) return;
    viewport.scrollLeft = paper.offsetLeft + paper.offsetWidth * frame.centerX - viewport.clientWidth / 2;
    viewport.scrollTop = paper.offsetTop + paper.offsetHeight * frame.centerY - viewport.clientHeight / 2;
  }
  async function renderPage(frame = captureFrame()) {
    if (!pdf || closed) return;
    const version = ++renderVersion;
    ready = false; paper.setAttribute('aria-busy', 'true'); controls();
    rendering?.cancel();
    try {
      const pdfPage = await pdf.getPage(page);
      if (version !== renderVersion || closed) return;
      const base = pdfPage.getViewport({ scale: 1 }); pageWidth = base.width; pageHeight = base.height;
      applyFrame(frame); paint(); paintSections();
      const section = activeSection(), scale = measure(), area = section ? section.w * section.h : 1;
      const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(8000000 / (pageWidth * pageHeight * area * scale * scale)));
      const full = pdfPage.getViewport({ scale: scale * ratio });
      // Sections render only their crop so short excerpts stay sharp when enlarged.
      const view = section ? pdfPage.getViewport({ scale: scale * ratio, offsetX: -section.x * full.width, offsetY: -section.y * full.height }) : full;
      // A detached canvas prevents a cancelled render from corrupting a newer page.
      const buffer = document.createElement('canvas');
      buffer.width = Math.ceil(section ? section.w * full.width : view.width); buffer.height = Math.ceil(section ? section.h * full.height : view.height);
      rendering = pdfPage.render({ canvasContext: buffer.getContext('2d'), viewport: view });
      await rendering.promise;
      if (version !== renderVersion || closed) return;
      canvas.width = buffer.width; canvas.height = buffer.height; canvas.getContext('2d').drawImage(buffer, 0, 0);
      ready = true; paper.setAttribute('aria-busy', 'false'); $('.pdf-page-count').textContent = `${page} / ${pdf.numPages}` + (section ? ` · ${sectionIndex + 1}/${pageSections(page).length}` : '');
      controls();
    } catch (error) {
      if (error.name !== 'RenderingCancelledException' && version === renderVersion && !closed) state(ui('Could not display this page. Reopen the score.', 'No se ha podido dibujar esta página. Vuelve a abrir la partitura.'), true);
    }
  }
  // Shade the tap margins for a few seconds after opening and after each page turn.
  let zoneTimer = 0;
  function showTurnZones() {
    const screen = viewport.getBoundingClientRect(), page = paper.getBoundingClientRect(), whole = !!activeSection();
    const left = whole ? screen.left : Math.max(page.left, screen.left), right = whole ? screen.right : Math.min(page.right, screen.right);
    const edge = turnEdge(right - left), list = frames(), at = framePosition(list), base = modal.getBoundingClientRect();
    for (const zone of modal.querySelectorAll('.pdf-turn-zone')) {
      const prev = zone.dataset.side === 'prev';
      zone.style.left = `${(prev ? left : right - edge) - base.left}px`; zone.style.width = `${edge}px`;
      zone.style.top = `${screen.top - base.top}px`; zone.style.height = `${screen.height}px`;
      zone.hidden = prev ? at <= 0 : at < 0 || at >= list.length - 1;
      zone.classList.add('visible');
    }
    clearTimeout(zoneTimer);
    zoneTimer = setTimeout(() => modal.querySelectorAll('.pdf-turn-zone').forEach(zone => zone.classList.remove('visible')), 2500);
  }
  function turn(delta) {
    if (!ready || textDialog?.open) return;
    const list = frames(), at = framePosition(list), target = Math.max(0, Math.min(list.length - 1, at + delta));
    if (at < 0 || target === at) return;
    const frame = captureFrame(); draft = null; gesture = null; splitDraft = null; [page, sectionIndex] = list[target];
    void renderPage(frame).then(() => { if (!closed) showTurnZones(); });
  }
  function setZoom(value) {
    if (!pdf || closed || activeSection()) return;
    zoom = Math.max(1, Math.min(3, value)); measure(); controls();
  }

  function clampWidget() {
    if (!dock) return;
    // Keep the preferred bottom anchor when the tools temporarily change the widget size.
    const x = Math.max(8, Math.min(dock.x, modal.clientWidth - widget.offsetWidth - 8));
    const raised = widget.querySelector('.score-timer:not([hidden])');
    const topInset = raised ? Math.max(8, 8 - parseFloat(getComputedStyle(raised).marginTop)) : 8;
    const y = Math.max(topInset, Math.min(dock.y, modal.clientHeight - 8) - widget.offsetHeight);
    widget.style.left = `${x}px`; widget.style.top = `${y}px`; widget.style.right = 'auto'; widget.style.bottom = 'auto';
  }
  const handle = $('[data-pdf=drag]');
  handle.addEventListener('pointerdown', event => {
    if (event.button > 0) return;
    event.preventDefault(); handle.setPointerCapture(event.pointerId);
    const r = widget.getBoundingClientRect(); widgetDrag = { id: event.pointerId, x: event.clientX - r.left, y: event.clientY - r.bottom };
  });
  handle.addEventListener('pointermove', event => {
    if (widgetDrag?.id !== event.pointerId) return;
    dock = { x: event.clientX - widgetDrag.x, y: event.clientY - widgetDrag.y }; clampWidget();
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) handle.addEventListener(event, () => { widgetDrag = null; });
  handle.addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const r = widget.getBoundingClientRect(); dock = { x: r.left, y: r.bottom };
    if (event.key === 'ArrowUp') dock.y -= 24; if (event.key === 'ArrowDown') dock.y += 24;
    if (event.key === 'ArrowLeft') dock.x -= 24; if (event.key === 'ArrowRight') dock.x += 24;
    clampWidget();
  });
  if (session) enableScoreWidgetMinimize(widget, handle, clampWidget);
  const widgetResize = new ResizeObserver(clampWidget);
  widgetResize.observe(widget);

  function selectTool(next) {
    if (running()) return;
    tool = next; selectedId = null; draft = null; gesture = null; expanded = false; paint(); controls();
  }

  async function storeFrame(reset = false) {
    if (!ready || running() || viewSaving) return;
    const next = validateScoreView({ ...views, [orientation]: reset ? fittedFrame() : captureFrame() });
    $('.pdf-view-status').textContent = ui('Saving frame…', 'Guardando encuadre…');
    viewSaving = (async () => {
      try {
        await saveView(next); views = next;
        if (reset) await renderPage(fittedFrame());
        $('.pdf-view-status').textContent = ui(`Frame saved · ${orientation}.`, `Encuadre guardado · ${orientation === 'portrait' ? 'retrato' : 'apaisado'}.`);
        return true;
      } catch { $('.pdf-view-status').textContent = ui('Could not save the frame. Try again.', 'No se ha podido guardar el encuadre. Vuelve a intentarlo.'); return false; }
    })();
    controls();
    try { await viewSaving; } finally { viewSaving = null; controls(); }
  }

  function hitMark(x, y, textOnly = false) {
    const candidates = [...svg.querySelectorAll('[data-mark-id]')].reverse();
    return candidates.map(node => ({ node, mark: annotations.marks.find(m => m.id === node.dataset.markId) }))
      .find(({ node, mark }) => { const r = node.getBoundingClientRect(); return (!textOnly || mark.type === 'text') && x >= r.left - 7 && x <= r.right + 7 && y >= r.top - 7 && y <= r.bottom + 7; })?.mark;
  }
  function addText(point, existing) {
    if (running()) return;
    textDialog = document.createElement('dialog'); textDialog.className = 'pdf-text-dialog';
    textDialog.innerHTML = `<div class="dialog-head"><b>${ui('Text on the score', 'Texto en la partitura')}</b><button type="button">${ui('Close', 'Cerrar')}</button></div><form><label>${ui('Text on the score', 'Texto en la partitura')}<textarea maxlength="500" required placeholder="${ui('For example: practise slowly', 'Por ejemplo: repasar despacio')}"></textarea></label><div class="pdf-text-actions"><button type="button">${ui('Cancel', 'Cancelar')}</button><button type="submit">${ui('Save text', 'Guardar texto')}</button></div></form>`;
    textDialog.querySelector('textarea').value = existing?.text || '';
    textDialog.querySelectorAll('button[type="button"]').forEach(button => { button.onclick = () => textDialog.close(); });
    textDialog.onclose = () => { textDialog.remove(); textDialog = null; };
    textDialog.querySelector('form').onsubmit = event => {
      event.preventDefault(); const text = textDialog.querySelector('textarea').value.trim(); if (!text) return;
      if (running()) { textDialog.close(); return; }
      try {
        const mark = existing ? { ...existing, text, color, fontSize } : { id: crypto.randomUUID(), page, type: 'text', color, width: strokeWidth, fontSize, points: [point], text };
        changed([...annotations.marks.filter(m => m.id !== mark.id), mark]); textDialog.close();
      } catch (error) { state(error.message, true); }
    };
    document.body.append(textDialog); textDialog.showModal();
  }

  viewport.addEventListener('pointerdown', event => {
    if (!ready || event.button > 0 || textDialog?.open) return;
    updateTimer();
    viewport.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size > 1) {
      draft = null; paint(); if (gesture) gesture.pointers = pointers.size;
      if (splitDraft) { splitDraft = null; paintSections(); }
      if (activeSection()) return;
      const [a, b] = [...pointers.values()];
      pinch = { distance: Math.hypot(b.x - a.x, b.y - a.y), zoom, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      return;
    }
    const rect = paper.getBoundingClientRect();
    gesture = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, time: performance.now(),
      scrollX: viewport.scrollLeft, scrollY: viewport.scrollTop, distance: 0, pointers: 1, inPage: paper.contains(event.target), rect };
    // A tap on × removes a part; a drag that starts there still draws a new one next to it.
    if (splitting && gesture.inPage) { const p = snapSectionPoint(pagePoint(event.clientX, event.clientY, rect), pageSections(page), rect); splitDraft = { x: p.x, y: p.y, x2: p.x, y2: p.y, removal: event.target.closest?.('[data-section-delete]')?.dataset.sectionDelete }; paintSections(); return; }
    if (tool === 'select' && gesture.inPage && !running()) {
      const handle = event.target.closest?.('[data-resize]');
      const mark = handle ? annotations.marks.find(m => m.id === selectedId) : hitMark(event.clientX,event.clientY);
      selectedId = mark?.id || null;
      if(mark){fontSize=mark.fontSize ?? .025;strokeWidth=mark.width;color=mark.color;gesture.edit={original:structuredClone(mark),point:pagePoint(event.clientX,event.clientY,rect),endpoint:handle?Number(handle.dataset.resize):null};draft=structuredClone(mark);}
      paint();controls();return;
    }
    if (!gesture.inPage || ['read', 'text', 'fingering', 'erase'].includes(tool) || running()) return;
    const point = pagePoint(event.clientX, event.clientY, rect);
    draft = { id: crypto.randomUUID(), page, type: tool, color, width: strokeWidth, points: tool === 'pen' ? [point] : [point, point] };
    paint();
  });
  viewport.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch && pointers.size > 1) {
      const [a, b] = [...pointers.values()], x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
      const oldRect = paper.getBoundingClientRect(), anchor = pagePoint(pinch.x, pinch.y, oldRect);
      setZoom(pinch.zoom * Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, pinch.distance));
      const rect = paper.getBoundingClientRect();
      viewport.scrollLeft += rect.left + anchor.x * rect.width - x;
      viewport.scrollTop += rect.top + anchor.y * rect.height - y;
      pinch.x = x; pinch.y = y; return;
    }
    if (!gesture || gesture.pointers > 1) return;
    gesture.distance = Math.max(gesture.distance, Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y));
    if (splitDraft) {
      const rect = paper.getBoundingClientRect();
      const p = snapSectionPoint(pagePoint(event.clientX, event.clientY, rect), pageSections(page), rect, splitDraft);
      splitDraft.x2 = Math.max(0, Math.min(1, p.x)); splitDraft.y2 = Math.max(0, Math.min(1, p.y)); paintSections();
    } else if (gesture.edit && draft) {
      const point=pagePoint(event.clientX,event.clientY,paper.getBoundingClientRect()), edit=gesture.edit;
      if(edit.endpoint!=null){draft=structuredClone(edit.original);draft.points[edit.endpoint]=point;}
      else draft=moveMark(edit.original,point.x-edit.point.x,point.y-edit.point.y);
      paint();
    } else if (draft) {
      const point = pagePoint(event.clientX, event.clientY, paper.getBoundingClientRect());
      if (tool === 'pen') { if (draft.points.length < 4000) draft.points.push(point); }
      else draft.points[1] = point;
      paintDraft();
    } else if (tool === 'read' && !activeSection()) {
      viewport.scrollLeft -= event.clientX - gesture.lastX; viewport.scrollTop -= event.clientY - gesture.lastY;
    }
    gesture.lastX = event.clientX; gesture.lastY = event.clientY;
  });
  function endPointer(event, cancelled = false) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size) return;
    const g = gesture; gesture = null;
    if (pinch) { pinch = null; draft = null; paint(); void renderPage(); return; }
    if (!g) return;
    if (splitDraft) {
      const part = splitDraft; splitDraft = null;
      if (!cancelled && part.removal && g.distance <= 7) void saveSections(sections.filter(item => item.id !== part.removal));
      else if (!cancelled) addSection(part);
      paintSections(); return;
    }
    const mark = draft; draft = null;
    if (cancelled) { paint(); return; }
    try {
      if (mark) {
        if (running()) { paint(); return; }
        if (g.edit) {if(g.distance>3)changed(annotations.marks.map(m=>m.id===mark.id?mark:m));else paint();}
        else if (mark.type === 'pen' || g.distance > 3) changed([...annotations.marks, mark]); else paint();
      } else if ((g.inPage || activeSection()) && g.pointers === 1 && g.distance <= 7) {
        const point = pagePoint(event.clientX, event.clientY, g.rect);
        if (tool === 'text' && g.inPage && !running()) addText(point, hitMark(event.clientX, event.clientY, true));
        else if (tool === 'fingering' && g.inPage && !running()) {
          const hit = hitMark(event.clientX, event.clientY), existing = hit?.type === 'fingering' ? hit : null;
          const digit = existing ? { ...existing, text: finger, color, fontSize } : { id: crypto.randomUUID(), page, type: 'fingering', text: finger, color, width: strokeWidth, fontSize, points: [point] };
          changed([...annotations.marks.filter(m => m.id !== digit.id), digit]);
        }
        else if (tool === 'erase' && !running()) { const hit = hitMark(event.clientX, event.clientY); if (hit) changed(annotations.marks.filter(m => m.id !== hit.id)); }
        else {
          // A section is padded to the whole screen, so its page edges are the screen edges.
          const screen = viewport.getBoundingClientRect(), whole = !!activeSection(), left = whole ? screen.left : Math.max(g.rect.left, screen.left), right = whole ? screen.right : Math.min(g.rect.right, screen.right);
          const delta = marginTurn({ x: event.clientX - left, width: right - left, duration: performance.now() - g.time,
            distance: Math.max(g.distance, Math.hypot(event.clientX - g.x, event.clientY - g.y)), pointers: g.pointers, tool: running() ? 'read' : tool, zoom, allowZoom: true,
            scrollDistance: Math.hypot(viewport.scrollLeft - g.scrollX, viewport.scrollTop - g.scrollY) });
          if (delta) turn(delta);
        }
      }
    } catch (error) { paint(); state(error.message, true); }
  }
  viewport.addEventListener('pointerup', event => endPointer(event));
  viewport.addEventListener('pointercancel', event => endPointer(event, true));
  viewport.addEventListener('lostpointercapture', event => endPointer(event, true));

  async function close() {
    if (closed || closing) return;
    // Back during practice pauses first; leaving the score is a separate paused action.
    if (running()) { await session.toggle(); updateTimer(); if (!session.returnOnStop) return; }
    closing = true;
    if (textDialog?.open) { textDialog.close(); closing = false; return; }
    if (dirty && !await persistMarks()) { closing = false; return; }
    if (viewSaving && !await viewSaving) { closing = false; return; }
    closed = true; renderVersion++; clearTimeout(resizeTimer); clearTimeout(zoneTimer); stopPedals(); stopClock(); observer.disconnect(); widgetResize.disconnect(); rendering?.cancel();
    await task.destroy().catch(() => {});
    await fullscreen.exit().catch(() => {});
    modal.close(); modal.remove(); previousFocus?.focus(); onClose();
    return true;
  }
  modal.addEventListener('cancel', event => { event.preventDefault(); if (!running() && (expanded || editing())) void leaveEditing(); else void close(); });
  modal.addEventListener('click', async event => {
    const toolButton = event.target.closest('[data-tool]'), digitButton = event.target.closest('[data-finger]'), colorButton = event.target.closest('[data-color]');
    if (toolButton && !running()) selectTool(toolButton.dataset.tool);
    if (digitButton && !running()) { finger = digitButton.dataset.finger; selectTool('fingering'); }
    if (colorButton && !running()) { color = colorButton.dataset.color;const selected=annotations.marks.find(m=>m.id===selectedId);if(selected)changed(annotations.marks.map(m=>m.id===selectedId?{...m,color}:m));expanded=false;controls(); }
    const action = event.target.closest('[data-pdf]')?.dataset.pdf;
    try {
      if (editing() && action === 'close') return;
      if (editing() && action === 'timer') { await leaveEditing({ resume: false }); return; }
      if (action === 'record') { session?.record?.(); return; }
      if (action === 'finish' && session?.finish) {
        if (running()) { await session.toggle(); updateTimer(); }
        if (await close()) await session.finish();
        return;
      }
      if (action === 'close') await close();
      if (action === 'prev') turn(-1); if (action === 'next') turn(1);
      if (action === 'timer') {
        if (!running() && dirty && !await persistMarks()) return;
        await session.toggle(); updateTimer(); if(session.returnOnStop && !running()) await close(); return;
      }
      if (action === 'tools') {
        if (!session && expanded) { expanded=false; editingRequested=false; controls(); return; }
        if (running()) { await session.toggle(); updateTimer(); }
        expanded = true; editingRequested = true; controls(); return;
      }
      if (running()) return;
      if (action === 'print' && ready) {
        const button=$('[data-pdf=print]');button.disabled=true;button.textContent='…';button.setAttribute('aria-busy','true');
        try {
          await printScore(await pdfPrintPages({...asset,annotations:structuredClone(annotations)}),title);
        } finally { button.disabled=false;button.innerHTML=scoreIcon('print');button.removeAttribute('aria-busy'); }
      }
      if (action === 'active-tool') {panel='annotations';expanded=true;editingRequested=true;controls();}
      if (action === 'annotations' || action === 'view') { panel = action; editingRequested=true; if(action==='view')selectTool('read'); expanded=true;if (action === 'annotations') await setSplitting(false); controls(); }
      if (action === 'split') await setSplitting(!splitting);
      if (action === 'split-done') await leaveEditing();
      if (action === 'split-clear' && splitting) await saveSections(sections.filter(part => part.page !== page));
      if (action === 'in' || action === 'out' || action === 'fit') {
        const frame = captureFrame();
        frame.zoom = action === 'fit' ? 1 : Math.max(1, Math.min(3, zoom + (action === 'in' ? .25 : -.25)));
        await renderPage(action === 'fit' ? fittedFrame() : frame);
      }
      if (action === 'save-view' || action === 'reset-view') await storeFrame(action === 'reset-view');
      if (action === 'fullscreen') { await fullscreen.enter(); modal.close(); modal.showModal(); controls(); }
      if (action === 'undo' && undo.length) { const previous = undo.pop(); redo.push(annotations); changed(previous.marks, false); }
      if (action === 'redo' && redo.length) { const next = redo.pop(); undo.push(annotations); changed(next.marks, false); }
      if (action === 'retry') await persistMarks();
    } catch (error) { state(error.message, true); }
  });
  modal.addEventListener('keydown', event => {
    if (event.target.closest('select, input, textarea') || textDialog?.open) return;
    if(tool==='select' && selectedId && !running() && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();const dx=event.key==='ArrowLeft'?-.005:event.key==='ArrowRight'?.005:0,dy=event.key==='ArrowUp'?-.005:event.key==='ArrowDown'?.005:0,endpoint=event.target.dataset.resize;
      changed(annotations.marks.map(m=>{if(m.id!==selectedId)return m;if(endpoint!=null)return{...m,points:m.points.map((p,i)=>i===Number(endpoint)?{x:Math.max(0,Math.min(1,p.x+dx)),y:Math.max(0,Math.min(1,p.y+dy))}:p)};return moveMark(m,dx,dy);}));return;
    }
    if (['ArrowRight', 'PageDown', 'ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); turn(['ArrowRight', 'PageDown'].includes(event.key) ? 1 : -1); }
  });
  modal.addEventListener('change',event=>{
    const key=event.target.dataset.markSetting;if(!key || running())return;
    const value=Number(event.target.value)/100;if(!Number.isFinite(value))return;
    if(key==='fontSize'){if(value<.01||value>.1)return;fontSize=value;}else{if(value<.0002||value>.02)return;strokeWidth=value;}
    if(selectedId)changed(annotations.marks.map(m=>m.id===selectedId?{...m,...(key==='fontSize' ? (['text','fingering'].includes(m.type)?{fontSize}:{}):{width:strokeWidth})}:m));
    controls();
  });
  function updateTimer() {
    if (closed) return;
    const info = session?.read() || { running: false, time: '' };
    if (session) {
      updateScoreTimer($('[data-pdf=timer]'), { ...info, editing: editing() });
    }
    if (wasRunning !== !!info.running) {
      if (info.running) { editingRequested=false; tool = 'read'; draft = null; gesture = null; paint(); expanded = false; textDialog?.close(); if (splitting) void setSplitting(false); }
      wasRunning = !!info.running; controls();
    }
  }
  const stopPedals = onPedalTurn(delta => { if (!closed) turn(delta); });
  const stopClock = watchPracticeClock(() => session?.read(), updateTimer);
  const observer = new ResizeObserver(() => {
    if (pointers.size || !pdf || closed) return;
    const nextOrientation = currentOrientation();
    const frame = nextOrientation !== orientation ? views[nextOrientation] || fittedFrame() : captureFrame();
    if (nextOrientation !== orientation) sectionIndex = 0;
    orientation = nextOrientation;
    clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { clampWidget(); void renderPage(frame); }, 100);
  });
  observer.observe(viewport); controls(); updateTimer();
  try {
    pdf = await task.promise;
    if (!closed) { await renderPage(views[orientation] || fittedFrame()); if (ready) showTurnZones(); if (ready) state(ui('Local annotations · the original PDF is preserved.', 'Anotaciones locales · el PDF original se conserva.')); }
  } catch (error) { if (!closed) state(readableError(error).message, true); }
  return { close };
}
