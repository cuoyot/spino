import {verifyDeviceReset,retainResetArchive,readResetArchive} from './device-reset.js';
import {createDriveStorage} from './drive-storage.js';
import {createStorageUI} from './storage-ui.js';
import {createCompleteBackup,inspectCompleteBackup} from './complete-backup.js';
import {downloadArchive} from './drive-archive.js';
import {shareNativeRecording} from './media-share.js';
import {Capacitor as StorageCapacitor,registerPlugin as storagePlugin} from '@capacitor/core';
import {APP_VERSION} from './app-version.js';
import {backupExportName} from './backup-export-name.js';
import {driveRenameMarkup,driveRecoveryCopy} from './drive-recovery-view.js';
import { syncIndicatorMarkup } from './sync-indicator.js';
import {beginLessonPractice, pauseLessonPractice, completeLesson, lessonResult, linkLessonRecordings} from './lessons.js';
import {eventTimeMarkup, bindEventTime} from './event-time.js';
import {bindEventDates} from './event-date.js';
import {bindEventWorks} from './event-works.js';
import {moreInfo,replaceHelpMarkup} from './more-info.js';
import {connectDriveMedia,pauseDriveMedia} from './drive-media-native.js';
import {createMediaSync} from './media-sync.js';
import {mediaSyncMarkup,driveLastCheck} from './drive-sync-view.js';
import {readMediaWifiOnly,saveMediaWifiOnly} from './media-network.js';
import { practiceTimeOverviewMarkup, practiceTimeDetailMarkup, TIME_RANGES } from './progress-time.js';
import './progress-time.css';
import {formatProgressDuration} from './progress-duration.js';
import { savedSessionsMarkup } from './saved-session-card.js';
import { bindScoreThumbnails } from './score-thumbnail.js';
import './saved-session-card.css';
import { workDetailMarkup } from './work-detail.js';
import './work-detail.css';
import { openMediaStore } from './media-store.js';
import { mediaMarkup, mediaPieceFilterMarkup, createMediaCapture } from './media-view.js';
import './media.css';
import './browse-surfaces.css';
import { repertoireProgressMarkup, techniqueProgressMarkup } from './progress-learning.js';
import { updateSavedPractice } from './saved-practice-edit.js';
import { EVENT_FREQUENCIES, validEventDate, findEvent, saveEventOccurrence, removeEventOccurrence } from './event-recurrence.js';
import { cloudApplyBlocker } from './cloud-policy.js';
import { inspectBackup, convertBackup, backupCounts } from './backup-format.js';
import { deviceLinkCopy, deviceLinkMarkup, deviceLinkQRMarkup, deviceLinkManualMarkup, deviceLinkConfirmMarkup, parseDeviceLink, encodeDeviceLink, startNotebookScanner } from './device-link.js';
import { bindMidiShortcuts } from './midi-shortcuts.js';
import { createWalkthrough } from './walkthrough.js';
import { rateApp, shareApp } from './app-actions.js';
import { applyTheme } from './theme.js';
import { ui, getAppLanguage, setAppLanguage, localizeMessage, APP_LANGUAGES } from './locale.js';
import { printActionButton, scoreIcon } from './score-controls.js';
import { DEFAULT_PRACTICE_MINUTES, practiceMinutes, resizePractice } from './practice-duration.js';
import { editSession, restoreCurrentRuntime, settleSuspendedBlocks } from './session-edit.js';
import { sessionMarkup, workPickerMarkup } from './session-view.js';
import { freePracticeMarkup, metronomeSettings } from './free-practice.js';
import { watchPracticeClock } from './practice-clock.js';
import { bindSessionDrag } from './session-drag.js';
import { routineBuilderMarkup } from './routine-builder.js';
import { quickPractice } from './quick-practice.js';
import { addQuickAnswer, emptyQuickScore, quickRecords, quickHudMarkup, quickResultMarkup } from './quick-score.js';
import './quick-game.css';
import { routineDraft, routineForPractice } from './routine-policy.js';
import { sessionBlockEditorMarkup, bindSessionBlockEditor, readSessionBlockEditor } from './session-block-editor.js';
import { midiIndicatorMarkup, setMidiContext } from '../midi-indicator.js';
import { practiceDefaults, RANGE_LEVELS, HANDS } from './practice-defaults.js';
import { parseTags, repertoireMarkup, setWorkTrashed, isOnStand, setWorkOnStand } from './repertoire.js';
import { createScreenAwake, practiceNeedsScreen } from './screen-awake.js';
import { practiceScreenAwake } from './platform.js';
import { CloudBackup, cloudAvailable, cloudPlatform } from './cloud-backup.js';
import { cloudBackupMarkup, cloudSetupMarkup, cloudManageMarkup, cloudConflictMarkup, cloudHelpMarkup } from './cloud-backup-view.js';
import { photoCropMarkup, loadPhoto, bindPhotoCrop } from './photo-crop.js';
import { progressHighlightsMarkup, streakDetailMarkup } from './progress-rhythm.js';
import { shiftMonth, recordingDate } from './activity-calendar.js';
import './activity-calendar.css';
import { aboutMarkup } from './about-view.js';
import { appearanceMarkup, profileNavigation, profileMarkup, profileHeading, practicePreferencesMarkup, identityMarkup, manualBackupMarkup, remindersMarkup, scoreFilesMarkup, fileSize } from './profile-view.js';
import { instrumentMarkup, createInstrumentController } from './instrument-view.js';
import { createNotebookCloud } from './cloud-sync.js';
import {createNotebookTransport,driveNotebookAvailable} from './notebook-transport.js';
import {driveCopy,driveNotebookPickerMarkup,driveConnectionProgressMarkup} from './drive-notebook-view.js';
import './app.css';
import './profile.css';
import './cloud-backup.css';
import './instrument-view.css';
import './dashboard.css';
import './session-view.css';
import './warmup-guide.css';
import { openStore } from './store.js';
import { CONTEXTS, ACTIVITIES, STAGES, stageLabel, eventTypeLabel, uid, copy, localDate, addDays, weekOf, daysUntil, block, beginSession, adjustPracticeTime, accrue, pause, finishBlock, saveSession, applyWorkParts, deleteSession, summary, validateBackup } from './model.js';
import { TARGETS, targetById } from './curriculum.js';
import { warmupExercises, warmupChoices, warmupBlockValues, warmupPreferences, warmupSetLabel } from './warmups.js';
import { warmupGuideMarkup, bindWarmupGuide } from './warmup-guide.js';
import { exportFile, importFile, downloadPDF, syncReminders, remindersAvailable, native } from './platform.js';
import { scoreImportMarkup, bindScoreImport } from './score-import.js';
import { CATALOG, catalogPresentation } from './catalog.js';
import { emptyLibrary, importLibrary, catalogueRecords, legacyMigrationReport } from './library.js';
import { libraryMarkup, libraryDetailMarkup } from './library-view.js';
import { createLibraryDownloads } from './library-pipeline.js';
import { createLibraryUI } from './library-ui.js';
import { downloadScore } from './score-transfer.js';
import { acquisitionCandidates, executionFor, manualPracticeState } from './library-state.js';
import { RENDERER_VERSION } from './analysis-versions.js';
import { createDownloads, catalogChanges } from './downloads.js';
import { downloadMarkup, updateDownloadProgress } from './download-view.js';
import { networkStatus } from './platform.js';
import { click, now as audioNow } from '../audio.js';
import { pendingSessionMarkup, todayMarkup, practiceMarkup, weekAgendaMarkup, agendaEntries, agendaCard, calendarSessionsMarkup } from './agenda.js';
import { plannerMarkup, bindPlanner, cancelSeries } from './planner.js';
import { bindCalendarDrag } from './calendar-drag.js';
import { icon } from './icons.js';
import { calendarMarkup, shiftCalendar, preparationMarkup, feedbackFields, readFeedback, FACES, MOODS } from './views.js';

