import { midiIndicatorMarkup } from '../midi-indicator.js';
import { MARK_COLORS } from './pdf-annotations.js';
import { ui } from './locale.js';

const paths = {
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
  pause: '<path d="M8 5v14M16 5v14" stroke-width="4"/>',
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
export const scoreButton = (action, label, content = scoreIcon(action), extra = '') => `<button type="button" data-pdf="${action}" aria-label="${label}" title="${label}" ${extra}>${content}</button>`;
const toolButton = (id, label) => `<button type="button" data-tool="${id}" aria-label="${label}" title="${label}" aria-pressed="false">${scoreIcon(id)}<span>${label}</span></button>`;

export function scoreControlsMarkup(session) {
  const tools = [['read', ui('Pan', 'Mover')], ['pen', ui('Pen', 'Boli')], ['highlight', ui('Highlight', 'Resaltar')], ['underline', ui('Underline', 'Subrayar')], ['text', ui('Text', 'Texto')], ['erase', ui('Erase', 'Borrar')], ['line', ui('Line', 'Línea')], ['arrow', ui('Arrow', 'Flecha')], ['ellipse', ui('Circle', 'Círculo')], ['rectangle', ui('Frame', 'Marco')]];
  const colors = [ui('Red', 'Rojo'), ui('Blue', 'Azul'), ui('Ochre', 'Ocre'), ui('Green', 'Verde'), ui('Ink', 'Tinta')];
  return `<aside class="pdf-widget" aria-label="${ui('Score controls', 'Controles de la partitura')}">
    <div class="pdf-panel" id="pdf-panel" hidden>
      <div class="pdf-panel-heading"><span class="pdf-title"></span><span class="pdf-paused">${session ? ui('Paused', 'En pausa') : ui('Study', 'Estudio')}</span></div>
      <div class="pdf-tabs" role="group" aria-label="${ui('Options', 'Opciones')}">${scoreButton('annotations', ui('Annotate', 'Anotar'), ui('Annotate', 'Anotar'), 'aria-pressed="true"')}${scoreButton('view', ui('Framing', 'Encuadre'), ui('Framing', 'Encuadre'), 'aria-pressed="false"')}</div>
      <div class="pdf-annotation-panel">
        <div class="pdf-fingers" role="group" aria-label="${ui('Fingering', 'Digitación')}"><span>${ui('Fingers', 'Dedos')}</span>${[1, 2, 3, 4, 5].map(n => `<button type="button" data-finger="${n}" aria-label="${ui(`Finger ${n}`, `Dedo ${n}`)}" aria-pressed="false">${n}</button>`).join('')}</div>
        <div class="pdf-tools" role="group" aria-label="${ui('Annotation tools', 'Herramientas de anotación')}">${tools.map(([id,label]) => toolButton(id,label)).join('')}</div>
        <div class="pdf-palette" role="group" aria-label="${ui('Color', 'Color')}">${MARK_COLORS.map((color, i) => `<button type="button" data-color="${color}" style="--swatch:${color}" aria-label="${colors[i]}" aria-pressed="false"><span></span></button>`).join('')}${scoreButton('undo',ui('Undo', 'Deshacer'))}${scoreButton('redo',ui('Redo', 'Rehacer'))}</div>
        <p class="pdf-hint">${ui('Choose a finger, then tap the note. Use two fingers to zoom or pan.', 'Toca un dedo y después la nota. Dos dedos para ampliar o desplazar.')}</p>
      </div>
      <div class="pdf-view-panel" hidden><div class="pdf-zoom">${scoreButton('out',ui('Zoom out', 'Reducir zoom'),'−')}<output class="pdf-zoom-value">100 %</output>${scoreButton('in',ui('Zoom in', 'Ampliar zoom'),'+')}${scoreButton('fit',ui('Fit whole page', 'Ver página completa'))}</div><p>${ui('Zoom and pan to remove margins. Save a frame for each orientation.', 'Amplía y desplaza la hoja para quitar márgenes. Guarda un encuadre para cada orientación.')}</p><div class="pdf-view-actions">${scoreButton('save-view',ui('Save frame', 'Guardar encuadre'),ui('Save frame', 'Guardar encuadre'))}${scoreButton('reset-view',ui('Reset frame', 'Restablecer encuadre'),ui('Reset', 'Restablecer'))}${scoreButton('fullscreen',ui('Full screen', 'Pantalla completa'),ui('Full screen', 'Pantalla completa'))}</div><div class="pdf-split">${scoreButton('split',ui('Split page', 'Dividir página'),ui('Split page', 'Dividir página'),'aria-pressed="false"')}${scoreButton('split-clear',ui('Remove the parts of this page', 'Quitar las partes de esta página'),ui('Clear page', 'Vaciar página'),'hidden')}</div><p class="pdf-split-hint"></p><p class="pdf-view-status" role="status"></p></div>
      <div class="pdf-state-row"><p class="pdf-save-state" role="status">${ui('Opening score…', 'Abriendo partitura…')}</p>${scoreButton('retry',ui('Retry saving', 'Reintentar guardado'),ui('Save', 'Guardar'))}</div>
    </div>
    <div class="pdf-widget-bar">${midiIndicatorMarkup()}${scoreButton('drag',ui('Move controls', 'Mover controles'))}<span class="pdf-time" aria-label="${ui('Practice time', 'Tiempo de práctica')}">${session ? '00:00' : ''}</span>${session ? scoreButton('timer',ui('Resume practice', 'Continuar práctica'),scoreIcon('play')) : ''}${scoreButton('tools',ui('Show tools', 'Mostrar herramientas'),scoreIcon('tools'),'aria-controls="pdf-panel" aria-expanded="false"')}${session?.finish ? scoreButton('finish',ui('Finish practice', 'Terminar práctica'),ui('Finish practice', 'Terminar práctica'),'class="pdf-finish"') : ''}${scoreButton('split-done',ui('Finish splitting the page', 'Terminar de dividir la página'),ui('Done', 'Hecho'),'class="pdf-split-done" hidden')}${scoreButton('close',ui('Back', 'Volver'))}<span class="pdf-pagination">${scoreButton('prev',ui('Previous page', 'Página anterior'))}<span class="pdf-page-count" aria-live="polite">— / —</span>${scoreButton('next',ui('Next page', 'Página siguiente'))}</span></div>
  </aside>`;
}
