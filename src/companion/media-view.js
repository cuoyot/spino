import {ui, getAppLanguage} from './locale.js';
import {scoreIcon} from './score-controls.js';
import {localDate,weekOf,addDays} from './model.js';
import {activityIcon,recordingDate,filterRecordings,shiftMonth,monthCalendarMarkup} from './activity-calendar.js';
import {finalizeMediaDuration} from './media-duration.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')}`;
export function mediaMarkup(records, works, {month = localDate(), mode = 'week'} = {}) {
  const from=mode==='week'?weekOf(month):month.slice(0,7)+'-01',to=mode==='week'?addDays(from,6):addDays(shiftMonth(month,1),-1);
  const rows = filterRecordings(records,{from,to});
  const calendarRecords=records;
  const byDate=new Map();for(const r of calendarRecords){const date=recordingDate(r);if(date)byDate.set(date,[...(byDate.get(date)||[]),r]);}
  const dateLabel=d=>new Intl.DateTimeFormat(getAppLanguage(),{dateStyle:'full'}).format(new Date(d+'T12:00:00'));
  const calendar=monthCalendarMarkup(month,{prefix:'media',mode,toggleAction:'media-toggle-month',day:(date,inMonth)=>{
    const takes=inMonth?(byDate.get(date)||[]):[],counts=['audio','video'].map(kind=>({kind,count:takes.filter(r=>r.kind===kind).length}));
    return `<div role="group" class="cp-activity-day ${inMonth?'':'is-outside'} ${takes.length?'has-recordings':''} ${counts.filter(c=>c.count).map(c=>'has-'+c.kind).join(' ')} ${takes.length&&date===localDate()?'is-today':''}" data-date="${date}" aria-label="${esc(dateLabel(date))}: ${takes.length} ${ui('recordings','grabaciones')}${counts.filter(c=>c.count).map(c=>`: ${c.count} ${c.kind==='audio'?ui('Audio','Audio'):ui('Video','Vídeo')}`).join(',')}"><span>${Number(date.slice(-2))}</span><span class="cp-media-day-icons" aria-hidden="true">${counts.filter(c=>c.count).map(c=>`<span class="cp-media-day-kind cp-media-day-${c.kind}">${activityIcon(c.kind)}<small>${c.count>99?'99+':c.count}</small></span>`).join('')}</span></div>`;
  }});
  return `<section class="cp-media"><h1>${ui('Multimedia','Multimedia')}</h1><div class="cp-media-browser"><div class="cp-media-calendar-panel">${calendar}<p class="muted cp-media-legend"><span>${activityIcon('audio')}${ui('Audio','Audio')}</span><span>${activityIcon('video')}${ui('Video','Vídeo')}</span></p></div><div><p class="muted" role="status">${ui('Recordings','Grabaciones')}: ${rows.length}</p><div class="cp-media-list">${rows.length ? rows.map(r=>`<article class="cp-card"><h2><span class="cp-media-kind cp-media-kind-${r.kind==='video'?'video':'audio'}" title="${r.kind==='video'?ui('Video','Vídeo'):ui('Audio','Audio')}">${activityIcon(r.kind)}</span>${esc(r.title)}</h2><p>${esc(works.find(w=>w.id===r.workId)?.title || r.workTitle)}</p><p class="muted">${r.kind==='video'?ui('Video','Vídeo'):ui('Audio','Audio')} · ${esc(new Date(r.createdAt).toLocaleString(getAppLanguage()))} · ${time(r.durationMs)} · ${(r.bytes/1048576).toFixed(1)} MB${r.draft?' · '+ui('Pending save','Pendiente de guardar'):r.cloud&&!r.cloud.pending?' · Google Drive':' · '+ui('Local copy','Copia local')}</p><div class="cp-actions"><button data-action="media-play" data-id="${esc(r.id)}">${r.draft?ui('Review and save','Revisar y guardar'):ui('Play','Reproducir')}</button><button class="quiet" data-action="work-detail" data-id="${esc(r.workId)}">${ui('View piece','Ver obra')}</button></div></article>`).join(''):`<div class="cp-card"><h2>${records.length?(mode==='week'?ui('No recordings this week','Sin grabaciones esta semana'):ui('No recordings this month','Sin grabaciones este mes')):ui('No local recordings','Sin grabaciones locales')}</h2>${records.length?'':`<p>${ui('Start recording from a repertoire piece or its practice session.','Empieza a grabar desde una obra del repertorio o su sesión de práctica.')}</p>`}</div>`}</div></div></div></section>`;
}
export function createMediaCapture({store, changed, report, getWork}) {
  const panel = document.createElement('aside'); panel.id = 'cp-media-capture'; panel.hidden = true; panel.setAttribute('aria-label', ui('Recording','Grabación')); document.body.append(panel);
  let record = null, stream = null, recorder = null, chunks = [], url = '', timer = null, busy = false, stage = 'closed', startingAt = 0, bytes = 0, stopReason = '', minimized = false, returnFocus = null, requestId = 0, captureError = '', resumeRequest = null, editingTitle = false;
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
      button.title = stage==='recording'?ui('Stop recording and review','Detener grabación y revisar')+' · '+time(Date.now()-startingAt):ui('Record practice','Grabar práctica');
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
  const releaseTracks = () => { stream?.getTracks().forEach(t=>t.stop()); stream = null; };
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
    const title=panel.querySelector('#media-title').value.trim().slice(0,200)||record.workTitle;
    busy=true;panel.querySelectorAll('button,input').forEach(el=>el.disabled=true);
    panel.querySelector('[data-media-error]').textContent='';
    try { await store.put({...record,title});record.title=title;await changed();editingTitle=false; }
    catch { panel.querySelector('[data-media-error]').textContent=ui('Could not save. Free up storage and try again. Your take is still available here.','No se ha podido guardar. Libera espacio y vuelve a intentarlo. La toma sigue disponible aquí.'); }
    finally { busy=false;panel.querySelectorAll('button,input').forEach(el=>el.disabled=false);if(!editingTitle)updateTitle();else panel.querySelector('#media-title').focus(); }
  }
  function close() { if (busy || ['requesting','recording','stopping'].includes(stage)) return; releaseURL(); panel.hidden = true; panel.replaceChildren(); stage = 'closed'; record = null; editingTitle = false; syncScoreControls(); returnFocus?.isConnected && returnFocus.focus(); }
  function draw() {
    panel.hidden = false; panel.classList.toggle('is-recording', stage==='recording'); panel.classList.toggle('is-minimized', minimized && stage==='recording');
    const button = (id,label,css='') => `<button type="button" data-media="${id}" class="${css}" ${busy?'disabled':''}>${label}</button>`;
    panel.innerHTML = `<header><b>${esc(record?.workTitle)}</b>${stage==='recording'?button('minimize',minimized?ui('Expand','Ampliar'):ui('Minimize','Minimizar'),'quiet'):''}</header>${stage==='choose'?`<p>${ui('Record your progress','Graba tus progresos')}</p><p class="muted">${ui('Saved locally · up to 15 minutes or 250 MB per take.','Guardado local · hasta 15 minutos o 250 MB por toma.')}</p><div class="cp-actions cp-media-choose-actions">${button('audio',ui('Record audio','Grabar audio'),'primary')}${button('video',ui('Record video','Grabar vídeo'))}${button('close',ui('Cancel','Cancelar'),'quiet')}</div>`:stage==='requesting'?`<p role="status">${ui('Waiting for microphone/camera permission…','Esperando permiso de micrófono/cámara…')}</p>${button('cancel-request',ui('Cancel','Cancelar'))}`:stage==='recording'?`<p class="cp-recording-status" role="status">● ${ui('Recording','Grabando')} <span data-media-clock>0:00</span></p>${record.kind==='video'?'<video class="cp-media-live" muted autoplay playsinline></video>':''}<div class="cp-actions">${button('stop',minimized?ui('Stop','Detener'):ui('Stop and review','Detener y revisar'),'primary')}</div>`:stage==='stopping'?`<p role="status">${ui('Preparing recording…','Preparando grabación…')}</p>`:`${stopReason?`<p role="status">${esc(stopReason)}</p>`:''}<${record.kind==='video'?'video':'audio'} controls playsinline src="${url}"></${record.kind==='video'?'video':'audio'}>${record.draft?`<label>${ui('Title','Título')}<input id="media-title" maxlength="200" ${busy?'disabled':''} value="${esc(record.title)}" /></label>`:`<div class="cp-media-title">${titleMarkup()}</div>`}<p class="muted">${ui('Plays offline on this device. Google Drive copies are managed in Backup & sync. JSON exports do not include recordings.','Se reproduce sin conexión en este dispositivo. Gestiona las copias de Google Drive en Copia y sincronización. Las exportaciones JSON no incluyen grabaciones.')}</p><p data-media-error role="alert"></p><div class="cp-actions ${record.draft?'':'cp-media-viewer-actions'}">${record.draft?button('save',ui('Save','Guardar'),'primary'):''}${button('delete',record.draft?ui('Discard','Descartar'):ui('Delete','Eliminar'),record.draft?'danger quiet':'cp-media-delete')}${record.draft?'':button('close',ui('Close','Cerrar'),'quiet')}</div>`}`;
    if (captureError) { const error=document.createElement('p');error.setAttribute('role','alert');error.textContent=captureError;panel.append(error); }
    if (stage==='recording' && stream && record.kind==='video') panel.querySelector('video').srcObject = stream;
    placePanel();
  }
  async function review() {
    if (!recorder) return;
    clearInterval(timer); timer = null; releaseTracks();
    record.durationMs = Math.max(0,Date.now()-startingAt);
    record.blob = new Blob(chunks,{type:recorder.mimeType || chunks.find(c=>c.type)?.type || (record.kind==='video'?'video/webm':'audio/webm')}); chunks = []; recorder = null;
    if (!record.blob.size) { stage='choose'; draw(); report(ui('No media was captured. Try again.','No se ha capturado contenido. Vuelve a intentarlo.')); return; }
    record.blob = await finalizeMediaDuration(record.blob, record.durationMs);
    releaseURL(); url = URL.createObjectURL(record.blob); stage='review'; busy=true; draw();
    try { await store.put(record); await changed(); }
    catch { stopReason=ui('Could not store this take. Free space and try Save again before closing.','No se ha podido almacenar esta toma. Libera espacio y pulsa Guardar antes de cerrar.'); }
    finally { busy=false; draw(); panel.querySelector('input')?.focus(); }
  }
  function stop(reason='') {
    if (stage!=='recording') return;
    stopReason=reason; stage='stopping'; clearInterval(timer); draw();
    try { if (recorder.state !== 'inactive') recorder.stop(); } catch { void review(); }
    releaseTracks();
  }
  async function start(kind) {
    if (stage!=='choose') return;
    captureError='';
    if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) { captureError=ui('Recording is not supported on this device.','Este dispositivo no admite la grabación.');draw(); return; }
    const attempt = ++requestId;
    stage='requesting'; draw();
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}, video:kind==='video'?{facingMode:'user',width:{ideal:1280},height:{ideal:720}}:false});
      if (attempt!==requestId || stage!=='requesting') { acquired.getTracks().forEach(t=>t.stop()); return; }
      stream=acquired;
      // A native permission prompt can temporarily hide the WebView. Keep its request alive,
      // but wait for the app to be visible before starting the microphone/camera.
      if(document.hidden)await new Promise(resolve=>{resumeRequest=resolve;});
      resumeRequest=null;
      if(attempt!==requestId||stage!=='requesting')return;
      const types=kind==='video'?['video/webm;codecs=vp8,opus','video/mp4','video/webm']:['audio/webm;codecs=opus','audio/mp4','audio/webm'];
      const mimeType=types.find(type=>MediaRecorder.isTypeSupported(type));
      recorder=new MediaRecorder(stream,{...(mimeType?{mimeType}:{}),...(kind==='video'?{videoBitsPerSecond:2000000}:{audioBitsPerSecond:128000})});
      record.kind=kind; chunks=[]; bytes=0; stopReason=''; minimized=scoreButtons().length>0;
      recorder.ondataavailable = event => { if(event.data.size){chunks.push(event.data);bytes+=event.data.size;if(bytes>=250*1048576)stop(ui('Size limit reached. Review and save your take.','Límite de tamaño alcanzado. Revisa y guarda la toma.'));} };
      recorder.onstop = () => void review();
      recorder.onerror = () => stop(ui('Recording was interrupted. Review the captured part.','Se ha interrumpido la grabación. Revisa la parte capturada.'));
      stream.getTracks().forEach(t=>t.addEventListener('ended',()=>stop(ui('The microphone or camera disconnected.','Se ha desconectado el micrófono o la cámara.')),{once:true}));
      recorder.start(1000); startingAt=Date.now(); stage='recording'; draw();
      if(panel.hidden)scoreButtons()[0]?.focus();
      timer=setInterval(()=>{const elapsed=Date.now()-startingAt;syncScoreControls();const clock=panel.querySelector('[data-media-clock]');if(clock)clock.textContent=time(elapsed);if(elapsed>=15*60000)stop(ui('Time limit reached. Review and save your take.','Límite de tiempo alcanzado. Revisa y guarda la toma.'));},500);
    } catch(error) { if(attempt!==requestId)return;releaseTracks();recorder=null;stage='choose';captureError=error.name==='NotAllowedError'?ui('Microphone/camera permission was denied. Allow access in device settings and try again.','Se ha denegado el permiso de micrófono/cámara. Permite el acceso en los ajustes y vuelve a intentarlo.'):ui('Could not start recording. Check the microphone/camera and try again.','No se ha podido empezar a grabar. Comprueba el micrófono/cámara y vuelve a intentarlo.');draw(); }
  }
  panel.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key==='Enter'&&editingTitle&&event.target.id==='media-title'){event.preventDefault();void saveTitle();return;}
    if(event.key==='Escape'&&editingTitle){event.preventDefault();if(!busy){editingTitle=false;updateTitle();}return;}
    if(event.key==='Escape'){event.preventDefault();if(stage==='choose'||(stage==='review'&&!record.draft))close();}
  });
  panel.addEventListener('click',async event=>{
    const action=event.target.closest('[data-media]')?.dataset.media; if(!action||busy)return;
    if(action==='audio'||action==='video')return start(action);
    if(action==='cancel-request'){requestId++;releaseTracks();resumeRequest?.();stage='choose';draw();return;}
    if(action==='stop')return stop();
    if(action==='minimize'){minimized=!minimized;draw();return;}
    if(action==='close')return close();
    if(action==='edit-title'){editingTitle=true;updateTitle();return;}
    if(action==='save-title')return saveTitle();
    if(action==='save') {
      record.title=panel.querySelector('#media-title').value.trim().slice(0,200)||record.workTitle;busy=true;
      panel.querySelectorAll('button').forEach(b=>b.disabled=true);
      try { await store.put({...record,draft:false});record.draft=false;await changed();void navigator.storage?.persist?.().catch(()=>{});busy=false;close();report(ui('Recording saved on this device.','Grabación guardada en este dispositivo.')); }
      catch { busy=false;draw();panel.querySelector('[data-media-error]').textContent=ui('Could not save. Free up storage and try again. Your take is still available here.','No se ha podido guardar. Libera espacio y vuelve a intentarlo. La toma sigue disponible aquí.'); }
    }
    if(action==='delete') {
      if(!record.draft && !window.confirm(ui('Delete this local recording?','¿Eliminar esta grabación local?')))return;
      busy=true;
      try{await store.remove(record.id);await changed();busy=false;close();}catch{busy=false;report(ui('Could not delete the recording.','No se ha podido eliminar la grabación.'));}
    }
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)resumeRequest?.();if(document.hidden)stop(ui('Recording stopped when the app went into the background.','La grabación se ha detenido al pasar la app a segundo plano.'));});
  window.addEventListener('pagehide',()=>{if(stage==='requesting'){requestId++;releaseTracks();resumeRequest?.();stage='choose';draw();}stop();});
  window.addEventListener('beforeunload',event=>{if(stage!=='closed'&&stage!=='choose'){event.preventDefault();event.returnValue='';}});
  return {
    get busy(){return stage!=='closed';},
    get recording(){return stage==='recording';},
    get requesting(){return stage==='requesting';},
    stop,
    open(workId,sessionId=null){if(stage!=='closed'){panel.hidden=false;report(ui('Finish the current recording first.','Termina primero la grabación actual.'));return;}const work=getWork(workId);if(!work)return;returnFocus=document.activeElement;record={id:crypto.randomUUID(),workId,workTitle:work.title,title:work.title,sessionId,createdAt:new Date().toISOString(),draft:true};stage='choose';stopReason='';captureError='';draw();panel.querySelector('button')?.focus();},
    async play(id){if(stage!=='closed'){report(ui('Finish the current recording first.','Termina primero la grabación actual.'));return;}returnFocus=document.activeElement;stage='loading';busy=true;try{const found=await store.get(id);if(!found){await changed();report(ui('This recording is not available on this device.','Esta grabación no está disponible en este dispositivo.'));stage='closed';return;}record=found;editingTitle=false;record.blob=await finalizeMediaDuration(record.blob,record.durationMs);releaseURL();url=URL.createObjectURL(record.blob);stage='review';stopReason='';busy=false;draw();panel.querySelector('[data-media=edit-title],input')?.focus();}catch(error){stage='closed';report(ui('Could not open the recording.','No se ha podido abrir la grabación.'));}finally{busy=false;}},
  };
}