const $ = s => document.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const minutes = ms => Math.round(ms / 60000);
const clock = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
const dayLabel = date => new Intl.DateTimeFormat(getAppLanguage(), { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(date + 'T12:00:00'));
const opts = (entries, selected) => entries.map(([value, label]) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
const targets = selected => opts(TARGETS.map(t => [t.id, t.label]), selected);
const btn = (action, text, id = '', css = '') => `<button type="button" data-action="${action}" data-id="${esc(id)}" class="${css}">${text}</button>`;


export async function bootCompanion(reader) {
  const root = $('#app-shell');
  setAppLanguage(document.documentElement.lang);
  const bootMessage = root.querySelector('.boot-message');
  if (bootMessage) bootMessage.textContent = ui('Opening your notebook…', 'Abriendo tu cuaderno…');
  let store, data;
  try { store = await openStore(localStorage.getItem('spino.recovered-notebook')||undefined); data = await store.load(); }
  catch (e) { root.innerHTML = `${ui("<div class=\"cp-page\"><h1>Could not open the notebook</h1><p>", "<div class=\"cp-page\"><h1>No se ha podido abrir el cuaderno</h1><p>")}${esc(localizeMessage(e.message))}${ui("</p><p>Your existing data is safe. Close and reopen the app.</p></div>", "</p><p>Los datos existentes se conservan. Cierra y vuelve a abrir la app.</p></div>")}`; return; }
  // Existing notebooks were displayed in Spanish before a language preference existed.
  data.preferences.language ||= 'es';
  setAppLanguage(data.preferences.language);
  reader.setLanguage?.(getAppLanguage());
  let view = 'home', selectedDate = localDate(), detailId = '', draft = null, preparePurpose = 'start';
  let materialSelection = null;
  let repertoireFilters = {}, repertoireIndex = 0;
  let libraryPane = 'repertoire';
  let libraryFormDraft = null;
  const libraryScroll = {repertoire:0,catalog:0,multimedia:0};
  const libraryRoute = route => ['piano','repertoire'].includes(route)?'repertoire':route==='catalog'?'catalog':route==='multimedia'?'multimedia':null;
  let tempoTaps = [];
  let saveError = '', toastTimer, readerMounted = false, readerBase = null, checkpointAt = 0, quiz = null, metro = null;
  let pendingDeviceLink = null;
  let filteredTarget = '', pendingRestore = null, reminderState = null, calendarMode = 'week';
  let scoreViewer = null, openingScore = false, importingScore = false;
  let sessionWriting = false, sessionDrag = null;
  let cloud = null, restoringBackup = false;
  let startingPractice = false;
  let profileFiles = null, fileSearch = '', fileLimit = 24;
  const cloudTransport = driveNotebookAvailable() ? createNotebookTransport() : CloudBackup;
  let connectionFeedback=false,driveConnecting = false, mediaSync = null, storageManager=null, storageUI=null, completeBackupBusy=false;
  const recoveredNotebook=localStorage.getItem('spino.recovered-notebook');
  function refreshSyncIndicator() {
    const slot = root.querySelector('[data-sync-indicator]');
    const markup = syncIndicatorMarkup(cloud?.state, mediaSync?.state);
    if (slot && slot.innerHTML !== markup) slot.innerHTML = markup;
  }
  const cloudOptions = () => ({ driveOnly:true,media:mediaSync?.state,mediaWifiOnly:readMediaWifiOnly(data.preferences.wifiOnly), available: cloudAvailable(), driveAvailable: driveNotebookAvailable(), transport: cloudTransport.transport==='drive'?'drive':'provider', linked:!!cloud?.state.name, platform: cloudPlatform(), lang: getAppLanguage() });
  const instrument = createInstrumentController({ changed: () => {
    const panel = document.querySelector('#instrument-panel');
    if (panel) panel.outerHTML = instrumentMarkup(instrument.state, {lang:getAppLanguage()});
  }});
  const setScreenAwake = createScreenAwake(practiceScreenAwake);
  function syncScreenAwake() {
    setScreenAwake(practiceNeedsScreen({active:data.active,view,readerVisible:root.hidden,scoreVisible:!!scoreViewer,hidden:document.hidden})).catch(error=>console.warn('Could not update practice screen policy.',error));
  }
  let mediaStore = null, mediaRecords = [], mediaCapture = null;
  const mediaCalendar = {month:localDate(),mode:'week',type:'',workId:'',date:'',limit:24};
  let streakMonth=localDate();
  function openStreak() { showDialog(ui('Keep your rhythm','Mantén tu ritmo'),streakDetailMarkup(data,streakMonth)); }
  try { mediaStore = await openMediaStore(recoveredNotebook?recoveredNotebook+'-media':undefined); mediaRecords = await mediaStore.index(); }
  catch (error) { console.warn('Could not open local media storage.',error); }
  function multimedia() { return mediaMarkup(mediaRecords,data.works,mediaCalendar); }
  async function refreshMedia() { mediaRecords = await mediaStore.index(); if(['multimedia','work','progress','event','session-detail','calendar'].includes(view))render(); }
  function recordWork(id) { if(!mediaCapture)throw Error(ui('Local recording storage is unavailable. Reopen the app and try again.','El almacenamiento local de grabaciones no está disponible. Abre de nuevo la app y vuelve a intentarlo.'));if(mediaCapture.recording){mediaCapture.stop();return;}mediaCapture.open(id,currentBlock()?.workId===id?data.active?.id:null); }
  if(mediaStore)mediaCapture=createMediaCapture({store:mediaStore,changed:refreshMedia,report:message=>toast(message),getWork:id=>data.works.find(w=>w.id===id&&!w.trashedAt),getWorks:()=>data.works.filter(w=>!w.trashedAt)});
  let library = await store.library(), libraryFilters = {}, libraryPage = 0, libraryReady = false, catalogueSearchTimer;
  for (const e of Object.values(library.executions)) {
    if (['queued', 'downloading'].includes(e.job?.status)) e.job.status = 'paused';
    if (e.analysis?.status === 'running') e.analysis.status = 'pending';
  }
  let dialogCleanup = null;
  const dialog = document.createElement('dialog'); dialog.id = 'cp-dialog'; document.body.append(dialog);
  dialog.addEventListener('close', () => {
    // A queued close event can arrive after the shared dialog has already been reopened.
    if (!dialog.open) { dialogCleanup?.(); dialogCleanup = null; }
  });
  const dialogBusy = () => dialog.getAttribute('aria-busy') === 'true' || Boolean(dialog.querySelector('form[aria-busy="true"]'));
  dialog.addEventListener('cancel', event => { if (dialogBusy()) event.preventDefault(); });
  const status = document.createElement('div'); status.id = 'cp-toast'; status.role = 'status'; status.hidden = true; document.body.append(status);
  const persist = async () => {
    try { await store.save(data); saveError = ''; }
    catch (e) { saveError = ui("Could not save. Free up space and export a backup before closing.", "No se ha podido guardar. Libera espacio y exporta una copia antes de cerrar."); toast(saveError); throw e; }
  };
  const toast = message => {
    const text = localizeMessage(message);
    clearTimeout(toastTimer);
    if (root.hidden && readerMounted) { status.hidden = true; reader.notify(text); return; }
    status.textContent = text; status.hidden = false;
    toastTimer = setTimeout(() => status.hidden = true, 6500);
  };
  const navigation = [];
  const routeSnapshot = () => ({ view, detailId, selectedDate, calendarMode, filteredTarget, libraryFilters: copy(libraryFilters), libraryPage, draft: copy(draft), preparePurpose, scroll: root.querySelector('.cp-page')?.scrollTop || 0 });
  const walkthrough=createWalkthrough({navigate:next=>{view=next;detailId='';render();root.querySelector('.cp-page')?.scrollTo(0,0);},restore:snapshot=>{if(snapshot){Object.assign(libraryFilters,snapshot.libraryFilters);view=snapshot.view;detailId=snapshot.detailId;selectedDate=snapshot.selectedDate;calendarMode=snapshot.calendarMode;libraryPage=snapshot.libraryPage;render();root.querySelector('.cp-page')?.scrollTo(0,snapshot.scroll);}}});
  const go = (next, id = '') => {
    const leavingLibrary = libraryRoute(view), enteringLibrary = libraryRoute(next);
    if(leavingLibrary) {
      libraryScroll[leavingLibrary] = root.querySelector('.cp-page')?.scrollTop || 0;
      if(leavingLibrary==='catalog' && $('#library-search')) libraryFormDraft=Object.fromEntries(new FormData($('#library-search')));
    }
    if (view !== next || detailId !== id) {
      if (view === 'prepare') readDraft();
      navigation.push(routeSnapshot());
    }
    if(['session','free-practice'].includes(view)&&next!==view&&data.active)pauseSession();
    if(enteringLibrary) libraryPane=enteringLibrary;
    view = next; detailId = id; render();
    if(enteringLibrary==='catalog' && libraryFormDraft) for(const [name,value] of Object.entries(libraryFormDraft)) { const field=$('#library-search')?.elements.namedItem(name);if(field)field.value=value; }
    root.querySelector('.cp-page')?.scrollTo(0, enteringLibrary?libraryScroll[enteringLibrary]:0);
  };
  function navigateBack() {
    if (sessionWriting) return true;
    if (sessionDrag?.active) { render(); return true; }
    // Cancel the topmost modal first; score handlers preserve pause and save-error rules.
    const modal = [...document.querySelectorAll('dialog[open]')].at(-1);
    if (modal) {
      if (modal.dispatchEvent(new Event('cancel', { cancelable: true }))) modal.close();
      return true;
    }
    const workMenu = root.querySelector('.cp-work-menu[open]');
    if (workMenu) { workMenu.open = false; workMenu.querySelector('summary').focus(); return true; }
    if (openingScore || importingScore) return true;
    if (root.hidden) { if(data.active?.quickScore){quickExitDialog();return true;}hideReader(); render(); return true; }
    if (view === 'prepare') readDraft();
    let previous;
    while ((previous = navigation.pop())) {
      if (previous.view === 'session' && !data.active) continue;
      if (previous.view === 'work' && !data.works.some(w => w.id === previous.detailId)) continue;
      if (previous.view === 'event' && !findEvent(data.events,previous.detailId)) continue;
      if (previous.view === 'session-detail' && !data.sessions.some(s => s.id === previous.detailId)) continue;
    if (view === 'session' || view === 'free-practice') pauseSession();
      ({ view, detailId, selectedDate, calendarMode, filteredTarget, libraryFilters, libraryPage, draft, preparePurpose } = previous);
      render(); root.querySelector('.cp-page')?.scrollTo(0, previous.scroll);
      return true;
    }
    if (view !== 'home') { pauseSession(); view = 'home'; detailId = ''; render(); return true; }
    return false;
  }
  window.addEventListener('spino:back', event => { if (navigateBack()) event.preventDefault(); });
  const totalMs = () => data.active ? data.active.elapsedMs + (data.active.runningSince == null ? 0 : Math.max(0, Date.now() - data.active.runningSince)) : 0;
  const blockMs = () => data.active ? data.active.blockElapsedMs + (data.active.runningSince == null ? 0 : Math.max(0, Date.now() - data.active.runningSince)) : 0;
  const currentBlock = () => data.active?.blocks[data.active.blockIndex];
  const backgroundTimer = () => data.active?.keepTimeInBackground && ['free','repertoire'].includes(currentBlock()?.type);
  const measurement = () => {
    const active = data.active;
    if (!active) return null;
    if (currentBlock()?.type === 'theory') return quiz || active.currentMeasurement || null;
    // MusicXML follow mode reports MIDI notes for repertoire, whatever the session context.
    if (currentBlock()?.type === 'repertoire') return active.currentMeasurement || null;
    if (active.context === 'piano') return null;
    if (!readerMounted) return active.currentMeasurement || null;
    const measured = reader.measurement;
    return { ...measured, correct: measured.correct + (readerBase?.correct || 0), wrong: measured.wrong + (readerBase?.wrong || 0) };
  };
  function checkpoint() {
    syncScreenAwake();
    if (!data.active || sessionWriting) return;
    accrue(data.active); data.active.currentMeasurement = measurement();
    if (readerMounted) data.active.readerSnapshot = reader.snapshot;
    persist().catch(() => {});
  }
  function stopMetro() { if (metro) { clearInterval(metro.interval); metro.clicks.forEach(c => c.stop()); metro = null; } }
  function startMetro() {
    if (!data.active || currentBlock()?.type !== 'free') return;
    const options = currentBlock()?.type === 'free' ? metronomeSettings(data.active) : { bpm: currentBlock()?.bpm || 60, mode: 'audio', beats: 4, subdivision: 1 }, clicks = [];
    if (data.active.runningSince == null) data.active.runningSince = Date.now();
    let step = 0, next = performance.now();
    metro = { clicks, interval: setInterval(() => {
      const at = performance.now(); if (at < next) return;
      const beat = Math.floor(step / options.subdivision) % options.beats, main = step % options.subdivision === 0;
      if (options.mode !== 'visual' && (options.volume ?? 100) > 0) { while (clicks.length > 8) clicks.shift(); clicks.push(click(main && beat === 0, audioNow(), (options.volume ?? 100) / 100)); }
      document.querySelectorAll('[data-metro-beat]').forEach((el,i) => el.classList.toggle('is-active', options.mode !== 'audio' && i === beat));
      const dial = document.querySelector('.cp-tempo-dial');
      if (dial) { dial.classList.toggle('is-accent', options.mode !== 'audio' && main && beat === 0); dial.style.setProperty('--beat-angle', `${360 * (step % (options.beats * options.subdivision)) / (options.beats * options.subdivision)}deg`); }
      step++; next += 60000 / options.bpm / options.subdivision;
      if (next < at) next = at + 60000 / options.bpm / options.subdivision;
    }, 16) };
    checkpoint();
  }
  function pauseSession() {
    if (!data.active) return;
    pause(data.active); stopMetro();
    if (readerMounted) reader.pause();
    checkpoint(); updateClock();
  }
  function hideReader() { if (readerMounted) { pauseSession(); reader.hide(); } root.hidden = false; }
  function showDialog(title, body, onSubmit = null, introduction = false) {
    dialogCleanup?.(); dialogCleanup = null;
    dialog.removeAttribute('aria-busy');
    dialog.innerHTML = `<div class="cp-dialog-head"><h2 id="cp-dialog-title" ${introduction?'tabindex="-1" autofocus':''}>${esc(title)}</h2><button type="button" class="quiet" data-action="close-dialog">${ui('Close','Cerrar')}</button></div><div class="cp-dialog-body">${body}<p id="cp-form-error" role="alert"></p></div>`;
    dialog.setAttribute('aria-labelledby', 'cp-dialog-title');
    dialog.querySelector('form')?.addEventListener('submit', async e => {
      e.preventDefault();
      if (e.target.getAttribute('aria-busy') === 'true') return;
      const submit = e.submitter; if (submit) submit.disabled = true;
      const close = dialog.querySelector('.cp-dialog-head button'); close.disabled = true;
      e.target.setAttribute('aria-busy', 'true');
      try { await onSubmit?.(new FormData(e.target), e.target, submit); }
      catch (error) { $('#cp-form-error').textContent = localizeMessage(error.message); }
      finally { e.target.removeAttribute('aria-busy'); if (submit) submit.disabled = false; close.disabled = false; }
    });
    if (dialog.querySelector('.cp-history-card')) dialogCleanup = bindScoreThumbnails(dialog, store);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('.cp-dialog-body').scrollTop = 0;
    if(introduction){const heading=dialog.querySelector('h2');heading.focus({preventScroll:true});requestAnimationFrame(()=>{if(dialog.open&&dialog.contains(heading)){heading.focus({preventScroll:true});dialog.scrollTop=0;dialog.querySelector('.cp-dialog-body').scrollTop=0;}});}
  }
  function confirm(title, description, accept) {
    showDialog(title, `<p>${esc(description)}</p><div class="cp-actions">${btn('close-dialog', ui("Cancel", "Cancelar"))}${ui("<button type=\"button\" id=\"cp-confirm\" class=\"primary\">Confirm</button></div>", "<button type=\"button\" id=\"cp-confirm\" class=\"primary\">Confirmar</button></div>")}`);
    $('#cp-confirm').onclick = async () => {
      const controls = [...dialog.querySelectorAll('button')]; controls.forEach(button => { button.disabled = true; });
      dialog.setAttribute('aria-busy', 'true');
      try { await accept(); dialog.close(); }
      catch (e) { $('#cp-form-error').textContent = localizeMessage(e.message); }
      finally { dialog.removeAttribute('aria-busy'); controls.forEach(button => { button.disabled = false; }); }
    };
  }
  const formEnd = (label = ui("Save", "Guardar")) => `<div class="cp-actions">${btn('close-dialog', ui("Cancel", "Cancelar"))}<button type="submit" class="primary">${label}</button></div>`;
  const titleRow = (title, subtitle = '', action = '') => `<div class="cp-row"><div><h1>${title}</h1>${subtitle ? `<p class="muted">${subtitle}</p>` : ''}</div>${action}</div>`;
  const empty = text => `<p class="cp-empty">${text}</p>`;
  const workName = id => data.works.find(w => w.id === id)?.title || ui("Work", "Obra");
  const downloaded = () => [...data.downloads.map(d=>({...d,id:d.catalogId})),...data.works.filter(w=>w.assetId&&!data.downloads.some(d=>d.assetId===w.assetId))];
  const resource = id => data.works.find(w=>w.id===id) || data.downloads.find(d=>d.catalogId===id);
  const resultText = (session, hours=false) => `${hours?formatProgressDuration(session.elapsedMs):minutes(session.elapsedMs)+' min'} · ${session.manual ? ui("Manual entry", "Registro manual") : CONTEXTS[session.context]}${session.status === 'partial' ? ui(' · Partial', ' · Parcial') : ''}${session.mood ? ` · ${FACES[session.mood-1]} ${MOODS[session.mood-1]}` : ''}`;
  const sessionOptions = () => ({ assetFor: work => work.assetId || (work.libraryId && executionFor(library, work.libraryId).assetId) });
  const sessionCards = (sessions, workId = null) => savedSessionsMarkup(sessions, data.works, { ...sessionOptions(), workId });
  function home() { return todayMarkup(data, icon, localDate(), sessionOptions()); }
  function practice() { return practiceMarkup(data, icon); }
  let calendarWeekAnchor = null, calendarWeekCount = 2;
  function calendar() {
    if (calendarWeekAnchor !== selectedDate) { calendarWeekAnchor = selectedDate; calendarWeekCount = 2; }
    const agenda = calendarMode === 'week' ? weekAgendaMarkup(data, selectedDate, sessionOptions(), calendarWeekCount) : (() => {
      const entries = agendaEntries(data, selectedDate);
      return '<div class="cp-agenda">' + (entries.length ? entries.filter(e => !e.session).map(e => agendaCard(e,{movable:true})).join('') + calendarSessionsMarkup(entries, data.works, sessionOptions()) : empty(ui("No plans for this day. Add a practice or log one you have completed.", "Sin planes para este día. Añade una práctica o registra la que ya has realizado."))) + '</div>';
    })();
    return calendarMarkup(data, selectedDate, calendarMode) + agenda;
  }
  async function saveWeek(proposal) {
    const previousPlans = data.plans, previousEvents = data.events;
    data.plans = [...data.plans, ...proposal.plans];
    data.events = [...data.events, ...proposal.events];
    try { await persist(); }
    catch (e) { data.plans = previousPlans; data.events = previousEvents; throw e; }
    selectedDate = proposal.start; calendarMode = 'week'; go('calendar');
    toast(`${proposal.plans.length}${ui(" practices and ", " prácticas y ")}${proposal.events.length}${ui(" tutor classes added", " clases añadidas")}${proposal.weeks > 1 ? `${ui(" through ", " hasta ")}${proposal.until}` : ''}.`);
  }
  function addOnDay(date = selectedDate) {
    selectedDate = date;
    showDialog(dayLabel(date), '<div class="cp-actions">' + btn('plan-practice', ui("Schedule practice", "Planificar práctica"), '', 'primary') + btn('new-event', ui("Event or audition", "Evento o audición")) + btn('manual-session', ui("Log completed practice", "Registrar práctica realizada")) + btn('close-dialog', ui("Close", "Cerrar")) + '</div>');
  }
  function planDetail(id) {
    const p = data.plans.find(plan => plan.id === id);
    if (!p) return;
    const result = data.sessions.find(s => s.id === p.sessionId);
    showDialog(p.title, '<p class="muted">' + esc(dayLabel(p.date)) + (p.time ? ' · ' + esc(p.time) : '') + ' · ' + CONTEXTS[p.context] + '</p><ul class="cp-list">' + p.blocks.map(b => '<li><b>' + ACTIVITIES[b.type] + '</b> · ' + b.minutes + ' min' + (['reading','technique','theory'].includes(b.type) ? '<br>' + esc(targetById(b.target).label) : '') + (b.passage ? '<br>' + esc(b.passage) : '') + '</li>').join('') + '</ul>' + (result ? sessionCards([result]) : '') + '<div class="cp-actions">' + (!result && p.status === 'planned' ? btn('start-plan', ui("Start", "Empezar"), p.id, 'primary') : '') + (p.recurrence ? ui("<p class=\"muted\">Weekly series through ", "<p class=\"muted\">Serie semanal hasta ") + esc(p.recurrence.until) + ui(". Rescheduling changes this appointment only.</p>", ". Se reprogramará solo esta cita.</p>") + btn('cancel-series', ui("Cancel this and future appointments", "Cancelar esta cita y las siguientes"), p.id, 'quiet') : '') + btn('edit-plan', ui("Edit practice", "Editar práctica"), p.id) + btn('reschedule-plan', ui("Reschedule", "Reprogramar"), p.id) + btn('delete-plan', ui("Delete", "Eliminar"), p.id, 'quiet') + btn('close-dialog', ui("Close", "Cerrar")) + '</div>');
  }
  function myPiano() { return repertoire(); }
  function libraryNavigation() {
    const pane=libraryRoute(view);
    if(!pane || materialSelection)return '';
    return `<div class="cp-library-navigation"><nav class="cp-section-tabs cp-choice-group" aria-label="${ui('Library','Biblioteca')}"><button type="button" data-action="repertoire" ${pane==='repertoire'?'aria-current="page"':''}>${ui('My repertoire','Mi repertorio')}</button><button type="button" data-action="catalog" ${pane==='catalog'?'aria-current="page"':''}>${ui('Catalogue','Catálogo')}</button><button type="button" data-action="multimedia" ${pane==='multimedia'?'aria-current="page"':''}>${ui('Multimedia','Multimedia')}</button></nav></div>`;
  }
  let progressSection='activity',progressTimeWeek='',progressTimePoint='';
  const timeFilters={range:'3m',type:'',workId:''};
  function progressTime() {
    return `<div class="cp-progress-page">${titleRow(ui('Practice time','Tiempo de práctica'),'',btn('profile-back',ui('‹ Progress','‹ Progreso'),'','quiet'))}${practiceTimeDetailMarkup(data,{...timeFilters,selectedPeriod:progressTimePoint})}</div>`;
  }
  function progress() {
    const navigation=`<nav class="cp-progress-sections cp-section-tabs cp-choice-group" aria-label="${ui('Progress sections','Secciones de progreso')}">${[['activity',ui('Activity','Actividad')],['repertoire',ui('Repertoire','Repertorio')],['technique',ui('Technique','Técnica')]].map(([id,label])=>`<button data-action="progress-section" data-id="${id}" ${progressSection===id?'aria-current="page"':''}>${label}</button>`).join('')}</nav>`;
    if(progressSection!=='activity')return `<div class="cp-progress-page">${titleRow(ui('Progress','Progreso'))}${navigation}${progressSection==='repertoire'?repertoireProgressMarkup(data):techniqueProgressMarkup(data)}</div>`;

    const since = addDays(localDate(), -29); const sessions = data.sessions.filter(s=>s.date>=since && s.date<=localDate()); const stats = summary(sessions);
    return `<div class="cp-progress-page">${titleRow(ui('Progress','Progreso'))}${navigation}${practiceTimeOverviewMarkup(data,progressTimeWeek)}${progressHighlightsMarkup(data,mediaRecords)}<section class="cp-card"><h2>${ui('Scales and modes practiced','Escalas y modos trabajados')}</h2>${Object.entries(stats.byTarget).length?Object.entries(stats.byTarget).map(([id,ms])=>`<div class="cp-row"><span>${esc(targetById(id).label)} · ${formatProgressDuration(ms)}</span>${btn('target-history',ui('View','Ver'),id)}</div>`).join(''):empty(ui('Practice reading or technique to track your musical goals.','Practica lectura o técnica para seguir tus objetivos musicales.'))}</section><h2 class="cp-section">${ui('History','Historial')}</h2>${sessionCards(data.sessions)}</div>`;
  }
  function repertoire() {
    return `<div class="cp-repertoire-page"><header class="cp-repertoire-heading"><h1>${ui('Repertoire','Repertorio')}</h1><div class="cp-actions">${btn('import-pdf',ui('Import PDF','Importar PDF'),'','quiet')}${btn('new-work',ui('+ Add work','+ Añadir obra'),'','primary')}</div></header>${repertoireMarkup(data,repertoireFilters,repertoireIndex,{esc,opts,btn,canPrint:workHasScore})}</div>`;
  }
  function workDetail() {
    const w = data.works.find(w=>w.id===detailId); if(!w) return repertoire();
    const sessions = data.sessions.filter(s => s.workIds?.includes(w.id) || (s.results || []).some(r => r.block.workId === w.id) || s.blocks?.some(b => b.workId === w.id));
    return workDetailMarkup(w, { hasScore: workHasScore(w), recordingCount: mediaRecords.filter(r => r.workId === w.id).length, history: sessionCards(sessions, w.id) });
  }

  function routines() {
    return `${titleRow(ui("Your routines", "Tus rutinas"),ui("Prepare a sequence and use it again.", "Prepara una secuencia y vuelve a utilizarla."),btn('new-routine',ui("+ Create routine", "+ Crear rutina"),'','primary'))}${data.routines.length ? data.routines.map(r=>`<article class="cp-card"><h2>${esc(r.title)}</h2><p class="muted">${r.blocks.map(b=>`${ACTIVITIES[b.type]} ${b.minutes} min`).join(' · ')}</p><div class="cp-actions">${btn('start-routine',ui("Prepare session", "Preparar sesión"),r.id,'primary')}${btn('edit-routine',ui("Edit", "Editar"),r.id)}${btn('delete-routine',ui("Delete", "Eliminar"),r.id,'quiet')}</div></article>`).join('') : empty(ui("Save your warm-up, reading or repertoire blocks as a reusable routine.", "Guarda tus bloques de calentamiento, lectura o repertorio como una rutina reutilizable."))}`;
  }

  function catalog() {
    return libraryReady ? libraryMarkup(library, libraryFilters, libraryPage, !!materialSelection, {lang:getAppLanguage(),data}) : ui("<p role=\"status\">Loading bundled repertoire catalogue…</p>", "<p role=\"status\">Cargando el catálogo de repertorio…</p>");
  }
  // MusicXML works added from the catalogue get their score when the library download finishes.
  const workHasScore = w => !!(w?.assetId || w?.libraryId && executionFor(library, w.libraryId)?.assetId);
  const workPlayable = w => !w?.libraryId || manualPracticeState(catalogueRecords(library).find(r => r.piece_id === w.libraryId), executionFor(library, w.libraryId), library).playable;
  const libraryRepertoire = () => new Map(data.works.filter(w=>w.libraryId&&!w.trashedAt).map(w=>[w.libraryId,w.id]));
  function settingsPage() {
    return (localStorage.getItem('spino.local-before-join')?`<section class="cp-card"><p>${ui('Your previous local notebook is saved.','Tu cuaderno local anterior está guardado.')}</p>${btn('storage-restore-local',ui('Review saved notebook','Revisar cuaderno guardado'))}</section>`:'')+(recoveredNotebook?`<section class="cp-card"><h2>${ui('Recovered notebook','Cuaderno recuperado')}</h2>${btn('storage-return-original',ui('Return to original notebook','Volver al cuaderno original'))}</section>`:'')+profileMarkup(data,{cloud:cloud?.state,assetCount:profileFiles?.length,reminders:reminderState,native:remindersAvailable,driveNotebook:driveNotebookAvailable(),lang:getAppLanguage()});
  }
  async function refreshProfileFiles() {
    const index = await store.assetIndex();
    const records = new Map(catalogueRecords(library).map(r=>[r.piece_id,r]));
    profileFiles = index.map(asset=>{
      const work = data.works.find(w=>w.assetId===asset.id), download = data.downloads.find(d=>d.assetId===asset.id);
      return {...asset,title:work?.title||download?.title||records.get(asset.pieceId)?.display_title||asset.name};
    }).sort((a,b)=>a.title.localeCompare(b.title,getAppLanguage()));
    if (view==='profile-files'||view==='settings') render();
  }
  function backupPage() {
    return '<section class="cp-profile">'+profileHeading(ui("Backup & sync", "Copia y sincronización"),getAppLanguage())+cloudBackupMarkup(cloud?.state||{status:'disconnected'},cloudOptions())+`<section class="cp-card"><h2>${ui('Keep a copy','Guarda una copia')}</h2><div class="cp-actions">${btn('storage-export',ui('Save a copy','Guardar una copia'))}${btn('storage-import',ui('Recover a copy','Recuperar una copia'))}</div></section></section>`;
  }
  function fileDetail(id) {
    const file=profileFiles?.find(f=>f.id===id);if(!file)return;
    const work=downloaded().find(w=>w.assetId===id);
    showDialog(file.title,'<p class="muted">'+esc(file.format.toUpperCase())+' · '+fileSize(file.bytes,getAppLanguage())+'</p><div class="cp-actions">'+(file.pieceId?btn('profile-file-catalog',ui("View in catalogue", "Ver en catálogo"),file.pieceId,'primary'):work?btn('profile-file-open',ui("Open score", "Abrir partitura"),work.id,'primary'):'')+(work?btn('profile-file-remove',ui("Delete file", "Eliminar archivo"),work.id,'danger quiet'):'')+btn('close-dialog',ui("Close", "Cerrar"))+'</div>');
  }

  function prepare(type='reading', existing=null, purpose='start') {
    if (data.active && purpose === 'start') { go('session'); toast(ui("A session is pending. Save it or continue before starting another.", "Hay una sesión pendiente. Guárdala o continúa antes de empezar otra.")); return; }
    preparePurpose = purpose;
    draft = existing ? copy(existing) : { title: ACTIVITIES[type], context: ['free','repertoire'].includes(type) ? 'piano' : data.preferences.context, blocks: [block(type, {...practiceDefaults(data.preferences,type),minutes:DEFAULT_PRACTICE_MINUTES})] };
    if(purpose==='routine'&&!existing) { draft.title='';draft.blocks[0].minutes=10; }
    if(purpose==='routine')draft=routineDraft(draft,data);
    if(purpose==='start'&&draft.routinePolicy) { draft=routineForPractice(draft,data,!!reader.devices.length);draft.routinePrepared=true; }
    go('prepare');
  }
  let durationWeights = null;
  function preparePage() {
    durationWeights = null;
    return draft ? preparePurpose==='routine'?routineBuilderMarkup(draft,data,{esc,opts,btn}):preparationMarkup(draft, preparePurpose, data) : home();
  }
  function readDraft() {
    const form = $('#prepare-form'); if (!form) return draft;
    const fields = new FormData(form);
    if(form.querySelector('[name=include-warmup]')) draft.includeWarmup=fields.has('include-warmup');
    if(fields.has('routine-name')) draft.title=String(fields.get('routine-name')).trim();
    draft.context = preparePurpose==='routine'?'piano':fields.get('context');
    if(preparePurpose==='routine') { draft.routinePolicy.warmup=fields.has('routine-warmup');if(fields.has('warmup-minutes'))draft.routinePolicy.warmupMinutes=Number(fields.get('warmup-minutes')); }
    draft.blocks.forEach((b,i)=>{
      for (const key of ['type','target','hand','figures','input','workId','passage','presentation','timing']) if(fields.has(`${key}-${i}`)) b[key]=String(fields.get(`${key}-${i}`));
      for (const key of ['minutes','bpm','level']) if(fields.has(`${key}-${i}`)) b[key]=Number(fields.get(`${key}-${i}`));
      if(b.hand==='both' && (draft.context==='mobile' || !['reading','technique'].includes(b.type))) b.hand='right';
      if(b.type==='repertoire') { const work=data.works.find(w=>w.id===b.workId); b.target=work?work.target:null; }
    });
    return draft;
  }
  function validDraft() {
    readDraft();
    if(!$('#prepare-form').reportValidity()) return false;
    if(draft.context==='mobile' && draft.blocks.some(b=>['free','repertoire'].includes(b.type))) { $('#prepare-error').textContent=ui("For repertoire or free practice, choose With piano or MIDI piano. Without piano, practice reading or technique.", "Para repertorio o práctica libre, elige Con piano o Piano MIDI. Sin piano puedes trabajar lectura o técnica."); return false; }
    if(preparePurpose!=='routine')draft.title ||= ACTIVITIES[draft.blocks[0].type];
    return true;
  }
  async function saveRoutineDraft() {
    if(!validDraft())return;
    showDialog(ui('Save routine','Guardar rutina'),`<form id="routine-name-form"><label>${ui('Routine name','Nombre de la rutina')}<input name="routine-name" maxlength="200" required autofocus value="${esc(draft.title)}" placeholder="${ui('For example, daily practice','Por ejemplo, práctica diaria')}" /></label>${formEnd(ui('Save routine','Guardar rutina'))}</form>`,async fields=>{
      const title=String(fields.get('routine-name')).trim();
      if(!title)throw Error(ui('Enter a routine name.','Escribe un nombre para la rutina.'));
      const next=copy(data),existing=next.routines.find(r=>r.id===draft.id),value={...copy(draft),title,id:draft.id||uid()};
      if(existing)Object.assign(existing,value);else next.routines.push(value);
      await store.save(next);data=next;dialog.close();go('routines');toast(ui('Routine saved.','Rutina guardada.'));
    });
  }
  async function changeRoutineBlocks(change) {
    readDraft();
    const index=draft.blocks.findIndex(b=>b.id===change.blockId);
    if(index<0)return;
    if(change.type==='remove') { if(draft.blocks.length===1)return;draft.blocks.splice(index,1); }
    if(change.type==='move') { const [moved]=draft.blocks.splice(index,1);draft.blocks.splice(Math.max(0,Math.min(draft.blocks.length,change.toIndex)),0,moved); }
    render();
  }
  function editRoutineBlock(id=null,type='reading') {
    readDraft();
    if(!id&&draft.blocks.length>=20) { toast(ui('A routine can contain up to 20 blocks.','Una rutina puede contener hasta 20 bloques.'));return; }
    const original=id?copy(draft.blocks.find(b=>b.id===id)):block(type,{...practiceDefaults(data.preferences,type),minutes:10});
    if(!original)return;
    const editorData={...data,active:{context:draft.context}};
    showDialog(id?ui('Edit block','Editar bloque'):ui('Add block','Añadir bloque'),sessionBlockEditorMarkup(original,editorData,{routine:true}),async f=>{
      const values=readSessionBlockEditor(f,original,editorData), updated={...original,...values};
      if(id) { const index=draft.blocks.findIndex(b=>b.id===id);if(index<0)return;draft.blocks[index]=updated; } else draft.blocks.push(updated);
      dialog.close();render();
    });
    bindSessionBlockEditor(dialog.querySelector('form'),editorData);
  }
  function planForm(existing=null, source=draft) {
    if(preparePurpose==='edit-plan'&&!existing) throw Error(ui("This planned practice is no longer available.", "Esta práctica planificada ya no está disponible."));
    const p=existing ? {...existing, ...(preparePurpose==='edit-plan' && source?.id===existing.id ? {title:source.title,context:source.context,includeWarmup:source.includeWarmup,blocks:copy(source.blocks)} : {})} : { title:source.title,context:source.context,includeWarmup:source.includeWarmup,blocks:copy(source.blocks),...(source.routinePolicy?{routinePolicy:copy(source.routinePolicy)}:{}),date:selectedDate,time:'',reminder:false,status:'planned' };
    showDialog(existing?ui("Reschedule practice", "Reprogramar práctica"):ui("Schedule practice", "Planificar práctica"),`${ui("<form><label>Title<input name=\"title\" maxlength=\"200\" required value=\"", "<form><label>Título<input name=\"title\" maxlength=\"200\" required value=\"")}${esc(p.title)}${ui("\" /></label><div class=\"cp-fields\"><label>Date<input name=\"date\" type=\"date\" required value=\"", "\" /></label><div class=\"cp-fields\"><label>Fecha<input name=\"date\" type=\"date\" required value=\"")}${p.date}${ui("\" /></label><label>Time (optional)<input name=\"time\" type=\"time\" value=\"", "\" /></label><label>Hora (opcional)<input name=\"time\" type=\"time\" value=\"")}${esc(p.time)}" /></label></div><label class="check"><input name="reminder" type="checkbox" ${p.reminder?'checked':''}${ui(" /> Reminder 15 minutes before</label><p class=\"muted\">", " /> Recordatorio 15 minutos antes</label><p class=\"muted\">")}${p.blocks.length}${ui(" blocks · ", " bloques · ")}${p.blocks.reduce((n,b)=>n+b.minutes,0)}${ui(" planned min · ", " min previstos · ")}${CONTEXTS[p.context]}</p>${formEnd()}</form>`,async f=>{
      const time=String(f.get('time')); if(f.has('reminder')&&!time) throw new Error(ui("Enter a time for the reminder.", "Indica una hora para el recordatorio."));
      const value={...p,id:p.id||uid(),title:String(f.get('title')).trim(),date:String(f.get('date')),time,reminder:f.has('reminder')};
      const next=copy(data);
      if(existing) {
        const current=next.plans.find(v=>v.id===existing.id);
        if(!current || current.status!=='planned' || data.active?.planId===existing.id) throw Error(ui("Only pending practices can be edited. Finish the active practice first.", "Solo puedes editar prácticas pendientes. Termina primero la sesión activa."));
        Object.assign(current,value);
      } else next.plans.push(value);
      await store.save(next); data=next; await reminders(); selectedDate=value.date; dialog.close();go('calendar');if(f.has('reminder'))offerNotifications();
    });
  }
  function workForm(existing=null, initialFile=null) {
    const w=existing||{title:'',composer:'',stage:STAGES[0],notes:'',passage:'',target:'C-major',bpm:60};
    let attachment, saving=false;
    showDialog(existing?ui("Edit work", "Editar obra"):ui("Add work", "Añadir obra"),`<form>${scoreImportMarkup(!!w.assetId)}${ui("<label>Title<input name=\"title\" maxlength=\"200\" required value=\"", "<label>Título<input name=\"title\" maxlength=\"200\" required value=\"")}${esc(w.title)}${ui("\" /></label><label>Composer<input name=\"composer\" maxlength=\"200\" value=\"", "\" /></label><label>Compositor<input name=\"composer\" maxlength=\"200\" value=\"")}${esc(w.composer)}${ui("\" /></label><label>Tags<input name=\"tags\" maxlength=\"820\" placeholder=\"Baroque, lesson, recital\" value=\"", "\" /></label><label>Etiquetas<input name=\"tags\" maxlength=\"820\" placeholder=\"Barroco, clase, recital\" value=\"")}${esc((w.tags||[]).join(', '))}" /></label><label class="check"><input type="checkbox" name="onStand" ${!existing||isOnStand(w)?'checked':''} />${ui("On the music stand: I am practising it now", "En el atril: la estoy trabajando ahora")}</label>${ui("<details class=\"cp-details\"><summary>Study details</summary><div class=\"cp-fields\"><label>Stage<select name=\"stage\">", "<details class=\"cp-details\"><summary>Detalles de estudio</summary><div class=\"cp-fields\"><label>Etapa<select name=\"stage\">")}${opts(STAGES.map(s=>[s,stageLabel(s)]),w.stage)}${ui("</select></label><label>Target tempo<input type=\"number\" name=\"bpm\" min=\"30\" max=\"160\" value=\"", "</select></label><label>Tempo objetivo<input type=\"number\" name=\"bpm\" min=\"30\" max=\"160\" value=\"")}${w.bpm}${ui("\" required /></label></div><label>Printed tempo marking<input name=\"tempoMark\" maxlength=\"120\" placeholder=\"E.g.: ♩ = 80\" value=\"", "\" required /></label></div><label>Indicación de tempo impresa<input name=\"tempoMark\" maxlength=\"120\" placeholder=\"Ej.: ♩ = 80\" value=\"")}${esc(w.tempoMark||'')}${ui("\" /></label><label>Key or mode<select name=\"target\"><option value=\"\">Unknown</option>", "\" /></label><label>Tonalidad o modo<select name=\"target\"><option value=\"\">Desconocido</option>")}${targets(w.target)}${ui("</select></label><label>Passage / next goal<input name=\"passage\" maxlength=\"1000\" value=\"", "</select></label><label>Pasaje / próximo objetivo<input name=\"passage\" maxlength=\"1000\" value=\"")}${esc(w.passage)}${ui("\" /></label><label>Notes<textarea name=\"notes\" maxlength=\"10000\">", "\" /></label><label>Notas<textarea name=\"notes\" maxlength=\"10000\">")}${esc(w.notes)}</textarea></label></details>${formEnd()}</form>`,async (f,form)=>{
      if(saving)return;
      const asset=attachment.asset();
      const value={...w,id:w.id||uid(),title:String(f.get('title')).trim(),composer:String(f.get('composer')).trim(),stage:f.get('stage'),bpm:Number(f.get('bpm')),target:f.get('target')||null,passage:String(f.get('passage')),notes:String(f.get('notes')),tempoMark:String(f.get('tempoMark')||'').trim(),tags:parseTags(f.get('tags')||''),onStand:f.has('onStand')};
      if(!value.title)throw new Error(ui("Enter a title for the work.", "Indica un título para la obra."));
      if(asset)value.assetId=asset.id;
      saving=true;form.setAttribute('aria-busy','true');
      const controls=[...form.elements].map(control=>[control,control.disabled]);controls.forEach(([control])=>control.disabled=true);
      const previous=existing?{...existing}:null;
      if(existing)Object.assign(existing,value);else data.works.push(value);
      try { if(asset)await store.commitAsset(asset,data);else await persist(); }
      catch(error){
        if(existing){for(const key of Object.keys(existing))delete existing[key];Object.assign(existing,previous);}
        else data.works=data.works.filter(work=>work.id!==value.id);
        throw new Error(ui("Could not save the work. Free up space and try again.", "No se ha podido guardar la obra. Libera espacio y vuelve a intentarlo."));
      } finally { saving=false;form.removeAttribute('aria-busy');controls.forEach(([control,disabled])=>control.disabled=disabled); }
      dialog.close(); if(view==='prepare') { readDraft(); draft.blocks.filter(b=>b.type==='repertoire'&&!b.workId).forEach(b=>b.workId=value.id);render(); } else go('work',value.id);
    });
    attachment=bindScoreImport(dialog.querySelector('form'),initialFile,!!existing);
    dialogCleanup=()=>attachment.dispose();
  }
  const eventFrequencyOptions = () => [['',ui('Does not repeat','No se repite')],['daily',ui('Every day','Cada día')],['weekly',ui('Every week','Cada semana')],['fortnightly',ui('Every two weeks','Cada dos semanas')],['monthly',ui('Every month','Cada mes')],['yearly',ui('Every year','Cada año')]];
  const eventSeriesLabel = e => `${eventFrequencyOptions().find(([value])=>value===e.recurrence.frequency)?.[1] || ''} · ${e.recurrence.until ? `${ui('Until','Hasta')} ${e.recurrence.until}` : ui('No end date','Sin fecha de fin')}`;
  function eventForm(existing=null) {
    const e=existing||{title:'',type:'Audición',date:selectedDate,time:'',place:'',notes:'',workIds:[],reminder:false,milestones:[]};
    showDialog(existing?ui('Edit event','Editar evento'):ui('New event','Nuevo evento'),`<form id="event-form">
      <label>${ui('Title','Título')}<input name="title" maxlength="200" value="${esc(e.title)}" required /></label>
      <label>${ui('Date','Fecha')}<input type="date" name="date" value="${esc(e.date)}" required /></label>
      <div class="cp-fields cp-event-basics"><label>${ui('Type','Tipo')}<select name="type">${opts(['Audición','Concierto','Clase','Ensayo','Otro'].map(s=>[s,eventTypeLabel(s)]),e.type)}</select></label>${eventTimeMarkup(e.time)}</div>
      ${!existing ? `<label>${ui('Repeat','Repetir')}<select name="frequency">${opts(eventFrequencyOptions(),'')}</select></label><div data-event-until hidden><label>${ui('End date (optional)','Fecha de fin (opcional)')}<input type="date" name="until" disabled /><small>${ui('Leave empty to repeat without an end date.','Déjala vacía para repetir sin fecha de fin.')}</small></label></div><p data-event-monthly hidden class="muted">${ui('If the day does not exist in a month, the event falls on its last day.','Si el día no existe en un mes, el evento se celebra el último día de ese mes.')}</p>` : e.recurrence ? `<p class="muted">${esc(eventSeriesLabel(e))}. ${ui('Changes apply to this appointment only.','Los cambios se aplican solo a esta cita.')}</p>` : ''}
      <label class="check"><input type="checkbox" name="reminder" ${e.reminder?'checked':''} />${ui('Reminder 15 minutes before','Recordatorio 15 minutos antes')}</label>
      <section class="cp-event-works" data-event-works></section>
      <details class="cp-event-details"><summary>${ui('Place and notes','Lugar y notas')}</summary>
      <label>${ui('Place','Lugar')}<input name="place" maxlength="200" value="${esc(e.place)}" /></label>
      <label>${ui('Notes','Notas')}<textarea name="notes" maxlength="10000">${esc(e.notes)}</textarea></label>
      </details>${formEnd()}</form>`,async f=>{
      if(f.has('reminder')&&!f.get('time')) throw new Error(ui('Enter a time for the notification.','Indica una hora para el aviso.'));
      const frequency=String(f.get('frequency')||''),until=String(f.get('until')||'');
      if(!validEventDate(f.get('date')) || (frequency && (!EVENT_FREQUENCIES.includes(frequency) || (until && (!validEventDate(until)||until<f.get('date')))))) throw new Error(ui('Choose an end date on or after the first event.','Elige una fecha de fin igual o posterior al primer evento.'));
      const value={...e,id:e.id||uid(),title:String(f.get('title')).trim(),type:f.get('type'),date:f.get('date'),time:f.get('time'),place:String(f.get('place')),notes:String(f.get('notes')),workIds:f.getAll('workIds'),reminder:f.has('reminder'),milestones:e.milestones?.length?e.milestones:[ui('First reading','Primera lectura'),ui('Work through passages','Resolver pasajes'),ui('Play through the whole piece','Tocar de principio a fin'),ui('Simulate the performance','Simular la actuación')].map(title=>({title,done:false}))};
      if(!existing && frequency) value.recurrence={id:value.id,frequency,until:until||null,rule:true,excluded:[]};
      const previous=data.events;data.events=saveEventOccurrence(data.events,value);
      try { await persist(); } catch(error) { data.events=previous;throw error; }
      await reminders();dialog.close();go('event',!existing && frequency ? `${value.id}@${value.date}` : value.id);if(f.has('reminder'))offerNotifications();
    });
    bindEventTime(dialog.querySelector('#event-form'));
    bindEventDates(dialog.querySelector('#event-form'));
    bindEventWorks(dialog.querySelector('#event-form'),data.works,e.workIds);
    if(!existing) {
      const form=dialog.querySelector('#event-form'),update=()=>{const frequency=form.elements.frequency.value;form.querySelector('[data-event-until]').hidden=!frequency;form.elements.until.disabled=!frequency;form.elements.until.min=form.elements.date.value;form.querySelector('[data-event-monthly]').hidden=!['monthly','yearly'].includes(frequency);};
      form.elements.frequency.addEventListener('change',update);form.elements.date.addEventListener('change',update);update();
    }
  }
  function lessonRecordings(e) {
    const ids=e.recordingIds||[];
    return `<section class="cp-card"><div class="cp-row"><h2>${ui('Teacher recordings','Grabaciones del profesor')}</h2><div class="cp-actions">${btn('lesson-recordings',ui('Associate recordings','Asociar grabaciones'),e.id)}${mediaCapture?btn('record-lesson',ui('Record teacher','Grabar al profesor'),e.id):''}</div></div>${ids.map(id=>{const r=mediaRecords.find(r=>r.id===id);return `<div class="cp-block"><h3>${esc(r?.title||ui('Recording unavailable on this device','Grabación no disponible en este dispositivo'))}</h3>${r?`<p class="muted">${r.kind==='midi'?'MIDI':r.kind==='video'?ui('Video','Vídeo'):ui('Audio','Audio')} · ${esc(new Date(r.createdAt).toLocaleString(getAppLanguage()))}${r.draft?' · '+ui('Pending save','Pendiente de guardar'):''}</p><div class="cp-actions">${btn('media-play',r.remoteOnly?ui('Download','Descargar'):r.draft?ui('Review and save','Revisar y guardar'):ui('Play','Reproducir'),id)}${r.draft||r.remoteOnly?'':btn('media-share',ui('Share','Compartir'),id)}</div>`:''}</div>`;}).join('')||`<p class="muted">${ui('Link audio or video demonstrations to this lesson.','Asocia demostraciones de audio o vídeo a esta clase.')}</p>`}</section>`;
  }
  function lessonForm(id) {
    const e=findEvent(data.events,id);if(e?.type!=='Clase')return;
    const s=lessonResult(data,id),date=s?.date||(e.date>localDate()?localDate():e.date);
    showDialog(s?ui('Edit completed lesson','Editar clase completada'):ui('Complete lesson','Completar clase'),`<form id="lesson-form"><div class="cp-fields"><label>${ui('Date','Fecha')}<input type="date" name="date" max="${localDate()}" value="${date}" required /></label><label>${ui('Duration (minutes)','Duración (minutos)')}<input type="number" name="minutes" min="1" max="720" step="0.01" value="${s?s.elapsedMs/60000:e.scorePractices?.length?Math.max(1,Math.ceil(e.scorePractices.reduce((n,p)=>n+p.elapsedMs,0)/600)/100):60}" required /></label></div>${feedbackFields(s?{...s,results:[],blocks:[]}:{title:e.title,workIds:e.workIds,notes:'',next:''},data.works)}${formEnd()}</form>`,async f=>{
      if(lessonResult(data,id)!==s)throw Error(ui('This lesson changed. Reopen the editor.','Esta clase ha cambiado. Abre de nuevo el editor.'));
      const next=copy(data);completeLesson(next,id,{...readFeedback(f),date:String(f.get('date')),minutes:Number(f.get('minutes'))});
      await store.save(next);data=next;dialog.close();await reminders();go('event',id);
    });
    dialog.querySelector('.cp-details').open=true;
  }
  async function lessonRecordingForm(id) {
    if(mediaStore)await refreshMedia();
    const e=findEvent(data.events,id);if(e?.type!=='Clase')return;
    const rows=mediaRecords.filter(r=>!r.draft||(e.recordingIds||[]).includes(r.id)),missing=(e.recordingIds||[]).filter(id=>!rows.some(r=>r.id===id));
    showDialog(ui('Teacher recordings','Grabaciones del profesor'),`<form id="lesson-recordings-form">${rows.map(r=>`<label class="check"><input type="checkbox" name="recordingIds" value="${esc(r.id)}" ${(e.recordingIds||[]).includes(r.id)?'checked':''} /><span>${esc(r.title)}<small class="muted"> · ${r.kind==='midi'?'MIDI':r.kind==='video'?ui('Video','Vídeo'):ui('Audio','Audio')} · ${esc(new Date(r.createdAt).toLocaleString(getAppLanguage()))}</small></span></label>`).join('')||`<p>${ui('Save a recording first.','Guarda primero una grabación.')}</p>`}${missing.map(id=>`<label class="check"><input type="checkbox" name="recordingIds" value="${esc(id)}" checked />${ui('Recording unavailable on this device','Grabación no disponible en este dispositivo')}</label>`).join('')}${formEnd()}</form>`,async f=>{const next=copy(data);linkLessonRecordings(next,id,f.getAll('recordingIds'));await store.save(next);data=next;dialog.close();render();});
  }
  function recordLesson(id) {
    const e=findEvent(data.events,id);if(e?.type!=='Clase'||!mediaCapture)return;
    const linkRecording=async record=>{const next=copy(data),current=findEvent(next.events,id);linkLessonRecordings(next,id,[...(current?.recordingIds||[]),record.id]);await store.save(next);data=next;};
    mediaCapture.openStandalone(e.workIds[0]||'',{onSaved:linkRecording,onRetained:linkRecording});
  }
  function eventDetail() {
    const e=findEvent(data.events,detailId);if(!e)return calendar();
    const completed=lessonResult(data,e.id);
    const lesson=e.type==='Clase'?`<section class="cp-card"><div class="cp-row"><h2>${completed?ui('Completed lesson','Clase completada'):ui('Lesson','Clase')}</h2>${btn('complete-lesson',completed?ui('Edit completed lesson','Editar clase completada'):ui('Complete lesson','Completar clase'),e.id,'primary')}</div>${completed?`${sessionCards([completed])}<p style="white-space:pre-wrap">${esc(completed.notes)}</p>${completed.next?`<h3>${ui('Next step','Próximo paso')}</h3><p style="white-space:pre-wrap">${esc(completed.next)}</p>`:''}${completed.workIds?.length?`<h3>${ui('Scores worked on','Partituras trabajadas')}</h3>${completed.workIds.map(id=>`<div class="cp-actions">${btn('work-detail',esc(workName(id)),id)}${workHasScore(data.works.find(w=>w.id===id)||{})?btn('open-pdf',ui('Open score','Abrir partitura'),id):''}</div>`).join('')}`:''}`:''}</section>${lessonRecordings(e)}`:'';
    return `${titleRow(esc(e.title),`${esc(eventTypeLabel(e.type))} · ${esc(dayLabel(e.date))}${e.time?` · ${esc(e.time)}`:''}`,btn('edit-event',ui("Edit", "Editar"),e.id))}${lesson}<article class="cp-card"><span class="cp-tag warm">${completed?ui('Original plan','Plan original'):daysUntil(e.date)>=0?`${ui("In ", "Faltan ")}${daysUntil(e.date)}${ui(" days", " días")}`:ui("Past event", "Evento pasado")}</span><p style="margin-top:16px">${esc(e.place)}</p><p style="white-space:pre-wrap">${esc(e.notes)}${ui("</p><h2>Preparation steps</h2>", "</p><h2>Pasos de preparación</h2>")}${(e.milestones||[]).map((m,i)=>`<label class="check"><input type="checkbox" data-milestone="${i}" ${m.done?'checked':''} />${esc(m.title)}</label>`).join('')}${ui("<p class=\"muted\">Mark each step when you feel ready.</p></article><h2 class=\"cp-section\">Linked repertoire</h2>", "<p class=\"muted\">Tú marcas cuándo está preparado cada paso.</p></article><h2 class=\"cp-section\">Repertorio asociado</h2>")}${e.workIds.length?e.workIds.map(id=>`<article class="cp-card cp-row"><h3>${esc(workName(id))}${e.scorePractices?.some(s=>s.blocks[0].workId===id)?` · ${clock(e.scorePractices.find(s=>s.blocks[0].workId===id).elapsedMs)}`:''}</h3><div class="cp-actions">${e.type==='Clase'&&!completed&&workHasScore(resource(id))?btn('lesson-score',ui("Practice score", "Practicar partitura"),id,'primary'):''}${btn('work-detail',ui("Open", "Abrir"),id)}${btn('plan-work',ui("Schedule rehearsal", "Planificar ensayo"),id)}</div></article>`).join(''):empty(ui("Edit the event to link your works.", "Edita el evento para vincular tus obras."))}<div class="cp-actions">${e.recurrence ? `<p class="muted">${esc(eventSeriesLabel(e))}${ui(". Editing changes this appointment only.</p>", ". Se editará solo esta cita.</p>")}${btn('cancel-series',ui("Cancel this and future appointments", "Cancelar esta cita y las siguientes"),e.id,'quiet')}` : ''}${btn('delete-event',ui("Delete event", "Eliminar evento"),e.id,'danger quiet')}</div>`;
  }
  function manualForm() {
    showDialog(ui("Log completed practice", "Registrar práctica realizada"),`${ui("<form><div class=\"cp-fields\"><label>Date<input name=\"date\" type=\"date\" max=\"", "<form><div class=\"cp-fields\"><label>Fecha<input name=\"date\" type=\"date\" max=\"")}${localDate()}" value="${selectedDate>localDate()?localDate():selectedDate}${ui("\" required /></label><label>Minutes<input name=\"minutes\" type=\"number\" min=\"1\" max=\"720\" value=\"20\" required /></label></div><label>Activity<select name=\"type\">", "\" required /></label><label>Minutos<input name=\"minutes\" type=\"number\" min=\"1\" max=\"720\" value=\"20\" required /></label></div><label>Actividad<select name=\"type\">")}${opts(Object.entries(ACTIVITIES).filter(([type])=>!['theory','warmup'].includes(type)),'free')}${ui("</select></label><label>Work (optional)<select name=\"workId\"><option value=\"\">No linked work</option>", "</select></label><label>Obra (opcional)<select name=\"workId\"><option value=\"\">Sin obra asociada</option>")}${opts(data.works.filter(w=>!w.trashedAt).map(w=>[w.id,w.title]),'')}</select></label>${feedbackFields({title:ui("Piano practice", "Práctica de piano")},data.works)}${formEnd()}</form>`,async f=>{
      const b=block(f.get('type'),{minutes:Number(f.get('minutes')),workId:String(f.get('workId'))});
      const work=data.works.find(w=>w.id===b.workId);if(work)b.target=work.target;
      const s=beginSession({title:String(f.get('title')),context:'piano',blocks:[b]});s.date=f.get('date');s.elapsedMs=b.minutes*60000;s.blockElapsedMs=s.elapsedMs;
      const saved=saveSession(data,s,{...readFeedback(f),workIds:[...new Set([...f.getAll('workIds'),b.workId].filter(Boolean))]});saved.manual=true;
      await persist();await reminders();dialog.close();go('session-detail',saved.id);
    });
  }
  async function enableNotifications() {
    const next=copy(data);next.preferences.notificationsEnabled=true;
    await store.save(next);data=next;await reminders(true);render();
  }
  function offerNotifications() {
    if(reminderState?.enabled)return;
    confirm(ui('Enable notifications','Habilitar notificaciones'),ui('Your appointment is saved. Enable notifications to receive its reminder on this device?','La cita está guardada. ¿Habilitar las notificaciones para recibir su aviso en este dispositivo?'),enableNotifications);
  }
  async function reminders(request=false) {
    try { reminderState=await syncReminders(data,request); if(request&&!reminderState.enabled)toast(remindersAvailable?ui("Notifications are disabled. Allow them in your device settings and try again.", "Las notificaciones están desactivadas. Permítelas en los ajustes del dispositivo y vuelve a intentarlo."):ui("Plan saved. Reminders with the app closed require the Android or iOS app.", "Plan guardado. Los avisos con la app cerrada necesitan la app Android o iOS.")); }
    catch { toast(ui("Plan saved, but the reminder could not be scheduled.", "El plan está guardado, pero no se ha podido programar el aviso.")); }
  }

  async function startSession(source, afterStart = null) {
    if (startingPractice || root.inert) return;
    // Start from the saved local notebook; provider I/O must never gate practice.
    // Reserve the transition before MIDI/storage awaits so a late sync cannot adopt over it.
    startingPractice = true;
    try {
      if(data.active){go('session');return;}
      if(source.routinePolicy) { try { await reader.refreshMidi(); } catch {} source=routineForPractice(source,data,!!reader.devices.length,{keepTempo:!!source.routinePrepared}); }
      for (const b of source.blocks) {
        const work = data.works.find(w => w.id === b.workId);
        if (work?.libraryId && !manualPracticeState(catalogueRecords(library).find(r => r.piece_id === work.libraryId), executionFor(library, work.libraryId), library).playable) throw new Error(ui("The selected score needs validation, analysis or piano-part selection.", "La partitura seleccionada necesita validación, análisis o selección de las partes de piano."));
      }
      // Piano and MIDI sessions open with a Hanon warm-up, unless it is switched off or the plan already has one.
      const warm = warmupPreferences(data.preferences);
      const planned = !source.routinePolicy && (source.includeWarmup ?? warm.enabled) && source.context !== 'mobile' && !source.blocks.some(b => b.type === 'warmup') ? { ...source, blocks: [block('warmup', warmupBlockValues(data)), ...source.blocks] } : source;
      const next=copy(data);next.active=beginSession(planned);next.active.runningSince=Date.now();
      if(source.blocks.some(b=>b.quickPractice)){next.active.quickScore=emptyQuickScore();next.active.quickBest=quickRecords(data.sessions)[0]?.quickScore.points||0;}
      if(source.routinePolicy)next.active.autoMidi=true;
      await store.save(next);data=next;await reminders();readerMounted=false;readerBase=null;quiz=null;go('session');
      if (currentBlock()?.type === 'repertoire' && workHasScore(resource(currentBlock().workId))) await openScorePractice();
      await afterStart?.();
    } finally { startingPractice = false; }
  }
  function sessionPage() {
    if (!data.active) return home();
    return sessionMarkup(data, { readerDevices: reader.devices, totalMs: totalMs(), blockMs: blockMs(), metronomeRunning: !!metro, workName, workHasScore, workPlayable, icon });
  }
  async function commitSessionChange(change) {
    if (!data.active || sessionWriting) return false;
    sessionWriting = true;
    const scroll = root.querySelector('.cp-page')?.scrollTop || 0;
    const focus = document.activeElement?.closest('[data-session-minutes],[data-session-duration],[data-action]');
    const focusKey = focus?.dataset.sessionMinutes || focus?.dataset.sessionDuration;
    const focusSlider = focus?.hasAttribute('data-session-duration');
    const focusAction = focus?.dataset.action, focusId = focus?.dataset.id;
    try {
      // Freeze the live runtime before cloning; failed writes keep this paused checkpoint usable.
      pauseSession();
      data.active.currentMeasurement = measurement();
      if (readerMounted) data.active.readerSnapshot = reader.snapshot;
      const next = copy(data);
      await change(next);
      await store.save(next);
      const previousBlock = currentBlock(), nextBlock = next.active?.blocks[next.active.blockIndex];
      if (next.active?.id !== data.active.id || previousBlock?.id !== nextBlock?.id || previousBlock?.workId !== nextBlock?.workId) mediaCapture?.stop();
      resetBlockRuntime();
      data = next;
      await reminders();
      saveError = '';
      root.hidden = false;
      return true;
    } finally {
      sessionWriting = false;
      render();
      root.querySelector('.cp-page')?.scrollTo(0, scroll);
      const candidates = [...root.querySelectorAll('[data-session-minutes],[data-action]')];
      const replacement = candidates.find(el => focusKey ? (focusSlider ? el.dataset.sessionDuration : el.dataset.sessionMinutes) === focusKey : el.dataset.action === focusAction && el.dataset.id === focusId);
      if (replacement && !replacement.disabled && !dialog.open) replacement.focus({ preventScroll: true });
    }
  }
  async function changeSession(action) {
    return commitSessionChange(next => { next.active = editSession(next.active, action).active; });
  }
  // Choosing the piece of a repertoire block: time already spent without a piece stays with it; switching from
  // another piece keeps that piece's time as its own part. The chosen piece goes on the stand.
  async function pickSessionWork(workId) {
    const current = currentBlock(), work = data.works.find(w => w.id === workId && !w.trashedAt);
    if (!data.active || current?.type !== 'repertoire' || !work) return;
    if (work.libraryId && !manualPracticeState(catalogueRecords(library).find(r => r.piece_id === work.libraryId), executionFor(library, work.libraryId), library).playable) throw Error(ui('This score is not ready to practise.', 'Esta partitura todavía no está lista para practicar.'));
    const running = data.active.runningSince != null;
    const values = { workId: work.id, target: work.target ?? null, bpm: Math.max(30, Math.min(160, work.bpm || 60)), passage: work.passage || '' };
    const changed = await commitSessionChange(next => {
      const block = next.active.blocks[next.active.blockIndex];
      if (block.workId) next.active = editSession(next.active, { type: 'update', blockId: block.id, values }).active;
      else Object.assign(block, values);
      if (!isOnStand(work)) setWorkOnStand(next, work.id, true);
    });
    if (!changed) return;
    if (dialog.open) dialog.close();
    if (running && data.active) { data.active.runningSince = Date.now(); checkpoint(); updateClock(); render(); }
  }
  function editSessionBlock(id) {
    const index = data.active?.blocks.findIndex(item => item.id === id);
    if (index == null || index < data.active.blockIndex) return;
    const original = copy(data.active.blocks[index]);
    pauseSession(); render();
    showDialog(ui('Edit block', 'Editar bloque'), sessionBlockEditorMarkup(original, data), async f => {
      const values = readSessionBlockEditor(f, original, data);
      const work = data.works.find(item => item.id === (values.workId ?? original.workId));
      if ((values.type ?? original.type) === 'repertoire' && work?.libraryId && !manualPracticeState(catalogueRecords(library).find(r => r.piece_id === work.libraryId), executionFor(library, work.libraryId), library).playable) throw Error(ui('This score is not ready to practise.', 'Esta partitura todavía no está lista para practicar.'));
      if (await changeSession({ type: 'update', blockId: id, values })) dialog.close();
    });
    bindSessionBlockEditor(dialog.querySelector('form'), data);
  }
  function addSessionBlock() {
    if (!data.active) return;
    pauseSession(); render();
    const types = data.active.context === 'mobile' ? ['reading', 'technique'] : ['warmup', 'reading', 'technique', 'repertoire', 'free'];
    const works = data.works.filter(w => !w.trashedAt);
    const body = '<form id="session-add-form"><div class="cp-grid"><label>'+ui('Activity', 'Actividad')+'<select name="type">'+opts(types.map(type => [type, ACTIVITIES[type]]), 'reading')+'</select></label><label>'+ui('Minutes', 'Minutos')+'<input name="minutes" type="number" min="1" max="600" step="1" value="10" required></label></div><label data-session-target>'+ui('Scale or mode', 'Escala o modo')+'<select name="target">'+targets(TARGETS.some(t=>t.id===currentBlock()?.target) ? currentBlock().target : 'C-major')+'</select></label><label data-session-warmup hidden>'+ui('Exercises', 'Ejercicios')+'<select name="warmup">'+opts(warmupChoices(data), warmupChoices(data)[0][0])+'</select></label><label data-session-work hidden>'+ui('Work', 'Obra')+'<select name="workId"><option value="">'+ui('Choose when practising', 'Elegir al practicar')+'</option>'+opts(works.map(w => [w.id, w.title]), '')+'</select></label>'+formEnd(ui('Add block', 'Añadir bloque'))+'</form>';
    showDialog(ui('Add a block', 'Añadir un bloque'), body, async f => {
      const type = String(f.get('type'));
      if (!types.includes(type)) throw Error(ui('Choose an available activity.', 'Elige una actividad disponible.'));
      const work = works.find(w => w.id === f.get('workId'));
      if (type === 'repertoire' && work?.libraryId && !manualPracticeState(catalogueRecords(library).find(r => r.piece_id === work.libraryId), executionFor(library, work.libraryId), library).playable) throw Error(ui('This score is not ready to practise.', 'Esta partitura todavía no está lista para practicar.'));
      const added = type === 'warmup' ? block('warmup', { ...warmupBlockValues(data, String(f.get('warmup'))), minutes: Number(f.get('minutes')) }) : block(type, { ...practiceDefaults(data.preferences, type), minutes: Number(f.get('minutes')), target: type === 'repertoire' ? work?.target ?? null : String(f.get('target')), ...(type === 'repertoire' ? { workId: work?.id || '', bpm: work?.bpm || 60, passage: work?.passage || '' } : {}) });
      if (await changeSession({ type: 'add', block: added })) dialog.close();
    });
    const form = dialog.querySelector('form');
    form.elements.type.addEventListener('change', () => {
      const type = form.elements.type.value;
      form.querySelector('[data-session-target]').hidden = !['reading', 'technique'].includes(type);
      form.querySelector('[data-session-warmup]').hidden = type !== 'warmup';
      form.querySelector('[data-session-work]').hidden = type !== 'repertoire';
    });
  }
  async function switchSessionContext(context) {
    if (await commitSessionChange(next => {
      next.active = settleSuspendedBlocks(next.active);
      const s = next.active;
      finishBlock(s, s.currentMeasurement);
      s.blockIndex--;
      s.context = context;
      delete s.readerSnapshot; delete s.currentMeasurement;
    })) go('session');
  }
  async function openReader() {
    if(data.active?.autoMidi) { try { await reader.refreshMidi(); } catch {} const context=reader.devices.length?'midi':'piano';if(context!==data.active.context)await switchSessionContext(context); }
    const s=data.active,b=currentBlock();if(!s||!b)return;
    if(s.context==='midi'){try{await reader.refreshMidi();}catch(error){toast(ui('Could not open MIDI input: ', 'No se ha podido abrir la entrada MIDI: ')+localizeMessage(error.message));return;}}
    if(data.active!==s||currentBlock()!==b)return;
    if(s.context==='midi'&&!reader.devices.length){toast(ui("Connect MIDI or continue with manual tracking.", "Conecta el MIDI o elige continuar con registro manual."));return;}
    root.hidden=true;
    if(!readerMounted){readerBase=s.currentMeasurement||null;reader.configure(b,s.context,s.readerSnapshot);readerMounted=true;}else reader.show();
    if (!status.hidden) {
      clearTimeout(toastTimer); status.hidden = true; reader.notify(status.textContent);
    }
    document.body.dataset.context=s.context;
    $('#practice-title').textContent=`${b.quickPractice?ui('Quick practice','Práctica rápida'):ACTIVITIES[b.type]} · ${b.type==='warmup'?warmupSetLabel(warmupExercises(b).map(e=>e.id)):targetById(b.target).label}${s.context==='mobile'&&b.timing==='wait'?ui(' · No tempo', ' · Sin tempo'):''}`;
    $('#timing-mode').classList.toggle('quick-game-hud',!!b.quickPractice);
    $('#timing-mode').classList.remove('is-record');
    if(b.quickPractice)$('#timing-mode').innerHTML=quickHudMarkup(s.quickScore?.points||0,s.quickBest??quickRecords(data.sessions)[0]?.quickScore.points??0);
    const back=$('#practice-return');
    back.innerHTML=`<span aria-hidden="true">←</span><span class="practice-nav-label">${ui('Session','Sesión')}</span>`;
    back.setAttribute('aria-label',ui('Back to session','Volver a la sesión'));back.title=back.getAttribute('aria-label');
    back.onclick=()=>{if(s.quickScore){quickExitDialog();return;}hideReader();go('session');};
    if(s.quickScore){back.setAttribute('aria-label',ui('Finish or pause practice','Terminar o pausar práctica'));back.title=back.getAttribute('aria-label');}
    // The forward action names its actual destination: the next block or final feedback.
    const lastBlock=s.blockIndex>=s.blocks.length-1;
    const next=s.blocks[s.blockIndex+1],forward=$('#practice-advance');
    const forwardLabel=lastBlock?ui('Feedback','Valoración'):`${ui('Next','Siguiente')}: ${ACTIVITIES[next.type]}`;
    forward.innerHTML=`<span class="practice-nav-label">${esc(forwardLabel)}</span><span aria-hidden="true">→</span>`;
    forward.setAttribute('aria-label',forwardLabel);forward.title=forwardLabel;
    forward.onclick=()=>{hideReader();if(lastBlock)endSession();else nextBlock();};
    $('#practice-guide').hidden=b.type!=='warmup';$('#practice-guide').onclick=()=>{reader.pause();showWarmupGuide(b,true);};
    $('#practice-guide').setAttribute('aria-label',ui('How to play this warm-up','Cómo se toca este calentamiento'));$('#practice-guide').title=$('#practice-guide').getAttribute('aria-label');
    if(b.type==='warmup'&&!s.readerSnapshot&&!blockMs()){showWarmupGuide(b,true);updateClock();return;}
    reader.play();updateClock();
  }
  // Visual explanation of the warm-up; "Start" closes it and plays from the reader.
  function showWarmupGuide(b,start=false,index=readerMounted?reader.warmupIndex:0){
    const exercises=warmupExercises(b);if(!exercises.length)return;
    pauseSession();
    const i=Math.max(0,Math.min(exercises.length-1,index||0)),exercise=exercises[i];
    showDialog(ui('Warm-up', 'Calentamiento'),warmupGuideMarkup(exercise,{hand:b.hand,start,set:{index:i,exercises}}),null,true);
    const guide=dialog.querySelector('.cp-warmup-guide');
    dialogCleanup=bindWarmupGuide(guide,exercise,{hand:b.hand});
    guide.querySelectorAll('[data-warmup-step]').forEach(button=>button.addEventListener('click',()=>showWarmupGuide(b,start,Number(button.dataset.warmupStep))));
    guide.querySelector('[data-warmup-start]')?.addEventListener('click',()=>{dialog.close();reader.play();updateClock();});
  }
  function resetBlockRuntime() {
    reader.stop();readerMounted=false;readerBase=null;quiz=null;stopMetro();
    if(data.active){delete data.active.currentMeasurement;delete data.active.readerSnapshot;}
  }
  async function nextBlock() {
    mediaCapture?.stop();
    if (!data.active) return;
    if (data.active.blockIndex >= data.active.blocks.length - 1) { endSession(); return; }
    if (await commitSessionChange(next => {
      finishBlock(next.active, next.active.currentMeasurement);
      delete next.active.readerSnapshot; delete next.active.currentMeasurement;
      next.active = restoreCurrentRuntime(next.active);
    })) {
      go('session');
      if (currentBlock()?.type === 'repertoire' && workHasScore(resource(currentBlock().workId))) await openScorePractice();
    }
  }
  async function endSession() {
    if(data.active?.lessonPracticeEventId)return returnToLesson();
    await mediaCapture?.finishPractice();
    if(data.active?.quickScore)return quickExitDialog();
    if(!data.active)return;pauseSession();hideReader();go('session');
    const s=data.active;const remaining=s.blockIndex<s.blocks.length-1;
    const initialMinutes=(s.elapsedMs/60000).toFixed(2);
    showDialog(ui("Save what you practiced", "Guarda lo que has practicado"),`<form><p><b>${clock(s.elapsedMs)}${ui("</b> of practice · ", "</b> de práctica · ")}${CONTEXTS[s.context]}</p>${feedbackFields(s,data.works)}<label>${ui("Practice time (minutes)","Tiempo practicado (minutos)")}<input type="number" name="practicedMinutes" min="0" max="720" step="0.01" value="${initialMinutes}" required /></label><label class="check"><input name="partial" type="checkbox" ${remaining?'checked':''}${ui(" /> Save as a partial session</label>", " /> Guardar como sesión parcial</label>")}<div class="cp-save-actions"><div class="cp-save-main">${ui("<button type=\"submit\" class=\"primary\" value=\"save\">Save</button><button type=\"submit\" value=\"plan\">Save and schedule</button>", "<button type=\"submit\" class=\"primary\" value=\"save\">Guardar</button><button type=\"submit\" value=\"plan\">Guardar y planificar</button>")}</div><div class="cp-save-exits">${btn('close-dialog',ui("‹ Keep practicing", "‹ Seguir practicando"),'','quiet')}${btn('discard-session',ui("Finish without saving", "Terminar sin guardar"),'','danger quiet')}</div></div></form>`,async(f,form,submit)=>{
      const source={title:s.title,context:s.context,blocks:copy(s.blocks)};
      let saved;
      if (!await commitSessionChange(next => {
        next.active = settleSuspendedBlocks(next.active);
        saved = saveSession(next, next.active, {...readFeedback(f), partial:f.has('partial'), measurement:next.active.currentMeasurement});
        if (String(f.get('practicedMinutes')) !== initialMinutes) adjustPracticeTime(saved,Math.round(Number(f.get('practicedMinutes'))*60000));
        delete saved.readerSnapshot; delete saved.currentMeasurement; delete saved.blockRuntime;
      })) return;
      await reminders(); source.title=saved.title; dialog.close(); root.hidden=false; go('home');
      if(submit.value==='plan'){selectedDate=addDays(localDate(),1);planForm(null,source);}
    });
  }
  function quickExitDialog() {
    if(!data.active?.quickScore)return;
    pauseSession();
    showDialog(ui('Finish this practice?','¿Terminar esta práctica?'),`<div class="quick-exit"><p><strong>${data.active.quickScore.points}</strong> ${ui('points so far','puntos hasta ahora')}</p><p class="muted">${ui('Finish to save your score, or keep your place and continue later.','Termina para guardar tu puntuación o conserva tu progreso para continuar más tarde.')}</p><div class="quick-result-actions">${btn('quick-finish',ui('Finish and see score','Terminar y ver puntuación'),'','primary')}${btn('quick-later',ui('Continue later','Continuar más tarde'))}${btn('quick-continue',ui('Keep practising','Seguir practicando'),'','quiet')}</div></div>`);
  }
  async function endQuickPractice() {
    const previousBest=data.active.quickBest??quickRecords(data.sessions)[0]?.quickScore.points??0;
    pauseSession();hideReader();let saved;
    if(!await commitSessionChange(next=>{saved=saveSession(next,next.active,{measurement:next.active.currentMeasurement});delete saved.readerSnapshot;delete saved.currentMeasurement;delete saved.blockRuntime;}))return;
    resetBlockRuntime();root.hidden=false;go('home');
    showDialog(ui('Quick practice result','Resultado de práctica rápida'),quickResultMarkup(saved,previousBest));
  }
  function editSavedPractice(id) {
    const original=data.sessions.find(s=>s.id===id);if(!original)return;
    const results=copy(original.results);
    const row=(r,i)=>`<fieldset class="cp-block" data-saved-block="${i}"><legend>${i+1}. ${ACTIVITIES[r.block.type]}</legend><div class="cp-fields"><label>${ui('Minutes','Minutos')}<input name="saved-minutes-${i}" type="number" min="0" max="720" step="1" required value="${Math.floor(r.elapsedMs/60000)}"></label><label>${ui('Seconds','Segundos')}<input name="saved-seconds-${i}" type="number" min="0" max="59.999" step="0.001" required value="${(r.elapsedMs%60000)/1000}"></label></div>${r.block.type==='repertoire'?`<label>${ui('Worked score','Partitura trabajada')}<select name="saved-work-${i}">${opts([['',ui('No piece','Sin obra')],...data.works.filter(w=>!w.trashedAt||w.id===r.block.workId).map(w=>[w.id,w.title])],r.block.workId)}</select></label>`:''}<label>${ui('Passage or goal','Pasaje u objetivo')}<input name="saved-passage-${i}" maxlength="1000" value="${esc(r.block.passage)}"></label></fieldset>`;
    showDialog(ui('Edit completed practice','Editar práctica finalizada'),`<form id="saved-practice-form"><div id="saved-practice-blocks">${results.map(row).join('')}</div><label>${ui('New block','Nuevo bloque')}<select id="saved-block-type">${opts(['repertoire','free','reading','technique'].map(type=>[type,ACTIVITIES[type]]),'repertoire')}</select></label><button type="button" id="saved-block-add">${ui('Add block','Añadir bloque')}</button>${formEnd()}</form>`,async f=>{
      if(data.sessions.find(s=>s.id===id)!==original)throw Error(ui('This practice changed. Reopen the editor.','Esta práctica ha cambiado. Abre de nuevo el editor.'));
      const edited=results.map((r,i)=>({...r,elapsedMs:Number(f.get('saved-minutes-'+i))*60000+Math.round(Number(f.get('saved-seconds-'+i))*1000),block:{...r.block,passage:String(f.get('saved-passage-'+i)),...(r.block.type==='repertoire'?{workId:String(f.get('saved-work-'+i))}:{})}}));
      const next=copy(data);next.sessions[next.sessions.findIndex(s=>s.id===id)]=updateSavedPractice(original,edited,data.works);
      await store.save(next);data=next;await reminders();dialog.close();render();
    });
    dialog.querySelector('#saved-block-add').addEventListener('click',()=>{
      if(results.length>=30)return;
      const type=dialog.querySelector('#saved-block-type').value;
      const r={block:block(type,{minutes:5}),context:['repertoire','free'].includes(type)&&original.context==='mobile'?'piano':original.context,elapsedMs:300000,measurement:null,material:null};
      results.push(r);dialog.querySelector('#saved-practice-blocks').insertAdjacentHTML('beforeend',row(r,results.length-1));dialog.querySelector(`[name="saved-minutes-${results.length-1}"]`).focus();
    });
  }
  function sessionDetail() {
    const s=data.sessions.find(s=>s.id===detailId);if(!s)return myPiano();
    const lesson=s.lessonEventId&&findEvent(data.events,s.lessonEventId);
    return `${titleRow(esc(s.title),`${esc(dayLabel(s.date))} · ${resultText(s)}`)}${s.lessonEventId?`<div class="cp-actions">${lesson?btn('event-detail',ui('View lesson','Ver clase'),lesson.id):''}${lesson?btn('complete-lesson',ui('Edit completed lesson','Editar clase completada'),lesson.id):''}</div>${lesson?lessonRecordings(lesson):''}`:''}<div class="cp-card"><b class="cp-number">${clock(s.elapsedMs)}${ui("</b><p class=\"muted\">Practice time", "</b><p class=\"muted\">Tiempo de práctica")}${s.manual?ui(' · entered manually', ' · registrado manualmente'):''}</p>${s.results.map(r=>`<div class="cp-block"><h3>${s.lessonEventId?ui('Lesson','Clase'):ACTIVITIES[r.block.type]} · ${clock(r.elapsedMs)}</h3><p class="muted">${CONTEXTS[r.context]}${['reading','technique','theory'].includes(r.block.type)?` · ${esc(targetById(r.block.target).label)}`:''}${r.block.workId?` · ${esc(workName(r.block.workId))}`:''}${r.block.type==='repertoire'&&r.block.workId&&r.block.passage?` · ${ui("Part", "Parte")}: ${esc(r.block.passage)}`:''}</p>${r.measurement?`<p>${r.measurement.correct}${ui(" correct · ", " aciertos · ")}${r.measurement.wrong}${ui(" errors</p><p class=\"muted\">", " errores</p><p class=\"muted\">")}${{screen:ui("On-screen responses", "Respuestas en pantalla"),midi:ui("Notes received via MIDI", "Notas recibidas por MIDI"),quiz:ui("Theory question", "Pregunta de teoría")}[r.measurement.source]}${r.measurement.timing==='wait'?ui(' · No tempo', ' · Sin tempo'):''}${r.measurement.bpm?` · ${r.measurement.bpm}${ui(" BPM · Aids: ", " BPM · Ayudas: ")}${r.measurement.guide==='off'?ui("without guide", "sin guía"):ui("with guide", "con guía")}`:''}</p>`:ui("<p class=\"muted\">Manual entry · no automatic evaluation.</p>", "<p class=\"muted\">Registro manual · sin evaluación automática.</p>")}</div>`).join('')}${s.workIds?.length?`${ui("<h3>Practiced works</h3><p>", "<h3>Obras practicadas</h3><p>")}${s.workIds.map(id=>esc(workName(id))).join(" · ")}</p>`:""}${ui("<h3 style=\"margin-top:22px\">Comments and annotations</h3><p style=\"white-space:pre-wrap\">", "<h3 style=\"margin-top:22px\">Comentarios y anotaciones</h3><p style=\"white-space:pre-wrap\">")}${esc(s.notes||ui("No annotations.", "Sin anotaciones."))}${ui("</p><h3>Next step</h3><p style=\"white-space:pre-wrap\">", "</p><h3>Próximo paso</h3><p style=\"white-space:pre-wrap\">")}${esc(s.next||ui("You can decide in your next practice.", "Puedes decidirlo en tu siguiente práctica."))}</p><div class="cp-actions">${btn('repeat-session',ui("Prepare another session", "Preparar otra sesión"),s.id,'primary')}${btn('edit-saved-practice',ui('Edit practice','Editar práctica'),s.id)}${btn('edit-session-notes',ui("Edit feedback", "Editar valoración"),s.id)}${btn('delete-session',ui("Delete session", "Eliminar sesión"),s.id,'danger quiet')}</div></div>`;
  }
  function updateClock() {
    syncScreenAwake();
    document.querySelectorAll('[data-session-clock], #practice-clock').forEach(el=>{const value=clock(totalMs());if(el.textContent!==value)el.textContent=value;});
    document.querySelectorAll('[data-block-clock]').forEach(el=>{const value=clock(blockMs());if(el.textContent!==value)el.textContent=value;});
  }
  let historyThumbnails = null;
  function render() {
    const catalogueScroll = view === 'catalog' && root.querySelector('.cp-page')?.dataset.view === 'catalog' ? root.querySelector('.cp-page').scrollTop : 0;
    const catalogueInput = view === 'catalog' && document.activeElement?.id === 'catalogue-query' ? {value:document.activeElement.value,caret:document.activeElement.selectionStart} : null;
    historyThumbnails?.(); historyThumbnails = null;
    applyTheme(data.preferences.theme);
    if(libraryRoute(view)) libraryPane=libraryRoute(view);
    sessionDrag?.destroy(); sessionDrag = null;
    setMidiContext(view === 'prepare' ? draft?.context : data.active?.context || null);
    syncScreenAwake();
    if(root.hidden)return;
    if(view==='prepare') materialSelection=null;
    const section=['settings'].includes(view)||view.startsWith('profile-')?'settings':['progress','progress-time','session-detail','calendar'].includes(view)?'progress':view==='instrument'?'instrument':['calendar','event','planner'].includes(view)?'calendar':['practice','prepare','session','routines'].includes(view)?'practice':view==='home'?'home':'piano';
    const pages={home,practice,calendar,planner:()=>plannerMarkup(data,selectedDate),piano:myPiano,multimedia,progress,'progress-time':progressTime,repertoire,work:workDetail,routines,catalog,'library-detail':()=>libraryDetailMarkup(library,detailId,!!materialSelection,getAppLanguage(),libraryRepertoire()),downloads:()=>downloadMarkup(data,native,library),settings:settingsPage,'profile-practice':()=>practicePreferencesMarkup(data.preferences,getAppLanguage()),'profile-backup':backupPage,'profile-files':()=>scoreFilesMarkup(profileFiles,{search:fileSearch,limit:fileLimit,lang:getAppLanguage()}),'profile-reminders':()=>remindersMarkup(reminderState,remindersAvailable,getAppLanguage(),data.preferences),instrument:()=>'<section class="cp-profile">'+profileHeading(ui("Instrument", "Instrumento"),getAppLanguage())+instrumentMarkup(instrument.state,{lang:getAppLanguage()})+'</section>',prepare:preparePage,session:sessionPage,'session-detail':sessionDetail,event:eventDetail};
    root.innerHTML=`<header class="cp-app-header"><div class="cp-header-profile"></div><div class="cp-header-middle"><div class="cp-header-title"></div></div><div class="cp-header-status"><span data-sync-indicator>${syncIndicatorMarkup(cloud?.state,mediaSync?.state)}</span><button type="button" class="cp-midi-status quiet" data-action="midi-settings" aria-label="${ui('MIDI instrument', 'Instrumento MIDI')}" title="${ui('MIDI instrument', 'Instrumento MIDI')}">${midiIndicatorMarkup()}</button></div></header><div class="cp-page${!materialSelection&&['home','practice','calendar','piano','repertoire','catalog','multimedia','library-detail','work','progress','progress-time','settings','profile-backup','profile-files','profile-reminders','event','downloads'].includes(view)?' cp-browse-surface':''}" data-view="${view}"><div class="cp-content">${saveError?`<p role="alert" class="cp-notice">${saveError}</p>`:''}${!['session','home','practice','calendar','piano','repertoire','catalog','multimedia','library-detail','work','downloads','progress','progress-time'].includes(view)?pendingSessionMarkup(data.active):''}${['home','profile-backup'].includes(view)?storageUI?.entryMarkup()||'':''}${(pages[view]||home)()}</div></div>${profileNavigation(icon,data.preferences.name,section,data.preferences.photo,!!data.active)}`;
    if (view === 'free-practice') {
      root.querySelector('.cp-content').innerHTML = freePracticeMarkup(data.active, blockMs(), !!metro);
      root.querySelectorAll('.cp-nav [aria-current]').forEach(el=>el.removeAttribute('aria-current'));
      root.querySelector('.cp-nav [data-action=practice]')?.setAttribute('aria-current','page');
    }
    const heading = root.querySelector('.cp-content h1');
    if(libraryRoute(view)) root.querySelector('.cp-page').insertAdjacentHTML('afterbegin',libraryNavigation());
    const profile=root.querySelector('.cp-nav .cp-profile-nav');
    if(profile)root.querySelector('.cp-header-profile').append(profile);
    if(heading){heading.title=heading.textContent;root.querySelector('.cp-header-title').append(heading);}
    (heading?.closest('.cp-row,.cp-dashboard-heading,.cp-profile-heading') || heading)?.classList.add('cp-page-heading');
    if(materialSelection && ['catalog','library-detail','downloads'].includes(view)) root.querySelector('.cp-content').insertAdjacentHTML('afterbegin',`${ui("<section class=\"cp-notice\"><b>Choose a score</b><p>Your practice is kept. Download a score and choose “Use in this practice”. The practice will use “With piano”.</p>", "<section class=\"cp-notice\"><b>Elige una partitura</b><p>Conservamos tu práctica. Descarga una partitura y pulsa «Usar en esta práctica». Se utilizará el modo «Con piano».</p>")}${btn('return-to-preparation',ui("Back to practice", "Volver a la práctica"),'','quiet')}</section>`);
    if(root.querySelector('.cp-history-card')) historyThumbnails=bindScoreThumbnails(root.querySelector('.cp-content'),store);
    if(view==='downloads')updateDownloadProgress([...data.downloadJobs,...Object.entries(library.executions).filter(([,e])=>e.job).map(([id,e])=>({...e.job,catalogId:id}))]);
    if(view === 'catalog' && $('#library-search')) {
      const page = root.querySelector('.cp-page'), form = $('#library-search');
      page.scrollTop = catalogueScroll;
      const search = () => {
        clearTimeout(catalogueSearchTimer);
        if(view !== 'catalog' || !form.isConnected)return;
        const input = form.elements.query, focused = document.activeElement === input, caret = input.selectionStart;
        libraryFilters = Object.fromEntries(new FormData(form)); libraryFormDraft = null; libraryPage = 0;
        render(); root.querySelector('.cp-page').scrollTop = 0;
        if(focused) { const next=$('#catalogue-query'); next.focus({preventScroll:true}); next.setSelectionRange(caret,caret); }
      };
      form.addEventListener('submit', event => { event.preventDefault(); search(); });
      form.addEventListener('input', event => { if(event.target.name === 'query') { clearTimeout(catalogueSearchTimer); catalogueSearchTimer=setTimeout(search,180); } });
      form.addEventListener('change', event => { if(event.target.name && event.target.name !== 'query')search(); });
      if(catalogueInput) { const input=form.elements.query;input.value=catalogueInput.value;input.focus({preventScroll:true});input.setSelectionRange(catalogueInput.caret,catalogueInput.caret);if(input.value !== (libraryFilters.query || '')) {clearTimeout(catalogueSearchTimer);catalogueSearchTimer=setTimeout(search,180);} }
      page.addEventListener('scroll', () => {
        if(page.scrollHeight-page.scrollTop-page.clientHeight<350) page.querySelector('[data-action=library-more]')?.click();
      }, {passive:true});
    }
    if (view === 'session' && data.active) sessionDrag = bindSessionDrag(root.querySelector('.cp-session'), { change: changeSession, pickup: pauseSession, cancelled: render, report: toast });
    if(view==='prepare'&&preparePurpose==='routine') sessionDrag=bindSessionDrag(root.querySelector('.cp-routine-builder'),{change:changeRoutineBlocks,pickup:readDraft,cancelled:()=>{},report:toast});
    if(view==='planner')bindPlanner($('#weekly-plan-form'),()=>data,saveWeek);
    if(view==='multimedia') {
      const page=root.querySelector('.cp-page');
      page.addEventListener('scroll',()=>{
        if(page.scrollHeight-page.scrollTop-page.clientHeight<500)root.querySelector('[data-action=media-more]')?.click();
      },{passive:true});
    }
    if(view==='calendar') {
      const content=root.querySelector('.cp-content');content.dataset.calendar='true';
      if(calendarMode==='week') {
        const page=root.querySelector('.cp-page');
        page.addEventListener('scroll',()=>{
          if(page.scrollHeight-page.scrollTop-page.clientHeight>500)return;
          const agenda=content.querySelector('.cp-week-agenda');
          const nextStart=addDays(weekOf(selectedDate),calendarWeekCount*7);
          const fragment=document.createElement('template');
          fragment.innerHTML=weekAgendaMarkup(data,selectedDate,sessionOptions(),2,nextStart);
          agenda.append(...fragment.content.querySelector('.cp-week-agenda').children);
          calendarWeekCount+=2;
          historyThumbnails?.();
          historyThumbnails=bindScoreThumbnails(content,store);
        },{passive:true});
      }
      bindCalendarDrag(content,async(id,date,offset)=>{
        const next=copy(data), plan=next.plans.find(p=>p.id===id);
        if(!plan || plan.status!=='planned' || data.active?.planId===id) throw Error(ui("Only pending practices can be moved. Finish the active practice first.", "Solo puedes mover prácticas pendientes. Termina primero la sesión activa."));
        const target=date || addDays(plan.date,offset);
        if(target===plan.date)return;
        plan.date=target;await store.save(next);data=next;await reminders();selectedDate=target;render();toast(ui("Practice moved. Only this appointment changed.", "Práctica reprogramada. Solo ha cambiado esta cita."));
      },toast);
    }
    $('#preferences-form')?.addEventListener('submit',async e=>{
      e.preventDefault();const f=new FormData(e.target),next=copy(data);
      next.preferences={...data.preferences,context:f.get('context'),practiceDefaults:Object.fromEntries(['reading','technique'].map(type=>[type,{hand:String(f.get(type+'-hand')),bpm:Number(f.get(type+'-bpm'))}])),warmup:{enabled:f.get('warmup-enabled')==='on',minutes:Number(f.get('warmup-minutes')),exercise:String(f.get('warmup-exercise'))}};
      const submit=e.submitter;if(submit)submit.disabled=true;
      try{await store.save(next);data=next;e.target.removeAttribute('data-edited');toast(ui("Preferences saved.", "Preferencias guardadas."));}catch{toast(ui("Could not save changes.", "No se han podido guardar los cambios."));}finally{if(submit)submit.disabled=false;}
    });
    $('#prepare-form')?.addEventListener('submit',async e=>{e.preventDefault();if(!validDraft())return;try{if(preparePurpose==='routine')await saveRoutineDraft();else if(preparePurpose==='edit-plan')planForm(data.plans.find(p=>p.id===draft.id),draft);else if(preparePurpose==='plan')planForm();else await startSession(draft);}catch(e){toast(e.message);}});
    if(view==='prepare')requestAnimationFrame(revealStandSelection);
  }

  function revealStandSelection() {
    for(const row of root.querySelectorAll('.cp-practice-stand')) {
      const selected=row.querySelector('[aria-pressed=true]');if(!selected)continue;
      const card=selected.getBoundingClientRect(),bounds=row.getBoundingClientRect();
      if(card.left<bounds.left)row.scrollLeft+=card.left-bounds.left-3;
      else if(card.right>bounds.right)row.scrollLeft+=card.right-bounds.right+3;
    }
  }

  const downloads=createDownloads({getData:()=>data,store,platform:{downloadPDF,networkStatus},persist,isVisible:()=>!document.hidden&&!scoreViewer&&!openingScore,changed:progressOnly=>{
    if(progressOnly)updateDownloadProgress(data.downloadJobs);else if(['downloads','catalog'].includes(view))render();
  }});
  const libraryDownloads = createLibraryDownloads({ getLibrary: () => library, setLibrary: value => { library = value; }, store, getData: () => data, platform: { downloadScore, networkStatus }, isVisible: () => !document.hidden && !scoreViewer && !openingScore,
    changed: progressOnly => { if (progressOnly) updateDownloadProgress(Object.entries(library.executions).filter(([,e])=>e.job).map(([id,e])=>({...e.job,catalogId:id}))); else if (['catalog','library-detail','downloads'].includes(view)) render(); } });
  const pauseTransfers = async () => { await downloads.pauseAll(); await libraryDownloads.pauseAll(); };
  async function printStoredScore(id, fromLibrary=false) {
    if(openingScore)return;
    openingScore=true;
    try {
      await pauseTransfers();pauseSession();
      const work=fromLibrary?null:resource(id),libraryId=fromLibrary?id:work?.libraryId;
      const assetId=libraryId?executionFor(library,libraryId).assetId:work?.assetId;
      const asset=assetId&&await store.asset(assetId);
      if(!asset)throw new Error(ui('Add or download the score again.','Vuelve a añadir o descargar la partitura.'));
      const {printScoreAsset}=await import('./asset-print.js');
      const title=work?.title||catalogueRecords(library).find(record=>record.piece_id===libraryId)?.display_title||asset.name||'Score';
      await printScoreAsset(asset,title);
    } finally { openingScore=false; }
  }
  async function previewCatalogue(id) {
    const pdf = CATALOG.find(item => item.id === id), record = catalogueRecords(library).find(item => item.piece_id === id);
    if(!pdf && !record)return;
    pauseSession();
    const title = pdf?.title || record.display_title, controller = new AbortController();
    showDialog(title, `<p class="muted">${pdf ? ui('First page · PDF','Primera página · PDF') : ui('Opening excerpt · MusicXML','Primeros compases · MusicXML')}</p><div class="cp-catalogue-preview" data-catalogue-preview aria-busy="true"><p role="status">${ui('Loading preview…','Cargando vista previa…')}</p></div><div class="cp-actions">${btn('catalogue-save-preview',ui('Download score','Descargar partitura'),id,'quiet')}</div><p class="muted">${esc(pdf?.licenseLabel || record.rights.attribution)}</p>`);
    const target=dialog.querySelector('[data-catalogue-preview]');
    dialogCleanup=()=>controller.abort();
    try {
      const execution=executionFor(library,id), saved=pdf ? data.downloads.find(item=>item.catalogId===id) : null;
      const assetId=pdf ? saved?.assetId || data.works.find(work=>work.catalogId===id)?.assetId : execution.assetId;
      let asset=pdf ? {format:'pdf',previewURL:new URL(`catalogue-previews/pdf/${pdf.id}.png`,document.baseURI).href} : assetId && await store.asset(assetId);
      if(!asset) {
        {
          const descriptor=acquisitionCandidates(library,record)[0];
          if(!descriptor)throw Error(ui('No downloadable score is available.','No hay una partitura disponible para descargar.'));
          const receipt=await downloadScore(descriptor.download_url,{id:`preview-${id}`,wifiOnly:data.preferences.wifiOnly,signal:controller.signal});
          if(!receipt.complete)throw Error(receipt.error);
          asset={format:descriptor.format,base64:receipt.base64};
        }
      }
      if(controller.signal.aborted)return;
      const {renderCataloguePreview}=await import('./catalogue-preview.js');
      await renderCataloguePreview(target,asset,{signal:controller.signal});
    } catch(error) {
      if(!controller.signal.aborted && target.isConnected)target.innerHTML=`<p role="alert">${esc(localizeMessage(error.message))}</p>${btn('preview-transfer-settings',ui('Download settings','Ajustes de descarga'),'','quiet')}`;
    } finally { if(target.isConnected)target.removeAttribute('aria-busy'); }
  }
  async function previewLibrary(id, segmentId = null, session = null) {
    if (openingScore || scoreViewer) return;
    openingScore = true;
    try {
      await pauseTransfers();
      const e = executionFor(library, id), asset = await ensureScoreAsset(e.assetId), segment = e.segments?.find(s => s.segment_id === segmentId);
      if (!asset || !e.selection?.length || segmentId && !segment) throw new Error(ui("Validate a score and select its piano parts before previewing.", "Valida la partitura y selecciona sus partes de piano antes de abrirla."));
      if (!session) pauseSession();
      const { openMusicScore } = await import('./musicxml-viewer.js');
      let alreadyClosed = false;
      const controller = await openMusicScore({ asset, selection: e.selection, start: segment?.start_measure_index || 0, end: segment?.end_measure_index_exclusive ?? e.analysis.metrics.measure_count ?? e.parts.find(p => p.id === e.selection[0]).measures, session,
        saveMarks: async musicxmlMarks => { const current=await store.asset(e.assetId);if(!current)throw new Error('Score unavailable');await store.putAsset({...current,musicxmlMarks}); },
        onRendered: async () => { const stamp = { sha256: e.sha256, configHash: e.configHash, version: RENDERER_VERSION }; await libraryDownloads.update(id, segmentId ? { segmentRenders: { ...e.segmentRenders, [segmentId]: stamp } } : { render: stamp }); },
        onClose: () => { alreadyClosed = true; scoreViewer = null; if(data.active?.lessonPracticeEventId) void returnToLesson().catch(error=>toast(error.message)); else {render(); updateClock();} },
      });
      if (!alreadyClosed) scoreViewer = controller;
    } catch (error) {
      if (session?.read().running) await session.toggle();
      throw error;
    } finally { openingScore = false; }
  }
  async function practiceLibrary(id) {
    const record = catalogueRecords(library).find(r => r.piece_id === id), e = executionFor(library, id);
    if (!manualPracticeState(record, e, library).playable) throw new Error(ui("This edition is not ready for practice.", "Esta edición aún no está lista para practicar."));
    let work = data.works.find(w => w.libraryId === id);
    if (!await store.asset(e.assetId)) throw Error(ui("The local score is missing. Download or attach it before selecting it.", "No se encuentra la partitura local. Descárgala o impórtala antes de seleccionarla."));
    if (!work) { work = { id: uid(), libraryId: id, title: record.display_title.slice(0, 200), composer: record.known_metadata.composer || '', stage: STAGES[0], target: null, bpm: 60, passage: '', notes: '', assetId: e.assetId, assetFormat: 'musicxml', onStand: true }; const next=copy(data);next.works.push(work);await store.save(next);data=next; }
    if(work.trashedAt){const next=copy(data);setWorkTrashed(next,work.id,false);await store.save(next);data=next;work=data.works.find(w=>w.id===work.id);}
    if (materialSelection) { usePracticeMaterial(work); return; }
    prepare('repertoire', { title: work.title, context: 'piano', blocks: [block('repertoire', { workId: work.id, target: null, passage: work.passage, bpm: work.bpm, minutes: DEFAULT_PRACTICE_MINUTES })] });
  }
  function usePracticeMaterial(work) {
    const selection=materialSelection;
    if(!selection)throw Error(ui("Open the catalogue from practice preparation first.", "Abre primero el catálogo desde la preparación de la práctica."));
    draft=copy(selection.draft);preparePurpose=selection.purpose;selectedDate=selection.date;
    const previous=selection.index==null?null:draft.blocks[selection.index];
    const chosen=block('repertoire',{...(previous||{minutes:5,bpm:work.bpm||60}),type:'repertoire',workId:work.id,target:work.target,passage:work.passage||''});
    if(selection.index==null){const total=practiceMinutes(draft.blocks);draft.blocks.push(chosen);draft.blocks=resizePractice(draft.blocks,total);}else draft.blocks[selection.index]=chosen;
    if(draft.context==='mobile')draft.context='piano';
    materialSelection=null;go('prepare');toast(ui("Score added to your practice. Existing blocks have been kept.", "Partitura añadida a tu práctica. Se conservan los bloques existentes."));
  }
  const libraryUI = createLibraryUI({ getLibrary: () => library, setLibrary: value => { library = value; }, store, downloads: libraryDownloads, showDialog, dialog, render, toast, go, preview: previewLibrary, practice: practiceLibrary, pauseTransfers });
  if (cloudAvailable()&&!recoveredNotebook) {
    let lastCloudKey='',lastProfileCloud='',adoptedScroll=0;
    cloud = createNotebookCloud({ retireProvider:true,delay:30000,dirtyDelay:1500,adapter:cloudTransport, snapshot: () => store.export(data), eligible: () => !storageManager?.state.busy && !completeBackupBusy && !document.hidden && !downloads.busy && !libraryDownloads.busy && !restoringBackup && !importingScore && !sessionWriting && !startingPractice,
      canApply: () => !mediaCapture?.busy && !cloudApplyBlocker({active:data.active,allowPausedPractice:cloudTransport.transport==='drive'&&!root.hidden&&!['session','free-practice'].includes(view)&&!sessionDrag?.active,startingPractice,dialog:connectionFeedback&&dialog.querySelector('[data-drive-progress]')?{open:false}:dialog,scoreViewer,openingScore,document}),
      applyBlocker: () => mediaCapture?.busy ? 'Finish the recording first.' : cloudApplyBlocker({active:data.active,allowPausedPractice:cloudTransport.transport==='drive'&&!root.hidden&&!['session','free-practice'].includes(view)&&!sessionDrag?.active,startingPractice,dialog:connectionFeedback&&dialog.querySelector('[data-drive-progress]')?{open:false}:dialog,scoreViewer,openingScore,document}),
      readBase: () => store.syncBase(), saveBase: value => store.saveSyncBase(value),
      apply: async (text, syncBase) => { adoptedScroll=root.querySelector('.cp-page')?.scrollTop||0;root.inert=true;sessionWriting=true; try { const incoming=JSON.parse(text);if(cloudTransport.transport==='drive'){incoming.data.active=copy(data.active);for(const key of ['theme','wifiOnly','notificationsEnabled','practiceSuggestions'])incoming.data.preferences[key]=data.preferences[key];}if(incoming.library)incoming.library.report=library.report; text=JSON.stringify(incoming);
        data = await store.restore(text, { syncBase }); library=await store.library();reader.refreshSavedState?.();setAppLanguage(data.preferences.language);reader.setLanguage?.(getAppLanguage());await refreshProfileFiles();await reminders(); } finally {root.inert=false;sessionWriting=false;} },
      adopted: () => {render();root.querySelector('.cp-page')?.scrollTo(0,adoptedScroll);mediaSync?.markDirty();},
      changed: () => { refreshSyncIndicator();const panel=document.querySelector('#cloud-backup'),visible=cloud.state,key=JSON.stringify([getAppLanguage(),visible.transport,visible.status,visible.name,visible.enabled,visible.account,visible.syncFormat,visible.error,visible.lastWrittenAt,visible.waitReason,visible.status==='writing'?visible.progress:null]);if(panel&&lastCloudKey!==key){replaceHelpMarkup(panel,cloudBackupMarkup(visible,cloudOptions()));lastCloudKey=key;}const checked=panel?.querySelector('[data-cloud-checked]');if(checked){checked.hidden=!visible.lastCheckedAt||visible.status!=='saved';checked.textContent=driveLastCheck(visible,getAppLanguage());}const profileState=JSON.stringify([cloud.state.status,cloud.state.enabled,cloud.state.transport,cloud.state.name,cloud.state.account]);if(view==='settings'&&profileState!==lastProfileCloud){lastProfileCloud=profileState;const scroll=root.querySelector('.cp-page')?.scrollTop||0;render();root.querySelector('.cp-page')?.scrollTo(0,scroll);} } });
    if(driveNotebookAvailable()&&mediaStore){
      mediaSync=createMediaSync({store:mediaStore,connection:async context=>{await storageManager?.refresh();return connectDriveMedia({...context,folderId:storageManager?.state.config?.mediaFolder});},
        getContext:()=>{const state=cloud.state;return state.transport==='drive'&&state.account?.id&&state.notebookId&&state.enabled?{accountId:state.account.id,notebookId:state.notebookId,works:data.works.filter(w=>!w.trashedAt),wifiOnly:readMediaWifiOnly(data.preferences.wifiOnly)}:null;},
        eligible:()=>!storageManager?.state.busy&&!completeBackupBusy&&cloud.state.status==='saved'&&!document.hidden&&!mediaCapture?.busy&&!data.active&&!dialog.open&&!scoreViewer&&!openingScore&&!cloud.busy&&!downloads.busy&&!libraryDownloads.busy&&!restoringBackup,
        network:networkStatus,changed:()=>{refreshSyncIndicator();const panel=document.querySelector('#cloud-media');if(panel)replaceHelpMarkup(panel,mediaSyncMarkup(mediaSync.state,cloudOptions()));},
        refreshed:async()=>{mediaRecords=await mediaStore.index();if(['multimedia','work','progress','event','session-detail','calendar'].includes(view))render();}});
      mediaStore.onChange(()=>mediaSync.markDirty());
    }
    store.onChange(() => cloud.markDirty());
    CloudBackup.addListener('setupComplete', () => { if (!cloud.busy) cloud.init().catch(error => toast(error.message)); });
  }
  if(driveNotebookAvailable()&&mediaStore&&!recoveredNotebook){
    const deviceKey='spino.backup-device.id',deviceId=localStorage.getItem(deviceKey)||crypto.randomUUID();localStorage.setItem(deviceKey,deviceId);
    const deviceName=localStorage.getItem('spino.backup-device.name')||('Android · '+deviceId.slice(0,6));
    storageManager=createDriveStorage({drive:cloudTransport.drive,deviceId,deviceName,snapshot:()=>store.export(data),completeSnapshot:completeNotebookText,mediaStore,mediaClient:connectDriveMedia,network:networkStatus,
      eligible:(manual=false)=>!document.hidden&&!cloud?.busy&&!mediaSync?.busy&&!mediaCapture?.busy&&!data.active&&!downloads.busy&&!libraryDownloads.busy&&!restoringBackup&&(manual||!dialog.open)&&cloud?.state.status==='saved',changed:()=>{}});
    storageUI=createStorageUI({manager:storageManager,showDialog,dialog,formEnd,toast,refresh:async()=>{await refreshMedia();if(['home','profile-backup'].includes(view))render();},exportZip:exportCompleteZip,restoreZip:importCompleteZip,
      downloadCopy:async file=>reviewCompleteZip(await downloadArchive({accountId:storageManager.link().accountId,file})),cloud,deviceName,connect:()=>openDriveNotebooks(),canNotify:()=>!data.active&&!dialog.open&&!scoreViewer&&!openingScore});
    setInterval(async()=>{if(cloud?.state.transport==='drive'&&cloud.state.enabled&&!cloud.busy&&!mediaSync?.busy&&!storageManager.state.busy&&!completeBackupBusy&&!data.active&&!dialog.open&&!document.hidden){try{await cloudTransport.drive.prepareCheckpoint();}catch{/* Optional accelerator: synchronization keeps its verified original records. */}await storageManager.daily();}},60000);
  }
  async function completeZip(){
    if(mediaCapture?.busy||cloud?.busy||mediaSync?.busy||data.active)throw Error(ui('Finish practice and transfers before creating a complete backup.','Termina la práctica y las transferencias antes de crear una copia completa.'));
    if(storageManager&&cloud?.state.transport==='drive'&&cloudTransport.drive.storageLink()?.id)return (await storageManager.complete()).blob;
    return createCompleteBackup({text:await completeNotebookText(),records:await mediaStore.index(),load:row=>mediaStore.get(row.id)});
  }
  async function saveZip(blob,name){
    const file=new File([blob],name,{type:'application/zip'});
    if(StorageCapacitor.getPlatform()==='android')return shareNativeRecording(file,storagePlugin('MediaShare'),{title:'Spino backup',dialogTitle:ui('Save complete backup','Guardar copia completa')});
    const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async function exportCompleteZip(){
    showDialog(ui('Export complete ZIP','Exportar ZIP completo'),`<form><p>${ui('Includes notebook, scores and all available recordings. Missing files are downloaded from Drive. Mobile data may be used.','Incluye cuaderno, partituras y todas las grabaciones disponibles. Los archivos que falten se descargarán de Drive. Puede usar datos móviles.')}</p><p>${ui('Beta limit: 250 MB per complete archive. An incomplete copy is never marked complete.','Límite de esta beta: 250 MB por archivo completo. Nunca se marca una copia incompleta como completa.')}</p>${formEnd(ui('Prepare ZIP','Preparar ZIP'))}</form>`,async()=>{completeBackupBusy=true;try{const blob=await transferFeedback(ui('Preparing complete backup','Preparando copia completa'),()=>completeZip());await saveZip(blob,'Spino-'+new Date().toISOString().replace(/[:.]/g,'-')+'.zip');dialog.close();}finally{completeBackupBusy=false;}});
  }
  async function importCompleteZip(){
    const input=document.createElement('input');input.type='file';input.accept='.zip,application/zip';input.hidden=true;document.body.append(input);input.onchange=async()=>{try{if(input.files[0])await reviewCompleteZip(input.files[0]);}catch(e){toast(e.message);}finally{input.remove();}};input.addEventListener('cancel',()=>input.remove(),{once:true});input.click();
  }
  async function reviewCompleteZip(blob){
    const value=await transferFeedback(ui('Checking backup','Comprobando copia'),()=>inspectCompleteBackup(blob));
    showDialog(ui('Restore a separate copy','Restaurar una copia separada'),`<form><p>${value.backup.data.sessions.length} ${ui('sessions','sesiones')} · ${value.records.length} ${ui('verified recordings','grabaciones verificadas')}</p><p>${ui('Your current notebook and recordings will remain intact. The restored copy opens without cloud synchronization. You can return to the original notebook.','Tu cuaderno y grabaciones actuales se conservarán intactos. La copia restaurada se abre sin sincronización en la nube. Podrás volver al cuaderno original.')}</p>${formEnd(ui('Restore separate copy','Restaurar copia separada'))}</form>`,async()=>{await transferFeedback(ui('Recovering notebook','Recuperando cuaderno'),async()=>{const id='spino-recovery-'+crypto.randomUUID(),target=await openStore(id),media=await openMediaStore(id+'-media');await target.restore(value.text);for(const r of value.records)await media.importRemote(r,'restored',true);media.close();localStorage.setItem('spino.recovered-notebook',id);location.reload();});});
  }
  function backupExportOptions(converting) {
    showDialog(ui(converting?'Convert a backup':'Export a backup',converting?'Convertir una copia':'Exportar una copia'),`<form><p>SPino · ${esc(APP_VERSION)}</p><p>${ui('Exports the notebook and scores from this installation. Missing scores download from Drive and may use mobile data. Audio and video are separate.','Exporta el cuaderno y las partituras de esta instalación. Las partituras pendientes se descargan de Drive y pueden usar datos móviles. Audio y vídeo van aparte.')}</p><label>${ui('Backup format','Formato de copia')}<select name="format"><option value="1">${ui('Compatible copy · JSON format 1','Copia compatible · formato JSON 1')}</option><option value="2">${ui('Organized copy · JSON format 2','Copia organizada · formato JSON 2')}</option></select></label>${moreInfo(`<p>${ui('Repertoire, practice history, scores, annotations and score views are included in one portable file.','El repertorio, el historial, las partituras, las anotaciones y sus vistas se incluyen en un único archivo portátil.')}</p><p>${ui('Format 2 requires a compatible version of SPino. Conversion keeps the original file.','El formato 2 requiere una versión compatible de SPino. La conversión conserva el archivo original.')}</p>`)}<label class="check" data-format-warning hidden><input name="compatibility" type="checkbox"/>${ui('I understand that older versions cannot open the format 2 copy.','Entiendo que las versiones anteriores no pueden abrir la copia en formato 2.')}</label>${formEnd(ui(converting?'Choose and convert a copy':'Export',converting?'Elegir y convertir una copia':'Exportar'))}</form>`,async(f)=>{
      if(downloads.busy||libraryDownloads.busy||(cloud?.busy&&cloud.state.enabled))throw new Error(ui('Pause transfers before exporting or converting a backup.','Pausa las transferencias antes de exportar o convertir una copia.'));
      const format=Number(f.get('format'));if(format===2&&!f.has('compatibility'))throw new Error(ui('Confirm the format compatibility warning.','Confirma el aviso de compatibilidad del formato.'));
      pauseSession();let original;if(converting){original=await importFile();if(!original)return;}else{await persist();original=await completeNotebookText();}
      const text=convertBackup(original,format),result=await exportFile(backupExportName(APP_VERSION,format,{converting}),text);if(result?.cancelled)return;
      if(!converting){data.lastBackup=new Date().toISOString();await persist();render();}dialog.close();toast(ui('Backup saved with repertoire, scores and annotations.','Copia guardada con repertorio, partituras y anotaciones.'));
    });
    const select=dialog.querySelector('[name=format]'),warning=dialog.querySelector('[data-format-warning]'),check=warning.querySelector('input');select.addEventListener('change',()=>{warning.hidden=select.value!=='2';check.required=select.value==='2';});
  }
  function reviewBackupRestore(text) {
    if(mediaCapture?.busy)throw Error(ui('Finish the recording before restoring a notebook.','Termina la grabación antes de restaurar un cuaderno.'));
    const inspection = inspectBackup(text), backup = inspection.backup, counts = backupCounts(backup);
    pendingRestore = inspection.text;
    restoringBackup = true;
    confirm(ui('Restore this backup', 'Restaurar esta copia'), ui(
      `${inspection.converted ? "This organized copy will be converted to the supported notebook format before restoration. Its original file is kept. " : ""}${counts.annotatedScores} annotated scores (${counts.marks} marks). ${backup.data.sessions.length} sessions, ${backup.data.works.length} works, ${backup.data.plans.length} plans and ${backup.assets.length} scores. This will replace the notebook in this app installation. Export a backup first if you want to keep it. Automatic backup will be disconnected; existing cloud files will remain.`,
      `${inspection.converted ? "Esta copia organizada se convertirá al formato de cuaderno compatible antes de restaurarla. El archivo original se conserva. " : ""}${counts.annotatedScores} partituras anotadas (${counts.marks} anotaciones). ${backup.data.sessions.length} sesiones, ${backup.data.works.length} obras, ${backup.data.plans.length} planes y ${backup.assets.length} partituras. Se reemplazará el cuaderno de esta instalación. Exporta primero una copia si quieres conservarlos. Se desconectará la copia automática; los archivos existentes en la nube se conservarán.`
    ), async () => {
      await cloud?.disconnect(); await store.restore(pendingRestore); data = backup.data; await reminders(); location.reload();
    });
    dialog.addEventListener('close', () => { restoringBackup = false; }, { once: true });
  }
  async function catalogWork(id, onStand=false) {
    const source=CATALOG.find(c=>c.id===id);if(!source)return;const item=catalogPresentation(source);
    let w=data.works.find(w=>w.catalogId===id);
    if(!w){w={id:uid(),catalogId:id,title:item.title,composer:item.composer,stage:STAGES[0],notes:item.reason,passage:item.passage,target:item.targets[0] || null,bpm:60,source:item.source,onStand};const cached=data.downloads.find(d=>d.catalogId===id);if(cached)w.assetId=cached.assetId;data.works.push(w);}
    if(w.trashedAt){const next=copy(data);setWorkTrashed(next,w.id,false);await store.save(next);data=next;}else await persist();render();toast(ui("Work added to your repertoire.", "Obra añadida a tu repertorio."));
  }
  // Profile pictures are framed by the user and stored as a small square JPEG so they travel with backups and sync.
  async function cropPhoto(file) {
    const photo = await loadPhoto(file);
    showDialog(ui('Adjust picture','Ajustar foto'), photoCropMarkup(), async form => {
      await savePhoto(crop.dataUrl()); dialog.close();
      toast(ui('Profile picture updated.','Foto de perfil actualizada.'));
    });
    const crop = bindPhotoCrop(dialog.querySelector('#photo-crop-form'), photo.img);
    dialogCleanup = () => { crop.dispose(); photo.dispose(); };
  }
  async function savePhoto(photo) {
    const next = copy(data); next.preferences = { ...next.preferences };
    if (photo) next.preferences.photo = photo; else delete next.preferences.photo;
    await store.save(next); data = next; render();
  }
  function choosePhoto() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.hidden = true;
    const cleanup = () => input.remove();
    input.addEventListener('cancel', cleanup, { once: true });
    input.onchange = async () => {
      try {
        const file = input.files[0]; if (!file) return;
        await cropPhoto(file);
      } catch (error) { toast(error.message); } finally { cleanup(); }
    };
    document.body.append(input); input.click();
  }
  function importScore(workId = '') {
    if (importingScore) return;
    importingScore = true;
    const input = document.createElement('input');
    input.id = 'cp-pdf-file'; input.type = 'file'; input.accept = '.pdf,application/pdf'; input.hidden = true;
    const cleanup = () => { importingScore = false; input.remove(); };
    input.addEventListener('cancel', cleanup, { once: true });
    input.onchange = async () => {
      try {
        const file = input.files[0]; if (!file) return;
        const w = data.works.find(item => item.id === workId);
        if (workId && (!w || w.assetId)) throw new Error(ui("This work already has a score. Import the PDF as another work to keep its annotations.", "Esta obra ya tiene una partitura. Importa el PDF como otra obra para conservar sus anotaciones."));
        workForm(w||null,file);
      } catch (error) {
        toast(error.message);
      } finally { cleanup(); }
    };
    document.body.append(input); input.click();
  }
  let returningToLesson = null;
  function returnToLesson() {
    if (returningToLesson) return returningToLesson;
    returningToLesson = saveLessonPause().finally(() => { returningToLesson = null; });
    return returningToLesson;
  }
  async function saveLessonPause() {
    if (!data.active?.lessonPracticeEventId) return;
    await mediaCapture?.finishPractice();
    pauseSession();
    const next = copy(data), id = pauseLessonPractice(next);
    await store.save(next); data = next;
    go('event', id);
  }
  async function openLessonScore(workId) {
    if (startingPractice || openingScore || scoreViewer || root.inert) return;
    startingPractice = true;
    try {
      const next = copy(data);
      beginLessonPractice(next, detailId, workId);
      await store.save(next); data = next;
      go('session');
      await openScorePractice();
    } finally { startingPractice = false; }
  }
  async function openScorePractice() {
    const block = currentBlock();
    if (!data.active || block?.type !== 'repertoire' || openingScore || scoreViewer) return;
    if (data.active.runningSince == null) data.active.runningSince = Date.now();
    checkpoint();
    try { await showScore(block.workId); }
    catch (error) { pauseSession(); render(); throw error; }
  }
  async function transferFeedback(title,operation){
    showDialog(title,driveConnectionProgressMarkup({phase:'list'}));
    const node=dialog.querySelector('[data-drive-progress]'),started=Date.now();
    const update=()=>{if(!dialog.open||!dialog.contains(node))return;const progress=cloudTransport?.drive.info.progress;node.innerHTML=`<div class="cp-drive-loading"><span class="cp-drive-spinner" aria-hidden="true"></span><p role="status">${esc(title)}${progress?.total?` · ${progress.completed}/${progress.total}`:''}</p></div><p>${Math.floor((Date.now()-started)/1000)} s${progress?.receivedBytes?` · ${Math.ceil(progress.receivedBytes/1024)} KB`:''}</p><p>${ui('You can close this window. The transfer continues while Spino is open.','Puedes cerrar esta ventana. La transferencia sigue con Spino abierto.')}</p>`;};
    update();const timer=setInterval(update,1000);try{return await operation();}finally{clearInterval(timer);if(dialog.contains(node))dialog.close();}
  }
  async function ensureScoreAsset(id,{consent=true}={}) {
    const asset=await store.asset(id);if(!asset||asset.base64!==undefined)return asset;
    if(!asset.remoteContent||!cloudTransport||cloud?.state.transport!=='drive')throw Error(ui('Connect the original Drive notebook to download this score.','Conecta el cuaderno original de Drive para descargar esta partitura.'));
    if(cloud.busy)throw Error(ui('Wait for notebook synchronization to finish.','Espera a que termine la sincronización del cuaderno.'));
    if(consent){const approved=await new Promise(resolve=>{let settled=false;const finish=value=>{if(settled)return;settled=true;dialog.removeEventListener('close',closed);resolve(value);};const closed=()=>{if(!dialog.open)finish(false);};showDialog(ui('Score in Google Drive','Partitura en Google Drive'),`<form><p>${esc(asset.name)} · ${Math.ceil(asset.remoteContent.length*3/4/1024)} KB</p><p>${ui('Download to open it. Mobile data, including 5G, may be used.','Descárgala para abrirla. Puede usar datos móviles, incluido 5G.')}</p>${formEnd(ui('Download score','Descargar partitura'))}</form>`,async()=>{finish(true);dialog.close();});dialog.addEventListener('close',closed);});if(!approved)throw Error(ui('Download cancelled.','Descarga cancelada.'));}
    const wasBusy=completeBackupBusy;completeBackupBusy=true;
    try{const downloaded=await (consent?transferFeedback(ui('Downloading score','Descargando partitura'),()=>cloudTransport.drive.downloadAsset(id)):cloudTransport.drive.downloadAsset(id));if(JSON.stringify(downloaded.remoteContent)!==JSON.stringify(asset.remoteContent)&&downloaded.remoteContent)throw Error('The score changed. Synchronize before downloading.');
      // Keep this device's annotations; only verified score bytes are downloaded.
      const current=await store.asset(id);if(!current||JSON.stringify(current.remoteContent)!==JSON.stringify(asset.remoteContent))throw Error('The score changed while downloading. Retry.');
      const result={...current,base64:downloaded.base64};await store.putAsset(result);return result;
    }finally{completeBackupBusy=wasBusy;}
  }
  async function resetThisDevice(){
    if(!storageManager||cloud?.state.status!=='saved'||cloud.busy||mediaSync?.busy||mediaCapture?.busy||data.active)throw Error(ui('Finish synchronization, practice and transfers before resetting.','Termina la sincronización, la práctica y las transferencias antes de restablecer.'));
    showDialog(ui('Reset this device','Restablecer este dispositivo'),`<form><p>${ui('Checks that notebook edits and recordings are in Drive, then retains a verified complete ZIP on this device before clearing its active notebook. Drive and other installations are kept.','Comprueba que los cambios y grabaciones están en Drive y conserva un ZIP completo verificado en este dispositivo antes de vaciar su cuaderno activo. Se conservan Drive y las otras instalaciones.')}</p><p>${ui('If the check fails, nothing is cleared. You can reconnect to the same notebook or restore the retained ZIP.','Si falla la comprobación, no se vacía nada. Podrás reconectar al mismo cuaderno o restaurar el ZIP conservado.')}</p>${formEnd(ui('Verify and reset','Verificar y restablecer'))}</form>`,async()=>{
      if(cloud.busy||mediaSync?.busy||mediaCapture?.busy||data.active)throw Error('Finish synchronization and practice first.');
      completeBackupBusy=true;
      try{const link=storageManager.link(),localText=await store.export(data),remote=await cloudTransport.drive.readLinked(),inventory=await storageManager.inventory();
        await verifyDeviceReset({localText,remoteText:remote.text,rows:await mediaStore.index(),remoteFiles:inventory.remoteFiles,load:id=>mediaStore.get(id),...link});
        const blob=(await storageManager.complete()).blob;
        await verifyDeviceReset({localText:await store.export(data),remoteText:remote.text,rows:await mediaStore.index(),remoteFiles:inventory.remoteFiles,load:id=>mediaStore.get(id),...link});
        const archive=await retainResetArchive(blob,link);localStorage.setItem('spino.reset-recovery',JSON.stringify({archive,link}));
        await cloud.disconnect();await cloudTransport.drive.clearDeviceCache();await store.clear();await mediaStore.clear();location.reload();
      }finally{completeBackupBusy=false;}
    });
  }
  async function completeNotebookText(){
    const text=JSON.parse(await store.export(data));
    for(const asset of text.assets)if(asset.base64===undefined){const downloaded=await ensureScoreAsset(asset.id,{consent:false});asset.base64=downloaded.base64;}
    for(const asset of text.assets)delete asset.remoteContent;
    return JSON.stringify(text);
  }
  async function showScore(id) {
    if (openingScore || scoreViewer) return;
    const libraryWork = resource(id);
    if (libraryWork?.libraryId) {
      const inPractice = view === 'session' && currentBlock()?.type === 'repertoire';
      if (inPractice && !manualPracticeState(catalogueRecords(library).find(r => r.piece_id === libraryWork.libraryId), executionFor(library, libraryWork.libraryId), library).playable) throw new Error(ui("This score needs validation, analysis or piano-part selection before practice.", "Esta partitura necesita validación, análisis o selección de las partes de piano antes de practicar."));
      return previewLibrary(libraryWork.libraryId, null, inPractice ? {
        returnOnStop: !!data.active?.lessonPracticeEventId,
        finish: () => data.active?.lessonPracticeEventId ? returnToLesson() : endSession(),
        record: () => recordWork(currentBlock()?.workId),
          read: () => ({ time: clock(totalMs()), running: data.active?.runningSince != null }),
        toggle: () => { if (!data.active) return; if (data.active.runningSince == null) { data.active.runningSince = Date.now(); checkpoint(); } else pauseSession(); updateClock(); },
        measurement: () => data.active?.currentMeasurement?.source === 'midi' ? data.active.currentMeasurement : null,
        measure: value => { if (data.active) data.active.currentMeasurement = { source: 'midi', correct: value.correct, wrong: value.wrong }; },
      } : null);
    }
    openingScore = true;
    try {
      // Pause automatic downloads before editing so a revision cannot race an annotation save.
      await pauseTransfers();
      const w = resource(id), asset = w?.assetId && await ensureScoreAsset(w.assetId);
      if (!asset) throw new Error(ui("Add or download the score again.", "Vuelve a añadir o descargar la partitura."));
      const inPractice = view === 'session' && currentBlock()?.type === 'repertoire';
      if (inPractice) checkpoint(); else pauseSession();
      const { openScore } = await import('./pdf-viewer.js');
      let alreadyClosed = false;
      const controller = await openScore({ asset, title: w.title,
        save: annotations => store.saveAnnotations(asset.id, annotations),
        saveView: scoreView => store.saveScoreView(asset.id, scoreView),
        session: inPractice ? {
          returnOnStop: !!data.active?.lessonPracticeEventId,
        finish: () => data.active?.lessonPracticeEventId ? returnToLesson() : endSession(),
        record: () => recordWork(currentBlock()?.workId),
          read: () => ({ time: clock(totalMs()), running: data.active?.runningSince != null }),
          toggle: () => { if (!data.active) return; if (data.active.runningSince == null) { data.active.runningSince = Date.now(); checkpoint(); } else pauseSession(); updateClock(); },
        } : null,
        onClose: () => { alreadyClosed = true; scoreViewer = null; if(data.active?.lessonPracticeEventId) void returnToLesson().catch(error=>toast(error.message)); else {render(); updateClock();} },
      });
      if (!alreadyClosed) scoreViewer = controller;
    } finally { openingScore = false; }
  }
  async function openDriveNotebooks(expectedId=null,expectedFileId=null) {
    if(!driveNotebookAvailable())throw new Error('Google Drive connection is available in the Android app.');
    if(driveConnecting||cloud?.busy)throw new Error(ui('Wait for the current connection operation.','Espera a que termine la conexión en curso.'));
    const t=driveCopy();driveConnecting=true;
    showDialog('Google Drive',driveConnectionProgressMarkup());
    const progressNode=dialog.querySelector('[data-drive-progress]'),started=Date.now();
    let phase='connect',current=0,total=0,lastProgressKey='';
    const visible=()=>dialog.open&&dialog.contains(progressNode);
    const updateProgress=()=>{if(!visible())return;const seconds=Math.floor((Date.now()-started)/1000),key=`${phase}:${current}:${seconds>=10}`;const markup=driveConnectionProgressMarkup({phase,current,total,seconds,inner:true});if(key!==lastProgressKey){progressNode.innerHTML=markup;lastProgressKey=key;}else{const template=document.createElement('template');template.innerHTML=markup;progressNode.querySelector('[data-drive-elapsed]').textContent=template.content.querySelector('[data-drive-elapsed]').textContent;}};
    const progressTimer=setInterval(updateProgress,1000);
    try {
      const account=await cloudTransport.drive.connect();
      render();
      if(!visible())return;
      phase='list';updateProgress();
      const files=await cloudTransport.drive.list();
      if(!visible())return;
      const candidates=files.filter(f=>(!expectedId||f.appProperties.notebookId===expectedId)&&(!expectedFileId||f.id===expectedFileId));

      if(!visible())return;
      const connectSelected=async (selected,confirmed=false,localChoice=null)=>{
        if(selected==='local'){await configureNewStorage();return;}
        else{const chosen=files.find(f=>f.id===selected);if(!chosen)throw Error('Choose an available notebook.');if(chosen.appProperties.spinoType==='spino-notebook-v1'&&!confirmed){showLegacyMigration(chosen,()=>connectSelected(selected,true));return;}if(!cloud?.state.name&&localChoice===null&&((data.sessions?.length||0)+(data.works?.length||0)+(data.events?.length||0))>0){showDialog(ui('You have local data','Ya tienes datos locales'),`<form><p>${ui('Add your local practices and pieces to the selected notebook? Different edits to the same value will need review.','¿Añadir tus prácticas y piezas al cuaderno seleccionado? Si un mismo dato tiene cambios distintos, podrás revisarlos.')}</p>${formEnd(ui('Add my data','Añadir mis datos'))}<button type="button" data-open-remote>${ui('Open without adding them','Abrir sin añadirlos')}</button></form>`,()=>connectSelected(selected,confirmed,'merge'));dialog.querySelector('[data-open-remote]').onclick=async()=>{try{completeBackupBusy=true;const blob=await transferFeedback(ui('Saving your local notebook','Guardando tu cuaderno local'),()=>completeZip()),archive=await retainResetArchive(blob,{source:'before-join'});localStorage.setItem('spino.local-before-join',archive);completeBackupBusy=false;await connectSelected(selected,confirmed,'remote');}catch(error){toast(error.message);}finally{completeBackupBusy=false;}};return;}if(cloud?.state.name){if(chosen.appProperties.notebookId!==cloud.state.notebookId)throw Error(driveCopy().linked);await connectCloudNotebook(()=>cloud.migrateToDrive({fileId:chosen.id}));}else{cloudTransport.drive.choose(selected);cloudTransport.useDrive();await connectCloudNotebook(()=>cloud.joinShared(pendingDeviceLink?encodeDeviceLink(pendingDeviceLink):null,{keepLocal:localChoice!=='remote'}));}}
        if(cloud.state.transport==='drive'){pendingDeviceLink=null;if(confirmed&&cloud.state.status==='saved'){await storageManager.refresh();if(!storageManager.state.config?.storageVersion){const link=cloudTransport.drive.storageLink();await transferFeedback(ui('Preparing backup settings','Preparando las copias'),()=>storageManager.organize({folderId:link.folderId,name:cloud.state.name}));}}}
        mediaSync?.markDirty();
      };
      showDialog('Google Drive',driveNotebookPickerMarkup(account,files,{linked:!!cloud?.state.name,notebookId:cloud?.state.notebookId,expectedId,expectedFileId}),form=>connectSelected(String(form.get('notebook'))));
    } catch(error) {if(visible())showDialog('Google Drive',`<p role="alert">${esc(localizeMessage(error.message))}</p><p>${esc(t.offline)}</p><div class="cp-actions">${btn('drive-connect',t.reconnect)}${btn('close-dialog',t.close)}</div>`);}
    finally{clearInterval(progressTimer);driveConnecting=false;}
  }
  function showLegacyMigration(file,proceed){
    showDialog(ui('Update notebook storage','Actualizar almacenamiento del cuaderno'),`<form><p><strong>${esc(file.name)}</strong></p><p>${ui('Update Spino on every device and synchronize their changes before continuing. Older versions will stop synchronizing with this notebook.','Actualiza Spino en todos tus dispositivos y sincroniza sus cambios antes de continuar. Las versiones antiguas dejarán de sincronizar con este cuaderno.')}</p><p>${ui('The original file is retained for recovery. Your notebook will use a folder for its data and files.','El archivo original se conserva para recuperación. Tu cuaderno usará una carpeta para sus datos y archivos.')}</p><label class="check"><input name="updated" type="checkbox" required>${ui('I have updated all my devices and synchronized their changes','He actualizado todos mis dispositivos y sincronizado sus cambios')}</label>${formEnd(ui('Create folder and update','Crear carpeta y actualizar'))}</form>`,async form=>{if(!form.has('updated'))throw Error(ui('Confirm that all devices are updated.','Confirma que todos los dispositivos están actualizados.'));cloudTransport.drive.authorizeMigration(file.id);await proceed();});
    const input=dialog.querySelector('[name=updated]'),submit=dialog.querySelector('[type=submit]');submit.disabled=true;input.onchange=()=>submit.disabled=!input.checked;
  }
  async function configureNewStorage(){
    if(!storageManager)throw Error('Storage setup is unavailable.');
    showDialog('Google Drive',driveConnectionProgressMarkup({phase:'list'}));
    const folders=await storageManager.folders();
    showDialog(ui('Choose storage','Elegir almacenamiento'),`<form><label>${ui('File name','Nombre del archivo')}<input name="fileName" required value="Mi cuaderno" maxlength="180"></label><p>Google Drive / Spino</p><details><summary>${ui('Change folder','Cambiar carpeta')}</summary><label>${ui('Google Drive folder','Carpeta de Google Drive')}<select name="folder"><option value="new">${ui('Create a new folder','Crear una carpeta nueva')}</option>${folders.map(f=>`<option value="${esc(f.id)}">${esc(f.name)} · …${esc(f.id.slice(-6))}</option>`).join('')}</select></label><label>${ui('New folder name','Nombre de carpeta nueva')}<input name="folderName" value="Spino" maxlength="180"></label></details><p>${ui('The notebook, multimedia and complete copies will stay inside this folder.','El cuaderno, la multimedia y las copias completas quedarán dentro de esta carpeta.')}</p>${formEnd(ui('Connect notebook','Conectar cuaderno'))}</form>`,async f=>{let folderId=String(f.get('folder'));if(folderId==='new')folderId=(await storageManager.createFolder(String(f.get('folderName')))).id;else if(!folders.some(v=>v.id===folderId))throw Error('Choose an available folder.');const name=String(f.get('fileName')).trim().replace(/\.json$/i,'')+'.json';cloudTransport.drive.setDestination({folderId,name});try{await connectCloudNotebook(()=>cloud.migrateToDrive());if(cloud.state.status==='error')return;await storageManager.organize({folderId,name});localStorage.setItem('spino.storage.review.v1','done');await storageUI.overview();}finally{cloudTransport.drive.setDestination(null);}});
  }
  async function connectCloudNotebook(operation) {
    dialog.close();
    go('profile-backup');
    connectionFeedback=true;try{await transferFeedback(ui('Opening notebook','Abriendo cuaderno'),operation);}finally{connectionFeedback=false;}
    if (cloud?.state.status === 'error') showDialog(ui('Manage connection','Gestionar conexión'),cloudManageMarkup(cloud.state,cloudOptions()));
  }
  const actions={
    ...(storageUI?.actions||{}),
    'storage-export':exportCompleteZip,'storage-import':importCompleteZip,
    'storage-reset':resetThisDevice,
    'drive-create-new':configureNewStorage,
    'storage-restore-local':async()=>{const id=localStorage.getItem('spino.local-before-join'),archive=await readResetArchive(id);if(!archive)throw Error('Recovery copy unavailable.');await reviewCompleteZip(archive.blob);},
    'storage-reconnect-reset':()=>{const saved=JSON.parse(localStorage.getItem('spino.reset-recovery'));return openDriveNotebooks(saved.link.notebookId,saved.link.id);},
    'storage-restore-reset':async()=>{const saved=JSON.parse(localStorage.getItem('spino.reset-recovery')),archive=await readResetArchive(saved.archive);if(!archive)throw Error('Recovery archive unavailable.');await reviewCompleteZip(archive.blob);},
    'storage-return-original':()=>{localStorage.removeItem('spino.recovered-notebook');location.reload();},
    ...libraryUI.actions,
    'library-downloadable':()=>{libraryFilters={state:'located'};libraryPage=0;render();},
    'library-candidates-download':()=>libraryDownloads.enqueueCandidates(),
    'library-clear':()=>{libraryFilters={};libraryFormDraft=null;libraryPage=0;render();root.querySelector('.cp-page').scrollTop=0;},
    'library-pdfs':()=>{libraryFilters={...libraryFilters,format:'pdf'};libraryPage=0;render();},
    'library-research':()=>{libraryFilters={state:'missing'};libraryPage=0;render();},
    'library-all':()=>{libraryFilters={...libraryFilters,state:''};libraryFormDraft=null;libraryPage=0;render();root.querySelector('.cp-page').scrollTop=0;},
    'catalogue-local':()=>{libraryFilters={state:'downloaded'};libraryFormDraft=null;libraryPage=0;go('catalog');root.querySelector('.cp-page').scrollTop=0;},
    'library-downloaded':()=>{libraryFilters={...libraryFilters,state:'downloaded'};libraryFormDraft=null;libraryPage=0;render();root.querySelector('.cp-page').scrollTop=0;},
    'catalogue-preview':previewCatalogue,
    'preview-transfer-settings':()=>{dialog.close();go('downloads');},
    'catalogue-save-preview':id=>{dialog.close();return CATALOG.some(item=>item.id===id)?downloads.enqueue(id):libraryDownloads.enqueue(id);},
    'library-more':()=>{libraryPage++;render();},
    'library-page':id=>{libraryPage=Number(id);render();root.querySelector('.cp-page')?.scrollTo(0,0);},
    home:()=>go('home'),practice:()=>go('practice'),'today-calendar':()=>{selectedDate=localDate();calendarMode='week';go('calendar');},calendar:()=>go('calendar'),piano:()=>go(libraryPane==='multimedia'?'multimedia':libraryPane==='catalog'?'catalog':'piano'),settings:async()=>{go('settings');await refreshProfileFiles();},progress:()=>go('progress'),repertoire:()=>go('repertoire'),routines:()=>go('routines'),catalog:()=>{filteredTarget='';go('catalog');},
    'quick-practice':async()=>{if(dialog.open)dialog.close();if(data.active){go('session');toast(ui('Continue or finish your pending session first.','Continúa o termina primero tu sesión pendiente.'));return;}await startSession(quickPractice(data.preferences),()=>openReader());},
    prepare:id=>prepare(id||'reading'),
    'multimedia':async()=>{if(mediaStore)await refreshMedia();go('multimedia');},
    'record-work':recordWork,
    'record-media':()=>{if(!mediaCapture)throw Error(ui('Local recording storage is unavailable. Reopen the app and try again.','El almacenamiento local de grabaciones no está disponible. Abre de nuevo la app y vuelve a intentarlo.'));mediaCapture.openStandalone(view==='multimedia'?mediaCalendar.workId:'');},
    'work-media':async id=>{if(mediaStore)await refreshMedia();Object.assign(mediaCalendar,{month:recordingDate(mediaRecords.find(r=>r.workId===id)||{})||localDate(),mode:'week',type:'',workId:id,date:'',limit:24});libraryScroll.multimedia=0;go('multimedia');},
    'media-more':()=>{const page=root.querySelector('.cp-page'),scroll=page.scrollTop;mediaCalendar.limit+=24;render();root.querySelector('.cp-page').scrollTop=scroll;},
    'media-date-type':id=>{const [date,type]=id.split('|');Object.assign(mediaCalendar,{date,type,limit:24});render();},
    'media-date':id=>{mediaCalendar.date=mediaCalendar.date===id?'':id;mediaCalendar.limit=24;render();},
    'media-clear-date':()=>{mediaCalendar.date='';mediaCalendar.limit=24;render();},
    'media-filter-type':id=>{if(!['audio','video','midi'].includes(id))return;mediaCalendar.type=mediaCalendar.type===id?'':id;mediaCalendar.limit=24;render();root.querySelector('.cp-media-filters')?.querySelector(`[data-action=media-filter-type][data-id="${id}"]`)?.focus({preventScroll:true});},
    'media-filter-work':()=>showDialog(ui('Filter by piece','Filtrar por obra'),mediaPieceFilterMarkup(mediaRecords,data.works,mediaCalendar.workId)),
    'media-select-work':id=>{mediaCalendar.workId=id;mediaCalendar.limit=24;dialog.close();render();root.querySelector('[data-action=media-filter-work]')?.focus({preventScroll:true});},
    'media-play':async id=>{const row=mediaRecords.find(r=>r.id===id);if(!row?.remoteOnly)return mediaCapture?.play(id);if(!mediaSync)throw Error(ui('Connect the notebook to download this recording.','Conecta el cuaderno para descargar esta grabación.'));showDialog(ui('Download recording','Descargar grabación'),`<form><p>${esc(row.title)} · ${(row.bytes/1048576).toFixed(1)} MB</p><p>${ui('You can download using Wi-Fi or mobile data, including 5G.','Puedes descargar con wifi o datos móviles, incluido 5G.')}</p>${formEnd(ui('Download','Descargar'))}</form>`,async()=>{await mediaSync.download(id);dialog.close();await refreshMedia();await mediaCapture?.play(id);});},
    'media-release-local':id=>confirm(ui('Remove local download','Quitar descarga local'),ui('The recording stays in Drive and in the calendar. You can download it again.','La grabación sigue en Drive y en el calendario. Puedes descargarla de nuevo.'),async()=>{await mediaStore.releaseLocal(id);await refreshMedia();}),
    'media-share':id=>mediaCapture?.share(id),
    'progress-streak':()=>{streakMonth=localDate();openStreak();},
    'streak-month':id=>{streakMonth=shiftMonth(streakMonth,Number(id));openStreak();dialog.querySelector(`[data-action=streak-month][data-id="${id}"]`)?.focus({preventScroll:true});},
    'progress-media-week':async()=>{libraryScroll.multimedia=0;Object.assign(mediaCalendar,{month:localDate(),mode:'week',type:'',workId:'',date:'',limit:24});if(mediaStore)await refreshMedia();go('multimedia');},
    'media-toggle-month':()=>{mediaCalendar.mode=mediaCalendar.mode==='week'?'month':'week';render();root.querySelector('[data-action=media-toggle-month]')?.focus({preventScroll:true});},
    'media-month':id=>{mediaCalendar.month=shiftCalendar(mediaCalendar.month,Number(id),mediaCalendar.mode);render();root.querySelector(`[data-action=media-month][data-id="${id}"]`)?.focus({preventScroll:true});},
    'close-dialog':()=>{if(!dialogBusy())dialog.close();},
    'quick-finish':async()=>{dialog.close();await endQuickPractice();},
    'quick-later':()=>{dialog.close();hideReader();checkpoint();go('practice');},
    'quick-continue':()=>{dialog.close();reader.play();},
    'resume-session':()=>go('session'),
    'weekly-planner':()=>{dialog.close();go('planner');},
    'calendar-day':id=>{selectedDate=id;calendarMode='week';go('calendar');root.querySelector('.selected-day')?.scrollIntoView({block:'center'});},
    'add-on-day':addOnDay,
    'plan-detail':planDetail,
    'calendar-mode':id=>{calendarMode=id;render();},
    'calendar-prev':()=>{selectedDate=shiftCalendar(selectedDate,-1,calendarMode);render();},
    'calendar-next':()=>{selectedDate=shiftCalendar(selectedDate,1,calendarMode);render();},
    'calendar-add':()=>addOnDay(),
    'week-prev':()=>{selectedDate=addDays(selectedDate,-7);render();},'week-next':()=>{selectedDate=addDays(selectedDate,7);render();},today:()=>{selectedDate=localDate();render();},'select-day':id=>{selectedDate=id;render();},
    'plan-practice':()=>{if(!data.routines.length){dialog.close();prepare('reading',null,'plan');return;}showDialog(ui('Schedule practice','Planificar práctica'),`<p class="muted">${ui('Use a saved routine or prepare a new practice.','Usa una rutina guardada o prepara una práctica nueva.')}</p><div class="cp-routine-activities">${data.routines.map(r=>btn('schedule-routine',esc(r.title),r.id))}${btn('schedule-new-practice',ui('+ New practice','+ Práctica nueva'),'','quiet')}${btn('close-dialog',ui('Cancel','Cancelar'),'','quiet')}</div>`);},
    'schedule-new-practice':()=>{dialog.close();prepare('reading',null,'plan');},
    'schedule-routine':id=>{const routine=data.routines.find(r=>r.id===id);if(!routine)return;preparePurpose='plan';planForm(null,copy(routine));},
    'prepare-select-work':id=>{
      readDraft();const [index,workId]=JSON.parse(id),work=data.works.find(w=>w.id===workId&&!w.trashedAt);
      if((workId&&!work)||draft.blocks[index]?.type!=='repertoire')return;
      draft.blocks[index].workId=workId;draft.blocks[index].target=work?.target||null;
      root.querySelector(`[name="workId-${index}"]`).value=workId;
      const pieces=root.querySelector(`[data-practice-pieces="${index}"]`);
      for(const choice of pieces.querySelectorAll('[data-action=prepare-select-work]'))choice.setAttribute('aria-pressed',String(JSON.parse(choice.dataset.id)[1]===workId));
      pieces.querySelector('[data-practice-selected]').textContent=work?.title||ui('Choose when practising','Elegir al practicar');
      if(dialog.querySelector('[data-practice-search]'))dialog.close();
      const selected=[...pieces.querySelectorAll('[aria-pressed=true]')][0];
      (selected||pieces.querySelector('[data-action=prepare-other-pieces]'))?.focus({preventScroll:true});
      selected?.scrollIntoView({block:'nearest',inline:'nearest'});
    },
    'prepare-other-pieces':id=>{
      readDraft();const index=Number(id);if(draft.blocks[index]?.type!=='repertoire')return;
      showDialog(ui('Other pieces','Otras piezas'),`<div class="cp-actions">${btn('choose-catalogue',ui('Search the full catalogue','Buscar en todo el catálogo'),id,'quiet')}</div><label>${ui('Search your repertoire','Buscar en tu repertorio')}<input type="search" data-practice-search="${index}" placeholder="${ui('Title or composer','Título o compositor')}" /></label><div data-practice-results="${index}" class="cp-practice-results" aria-live="polite"></div><div class="cp-actions">${btn('prepare-select-work',ui('Choose when practising','Elegir al practicar'),JSON.stringify([index,'']),'quiet')}${btn('close-dialog',ui('Cancel','Cancelar'),'','quiet')}</div>`);
      const search=dialog.querySelector('[data-practice-search]');search.addEventListener('input',()=>{
        const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
        const query=normalize(search.value.trim()),matches=data.works.filter(w=>!w.trashedAt&&normalize(w.title+' '+(w.composer||'')).includes(query));
        dialog.querySelector('[data-practice-results]').innerHTML=matches.map(w=>`<button type="button" data-action="prepare-select-work" data-id="${esc(JSON.stringify([index,w.id]))}" aria-pressed="${draft.blocks[index].workId===w.id}"><b>${esc(w.title)}</b>${w.composer?`<small>${esc(w.composer)}</small>`:''}</button>`).join('')||`<p class="muted">${ui('No matching pieces in your repertoire.','No hay coincidencias en tu repertorio.')}</p>`;
      });
      search.dispatchEvent(new Event('input'));search.focus({preventScroll:true});
    },
    'choose-catalogue':id=>{
      readDraft();const index=id==='add'?null:Number(id);
      if(index==null&&draft.blocks.length>=20)throw Error(ui("A practice can contain up to 20 blocks. Replace a repertoire block instead.", "Una práctica puede tener hasta 20 bloques. Sustituye un bloque de repertorio."));
      materialSelection={draft:copy(draft),purpose:preparePurpose,date:selectedDate,index};
      dialog.close();
      filteredTarget='';libraryFilters={};libraryPage=0;go('catalog');
    },
    'return-to-preparation':()=>{if(!materialSelection)return;draft=copy(materialSelection.draft);preparePurpose=materialSelection.purpose;selectedDate=materialSelection.date;materialSelection=null;go('prepare');},
    'select-catalogue-pdf':async id=>{
      if(!materialSelection)throw Error(ui("Open the catalogue from practice preparation first.", "Abre primero el catálogo desde la preparación de la práctica."));
      const source=CATALOG.find(c=>c.id===id);if(!source)throw Error(ui("Catalogue edition not found.", "No se encuentra esta edición del catálogo."));const item=catalogPresentation(source);
      let work=data.works.find(w=>w.catalogId===id);
      const assetId=work?.assetId||data.downloads.find(d=>d.catalogId===id)?.assetId;
      if(!assetId||!await store.asset(assetId))throw Error(ui("Download the PDF before selecting it.", "Descarga el PDF antes de seleccionarlo."));
      if(!work||work.assetId!==assetId){const next=copy(data);work={...(work||{id:uid(),catalogId:id,title:item.title,composer:item.composer,stage:STAGES[0],notes:item.reason,passage:item.passage,target:item.targets[0] || null,bpm:60,source:item.source}),assetId};const index=next.works.findIndex(w=>w.id===work.id);if(index<0)next.works.push(work);else next.works[index]=work;await store.save(next);data=next;}
      if(work.trashedAt){const next=copy(data);setWorkTrashed(next,work.id,false);await store.save(next);data=next;work=data.works.find(w=>w.id===work.id);}
      usePracticeMaterial(work);
    },
    'new-routine':()=>prepare('reading',null,'routine'),
    'quick-routine':async id=>{if(data.active){go('session');return;}await startSession(data.routines.find(r=>r.id===id),()=>{if(['reading','technique'].includes(currentBlock()?.type)&&(data.active.context!=='midi'||reader.devices.length))return openReader();});},
    'start-routine':id=>prepare('reading',data.routines.find(r=>r.id===id)),
    'edit-routine':id=>prepare('reading',data.routines.find(r=>r.id===id),'routine'),
    'routine-add':()=>{readDraft();if(draft.blocks.length>=20){toast(ui('A routine can contain up to 20 blocks.','Una rutina puede contener hasta 20 bloques.'));return;}const types=['reading','technique','repertoire','free'];showDialog(ui('Add block','Añadir bloque'),`<div class="cp-routine-activities">${types.map(type=>btn('routine-add-type',ACTIVITIES[type],type,'quiet')).join('')}</div>`);},
    'routine-add-type':type=>editRoutineBlock(null,type),
    'routine-edit-block':id=>editRoutineBlock(id),
    'routine-up':id=>changeRoutineBlocks({type:'move',blockId:id,toIndex:draft.blocks.findIndex(b=>b.id===id)-1}),
    'routine-down':id=>changeRoutineBlocks({type:'move',blockId:id,toIndex:draft.blocks.findIndex(b=>b.id===id)+1}),
    'routine-remove':id=>changeRoutineBlocks({type:'remove',blockId:id}),
    'routine-cancel':()=>confirm(ui('Discard changes?','¿Descartar cambios?'),ui('Your saved routines stay unchanged.','Tus rutinas guardadas no cambian.'),()=>{dialog.close();go('routines');}),
    'delete-routine':id=>confirm(ui("Delete routine", "Eliminar rutina"),ui("Delete this saved routine? Completed sessions and planned practices will be kept.", "¿Eliminar esta rutina guardada? Se conservarán las sesiones realizadas y las prácticas planificadas."),async()=>{const next=copy(data);next.routines=next.routines.filter(r=>r.id!==id);await store.save(next);data=next;dialog.close();if(view==='prepare')go('routines');else render();toast(ui('Routine deleted.','Rutina eliminada.'));}),
    'block-add':()=>{dialog.close();readDraft();if(draft.blocks.length>=20){toast(ui("You can include up to 20 blocks in a routine.", "Puedes incluir hasta 20 bloques en una rutina."));return;}const total=practiceMinutes(draft.blocks);draft.blocks.push(block('reading',practiceDefaults(data.preferences,'reading')));draft.blocks=resizePractice(draft.blocks,total);render();},
    'block-remove':id=>{readDraft();if(draft.blocks.length<=1)return;const total=practiceMinutes(draft.blocks);draft.blocks.splice(+id,1);draft.blocks=resizePractice(draft.blocks,total);render();},
    'block-up':id=>{readDraft();const i=+id;if(i>0)[draft.blocks[i-1],draft.blocks[i]]=[draft.blocks[i],draft.blocks[i-1]];render();},
    'block-down':id=>{readDraft();const i=+id;if(i<draft.blocks.length-1)[draft.blocks[i+1],draft.blocks[i]]=[draft.blocks[i],draft.blocks[i+1]];render();},
    'prepare-more':()=>{readDraft();showDialog(ui("Organize your practice", "Organiza tu práctica"),`<div class="cp-actions">${btn('block-add',ui("+ Add block", "+ Añadir bloque"))}${btn('save-routine',ui("Save routine", "Guardar rutina"))}${btn('schedule-draft',ui("Schedule", "Planificar"))}${btn('close-dialog',ui("Close", "Cerrar"))}</div>`);},
    'save-routine':()=>{if(!validDraft())return;showDialog(ui("Save routine", "Guardar rutina"),`${ui("<form><label>Name<input name=\"title\" maxlength=\"200\" required value=\"", "<form><label>Nombre<input name=\"title\" maxlength=\"200\" required value=\"")}${esc(draft.title)}" /></label>${formEnd()}</form>`,async f=>{draft.title=String(f.get('title')).trim();const existing=data.routines.find(r=>r.id===draft.id);if(existing)Object.assign(existing,copy(draft));else data.routines.push({id:uid(),title:draft.title,context:draft.context,blocks:copy(draft.blocks)});await persist();dialog.close();go('routines');toast(ui("Routine saved.", "Rutina guardada."));});},
    'schedule-draft':()=>{if(validDraft())planForm(preparePurpose==='edit-plan'?data.plans.find(p=>p.id===draft.id):null,draft);},
    'start-plan':id=>{dialog.close();const p=data.plans.find(p=>p.id===id);return startSession({title:p.title,context:p.context,blocks:p.blocks,planId:p.id});},
    'edit-plan':id=>{const plan=data.plans.find(p=>p.id===id);if(!plan||plan.status!=='planned'||data.active?.planId===id)throw Error(ui("Only pending practices can be edited.", "Solo puedes editar prácticas pendientes."));dialog.close();prepare(plan.blocks[0].type,plan,'edit-plan');},
    'reschedule-plan':id=>{preparePurpose='plan';planForm(data.plans.find(p=>p.id===id));},
    'apply-plan-routine':id=>{const routine=data.routines.find(r=>r.id===id);if(!routine)return;readDraft();draft={...draft,title:routine.title,context:routine.context,blocks:copy(routine.blocks),...(routine.routinePolicy?{routinePolicy:copy(routine.routinePolicy)}:{})};render();},
    'cancel-series':id=>{
      const item = data.plans.find(v=>v.id===id) || findEvent(data.events,id);
      if (!item?.recurrence) return;
      const from = item.date > localDate() ? item.date : localDate();
      const next = cancelSeries(data,item.recurrence.id,from);
      const count = data.plans.length + data.events.length - next.plans.length - next.events.length;
      confirm(ui("Cancel recurring appointments", "Cancelar citas recurrentes"), `${ui("Cancel ", "Cancelar ")}${data.events.some(e=>e.recurrence?.id===item.recurrence.id && e.recurrence.rule) ? ui("recurring", "las") : count}${ui(" appointments from ", " citas desde ")}${from}${ui("? Completed practice, earlier appointments and the active session are kept.", "? Se conservan las prácticas realizadas, las citas anteriores y la sesión activa.")}`, async()=>{
        // Recompute after confirmation so any newly recorded session remains protected.
        const updated = cancelSeries(data,item.recurrence.id,from);
        await store.save(updated); data=updated; await reminders(); go('calendar');
      });
    },
    'delete-plan':id=>confirm(ui("Delete planned practice", "Eliminar práctica prevista"),ui("Completed practice history will be kept.", "El historial de prácticas realizadas se conserva."),async()=>{data.plans=data.plans.filter(p=>p.id!==id);await persist();await reminders();render();}),
    'repertoire-page':id=>{repertoireIndex=Number(id);render();root.querySelector('.cp-page')?.scrollTo(0,0);},
    'repertoire-reset':()=>{repertoireFilters={};repertoireIndex=0;render();},
    'repertoire-sort':id=>{repertoireFilters.direction=(repertoireFilters.sort||'title')===id&&repertoireFilters.direction!=='desc'?'desc':'asc';repertoireFilters.sort=id;repertoireIndex=0;render();},
    'favorite-work':async id=>{const next=copy(data),work=next.works.find(w=>w.id===id);if(!work)return;work.favorite=!work.favorite;await store.save(next);data=next;render();},
    'restore-work':async id=>{const next=copy(data);setWorkTrashed(next,id,false);await store.save(next);data=next;render();toast(ui("Work restored.", "Obra restaurada."));},
    'delete-work':id=>confirm(ui("Delete work", "Eliminar obra"), ui("Move this work to trash? Its PDF, annotations, practice history and existing plans will be kept. You can restore it from Repertoire → Collection → Trash.", "¿Mover esta obra a la papelera? Se conservarán su PDF, anotaciones, historial y planes. Puedes restaurarla desde Repertorio → Colección → Papelera."),async()=>{const next=copy(data);setWorkTrashed(next,id,true);await store.save(next);data=next;go('repertoire');}),
    'new-work':()=>workForm(),'edit-work':id=>workForm(data.works.find(w=>w.id===id)),
    'work-detail':id=>go('work',id),
    'stand-work':async id=>{const work=data.works.find(w=>w.id===id);if(!work)return;const next=copy(data);setWorkOnStand(next,id,!isOnStand(work));await store.save(next);data=next;render();toast(isOnStand(next.works.find(w=>w.id===id))?ui("On the music stand.", "En el atril."):ui("Moved to the rest of your repertoire.", "Pasada al resto del repertorio."));},
    'library-add-work':async id=>{
      const record=catalogueRecords(library).find(r=>r.piece_id===id);if(!record)return;
      if(!executionFor(library,id).assetId)throw Error(ui('Download the score before adding it to your repertoire.','Descarga la partitura antes de añadirla al repertorio.'));
      const existing=data.works.find(w=>w.libraryId===id),next=copy(data);
      if(existing)setWorkTrashed(next,existing.id,false);
      else{const e=executionFor(library,id);next.works.push({id:uid(),libraryId:id,title:record.display_title.slice(0,200),composer:record.known_metadata.composer||'',stage:STAGES[0],target:null,bpm:60,passage:'',notes:'',onStand:false,...(e.assetId?{assetId:e.assetId,assetFormat:'musicxml'}:{})});}
      await store.save(next);data=next;render();toast(ui("Work added to your repertoire.", "Obra añadida a tu repertorio."));
    },
    'practice-work':id=>{const w=data.works.find(w=>w.id===id);prepare('repertoire',{title:w.title,context:'piano',blocks:[block('repertoire',{workId:id,target:w.target,passage:w.passage,bpm:w.bpm,minutes:15})]});},
    'plan-work':id=>{const w=data.works.find(w=>w.id===id);prepare('repertoire',{title:w.title,context:'piano',blocks:[block('repertoire',{workId:id,target:w.target,passage:w.passage,bpm:w.bpm,minutes:15})]},'plan');},
    'import-pdf':()=>importScore(), 'attach-pdf':importScore,
    'open-pdf':showScore,
    'open-score-practice':openScorePractice,
    'print-work':id=>printStoredScore(id),
    'library-print':id=>printStoredScore(id,true),
    'remove-pdf':id=>confirm(ui("Delete PDF and annotations", "Eliminar PDF y sus anotaciones"),ui("The file and marks on its pages will be deleted. The work, notes and sessions will be kept. Export a backup to keep the annotations.", "Se borrarán el archivo y las marcas dibujadas sobre sus páginas. La ficha, las notas de la obra y las sesiones se conservarán. Exporta una copia si quieres conservar las anotaciones."),async()=>{if(downloads.busy||libraryDownloads.busy)throw new Error(ui("Pause downloads before deleting a file.", "Pausa las descargas antes de eliminar un archivo."));const assetId=resource(id).assetId;const nextLibrary=structuredClone(library);for(const e of Object.values(nextLibrary.executions)){if(e.assetId===assetId){delete e.assetId;e.validated=false;e.render=null;e.segments=[];}if(e.referencePDF===assetId)delete e.referencePDF;}await store.saveLibrary(nextLibrary);library=nextLibrary;data.works.filter(w=>w.assetId===assetId).forEach(w=>delete w.assetId);data.downloads=data.downloads.filter(d=>d.assetId!==assetId);data.downloadJobs=data.downloadJobs.filter(j=>data.downloads.some(d=>d.catalogId===j.catalogId));await persist();await store.removeAsset(assetId);await refreshProfileFiles();render();}),
    downloads:()=>go('downloads'),
    'download-piece':id=>{if(['queued','downloading','waiting-wifi'].includes(data.downloadJobs.find(j=>j.catalogId===id)?.status)){go('downloads');return;}const task=downloads.enqueue(id);toast(ui("Download added. View its progress in Downloads.", "Descarga añadida. Puedes ver el progreso en Descargas."));return task;},
    'download-updates':async()=>{for(const item of catalogChanges(data.downloads))await downloads.enqueue(item.id);},
    'pause-download':id=>downloads.pause(id),'pause-downloads':pauseTransfers,
    'add-catalog-work':id=>{if(!data.downloads.some(d=>d.catalogId===id&&d.assetId)&&!data.works.some(w=>w.catalogId===id&&w.assetId))throw Error(ui('Download the score before adding it to your repertoire.','Descarga la partitura antes de añadirla al repertorio.'));return catalogWork(id);},
    'catalogue-pdf-detail':id=>{const source=CATALOG.find(c=>c.id===id);if(!source)return;const item=catalogPresentation(source);showDialog(item.title,`<p>${esc(item.composer)}</p>${item.instrumentation ? `<p>${esc(item.instrumentation)}</p>` : ''}<p>${esc(item.reason)}</p><p>${esc(item.edition)}</p><p>${esc(item.licenseLabel)}</p><a href="${esc(item.source)}" target="_blank" rel="noopener noreferrer">${ui('View source and terms','Ver fuente y condiciones')}</a>`);},
    'practice-catalog-pdf':async id=>{await catalogWork(id,true);const work=data.works.find(w=>w.catalogId===id);if(work?.assetId)actions['practice-work'](work.id);},
    'catalog-target':id=>{filteredTarget=id;libraryFilters={format:'pdf',target:id};libraryPage=0;libraryFormDraft=null;go('catalog');},
    'target-history':id=>{const sessions=data.sessions.filter(s=>s.results.some(r=>r.block.target===id));showDialog(targetById(id).label,`${sessionCards(sessions)}<div class="cp-actions">${btn('close-dialog',ui("Close", "Cerrar"))}</div>`);},
    'new-event':()=>{if(view==='home')selectedDate=localDate();eventForm();},'edit-event':id=>eventForm(findEvent(data.events,id)),
    'event-detail':id=>go('event',id),
    'delete-event':id=>confirm(ui("Delete event", "Eliminar evento"),ui("Works and their history will be kept.", "Las obras y su historial se conservarán."),async()=>{data.events=removeEventOccurrence(data.events,id);await persist();await reminders();go('calendar');}),
    'lesson-score':openLessonScore,
    'complete-lesson':lessonForm,
    'lesson-recordings':lessonRecordingForm,
    'record-lesson':recordLesson,
    'manual-session':manualForm,
    'open-reader':openReader,
    'toggle-session':()=>{if(!data.active)return;if(data.active.runningSince==null){data.active.runningSince=Date.now();checkpoint();}else pauseSession();render();},
    'toggle-metronome':()=>{if(metro)stopMetro();else startMetro();render();},
    'open-free-practice':()=>{if(currentBlock()?.type!=='free')return;go('free-practice');data.active.runningSince=Date.now();checkpoint();render();},
    'free-return':()=>{pauseSession();go('session');},
    'metro-favorite-add':()=>{const settings=metronomeSettings(data.active);data.active.freeMetronome={...settings,favorites:[...new Set([...settings.favorites,settings.bpm])].sort((a,b)=>a-b)};checkpoint();render();},
    'metro-favorite-remove':id=>{const settings=metronomeSettings(data.active);data.active.freeMetronome={...settings,favorites:settings.favorites.filter(bpm=>bpm!==Number(id))};checkpoint();render();},
    'metro-favorite':id=>{const settings=metronomeSettings(data.active);if(!settings.favorites.includes(Number(id)))return;data.active.freeMetronome={...settings,bpm:Number(id)};const playing=!!metro;stopMetro();if(playing)startMetro();checkpoint();render();},
    'tap-tempo':()=>{const at=performance.now();tempoTaps=tempoTaps.filter(t=>at-t<3000);tempoTaps.push(at);if(tempoTaps.length>6)tempoTaps.shift();if(tempoTaps.length>1){data.active.freeMetronome={...metronomeSettings(data.active),bpm:Math.max(30,Math.min(240,Math.round(60000*(tempoTaps.length-1)/(at-tempoTaps[0]))))};const playing=!!metro;stopMetro();if(playing)startMetro();checkpoint();render();}},
    'quiz-answer':answer=>{if(!data.active||currentBlock()?.type!=='theory')return;if(!data.active.runningSince)data.active.runningSince=Date.now();quiz=quiz||data.active.currentMeasurement||{source:'quiz',correct:0,wrong:0};if(quiz.correct)return;const correct=answer===targetById(currentBlock().target).answer;quiz[correct?'correct':'wrong']++;$('#quiz-feedback').textContent=correct?ui("Correct. Now put the idea into practice.", "Correcto. Lleva ahora la idea a la práctica."):ui("Try again: count the degrees from the tonic.", "Prueba otra vez: cuenta los grados desde la tónica.");checkpoint();},
    'next-block':nextBlock,'session-end':endSession,
    'session-block-up':id=>changeSession({type:'move',blockId:id,toIndex:data.active.blocks.findIndex(b=>b.id===id)-1}),
    'session-block-down':id=>changeSession({type:'move',blockId:id,toIndex:data.active.blocks.findIndex(b=>b.id===id)+1}),
    'session-block-remove':id=>changeSession({type:'remove',blockId:id}),
    'session-add-block':addSessionBlock,
    'session-block-edit':editSessionBlock,
    'leave-session':()=>{pauseSession();hideReader();go('home');toast(ui("Session saved to continue later.", "Sesión guardada para continuar después."));},
    'discard-session':()=>{pauseSession();confirm(ui("Discard session", "Descartar sesión"),ui("Only this pending session will be deleted. Saved practices will be kept.", "Se eliminará únicamente esta sesión pendiente. Las prácticas ya guardadas se conservan."),async()=>{const next=copy(data);next.active=null;await store.save(next);data=next;await reminders();resetBlockRuntime();root.hidden=false;go('home');});},
    'continue-piano':()=>switchSessionContext('piano'),
    'delete-session':id=>confirm(ui("Delete saved session", "Eliminar sesión guardada"), ui("Delete this session and its feedback from history and progress totals? Any linked practice plan will become pending again. Works, scores and annotations will be kept.", "¿Eliminar esta sesión y su valoración del historial y del progreso? La práctica planificada asociada volverá a estar pendiente. Se conservarán las obras, partituras y anotaciones."), async()=>{const next=copy(data);deleteSession(next,id);await store.save(next);data=next;await reminders();go('progress');}),
    'session-detail':id=>{dialog.close();go('session-detail',id);},
    'repeat-session':id=>{const s=data.sessions.find(s=>s.id===id);prepare('reading',{title:s.title,context:s.context,blocks:s.blocks});},
    'progress-time-week':id=>{progressTimeWeek=id;const scroll=root.querySelector('.cp-page').scrollTop;render();root.querySelector('.cp-page').scrollTop=scroll;root.querySelector(`[data-action=progress-time-week][data-id="${CSS.escape(id)}"]`)?.focus({preventScroll:true});},
    'progress-time-point':id=>{progressTimePoint=progressTimePoint===id?'':id;const scroll=root.querySelector('.cp-page').scrollTop;render();root.querySelector('.cp-page').scrollTop=scroll;root.querySelector(`[data-action=progress-time-point][data-id="${CSS.escape(id)}"]`)?.focus({preventScroll:true});},
    'progress-time-clear':()=>{progressTimePoint='';const scroll=root.querySelector('.cp-page').scrollTop;render();root.querySelector('.cp-page').scrollTop=scroll;root.querySelector('.cp-time-ranges [aria-pressed=true]')?.focus({preventScroll:true});},
    'progress-time':()=>go('progress-time'),
    'progress-time-range':id=>{if(!TIME_RANGES.includes(id))return;timeFilters.range=id;progressTimePoint='';render();root.querySelector(`[data-action=progress-time-range][data-id="${id}"]`)?.focus({preventScroll:true});},
    'progress-section':id=>{if(!['activity','repertoire','technique'].includes(id))return;progressSection=id;render();},
    'edit-saved-practice':id=>editSavedPractice(id),
    'edit-session-notes':id=>{const s=data.sessions.find(s=>s.id===id);showDialog(ui("Session feedback", "Valoración de la sesión"),`<form>${feedbackFields(s,data.works)}${formEnd()}</form>`,async f=>{const {parts,...feedback}=readFeedback(f);Object.assign(s,feedback);applyWorkParts(s,parts);await persist();dialog.close();render();});},
    'use-midi':()=>switchSessionContext('midi'),
    'profile-back':()=>navigateBack(),
    'profile-practice':()=>go('profile-practice'),
    'sync-settings':()=>{if(cloud?.state.status==='conflict')return actions['cloud-conflicts']();pauseSession();hideReader();go('profile-backup');},
    'profile-backup':()=>go('profile-backup'),
    'profile-reminders':()=>go('profile-reminders'),
    'profile-files':async()=>{fileSearch='';fileLimit=24;go('profile-files');await refreshProfileFiles();},
    'profile-files-more':()=>{const scroll=root.querySelector('.cp-page').scrollTop;fileLimit+=24;render();root.querySelector('.cp-page').scrollTop=scroll;},
    'profile-file':fileDetail,
    'profile-file-catalog':id=>{dialog.close();go('library-detail',id);},
    'profile-file-open':id=>{dialog.close();return actions['open-pdf'](id);},
    'profile-file-remove':id=>{dialog.close();return actions['remove-pdf'](id);},
    'profile-photo':()=>showDialog(ui('Profile picture','Foto de perfil'),`<div class="cp-photo-options">${btn('profile-photo-gallery',ui('Choose from gallery','Elegir de la galería'),'','primary')}${data.preferences.photo?btn('profile-photo-remove',ui('Remove picture','Quitar foto')):''}${btn('close-dialog',ui('Cancel','Cancelar'))}</div>`),
    'profile-photo-gallery':()=>{dialog.close();choosePhoto();},
    'profile-photo-remove':async()=>{dialog.close();await savePhoto(null);toast(ui('Picture removed.','Foto eliminada.'));},
    'profile-appearance':()=>showDialog(ui('Appearance','Apariencia'),appearanceMarkup(data.preferences)+'<div class="cp-actions">'+btn('close-dialog',ui('Done','Hecho'))+'</div>'),
    'set-theme':async mode=>{if(!['light','dark','system'].includes(mode))return;data.preferences.theme=mode;applyTheme(mode);await persist();dialog.querySelectorAll('[data-action=set-theme]').forEach(b=>{const selected=b.dataset.id===mode;b.setAttribute('aria-pressed',String(selected));b.classList.toggle('primary',selected);});},
    'walkthrough':()=>{if(dialog.open)dialog.close();walkthrough.start(routeSnapshot());},
    'rate-app':()=>rateApp().catch(()=>toast(ui('Could not open the app rating.','No se pudo abrir la valoración de la app.'))),
    'share-app':async()=>{try{const shared=await shareApp();if(!shared)toast(ui('App link copied.','Enlace de la app copiado.'));}catch(error){if(error.name!=='AbortError')toast(ui('Could not share the app.','No se pudo compartir la app.'));}},
    'profile-edit':()=>showDialog(ui("Edit profile", "Editar perfil"),identityMarkup(data.preferences,getAppLanguage()),async f=>{const language=String(f.get('language'));if(!Object.hasOwn(APP_LANGUAGES,language))throw Error(ui('Choose a supported language.','Elige un idioma disponible.'));const level=Number(f.get('level'));if(!(Number.isInteger(level)&&level>=1&&level<=4))throw Error(ui('Choose a pianist level.','Elige un nivel de pianista.'));const next=copy(data);next.preferences={...next.preferences,name:String(f.get('name')).trim(),weeklyMinutes:Number(f.get('weeklyMinutes')),language,level};await store.save(next);data=next;setAppLanguage(language);reader.setLanguage?.(language);dialog.close();render();await reminders();toast(ui('Profile saved.','Perfil guardado.'));}),
    about:()=>showDialog(ui('About SPino','Acerca de SPino'),aboutMarkup(getAppLanguage())),
    'profile-data':()=>showDialog(ui("Data on this device", "Datos de este dispositivo"),ui("<p class=\"muted\">Your history, repertoire and scores are stored on this device.</p><div class=\"cp-actions\">", "<p class=\"muted\">Tu historial, repertorio y partituras se guardan en este dispositivo.</p><div class=\"cp-actions\">")+btn('profile-data-backup',ui("Backup & sync", "Copia y sincronización"))+btn('erase-data',ui("Erase notebook", "Borrar cuaderno"),'','danger quiet')+btn('close-dialog',ui("Close", "Cerrar"))+'</div>'),
    'profile-data-backup':()=>{dialog.close();go('profile-backup');},
    'midi-settings':async()=>{pauseSession();if(scoreViewer&&!await scoreViewer.close())return;hideReader();go('instrument');},
    'instrument-connect':()=>instrument.connect(),
    'instrument-device':id=>instrument.connectDevice(id),
    'instrument-forget':id=>instrument.forgetDevice(id),
    'warmup-guide':()=>showWarmupGuide(currentBlock()),
    'session-pick-work':id=>pickSessionWork(id),
    'session-change-work':()=>showDialog(ui("Change piece", "Cambiar obra"),`${workPickerMarkup(data,currentBlock()?.workId,workPlayable)}<p class="muted">${ui("The time you have spent stays with the current piece.", "El tiempo que llevas se queda con la obra actual.")}</p><div class="cp-actions">${btn('close-dialog',ui("Cancel", "Cancelar"))}</div>`),
    'instrument-pedal':id=>instrument.learnPedal(id),'instrument-pedal-reset':()=>instrument.resetPedals(),
    'instrument-autoconnect':()=>instrument.setAutoConnect(!instrument.state.autoConnect),
    'notification-permission':async()=>{if(!reminderState?.enabled){await enableNotifications();return;}const next=copy(data);next.preferences.notificationsEnabled=false;await store.save(next);data=next;await reminders();render();},
    'practice-suggestions':async()=>{if(!reminderState?.enabled)return;const next=copy(data);next.preferences.notificationsEnabled=true;next.preferences.practiceSuggestions=!next.preferences.practiceSuggestions;await store.save(next);data=next;await reminders();render();},
    'export-backup':()=>showDialog(ui('Export backup','Exportar copia'),`<div class="cp-actions">${btn('storage-export',ui('Complete ZIP with recordings','ZIP completo con grabaciones'))}${btn('export-json',ui('Notebook JSON only','Solo cuaderno JSON'))}</div>`),
    'export-json':()=>backupExportOptions(false),
    'convert-backup':()=>backupExportOptions(true),
    'import-backup':()=>showDialog(ui('Restore backup','Restaurar copia'),`<div class="cp-actions">${btn('storage-import',ui('Complete ZIP','ZIP completo'))}${btn('import-json',ui('Notebook JSON','Cuaderno JSON'))}</div>`),
    'import-json':async()=>{if(downloads.busy||libraryDownloads.busy||cloud?.busy)throw new Error(ui("Pause transfers before restoring a backup.", "Pausa las transferencias antes de restaurar una copia."));pauseSession();restoringBackup=true;try{const text=await importFile();if(text)reviewBackupRestore(text);else restoringBackup=false;}catch(error){restoringBackup=false;throw error;}},
    'device-link':()=>{pendingDeviceLink=null;if(driveNotebookAvailable())return cloud?.state.name?actions['cloud-manage']():openDriveNotebooks();showDialog('Google Drive',cloudSetupMarkup(cloudOptions()));},
    'device-link-show':async()=>{dialog.close();const link=await cloud.deviceLink();showDialog(deviceLinkCopy().show,await deviceLinkQRMarkup(link,undefined,cloudTransport.transport==='drive'));},
    'device-link-scan':()=>{pauseSession();const t=deviceLinkCopy();showDialog(t.title,`<div id="device-link-camera"></div><p role="status">${esc(t.scan)}</p><div class="cp-actions">${btn('device-link-manual',t.manual)}${btn('close-dialog',t.close)}</div>`);const controller=new AbortController();dialogCleanup=()=>controller.abort();const stopHidden=()=>{if(document.hidden){controller.abort();document.removeEventListener('visibilitychange',stopHidden);}};document.addEventListener('visibilitychange',stopHidden);controller.signal.addEventListener('abort',()=>document.removeEventListener('visibilitychange',stopHidden),{once:true});void startNotebookScanner(document.querySelector('#device-link-camera'),{signal:controller.signal,onScan:link=>{pendingDeviceLink=link;showDialog(t.title,deviceLinkConfirmMarkup(link,undefined,driveNotebookAvailable()));},onError:error=>{if(dialog.open)document.querySelector('#cp-form-error').textContent=localizeMessage(error.message);}});},
    'device-link-manual':()=>showDialog(deviceLinkCopy().title,deviceLinkManualMarkup(),f=>{pendingDeviceLink=parseDeviceLink(f.get('code'));showDialog(deviceLinkCopy().title,deviceLinkConfirmMarkup(pendingDeviceLink,undefined,driveNotebookAvailable()));}),
    'device-link-copy':async()=>{await navigator.clipboard.writeText(document.querySelector('#device-link-code').value);toast(ui('Connection code copied.','Código de conexión copiado.'));},
    'device-link-connect':async()=>{if(!pendingDeviceLink)return;if(!cloudAvailable())throw new Error(ui('Open the installed app to select your cloud file.','Abre la app instalada para seleccionar el archivo de nube.'));if(driveNotebookAvailable())return openDriveNotebooks(pendingDeviceLink.id,pendingDeviceLink.fileId);throw new Error('Connect Google Drive in the Android app.');},
    'drive-connect':()=>openDriveNotebooks(pendingDeviceLink?.id||null),
    'drive-disconnect':async()=>{mediaSync?.pause();await pauseDriveMedia();await cloud.disconnectDriveAccount();pendingDeviceLink=null;dialog.close();render();},
    'drive-rename':()=>showDialog(driveRecoveryCopy().rename,driveRenameMarkup(cloud.state.name),async form=>{dialog.close();await cloud.rename(String(form.get('name')||''));render();actions['cloud-manage']();}),
    'drive-reconnect':async()=>{dialog.close();await cloudTransport.drive.connect();if(cloud?.state.enabled)await cloud.retry();mediaSync?.markDirty();render();},
    'cloud-setup':()=>cloud?.state.name?actions['cloud-manage']():showDialog(ui("Connect backup", "Conectar copia"),cloudSetupMarkup(cloudOptions())),
    'cloud-manage':()=>showDialog(ui("Manage connection", "Gestionar conexión"),cloudManageMarkup(cloud?.state||{},cloudOptions())),
    'cloud-conflicts':()=>{pauseSession();hideReader();go('profile-backup');showDialog(ui("Review changes", "Revisar cambios"),cloudConflictMarkup(cloud?.state||{},cloudOptions()));},
    'cloud-help':()=>showDialog(ui("Backup & sync", "Copia y sincronización"),cloudHelpMarkup(cloudOptions())),
    'cloud-connect':()=>openDriveNotebooks(),
    'cloud-create-shared':()=>openDriveNotebooks(),
    'cloud-join-shared':()=>openDriveNotebooks(),
    'cloud-resolve-local':()=>{dialog.close();return cloud?.resolve('local');},
    'cloud-resolve-remote':()=>{dialog.close();return cloud?.resolve('remote');},
    'cloud-toggle':async value=>{const managing=dialog.open&&!!dialog.querySelector('.cp-drive-manage');dialog.close();if(value!=='true'){mediaSync?.pause();if(driveNotebookAvailable())await pauseDriveMedia();}await cloud?.setEnabled(value==='true');mediaSync?.markDirty();if(managing){actions['cloud-manage']();dialog.querySelector('[data-action=cloud-toggle]')?.focus({preventScroll:true});}},
    'media-repair':async fileId=>{if(!cloud?.state.enabled)throw Error(ui('Resume synchronization first.','Reanuda primero la sincronización.'));await mediaSync?.repair(fileId);},
    'media-sync':async()=>{if(!cloud?.state.enabled)throw Error(ui('Resume synchronization first.','Reanuda primero la sincronización.'));await cloud.retry();await mediaSync?.sync();},
    'media-mobile-data':async value=>{
      mediaSync?.pause();
      try{if(driveNotebookAvailable())await pauseDriveMedia();saveMediaWifiOnly(value!=='true');}
      finally{const panel=document.querySelector('#cloud-media');if(panel)replaceHelpMarkup(panel,mediaSyncMarkup(mediaSync?.state||{},cloudOptions()));mediaSync?.markDirty();}
      document.querySelector('[data-action=media-mobile-data]')?.focus({preventScroll:true});
    },
    'cloud-sync':async()=>{dialog.close();await cloud?.retry();mediaSync?.markDirty();},
    'cloud-relink':()=>{dialog.close();return cloud?.relink();},
    'cloud-continue-local':async()=>{mediaSync?.pause();if(driveNotebookAvailable())await pauseDriveMedia();cloud?.continueLocal();dialog.close();toast(ui('Working locally. Resume synchronization from Backup & sync.','Trabajando en local. Reanuda la sincronización desde Copia y sincronización.'));},
    'cloud-disconnect':()=>confirm(ui("Disconnect backup", "Desconectar copia"),ui("The connection on this device will stop. Files saved in the cloud will be kept.", "Se detendrá la conexión en este dispositivo. Los archivos guardados en la nube se conservarán."),async()=>{mediaSync?.pause();if(driveNotebookAvailable())await pauseDriveMedia();await cloud.disconnect();}),
    'cloud-restore':async()=>{if(downloads.busy||libraryDownloads.busy||cloud?.busy)throw new Error(ui("Pause transfers before restoring a backup.", "Pausa las transferencias antes de restaurar una copia."));pauseSession();restoringBackup=true;try{const result=await CloudBackup.pickBackup();if(result.text)reviewBackupRestore(result.text);else restoringBackup=false;}catch(error){restoringBackup=false;throw error;}},
    'cloud-recovery':async()=>{if(cloud?.busy)throw new Error(ui("Wait for the current backup to finish.", "Espera a que termine la copia en curso."));pauseSession();reviewBackupRestore((await CloudBackup.readRecovery()).text);},
    'erase-data':()=>confirm(ui("Erase the notebook", "Borrar el cuaderno"),ui("Local data, scores and recordings will be deleted. Exported backups will not be deleted.", "Se eliminarán los datos locales, las partituras y las grabaciones. Las copias que hayas exportado no se borrarán."),async()=>{if(mediaCapture?.busy)throw Error(ui('Finish the recording first.','Termina primero la grabación.'));if(downloads.busy||libraryDownloads.busy||cloud?.busy)throw new Error(ui("Pause downloads before erasing the notebook.", "Pausa las descargas antes de borrar el cuaderno."));await syncReminders({plans:[],events:[]});mediaSync?.stop();if(driveNotebookAvailable())await pauseDriveMedia();await cloud?.disconnect();await cloudTransport.drive?.clearDeviceCache?.();if(cloudAvailable()&&cloudPlatform()==='android')await CloudBackup.clearRecovery();await store.clear();await mediaStore?.clear();location.reload();}),
  };
  const SCORE_OPENERS=new Set(['open-score-practice','open-pdf','library-preview','library-segment-preview','print-work','library-print']);
  root.addEventListener('click', event => {
    const menu = root.querySelector('.cp-work-menu[open]');
    if (menu && (!menu.contains(event.target) || event.target.closest('[data-action]'))) menu.open = false;
  });
  root.addEventListener('keydown', event => {
    if (event.target.closest('[data-action=progress-time-week],[data-action=progress-time-point]') && ['Enter',' '].includes(event.key)) {
      event.preventDefault();if(!event.repeat)handleAction(event);return;
    }
    if (event.key !== 'Escape') return;
    const menu = root.querySelector('.cp-work-menu[open]');
    if (menu) { event.preventDefault(); event.stopPropagation(); menu.open = false; menu.querySelector('summary').focus(); }
  });
  async function handleAction(e) {
    const button=e.target.closest('[data-action]');if(!button || sessionWriting)return;
    const action=actions[button.dataset.action];if(!action)return;
    // Opening a score can take seconds on a phone (viewer code, local file, hash check), so show progress on the button.
    const loading=SCORE_OPENERS.has(button.dataset.action);
    button.disabled=true;if(loading){button.classList.add('cp-loading');button.setAttribute('aria-busy','true');}
    try{await action(button.dataset.id);}catch(error){toast(error.message||ui("Could not complete the action. Please try again.", "No se ha podido completar. Puedes volver a intentarlo."));}finally{button.disabled=false;if(loading){button.classList.remove('cp-loading');button.removeAttribute('aria-busy');}}
  }
  root.addEventListener('click',handleAction);dialog.addEventListener('click',handleAction);
  bindMidiShortcuts(document,{connected:()=>instrument.state.devices.length>0,connect:()=>instrument.reconnectLast().then(()=>{if(instrument.state.error)toast(ui('Could not reconnect MIDI. Hold the icon to open MIDI settings.','No se pudo reconectar el MIDI. Mantén pulsado el icono para abrir los ajustes.'));}).catch(error=>toast(error.message)),settings:()=>actions['midi-settings']().catch(error=>toast(error.message))});
  root.addEventListener('input',e=>{if(view==='prepare'&&preparePurpose==='routine'&&e.target.closest('#prepare-form')){readDraft();const total=root.querySelector('output[for=practice-duration]');if(total)total.value=practiceMinutes(draft.blocks)+(draft.routinePolicy.warmup?draft.routinePolicy.warmupMinutes:0);if(e.target.name==='routine-warmup'){const minutes=root.querySelector('[name=warmup-minutes]');minutes.disabled=!draft.routinePolicy.warmup;minutes.required=draft.routinePolicy.warmup;}return;}if(e.target.dataset.sessionDuration){const row=e.target.closest('[data-session-block]');row.querySelector('[data-session-minutes]').value=e.target.value;e.target.setAttribute('aria-valuetext',e.target.value+' min');const total=root.querySelector('[data-session-planned-total]');if(total)total.textContent=[...root.querySelectorAll('[data-session-minutes]')].reduce((sum,input)=>sum+Number(input.value),data.active.blocks.slice(0,data.active.blockIndex).reduce((sum,b)=>sum+b.minutes,0));return;}if(e.target.id==='profile-file-search'){const position=e.target.selectionStart;fileSearch=e.target.value;fileLimit=24;render();const search=$('#profile-file-search');search.focus();try{search.setSelectionRange(position,position);}catch{}} if(view==='prepare'&&e.target.id==='practice-duration'){readDraft();durationWeights ||= copy(draft.blocks);const resized=resizePractice(durationWeights,e.target.value);draft.blocks.forEach((b,i)=>b.minutes=resized[i].minutes);draft.blocks.forEach((b,i)=>{const field=root.querySelector('[name="minutes-'+i+'"]');if(field)field.value=b.minutes;const summary=root.querySelector('[data-block-summary="'+i+'"]');if(summary)summary.textContent=(i+1)+'. '+ACTIVITIES[b.type]+' · '+b.minutes+' min';});}else if(view==='prepare'&&e.target.name?.startsWith('minutes-')){durationWeights=null;readDraft();const total=practiceMinutes(draft.blocks),slider=$('#practice-duration');slider.max=Math.max(180,total);slider.value=total;root.querySelector('output[for=practice-duration]').value=total;}e.target.closest('#preferences-form')?.setAttribute('data-edited','true');if(e.target.id==='repertoire-search'){const position=e.target.selectionStart;repertoireFilters.search=e.target.value;repertoireIndex=0;render();const search=$('#repertoire-search');search.focus();try{search.setSelectionRange(position,position);}catch{}}if(e.target.type==='range'){const output=root.querySelector(`output[for="${e.target.id}"]`);if(output)output.value=e.target.value;}});
  root.addEventListener('change',async e=>{if(view==='progress-time'&&['type','workId'].includes(e.target.dataset.timeFilter)){const id=e.target.id;timeFilters[e.target.dataset.timeFilter]=e.target.value;render();root.querySelector('#'+id)?.focus({preventScroll:true});return;}if(e.target.id==='practice-duration')durationWeights=null;
    if(e.target.dataset.metroSetting && data.active){const key=e.target.dataset.metroSetting,value=key==='mode'?e.target.value:Number(e.target.value);if((key==='bpm'&&(!Number.isFinite(value)||value<30||value>240))||(key==='volume'&&(!Number.isFinite(value)||value<0||value>100))){e.target.value=metronomeSettings(data.active)[key];return;}data.active.freeMetronome={...metronomeSettings(data.active),[key]:value};const playing=!!metro;stopMetro();if(playing)startMetro();checkpoint();render();return;}
    if (e.target.dataset.sessionMinutes || e.target.dataset.sessionDuration) {
      try { await changeSession({type:'minutes',blockId:e.target.dataset.sessionMinutes || e.target.dataset.sessionDuration,minutes:Number(e.target.value)}); }
      catch(error) { toast(error.message); }
      return;
    }
    if(e.target.id==='library-personal-testing'){try{const next=copy(library);next.personalTesting=e.target.checked;await store.saveLibrary(next);library=next;render();}catch(error){e.target.checked=!!library.personalTesting;toast(error.message);}}
    if(e.target.dataset.repertoireFilter){repertoireFilters[e.target.dataset.repertoireFilter]=e.target.value;repertoireIndex=0;render();}
    if(e.target.id==='wifi-only'){mediaSync?.pause();if(driveNotebookAvailable())await pauseDriveMedia();mediaSync?.markDirty();data.preferences.wifiOnly=e.target.checked;await downloads.policyChanged();await libraryDownloads.policyChanged();}
    if(e.target.id==='library-optional'){try{await libraryUI.reimport(e.target.checked);}catch(error){toast(error.message);}}
    if(e.target.id==='background-timer'&&data.active){data.active.keepTimeInBackground=e.target.checked;checkpoint();}
    if(e.target.id==='calendar-date'){if(e.target.value){selectedDate=e.target.value;render();}}
    if(e.target.id==='catalog-target'){filteredTarget=e.target.value;render();}
    if(view==='prepare'&&(e.target.name?.startsWith('type-')||e.target.name?.startsWith('timing-')||e.target.name==='context')){const wasMobile=draft.context==='mobile';readDraft();if(e.target.name==='context'&&wasMobile&&draft.context!=='mobile'&&!draft.id)for(const b of draft.blocks)if(['reading','technique'].includes(b.type))b.hand=practiceDefaults(data.preferences,b.type).hand;if(preparePurpose!=='routine'&&!draft.id&&draft.blocks.length===1)draft.title=ACTIVITIES[draft.blocks[0].type];render();}
    if(e.target.dataset.milestone!=null){const event=findEvent(data.events,detailId);if(event){event.milestones[+e.target.dataset.milestone].done=e.target.checked;data.events=saveEventOccurrence(data.events,event);try{await persist();}catch{}}}
  });
  window.addEventListener('piano:play',()=>{if(data.active){accrue(data.active);data.active.runningSince=Date.now();checkpoint();}});
  window.addEventListener('piano:quick-answer',event=>{
    if(!data.active?.quickScore||!currentBlock()?.quickPractice)return;
    data.active.quickScore=addQuickAnswer(data.active.quickScore,event.detail.correct,event.detail.ms);
    const display=$('#practice-quick-score');if(display){display.textContent=data.active.quickScore.points;display.classList.remove('is-gain','is-loss');void display.offsetWidth;display.classList.add(event.detail.correct?'is-gain':'is-loss');}
    const best=data.active.quickBest??quickRecords(data.sessions)[0]?.quickScore.points??0;
    const meter=$('#timing-mode .quick-game-meter i');if(meter)meter.style.width=`${best?Math.min(100,data.active.quickScore.points/best*100):0}%`;
    if(best>0&&data.active.quickScore.points>best&&!data.active.quickRecordBeaten){data.active.quickRecordBeaten=true;$('#timing-mode').classList.add('is-record');}
    checkpoint();
  });
  window.addEventListener('piano:pause',()=>{if(data.active){pause(data.active);stopMetro();updateClock();}});
  window.addEventListener('piano:range-changed',()=>{if(data.active&&readerMounted){checkpoint();updateClock();}});
  window.addEventListener('piano:midi-lost',()=>{if(data.active?.context==='midi'){const returnToSession=root.hidden||view==='session';pauseSession();if(returnToSession){hideReader();go('session');}toast(ui("MIDI disconnected. Evaluation has been paused.", "MIDI desconectado. Se ha pausado la evaluación."));}});
  window.addEventListener('piano:devices',()=>{if(!root.hidden&&view==='session')render();});
  window.addEventListener('online',()=>{if(cloud?.state.enabled&&cloud.state.status!=='conflict')cloud.resumeChecks().catch(error=>toast(error.message));downloads.pump().catch(e=>toast(e.message));libraryDownloads.pump().catch(e=>toast(e.message));});
  setInterval(()=>{if(!document.hidden){if(data.downloadJobs.some(j=>j.status==='waiting-wifi'))downloads.pump().catch(()=>{});if(Object.values(library.executions).some(e=>e.job?.status==='waiting-wifi'))libraryDownloads.pump().catch(()=>{});}},10000);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){mediaSync?.pause();if(driveNotebookAvailable())void pauseDriveMedia().catch(()=>{});if(mediaCapture?.requesting)return;if(downloads.busy||libraryDownloads.busy)pauseTransfers().catch(()=>{});if(backgroundTimer()){stopMetro();checkpoint();}else pauseSession();}else {void reminders();void cloud?.resumeChecks().catch(error=>toast(error.message));mediaSync?.markDirty();if(data.active){checkpoint();updateClock();}if(['home','calendar','session','free-practice'].includes(view)&&!dialog.open)render();}});
  let sessionResize;
  window.addEventListener('resize', () => {
    if(view==='prepare')requestAnimationFrame(revealStandSelection);
    clearTimeout(sessionResize);
    sessionResize = setTimeout(() => {
      if (view === 'session' && !root.hidden && !dialog.open && !sessionWriting && !sessionDrag?.active && !document.activeElement?.matches('[data-session-minutes],[data-session-duration]')) {
        const scroll = root.querySelector('.cp-page')?.scrollTop || 0;
        render(); root.querySelector('.cp-page')?.scrollTo(0, scroll);
      }
    }, 150);
  });
  window.addEventListener('pagehide',()=>{mediaSync?.stop();if(driveNotebookAvailable())void pauseDriveMedia().catch(()=>{});setScreenAwake(false).catch(()=>{});pauseSession();});
  window.addEventListener('popstate', navigateBack);
  watchPracticeClock(() => data.active ? {time:clock(totalMs()),blockTime:clock(blockMs()),running:data.active.runningSince!=null} : null, updateClock);
  setInterval(()=>{if(data.active?.runningSince!=null&&Date.now()-checkpointAt>5000){checkpointAt=Date.now();checkpoint();}},500);
  if(data.active){data.active.runningSince=null;toast(ui("Your session was recovered in pause. Time with the app closed was not counted.", "Tu sesión se ha recuperado en pausa. El tiempo con la app cerrada no se ha contado."));}
  await persist().catch(()=>{});render();reminders();refreshProfileFiles().catch(()=>{});instrument.init().catch(error=>console.warn('Instrument setup unavailable.',error));
  library = await importLibrary({ previous: library, save: value => store.saveLibrary(value) });
  let legacyProgress = {}; try { legacyProgress = JSON.parse(localStorage.getItem('sr.progress') || '{}'); } catch {}
  library.legacyMigration = legacyMigrationReport(data, legacyProgress);
  if(!data.active&&walkthrough.needsIntroduction())setTimeout(()=>{if(!data.active&&!dialog.open&&!root.hidden)walkthrough.start(routeSnapshot());},400);
  const localAssets = new Set((await store.assets()).map(a => a.id));
  for (const e of Object.values(library.executions)) if (e.assetId && !localAssets.has(e.assetId)) { e.validated = false; e.render = null; }
  await store.saveLibrary(library); libraryReady = true;
  if (['catalog','library-detail','downloads'].includes(view)) render();
  mediaSync?.markDirty();
  if (cloud) { try { await cloud.init(); } catch(error) { toast(ui('Could not start backup: ', 'No se ha podido iniciar la copia: ')+localizeMessage(error.message)); } }
  if(storageUI&&cloud?.state.name&&!dialog.open){await storageUI.notify();if(['home','profile-backup'].includes(view))render();}
  if(localStorage.getItem('spino.reset-recovery')&&!recoveredNotebook&&!cloud?.state.name)showDialog(ui('Reconnect your notebook','Reconectar tu cuaderno'),`<p>${ui('A verified recovery ZIP is retained on this device.','Se conserva un ZIP de recuperación verificado en este dispositivo.')}</p><div class="cp-actions">${btn('storage-reconnect-reset',ui('Reconnect the same notebook','Reconectar el mismo cuaderno'))}${btn('storage-restore-reset',ui('Restore retained ZIP','Restaurar ZIP conservado'))}</div>`);
  if(recoveredNotebook)showDialog(ui('Recovered notebook','Cuaderno recuperado'),`<p>${ui('This is a separate local recovery. Cloud synchronization is disabled. Your original notebook is intact.','Esta es una recuperación local separada. La sincronización en la nube está desactivada. Tu cuaderno original está intacto.')}</p><div class="cp-actions">${btn('storage-return-original',ui('Return to original notebook','Volver al cuaderno original'))}${btn('close-dialog',ui('Review recovered notebook','Revisar cuaderno recuperado'))}</div>`);

}
