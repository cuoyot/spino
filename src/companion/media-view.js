import {ui, getAppLanguage} from './locale.js';
import {isOnStand} from './repertoire.js';
import {scoreIcon} from './score-controls.js';
import {localDate,weekOf,addDays} from './model.js';
import {activityIcon,recordingDate,filterRecordings,shiftMonth,monthCalendarMarkup} from './activity-calendar.js';
import {finalizeMediaDuration} from './media-duration.js';
import {audioVisualizerMarkup,createAudioVisualizer} from './audio-visualizer.js';
import {shareRecording} from './media-share.js';
import {cameraVideoConstraints,createCameraControls,cameraFrameRect} from './camera-controls.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')}`;
const shareIcon = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m8 11 8-5M8 13l8 5"/><circle cx="5" cy="12" r="3"/><circle cx="19" cy="4" r="3"/><circle cx="19" cy="20" r="3"/></svg>';
const shareButton = (attributes,disabled=false) => `<button type="button" class="quiet cp-media-share" ${attributes} ${disabled?'disabled':''} aria-label="${ui('Share recording','Compartir grabación')}" title="${ui('Share recording','Compartir grabación')}">${shareIcon()}</button>`;
export function recordedPieces(records, works) {
  return [...new Set(records.map(r=>r.workId).filter(Boolean))].map(id=>({id,title:works.find(w=>w.id===id)?.title || records.find(r=>r.workId===id)?.workTitle || ui('Piece','Obra')})).sort((a,b)=>a.title.localeCompare(b.title,getAppLanguage()));
}
export function mediaPieceFilterMarkup(records, works, workId = '') {
  return `<div class="cp-routine-activities cp-media-piece-choices">${[{id:'',title:ui('All pieces','Todas las obras')},...recordedPieces(records,works)].map(w=>`<button type="button" data-action="media-select-work" data-id="${esc(w.id)}" aria-pressed="${w.id===workId}" class="${w.id===workId?'primary':''}">${w.id===workId?'✓ ':''}${esc(w.title)}</button>`).join('')}</div><div class="cp-actions"><button type="button" class="quiet" data-action="close-dialog">${ui('Close','Cerrar')}</button></div>`;
}
export function mediaMarkup(records, works, {month = localDate(), mode = 'week', type = '', workId = ''} = {}) {
  const from=mode==='week'?weekOf(month):month.slice(0,7)+'-01',to=mode==='week'?addDays(from,6):addDays(shiftMonth(month,1),-1);
  const rows = filterRecordings(records,{from,to,type,workId});
  const calendarRecords=filterRecordings(records,{type,workId});
  const selectedPiece=recordedPieces(records,works).find(w=>w.id===workId);
  const kindLabel=kind=>kind==='audio'?ui('Audio','Audio'):ui('Video','Vídeo');
  const typeButton=(kind,content,css='',label='')=>`<button type="button" class="${css}" data-action="media-filter-type" data-id="${kind}" aria-pressed="${type===kind}"${label?` aria-label="${esc(label)}"`:''}>${content}</button>`;
  const byDate=new Map();for(const r of calendarRecords){const date=recordingDate(r);if(date)byDate.set(date,[...(byDate.get(date)||[]),r]);}
  const dateLabel=d=>new Intl.DateTimeFormat(getAppLanguage(),{dateStyle:'full'}).format(new Date(d+'T12:00:00'));
  const calendar=monthCalendarMarkup(month,{prefix:'media',mode,toggleAction:'media-toggle-month',day:(date,inMonth)=>{
    const takes=inMonth?(byDate.get(date)||[]):[],counts=['audio','video'].map(kind=>({kind,count:takes.filter(r=>r.kind===kind).length}));
    return `<div role="group" class="cp-activity-day ${inMonth?'':'is-outside'} ${takes.length?'has-recordings':''} ${counts.filter(c=>c.count).map(c=>'has-'+c.kind).join(' ')} ${takes.length&&date===localDate()?'is-today':''}" data-date="${date}" aria-label="${esc(dateLabel(date))}: ${takes.length} ${ui('recordings','grabaciones')}${counts.filter(c=>c.count).map(c=>`: ${c.count} ${c.kind==='audio'?ui('Audio','Audio'):ui('Video','Vídeo')}`).join(',')}"><span>${Number(date.slice(-2))}</span><span class="cp-media-day-icons">${counts.filter(c=>c.count).map(c=>typeButton(c.kind,activityIcon(c.kind),`cp-media-day-kind cp-media-day-${c.kind}`,`${kindLabel(c.kind)} · ${dateLabel(date)} · ${c.count} ${ui('recordings','grabaciones')}`)).join('')}</span></div>`;
  }});
  return `<section class="cp-media"><h1>${ui('Multimedia','Multimedia')}</h1><div class="cp-media-browser"><div class="cp-media-calendar-panel">${calendar}<div class="cp-media-filters" role="group" aria-label="${ui('Recording filters','Filtros de grabaciones')}">${['audio','video'].map(kind=>typeButton(kind,`<span class="cp-media-filter-check" aria-hidden="true">${type===kind?'✓':''}</span>${activityIcon(kind)}${kindLabel(kind)}`,`cp-media-filter cp-media-filter-${kind}`)).join('')}<button type="button" class="cp-media-filter cp-media-piece-filter" data-action="media-filter-work" aria-pressed="${!!workId}" aria-haspopup="dialog"><span class="cp-media-filter-check" aria-hidden="true">${workId?'✓':''}</span>${activityIcon('piece')}<span>${selectedPiece?esc(selectedPiece.title):ui('Piece','Obra')}</span></button></div></div><div><p class="muted" role="status">${ui('Recordings','Grabaciones')}: ${rows.length}</p><div class="cp-media-list">${rows.length ? rows.map(r=>`<article class="cp-card"><h2><span class="cp-media-kind cp-media-kind-${r.kind==='video'?'video':'audio'}" title="${r.kind==='video'?ui('Video','Vídeo'):ui('Audio','Audio')}">${activityIcon(r.kind)}</span>${esc(r.title)}</h2><p>${esc(works.find(w=>w.id===r.workId)?.title || r.workTitle || ui('No piece assigned','Sin pieza asignada'))}</p><p class="muted">${r.kind==='video'?ui('Video','Vídeo'):ui('Audio','Audio')} · ${esc(new Date(r.createdAt).toLocaleString(getAppLanguage()))} · ${time(r.durationMs)} · ${(r.bytes/1048576).toFixed(1)} MB${r.draft?' · '+ui('Pending save','Pendiente de guardar'):r.cloud&&!r.cloud.pending?' · Google Drive':' · '+ui('Local copy','Copia local')}</p><div class="cp-actions"><button data-action="media-play" data-id="${esc(r.id)}">${r.draft?ui('Review and save','Revisar y guardar'):ui('Play','Reproducir')}</button>${r.draft?'':shareButton(`data-action="media-share" data-id="${esc(r.id)}"`)}${r.workId?`<button class="quiet" data-action="work-detail" data-id="${esc(r.workId)}">${ui('View piece','Ver obra')}</button>`:''}</div></article>`).join(''):`<div class="cp-card"><h2>${type||workId?ui('No recordings match these filters','No hay grabaciones con estos filtros'):records.length?(mode==='week'?ui('No recordings this week','Sin grabaciones esta semana'):ui('No recordings this month','Sin grabaciones este mes')):ui('No local recordings','Sin grabaciones locales')}</h2>${records.length?'':`<p>${ui('Use Record to capture freely or choose a repertoire piece.','Usa Grabar para una toma libre o elige una obra del repertorio.')}</p>`}</div>`}</div></div></div></section>`;
}
export function createMediaCapture({store, changed, report, getWork, getWorks = () => [], share = shareRecording}) {
  const panel = document.createElement('aside'); panel.id = 'cp-media-capture'; panel.hidden = true; panel.setAttribute('aria-label', ui('Recording','Grabación')); document.body.append(panel);
  let record = null, stream = null, recorder = null, chunks = [], url = '', timer = null, busy = false, stage = 'closed', startingAt = 0, bytes = 0, stopReason = '', minimized = false, returnFocus = null, requestId = 0, captureError = '', resumeRequest = null, editingTitle = false;
  let sharePending = false;
  let titleSuggestionActive = false, cameraControls = null, cameraBusy = false, cameraRotation = 0, cameraFormat = null, cameraSettingsOpen = false;
  let choosingOther = false, pieceSearch = '', cameras = [], selectedCamera = '', pausedAt = 0, pausedMs = 0;
  let studio = null, standalone = false, audioContext = null, audioSource = null, audioAnalyser = null, audioFeedback = null, encodedStream = null, frameVideo = null, frameCanvas = null, videoFrame = null, renderCameraFrame = null;
  const draftFor = (work,sessionId=null) => {titleSuggestionActive=true;return ({id:crypto.randomUUID(),workId:work?.id||'',workTitle:work?.title||'',title:work?.title||ui('Free recording','Grabación libre'),sessionId,createdAt:new Date().toISOString(),draft:true});};

  const elapsedTime = () => Math.max(0,Date.now()-startingAt-pausedMs-(pausedAt?Date.now()-pausedAt:0));
  const scoreButtons = () => [...document.querySelectorAll('.pdf-viewer [data-pdf=record],.pdf-viewer [data-xml=record]')];
  function syncScoreControls() {
    const state = stage==='recording'?'recording':stage==='stopping'?'stopping':stage==='closed'?'idle':'pending';
    for (const button of scoreButtons()) {
      if (button.dataset.captureState !== state) {
        button.dataset.captureState = state;
        button.dataset.recording = String(stage==='recording');
        button.disabled = state==='pending'||state==='stopping';
        button.setAttribute('aria-pressed',String(stage==='recording'));
        button.setAttribute('aria-label',stage==='recording'?ui('Stop recording and review','Detener grabación y revisar'):ui('Record practice','Grabar práctica'));
        button.innerHTML = scoreIcon(stage==='recording'?'finish':'record');
      }
      button.title = stage==='recording'?ui('Stop recording and review','Detener grabación y revisar')+' · '+time(elapsedTime()):ui('Record practice','Grabar práctica');
    }
  }
  // Score viewers use modal dialogs. Keep the controls in the active top layer.
  const placePanel = () => {
    const dialogs = [...document.querySelectorAll('dialog[open]')];
    const host = dialogs.at(-1) || document.body;
    if (panel.parentElement !== host) host.append(panel);
    panel.hidden = stage==='closed'||(stage==='recording'&&minimized&&scoreButtons().length>0);
    syncScoreControls();
  };
  new MutationObserver(placePanel).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
  const releaseURL = () => { if (url) URL.revokeObjectURL(url); url = ''; };
  const stopAudioFeedback = () => { audioFeedback?.dispose();audioFeedback=null;audioSource?.disconnect();audioSource=null;audioAnalyser=null;if(audioContext){void audioContext.close().catch(()=>{});audioContext=null;} };
  const releaseVideoFrames = () => {cancelAnimationFrame(videoFrame);videoFrame=null;renderCameraFrame=null;frameCanvas=null;if(frameVideo){frameVideo.pause();frameVideo.srcObject=null;frameVideo=null;}encodedStream?.getVideoTracks().forEach(t=>t.stop());encodedStream=null;};
  const releaseTracks = () => { stopAudioFeedback();releaseVideoFrames();cameraControls=null;stream?.getTracks().forEach(t=>t.stop());stream=null; };
  function startAudioFeedback() {
    if(!standalone||record.kind!=='audio')return;
    const element=panel.querySelector('.cp-media-audio-feedback'),meter=element.querySelector('[data-audio-level]'),label=element.querySelector('[data-audio-signal]');
    try {
      const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
      audioContext=new Context();audioSource=audioContext.createMediaStreamSource(stream);audioAnalyser=audioContext.createAnalyser();audioAnalyser.fftSize=1024;audioAnalyser.smoothingTimeConstant=.72;audioSource.connect(audioAnalyser);
      void audioContext.resume().catch(()=>{});
      audioFeedback=createAudioVisualizer({element,gestureTarget:panel,analyser:audioAnalyser,sampleRate:audioContext.sampleRate});
    }catch { stopAudioFeedback();meter.hidden=true;element.classList.add('is-unavailable');label.textContent=ui('Audio level unavailable','Nivel de audio no disponible'); }
  }

  function openStudio() {
    if(!studio){studio=document.createElement('dialog');studio.className='cp-media-studio';studio.setAttribute('aria-label',ui('Record','Grabar'));document.body.append(studio);studio.addEventListener('cancel',event=>{event.preventDefault();if(cameraSettingsOpen&&['preview','recording'].includes(stage)){setCameraSettings(false);return;}if(stage==='choose'&&choosingOther){choosingOther=false;draw();panel.querySelector('[data-media=other-pieces]')?.focus();}else if(stage==='choose'||stage==='preview'||(stage==='review'&&!record?.draft))close();});}
    studio.setAttribute('aria-label',ui('Record','Grabar'));if(!studio.open)studio.showModal();
  }
  function titleMarkup() {
    const label=editingTitle?ui('Save title','Guardar título'):ui('Edit title','Editar título');
    return `${editingTitle?`<input id="media-title" aria-label="${ui('Title','Título')}" maxlength="200" value="${esc(record.title)}" />`:`<span>${esc(record.title)}</span>`}<button type="button" class="quiet cp-media-title-action" data-media="${editingTitle?'save-title':'edit-title'}" aria-label="${label}" title="${label}">${scoreIcon(editingTitle?'done':'pen')}</button>`;
  }
  function updateTitle() {
    // Keep the player mounted so editing a title never restarts playback.
    panel.querySelector('.cp-media-title').innerHTML=titleMarkup();
    panel.querySelector(editingTitle?'#media-title':'[data-media=edit-title]')?.focus();
  }
  async function saveTitle() {
    if(busy||!editingTitle)return;
    const title=panel.querySelector('#media-title').value.trim().slice(0,200)||record.workTitle||ui('Free recording','Grabación libre');
    busy=true;panel.querySelectorAll('button,input').forEach(el=>el.disabled=true);
    panel.querySelector('[data-media-error]').textContent='';
    try { await store.put({...record,title});record.title=title;await changed();editingTitle=false; }
    catch { panel.querySelector('[data-media-error]').textContent=ui('Could not save. Free up storage and try again. Your take is still available here.','No se ha podido guardar. Libera espacio y vuelve a intentarlo. La toma sigue disponible aquí.'); }
    finally { busy=false;panel.querySelectorAll('button,input').forEach(el=>el.disabled=false);if(!editingTitle)updateTitle();else panel.querySelector('#media-title').focus(); }
  }
  async function shareSaved(id=record?.id) {
    if(sharePending||!id)return;
    if(stage!=='closed'&&(stage!=='review'||record?.id!==id||record.draft)){report(ui('Finish the current recording first.','Termina primero la grabación actual.'));return;}
    sharePending=true;const viewer=stage==='review';if(viewer)busy=true;
    if(viewer&&panel.querySelector('[data-media-error]'))panel.querySelector('[data-media-error]').textContent='';
    const buttons=[...document.querySelectorAll('[data-action=media-share],[data-media=share]')];
    buttons.forEach(button=>{button.disabled=true;button.setAttribute('aria-busy','true');});
    try {
      const saved=await store.get(id);
      if(!saved||saved.draft)throw Error('Saved recording unavailable');
      const result=await share(saved);
      if(result==='downloaded')report(ui('Recording downloaded.','Grabación descargada.'));
    }catch {
      const message=ui('Could not share. Your recording is still saved.','No se ha podido compartir. Tu grabación sigue guardada.');
      if(viewer&&panel.querySelector('[data-media-error]'))panel.querySelector('[data-media-error]').textContent=message;else report(message);
    }finally {
      sharePending=false;if(viewer)busy=false;
      buttons.forEach(button=>{if(button.isConnected){button.disabled=false;button.removeAttribute('aria-busy');}});
    }
  }
  function close() { if (busy || ['requesting','recording','stopping'].includes(stage)) return; releaseURL(); panel.hidden = true; panel.replaceChildren(); stage = 'closed'; record = null; editingTitle = false; releaseTracks();if(standalone){studio?.close();standalone=false;}syncScoreControls();if(returnFocus?.isConnected)returnFocus.focus();else document.querySelector('[data-action=record-media]')?.focus(); }
  const workChoice = w => `<button type="button" data-media="pick-work" data-media-work="${esc(w.id)}" aria-pressed="${w.id===record?.workId}" title="${esc(w.title+(w.composer?' / '+w.composer:''))}"><span class="cp-practice-piece-check" aria-hidden="true">&#10003;</span><b>${esc(w.title)}</b><small>${esc(w.composer)}</small></button>`;
  function otherResults() {
    const normalize=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return getWorks().filter(w=>normalize(w.title+' '+(w.composer||'')).includes(normalize(pieceSearch.trim()))).map(workChoice).join('')||`<p class="muted">${ui('No matching pieces in your repertoire.','No hay coincidencias en tu repertorio.')}</p>`;
  }
  const cameraIcon = kind => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${kind==='rotate'?'<path d="M20 8V3l-3 3a8 8 0 1 0 3 8"/><path d="M20 3h-5"/>':'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="8" cy="18" r="2" fill="currentColor"/>'}</svg>`;
  const portraitOutput = () => cameraFormat===null?matchMedia('(orientation: portrait)').matches:cameraFormat==='portrait';
  function videoCaptureMarkup(button) {
    const format=portraitOutput()?'9:16':'16:9',rotate=ui('Rotate image 90°','Girar imagen 90°'),settings=ui('Camera settings','Ajustes de cámara');
    return `<div class="cp-camera-stage"><div class="cp-camera-heading"><p class="${stage==='recording'?'cp-recording-status':''}" role="status">${stage==='recording'?`${pausedAt?ui('Paused','En pausa'):'● '+ui('Recording','Grabando')} <span data-media-clock>${time(elapsedTime())}</span>`:ui('Ready','Preparada')}</p><div class="cp-camera-toolbar">${stage==='preview'?`<button type="button" class="quiet" data-media="camera-format" aria-label="${ui('Switch video format','Cambiar formato de vídeo')} · ${format}" title="${ui('Switch video format','Cambiar formato de vídeo')}"><span data-camera-format>${format}</span></button>`:''}<button type="button" class="quiet" data-media="rotate-camera" aria-label="${rotate}" title="${rotate}">${cameraIcon('rotate')}</button><button type="button" class="quiet" data-media="camera-settings" aria-label="${settings}" title="${settings}" aria-expanded="${cameraSettingsOpen}" aria-controls="cp-camera-adjustments">${cameraIcon('settings')}</button></div></div>
      <div class="cp-camera-preview"><video class="cp-media-live" muted autoplay playsinline></video></div>
      <div id="cp-camera-adjustments" class="cp-camera-adjustments" ${cameraSettingsOpen?'':'hidden'}>${cameraControlsMarkup()}${stage==='preview'&&cameras.length>1?`<label>${ui('Camera','Cámara')}<select data-media-camera ${busy?'disabled':''}>${cameras.map((camera,index)=>`<option value="${esc(camera.deviceId)}" ${camera.deviceId===selectedCamera?'selected':''}>${esc(camera.label||ui('Camera','Cámara')+' '+(index+1))}</option>`).join('')}</select></label>`:''}</div>
      <div class="cp-actions cp-media-capture-actions">${stage==='preview'?`${button('start-video',ui('Start recording','Empezar a grabar'),'primary')}${button('close',ui('Cancel','Cancelar'),'quiet')}`:`${button('pause-video',pausedAt?ui('Resume recording','Reanudar grabación'):ui('Pause recording','Pausar grabación'))}${button('stop',minimized?ui('Stop','Detener'):ui('Stop and review','Detener y revisar'),'primary')}`}</div></div>`;
  }
  function setCameraSettings(open) {
    cameraSettingsOpen=open;panel.querySelector('#cp-camera-adjustments')?.toggleAttribute('hidden',!open);
    const button=panel.querySelector('[data-media=camera-settings]');button?.setAttribute('aria-expanded',String(open));if(!open)button?.focus();
  }
  function cameraControlsMarkup() {
    if(!cameraControls)return '';
    const c=cameraControls.state;
    return `<div class="cp-camera-controls" role="group" aria-label="${ui('Camera controls','Controles de cámara')}">
      <label>${c.hardwareZoom?ui('Zoom','Zoom'):ui('Digital zoom','Zoom digital')} <output data-zoom-value>${c.zoom.toFixed(1)}×</output><input type="range" data-camera-zoom min="${c.minZoom}" max="${c.maxZoom}" step="${c.zoomStep}" value="${c.zoom}" /></label>
      <label>${ui('Brightness','Brillo')} <output data-brightness-value>${c.brightness}%</output><input type="range" data-camera-brightness min="50" max="150" step="1" value="${c.brightness}" /></label>
      ${c.canLock?`<button type="button" class="quiet" data-media="exposure-lock" aria-pressed="${c.locked}">${c.locked?ui('Unlock exposure','Desbloquear exposición'):ui('Lock exposure','Fijar exposición')}</button>`:''}
      <details><summary>+ Info</summary><p>${ui('Brightness stays at your chosen value for this take.','El brillo mantiene el valor elegido durante esta toma.')} ${c.canLock?ui('Lock exposure to stop the camera adjusting to changes in light.','Fija la exposición para que la cámara deje de adaptarse a los cambios de luz.'):ui('This camera does not expose an exposure lock; automatic exposure may still change.','Esta cámara no ofrece bloqueo de exposición; la exposición automática puede seguir cambiando.')} ${!c.hardwareZoom?ui('Digital zoom crops the image and reduces detail.','El zoom digital recorta la imagen y reduce el detalle.'):''}</p></details>
      <p data-camera-error role="alert"></p></div>`;
  }
  async function updateCameraSetting(kind,value) {
    const controls=cameraControls,attempt=requestId;
    if(!controls||cameraBusy||!['preview','recording'].includes(stage))return;
    cameraBusy=true;
    const error=panel.querySelector('[data-camera-error]');if(error)error.textContent='';
    panel.querySelectorAll('[data-camera-zoom],[data-media=exposure-lock],[data-media-camera],[data-media=start-video]').forEach(el=>el.disabled=true);
    try {if(kind==='zoom')await controls.setZoom(value);else await controls.setLocked(value);}
    catch {if(attempt===requestId){const error=panel.querySelector('[data-camera-error]');if(error)error.textContent=ui('Could not apply this camera setting. Try again.','No se ha podido aplicar este ajuste de cámara. Vuelve a intentarlo.');}}
    finally {
      cameraBusy=false;
      if(attempt===requestId&&cameraControls===controls){
        const slider=panel.querySelector('[data-camera-zoom]'),output=panel.querySelector('[data-zoom-value]'),lock=panel.querySelector('[data-media=exposure-lock]');
        if(slider)slider.value=controls.state.zoom;if(output)output.textContent=controls.state.zoom.toFixed(1)+'×';
        if(lock){lock.setAttribute('aria-pressed',String(controls.state.locked));lock.textContent=controls.state.locked?ui('Unlock exposure','Desbloquear exposición'):ui('Lock exposure','Fijar exposición');}
        panel.querySelectorAll('[data-camera-zoom],[data-media=exposure-lock],[data-media-camera],[data-media=start-video]').forEach(el=>el.disabled=busy);
      }
    }
  }
  function draw() {
    studio?.classList.toggle('is-recording-audio',standalone&&stage==='recording'&&record?.kind==='audio');
    panel.hidden = false; panel.classList.toggle('is-video-stage',record?.kind==='video'&&['preview','recording'].includes(stage)); panel.classList.toggle('is-recording', stage==='recording');panel.classList.toggle('is-preview',stage==='preview'); panel.classList.toggle('is-minimized', minimized && stage==='recording');
    const pieceOptions=standalone&&stage==='choose'?getWorks().slice().sort((a,b)=>a.title.localeCompare(b.title,getAppLanguage())):[];
    const button = (id,label,css='') => `<button type="button" data-media="${id}" class="${css}" ${busy||(standalone&&stage==='choose'&&!record&&['audio','video'].includes(id))?'disabled':''}>${label}</button>`;
    panel.innerHTML = `<header ${standalone&&stage==='choose'?'hidden':''}><b>${esc(record?.workTitle||ui('Free recording','Grabación libre'))}</b>${stage==='recording'&&!standalone?button('minimize',minimized?ui('Expand','Ampliar'):ui('Minimize','Minimizar'),'quiet'):''}</header>${stage==='choose'?`${standalone?choosingOther?`<h2>${ui('Other pieces','Otras piezas')}</h2><label>${ui('Search your repertoire','Buscar en tu repertorio')}<input type="search" data-media-search value="${esc(pieceSearch)}" placeholder="${ui('Title or composer','Título o compositor')}" /></label><div class="cp-media-other-results" data-media-results>${otherResults()}</div><div class="cp-actions">${button('back-pieces',ui('Back','Volver'),'quiet')}</div>`:`<h2>${ui('Record','Grabar')}</h2><div class="cp-practice-piece-heading"><p>${ui('On your stand','En tu atril')}</p>${button('other-pieces',ui('Other pieces','Otras piezas'),'quiet cp-media-other-link')}</div><div class="cp-practice-stand cp-media-work-strip" data-media-picker role="group" aria-label="${ui('On your stand','En tu atril')}" tabindex="0">${workChoice({id:'',title:ui('Free recording','Grabación libre'),composer:ui('No piece assigned','Sin pieza asignada')})}${pieceOptions.filter(isOnStand).map(workChoice).join('')}</div><p class="cp-media-selected-piece" aria-live="polite">${esc(record?.workTitle||ui('No piece assigned','Sin pieza asignada'))}</p>`:`<p>${ui('Record your progress','Graba tus progresos')}</p>`}${!standalone||!choosingOther?`<p class="muted">${ui('Saved locally · up to 15 minutes or 250 MB per take.','Guardado local · hasta 15 minutos o 250 MB por toma.')}</p><div class="cp-actions cp-media-choose-actions">${button('audio',(standalone?activityIcon('audio'):'')+ui('Record audio','Grabar audio'),standalone?'cp-media-mode':'primary')}${button('video',(standalone?activityIcon('video'):'')+ui('Record video','Grabar vídeo'),standalone?'cp-media-mode':'')}${button('close',ui('Cancel','Cancelar'),'quiet')}</div>`:''}`:stage==='requesting'?`<p role="status">${ui('Waiting for microphone/camera permission…','Esperando permiso de micrófono/cámara…')}</p>${button('cancel-request',ui('Cancel','Cancelar'))}`:stage==='preview'?videoCaptureMarkup(button):stage==='recording'?record.kind==='video'?videoCaptureMarkup(button):`<p class="cp-recording-status" role="status">● ${ui('Recording','Grabando')} <span data-media-clock>${time(elapsedTime())}</span></p>${standalone?audioVisualizerMarkup():''}<div class="cp-actions cp-media-capture-actions">${button('stop',minimized?ui('Stop','Detener'):ui('Stop and review','Detener y revisar'),'primary')}</div>`:stage==='stopping'?`<p role="status">${ui('Preparing recording…','Preparando grabación…')}</p>`:`${stopReason?`<p role="status">${esc(stopReason)}</p>`:''}<${record.kind==='video'?'video':'audio'} controls playsinline src="${url}"></${record.kind==='video'?'video':'audio'}>${record.draft?`<label>${ui('Title','Título')}<input id="media-title" maxlength="200" ${busy?'disabled':''} value="${esc(record.title)}" /></label>`:`<div class="cp-media-title">${titleMarkup()}</div>`}<p data-media-error role="alert"></p><div class="cp-actions ${record.draft?'':'cp-media-viewer-actions'}">${record.draft?button('save',ui('Save','Guardar'),'primary'):shareButton('data-media="share"',busy)}${button('delete',record.draft?ui('Discard','Descartar'):ui('Delete','Eliminar'),record.draft?'danger quiet':'cp-media-delete')}${record.draft?'':button('close',ui('Close','Cerrar'),'quiet')}</div>`}`;
    if (captureError) { const error=document.createElement('p');error.setAttribute('role','alert');error.textContent=captureError;panel.append(error); }
    if (['preview','recording'].includes(stage) && stream && record.kind==='video') panel.querySelector('video').srcObject = encodedStream||stream;
    placePanel();
    if(standalone&&stage==='choose'){const row=panel.querySelector('[data-media-picker]'),selected=row?.querySelector('[aria-pressed=true]');if(selected){const bounds=row.getBoundingClientRect(),card=selected.getBoundingClientRect();if(card.left<bounds.left)row.scrollLeft-=bounds.left-card.left+3;else if(card.right>bounds.right)row.scrollLeft+=card.right-bounds.right+3;}}
  }
  async function review() {
    if (!recorder) return;
    clearInterval(timer); timer = null; releaseTracks();
    record.durationMs = elapsedTime();
    record.blob = new Blob(chunks,{type:recorder.mimeType || chunks.find(c=>c.type)?.type || (record.kind==='video'?'video/webm':'audio/webm')}); chunks = []; recorder = null;
    if (!record.blob.size) { stage='choose'; draw(); report(ui('No media was captured. Try again.','No se ha capturado contenido. Vuelve a intentarlo.')); return; }
    record.blob = await finalizeMediaDuration(record.blob, record.durationMs);
    releaseURL(); url = URL.createObjectURL(record.blob); stage='review'; busy=true; draw();
    try { await store.put(record); await changed(); }
    catch { stopReason=ui('Could not store this take. Free space and try Save again before closing.','No se ha podido almacenar esta toma. Libera espacio y pulsa Guardar antes de cerrar.'); }
    finally { busy=false; draw(); panel.querySelector('[data-media=save]')?.focus(); }
  }
  function stop(reason='') {
    if (stage!=='recording') return;
    stopReason=reason; stage='stopping'; clearInterval(timer); draw();
    try { if (recorder.state !== 'inactive') recorder.stop(); } catch { void review(); }
    releaseTracks();
  }
  async function prepareVideoFrames(attempt) {
    releaseVideoFrames();
    // Normalize the encoded frame rather than relying on camera sensor metadata.
    const source=document.createElement('video');source.muted=true;source.playsInline=true;source.srcObject=stream;frameVideo=source;
    await source.play();
    if(attempt!==requestId||!['preview','requesting'].includes(stage)){source.pause();source.srcObject=null;return;}
    const portrait=portraitOutput(),canvas=document.createElement('canvas');const size=Math.min(1920,Math.max(source.videoWidth,source.videoHeight))||1280;canvas.width=portrait?Math.round(size*9/16/2)*2:size;canvas.height=portrait?size:Math.round(size*9/16/2)*2;
    frameCanvas=canvas;
    const context=canvas.getContext('2d',{alpha:false});
    let caption=null,margin=0,bottomMargin=0;
    const createCaption=()=>{
      caption=document.createElement('canvas');margin=Math.round(Math.min(canvas.width,canvas.height)*.03);bottomMargin=Math.round(canvas.height*.1);const factor=Math.min(canvas.width,canvas.height)/720,fontSize=20*factor,padding=12*factor,lineHeight=27*factor;
      const text=caption.getContext('2d');text.font='500 '+fontSize+'px sans-serif';
      const date=new Intl.DateTimeFormat(getAppLanguage(),{dateStyle:'medium'}).format(new Date(record.createdAt)),maxText=canvas.width*.82-padding*2;
      let title=record.workTitle||'';
      if(text.measureText(title).width>maxText){let low=0,high=title.length;while(low<high){const mid=Math.ceil((low+high)/2);if(text.measureText(title.slice(0,mid)+'…').width<=maxText)low=mid;else high=mid-1;}title=title.slice(0,low)+'…';}
      const lines=[...(title?[title]:[]),date];caption.width=Math.ceil(Math.max(...lines.map(line=>text.measureText(line).width))+padding*2);caption.height=lineHeight*lines.length+padding*2;
      text.fillStyle='rgba(10,18,30,.9)';text.strokeStyle='rgba(255,255,255,.45)';text.lineWidth=1.5;text.beginPath();text.roundRect(1,1,caption.width-2,caption.height-2,9);text.fill();text.stroke();text.fillStyle='#fff';text.font='500 '+fontSize+'px sans-serif';text.textBaseline='top';lines.forEach((line,index)=>text.fillText(line,padding,padding+index*lineHeight));
    };
    let lastFrame=0;
    const paint=(timestamp,force=false)=>{
      if(frameVideo!==source||!source.videoWidth||!source.videoHeight||(!force&&timestamp-lastFrame<1000/30))return;
      if(stage==='preview'){
        const size=Math.min(1920,Math.max(source.videoWidth,source.videoHeight))||1280,portrait=portraitOutput();
        const w=portrait?Math.round(size*9/16/2)*2:size,h=portrait?size:Math.round(size*9/16/2)*2;
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const format=panel.querySelector('[data-camera-format]');if(format){format.textContent=portrait?'9:16':'16:9';format.closest('button').setAttribute('aria-label',ui('Switch video format','Cambiar formato de vídeo')+' · '+format.textContent);}
      }
      const controls=cameraControls?.state;
      context.filter='none';context.fillStyle='#000';context.fillRect(0,0,canvas.width,canvas.height);
      context.filter=`brightness(${(controls?.brightness??100)/100})`;
      const quarterTurn=cameraRotation%180!==0,localWidth=quarterTurn?canvas.height:canvas.width,localHeight=quarterTurn?canvas.width:canvas.height;
      context.save();context.translate(canvas.width/2,canvas.height/2);context.rotate(cameraRotation*Math.PI/180);context.translate(-localWidth/2,-localHeight/2);
      context.drawImage(source,...cameraFrameRect(source.videoWidth,source.videoHeight,localWidth,localHeight,controls&&!controls.hardwareZoom?controls.zoom:1));
      context.restore();
      context.filter='none';
      if(caption||stage==='recording'){if(!caption)createCaption();context.drawImage(caption,margin,canvas.height-bottomMargin-caption.height);}
      lastFrame=timestamp;
    };
    const tick=timestamp=>{if(frameVideo!==source)return;paint(timestamp);videoFrame=requestAnimationFrame(tick);};
    renderCameraFrame=(withCaption=false)=>{if(withCaption&&!caption)createCaption();paint(performance.now(),true);};
    renderCameraFrame();videoFrame=requestAnimationFrame(tick);
    encodedStream=new MediaStream([...canvas.captureStream(30).getVideoTracks(),...stream.getAudioTracks()]);
  }
  async function beginRecording(kind) {
    if(busy||cameraBusy)return;
    busy=true;
    try {
      record.createdAt=new Date().toISOString();
      if(kind==='video'){
        cameraFormat=portraitOutput()?'portrait':'landscape';
        renderCameraFrame?.(true);
        // A fresh track excludes buffered preview frames from the saved take.
        encodedStream?.getVideoTracks().forEach(track=>track.stop());
        encodedStream=new MediaStream([...frameCanvas.captureStream(30).getVideoTracks(),...stream.getAudioTracks()]);
      }
      const types=kind==='video'?['video/webm;codecs=vp8,opus','video/mp4','video/webm']:['audio/webm;codecs=opus','audio/mp4','audio/webm'];
      const mimeType=types.find(type=>MediaRecorder.isTypeSupported(type));
      recorder=new MediaRecorder(encodedStream||stream,{...(mimeType?{mimeType}:{}),...(kind==='video'?{videoBitsPerSecond:8000000}:{audioBitsPerSecond:128000})});
      record.kind=kind; chunks=[]; bytes=0; stopReason=''; minimized=!standalone&&scoreButtons().length>0;
      recorder.ondataavailable = event => { if(event.data.size){chunks.push(event.data);bytes+=event.data.size;if(bytes>=250*1048576)stop(ui('Size limit reached. Review and save your take.','Límite de tamaño alcanzado. Revisa y guarda la toma.'));} };
      recorder.onstop = () => void review();
      recorder.onerror = () => stop(ui('Recording was interrupted. Review the captured part.','Se ha interrumpido la grabación. Revisa la parte capturada.'));
      stream.getTracks().forEach(t=>t.addEventListener('ended',()=>stop(ui('The microphone or camera disconnected.','Se ha desconectado el micrófono o la cámara.')),{once:true}));
      if(kind!=='video')record.createdAt=new Date().toISOString();pausedAt=0;pausedMs=0;stage='recording';renderCameraFrame?.();recorder.start(1000);startingAt=Date.now();draw();
      if(panel.hidden)scoreButtons()[0]?.focus();
      timer=setInterval(()=>{const elapsed=elapsedTime();syncScoreControls();const clock=panel.querySelector('[data-media-clock]');if(clock)clock.textContent=time(elapsed);if(elapsed>=15*60000)stop(ui('Time limit reached. Review and save your take.','Límite de tiempo alcanzado. Revisa y guarda la toma.'));},500);
    }catch { releaseTracks();recorder=null;stage='choose';captureError=ui('Could not start recording. Check the microphone/camera and try again.','No se ha podido empezar a grabar. Comprueba el micrófono/cámara y vuelve a intentarlo.');draw(); }
    finally{busy=false;if(stage==='choose'||stage==='recording')draw();if(stage==='recording')startAudioFeedback();}
  }
  async function switchCamera(deviceId) {
    if(stage!=='preview'||busy||!cameras.some(camera=>camera.deviceId===deviceId))return;
    if(cameraBusy)return;
    const attempt=++requestId;busy=true;captureError='';releaseVideoFrames();cameraControls=null;draw();
    stream.getVideoTracks().forEach(track=>{stream.removeTrack(track);track.stop();});
    try {
      const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{deviceId:{exact:deviceId},...cameraVideoConstraints()}});
      if(attempt!==requestId||stage!=='preview'){acquired.getTracks().forEach(track=>track.stop());return;}
      acquired.getVideoTracks().forEach(track=>stream.addTrack(track));selectedCamera=deviceId;
      cameraControls=await createCameraControls(stream.getVideoTracks()[0]);
      if(attempt!==requestId||stage!=='preview')return;
      await prepareVideoFrames(attempt);
    }catch {captureError=ui('Could not open this camera. Choose another camera or try again.','No se ha podido abrir esta cámara. Elige otra o vuelve a intentarlo.');}
    finally{busy=false;if(stage==='preview'||stage==='choose')draw();}
  }
  async function start(kind) {
    if (stage!=='choose'||!record) return;
    if(!(standalone&&record.workId==='')&&!getWork(record.workId)){captureError=ui('Choose a repertoire work.','Elige una obra del repertorio.');draw();return;}
    captureError='';cameraRotation=0;cameraFormat=null;cameraSettingsOpen=false;
    if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) { captureError=ui('Recording is not supported on this device.','Este dispositivo no admite la grabación.');draw(); return; }
    const attempt = ++requestId;
    stage='requesting'; draw();
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}, video:kind==='video'?{facingMode:'user',...cameraVideoConstraints()}:false});
      if (attempt!==requestId || stage!=='requesting') { acquired.getTracks().forEach(t=>t.stop()); return; }
      stream=acquired;
      // A native permission prompt can temporarily hide the WebView. Keep its request alive,
      // but wait for the app to be visible before starting the microphone/camera.
      if(document.hidden)await new Promise(resolve=>{resumeRequest=resolve;});
      resumeRequest=null;
      if(attempt!==requestId||stage!=='requesting')return;
      record.kind=kind;
      if(kind==='video'){
        try{cameras=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');}catch{cameras=[];}
        if(attempt!==requestId||stage!=='requesting'){releaseTracks();return;}
        selectedCamera=stream.getVideoTracks()[0]?.getSettings?.().deviceId||cameras[0]?.deviceId||'';
        cameraControls=await createCameraControls(stream.getVideoTracks()[0]);
        if(attempt!==requestId||stage!=='requesting')return;
        await prepareVideoFrames(attempt);
        if(attempt!==requestId||stage!=='requesting')return;
        stage='preview';draw();
      }else beginRecording(kind);
    } catch(error) { if(attempt!==requestId)return;releaseTracks();recorder=null;stage='choose';captureError=error.name==='NotAllowedError'?ui('Microphone/camera permission was denied. Allow access in device settings and try again.','Se ha denegado el permiso de micrófono/cámara. Permite el acceso en los ajustes y vuelve a intentarlo.'):ui('Could not start recording. Check the microphone/camera and try again.','No se ha podido empezar a grabar. Comprueba el micrófono/cámara y vuelve a intentarlo.');draw(); }
  }

  panel.addEventListener('focusin',event=>{if(event.target.id==='media-title'&&record?.draft&&!editingTitle&&titleSuggestionActive){event.target.value='';titleSuggestionActive=false;}});
  panel.addEventListener('change',event=>{if(event.target.matches('[data-media-camera]'))void switchCamera(event.target.value);if(event.target.matches('[data-camera-zoom]'))void updateCameraSetting('zoom',event.target.value);});
  panel.addEventListener('input',event=>{if(event.target.matches('[data-camera-brightness]')){cameraControls?.setBrightness(event.target.value);panel.querySelector('[data-brightness-value]').textContent=event.target.value+'%';}if(event.target.matches('[data-camera-zoom]')){panel.querySelector('[data-zoom-value]').textContent=Number(event.target.value).toFixed(1)+'×';if(cameraControls&&!cameraControls.state.hardwareZoom)void cameraControls.setZoom(event.target.value);}if(event.target.matches('[data-media-search]')){pieceSearch=event.target.value;panel.querySelector('[data-media-results]').innerHTML=otherResults();}});
  panel.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key==='Escape'&&cameraSettingsOpen&&['preview','recording'].includes(stage)){event.preventDefault();setCameraSettings(false);return;}
    if(event.key==='Enter'&&editingTitle&&event.target.id==='media-title'){event.preventDefault();void saveTitle();return;}
    if(event.key==='Escape'&&editingTitle){event.preventDefault();if(!busy){editingTitle=false;updateTitle();}return;}
    if(event.key==='Escape'){event.preventDefault();if(stage==='choose'&&choosingOther){choosingOther=false;draw();panel.querySelector('[data-media=other-pieces]')?.focus();}else if(stage==='choose'||stage==='preview'||(stage==='review'&&!record.draft))close();}
  });
  panel.addEventListener('click',async event=>{
    const action=event.target.closest('[data-media]')?.dataset.media; if(!action||busy)return;
    if(action==='share')return shareSaved();
    if(action==='other-pieces'&&stage==='choose'){choosingOther=true;pieceSearch='';draw();panel.querySelector('[data-media-search]')?.focus();return;}
    if(action==='back-pieces'&&stage==='choose'){choosingOther=false;draw();panel.querySelector('[data-media=other-pieces]')?.focus();return;}
    if(action==='pick-work'&&stage==='choose'){const workId=event.target.closest('[data-media-work]').dataset.mediaWork,work=getWork(workId);if(!work&&workId!=='')return;const scroll=panel.querySelector('[data-media-picker]')?.scrollLeft||0;record=draftFor(work);captureError='';choosingOther=false;draw();panel.querySelector('[data-media-picker]').scrollLeft=scroll;panel.querySelector('[data-media-work][aria-pressed=true],[data-media=other-pieces]')?.focus({preventScroll:true});return;}
    if(action==='camera-settings'){setCameraSettings(!cameraSettingsOpen);return;}
    if(action==='rotate-camera'){cameraRotation=(cameraRotation+90)%360;renderCameraFrame?.();return;}
    if(action==='camera-format'&&stage==='preview'){cameraFormat=portraitOutput()?'landscape':'portrait';renderCameraFrame?.();panel.querySelector('[data-camera-format]').textContent=portraitOutput()?'9:16':'16:9';return;}
    if(action==='exposure-lock'){void updateCameraSetting('lock',!cameraControls?.state.locked);return;}
    if(action==='start-video'&&stage==='preview'&&stream?.getVideoTracks().some(track=>track.readyState==='live'))return beginRecording('video');
    if(action==='pause-video'&&stage==='recording'&&record.kind==='video'){if(pausedAt){recorder.resume();pausedMs+=Date.now()-pausedAt;pausedAt=0;}else{recorder.pause();pausedAt=Date.now();}draw();return;}
    if(action==='audio'||action==='video')return start(action);
    if(action==='cancel-request'){requestId++;releaseTracks();resumeRequest?.();stage='choose';draw();return;}
    if(action==='stop')return stop();
    if(action==='minimize'){minimized=!minimized;draw();return;}
    if(action==='close')return close();
    if(action==='edit-title'){editingTitle=true;updateTitle();return;}
    if(action==='save-title')return saveTitle();
    if(action==='save') {
      record.title=panel.querySelector('#media-title').value.trim().slice(0,200)||record.workTitle||ui('Free recording','Grabación libre');busy=true;
      panel.querySelectorAll('button').forEach(b=>b.disabled=true);
      try { await store.put({...record,draft:false});record.draft=false;await changed();void navigator.storage?.persist?.().catch(()=>{});busy=false;draw();panel.querySelector('[data-media=share]')?.focus();report(ui('Recording saved on this device.','Grabación guardada en este dispositivo.')); }
      catch { busy=false;draw();panel.querySelector('[data-media-error]').textContent=ui('Could not save. Free up storage and try again. Your take is still available here.','No se ha podido guardar. Libera espacio y vuelve a intentarlo. La toma sigue disponible aquí.'); }
    }
    if(action==='delete') {
      if(!record.draft && !window.confirm(ui('Delete this local recording?','¿Eliminar esta grabación local?')))return;
      busy=true;
      try{await store.remove(record.id);await changed();busy=false;close();}catch{busy=false;report(ui('Could not delete the recording.','No se ha podido eliminar la grabación.'));}
    }
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)resumeRequest?.();if(document.hidden&&stage==='preview'){requestId++;releaseTracks();stage='choose';draw();}if(document.hidden)stop(ui('Recording stopped when the app went into the background.','La grabación se ha detenido al pasar la app a segundo plano.'));});
  window.addEventListener('pagehide',()=>{if(stage==='preview'){requestId++;releaseTracks();stage='choose';draw();}if(stage==='requesting'){requestId++;releaseTracks();resumeRequest?.();stage='choose';draw();}stop();});
  window.addEventListener('beforeunload',event=>{if(stage!=='closed'&&stage!=='choose'){event.preventDefault();event.returnValue='';}});
  return {
    get busy(){return stage!=='closed'||sharePending;},
    get recording(){return stage==='recording';},
    get requesting(){return stage==='requesting';},
    stop,
    share:shareSaved,
    open(workId,sessionId=null){if(stage!=='closed'||sharePending){panel.hidden=false;report(ui('Finish the current recording first.','Termina primero la grabación actual.'));return;}const work=getWork(workId);if(!work)return;returnFocus=document.activeElement;standalone=false;record=draftFor(work,sessionId);stage='choose';stopReason='';captureError='';draw();panel.querySelector('button')?.focus();},
    openStandalone(workId=''){if(stage!=='closed'||sharePending){report(ui('Finish the current recording first.','Termina primero la grabación actual.'));return;}returnFocus=document.querySelector('.cp-header-controls [data-action=record-media]')||document.activeElement;standalone=true;choosingOther=false;pieceSearch='';const work=getWork(workId);record=draftFor(work);stage='choose';stopReason='';captureError='';minimized=false;openStudio();draw();panel.querySelector('[data-media-work][aria-pressed=true],[data-media-picker]')?.focus();},
    async play(id){if(stage!=='closed'||sharePending){report(ui('Finish the current recording first.','Termina primero la grabación actual.'));return;}returnFocus=document.activeElement;stage='loading';busy=true;try{const found=await store.get(id);if(!found){await changed();report(ui('This recording is not available on this device.','Esta grabación no está disponible en este dispositivo.'));stage='closed';return;}record=found;titleSuggestionActive=!!record.draft&&(record.title===record.workTitle||record.title===ui('Free recording','Grabación libre'));editingTitle=false;record.blob=await finalizeMediaDuration(record.blob,record.durationMs);releaseURL();url=URL.createObjectURL(record.blob);stage='review';stopReason='';busy=false;draw();panel.querySelector(record.draft?'[data-media=save]':'[data-media=edit-title]')?.focus();}catch(error){stage='closed';report(ui('Could not open the recording.','No se ha podido abrir la grabación.'));}finally{busy=false;}},
  };
}
