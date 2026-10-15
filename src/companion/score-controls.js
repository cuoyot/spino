import { midiIndicatorMarkup } from '../midi-indicator.js';
import { MARK_COLORS } from './pdf-annotations.js';
import { ui } from './locale.js';

const paths = {
  done: '<path d="m5 12 4 4L19 6"/>',
  print: '<path d="M6 8V3h12v5M6 17H3V8h18v9h-3M6 14h12v7H6z"/><circle cx="17" cy="11" r=".7"/>',
  read: '<path d="M6 12V7a2 2 0 0 1 4 0v4-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v7-3a2 2 0 0 1 4 0v5c0 5-3 7-7 7h-1c-3 0-5-2-7-5l-4-5a2 2 0 0 1 3-2l3 3"/>',
  pen: '<path d="m4 20 1-6L16 3l5 5L10 19zM13 6l5 5M4 20l6-1"/>',
  highlight: '<path d="m6 14 9-11 6 5-9 11zM6 14l-3 5 5 3 4-3M2 22h17"/>',
  underline: '<path d="M6 3v8a6 6 0 0 0 12 0V3M4 22h16"/>',
  text: '<path d="M4 5V3h16v2M12 3v18M8 21h8"/>',
  line: '<path d="m4 20 16-16"/><circle cx="4" cy="20" r="1"/><circle cx="20" cy="4" r="1"/>',
  arrow: '<path d="m4 20 16-16M9 4h11v11"/>',
  ellipse: '<ellipse cx="12" cy="12" rx="9" ry="7"/>',
  rectangle: '<rect x="3" y="5" width="18" height="14" rx="1"/>',
  erase: '<path d="m4 16 10-12 8 7-10 12H9zM8 11l9 7M12 23h10"/>',
  select: '<path d="m5 3 14 11-7 1-3 7z"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="4"/>',
  finish: '<rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor"/>',
  record: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" fill="currentColor"/>',
  play: '<path d="m8 4 12 8-12 8z" fill="currentColor"/>',
  close: '<path d="m14 5-7 7 7 7"/>',
  prev: '<path d="m15 5-7 7 7 7"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  drag: '<path d="M7 4v16M17 4v16" stroke-dasharray="1 5" stroke-width="3"/>',
  tools: '<path d="m4 20 1-6L16 3l5 5L10 19zM13 6l5 5"/>',
  undo: '<path d="M8 4 3 9l5 5M3 9h11a6 6 0 0 1 0 12"/>',
  redo: '<path d="m16 4 5 5-5 5M21 9H10a6 6 0 0 0 0 12"/>',
  fit: '<path d="M9 3H3v6M15 3h6v6M3 15v6h6M15 21h6v-6"/>',
};
export const scoreIcon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
export const printActionButton = (action,id,escape) => `<button type="button" class="score-print-icon quiet" data-action="${action}" data-id="${escape(id)}" title="${ui('Print score','Imprimir partitura')}" aria-label="${ui('Print score','Imprimir partitura')}">${scoreIcon('print')}</button>`;
export const scoreButton = (action, label, content = scoreIcon(action), extra = '') => `<button type="button" data-pdf="${action}" aria-label="${label}" title="${label}" ${extra}>${content}</button>`;
const toolButton = (id, label) => `<button type="button" data-tool="${id}" aria-label="${label}" title="${label}" aria-pressed="false">${scoreIcon(id)}<span>${label}</span></button>`;

export function updateScoreTimer(button, info) {
  const running = !!info.running;
  if (!button.querySelector('.pdf-time') || button.dataset.running !== String(running)) {
    button.innerHTML = `<span class="score-timer-state">${running ? ui('Practice', 'Práctica') : ui('Paused', 'En pausa')}</span><span class="pdf-time"></span>${scoreIcon(running ? 'pause' : 'play')}`;
  }
  button.classList.add('score-timer');
  button.dataset.running = String(running);
  button.querySelector('.pdf-time').textContent = info.time;
  const label = running ? ui('Pause practice', 'Pausar práctica') : ui('Resume practice', 'Continuar práctica');
  button.setAttribute('aria-label', label);
  button.title = label;
}

