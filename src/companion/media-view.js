import {ui, getAppLanguage} from './locale.js';
import {isOnStand} from './repertoire.js';
import {scoreIcon} from './score-controls.js';
import {localDate,weekOf,addDays} from './model.js';
import {activityIcon,recordingDate,filterRecordings,shiftMonth,monthCalendarMarkup} from './activity-calendar.js';
import {finalizeMediaDuration} from './media-duration.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const time = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')}`;
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
  return `<section class="cp-media"><h1>${ui('Multimedia','Multimedia')}</h1><div class="cp-media-browser"><div class="cp-media-calendar-panel">${calendar}<div class="cp-media-filters" role="group" aria-label="${ui('Recording filters','Filtros de grabaciones')}">${['audio','video'].map(kind=>typeButton(kind,`<span class="cp-media-filter-check" aria-hidden="true">${type===kind?'✓':''}</span>${activityIcon(kind)}${kindLabel(kind)}`,`cp-media-filter cp-media-filter-${kind}`)).join('')}<button type="button" class="cp-media-filter cp-media-piece-filter" data-action="media-filter-work" aria-pressed="${!!workId}" aria-haspopup="dialog"><span class="cp-media-filter-check" aria-hidden="true">${workId?'✓':''}</span>${activityIcon('piece')}<span>${selectedPiece?esc(selectedPiece.title):ui('Piece','Obra')}</span></button></div></div><div><p class="muted" role="status">${ui('Recordings','Grabaciones')}: ${rows.length}</p><div class="cp-media-list">${rows.length ? rows.map(r=>`<article class="cp-card"><h2><span class="cp-media-kind cp-media-kind-${r.kind==='video'?'video':'audio'}" title="${r.kind==='video'?ui('Video','Vídeo'):ui('Audio','Audio')}">${activityIcon(r.kind)}</span>${esc(r.title)}</h2><p>${esc(works.find(w=>w.id===r.workId)?.title || r.workTitle || ui('No piece assigned','Sin pieza asignada'))}</p><p class="muted">${r.kind==='video'?ui('Video','Vídeo'):ui('Audio','Audio')} · ${esc(new Date(r.createdAt).toLocaleString(getAppLanguage()))} · ${time(r.durationMs)} · ${(r.bytes/1048576).toFixed(1)} MB${r.draft?' · '+ui('Pending save','Pendiente de guardar'):r.cloud&&!r.cloud.pending?' · Google Drive':' · '+ui('Local copy','Copia local')}</p><div class="cp-actions"><button data-action="media-play" data-id="${esc(r.id)}">${r.draft?ui('Review and save','Revisar y guardar'):ui('Play','Reproducir')}</button>${r.workId?`<button class="quiet" data-action="work-detail" data-id="${esc(r.workId)}">${ui('View piece','Ver obra')}</button>`:''}</div></article>`).join(''):`<div class="cp-card"><h2>${type||workId?ui('No recordings match these filters','No hay grabaciones con estos filtros'):records.length?(mode==='week'?ui('No recordings this week','Sin grabaciones esta semana'):ui('No recordings this month','Sin grabaciones este mes')):ui('No local recordings','Sin grabaciones locales')}</h2>${records.length?'':`<p>${ui('Use Record to capture freely or choose a repertoire piece.','Usa Grabar para una toma libre o elige una obra del repertorio.')}</p>`}</div>`}</div></div></div></section>`;
}
export function createMediaCapture({store, changed, report, getWork, getWorks = () => []}) {
  const panel = document.createElement('aside'); panel.id = 'cp-media-capture'; panel.hidden = true; panel.setAttribute('aria-label', ui('Recording','Grabación')); document.body.append(panel);
  let record = null, stream = null, recorder = null, chunks = [], url = '', timer = null, busy = false, stage = 'closed', startingAt = 0, bytes = 0, stopReason = '', minimized = false, returnFocus = null, requestId = 0, captureError = '', resumeRequest = null, editingTitle = false;
  let titleSuggestionActive = false;
  let choosingOther = false, pieceSearch = '', cameras = [], selectedCamera = '', pausedAt = 0, pausedMs = 0;
  let studio = null, standalone = false, audioContext = null, audioSource = null, audioAnalyser = null, audioTimer = null, encodedStream = null, frameVideo = null, videoFrame = null;
  const draftFor = (work,sessionId=null) => {titleSuggestionActive=true;return ({id:crypto.randomUUID(),workId:work?.id||'',workTitle:work?.title||'',title:work?.title||ui('Free recording','Grabación libre'),sessionId,createdAt:new Date().toISOString(),draft:true});};
  const videoSize = () => matchMedia('(orientation: portrait)').matches?{width:{ideal:720},height:{ideal:1280},aspectRatio:{ideal:9/16}}:{width:{ideal:1280},height:{ideal:720},aspectRatio:{ideal:16/9}};
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
  const stopAudioFeedback = () => { clearInterval(audioTimer);audioTimer=null;audioSource?.disconnect();audioSource=null;audioAnalyser=null;if(audioContext){void audioContext.close().catch(()=>{});audioContext=null;} };
  const releaseTracks = () => { stopAudioFeedback();cancelAnimationFrame(videoFrame);videoFrame=null;if(frameVideo){frameVideo.pause();frameVideo.srcObject=null;frameVideo=null;}encodedStream?.getTracks().forEach(t=>t.stop());encodedStream=null;stream?.getTracks().forEach(t=>t.stop());stream=null; };
  function startAudioFeedback() {
    if(!standalone||record.kind!=='audio')return;
    const meter=panel.querySelector('[data-audio-level]'),label=panel.querySelector('[data-audio-signal]');
    try {
      const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
      audioContext=new Context();audioSource=audioContext.createMediaStreamSource(stream);audioAnalyser=audioContext.createAnalyser();audioAnalyser.fftSize=512;audioSource.connect(audioAnalyser);
      void audioContext.resume().catch(()=>{});
      const samples=new Float32Array(audioAnalyser.fftSize);let lastSound=0;
      audioTimer=setInterval(()=>{
        audioAnalyser.getFloatTimeDomainData(samples);
        const rms=Math.sqrt(samples.reduce((sum,n)=>sum+n*n,0)/samples.length);
        meter.value=Math.max(0,Math.min(100,(20*Math.log10(Math.max(rms,.001))+60)/60*100));
        if(rms>.008)lastSound=Date.now();
        const text=Date.now()-lastSound<650?ui('Sound detected','Sonido detectado'):ui('Listening…','Escuchando…');
        if(label.textContent!==text)label.textContent=text;
      },100);
    }catch { stopAudioFeedback();meter.hidden=true;label.textContent=ui('Audio level unavailable','Nivel de audio no disponible'); }
  }
  function openStudio() {
    if(!studio){studio=document.createElement('dialog');studio.className='cp-media-studio';studio.setAttribute('aria-label',ui('Record','Grabar'));document.body.append(studio);studio.addEventListener('cancel',event=>{event.preventDefault();if(stage==='choose'&&choosingOther){choosingOther=false;draw();panel.querySelector('[data-media=other-pieces]')?.focus();}else if(stage==='choose'||stage==='preview'||(stage==='review'&&!record?.draft))close();});}
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
  function close() { if (busy || ['requesting','recording','stopping'].includes(stage)) return; releaseURL(); panel.hidden = true; panel.replaceChildren(); stage = 'closed'; record = null; editingTitle = false; releaseTracks();if(standalone){studio?.close();standalone=false;}syncScoreControls();if(returnFocus?.isConnected)returnFocus.focus();else document.querySelector('[data-action=record-media]')?.focus(); }
  const workChoice = w => `<button type="button" data-media="pick-work" data-media-work="${esc(w.id)}" aria-pressed="${w.id===record?.workId}" title="${esc(w.title+(w.composer?' / '+w.composer:''))}"><span class="cp-practice-piece-check" aria-hidden="true">&#10003;</span><b>${esc(w.title)}</b><small>${esc(w.composer)}</small></button>`;
  function otherResults() {
    const normalize=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    return getWorks().filter(w=>normalize(w.title+' '+(w.composer||'')).includes(normalize(pieceSearch.trim()))).map(workChoice).join('')||`<p class="muted">${ui('No matching pieces in your repertoire.','No hay coincidencias en tu repertorio.')}</p>`;
  }
  function draw() {
    panel.hidden = false; panel.classList.toggle('is-recording', stage==='recording');panel.classList.toggle('is-preview',stage==='preview'); panel.classList.toggle('is-minimized', minimized && stage==='recording');
    const pieceOptions=standalone&&stage==='choose'?getWorks().slice().sort((a,b)=>a.title.localeCompare(b.title,getAppLanguage())):[];
    const button = (id,label,css='') => `<button type="button" data-media="${id}" class="${css}" ${busy||(standalone&&stage==='choose'&&!record&&['audio','video'].includes(id))?'disabled':''}>${label}</button>`;
    panel.innerHTML = `<header ${standalone&&stage==='choose'?'hidden':''}><b>${esc(record?.workTitle||ui('Free recording','Grabación libre'))}</b>${stage==='recording'&&!standalone?button('minimize',minimized?ui('Expand','Ampliar'):ui('Minimize','Minimizar'),'quiet'):''}</header>${stage==='choose'?`${standalone?choosingOther?`<h2>${ui('Other pieces','Otras piezas')}</h2><label>${ui('Search your repertoire','Buscar en tu repertorio')}<input type="search" data-media-search value="${esc(pieceSearch)}" placeholder="${ui('Title or composer','Título o compositor')}" /></label><div class="cp-media-other-results" data-media-results>${otherResults()}</div><div class="cp-actions">${button('back-pieces',ui('Back','Volver'),'quiet')}</div>`:`<h2>${ui('Record','Grabar')}</h2><div class="cp-practice-piece-heading"><p>${ui('On your stand','En tu atril')}</p>${button('other-pieces',ui('Other pieces','Otras piezas'),'quiet cp-media-other-link')}</div><div class="cp-practice-stand cp-media-work-strip" data-media-picker role="group" aria-label="${ui('On your stand','En tu atril')}" tabindex="0">${workChoice({id:'',title:ui('Free recording','Grabación libre'),composer:ui('No piece assigned','Sin pieza asignada')})}${pieceOptions.filter(isOnStand).map(workChoice).join('')}</div><p class="cp-media-selected-piece" aria-live="polite">${esc(record?.workTitle||ui('No piece assigned','Sin pieza asignada'))}</p>`:`<p>${ui('Record your progress','Graba tus progresos')}</p>`}${!standalone||!choosingOther?`<p class="muted">${ui('Saved locally · up to 15 minutes or 250 MB per take.','Guardado local · hasta 15 minutos o 250 MB por toma.')}</p><div class="cp-actions cp-media-choose-actions">${button('audio',(standalone?activityIcon('audio'):'')+ui('Record audio','Grabar audio'),standalone?'cp-media-mode':'primary')}${button('video',(standalone?activityIcon('video'):'')+ui('Record video','Grabar vídeo'),standalone?'cp-media-mode':'')}${button('close',ui('Cancel','Cancelar'),'quiet')}</div>`:''}`:stage==='requesting'?`<p role="status">${ui('Waiting for microphone/camera permission…','Esperando permiso de micrófono/cámara…')}</p>${button('cancel-request',ui('Cancel','Cancelar'))}`:stage==='preview'?`<p role="status">${ui('Camera ready · not recording','Cámara preparada · sin grabar')}</p><video class="cp-media-live" muted autoplay playsinline></video>${cameras.length>1?`<label>${ui('Camera','Cámara')}<select data-media-camera ${busy?'disabled':''}>${cameras.map((camera,index)=>`<option value="${esc(camera.deviceId)}" ${camera.deviceId===selectedCamera?'selected':''}>${esc(camera.label||ui('Camera','Cámara')+' '+(index+1))}</option>`).join('')}</select></label>`:''}<div class="cp-actions cp-media-capture-actions">${button('start-video',ui('Start recording','Empezar a grabar'),'primary')}${button('close',ui('Cancel','Cancelar'),'quiet')}</div>`:stage==='recording'?`<p class="cp-recording-status" role="status">${pausedAt?ui('Paused','En pausa'):'● '+ui('Recording','Grabando')} <span data-media-clock>${time(elapsedTime())}</span></p>${record.kind==='video'?'<video class="cp-media-live" muted autoplay playsinline></video>':standalone?`<div class="cp-media-audio-feedback">${activityIcon('audio')}<meter data-audio-level min="0" max="100" value="0" aria-label="${ui('Microphone level','Nivel del micrófono')}"></meter><p data-audio-signal role="status">${ui('Listening…','Escuchando…')}</p></div>`:''}<div class="cp-actions cp-media-capture-actions">${record.kind==='video'?button('pause-video',pausedAt?ui('Resume recording','Reanudar grabación'):ui('Pause recording','Pausar grabación')):''}${button('stop',minimized?ui('Stop','Detener'):ui('Stop and review','Detener y revisar'),'primary')}</div>`:stage==='stopping'?`<p role="status">${ui('Preparing recording…','Preparando grabación…')}</p>`:`${stopReason?`<p role="status">${esc(stopReason)}</p>`:''}<${record.kind==='video'?'video':'audio'} controls playsinline src="${url}"></${record.kind==='video'?'video':'audio'}>${record.draft?`<label>${ui('Title','Título')}<input id="media-title" maxlength="200" ${busy?'disabled':''} value="${esc(record.title)}" /></label>`:`<div class="cp-media-title">${titleMarkup()}</div>`}<p data-media-error role="alert"></p><div class="cp-actions ${record.draft?'':'cp-media-viewer-actions'}">${record.draft?button('save',ui('Save','Guardar'),'primary'):''}${button('delete',record.draft?ui('Discard','Descartar'):ui('Delete','Eliminar'),record.draft?'danger quiet':'cp-media-delete')}${record.draft?'':button('close',ui('Close','Cerrar'),'quiet')}</div>`}`;
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
  async function beginRecording(kind) {
    if(busy)return;
    const attempt=requestId;busy=true;
    try {
      if(kind==='video'){
        // Normalize the encoded frame rather than relying on camera sensor metadata.
        const source=document.createElement('video');source.muted=true;source.playsInline=true;source.srcObject=stream;frameVideo=source;
        await source.play();
        if(attempt!==requestId||stage!=='preview'){source.pause();source.srcObject=null;return;}
        const portrait=matchMedia('(orientation: portrait)').matches,canvas=document.createElement('canvas');canvas.width=portrait?720:1280;canvas.height=portrait?1280:720;
        const context=canvas.getContext('2d',{alpha:false});record.createdAt=new Date().toISOString();
        const caption=document.createElement('canvas'),margin=Math.round(Math.min(canvas.width,canvas.height)*.03),bottomMargin=Math.round(canvas.height*.1),fontSize=20,padding=12,lineHeight=27;
        const text=caption.getContext('2d');text.font='500 '+fontSize+'px sans-serif';
        const date=new Intl.DateTimeFormat(getAppLanguage(),{dateStyle:'medium'}).format(new Date(record.createdAt)),maxText=canvas.width*.82-padding*2;
        let title=record.workTitle||'';
        if(text.measureText(title).width>maxText){let low=0,high=title.length;while(low<high){const mid=Math.ceil((low+high)/2);if(text.measureText(title.slice(0,mid)+'…').width<=maxText)low=mid;else high=mid-1;}title=title.slice(0,low)+'…';}
        const lines=[...(title?[title]:[]),date];caption.width=Math.ceil(Math.max(...lines.map(line=>text.measureText(line).width))+padding*2);caption.height=lineHeight*lines.length+padding*2;
        text.fillStyle='rgba(10,18,30,.9)';text.strokeStyle='rgba(255,255,255,.45)';text.lineWidth=1.5;text.beginPath();text.roundRect(1,1,caption.width-2,caption.height-2,9);text.fill();text.stroke();text.fillStyle='#fff';text.font='500 '+fontSize+'px sans-serif';text.textBaseline='top';lines.forEach((line,index)=>text.fillText(line,padding,padding+index*lineHeight));
        let lastFrame=0;
        const paint=timestamp=>{if(frameVideo!==source)return;if(source.videoWidth&&source.videoHeight&&timestamp-lastFrame>=1000/30){const scale=Math.max(canvas.width/source.videoWidth,canvas.height/source.videoHeight),width=source.videoWidth*scale,height=source.videoHeight*scale;context.drawImage(source,(canvas.width-width)/2,(canvas.height-height)/2,width,height);context.drawImage(caption,margin,canvas.height-bottomMargin-caption.height);lastFrame=timestamp;}videoFrame=requestAnimationFrame(paint);};
        paint(performance.now());encodedStream=new MediaStream([...canvas.captureStream(30).getVideoTracks(),...stream.getAudioTracks()]);
      }

      const types=kind==='video'?['video/webm;codecs=vp8,opus','video/mp4','video/webm']:['audio/webm;codecs=opus','audio/mp4','audio/webm'];
      const mimeType=types.find(type=>MediaRecorder.isTypeSupported(type));
      recorder=new MediaRecorder(encodedStream||stream,{...(mimeType?{mimeType}:{}),...(kind==='video'?{videoBitsPerSecond:2000000}:{audioBitsPerSecond:128000})});
      record.kind=kind; chunks=[]; bytes=0; stopReason=''; minimized=!standalone&&scoreButtons().length>0;
      recorder.ondataavailable = event => { if(event.data.size){chunks.push(event.data);bytes+=event.data.size;if(bytes>=250*1048576)stop(ui('Size limit reached. Review and save your take.','Límite de tamaño alcanzado. Revisa y guarda la toma.'));} };
      recorder.onstop = () => void review();
      recorder.onerror = () => stop(ui('Recording was interrupted. Review the captured part.','Se ha interrumpido la grabación. Revisa la parte capturada.'));
      stream.getTracks().forEach(t=>t.addEventListener('ended',()=>stop(ui('The microphone or camera disconnected.','Se ha desconectado el micrófono o la cámara.')),{once:true}));
      if(kind!=='video')record.createdAt=new Date().toISOString();pausedAt=0;pausedMs=0;recorder.start(1000); startingAt=Date.now(); stage='recording'; draw();
      if(panel.hidden)scoreButtons()[0]?.focus();
      timer=setInterval(()=>{const elapsed=elapsedTime();syncScoreControls();const clock=panel.querySelector('[data-media-clock]');if(clock)clock.textContent=time(elapsed);if(elapsed>=15*60000)stop(ui('Time limit reached. Review and save your take.','Límite de tiempo alcanzado. Revisa y guarda la toma.'));},500);
    }catch { releaseTracks();recorder=null;stage='choose';captureError=ui('Could not start recording. Check the microphone/camera and try again.','No se ha podido empezar a grabar. Comprueba el micrófono/cámara y vuelve a intentarlo.');draw(); }
    finally{busy=false;if(stage==='choose'||stage==='recording')draw();if(stage==='recording')startAudioFeedback();}
  }
  async function switchCamera(deviceId) {
    if(stage!=='preview'||busy||!cameras.some(camera=>camera.deviceId===deviceId))return;
    const attempt=++requestId;busy=true;captureError='';draw();
    stream.getVideoTracks().forEach(track=>{stream.removeTrack(track);track.stop();});
    try {
      const acquired=await navigator.mediaDevices.getUserMedia({audio:false,video:{deviceId:{exact:deviceId},...videoSize()}});
      if(attempt!==requestId||stage!=='preview'){acquired.getTracks().forEach(track=>track.stop());return;}
      acquired.getVideoTracks().forEach(track=>stream.addTrack(track));selectedCamera=deviceId;
    }catch {captureError=ui('Could not open this camera. Choose another camera or try again.','No se ha podido abrir esta cámara. Elige otra o vuelve a intentarlo.');}
    finally{busy=false;if(stage==='preview'||stage==='choose')draw();}
  }
  async function start(kind) {
    if (stage!=='choose'||!record) return;
    if(!(standalone&&record.workId==='')&&!getWork(record.workId)){captureError=ui('Choose a repertoire work.','Elige una obra del repertorio.');draw();return;}
    captureError='';
    if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) { captureError=ui('Recording is not supported on this device.','Este dispositivo no admite la grabación.');draw(); return; }
    const attempt = ++requestId;
    stage='requesting'; draw();
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}, video:kind==='video'?{facingMode:'user',...videoSize()}:false});
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
        selectedCamera=stream.getVideoTracks()[0]?.getSettings?.().deviceId||cameras[0]?.deviceId||'';stage='preview';draw();
      }else beginRecording(kind);
    } catch(error) { if(attempt!==requestId)return;releaseTracks();recorder=null;stage='choose';captureError=error.name==='NotAllowedError'?ui('Microphone/camera permission was denied. Allow access in device settings and try again.','Se ha denegado el permiso de micrófono/cámara. Permite el acceso en los ajustes y vuelve a intentarlo.'):ui('Could not start recording. Check the microphone/camera and try again.','No se ha podido empezar a grabar. Comprueba el micrófono/cámara y vuelve a intentarlo.');draw(); }
  }
  matchMedia('(orientation: portrait)').addEventListener('change',()=>{if(stage==='preview')void stream?.getVideoTracks()[0]?.applyConstraints?.(videoSize()).catch(()=>{});});
  panel.addEventListener('focusin',event=>{if(event.target.id==='media-title'&&record?.draft&&!editingTitle&&titleSuggestionActive){event.target.value='';titleSuggestionActive=false;}});
  panel.addEventListener('change',event=>{if(event.target.matches('[data-media-camera]'))void switchCamera(event.target.value);});
  panel.addEventListener('input',event=>{if(event.target.matches('[data-media-search]')){pieceSearch=event.target.value;panel.querySelector('[data-media-results]').innerHTML=otherResults();}});
  panel.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(event.key==='Enter'&&editingTitle&&event.target.id==='media-title'){event.preventDefault();void saveTitle();return;}
    if(event.key==='Escape'&&editingTitle){event.preventDefault();if(!busy){editingTitle=false;updateTitle();}return;}
    if(event.key==='Escape'){event.preventDefault();if(stage==='choose'&&choosingOther){choosingOther=false;draw();panel.querySelector('[data-media=other-pieces]')?.focus();}else if(stage==='choose'||stage==='preview'||(stage==='review'&&!record.draft))close();}
  });
  panel.addEventListener('click',async event=>{
    const action=event.target.closest('[data-media]')?.dataset.media; if(!action||busy)return;
    if(action==='other-pieces'&&stage==='choose'){choosingOther=true;pieceSearch='';draw();panel.querySelector('[data-media-search]')?.focus();return;}
    if(action==='back-pieces'&&stage==='choose'){choosingOther=false;draw();panel.querySelector('[data-media=other-pieces]')?.focus();return;}
    if(action==='pick-work'&&stage==='choose'){const workId=event.target.closest('[data-media-work]').dataset.mediaWork,work=getWork(workId);if(!work&&workId!=='')return;const scroll=panel.querySelector('[data-media-picker]')?.scrollLeft||0;record=draftFor(work);captureError='';choosingOther=false;draw();panel.querySelector('[data-media-picker]').scrollLeft=scroll;panel.querySelector('[data-media-work][aria-pressed=true],[data-media=other-pieces]')?.focus({preventScroll:true});return;}
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
      try { await store.put({...record,draft:false});record.draft=false;await changed();void navigator.storage?.persist?.().catch(()=>{});busy=false;close();report(ui('Recording saved on this device.','Grabación guardada en este dispositivo.')); }
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
    get busy(){return stage!=='closed';},
    get recording(){return stage==='recording';},
    get requesting(){return stage==='requesting';},
    stop,
    open(workId,sessionId=null){if(stage!=='closed'){panel.hidden=false;report(ui('Finish the current recording first.','Termina primero la grabación actual.'));return;}const work=getWork(workId);if(!work)return;returnFocus=document.activeElement;standalone=false;record=draftFor(work,sessionId);stage='choose';stopReason='';captureError='';draw();panel.querySelector('button')?.focus();},
    openStandalone(workId=''){if(stage!=='closed'){report(ui('Finish the current recording first.','Termina primero la grabación actual.'));return;}returnFocus=document.querySelector('.cp-header-controls [data-action=record-media]')||document.activeElement;standalone=true;choosingOther=false;pieceSearch='';const work=getWork(workId);record=draftFor(work);stage='choose';stopReason='';captureError='';minimized=false;openStudio();draw();panel.querySelector('[data-media-work][aria-pressed=true],[data-media-picker]')?.focus();},
    async play(id){if(stage!=='closed'){report(ui('Finish the current recording first.','Termina primero la grabación actual.'));return;}returnFocus=document.activeElement;stage='loading';busy=true;try{const found=await store.get(id);if(!found){await changed();report(ui('This recording is not available on this device.','Esta grabación no está disponible en este dispositivo.'));stage='closed';return;}record=found;titleSuggestionActive=!!record.draft&&(record.title===record.workTitle||record.title===ui('Free recording','Grabación libre'));editingTitle=false;record.blob=await finalizeMediaDuration(record.blob,record.durationMs);releaseURL();url=URL.createObjectURL(record.blob);stage='review';stopReason='';busy=false;draw();panel.querySelector(record.draft?'[data-media=save]':'[data-media=edit-title]')?.focus();}catch(error){stage='closed';report(ui('Could not open the recording.','No se ha podido abrir la grabación.'));}finally{busy=false;}},
  };
}
