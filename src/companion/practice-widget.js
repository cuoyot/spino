import { ui } from './locale.js';
import { scoreIcon, updateScoreTimer, enableScoreWidgetMinimize } from './score-controls.js';
import './practice-widget.css';

export const practiceWidgetLeft = x => `clamp(8px, ${x}px, calc(100vw - min(var(--practice-widget-width, 252px), calc(100vw - 16px)) - 8px))`;

// The same four slots anchor every practice type; type-specific controls sit above them.
export function standardizePracticeWidget(widget, { drag, timer, finish, options, alternateOptions = [] }) {
  widget.classList.add('practice-widget');
  const bar = widget.querySelector('.pdf-widget-bar');
  const core = [drag, timer, finish, options, ...alternateOptions].filter(Boolean);
  const secondary = document.createElement('div'); secondary.className = 'practice-widget-secondary';
  for (const node of [...bar.children]) if (!core.includes(node)) secondary.append(node);
  widget.insertBefore(secondary, bar);
  for (const [role, node] of Object.entries({ drag, timer, finish, options })) if (node) node.dataset.practiceRole = role;
  for (const node of alternateOptions) node.dataset.practiceRole = 'options';
  if(finish){finish.setAttribute('aria-label',ui('Stop practice','Parar práctica'));finish.title=ui('Stop practice','Parar práctica');}
  if(options){options.setAttribute('aria-label',ui('Options','Opciones'));options.title=ui('Options','Opciones');}
  bar.append(...core);
  const panel=widget.querySelector('.pdf-panel');
  if(panel){
    const alignPanel=()=>{if(panel.hidden||!widget.isConnected)return;const rect=widget.getBoundingClientRect();const width=Math.min(420,innerWidth-16);panel.style.left=Math.max(8,Math.min(innerWidth-width-8,rect.right-width))+'px';panel.style.bottom=Math.max(8,innerHeight-rect.top+8)+'px';panel.style.maxHeight=Math.max(80,rect.top-24)+'px';};
    const visibility=new MutationObserver(alignPanel);visibility.observe(panel,{attributes:true,attributeFilter:['hidden']});visibility.observe(widget,{attributes:true,attributeFilter:['style','class']});
    const resize=new ResizeObserver(alignPanel);resize.observe(widget);window.addEventListener('resize',alignPanel);
    widget.closest('dialog')?.addEventListener('close',()=>{visibility.disconnect();resize.disconnect();window.removeEventListener('resize',alignPanel);},{once:true});
  }
  return secondary;
}

export function createManagedPracticeWidget({ toggle, pause, stop, returnToSession, settings, guide, midi, tempo, background }) {
  const widget = document.createElement('aside'); widget.className = 'managed-practice-widget';widget.hidden = true;
  widget.setAttribute('aria-label', ui('Practice controls', 'Controles de práctica'));
  const action = (id, label, icon) => `<button type="button" data-managed="${id}" aria-label="${label}" title="${label}">${scoreIcon(icon)}</button>`;
  widget.innerHTML = `<div class="pdf-panel" hidden><button type="button" data-managed="return">${ui('Return to session','Volver a la sesión')}</button><div data-managed-generated><div class="managed-tempo"><button type="button" data-managed="slower" aria-label="${ui('Slower','Más lento')}">−</button><span><b data-managed-bpm>60</b> BPM</span><button type="button" data-managed="faster" aria-label="${ui('Faster','Más rápido')}">+</button></div><button type="button" data-managed="settings">${ui('Practice settings','Ajustes de práctica')}</button><button type="button" data-managed="guide">${ui('How to play','Cómo se toca')}</button><button type="button" data-managed="midi">${ui('MIDI instrument','Instrumento MIDI')}</button></div><label data-managed-free><input type="checkbox" data-managed-background>${ui('Keep timing in the background','Seguir contando en segundo plano')}</label></div><div class="pdf-widget-bar">${action('drag',ui('Move controls','Mover controles'),'drag')}${action('timer',ui('Continue practice','Continuar práctica'),'play')}${action('stop',ui('Stop practice','Parar práctica'),'finish')}${action('options',ui('Options','Opciones'),'tools')}</div>`;
  const find = id => widget.querySelector(`[data-managed="${id}"]`);
  const panel = widget.querySelector('.pdf-panel');
  standardizePracticeWidget(widget,{drag:find('drag'),timer:find('timer'),finish:find('stop'),options:find('options')});
  widget.addEventListener('click',event=>{
    const id=event.target.closest('[data-managed]')?.dataset.managed;
    if(id==='timer')toggle();
    else if(id==='stop')void stop();
    else if(id==='return')returnToSession();
    else if(id==='options'){if(panel.hidden)pause();panel.hidden=!panel.hidden;find('options').setAttribute('aria-expanded',String(!panel.hidden));}
    else if(id==='settings')settings();else if(id==='guide')guide();else if(id==='midi')midi();
    else if(id==='slower')tempo(-1);else if(id==='faster')tempo(1);
  });
  widget.querySelector('[data-managed-background]').addEventListener('change',event=>background(event.target.checked));
  let drag=null;
  find('drag').addEventListener('pointerdown',event=>{if(event.button>0)return;const r=widget.getBoundingClientRect();drag={id:event.pointerId,x:event.clientX-r.left,y:event.clientY-r.top};find('drag').setPointerCapture(event.pointerId);});
  find('drag').addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;widget.style.right=widget.style.bottom='auto';widget.style.left=practiceWidgetLeft(event.clientX-drag.x);widget.style.top=Math.max(36,Math.min(innerHeight-widget.offsetHeight-8,event.clientY-drag.y))+'px';});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])find('drag').addEventListener(name,()=>{drag=null;});
  return widget;
}

export function updateManagedPracticeWidget(widget, { visible, key, time, running, free, warmup, bpm, keepTimeInBackground }) {
  if(visible&&(widget.hidden||widget.dataset.practiceKey!==key)){
    widget.style.left=widget.style.top=widget.style.right=widget.style.bottom='';widget.classList.remove('score-widget-minimized');widget.querySelector('.pdf-panel').hidden=true;widget.dataset.practiceKey=key;
  }
  widget.hidden=!visible;
  if(!visible){widget.remove();return;}
  if(!widget.isConnected)document.body.append(widget);
  updateScoreTimer(widget.querySelector('[data-managed=timer]'),{time,running});
  widget.querySelector('[data-managed-generated]').hidden=free;
  widget.querySelector('[data-managed-free]').hidden=!free;
  widget.querySelector('[data-managed=guide]').hidden=!warmup;
  widget.querySelector('[data-managed-bpm]').textContent=bpm;
  widget.querySelector('[data-managed-background]').checked=!!keepTimeInBackground;
}

export function enableManagedWidgetMinimize(widget) {
  enableScoreWidgetMinimize(widget,widget.querySelector('[data-managed=drag]'));
}