export function enableScoreWidgetMinimize(widget, handle, onResize = () => {}) {
  let press = null, lastTap = null, suppressClick = false;
  const modal = widget.parentElement;
  // Resizing on pointerup can retarget the resulting click to a newly exposed control.
  modal.addEventListener('pointerdown', () => { suppressClick = false; }, true);
  modal.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false; event.preventDefault(); event.stopImmediatePropagation();
  }, true);
  const label = () => {
    const minimized = widget.classList.contains('score-widget-minimized');
    handle.setAttribute('aria-expanded', String(!minimized));
    handle.title = handle.ariaLabel = minimized
      ? ui('Move controls. Double-tap to expand.', 'Mover controles. Toca dos veces para desplegar.')
      : ui('Move controls. Double-tap to minimize.', 'Mover controles. Toca dos veces para minimizar.');
  };
  const toggle = () => {
    const before = widget.getBoundingClientRect();
    widget.classList.toggle('score-widget-minimized');
    // A dragged widget keeps its bottom anchor as its width and height change.
    if (widget.style.left) {
      const parent = widget.parentElement;
      widget.style.left = `${Math.max(8, Math.min(before.left, parent.clientWidth - widget.offsetWidth - 8))}px`;
      widget.style.top = `${Math.max(36, Math.min(before.bottom, parent.clientHeight - 8) - widget.offsetHeight)}px`;
    }
    label(); onResize();
  };
  handle.addEventListener('pointerdown', event => {
    if (event.button > 0 || !event.isPrimary) { press = lastTap = null; return; }
    press = {id:event.pointerId, x:event.clientX, y:event.clientY, time:performance.now(), moved:false};
  });
  handle.addEventListener('pointermove', event => {
    if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 7) press.moved = true;
  });
  handle.addEventListener('pointerup', event => {
    if (press?.id !== event.pointerId) return;
    const current = press, now = performance.now(); press = null;
    if (current.moved || now - current.time > 500) { lastTap = null; return; }
    if (lastTap && now - lastTap.time <= 350 && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <= 24) {
      lastTap = null; suppressClick = true; toggle();
    } else lastTap = {time:now, x:event.clientX, y:event.clientY};
  });
  handle.addEventListener('pointercancel', () => { press = lastTap = null; });
  handle.addEventListener('lostpointercapture', () => { if (press) press = lastTap = null; });
  // Keyboard and assistive activation provide the same action without a timed gesture.
  handle.addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    if (!event.repeat) { lastTap = null; toggle(); }
  });
  handle.addEventListener('click', event => { if (event.detail === 0) { lastTap = null; toggle(); } });
  label();
}

