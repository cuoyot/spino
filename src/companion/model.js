import { ui, APP_LANGUAGES } from './locale.js';
import { TARGETS } from './curriculum.js';
import { KEYS } from '../music.js';
import { importTemplate } from '../levels.js';
import { validateAnnotations } from './pdf-annotations.js';
import { validateScoreView } from './score-view.js';
import { validateLibraryState } from './library.js';
import { validPracticeDefaults } from './practice-defaults.js';
import { RHYTHM_VALUES } from './rhythm-levels.js';
import { WARMUP_IDS, validWarmupPreferences } from './warmups.js';
// Versioned, local product data. Dates without times are local calendar dates.
export const VERSION = 1;
export const CONTEXTS = { get mobile() { return ui('Without piano', 'Sin piano'); }, get piano() { return ui('With piano', 'Con piano'); }, get midi() { return ui('MIDI piano', 'Piano MIDI'); } };
export const ACTIVITIES = { get warmup() { return ui('Warm-up', 'Calentamiento'); }, get reading() { return ui('Sight-reading', 'Lectura'); }, get technique() { return ui('Technique', 'Técnica'); }, get repertoire() { return ui('Repertoire', 'Repertorio'); }, get free() { return ui('Free practice', 'Práctica libre'); }, get theory() { return ui('Learn', 'Aprender'); } };
// Keep historical stored values stable; translate labels only.
export const stageLabel = value => ui(({ 'Por empezar': 'Not started', 'En estudio': 'Learning', 'Consolidando': 'Consolidating', 'Mantenimiento': 'Maintaining', 'Archivada': 'Archived' })[value] || value, value);
export const eventTypeLabel = value => ui(({ 'Audición': 'Audition', 'Concierto': 'Concert', 'Clase': 'Lesson', 'Ensayo': 'Rehearsal', 'Otro': 'Other' })[value] || value, value);
export const STAGES = ['Por empezar', 'En estudio', 'Consolidando', 'Mantenimiento', 'Archivada'];
export const uid = () => crypto.randomUUID();
export const copy = value => structuredClone(value);
export function localDate(value = new Date()) {
  const d = typeof value === 'string' ? new Date(value + 'T12:00:00') : value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDays(date, count) { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + count); return localDate(d); }
