import { midiIndicatorMarkup } from '../midi-indicator.js';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { readMusicXML, bytesFromBase64 } from './musicxml-document.js';
import { excerptXML } from './musicxml-segments.js';
import { scoreFullscreen } from './platform.js';
import { scoreIcon, updateScoreTimer } from './score-controls.js';
import { digest } from './library.js';
import { ui, localizeMessage } from './locale.js';
import { marginTurn, turnEdge } from './pdf-annotations.js';
import { MARK_COLORS } from './pdf-annotations.js';
import { onPedalTurn } from './pedals.js';
import * as midi from '../midi.js';
import { createFollower, readFollowPreference, saveFollowPreference } from './musicxml-follow.js';
import './pdf-viewer.css';
import { musicXMLPrintPages } from './musicxml-print.js';
import { printScore } from './score-print.js';

export async function openMusicScore({ asset, selection, start = 0, end, session = null, saveMarks = async () => {}, onRendered = async () => {}, onClose = () => {} }) {
  const bytes = bytesFromBase64(asset.base64);
  if (await digest(bytes) !== asset.sha256) throw new Error(ui('The local score hash has changed. Revalidate it before viewing.', 'El archivo local de la partitura ha cambiado. Valídalo de nuevo antes de abrirlo.'));
  const validated = readMusicXML(bytes, asset.format);
  const xml = excerptXML(validated.xml, selection, start, end);
  const fullscreen = await scoreFullscreen(), modal = document.createElement('dialog');
  modal.className = 'pdf-viewer xml-score-viewer'; modal.setAttribute('aria-label', session ? ui('MusicXML practice', 'Práctica con MusicXML') : ui('MusicXML review preview', 'Vista previa de MusicXML'));
  modal.innerHTML = `<div class="xml-score-scroll" style="position:absolute;inset:0;overflow:hidden;background:#fff;touch-action:none"><div class="xml-score" style="min-width:320px;color:#111"></div></div><div class="xml-page-mask" aria-hidden="true"></div><div class="pdf-turn-zone" data-side="prev" aria-hidden="true"></div><div class="pdf-turn-zone" data-side="next" aria-hidden="true"></div><aside class="pdf-widget"><div class="pdf-widget-bar"><button type="button" data-action="midi-settings" aria-label="${ui('MIDI instrument','Instrumento MIDI')}">${midiIndicatorMarkup()}</button><button data-xml="drag" aria-label="${ui('Move controls', 'Mover controles')}">${scoreIcon('drag')}</button><span class="xml-time"></span><button data-xml="pause" aria-label="${ui('Pause practice', 'Pausar práctica')}">${scoreIcon('pause')}</button>${session ? `<button data-xml="follow" class="xml-follow-toggle" aria-pressed="false" title="${ui('Follow with MIDI', 'Seguir con MIDI')}">${ui('Follow', 'Seguir')}</button><select data-xml-hands style="width:auto;min-height:36px;padding:4px 8px;font-size:13px" aria-label="${ui('Hands to follow', 'Manos a seguir')}" hidden><option value="both">${ui('Both hands', 'Ambas manos')}</option><option value="right">${ui('Right hand', 'Mano derecha')}</option><option value="left">${ui('Left hand', 'Mano izquierda')}</option></select>` : ''}<button data-xml="out" aria-label="${ui('Zoom out', 'Reducir zoom')}">−</button><button data-xml="in" aria-label="${ui('Zoom in', 'Ampliar zoom')}">+</button><button data-xml="prev" aria-label="${ui('Previous page', 'Página anterior')}">${scoreIcon('prev')}</button><span class="xml-page-count" aria-live="polite"></span><button data-xml="next" aria-label="${ui('Next page', 'Página siguiente')}">${scoreIcon('next')}</button>${session?.record ? `<button data-xml="record" aria-label="${ui('Record practice','Grabar práctica')}">${scoreIcon('record')}</button>` : ''}${session?.finish ? `<button data-xml="finish" class="pdf-finish">${ui('Finish practice', 'Terminar práctica')}</button>` : ''}<button data-xml="close" aria-label="${ui('Back', 'Volver')}">${scoreIcon('close')}</button></div><p class="xml-status" style="margin:4px 8px;font-size:12px">${ui('Loading score…', 'Cargando partitura…')}</p><p class="xml-follow" role="status" style="margin:4px 8px;font-size:12px" hidden></p></aside>`;
  document.body.append(modal); modal.showModal();
  const scroll = modal.querySelector('.xml-score-scroll'), target = modal.querySelector('.xml-score'), widget = modal.querySelector('.pdf-widget');
  const bar = widget.querySelector('.pdf-widget-bar');
  const options = document.createElement('div'); options.className = 'pdf-panel'; options.hidden = true;
  const optionToggle = document.createElement('button'); optionToggle.dataset.xml = 'options';
  optionToggle.setAttribute('aria-label', ui('Edit score', 'Editar partitura')); optionToggle.innerHTML = scoreIcon('tools');
  const done = document.createElement('button'); done.dataset.xml = 'done'; done.textContent = ui('Done', 'Hecho'); done.hidden = true;
  const zoomLabel = document.createElement('label'); zoomLabel.textContent = ui('Zoom (%)', 'Zoom (%)');
  const zoomField = document.createElement('input'); zoomField.type = 'number'; zoomField.min = '60'; zoomField.max = '200'; zoomField.step = '10'; zoomField.value = '100'; zoomField.dataset.xmlZoom = ''; zoomField.setAttribute('aria-label',ui('Zoom percentage','Porcentaje de zoom')); zoomLabel.append(zoomField);
  for (const node of [widget.querySelector('[data-action=midi-settings]'), modal.querySelector('[data-xml=follow]'), modal.querySelector('[data-xml-hands]'), modal.querySelector('[data-xml=out]'), zoomLabel, modal.querySelector('[data-xml=in]'), modal.querySelector('[data-xml=close]'), modal.querySelector('.xml-status')]) if (node) options.append(node);
  const closeButton=options.querySelector('[data-xml=close]');closeButton.textContent=session?ui('Return to session','Volver a la sesión'):ui('Close score','Cerrar partitura');closeButton.setAttribute('aria-label',closeButton.textContent);
  modal.querySelector('.xml-time').remove();
  const finish=modal.querySelector('[data-xml=finish]');if(finish){finish.innerHTML=scoreIcon('finish');finish.setAttribute('aria-label',ui('Finish practice','Terminar práctica'));}
  const pauseButton=modal.querySelector('[data-xml=pause]');
  if(finish)bar.insertBefore(finish,pauseButton.nextSibling);
  bar.insertBefore(optionToggle,(finish||pauseButton).nextSibling);bar.insertBefore(done,optionToggle.nextSibling);
  const pageCount=modal.querySelector('.xml-page-count');pageCount.classList.add('pdf-page-count');
  widget.prepend(options);
  const midiGroup=document.createElement('section');midiGroup.className='xml-options-section';
  const midiHeading=document.createElement('h3');midiHeading.textContent=ui('MIDI follow','Seguimiento MIDI');midiGroup.append(midiHeading);
  const midiRow=document.createElement('div');midiRow.className='xml-option-row';
  for(const selector of ['[data-action=midi-settings]','[data-xml=follow]','[data-xml-hands]']){const node=modal.querySelector(selector);if(node)midiRow.append(node);}
  midiGroup.append(midiRow,modal.querySelector('.xml-follow'));
  const zoomGroup=document.createElement('section');zoomGroup.className='xml-options-section';
  const zoomHeading=document.createElement('h3');zoomHeading.textContent='Zoom';zoomGroup.append(zoomHeading);
  const zoomRow=document.createElement('div');zoomRow.className='xml-option-row xml-zoom-row';
  zoomLabel.firstChild.remove();
  zoomRow.append(modal.querySelector('[data-xml=out]'),zoomLabel,modal.querySelector('[data-xml=in]'));zoomGroup.append(zoomRow);
  const status=modal.querySelector('.xml-status');
  midiGroup.hidden=!session;
  options.replaceChildren(midiGroup,zoomGroup,status);
  const printButton=document.createElement('button');printButton.dataset.xml='print';printButton.innerHTML=scoreIcon('print');printButton.className='score-print-icon';printButton.title=ui('Print score','Imprimir partitura');printButton.setAttribute('aria-label',printButton.title);options.append(printButton);
  const marksGroup=document.createElement('section');marksGroup.className='xml-options-section';
  marksGroup.innerHTML=`<h3>${ui('Fingering','Digitación')}</h3><div class="pdf-fingers" role="group" aria-label="${ui('Finger','Dedo')}">${[1,2,3,4,5].map(n=>`<button data-xml-digit="${n}" aria-label="${ui('Finger','Dedo')} ${n}" aria-pressed="false">${n}</button>`).join('')}</div><div class="pdf-palette" role="group" aria-label="${ui('Color','Color')}">${MARK_COLORS.map((color,i)=>`<button data-xml-color="${color}" style="--swatch:${color}" aria-label="${[ui('Red','Rojo'),ui('Blue','Azul'),ui('Ochre','Ocre'),ui('Green','Verde'),ui('Ink','Tinta')][i]}" aria-pressed="false"><span></span></button>`).join('')}</div><div class="xml-option-row"><button data-xml-mark="read">${ui('Read','Leer')}</button><button data-xml-mark="erase">${ui('Remove fingering','Borrar digitación')}</button></div>`;
  marksGroup.insertAdjacentHTML('beforeend',`<div class="pdf-mark-settings"><label>${ui('Number / text size','Tamaño de número / texto')}<input data-xml-size type="range" min="1" max="10" step="0.5" value="2.5"><output>2.5%</output></label></div>`);
  const compact=document.createElement('div');compact.className='pdf-quick-palette';compact.hidden=true;widget.append(compact);
  const activeTool=document.createElement('button');activeTool.className='pdf-active-tool';activeTool.hidden=true;widget.append(activeTool);
  activeTool.onclick=()=>{expanded=true;controls();};
  done.classList.add('pdf-split-done');done.innerHTML=scoreIcon('done');done.setAttribute('aria-label',ui('Done editing','Salir de edición'));done.title=ui('Done editing','Salir de edición');
  let annotationTool='read',annotationDigit='1',annotationColor=MARK_COLORS[0],annotationSize=.025;
  marksGroup.querySelector('[data-xml-size]').addEventListener('input',event=>{annotationSize=Number(event.target.value)/100;marksGroup.querySelector('output').textContent=`${event.target.value}%`;});
  function updateDigitControls(){
    for(const button of marksGroup.querySelectorAll('[data-xml-digit]'))button.setAttribute('aria-pressed',String(annotationTool==='finger'&&button.dataset.xmlDigit===annotationDigit));
    for(const button of marksGroup.querySelectorAll('[data-xml-color]'))button.setAttribute('aria-pressed',String(button.dataset.xmlColor===annotationColor));
    for(const button of marksGroup.querySelectorAll('[data-xml-mark]'))button.setAttribute('aria-pressed',String(button.dataset.xmlMark===annotationTool));
  }
  marksGroup.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.xmlDigit){annotationDigit=button.dataset.xmlDigit;annotationTool='finger';}
    if(button.dataset.xmlColor)annotationColor=button.dataset.xmlColor;
    if(button.dataset.xmlMark)annotationTool=button.dataset.xmlMark;
    if(annotationTool!=='read')expanded=false;
    updateDigitControls();controls();
  });updateDigitControls();
  options.insertBefore(marksGroup,zoomGroup);
  let noteMarks=structuredClone(asset.musicxmlMarks||[]), markSaving=Promise.resolve();
  const markLayer=document.createElement('div');markLayer.style.cssText='position:absolute;inset:0;pointer-events:none';target.style.position='relative';target.append(markLayer);
  const noteTargets=()=>{
    const notes=[];
    for(const [m,staves] of (display.GraphicSheet?.MeasureList||[]).entries())for(const [s,measure] of staves.entries())for(const [e,entry] of (measure?.staffEntries||[]).entries())for(const [v,voice] of entry.graphicalVoiceEntries.entries())for(const [n,note] of voice.notes.entries()){
      if(note.sourceNote?.isRest?.())continue;
      const element=note.getSVGGElement?.();if(element){element.dataset.xmlNote='true';notes.push({key:`${selection.join(',')}:${m+start}:${s}:${e}:${v}:${n}`,element});}
    }
    return notes;
  };
  function paintNoteMarks(){
    if(!markLayer.isConnected)target.append(markLayer);
    markLayer.replaceChildren();const base=target.getBoundingClientRect();
    for(const note of noteTargets())for(const mark of noteMarks.filter(m=>m.key===note.key&&m.type==='finger')){
      const r=note.element.getBoundingClientRect(),node=document.createElement('span');
      node.style.cssText=`position:absolute;left:${r.left-base.left-4}px;top:${r.top-base.top-8}px;width:${Math.max(18,r.width+8)}px;height:${r.height+16}px;`;
      if(mark.type==='finger'){const size=720*(mark.fontSize??.025)*zoom;node.textContent=mark.digit;node.style.color=mark.color;node.style.font=`bold ${size}px system-ui`;node.style.top=`${r.top-base.top-size-6*zoom}px`;}
      else{node.style.background=mark.color;node.style.opacity='.25';node.style.borderRadius='4px';}
      markLayer.append(node);
    }
  }
  scroll.addEventListener('click',event=>{
    const type=annotationTool;if(running()||type==='read')return;
    const hit=noteTargets().map(note=>{const r=note.element.getBoundingClientRect();return{...note,d:Math.hypot(event.clientX-(r.left+r.width/2),event.clientY-(r.top+r.height/2))};}).sort((a,b)=>a.d-b.d)[0];
    if(!hit||hit.d>40)return;
    noteMarks=noteMarks.filter(m=>m.key!==hit.key||m.type!=='finger');
    if(type!=='erase')noteMarks.push({key:hit.key,type:'finger',digit:annotationDigit,color:annotationColor,fontSize:annotationSize});
    paintNoteMarks();const snapshot=structuredClone(noteMarks);markSaving=markSaving.catch(()=>{}).then(()=>saveMarks(snapshot)).catch(error=>{status.dataset.error='true';status.textContent=ui('Could not save annotations.','No se pudieron guardar las anotaciones.');controls();throw error;});markSaving.catch(()=>{});
  });
  widget.append(closeButton);
  let closed = false, timer, zoom = 1, drag = null, expanded = false;
  const running = () => !!session?.read().running;
  const controls = () => {
    const editing=expanded||annotationTool!=='read';
    const info = session?.read(); modal.dataset.running = String(running());
    const pause = modal.querySelector('[data-xml=pause]');
    if (session) updateScoreTimer(pause, info);
    for (const action of ['out', 'in']) modal.querySelector(`[data-xml=${action}]`).hidden = running();
    closeButton.hidden=running()||editing;
    modal.querySelector('[data-xml=drag]').hidden=false;
    modal.querySelector('[data-xml=finish]')?.toggleAttribute('hidden', false);
    pause.hidden=!session;pause.disabled=editing;
    options.hidden = !expanded || running();optionToggle.hidden=editing;done.hidden=!editing||running();
    const quick=!expanded&&!running()&&annotationTool!=='read';compact.hidden=!quick;activeTool.hidden=!quick;
    const destination=quick?compact:options;if(marksGroup.parentElement!==destination)destination.append(marksGroup);
    marksGroup.querySelector('h3').hidden=quick;
    activeTool.textContent=annotationTool==='finger'?ui(`Finger ${annotationDigit} · Options`,`Dedo ${annotationDigit} · Opciones`):ui('Erase · Options','Borrar · Opciones');activeTool.style.borderColor=annotationColor;
    widget.insertBefore(activeTool,compact);
    optionToggle.setAttribute('aria-expanded',String(expanded));
    if(document.activeElement!==zoomField)zoomField.value=String(Math.round(zoom*100));
    status.hidden = !status.dataset.error;
  };
  const display = new OpenSheetMusicDisplay(target, { backend: 'svg', autoResize: true, drawingParameters: 'default', drawTitle: true, pageFormat: 'Endless', cursorsOptions: [{ type: 0, color: '#2f6fe0', alpha: 0.35, follow: false }] });
  function setZoom(value) {
    if(running()||!Number.isFinite(value)||value<.6||value>2){zoomField.value=String(Math.round(zoom*100));return;}
    zoom=value;display.Zoom=zoom;display.render();paginate();if(follower){display.cursor.update();showCursorPage();}controls();
  }
  zoomField.addEventListener('change',()=>setZoom(Number(zoomField.value)/100));

  // Optional MIDI follow mode (practice only): the cursor waits for the right keys and the page follows the cursor.
  const followPreference = readFollowPreference();
  let follower = null, stopNotes = null;
  function followStatus(state = follower?.state) {
    const line = modal.querySelector('.xml-follow'), toggle = modal.querySelector('[data-xml=follow]'), hands = modal.querySelector('[data-xml-hands]');
    if (toggle) toggle.setAttribute('aria-pressed', String(!!follower));
    if (hands) { hands.hidden = !follower; hands.value = followPreference.hands; }
    line.hidden = !follower; if (!follower || !state) { delete modal.dataset.followPending; return; }
    modal.dataset.followPending = state.pending.join(' '); // the keys the cursor waits for, also read by tests
    const score = ui(`${state.correct} correct · ${state.wrong} wrong`, `${state.correct} aciertos · ${state.wrong} errores`);
    line.textContent = state.finished ? `${ui('End of the score', 'Fin de la partitura')} · ${score}` : !midi.connectedDevices().length ? ui('Connect a MIDI keyboard','Conecta un teclado MIDI') : score;
  }
  function showCursorPage() {
    const cursor = display.cursor?.cursorElement; if (!cursor || !pages.length) return;
    const box = cursor.getBoundingClientRect(), y = box.top + box.height / 2 - scroll.getBoundingClientRect().top + scroll.scrollTop;
    const index = pages.findIndex(page => y >= page.top && y < page.bottom);
    if (index >= 0 && index !== pageIndex) { pageIndex = index; showPage(); }
  }
  function startFollow() {
    if (follower || !display.cursor) return;
    display.cursor.show(); display.cursor.reset();
    const initial = session?.measurement?.();
    follower = createFollower(display.cursor, { hands: followPreference.hands, correct: initial?.correct || 0, wrong: initial?.wrong || 0,
      onMove: () => showCursorPage(), onChange: state => { followStatus(state); session?.measure?.({ correct: state.correct, wrong: state.wrong }); } });
    stopNotes = midi.on('note', ({ midi: key }) => follower?.press(key));
    follower.start();
  }
  function stopFollow() { stopNotes?.(); stopNotes = null; follower = null; display.cursor?.hide(); followStatus(); }
  modal.querySelector('[data-xml-hands]')?.addEventListener('change', event => { followPreference.hands = event.target.value; saveFollowPreference(followPreference); follower?.setHands(followPreference.hands); });

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
    paintNoteMarks();
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
  const resized = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (!closed && target.querySelector('svg')) { paginate(); if (follower) { display.cursor.update(); showCursorPage(); } } }, 400); });
  resized.observe(scroll);
  async function close() {
    if (closed) return;
    if (running()) { await session.toggle(); controls(); return; }
    try{await markSaving;}catch{return false;}
    closed = true; stopFollow(); clearInterval(timer); clearTimeout(zoneTimer); clearTimeout(resizeTimer); resized.disconnect(); stopPedals(); display.AutoResizeEnabled = false; display.clear(); await fullscreen.exit(); modal.close(); modal.remove(); onClose(); return true;
  }
  async function leaveEditing() {
    try { await markSaving; } catch { return; }
    expanded=false; annotationTool='read'; updateDigitControls();
    if(session && !running()) await session.toggle();
    controls();
  }
  modal.addEventListener('cancel', event => { event.preventDefault(); if(!running() && (expanded || annotationTool!=='read')) void leaveEditing(); else void close(); });
  modal.addEventListener('click', async event => {
    const action = event.target.closest('[data-xml]')?.dataset.xml;
    if(action==='options'){
      if(!session && expanded) { expanded=false; controls(); return; }
      if(running()) await session.toggle();
      expanded=true;controls();return;
    }
    if(action==='done'){await leaveEditing();return;}
    if(action==='print'&&!running()){
      printButton.disabled=true;printButton.textContent='…';printButton.setAttribute('aria-busy','true');
      try { await printScore(await musicXMLPrintPages(validated.xml,structuredClone(noteMarks)),validated.title || 'Score'); }
      catch (error) { status.dataset.error='true';status.textContent=ui('Could not print. Try again.','No se ha podido imprimir. Inténtalo de nuevo.')+': '+localizeMessage(error.message);controls(); }
      finally { printButton.disabled=false;printButton.innerHTML=scoreIcon('print');printButton.removeAttribute('aria-busy'); }
    }
    if (action === 'record') { session?.record?.(); return; }
    if (action === 'finish' && session?.finish) { if(running()) { await session.toggle(); controls(); } if (await close()) await session.finish(); return; }
    if (action === 'close') await close();
    if (action === 'pause') { await session.toggle(); controls(); }
    if (action === 'next' || action === 'prev') turn(action === 'next' ? 1 : -1);
    if (action === 'follow') { followPreference.enabled = !follower; saveFollowPreference(followPreference); if (follower) stopFollow(); else startFollow(); }
    if (!running() && ['in', 'out'].includes(action)) setZoom(Math.max(.6,Math.min(2,zoom+(action==='in'?.2:-.2))));
  });
  const handle = modal.querySelector('[data-xml=drag]'); handle.style.touchAction = 'none';
  handle.onpointerdown = e => { e.preventDefault(); handle.setPointerCapture(e.pointerId); const r = widget.getBoundingClientRect(); drag = { x: e.clientX - r.x, y: e.clientY - r.y }; };
  handle.onpointermove = e => { if (!drag) return; widget.style.right = 'auto'; widget.style.bottom = 'auto'; widget.style.left = `${Math.max(8, Math.min(modal.clientWidth - widget.offsetWidth - 8, e.clientX - drag.x))}px`; widget.style.top = `${Math.max(pauseButton.hidden ? 8 : 36, Math.min(modal.clientHeight - widget.offsetHeight - 8, e.clientY - drag.y))}px`; };
  handle.onpointerup = handle.onpointercancel = () => { drag = null; };
  controls(); timer = setInterval(controls, 500);
  try {
    await display.load(xml.trimStart().startsWith('<?xml')?xml:'<?xml version="1.0"?>'+xml); if (closed) return { close };
    display.render();
    if (!target.querySelector('svg')) throw new Error(ui('The renderer did not produce a score.', 'No se ha podido dibujar la partitura.'));
    paginate();
    if (session && followPreference.enabled) startFollow();
    await onRendered();
    modal.querySelector('.xml-status').textContent = session ? ui('Written score · manual tracking, or “Follow” to play along with a MIDI keyboard', 'Partitura escrita · registro manual, o “Seguir” para tocar con un teclado MIDI') : ui('Written score · manual practice · no automatic note evaluation', 'Partitura escrita · práctica manual · sin evaluación automática de notas');
  } catch (error) { if (running()) await session.toggle(); status.dataset.error='true';expanded=true;controls(); status.textContent = `${ui('Could not display the score', 'No se ha podido mostrar la partitura')}: ${localizeMessage(error.message)}`; }
  return { close };
}