export function scoreControlsMarkup(session) {
  const tools = [['read', ui('Pan', 'Mover')], ['select', ui('Select', 'Seleccionar')], ['pen', ui('Pen', 'Boli')], ['highlight', ui('Highlight', 'Resaltar')], ['underline', ui('Underline', 'Subrayar')], ['text', ui('Text', 'Texto')], ['erase', ui('Erase', 'Borrar')], ['line', ui('Line', 'Línea')], ['arrow', ui('Arrow', 'Flecha')], ['ellipse', ui('Circle', 'Círculo')], ['rectangle', ui('Frame', 'Marco')]];
  const colors = [ui('Red', 'Rojo'), ui('Blue', 'Azul'), ui('Ochre', 'Ocre'), ui('Green', 'Verde'), ui('Ink', 'Tinta')];
  return `<aside class="pdf-widget" aria-label="${ui('Score controls', 'Controles de la partitura')}">
    <div class="pdf-panel" id="pdf-panel" hidden>
      <div class="pdf-panel-heading"><button type="button" data-action="midi-settings" aria-label="${ui('MIDI instrument','Instrumento MIDI')}">${midiIndicatorMarkup()}</button><span class="pdf-title"></span><span class="pdf-paused">${session ? ui('Paused', 'En pausa') : ui('Study', 'Estudio')}</span></div>
      <div class="pdf-tabs" role="group" aria-label="${ui('Options', 'Opciones')}">${scoreButton('annotations', ui('Annotate', 'Anotar'), ui('Annotate', 'Anotar'), 'aria-pressed="true"')}${scoreButton('view', ui('Framing', 'Encuadre'), ui('Framing', 'Encuadre'), 'aria-pressed="false"')}</div>
      <div class="pdf-annotation-panel">
        <div class="pdf-fingers" role="group" aria-label="${ui('Fingering', 'Digitación')}"><span>${ui('Fingers', 'Dedos')}</span>${[1, 2, 3, 4, 5].map(n => `<button type="button" data-finger="${n}" aria-label="${ui(`Finger ${n}`, `Dedo ${n}`)}" aria-pressed="false">${n}</button>`).join('')}</div>
        <div class="pdf-tools" role="group" aria-label="${ui('Annotation tools', 'Herramientas de anotación')}">${tools.map(([id,label]) => toolButton(id,label)).join('')}</div>
        <div class="pdf-palette" role="group" aria-label="${ui('Color', 'Color')}">${MARK_COLORS.map((color, i) => `<button type="button" data-color="${color}" style="--swatch:${color}" aria-label="${colors[i]}" aria-pressed="false"><span></span></button>`).join('')}${scoreButton('undo',ui('Undo', 'Deshacer'))}${scoreButton('redo',ui('Redo', 'Rehacer'))}</div>
        <div class="pdf-mark-settings"><label>${ui('Number / text size','Tamaño de número / texto')}<input data-mark-setting="fontSize" type="range" min="1" max="10" step="0.5" value="2.5"><output data-mark-output="fontSize">2.5%</output></label><label>${ui('Line thickness','Grosor de línea')}<input data-mark-setting="width" type="range" min="0.02" max="2" step="0.02" value="0.35"><output data-mark-output="width">0.35%</output></label></div>
        <p class="pdf-hint">${ui('Choose a finger, then tap the note. Use two fingers to zoom or pan.', 'Toca un dedo y después la nota. Dos dedos para ampliar o desplazar.')}</p>
      </div>
      <div class="pdf-view-panel" hidden><div class="pdf-zoom">${scoreButton('out',ui('Zoom out', 'Reducir zoom'),'−')}<output class="pdf-zoom-value">100 %</output>${scoreButton('in',ui('Zoom in', 'Ampliar zoom'),'+')}${scoreButton('fit',ui('Fit whole page', 'Ver página completa'))}</div><p>${ui('Zoom and pan, then save this orientation.', 'Amplía y desplaza; guarda esta orientación.')}</p><div class="pdf-view-actions">${scoreButton('save-view',ui('Save frame', 'Guardar encuadre'),ui('Save frame', 'Guardar encuadre'))}</div><details class="pdf-framing-extra"><summary>${ui('Additional options','Opciones adicionales')}</summary><div class="pdf-view-actions">${scoreButton('reset-view',ui('Reset frame', 'Restablecer encuadre'),ui('Reset', 'Restablecer'))}${scoreButton('fullscreen',ui('Full screen', 'Pantalla completa'),ui('Full screen', 'Pantalla completa'))}</div><div class="pdf-split">${scoreButton('split',ui('Split page', 'Dividir página'),ui('Split page', 'Dividir página'),'aria-pressed="false"')}${scoreButton('split-clear',ui('Remove the parts of this page', 'Quitar las partes de esta página'),ui('Clear page', 'Vaciar página'),'hidden')}</div><p class="pdf-split-hint"></p></details><p class="pdf-view-status" role="status"></p></div>
      <div class="pdf-state-row"><p class="pdf-save-state" role="status">${ui('Opening score…', 'Abriendo partitura…')}</p>${scoreButton('retry',ui('Retry saving', 'Reintentar guardado'),ui('Save', 'Guardar'))}</div>
      ${scoreButton('print',ui('Print score','Imprimir partitura'),scoreIcon('print'),'class="score-print-icon"')}
      ${scoreButton('close',session ? ui('Return to session','Volver a la sesión') : ui('Close score','Cerrar partitura'),session ? ui('Return to session','Volver a la sesión') : ui('Close score','Cerrar partitura'))}
    </div>
    <div class="pdf-widget-bar">${scoreButton('drag',ui('Move controls', 'Mover controles'))}${session ? scoreButton('timer',ui('Resume practice', 'Continuar práctica'),`${scoreIcon('play')}<span class="pdf-time">0:00</span>`) : '<span class="pdf-time"></span>'}${session?.record ? scoreButton('record',ui('Record practice','Grabar práctica'),scoreIcon('record')) : ''}${session?.finish ? scoreButton('finish',ui('Finish practice', 'Terminar práctica'),scoreIcon('finish'),'class="pdf-finish"') : ''}${scoreButton('tools',ui('Edit score', 'Editar partitura'),scoreIcon('tools'),'aria-controls="pdf-panel" aria-expanded="false"')}${scoreButton('split-done',ui('Done editing', 'Salir de edición'),ui('Done editing', 'Salir de edición'),'class="pdf-split-done" hidden')}<span class="pdf-pagination">${scoreButton('prev',ui('Previous page', 'Página anterior'))}<span class="pdf-page-count" aria-live="polite">— / —</span>${scoreButton('next',ui('Next page', 'Página siguiente'))}</span></div>
    <button type="button" data-pdf="active-tool" class="pdf-active-tool" hidden></button>
  </aside>`;
}