export function weekOf(date) { const d = new Date(date + 'T12:00:00'); return addDays(date, -((d.getDay() + 6) % 7)); }
export function daysUntil(date, from = localDate()) { return Math.round((Date.parse(date + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000); }
export function emptyData() {
  return { schemaVersion: VERSION, preferences: { name: '', context: 'mobile', weeklyMinutes: 90, wifiOnly: true }, works: [], downloads: [], downloadJobs: [], routines: [], plans: [], events: [], sessions: [], active: null, lastBackup: null };
}
export function block(type = 'reading', values = {}) {
  return { id: uid(), type, minutes: 5, bpm: 60, timing: 'timed', target: 'C-major', hand: 'right', input: 'piano', figures: '1', passage: '', workId: '', ...values };
}
export function beginSession({ title, context, blocks, planId = null }, now = Date.now()) {
  if (!CONTEXTS[context] || !blocks?.length) throw new Error(ui("Choose an activity and a context.", "Elige una actividad y un contexto."));
  if (context === 'mobile' && blocks.some(b => ['free', 'repertoire', 'warmup'].includes(b.type))) throw new Error(ui("This activity needs a piano. Choose reading or technique without a piano.", "Esta actividad necesita un piano. Elige lectura o una lección sin piano."));
  return { id: uid(), title, context, planId, blocks: copy(blocks), blockIndex: 0, results: [], startedAt: new Date(now).toISOString(), date: localDate(new Date(now)), elapsedMs: 0, blockElapsedMs: 0, runningSince: null, updatedAt: now, notes: '', next: '' };
}
export function accrue(active, now = Date.now()) {
  if (active.runningSince != null) {
    const delta = Math.max(0, now - active.runningSince);
    active.elapsedMs += delta; active.blockElapsedMs += delta; active.runningSince = now;
  }
  active.updatedAt = now;
  return active;
}
export function pause(active, now = Date.now()) { accrue(active, now); active.runningSince = null; return active; }
export function finishBlock(active, measurement = null, now = Date.now()) {
  pause(active, now);
  const current = active.blocks[active.blockIndex];
  const material = active.readerSnapshot ? { generator: 'scale-pattern-v1', target: current.target, notes: copy(active.readerSnapshot.line.notes), onsets: copy(active.readerSnapshot.line.onsets) } : null;
  active.results.push({ block: copy(current), context: active.context, elapsedMs: active.blockElapsedMs, measurement: measurement ? copy(measurement) : null, material });
  active.blockIndex++; active.blockElapsedMs = 0;
}
export function saveSession(data, active, { title = active.title, mood = null, workIds = null, notes = '', next = '', partial = false, measurement = null } = {}, now = Date.now()) {
  if (mood !== null && (!Number.isInteger(mood) || mood < 1 || mood > 5)) throw new Error(ui("Choose a rating between 1 and 5.", "Elige una valoración entre 1 y 5."));
  if (data.sessions.some(s => s.id === active.id)) throw new Error(ui("This session has already been saved.", "Esta sesión ya está guardada."));
  pause(active, now);
  if (active.blockIndex < active.blocks.length) finishBlock(active, measurement, now);
  const session = { ...copy(active), title: title.trim() || active.title, mood, workIds: workIds || [...new Set(active.results.map(r => r.block.workId).filter(Boolean))], runningSince: null, endedAt: new Date(now).toISOString(), notes, next, status: partial ? 'partial' : 'completed', manual: false };
  data.sessions.unshift(session); if (data.active?.id === active.id) data.active = null;
  if (active.planId) {
    const plan = data.plans.find(p => p.id === active.planId);
    if (plan) { plan.sessionId = session.id; plan.status = session.status; }
  }
  return session;
}
export function summary(sessions) {
  const byType = {}; const byTarget = {};
  for (const session of sessions) for (const result of session.results || []) {
    byType[result.block.type] = (byType[result.block.type] || 0) + result.elapsedMs;
    if (['reading', 'technique', 'theory'].includes(result.block.type)) byTarget[result.block.target] = (byTarget[result.block.target] || 0) + result.elapsedMs;
  }
  return { count: sessions.length, minutes: Math.round(sessions.reduce((n, s) => n + s.elapsedMs, 0) / 60000), days: new Set(sessions.map(s => s.date)).size, byType, byTarget };
}

export function deleteSession(data, id) {
  const index = data.sessions.findIndex(session => session.id === id);
  if (index < 0) throw new Error(ui("This session no longer exists.", "Esta sesión ya no existe."));
  data.sessions.splice(index, 1);
  for (const plan of data.plans) if (plan.sessionId === id) {
    delete plan.sessionId;
    plan.status = 'planned';
  }
}

function fail() { throw new Error(ui("The backup is invalid or uses an unsupported version. No data has been replaced.", "La copia no es válida o utiliza una versión no compatible. No se ha reemplazado ningún dato.")); }
const obj = v => v && typeof v === 'object' && !Array.isArray(v);
const str = (v, max = 20000) => typeof v === 'string' && v.length <= max;
const number = v => Number.isFinite(v) && v >= 0;
const validTarget = v => TARGETS.some(t => t.id === v);
const date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && localDate(v) === v;
function validBlock(b) {
  if (b?.level != null && (!Number.isInteger(b.level) || b.level < 0 || b.level > 2)) return false;
  if (b?.presentation != null && !['auto', 'page', 'scroll'].includes(b.presentation)) return false;
  if (b?.timing !== undefined && !['timed', 'wait'].includes(b.timing)) return false;
  return obj(b) && str(b.id, 100) && Object.hasOwn(ACTIVITIES,b.type) && number(b.minutes) && b.minutes <= 600 && number(b.bpm) && b.bpm >= 30 && b.bpm <= 160 && (b.type === 'warmup' ? WARMUP_IDS.includes(b.target) : validTarget(b.target) || b.target === null && ['repertoire','free'].includes(b.type)) && (['right', 'left'].includes(b.hand) || b.hand === 'both' && ['reading', 'technique', 'warmup'].includes(b.type)) && ['piano', 'names'].includes(b.input) && RHYTHM_VALUES.includes(b.figures) && str(b.passage) && str(b.workId, 100);
}
function validMusic(material) {
  if(!obj(material)||!Array.isArray(material.notes)||material.notes.length>100000||!Array.isArray(material.onsets)||material.onsets.length!==material.notes.length)return false;
  return material.notes.every(n=>obj(n)&&Number.isInteger(n.d)&&n.d>=5&&n.d<=56&&number(n.midi)&&n.midi>=21&&n.midi<=108&&['c','d','e','f','g','a','b'].includes(n.letter)&&['','n','#','b','##','bb'].includes(n.acc)&&['q','h','w','8','16','qd','hd','8d'].includes(n.dur)&&Number.isInteger(n.bar)&&n.bar>=0&&number(n.start)&&number(n.units)&&['treble','bass'].includes(n.clef))&&material.onsets.every(number);
}
function validMeasurement(value) {
  return value == null || obj(value) && ['screen', 'midi', 'quiz'].includes(value.source) && number(value.correct) && number(value.wrong);
}
function validReaderSnapshot(snap) {
  if (snap == null) return true;
  const line = snap.line;
  return obj(snap) && validMusic(line) && Array.isArray(line.states) && line.states.length === line.notes.length &&
    line.states.every(state => ['pending', 'current', 'correct', 'late', 'missed', 'played'].includes(state)) &&
    Object.hasOwn(KEYS, line.key) && Number.isInteger(line.idx) && line.idx >= 0 && line.idx <= line.notes.length &&
    number(line.beats) && number(line.bars) && Number.isFinite(snap.beat) && obj(snap.settings) &&
    (line.waitBars === undefined || [2, 4].includes(line.waitBars));
}
export function validateData(input) {
  if (input?.preferences?.language !== undefined && !Object.hasOwn(APP_LANGUAGES, input.preferences.language)) fail();
  if (input?.preferences?.practiceDefaults != null && !validPracticeDefaults(input.preferences.practiceDefaults)) fail();
  if (input?.preferences?.warmup != null && !validWarmupPreferences(input.preferences.warmup)) fail();
  if (input?.preferences?.level !== undefined && !(Number.isInteger(input.preferences.level) && input.preferences.level >= 1 && input.preferences.level <= 4)) fail();
  if (input?.preferences?.photo != null && (!str(input.preferences.photo, 400000) || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(input.preferences.photo))) fail();
  if (!obj(input) || input.schemaVersion !== VERSION || !obj(input.preferences) || !Object.hasOwn(CONTEXTS,input.preferences.context) || !str(input.preferences.name, 80) || !number(input.preferences.weeklyMinutes) || input.preferences.weeklyMinutes>3000) fail();
  for (const key of ["works", 'routines', 'plans', 'events', "sessions"]) {
    const list = input[key];
    if (!Array.isArray(list) || list.length > 20000 || list.some(v => !obj(v) || !str(v.id, 100) || !v.id) || new Set(list.map(v => v.id)).size !== list.length) fail();
  }
  for (const w of input.works) {
    if (!str(w.title, 200) || !str(w.composer, 200) || !STAGES.includes(w.stage) || !str(w.notes) || !str(w.passage) || !number(w.bpm) || w.target !== null && !validTarget(w.target)) fail();
    if (w.tags !== undefined && (!Array.isArray(w.tags) || w.tags.length > 20 || w.tags.some(t=>!str(t,40)||!t.trim()))) fail();
    if (w.favorite !== undefined && typeof w.favorite !== 'boolean') fail();
    if (w.trashedAt !== undefined && (!str(w.trashedAt,40) || !Number.isFinite(Date.parse(w.trashedAt)))) fail();
  }
  for (const r of [...input.routines, ...input.plans]) if (!str(r.title, 200) || !CONTEXTS[r.context] || !Array.isArray(r.blocks) || !r.blocks.length || r.blocks.length > 30 || !r.blocks.every(validBlock)) fail();
  for (const p of input.plans) if (!date(p.date) || !str(p.time, 5) || !['planned', 'completed', 'partial'].includes(p.status)) fail();
  for (const item of [...input.plans, ...input.events]) if (item.recurrence != null) {
    const r = item.recurrence;
    if (!obj(r) || !str(r.id, 100) || !r.id || r.frequency !== 'weekly' || !date(r.until)) fail();
  }
  for (const e of input.events) if (!date(e.date) || !str(e.title, 200) || !str(e.time, 5) || !str(e.notes) || !str(e.place, 200) || !Array.isArray(e.workIds) || !e.workIds.every(v => str(v, 100)) || (e.milestones != null && (!Array.isArray(e.milestones)||e.milestones.length>100||!e.milestones.every(m=>obj(m)&&str(m.title,200)&&typeof m.done==='boolean')))) fail();
  const checkSession = s => {
    if (!obj(s) || !str(s.id, 100) || !str(s.title, 200) || !CONTEXTS[s.context] || !date(s.date) || !number(s.elapsedMs) || !Array.isArray(s.blocks) || !s.blocks.every(validBlock) || !Array.isArray(s.results) || !Number.isInteger(s.blockIndex) || s.blockIndex < 0 || s.blockIndex > s.blocks.length || !number(s.blockElapsedMs)) fail();
    for (const r of s.results) {
      if (!obj(r) || !validBlock(r.block) || !number(r.elapsedMs) || !CONTEXTS[r.context]) fail();
      if (!validMeasurement(r.measurement)) fail();
      if(r.material!=null&&!validMusic(r.material))fail();
    }
    if (s.notes != null && !str(s.notes) || s.next != null && !str(s.next)) fail();
    if (s.mood != null && (!Number.isInteger(s.mood) || s.mood < 1 || s.mood > 5)) fail();
    if (s.workIds != null && (!Array.isArray(s.workIds) || s.workIds.length > 500 || !s.workIds.every(id => str(id, 100)))) fail();
    if (!validMeasurement(s.currentMeasurement) || !validReaderSnapshot(s.readerSnapshot)) fail();
    if (s.blockRuntime != null) {
      const remaining = new Set(s.blocks.slice(s.blockIndex + 1).map(b => b.id));
      if (new Set(s.blocks.map(b => b.id)).size !== s.blocks.length) fail();
      if (!Array.isArray(s.blockRuntime) || s.blockRuntime.length > 30 || new Set(s.blockRuntime.map(r => r?.blockId)).size !== s.blockRuntime.length) fail();
      for (const runtime of s.blockRuntime) {
        if (!obj(runtime) || !str(runtime.blockId, 100) || !remaining.has(runtime.blockId) || !Object.hasOwn(CONTEXTS, runtime.context) ||
          !number(runtime.elapsedMs) || !validMeasurement(runtime.measurement) || !validReaderSnapshot(runtime.readerSnapshot)) fail();
      }
      if (s.blockRuntime.reduce((sum, r) => sum + r.elapsedMs, s.blockElapsedMs) > s.elapsedMs) fail();
    }
  };
  input.sessions.forEach(checkSession);
  if (input.active != null) checkSession(input.active);
  // Remove prototype-bearing keys anywhere before data enters the application.
  const safe = JSON.parse(JSON.stringify(input), (key, value) => ['__proto__', 'constructor', 'prototype'].includes(key) ? undefined : value);
  safe.downloads ||= [];
  safe.preferences.wifiOnly ??= true;
  if (typeof safe.preferences.wifiOnly !== 'boolean') fail();
  safe.downloadJobs ||= [];
  if (!Array.isArray(safe.downloadJobs) || safe.downloadJobs.length > 500 || !safe.downloadJobs.every(j => obj(j) && str(j.catalogId,100) && str(j.revision,100) && ['queued','downloading','paused','waiting-wifi','failed','complete'].includes(j.status) && number(j.loaded) && number(j.total))) fail();
  if (new Set(safe.downloadJobs.map(j=>j.catalogId)).size !== safe.downloadJobs.length || safe.downloadJobs.some(j=>j.error != null && !str(j.error))) fail();
  for (const job of safe.downloadJobs) if (job.status === 'downloading') job.status = 'paused';
  if(!Array.isArray(safe.downloads)||safe.downloads.length>500||!safe.downloads.every(d=>obj(d)&&str(d.catalogId,100)&&str(d.assetId,100)&&str(d.title,200)))fail();
  if (new Set(safe.downloads.map(d=>d.catalogId)).size !== safe.downloads.length || safe.downloads.some(d=>d.revision != null && !str(d.revision,100))) fail();
  if (safe.active) safe.active.runningSince = null; // Recovery never counts time while the app was closed.
  return safe;
}
export function validateBackup(text) {
  let backup; try { backup = JSON.parse(text); } catch { fail(); }
  if (!obj(backup) || backup.format !== 'cuaderno-piano' || backup.version !== VERSION || !Array.isArray(backup.assets) || backup.assets.length > 500) fail();
  backup.data = validateData(backup.data);
  const ids = new Set();
  for (const a of backup.assets) {
    if (!obj(a) || !str(a.id, 100) || ids.has(a.id) || !str(a.name, 250) || !str(a.base64, 34000000) || !/^[A-Za-z0-9+/]*={0,2}$/.test(a.base64)) fail();
    if (a.type === 'application/pdf') { if (!a.base64.startsWith('JVBERi0') || a.base64.length > 28000000) fail(); }
    else if (!['application/vnd.recordare.musicxml', 'application/vnd.recordare.musicxml+xml'].includes(a.type) || !['mxl', 'musicxml'].includes(a.format) || !str(a.pieceId, 100) || !/^[a-f0-9]{64}$/.test(a.sha256)) fail();
    ids.add(a.id);
    if (a.annotations != null) a.annotations = validateAnnotations(a.annotations);
    if (a.scoreView != null) a.scoreView = validateScoreView(a.scoreView);
  }
  for (const w of [...backup.data.works,...backup.data.downloads]) if (w.assetId && !ids.has(w.assetId)) fail();
  if (backup.library != null) {
    backup.library = validateLibraryState(backup.library);
    for (const [pieceId, execution] of Object.entries(backup.library.executions)) if (execution.assetId) {
      const asset = backup.assets.find(a => a.id === execution.assetId);
      if (!asset || asset.pieceId !== pieceId || asset.sha256 !== execution.sha256 || asset.sourceAssetId !== execution.sourceAssetId) fail();
    }
  }
  if (backup.legacy != null && !obj(backup.legacy)) fail();
  for(const [key,value] of Object.entries(backup.legacy||{})) {
    if(value==null)continue;
    if(!str(value,2000000))fail();
    if(key==='sr.startedL1'){if(value!=='1')fail();continue;}
    if(!['sr.settings','sr.templates','sr.progress','sr.stats'].includes(key))fail();
    let v;try{v=JSON.parse(value,(k,val)=>['__proto__','constructor','prototype'].includes(k)?undefined:val);}catch{fail();}if(!obj(v))fail();
    if(key==='sr.settings') {
      try{Object.assign(v,importTemplate(JSON.stringify({'sightreader-template':1,name:'Restaurado',settings:v}),()=> 'restored').settings);}catch{fail();}
      const enums={input:['piano','names','none'],lang:['en','es','fr',"de",'it','pt','ru','ja'],naming:['english','solfege','french','german','russian','japanese'],guide:['off','keys','lights'],soundMode:['off','tone','voice']};
      for(const [k,list] of Object.entries(enums))if(v[k]!=null&&!list.includes(v[k]))fail();
      if(v.zoom!=null&&(!number(v.zoom)||v.zoom<.5||v.zoom>2))fail();
      if(v.kbLo!=null&&(!Number.isInteger(v.kbLo)||v.kbLo<5||v.kbLo>56))fail();
    }
    if(key==='sr.templates') {
      if(!Array.isArray(v.list)||v.list.length>500)fail();
      for(const tpl of v.list){if(!obj(tpl)||!str(tpl.id,100)||!str(tpl.name,100))fail();try{Object.assign(tpl,importTemplate(JSON.stringify({'sightreader-template':1,...tpl}),()=>tpl.id));}catch{fail();}}
    }
    if(key==='sr.progress'&&(!obj(v.done)||!obj(v.results)||!Object.values(v.results).every(a=>Array.isArray(a)&&a.length<=200&&a.every(n=>n===0||n===1))))fail();
    if(key==='sr.stats'&&(!obj(v.notes)||!Object.entries(v.notes).every(([id,n])=>/^[a-g](##|bb|#|b|)-?\d+$/.test(id)&&obj(n)&&number(n.seen)&&number(n.wrong)&&number(n.ms))))fail();
    backup.legacy[key]=JSON.stringify(v);
  }
  return backup;
}
