import './companion/theme.js';
import { ui, getAppLanguage } from './companion/locale.js';
import './midi-indicator.css';
import { midiIndicatorMarkup, setMidiContext } from './midi-indicator.js';
import './style.css';
import './layout.css';
import './keyboard-material.css';
import './companion/print-controls.css';
import './landscape-keyboard.css';
import { KEYS, NAMINGS, generatePhrase, generateRandomBars, generateScaleBars, generateTwoHands, assignFingering, scaleNotes, pickKey, keyInfo, TIME_SIGS, allowedUnits, shortestUnit, noteLabel, noteId, rangeFor, makeNote, samePitchClass, setNaming, namingForLocale, letterName, labelFromId, pitchName } from './music.js';
import { renderScore, renderPage, pxPerBeatFor, setUserZoom } from './render.js';
import { pageSystemCount, pageBarCount } from './page-layout.js';
import { LANGUAGES, t, tError, setLanguage, languageForLocale, applyStatic } from './i18n.js';
import { LEVELS, TEMPLATE_KEYS, levelIndex, isLevel, clone, exerciseOf, exportTemplate, importTemplate, DEFAULT_GOAL, prefersMidi } from './levels.js';
import { playNote, holdNote, click, now as audioNow } from './audio.js';
import { sing, syllableFor } from './voice.js';
import * as midi from './midi.js';
import { bootCompanion } from './companion/app.js';
import { generateTargetBars, targetById } from './companion/curriculum.js';
import { rhythmFigures, rhythmLevel } from './companion/rhythm-levels.js';
import { warmupExercises, warmupLabel, warmupUnit } from './companion/warmups.js';

// ---------- persistence ----------
const DEFAULTS = {
  mode: 'melody', pianoMode: false, hands: 'alternate', layoutMode: 'scroll', position: 'free', clef: 'treble', level: 0, maxAcc: 2, scale: 'major', accidentals: false,
  timeSig: '4/4', figures: { w: false, h: true, q: true, e: false, s: false }, dotted: false,
  timing: 'timed', bpm: 60, metronome: true, stopOnMiss: false, tolerance: 'normal', light: 'normal', zoom: 1, guide: 'off', fingering: false, input: 'piano', soundMode: 'tone', reveal: true,
  kbZoom: 1,
  naming: namingForLocale(navigator.language),
  lang: languageForLocale(navigator.language),
};
function load(name, fallback) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(name) || '{}') }; } catch { return { ...fallback }; }
}
function save(name, value) {
  try { localStorage.setItem(name, JSON.stringify(value)); } catch { /* storage unavailable */ }
}
const settings = load('sr.settings', DEFAULTS);
settings.kbZoom = Math.max(1, Math.min(2.5, Number(settings.kbZoom) || 1));
// older versions stored a sound on/off checkbox
if (settings.sound === false && !localStorage.getItem('sr.settings')?.includes('soundMode')) settings.soundMode = 'off';
delete settings.sound;
// before bars/figures existed the default mode was random notes: start those users on harmony melodies
if (!localStorage.getItem('sr.settings')?.includes('timeSig')) settings.mode = 'melody';
delete settings.key;
delete settings.rhythm;
setNaming(settings.naming);
setLanguage(settings.lang);
setUserZoom(settings.zoom);
// Legacy exercises stay timed; managed mobile practice can opt into self-paced reading.
settings.timing = 'timed';
settings.stopOnMiss = false;
if (settings.guide === true) settings.guide = 'keys';
if (!['off', 'keys', 'lights'].includes(settings.guide)) settings.guide = 'off';

// ---------- templates & levels ----------
// Built-in levels + the user's own templates. settings.templateId says which one is active.
const customs = load('sr.templates', { list: [] }).list;
const progress = load('sr.progress', { done: {}, results: {}, forTemplate: null });
const newId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const findTemplate = (id) => LEVELS.find((l) => l.id === id) || customs.find((c) => c.id === id) || null;
const activeTemplate = () => findTemplate(settings.templateId);
const onLevel = () => isLevel(settings.templateId);
function saveCustoms() { save('sr.templates', { list: customs }); }
function saveProgress() { save('sr.progress', progress); }

// brand-new user: start on level 1
if (!activeTemplate() && !localStorage.getItem('sr.settings')) {
  Object.assign(settings, clone(LEVELS[0].settings));
  settings.templateId = LEVELS[0].id;
}
// upgrading user: keep the old exercise settings as a personal template, but start on level 1
if (!activeTemplate()) {
  if (settings.clef === 'grand') settings.pianoMode = true;
  if (settings.clef === 'grand') settings.clef = 'treble';
  const legacy = { id: newId(), name: t('myTemplate'), legacy: true, settings: exerciseOf(settings), goal: DEFAULT_GOAL };
  customs.push(legacy);
  saveCustoms();
  applyTemplate(LEVELS[0]);
}
// users who upgraded before this fix were left on their old settings: move them to level 1 once,
// as long as they have not started the level progression yet
if (!localStorage.getItem('sr.startedL1')) {
  const tpl = activeTemplate();
  const noProgress = !Object.keys(progress.done).length && !Object.values(progress.results).some((a) => a && a.length);
  if (tpl && !isLevel(tpl.id) && !tpl.base && noProgress) applyTemplate(LEVELS[0]);
  try { localStorage.setItem('sr.startedL1', '1'); } catch { /* storage unavailable */ }
}

function applyTemplate(tpl) {
  Object.assign(settings, clone(tpl.settings));
  settings.timing = 'timed';
  settings.stopOnMiss = false;
  settings.templateId = tpl.id;
  settings.kbLo = null;
  if (progress.forTemplate !== tpl.id) {
    progress.forTemplate = tpl.id;
    progress.results = {};
    saveProgress();
  }
  save('sr.settings', settings);
}

// A level is playable when the previous one is done (custom templates always are)
const unlocked = () => true; // any level can be practised; "your level" still only counts levels passed in order

// Editing a built-in level forks it into a personal copy, which is what gets edited
function forkIfLevel() {
  if (!onLevel()) return false;
  const lvl = activeTemplate();
  const tpl = { id: newId(), name: t('customCopy', { name: levelName(lvl) }), base: lvl.id, settings: exerciseOf(settings), goal: clone(lvl.goal) };
  customs.push(tpl);
  saveCustoms();
  settings.templateId = tpl.id;
  progress.forTemplate = tpl.id;
  progress.results = {};
  saveProgress();
  toast(t('forked', { name: tpl.name }));
  return true;
}

// keep the active custom template in sync with the exercise settings
function syncTemplateFromSettings() {
  const tpl = activeTemplate();
  if (!tpl || isLevel(tpl.id)) return;
  tpl.settings = exerciseOf(settings);
  saveCustoms();
}

const levelName = (tpl) => (isLevel(tpl.id) ? t('lvl' + (levelIndex(tpl.id) + 1)) : tpl.name);
const levelDesc = (tpl) => (isLevel(tpl.id) ? t('lvl' + (levelIndex(tpl.id) + 1) + 'd') : tpl.base && findTemplate(tpl.base) ? t('basedOn', { name: levelName(findTemplate(tpl.base)) }) : '');

let toastTimer = 0;
function toast(text) {
  feedback(text, '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => feedbackEl.textContent === text && feedback('', ''), 2500);
}

// Legacy phone exercises use one staff; managed two-hand practice always uses the grand staff.
const isPhone = () => Math.min(window.innerWidth, window.innerHeight) < 600;
const managedBothHands = () => ['reading', 'technique', 'warmup'].includes(managed?.block.type) && managed.block.hand === 'both' && managed.context !== 'mobile';
// Warm-ups show their fingering unless hidden for that block; the saved preference is left untouched.
const fingersShown = () => managed?.block.type === 'warmup' ? managed.fingers !== false : !!settings.fingering;
const clef = () => managedBothHands() ? 'grand' : (settings.pianoMode ? (isPhone() ? (line && line.hand) || 'treble' : 'grand') : settings.clef === 'grand' ? 'treble' : settings.clef);
// Managed practice supports fixed pages on phones as well as tablets.
const selfPaced = () => managed?.context === 'mobile' && managed.block.timing === 'wait';
const mobileKeyboardPractice = () => managed?.context === 'mobile' && settings.input === 'piano';
const pageMode = () => selfPaced() || settings.layoutMode === 'page' && (!isPhone() || !!managed);
const BARS_PER_SYSTEM = 4;
const responsiveBars = () => managed?.block.type === 'warmup'
  ? pageBarCount(staffEl.clientWidth, beatsPerBar(), warmupUnit(managed.block.figures) / 4, pageZoom() * 1.08)
  : managed && staffEl.clientWidth < 600 ? 2 : BARS_PER_SYSTEM;
const barsPerSystem = () => selfPaced() ? line?.waitBars || responsiveBars() : responsiveBars();
// Managed practice supports simultaneous hands on phones and tablets, including manual piano practice.
const togetherMode = () => managedBothHands() || settings.pianoMode && settings.hands === 'together' && !isPhone() && settings.mode === 'melody';
const MIN_KEY = 44; // CSS px; never squeeze keys to fit an entire octave
const MAX_KEY = 64;
const PIANO_BOTTOM = 5; // A0 in diatonic index
const PIANO_TOP = 56; // C8
const stats = load('sr.stats', { notes: {} });
let midiDevices = []; // names of connected MIDI inputs
midi.on('noteOff', (e) => {
  const k = pianoEl.querySelector(`[data-midi="${e.midi}"]`);
  if (k) k.classList.remove('down');
});

// ---------- elements ----------
const $ = (s) => document.querySelector(s);
const staffEl = $('#staff');
const playheadEl = $('#playhead');
const readWinEl = $('#read-window');
const feedbackEl = $('#feedback');
const pianoEl = $('#piano');
const namesEl = $('#names');
const startBtn = $('#start');
const kbBar = $('#kb-bar');
const kbShift = $('#kb-shift');
const kbRange = $('#kb-range');
const kbAuto = $('#kb-auto');
const kbHint = $('.kb-hint');
const managedKeyboardPosition = $('#managed-keyboard-position');
const quickControls = $('.quick');
const practiceSettings = $('#q-clef');
const soundControl = $('#q-sound');
// Visible count-in before the first note, after a page turn and after moving the focus.
const countEl = Object.assign(document.createElement('div'), { id: 'count-in', hidden: true });
countEl.setAttribute('aria-hidden', 'true');
$('#staff-wrap').append(countEl);
const lightsEl = $('#lights');

// ---------- session state ----------
const session = { correct: 0, wrong: 0, streak: 0, best: 0, times: [] };
let line = null; // note stream: { notes, onsets, states, key, melody, beats, bars, idx, misses, shownAt }
let timed = null; // tempo clock, independent of answers
let waiting = null; // self-paced reading has no musical clock
let waitingGuideTransition = 'none';
let waitingGuideUntil = 0;
let layout = null;
let pianoVis = null; // visible keyboard window { lo, hi, loMidi, hiMidi }
let practiceKeyboardRange = null; // window used to prepare the current mobile exercise
let pianoKeyW = 40;
let managed = null;
let readerVisible = false;
let suspendedByCompanion = false;
const readerEvent = (name, detail = {}) => window.dispatchEvent(new CustomEvent(`piano:${name}`, { detail }));

// a key within the allowed number of accidentals (different from the current one when possible)
function resolvedKey(forceNew) {
  if (managed) return targetById(managed.block.target).key;
  const k = line && line.key;
  const ok = k && Math.abs(KEYS[k]) <= settings.maxAcc && (settings.scale === 'both' || (settings.scale === 'minor') === k.endsWith('m'));
  return ok && !forceNew ? k : pickKey(settings.maxAcc, settings.scale, k);
}

const beatsPerBar = () => TIME_SIGS[settings.timeSig] || 4;
const ppb = () => pxPerBeatFor(managed?.block.type === 'warmup'
  ? warmupUnit(managed.block.figures)
  : shortestUnit(allowedUnits(settings.figures, settings.dotted)));

function weightOf(n) {
  const s = stats.notes[noteId(n)];
  if (!s) return 2;
  const errRate = (s.wrong + 0.5) / (s.seen + 2);
  const slow = Math.min(2, s.ms / Math.max(1, s.seen - s.wrong) / 2000 || 0);
  return 1 + 4 * errRate + slow;
}

function record(n, ok, ms) {
  const id = noteId(n);
  const s = (stats.notes[id] ||= { seen: 0, wrong: 0, ms: 0 });
  s.seen++;
  if (!ok) s.wrong++;
  else s.ms += ms;
  save('sr.stats', stats);
}

// ---------- note stream ----------
// Notes form an endless stream: chunks are appended ahead of the player so there is always music to
// read ahead, and the score scrolls left as you go. line.idx is the first note not yet played.
function genOpts() {
  return { ...settings, clef: clef(), key: line.key, prevPos: line.lastPos, vis: settings.input === 'piano' ? { ...pianoVis, exact: settings.kbLo != null } : null, warmupSet: managed?.block.type === 'warmup' ? managed.block.exercises : null };
}

function appendChunk() {
  const chunk = managed ? generateTargetBars(genOpts(), managed.block.target, managed.block.type === 'technique', line.bars)
    : line.warmup
    ? generateScaleBars(genOpts(), line.warmPhase++)
    : line.together ? generateTwoHands(genOpts(), line.lastD)
    : line.melody ? generatePhrase(genOpts(), line.lastD) : generateRandomBars(genOpts(), weightOf, 2);
  const chunkBars = Math.max(...chunk.map((n) => n.bar)) + 1;
  // fingers + hand-position changes, continuing from where each hand was
  line.fingerWin = assignFingering(chunk, line.fingerWin || {});
  chunk.forEach((n) => { if (n.pos != null) (line.lastPos ||= {})[n.clef] = n.pos; });
  chunk.forEach((n) => {
    line.onsets.push(line.beats + n.start / 4);
    n.bar += line.bars;
    line.notes.push(n);
    line.states.push('pending');
  });
  line.beats += chunkBars * beatsPerBar();
  line.bars += chunkBars;
  const melodyNotes = chunk.filter((n) => n.clef !== 'bass' || !line.together);
  line.lastD = (melodyNotes[melodyNotes.length - 1] || chunk[chunk.length - 1]).d;
}

// how many beats of music must exist beyond `beat` to fill the look-ahead area
function aheadBeats() {
  if (!layout) return 16;
  return (staffEl.clientWidth - layout.readX) / (layout.ppb * layout.zoom) + 8;
}

function ensureAhead(beat) {
  let added = false;
  if (pageMode()) {
    // a whole extra sheet, so a page turn never waits for generation
    const need = pageEnd() + pageBeats();
    while (line.beats < need) {
      appendChunk();
      added = true;
    }
    return added;
  }
  while (line.beats - beat < aheadBeats()) {
    appendChunk();
    added = true;
  }
  return added;
}

// ---------- fixed sheet ----------
// Target zoom for the sheet: a comfortable 1.15x scaled by the user's size preference; the number of
// systems is whatever fits at that size (smaller notation = more lines on the page).
const pageZoom = () => Math.max(0.6, Math.min(2.4, 1.0 * (settings.zoom || 1)));
function systemsFit() {
  const h = staffEl.clientHeight || 400;
  return pageSystemCount(h,clef()==='grand',pageZoom()*1.08);
}
const pageBeats = () => systemsFit() * barsPerSystem() * beatsPerBar();
const pageEnd = () => (line.pageStart || 0) + pageBeats();

function syncPageControls() {
  const visible = !!managed && pageMode() && !selfPaced();
  $('#score-pages').hidden = !visible;
  document.body.dataset.scorePage = String(visible);
  if (!visible || !line) return;
  $('#score-prev').disabled = !(line.pageStart > 0);
  $('#score-page-label').textContent = `${ui('Measures','Compases')} ${Math.floor((line.pageStart || 0) / beatsPerBar()) + 1}–${Math.floor(pageEnd() / beatsPerBar())}`;
}
function browsePage(direction) {
  if (!managed || !pageMode() || selfPaced() || !line) return;
  companionPause();
  const beat = Math.max(0, (line.pageStart || 0) + direction * pageBeats());
  line.pageStart = beat;
  ensureAhead(beat);
  // Browsing skips no notes as errors and never adds time to the practice clock.
  line.idx = line.onsets.findIndex(onset => onset >= beat);
  if (line.idx < 0) line.idx = line.notes.length;
  advance();
  scrollTo = beat;
  if (timed) countInAt(beat); else line.seekBeat = beat;
  draw(); updateHud(); feedback(ui('Paused · press Continue to play this page.','En pausa · pulsa Continuar para tocar esta página.'), '');
}
// Leave the paused clock one bar before `beat`, so resuming counts in and then plays from there.
function countInAt(beat) {
  const at = performance.now();
  timed.t0 = at - (beat - beatsPerBar()) * beatMs(); timed.suspendedAt = at;
  timed.nextClick = Math.ceil(beat - beatsPerBar()); timed.countTo = beat; suspendedByCompanion = true;
}
// Move the focus to a note while paused: later notes become playable again, skipped ones are not errors.
function seekTo(i) {
  if (!line || i < 0 || i >= line.notes.length || timed && timed.suspendedAt == null || waiting && !waiting.paused && !selfPaced()) return;
  const beat = line.onsets[i];
  i = line.onsets.findIndex((onset) => onset >= beat);
  line.states = line.states.map((st, k) => k >= i ? 'pending' : st === 'pending' || st === 'current' ? 'played' : st);
  line.idx = i; advance();
  if (selfPaced()) { draw(); updateHud(); return; }
  scrollTo = beat;
  if (timed) countInAt(beat); else line.seekBeat = beat;
  draw(); updateHud();
  feedback(ui('Focus moved · press Start to play from here.', 'Foco movido · pulsa Empezar para tocar desde aquí.'), '');
}
// A short tap on the score while paused picks the nearest note in the tapped system.
function noteAt(x, y) {
  if (!layout?.elementOf) return -1;
  let best = -1, distance = Infinity;
  for (let i = layout.from; i < layout.to; i++) {
    const r = layout.elementOf(i)?.getBoundingClientRect();
    if (!r?.width) continue;
    const d = Math.max(r.left - x, 0, x - r.right) + 3 * Math.max(r.top - y, 0, y - r.bottom);
    if (d < distance) { distance = d; best = i; }
  }
  return distance <= 80 ? best : -1;
}
{
  let tap = null;
  $('#staff-wrap').addEventListener('pointerdown', (e) => { tap = e.target.closest('button, nav') ? null : { x: e.clientX, y: e.clientY, t: performance.now() }; });
  $('#staff-wrap').addEventListener('pointerup', (e) => {
    const start = tap; tap = null;
    if (!start || performance.now() - start.t > 500 || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return;
    if (timed && timed.suspendedAt == null) return; // only while paused or before starting
    const i = noteAt(e.clientX, e.clientY);
    if (i >= 0) seekTo(i);
  });
}
$('#score-prev').onclick = () => browsePage(-1);
$('#score-next').onclick = () => browsePage(1);

// Turn the page when the reading position passes its end
function maybeTurnPage(beat) {
  if (!pageMode() || beat < pageEnd()) return false;
  line.pageStart = pageEnd();
  ensureAhead(beat);
  draw();
  return true;
}

// CSS owns panel dimensions; measurements never feed back into their own height.
function layoutPanels() {
  const root = document.documentElement;
  root.dataset.device = isPhone() ? 'phone' : 'tablet';
  root.dataset.orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  root.dataset.input = settings.input;
  root.dataset.landscapeKeyboard = String(mobileKeyboardPractice() && isPhone());
  lightsEl.hidden = !(settings.guide === 'lights' && settings.input === 'piano');
  root.dataset.lights = String(!lightsEl.hidden);
  $('#guide-btn').disabled = settings.input !== 'piano';
  kbAuto.disabled = settings.input !== 'piano' || settings.kbLo == null;
  // Managed exercises expose common actions directly. Detailed keyboard positioning
  // stays on the Practice settings tab instead of sitting behind a nested tools menu.
  if (managed) {
    for (const item of [soundControl, $('#guide-btn'), $('#finger-btn')]) $('#practice-settings-shortcuts').append(item);
    $('#practice-settings-shortcuts').hidden = false;
    quickControls.append(practiceSettings);
    managedKeyboardPosition.append(kbAuto);
    for (const item of [kbRange, kbShift, kbHint]) managedKeyboardPosition.append(item);
    managedKeyboardPosition.hidden = settings.input !== 'piano';
  } else {
    $('#practice-settings-shortcuts').hidden = true;
    quickControls.insertBefore(practiceSettings, $('.timing-group'));
    quickControls.append(soundControl);
    for (const item of [kbRange, kbShift, kbHint, kbAuto, $('#guide-btn'), $('#finger-btn')]) kbBar.append(item);
    managedKeyboardPosition.hidden = true;
  }
}

// A warm-up survives incidental restarts (resize, keyboard move, timed start); only applySettings decides it.
function newLine(forceNewKey = false, warmup = !!(line && line.warmup)) {
  const key = resolvedKey(forceNewKey);
  // phone + piano mode: one staff at a time, the hand alternates with every new line
  const hand = settings.pianoMode && isPhone() ? (line && line.hand === 'treble' ? 'bass' : 'treble') : null;
  line = { notes: [], onsets: [], states: [], key, hand, warmup, warmPhase: 0, together: togetherMode() && !warmup, melody: settings.mode === 'melody', beats: 0, bars: 0, idx: 0, misses: 0, shownAt: performance.now() };
  if (selfPaced()) line.waitBars = responsiveBars();
  layoutPanels();
  buildPiano();
  practiceKeyboardRange = mobileKeyboardPractice() ? { ...pianoVis } : null;
  ensureAhead(0);
  if (selfPaced()) setCurrentGroup();
  scrollTo = null;
  draw();
  ensureAhead(0) && draw(); // the first draw tells us how wide the look-ahead area really is
}

let scrollTo = null; // beat currently at the reading position

// Timed reading follows the clock; self-paced reading follows the unanswered note.
function readingBeat() {
  if (selfPaced()) return line?.onsets[line.idx] ?? line?.pageStart ?? 0;
  return timed ? timedBeat() : scrollTo ?? 0;
}

function setScroll(beat, animate) {
  if (!layout || layout.page) return;
  const x = layout.readX - layout.xOf(beat);
  layout.strip.style.transition = animate ? 'transform 0.3s cubic-bezier(0.25, 0.8, 0.3, 1)' : 'none';
  layout.strip.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
  scrollTo = beat;
}

function draw(animate = false) {
  syncPageControls();
  if (!line || !staffEl.clientWidth || !staffEl.clientHeight) return;
  $('#key-name').textContent = managed ? `${managedLabel()} · ${settings.timeSig}` : line.warmup ? t('warmupOn', { k: keyName(line.key) }) : `${keyName(line.key)} · ${settings.timeSig}`;
  $('#key-label').classList.toggle('warm', !!line.warmup);
  const target = readingBeat();
  if (pageMode()) {
    line.pageStart ||= 0;
    // A shorter viewport may hide the active system: reframe without replacing notes.
    if(selfPaced()&&target>=pageEnd())line.pageStart+=Math.floor((target-line.pageStart)/(barsPerSystem()*beatsPerBar()))*barsPerSystem()*beatsPerBar();
    ensureAhead(target);
    layout = renderPage(staffEl, { notes: line.notes, onsets: line.onsets, states: line.states, clef: clef(), key: line.key, beatsPerBar: beatsPerBar(), barsPerSystem: barsPerSystem(), systems: systemsFit(), startBeat: line.pageStart, zoomHint: pageZoom() * 1.08, widthHint: selfPaced() && barsPerSystem() === 2 ? 420 : 620, fingering: fingersShown() });
    showGuides();
    return;
  }
  const prev = scrollTo;
  // render from a little behind the reading position so passed notes slide away under the header
  const behind = layout ? layout.readX / (layout.ppb * layout.zoom) + 1 : 4;
  let from = line.idx;
  while (from > 0 && line.onsets[from - 1] > target - behind) from--;
  // Keep complete bars: trimming mid-bar changes accidentals, beams and stem directions.
  while (from > 0 && line.notes[from - 1].bar === line.notes[from]?.bar) from--;
  layout = renderScore(staffEl, { notes: line.notes, onsets: line.onsets, states: line.states, clef: clef(), key: line.key, beatsPerBar: beatsPerBar(), ppb: ppb(), from, to: line.notes.length, scrollBeat: target, fingering: fingersShown() });
  if (animate && prev != null && !timed) {
    setScroll(prev, false);
    requestAnimationFrame(() => requestAnimationFrame(() => setScroll(target, true)));
  } else setScroll(target, false);
  showGuides();
}

// Colour and ink weight for every drawn note: notes already played fade back, notes in the light are
// full black, notes beyond the light pool a little lighter, so the eye lands where the light is.
function paintStates() {
  updateGuide();
  if (!layout) return;
  const cur = readingBeat();
  const lightBeats = layout.lightBeats || 4;
  for (let i = layout.from; i < layout.to; i++) {
    const st = line.states[i];
    const b = line.onsets[i];
    const tier = st !== 'pending' && st !== 'current' && b < cur ? 'past' : b <= cur + lightBeats ? 'near' : 'far';
    layout.setState(i, st, tier);
  }
}

// Keyboard guide: the next note(s) to play glow on the screen keyboard — blue on white keys, red on black.
function updateGuide() {
  const wanted = new Set();
  if (settings.guide === 'keys' && line && settings.input === 'piano' && !pianoEl.hidden) {
    currentGroup().forEach((j) => {
      if (line.states[j] === 'current' || line.states[j] === 'pending') wanted.add(line.notes[j].midi);
    });
  }
  pianoEl.querySelectorAll('.key.guide').forEach((k) => {
    if (!wanted.has(+k.dataset.midi)) k.classList.remove('guide');
    else wanted.delete(+k.dataset.midi);
  });
  wanted.forEach((m) => pianoEl.querySelector(`[data-midi="${m}"]`)?.classList.add('guide'));
  if (settings.guide === 'lights') drawLights();
}

// ---------- falling lights (Synthesia-style lane above the keyboard) ----------
const LIGHT_BEATS = 4; // beats of music visible in the lane
let lightsBeat = null; // beat shown at the keyboard edge (tweened in wait mode)
let lightsRaf = 0;
function lightsTarget() {
  return readingBeat();
}
function drawLights() {
  if (lightsEl.hidden || !line) return;
  const target = lightsTarget();
  if (lightsBeat == null || timed) lightsBeat = target;
  else if (Math.abs(lightsBeat - target) > 0.01) {
    // wait mode: glide to the new position
    lightsBeat += (target - lightsBeat) * 0.35;
    if (Math.abs(lightsBeat - target) < 0.01) lightsBeat = target;
    cancelAnimationFrame(lightsRaf);
    lightsRaf = requestAnimationFrame(drawLights);
  }
  const dpr = window.devicePixelRatio || 1;
  const w = lightsEl.clientWidth;
  const hgt = lightsEl.clientHeight;
  if (lightsEl.width !== Math.round(w * dpr) || lightsEl.height !== Math.round(hgt * dpr)) {
    lightsEl.width = Math.round(w * dpr);
    lightsEl.height = Math.round(hgt * dpr);
  }
  const ctx = lightsEl.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, hgt);
  const pxPerBeat = hgt / LIGHT_BEATS;
  const laneRect = lightsEl.getBoundingClientRect();
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let i = Math.max(0, line.idx - 4); i < line.notes.length; i++) {
    const on = line.onsets[i] - lightsBeat;
    const dur = line.notes[i].units / 4;
    if (on + dur < -0.05) continue; // already passed
    if (on > LIGHT_BEATS + 1) break;
    const st = line.states[i];
    if (st === 'correct' || st === 'late' || st === 'missed') continue;
    const k = pianoEl.querySelector(`[data-midi="${line.notes[i].midi}"]`);
    if (!k) continue;
    const kr = k.getBoundingClientRect();
    const x = kr.left - laneRect.left + 1;
    const bw = kr.width - 2;
    const yBottom = hgt - on * pxPerBeat;
    const yTop = yBottom - dur * pxPerBeat + 3;
    const black = k.classList.contains('black');
    const current = on <= 0.02;
    ctx.fillStyle = black ? (current ? '#ff7676' : '#ff5252') : current ? '#7fabff' : '#4f8cff';
    ctx.shadowColor = current ? ctx.fillStyle : 'transparent';
    ctx.shadowBlur = current ? 14 : 0;
    const r = Math.min(6, bw / 2);
    const top = Math.max(-20, yTop);
    ctx.beginPath();
    ctx.roundRect(x, top, bw, Math.min(hgt + 20, yBottom) - top, r);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (yBottom - yTop > 16 && bw > 18) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillText(pitchName(line.notes[i].letter, line.notes[i].acc), x + bw / 2, Math.min(yBottom - 6, hgt - 6));
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(0, hgt - 1, w, 1);
}

// Apply note states and scroll without re-rendering; a full draw only happens when new music was appended.
function refresh(animate = false) {
  if (!layout) return draw(animate);
  if (layout.page) {
    paintStates();
    showGuides();
    return;
  }
  if (line.notes.length > layout.to) return draw(animate);
  paintStates();
  setScroll(readingBeat(), animate && !timed);
}

function updateHud() {
  $('#s-correct').textContent = session.correct;
  $('#s-wrong').textContent = session.wrong;
  $('#s-streak').textContent = session.streak;
  const last = session.times.slice(-20);
  $('#s-time').textContent = last.length ? (last.reduce((a, b) => a + b, 0) / last.length / 1000).toFixed(1) + 's' : '–';
}

function feedback(text, cls = '') {
  feedbackEl.textContent = text;
  feedbackEl.className = cls;
}

// ---------- answering ----------
// Notes that start together (both hands) form a group: all of them must be played before moving on.
function currentGroup() {
  const g = [];
  const o = line.onsets[line.idx];
  for (let j = line.idx; j < line.notes.length && line.onsets[j] === o; j++) g.push(j);
  return g;
}
function setCurrentGroup() {
  const g = currentGroup();
  g.forEach((j) => { if (line.states[j] === 'pending') line.states[j] = 'current'; });
  if (fingersShown() && g.some((j) => line.notes[j].shift)) feedback(t('moveHand'), 'warn');
}
function matches(n, answer) {
  return answer.pitchClassOnly ? samePitchClass(n.midi, answer.midi) : n.midi === answer.midi;
}

function answer(a) {
  if (!readerVisible || managed?.context === 'piano' || !line || document.hidden) return;
  if(timed?.suspendedAt!=null){
    if(managed?.context!=='mobile')return;
    startTimed();
  }
  if (selfPaced()) {
    if(managed?.context==='mobile'&&waiting?.paused)startWaiting();
    if (waiting && !waiting.paused) answerWaiting(a);
    return;
  }
  if (!timed) return startTimed(); // playing a key starts a one-bar count-in
  answerTimed(a);
}

  // Keep the written page fixed until every visible system has been answered.
function answerWaiting(a) {
  const index = currentGroup().find(i => ['pending','current'].includes(line.states[i]) && matches(line.notes[i], a));
  if (index == null) {
    const target = line.notes[line.idx];
    if (target) record(target, false, 0);
    session.wrong++; session.streak = 0;
    if(managed?.block.quickPractice)readerEvent('quick-answer',{correct:false,ms:0});
    feedback('✗', 'bad'); updateHud();
    return;
  }
  const note = line.notes[index], elapsed = Math.max(0, performance.now() - line.shownAt)+(line.responseElapsed||0);
  line.states[index] = 'correct';
  record(note, true, elapsed); session.times.push(elapsed);
  session.correct++; session.streak++;
  line.responseElapsed=0;
  session.best = Math.max(session.best, session.streak);
  feedback('✓ ' + noteLabel(note), 'ok');
  const previousEnd = pageEnd();
  const previousBeat = readingBeat();
  const previousSystem=layout?.page?layout.systemOf(previousBeat):0;
  advance();
  if (line.idx === line.notes.length || line.onsets[line.idx] >= previousEnd) {
    line.pageStart = previousEnd;
    line.waitBars = responsiveBars();
    ensureAhead(previousEnd); setCurrentGroup(); draw();
  } else {
    const distance = Math.abs(readingBeat() - previousBeat);
    if(distance>0&&(!layout?.page||layout.systemOf(readingBeat())===previousSystem)&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const duration=Math.min(320,160+distance*35);
      waitingGuideTransition=`left ${duration}ms cubic-bezier(0.42, 0, 0.58, 1)`;
      waitingGuideUntil=performance.now()+duration;
    } else {
      waitingGuideTransition='none';waitingGuideUntil=0;
    }
    refresh();
  }
  line.shownAt = performance.now();
  updateHud();
  if(managed?.block.quickPractice)readerEvent('quick-answer',{correct:true,ms:elapsed});
}

function startWaiting() {
  if (waiting && !waiting.paused) return;
  waiting = { paused: false };
  suspendedByCompanion = false;
  if (!line) newLine(false, false);
  line.shownAt = performance.now();
  setCurrentGroup(); refresh(); syncStartButton();
  feedback(t('selfPacedLine'), ''); readerEvent('play');
}

// ---------- timed mode ----------
// The score scrolls continuously at tempo past a fixed playhead.
const beatMs = () => 60000 / settings.bpm;

function startTimed() {
  if (!readerVisible) return;
  if (selfPaced()) return startWaiting();
  if (managed?.context === 'midi' && !midiDevices.length) { readerEvent('midi-lost'); return; }
  if (timed?.suspendedAt != null && suspendedByCompanion) {
    timed.t0 += performance.now() - timed.suspendedAt; timed.suspendedAt = null; suspendedByCompanion = false;
    timed.audioOffset = audioNow() - performance.now() / 1000;
    timed.nextClick = Math.ceil((performance.now() - timed.t0) / beatMs());
    if (timed.countTo != null && (performance.now() - timed.t0) / beatMs() < timed.countTo) feedback(t('countIn'), '');
    timed.raf = requestAnimationFrame(tick); syncStartButton(); readerEvent('play'); return;
  }
  stopTimed();
  // A focus moved before starting keeps its line and starts from that note.
  const from = line?.seekBeat ?? 0;
  if (line?.seekBeat != null) delete line.seekBeat;
  else if (!line || line.idx > 0 || line.states.some((st) => st !== 'pending' && st !== 'current')) newLine();
  line.states = line.states.map((st) => (st === 'current' ? 'pending' : st));
  const bm = beatMs();
  timed = {
    t0: performance.now() + 150 + (beatsPerBar() - from) * bm, // after a one-bar count-in
    audioOffset: audioNow() - performance.now() / 1000,
    nextClick: Math.ceil(from) - beatsPerBar(),
    countTo: from,
    suspendedAt: null,
    clicks: [],
    raf: 0,
  };
  syncStartButton();
  feedback(t('countIn'), '');
  draw();
  timed.raf = requestAnimationFrame(tick);
  readerEvent('play');
}

function stopTimed() {
  if (timed) {
    scrollTo = timedBeat();
    setScroll(scrollTo, false);
    cancelAnimationFrame(timed.raf);
    cancelClicks();
  }
  timed = null;
  waiting = null;
  waitingGuideTransition = 'none';
  syncStartButton();
}

// timing tolerance, in beats: [window to count a note at all, window to count it as on time]
const TOLERANCE = { strict: [0.25, 0.12], normal: [0.45, 0.25], relaxed: [0.7, 0.4] };
const tol = () => TOLERANCE[settings.tolerance] || TOLERANCE.normal;
function window_() {
  return Math.max(tol()[0] * beatMs(), 180);
}
function onTimeWindow() {
  return Math.max(tol()[1] * beatMs(), 90);
}

function cancelClicks() {
  timed?.clicks.forEach((c) => c.stop());
  if (timed) timed.clicks = [];
}

// beat under the playhead; backgrounding the app freezes practice without losing notes
function timedBeat() {
  if (!timed) return 0;
  // During a count-in the focus waits just before the note that will start.
  const beat = ((timed.suspendedAt ?? performance.now()) - timed.t0) / beatMs(), start = timed.countTo ?? 0;
  return beat < start ? Math.max(start - 0.5, beat) : beat;
}
function showCount(beat) {
  const left = timed && timed.suspendedAt == null && timed.countTo != null && beat < timed.countTo ? Math.ceil(timed.countTo - beat - 1e-6) : 0;
  if (!left) { countEl.hidden = true; return; }
  if (countEl.hidden || countEl.textContent !== String(left)) {
    countEl.textContent = String(left); countEl.hidden = false;
    // Sit beside the focus line, above its system, so the notes about to be read stay visible.
    const head = $('#playhead');
    countEl.style.left = `${head.offsetLeft + 10}px`; countEl.style.top = `${Math.max(4, head.offsetTop - 50)}px`;
    countEl.classList.remove('tick'); void countEl.offsetWidth; countEl.classList.add('tick');
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && waiting && !waiting.paused) companionPause();
  if (!timed) return;
  if (document.hidden && timed.suspendedAt == null) {
    timed.suspendedAt = performance.now();
    cancelAnimationFrame(timed.raf);
    cancelClicks();
  } else if (!document.hidden && timed.suspendedAt != null && !managed) {
    timed.t0 += performance.now() - timed.suspendedAt;
    timed.suspendedAt = null;
    timed.audioOffset = audioNow() - performance.now() / 1000;
    timed.nextClick = Math.ceil((performance.now() - timed.t0) / beatMs());
    timed.raf = requestAnimationFrame(tick);
  }
});

// The reading light: starts just behind the note to play, brightest right ahead of it and fading
// to the right, with a soft vertical fall-off (the CSS mask) so it never ends in a hard edge.
const LIGHT_BEHIND = 44; // px of light before the note, enough to hold the current head
function lightAt(x, width, top, height, transition) {
  // The mask is fully opaque from 22% to 78%. Centre that band on the same
  // staff bounds as the cursor, keeping the fade outside the notation.
  const lightHeight = height / .56;
  readWinEl.style.transition = transition;
  Object.assign(readWinEl.style, {
    display: 'block',
    left: `${x - LIGHT_BEHIND}px`,
    width: `${width}px`,
    top: `${top - (lightHeight - height) / 2}px`,
    height: `${lightHeight}px`,
    background: `linear-gradient(to right, rgba(255,255,255,0) 0px, #ffffff ${LIGHT_BEHIND / 2}px, #ffffff 40%, #fffdf8 62%, rgba(255,255,255,0) 100%)`,
  });
}

// The red line marks the note to play (in timed mode notes cross it at their exact time);
// the reading window highlights the notes coming next, which is what you should be reading.
function showGuides() {
  if (!layout) return;
  if (layout.page) {
    // cursor at the current note (or the beat under the clock), light on the current system
    const beat = Math.max(layout.startBeat, readingBeat());
    const row = layout.rows[layout.systemOf(beat)];
    const x = layout.xAtBeat(beat);
    // Timed reading follows its clock; self-paced answers briefly ease the guide.
    const transition=selfPaced()&&performance.now()<waitingGuideUntil&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches?waitingGuideTransition:'none';
    playheadEl.style.transition = transition;
    Object.assign(playheadEl.style, { display: 'block', left: `${x}px`, top: `${row.top + row.staffTop}px`, height: `${row.staffH}px` });
    // bright part (up to 62% of the pool) covers at least a bar and a half ahead of the cursor
    const bars = 1.5 * beatsPerBar();
    const barPx = Math.abs(row.xAt(row.sysStart + bars) - row.xAt(row.sysStart));
    lightAt(x, Math.max(220, (barPx + LIGHT_BEHIND) / 0.62), row.top + row.staffTop, row.staffH, transition);
    layout.lightBeats = bars + 0.5;
    paintStates();
    return;
  }
  const top = `${layout.top}px`;
  const height = `${layout.height}px`;
  Object.assign(playheadEl.style, { display: 'block', left: `${layout.readX}px`, top, height, transition: 'none' });
  // the light pool spans from the header to the right edge; its bright centre sits on the red line and
  // its glow reaches ~60% of the look-ahead area, so the header (opaque paper) never cuts it
  const cw = staffEl.clientWidth;
  const ahead = cw - layout.readX;
  // bright part (up to 62% of the pool) covers at least a bar and a half ahead of the red line
  const bars = 1.5 * beatsPerBar();
  const barPx = layout.xOf(bars) - layout.xOf(0);
  const w = Math.max(220, ahead * 0.7, (barPx + LIGHT_BEHIND) / 0.62);
  lightAt(layout.readX, w, layout.top, layout.height, 'none');
  layout.lightBeats = Math.max(bars + 0.5, (w * 0.55) / (layout.ppb * layout.zoom)); // full ink in the light
  paintStates();
}

// A warm-up set names the exercise being played ("Hanon No. 4 · 2/3").
function managedLabel() {
  const set = managed?.block.type === 'warmup' ? warmupExercises(managed.block) : [];
  if (set.length < 2) return targetById(managed.block.target).label;
  const index = Math.min(set.length - 1, line?.warmIndex || 0);
  return `${warmupLabel(set[index])} · ${index + 1}/${set.length}`;
}
// Each exercise of a warm-up set starts 4 BPM faster than the previous one (from rhythm level 2); the set restarts at the first tempo.
function followWarmupSet() {
  const index = line.notes[line.idx]?.exercise;
  if (managed?.block.type !== 'warmup' || index == null || index === line.warmIndex) return;
  const previous = line.warmIndex;
  line.warmIndex = index;
  if (previous != null && rhythmLevel(managed.block.figures) > 1) nudgeBpm(4 * (index - previous));
  $('#key-name').textContent = `${managedLabel()} · ${settings.timeSig}`;
}

// move line.idx past notes that have been judged, and mark the next one as current
function advance() {
  if (line.states[line.idx] === 'current') line.states[line.idx] = 'pending';
  while (line.idx < line.notes.length && !['pending', 'current'].includes(line.states[line.idx])) line.idx++;
  if (line.idx < line.notes.length) { setCurrentGroup(); followWarmupSet(); }
}

function tick() {
  if (!timed || timed.suspendedAt != null) return;
  timed.raf = requestAnimationFrame(tick);
  const bm = beatMs();
  const now = performance.now() - timed.t0;
  showCount(now / bm);

  // metronome, scheduled slightly ahead on the audio clock
  // Skip stale clicks after a slow frame instead of playing a burst to catch up.
  timed.nextClick = Math.max(timed.nextClick, Math.ceil((now - 80) / bm));
  timed.clicks = timed.clicks.filter((c) => c.when > audioNow() - 0.1);
  while (timed.nextClick * bm <= now + 120) {
    const b = timed.nextClick;
    if (b < 0 || settings.metronome) timed.clicks.push(click(((b % beatsPerBar()) + beatsPerBar()) % beatsPerBar() === 0, (timed.t0 + b * bm) / 1000 + timed.audioOffset));
    timed.nextClick++;
  }

  let changed = false;
  while (line.idx < line.notes.length && now > line.onsets[line.idx] * bm + window_()) {
    const i = line.idx;
    if (managed?.context === 'piano') {
      line.states[i] = 'played'; advance(); changed = true; continue;
    }
    record(line.notes[i], false, 0);
    noteResult(false);
    session.wrong++;
    session.streak = 0;
    updateHud();
    line.states[i] = 'missed';
    feedback(t('missed', { n: noteLabel(line.notes[i]) }), 'bad');
    advance();
    changed = true;
  }
  if (now > -bm && line.states[line.idx] === 'pending') {
    setCurrentGroup();
    changed = true;
  }
  if (ensureAhead(now / bm)) changed = true;
  // fixed sheet: at the end of the page, turn it and give a bar of count-in before the next one
  if (pageMode() && now / bm >= pageEnd()) {
    timed.t0 += beatsPerBar() * bm;
    timed.countTo = pageEnd();
    maybeTurnPage(pageEnd());
    feedback(t('countIn'), '');
    return;
  }
  if (changed) {
    refresh();
    updateHud();
  } else if (layout && layout.page) {
    showGuides(); // cursor glides across the system
  } else {
    setScroll(timedBeat(), false);
    paintStates(); // notes slide from "far" into the light and out again as the score moves
  }
  if (now >= 0 && feedbackEl.textContent === t('countIn')) feedback('', '');
}

function answerTimed(a) {
  if (!timed) return;
  const bm = beatMs();

  const now = performance.now() - timed.t0;
  // among the unplayed notes inside the tolerance window, take the one with this pitch closest in time
  let i = -1;
  for (let j = line.idx; j < line.notes.length && line.onsets[j] * bm <= now + window_(); j++) {
    const dt = Math.abs(now - line.onsets[j] * bm);
    if (['pending', 'current'].includes(line.states[j]) && dt <= window_() && matches(line.notes[j], a)) {
      if (i < 0 || dt < Math.abs(now - line.onsets[i] * bm)) i = j;
    }
  }
  const n = line.notes[i];
  if (n) {
    const dt = now - line.onsets[i] * bm;
    const onTime = Math.abs(dt) <= onTimeWindow();
    line.states[i] = onTime ? 'correct' : 'late';
    record(n, true, Math.abs(dt));
    noteResult(onTime);
    session.correct++;
    session.streak++;
    session.best = Math.max(session.best, session.streak);
    feedback(onTime ? '✓ ' + noteLabel(n) : dt < 0 ? t('early') : t('late'), onTime ? 'ok' : '');
    advance();
    refresh();
  } else {
    session.wrong++;
    session.streak = 0;
    feedback('✗', 'bad');
  }
  updateHud();
}

// ---------- on-screen inputs ----------
// The note the player should play right now (wait mode: cursor; timed mode: the highlighted note)
function targetNote(midiNote, spelled) {
  if (!line || !line.notes[line.idx]) return null;
  const g = currentGroup().map((j) => line.notes[j]);
  return g.find((n) => (spelled ? samePitchClass(n.midi, midiNote) : n.midi === midiNote)) || g[0];
}

// Spell a pressed key: sharps in sharp keys, flats in flat keys
function spell(midiNote) {
  const pc = ((midiNote % 12) + 12) % 12;
  const sharps = [['c', ''], ['c', '#'], ['d', ''], ['d', '#'], ['e', ''], ['f', ''], ['f', '#'], ['g', ''], ['g', '#'], ['a', ''], ['a', '#'], ['b', '']];
  const flats = [['c', ''], ['d', 'b'], ['d', ''], ['e', 'b'], ['e', ''], ['f', ''], ['g', 'b'], ['g', ''], ['a', 'b'], ['a', ''], ['b', 'b'], ['b', '']];
  const [letter, acc] = ((line && KEYS[line.key]) < 0 ? flats : sharps)[pc];
  return { letter, acc };
}

// "Sung name" sound mode: sing the note's name at its pitch
function singName(midiNote, letter, acc, duration = 0.65) {
  sing(midiNote, syllableFor(settings.naming, letter, acc), { duration });
}

// Sound feedback for an answer. `spelled` = { letter, acc } when answered by name.
function answerSound(midiNote, spelled, fromMidi) {
  const target = targetNote(midiNote, spelled);
  const playing = timed ? timed.suspendedAt == null : waiting && !waiting.paused;
  const hit = playing && target && (spelled ? samePitchClass(target.midi, midiNote) : wouldMatch(midiNote));
  if (!hit) return null; // mistakes make no sound
  if (settings.soundMode === 'voice') singName(target.midi, target.letter, target.acc);
  // piano sound lasts as long as the key is held (see the pointer handlers)
  else if (settings.soundMode === 'tone' && !fromMidi) return holdNote(spelled ? target.midi : midiNote);
  return null;
}

function onScreenAnswer(midiNote, pitchClassOnly, spelled = null) {
  const voice = answerSound(midiNote, spelled, false);
  answer({ midi: midiNote, pitchClassOnly });
  return voice;
}

// Screen keys and name buttons sound while pressed and stop on release, so note lengths can be played.
const pressed = new Map(); // pointerId -> { el, voice }
function pressStart(e, el, voice) {
  el.classList.add('down');
  pressed.set(e.pointerId, { el, voice });
  if (e.capture !== false) try { el.setPointerCapture(e.pointerId); } catch { /* not supported */ }
}
function silence(id) {
  const p = pressed.get(id);
  if (!p) return;
  pressed.delete(id);
  p.el.classList.remove('down');
  if (p.voice) p.voice.stop();
}
function pressEnd(e) {
  const p = pressed.get(e.pointerId);
  if (!p) return;
  pressed.delete(e.pointerId);
  p.el.classList.remove('down');
  if (p.voice) p.voice.stop();
}
['pointerup', 'pointercancel'].forEach((ev) => window.addEventListener(ev, pressEnd));

function keyboardSize() {
  const [lo, hi] = rangeFor(clef(), settings.level);
  const style = getComputedStyle(pianoEl);
  const avail = pianoEl.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const fit = Math.max(1, Math.floor(avail / MIN_KEY));
  const need = hi - lo + 1;
  const baseCount = fit >= need ? Math.min(fit, Math.max(need, Math.ceil(avail / MAX_KEY))) : fit;
  const count = Math.min(baseCount, Math.max(3, Math.round(baseCount / settings.kbZoom)));
  return { count, keyW: avail / count };
}

// Show fewer keys when enlarged, preserving full, playable keys at both edges.
function buildPiano() {
  pianoEl.hidden = settings.input !== 'piano';
  kbBar.hidden = false;
  namesEl.hidden = settings.input !== 'names';
  // Without an on-screen keyboard there is nothing to move or resize; the header already shows MIDI.
  // Hidden in place (visibility) so the guide and fingering buttons keep their slots.
  for (const el of [kbRange, kbHint, kbAuto]) el.classList.toggle('kb-unused', settings.input !== 'piano');
  if (settings.input !== 'piano') {
    kbRange.textContent = '';
    return;
  }
  const [lo, hi] = rangeFor(clef(), settings.level);
  const { count, keyW } = keyboardSize();
  // keyboard slider: a manual start key (settings.kbLo) or centred on the clef's range
  const maxLo = PIANO_TOP - count + 1;
  const autoLo = Math.round((lo + hi) / 2) - Math.floor((count - 1) / 2);
  const visLo = Math.max(PIANO_BOTTOM, Math.min(maxLo, settings.kbLo ?? autoLo));
  const visHi = visLo + count - 1;
  pianoVis = { lo: visLo, hi: visHi, loMidi: makeNote(visLo, '').midi, hiMidi: makeNote(visHi, '').midi };
  // Only the physical A0/C8 endpoints have a case cheek; a cropped viewport does not.
  pianoEl.classList.toggle('physical-start', pianoVis.loMidi === 21);
  pianoEl.classList.toggle('physical-end', pianoVis.hiMidi === 108);
  kbShift.min = PIANO_BOTTOM;
  kbShift.max = maxLo;
  kbShift.value = visLo;
  kbRange.textContent = `${noteLabel(makeNote(visLo, ''))}–${noteLabel(makeNote(visHi, ''))}`;
  kbAuto.hidden = false;
  kbAuto.disabled = settings.kbLo == null;
  pianoKeyW = keyW;
  const id = `${visLo}-${visHi}-${keyW.toFixed(1)}`;
  if (pianoEl.dataset.range === id) return;
  pianoEl.dataset.range = id;
  pianoEl.style.setProperty('--wk', `${keyW}px`);
  pianoEl.style.setProperty('--bk', `${Math.max(28, keyW * 0.62)}px`);
  const inner = document.createElement('div');
  inner.className = 'keys';
  const isBlack = (m) => [1, 3, 6, 8, 10].includes(m % 12);
  let whiteIndex = 0;
  for (let m = pianoVis.loMidi; m <= pianoVis.hiMidi; m++) {
    const k = document.createElement('button');
    k.className = isBlack(m) ? 'key black' : 'key white';
    k.dataset.midi = m;
    if (isBlack(m)) k.style.left = `calc(var(--wk) * ${whiteIndex} - var(--bk) / 2)`;
    else {
      if (m % 12 === 0) k.textContent = letterName('c') + (m / 12 - 1);
      whiteIndex++;
    }
    inner.appendChild(k);
  }
  // half black keys at the edges so the keyboard looks real; decorative only (not playable, never asked)
  const edge = (left) => {
    const e = document.createElement('div');
    e.className = 'key-edge';
    e.style.left = left;
    inner.appendChild(e);
  };
  if (pianoVis.loMidi - 1 >= 21 && isBlack(pianoVis.loMidi - 1)) edge('calc(var(--bk) / -2)');
  if (pianoVis.hiMidi + 1 <= 108 && isBlack(pianoVis.hiMidi + 1)) edge(`calc(var(--wk) * ${whiteIndex} - var(--bk) / 2)`);
  inner.style.width = `calc(var(--wk) * ${whiteIndex})`;
  pianoEl.replaceChildren(inner);
}

// ---------- screen keyboard: play, pan with two fingers, pinch to resize ----------
// One finger plays at once. A second finger is held back briefly: if both move sideways together the
// keyboard slides and nothing counts; if they lift or stay still it is a two-note chord.
// Wrong notes wait 150 ms before counting, so the first finger of a slide never costs a mistake.
const touches = new Map();
let slide = null;
let gestureStart = null;
let gestureRaf = 0;
const SLIDE_START_PX = 14;
const DEFER_WRONG_MS = 150;

// Would this key be accepted right now? (mirrors answer / answerTimed)
function wouldMatch(midiNote) {
  if (!line || !line.notes[line.idx]) return false;
  if (timed) {
    const bm = beatMs();
    const now = performance.now() - timed.t0;
    for (let j = line.idx; j < line.notes.length && line.onsets[j] * bm <= now + window_(); j++) {
      if (['pending', 'current'].includes(line.states[j]) && Math.abs(now - line.onsets[j] * bm) <= window_() && line.notes[j].midi === midiNote) return true;
    }
    return false;
  }
  return currentGroup().some((j) => line.notes[j].midi === midiNote);
}

function pianoPress(id, k) {
  const midiNote = +k.dataset.midi;
  const pressedLine = line;
  const voice = answerSound(midiNote, null, false);
  const tp = touches.get(id);
  // While stopped, leave time to recognise a pinch before a touch starts the piece.
  if ((timed && wouldMatch(midiNote)) || !tp) answer({ midi: midiNote, pitchClassOnly: false });
  else tp.deferred = setTimeout(() => {
    tp.deferred = null;
    if (line === pressedLine) answer({ midi: midiNote, pitchClassOnly: false });
  }, DEFER_WRONG_MS);
  pressStart({ pointerId: id, capture: false }, k, voice);
}

function playPending(id) {
  const tp = touches.get(id);
  if (!tp || !tp.pending || slide) return;
  tp.pending = false;
  clearTimeout(tp.timer);
  pianoPress(id, tp.key);
}

function startSlide() {
  slide = gestureStart;
  touches.forEach((tp, id) => {
    clearTimeout(tp.timer);
    clearTimeout(tp.deferred);
    tp.pending = false;
    tp.deferred = null;
    silence(id);
  });
  pianoEl.classList.add('sliding');
}

function measureGesture(ids = [...touches.keys()].slice(0, 2)) {
  const [a, b] = ids.map((id) => touches.get(id));
  if (!a || !b) return null;
  return { ids, x: (a.cx + b.cx) / 2, distance: Math.hypot(a.cx - b.cx, a.cy - b.cy) };
}

function updateKeyboardGesture() {
  gestureRaf = 0;
  if (!gestureStart) return;
  const current = measureGesture(gestureStart.ids);
  if (!current) return;
  if (!slide) {
    if (Math.abs(current.distance - gestureStart.distance) < 12 && Math.abs(current.x - gestureStart.x) < SLIDE_START_PX) return;
    startSlide();
  }
  settings.kbZoom = Math.round(Math.max(1, Math.min(2.5, slide.zoom * current.distance / slide.distance)) * 10) / 10;
  const { count, keyW } = keyboardSize();
  // Keep the key between the fingers under their midpoint while zooming and panning.
  settings.kbLo = Math.max(PIANO_BOTTOM, Math.min(PIANO_TOP - count + 1, Math.round(slide.anchor - (current.x - slide.left) / keyW)));
  buildPiano();
  pauseForKeyboardRange();
  updateGuide();
}

pianoEl.addEventListener('pointerdown', (e) => {
  const k = e.target.closest('.key');
  if (!k) return;
  e.preventDefault();
  try { pianoEl.setPointerCapture(e.pointerId); } catch { /* not supported */ }
  if (touches.has(e.pointerId)) touchEnd(e); // a lost pointerup must not turn the next tap into a "second finger"
  const others = touches.size;
  const tp = { cx: e.clientX, cy: e.clientY, key: k, pending: others > 0, timer: 0, deferred: null };
  touches.set(e.pointerId, tp);
  if (slide) return; // extra fingers just join the slide
  if (others === 0) pianoPress(e.pointerId, k);
  else {
    if (touches.size === 2) {
      const pair = measureGesture();
      const left = pianoEl.querySelector('.keys').getBoundingClientRect().left;
      gestureStart = { ...pair, distance: Math.max(24, pair.distance), zoom: settings.kbZoom, left, anchor: pianoVis.lo + (pair.x - left) / pianoKeyW };
    }
    tp.timer = setTimeout(() => playPending(e.pointerId), 160);
  }
});

pianoEl.addEventListener('pointermove', (e) => {
  const tp = touches.get(e.pointerId);
  if (!tp) return;
  tp.cx = e.clientX;
  tp.cy = e.clientY;
  // Coalesce both pointer moves so a two-finger pan does not briefly become a pinch.
  if (touches.size >= 2 && !gestureRaf) gestureRaf = requestAnimationFrame(updateKeyboardGesture);
});

function touchEnd(e) {
  const tp = touches.get(e.pointerId);
  if (!tp) return;
  if (gestureRaf) {
    cancelAnimationFrame(gestureRaf);
    updateKeyboardGesture();
  }
  if (e.type === 'pointerup' && tp.pending && !slide) playPending(e.pointerId);
  if (e.type !== 'pointerup') {
    clearTimeout(tp.timer);
    clearTimeout(tp.deferred);
    silence(e.pointerId);
  }
  touches.delete(e.pointerId);
  if (slide && touches.size === 0) {
    slide = null;
    pianoEl.classList.remove('sliding');
    if (mobileKeyboardPractice()) applyKeyboardShift();
    else save('sr.settings', settings);
    updateGuide();
  }
  if (touches.size === 0) gestureStart = null;
}
['pointerup', 'pointercancel'].forEach((ev) => pianoEl.addEventListener(ev, touchEnd));

// Desktop: horizontal wheel (or Shift + wheel) over the keyboard slides it too
let wheelAcc = 0;
let wheelTimer = 0;
pianoEl.addEventListener('wheel', (e) => {
  const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
  if (!d) return;
  e.preventDefault();
  wheelAcc += d;
  const steps = Math.trunc(wheelAcc / 40);
  if (steps) {
    wheelAcc -= steps * 40;
    settings.kbLo = Math.max(PIANO_BOTTOM, pianoVis.lo + steps);
    buildPiano();
    settings.kbLo = pianoVis.lo;
    pauseForKeyboardRange();
  }
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(applyKeyboardShift, 350);
}, { passive: false });

let nameMod = 0;
namesEl.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  e.preventDefault();
  if (b.dataset.mod) {
    const m = +b.dataset.mod;
    nameMod = nameMod === m ? 0 : m;
    namesEl.querySelectorAll('[data-mod]').forEach((x) => x.classList.toggle('on', +x.dataset.mod === nameMod));
    return;
  }
  const semis = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[b.dataset.letter];
  pressStart(e, b, onScreenAnswer(60 + semis + nameMod, true, { letter: b.dataset.letter, acc: nameMod > 0 ? '#' : nameMod < 0 ? 'b' : '' }));
  nameMod = 0;
  namesEl.querySelectorAll('[data-mod]').forEach((x) => x.classList.remove('on'));
});

// Computer keyboard: letters answer by name (handy on desktop / Bluetooth keyboards)
window.addEventListener('keydown', (e) => {
  if (!readerVisible || managed?.context !== 'mobile' && managed || e.target.closest('dialog, input, textarea, select, [contenteditable]') || e.repeat) return;
  const l = e.key.toLowerCase();
  if ('cdefgab'.includes(l) && l.length === 1) {
    const semis = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[l];
    const mod = e.shiftKey ? 1 : e.altKey ? -1 : 0;
    onScreenAnswer(60 + semis + mod, true, { letter: l, acc: mod > 0 ? '#' : mod < 0 ? 'b' : '' });
  }
});

// ---------- MIDI ----------
// MIDI keys stay lit on the screen keyboard while they are held (note-off releases them)
const heldTimers = new Map();
midi.on('note', (e) => {
  if (!readerVisible || managed && managed.context !== 'midi') return;
  const k = pianoEl.querySelector(`[data-midi="${e.midi}"]`);
  if (k) {
    k.classList.add('down');
    clearTimeout(heldTimers.get(e.midi));
    heldTimers.set(e.midi, setTimeout(() => k.classList.remove('down'), 4000)); // safety net if note-off never comes
  }
  answerSound(e.midi, null, true); // the keyboard makes its own sound; in voice mode we sing correct notes
  answer({ midi: e.midi, pitchClassOnly: false });
});
midi.on('devices', (devices) => {
  midiDevices = devices;
  renderDevices(); // the pill quietly shows "No MIDI" when the keyboard goes away
  if (managed?.context === 'midi' && !devices.length) readerEvent('midi-lost');
  readerEvent('devices', { devices });
});
function renderDevices() {
  const practiceIndicator = $('#practice-midi');
  if (!practiceIndicator.querySelector('[data-midi-indicator]')) practiceIndicator.innerHTML = midiIndicatorMarkup();
  const devices = midiDevices;
  const pill = $('#midi-pill');
  const full = devices.length ? `🎹 ${devices[0]}${devices.length > 1 ? ` +${devices.length - 1}` : ''}` : t('noMidi');
  if (!pill.querySelector('[data-midi-indicator]')) pill.innerHTML = midiIndicatorMarkup();
  pill.title = full;
  pill.classList.toggle('on', devices.length > 0);
  $('#midi-devices').textContent = devices.length ? devices.join(', ') : t('midiNone');
}
midi.on('ble', (d) => {
  const list = $('#ble-list');
  if (list.querySelector(`[data-address="${d.address}"]`)) return;
  const b = document.createElement('button');
  b.dataset.address = d.address;
  b.textContent = t('connect', { name: d.name || d.address });
  b.onclick = async () => {
    b.textContent = t('connecting');
    try {
      await midi.connectBluetooth(d.address);
      b.textContent = `✓ ${d.name || d.address}`;
    } catch (err) {
      b.textContent = t('failed', { name: tError(err.message) });
    }
  };
  list.appendChild(b);
});

// ---------- level goals ----------
// First-try results for the active template; a level is passed when the goal accuracy is reached
// over the last goal.notes results.
function noteResult(ok) {
  if (managed) return;
  const tpl = activeTemplate();
  if (!tpl || (line && line.warmup)) return; // warm-ups don't count towards levels
  const arr = (progress.results[tpl.id] ||= []);
  arr.push(ok ? 1 : 0);
  if (arr.length > 200) arr.splice(0, arr.length - 200);
  saveProgress();
  updateLevelPill();
  if (isLevel(tpl.id) && !progress.done[tpl.id] && goalProgress(tpl).reached) levelPassed(tpl);
}

function goalProgress(tpl) {
  const goal = tpl.goal || DEFAULT_GOAL;
  const arr = progress.results[tpl.id] || [];
  const last = arr.slice(-goal.notes);
  const acc = last.length ? last.reduce((a, b) => a + b, 0) / last.length : 0;
  // progress towards the goal: how many of the needed notes are in, weighted by accuracy so far
  const pct = Math.min(1, (last.length / goal.notes) * Math.min(1, acc / goal.accuracy));
  return { acc, count: last.length, pct, reached: last.length >= goal.notes && acc >= goal.accuracy };
}

// Your level = how many levels you have passed in a row from the start; the next one is your challenge.
function rankInfo() {
  let passed = 0;
  while (passed < LEVELS.length && progress.done[LEVELS[passed].id]) passed++;
  return { passed, next: LEVELS[passed] || null };
}

function updateLevelPill() {
  const rank = rankInfo();
  const rankLabel = `${t('yourLevel')}: ${rank.passed}`;
  $('#rank-pill').textContent = isNarrow() ? `🏅 ${rank.passed}` : `🏅 ${t('rankPill', { n: rank.passed })}`;
  $('#rank-pill').title = rankLabel;
  $('#rank-pill').setAttribute('aria-label', rankLabel);
  const tpl = activeTemplate();
  const pill = $('#level-pill');
  if (!tpl) return (pill.textContent = '');
  if (isLevel(tpl.id)) {
    const n = levelIndex(tpl.id) + 1;
    const g = goalProgress(tpl);
    const done = progress.done[tpl.id];
    pill.textContent = done ? t('levelPillDone', { n }) : `${t('levelPill', { n })} · ${Math.round(g.pct * 100)}%`;
    pill.style.setProperty('--p', `${done ? 100 : Math.round(g.pct * 100)}%`);
  } else {
    pill.textContent = tpl.name;
    pill.style.setProperty('--p', '0%');
  }
  pill.title = `${t('practicing')}: ${pill.textContent}`;
  pill.setAttribute('aria-label', pill.title);
}

// Passing a level never interrupts practice: a small notice fades in over the score and out again.
let noticeTimer = 0;
function levelPassed(tpl) {
  progress.done[tpl.id] = true;
  saveProgress();
  updateLevelPill();
  const i = levelIndex(tpl.id);
  const next = rankInfo().next;
  const nextText = next ? ` · ${t('nextChallenge', { name: levelName(next) })}` : '';
  $('#banner-text').textContent = t('levelDone', { n: i + 1 }) + nextText;
  const el = $('#level-banner');
  el.hidden = false;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (el.hidden = true), 7000);
}

// ---------- settings dialog ----------
const dialog = $('#settings');
const namingSelect = dialog.querySelector('select[name=naming]');
namingSelect.innerHTML = Object.entries(NAMINGS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
dialog.querySelector('select[name=lang]').innerHTML = Object.entries(LANGUAGES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');

// Key name in the chosen naming and language, e.g. "Sol mayor", "e-Moll", "ホ短調"
function keyName(key) {
  const ki = keyInfo(key);
  return t(ki.minor ? 'keyMinor' : 'keyMajor', { k: pitchName(ki.letter, ki.acc, false) });
}

// settings names may be nested, e.g. "figures.q"
const getSetting = (name) => name.split('.').reduce((o, k) => o?.[k], settings);
function setSetting(name, value) {
  const path = name.split('.');
  const last = path.pop();
  path.reduce((o, k) => (o[k] ||= {}), settings)[last] = value;
}

let activeTab = 'levels';
function showTab(name) {
  activeTab = name;
  dialog.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  dialog.querySelectorAll('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== name));
}
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (b) showTab(b.dataset.tab);
});

function levelRow(tpl) {
  const li = document.createElement('li');
  const row = document.createElement('div');
  const lvl = isLevel(tpl.id);
  const g = goalProgress(tpl);
  const done = !!progress.done[tpl.id];
  const locked = lvl && !unlocked(tpl.id);
  const challenge = lvl && rankInfo().next && rankInfo().next.id === tpl.id;
  row.className = 'level-row' + (tpl.id === settings.templateId ? ' on' : '') + (done ? ' done' : '') + (locked ? ' locked' : '') + (challenge ? ' challenge' : '');
  const num = lvl ? (done ? '✓' : levelIndex(tpl.id) + 1) : '★';
  const goal = tpl.goal || DEFAULT_GOAL;
  const midiBadge = prefersMidi(tpl.settings) ? `<span class="midi-badge" title="${t('midiPreferred')}">🎹</span>` : '';
  const state = locked ? '🔒' : done ? t('passed') : lvl ? `${g.count}/${goal.notes} · ${Math.round(g.acc * 100)}%` : '';
  row.innerHTML = `<span class="num">${num}</span>
    <span><div class="lname">${levelName(tpl)} ${midiBadge}${challenge ? `<span class="flag" title="${t('challenge')}">⚑</span>` : ''}</div><div class="ldesc">${levelDesc(tpl)}</div>
      ${lvl && !done ? `<div class="bar"><i style="width:${Math.round(g.pct * 100)}%"></i></div>` : ''}</span>
    <span class="lstate">${state}</span>`;
  if (!locked) row.onclick = () => { applyTemplate(tpl); renderTemplates(); syncForm(); updateLevelPill(); };
  else row.title = t('locked');
  if (!lvl) {
    const tools = document.createElement('span');
    tools.className = 'tools';
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '🗑';
    del.title = t('deleteTpl');
    del.onclick = (e) => { e.stopPropagation(); deleteTemplate(tpl); };
    tools.appendChild(del);
    row.querySelector('.lstate').replaceWith(tools);
  }
  li.appendChild(row);
  return li;
}

function renderTemplates() {
  const rank = rankInfo();
  $('#rank-summary').innerHTML = rank.next
    ? t('rankSummary', { n: `<b>${rank.passed}</b>`, next: `<b>${levelName(rank.next)}</b>`, p: Math.round(goalProgress(rank.next).pct * 100) })
    : t('rankAll', { n: `<b>${rank.passed}</b>` });
  $('#level-list').replaceChildren(...LEVELS.map(levelRow));
  $('#custom-list').replaceChildren(...customs.map(levelRow));
  $('#custom-list').hidden = customs.length === 0;
}

function deleteTemplate(tpl) {
  const i = customs.indexOf(tpl);
  if (i < 0) return;
  customs.splice(i, 1);
  saveCustoms();
  if (settings.templateId === tpl.id) applyTemplate(customs[0] || LEVELS.find((l) => unlocked(l.id) && !progress.done[l.id]) || LEVELS[0]);
  renderTemplates();
  syncForm();
  updateLevelPill();
}

function syncTemplateHead() {
  const tpl = activeTemplate();
  const lvl = onLevel();
  $('#tpl-name-row').hidden = lvl;
  $('#tpl-builtin-note').hidden = !lvl;
  $('#tpl-delete').hidden = lvl;
  $('#tpl-name').value = tpl && !lvl ? tpl.name : '';
  $('#tpl-share').hidden = !navigator.share;
  $('#tpl-export-text').hidden = true;
  $('#piano-phone-note').hidden = !(isPhone() && settings.pianoMode);
  $('#page-phone-note').hidden = !(isPhone() && settings.layoutMode === 'page');
  $('#midi-pref-note').hidden = !(prefersMidi(settings) && midiDevices.length === 0);
  const togetherOpt = dialog.querySelector('select[name=hands] option[value=together]');
  togetherOpt.disabled = isPhone();
  $('#hands-midi-note').hidden = !(settings.pianoMode && settings.hands === 'together' && midiDevices.length === 0 && !isPhone());
  if (line) $('#scale-current').textContent = t('currentKey', { k: keyName(line.key) });
  syncWarmupButtons();
}

// warm-up buttons toggle: while warming up they take you back to practice
function syncWarmupButtons() {
  const on = !!(line && line.warmup);
  ['#warmup-btn', '#scale-warmup'].forEach((sel) => ($(sel).textContent = t(on ? 'backToPractice' : 'warmup')));
}

// ---------- scale viewer & warm-up ----------
const scaleDialog = $('#scale-dialog');
function openScaleView() {
  if (!line) return;
  const key = line.key;
  const sc = scaleNotes(key);
  $('#scale-title').textContent = keyName(key);
  // one octave of the scale, ascending, on the hand's staff
  const hand = clef() === 'grand' ? 'treble' : clef();
  const tonicIdx = 'cdefgab'.indexOf(keyInfo(key).letter);
  const d0 = (hand === 'bass' ? 21 : 28) + tonicIdx - (tonicIdx >= 5 ? 7 : 0);
  const notes = [];
  for (let i = 0; i <= 7; i++) notes.push(Object.assign(makeNote(d0 + i, sc[i % 7].acc, 'q'), { bar: Math.floor(i / 4), units: 4 }));
  const staffEl2 = $('#scale-staff');
  scaleDialog.showModal();
  const lay = renderScore(staffEl2, { notes, onsets: notes.map((_, i) => i), states: notes.map(() => 'pending'), clef: hand, key, beatsPerBar: 4, ppb: 58, from: 0, to: notes.length, scrollBeat: 0 });
  lay.strip.style.transform = `translate3d(${(lay.headerW + 24 - lay.xOf(0)).toFixed(1)}px,0,0)`;
  for (let i = 0; i < notes.length; i++) lay.setState(i, i % 7 === 0 ? 'current' : 'pending', 'near');
  // names with degrees
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  $('#scale-names').innerHTML = sc.map((s, i) => `<span class="${i === 0 ? 'tonic' : ''}">${pitchName(s.letter, s.acc, false)}<small>${ROMAN[i]}</small></span>`).join('');
  // mini keyboard: tonic to tonic, one octave, scale keys lit
  const pcOf = (s) => ((makeNote(28 + 'cdefgab'.indexOf(s.letter), s.acc).midi % 12) + 12) % 12;
  const byPc = {};
  sc.forEach((s) => (byPc[pcOf(s)] = s));
  const pcs = new Set(Object.keys(byPc).map(Number));
  const names = Object.fromEntries(Object.entries(byPc).map(([pc, s]) => [pc, pitchName(s.letter, s.acc)]));
  const tonicPc = pcOf(sc[0]);
  let lo = 60 + ((tonicPc - 0 + 12) % 12);
  if (lo > 66) lo -= 12;
  const hi = lo + 12;
  const box = $('#scale-keys');
  const isBlack = (m) => [1, 3, 6, 8, 10].includes(m % 12);
  let whites = 0;
  for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites++;
  const wk = Math.floor((box.clientWidth - 2) / whites);
  box.style.setProperty('--wk', `${wk}px`);
  box.style.setProperty('--bk', `${Math.round(wk * 0.62)}px`);
  const inner = document.createElement('div');
  inner.className = 'keys';
  let wi = 0;
  for (let m = lo; m <= hi; m++) {
    const k = document.createElement('button');
    k.type = 'button';
    const pc = m % 12;
    k.className = (isBlack(m) ? 'key black' : 'key white') + (pcs.has(pc) ? ' in-scale' : '') + (pc === tonicPc ? ' tonic' : '');
    if (pcs.has(pc)) k.textContent = names[pc];
    if (isBlack(m)) k.style.left = `calc(var(--wk) * ${wi} - var(--bk) / 2)`;
    else wi++;
    // tap a key to hear it (sung with its name in voice mode)
    k.onclick = () => {
      if (settings.soundMode === 'off') return;
      const s = byPc[pc];
      if (settings.soundMode === 'voice' && s) singName(m, s.letter, s.acc);
      else playNote(m);
    };
    inner.appendChild(k);
  }
  inner.style.width = `calc(var(--wk) * ${wi})`;
  box.replaceChildren(inner);
}
let pendingWarmup = false;
// Closing the settings dialog runs applySettings, which starts the new line; otherwise start it here.
function startWarmup() {
  pendingWarmup = !(line && line.warmup); // pressing again during a warm-up returns to practice
  scaleDialog.close();
  if (dialog.open) dialog.close();
  else applySettings();
}
// tapping the orange warm-up label also returns to practice
$('#key-name').onclick = () => line && line.warmup && startWarmup();
$('#scale-view-btn').onclick = openScaleView;
$('#key-scale').onclick = openScaleView;
$('#scale-close').onclick = () => scaleDialog.close();
$('#warmup-btn').onclick = startWarmup;
$('#scale-warmup').onclick = startWarmup;

function syncForm() {
  setNaming(settings.naming);
  setLanguage(settings.lang);
  applyStatic(dialog);
  showTab(activeTab);
  renderTemplates();
  syncTemplateHead();
  dialog.querySelectorAll('[name]').forEach((el) => {
    const v = getSetting(el.name);
    if (el.name === 'clef') el.value = clef();
    else if (el.type === 'checkbox') el.checked = !!v;
    else el.value = String(v);
  });
  dialog.querySelector('[name=lang]').closest('label').hidden = !!managed;
  if (managed) {
    const input = dialog.querySelector('[name="input"]');
    input.querySelector('[value="none"]').disabled = managed.context === 'mobile';
    input.disabled = managed.context !== 'mobile';
  }
  const physicalInput = !!managed && managed.context !== 'mobile';
  const manualPiano = managed?.context === 'piano';
  const inputDescription = $('#practice-input-description');
  inputDescription.hidden = !physicalInput;
  inputDescription.textContent = manualPiano
    ? ui('With piano · manual tracking. Notes are not evaluated automatically.', 'Con piano · registro manual. Las notas no se evalúan automáticamente.')
    : ui('MIDI instrument · notes are evaluated automatically.', 'Instrumento MIDI · las notas se evalúan automáticamente.');
  dialog.querySelector('[name=input]').closest('label').hidden = physicalInput;
  dialog.querySelector('[name=kbZoom]').closest('label').hidden = settings.input !== 'piano';
  dialog.querySelector('[data-i18n=keyboardGestures]').hidden = settings.input !== 'piano';
  dialog.querySelector('[name=reveal]').closest('label').hidden = manualPiano;
  for (const selector of ['[data-i18n=weakest]', '#stats-list', '#reset-stats']) dialog.querySelector(selector).hidden = manualPiano;
  $('#bpm-val').textContent = settings.bpm;
  $('#maxacc-val').textContent = settings.maxAcc;
  $('#zoom-val').textContent = `${Math.round((settings.zoom || 1) * 100)}%`;
  $('#kb-zoom-val').textContent = `${Math.round(settings.kbZoom * 100)}%`;
  dialog.querySelectorAll('[data-show]').forEach((el) => {
    const [k, v] = el.dataset.show.split('=');
    el.hidden = String(settings[k]) !== v;
  });
  renderStats();
}
const EXERCISE_FIELD = (name) => TEMPLATE_KEYS.includes(name.split('.')[0]);

dialog.addEventListener('input', (e) => {
  const el = e.target;
  if (!el.name) return;
  if (EXERCISE_FIELD(el.name)) forkIfLevel(); // levels are fixed: edits go to a personal copy
  setSetting(el.name, el.type === 'checkbox' ? el.checked : el.type === 'range' || el.name === 'level' ? +el.value : el.value);
  if (el.name === 'pianoMode' || el.name === 'clef') settings.kbLo = null;
  syncTemplateFromSettings();
  save('sr.settings', settings);
  syncForm();
  updateLevelPill();
  if (['lang', 'naming', 'light'].includes(el.name)) syncQuick(); // retranslate / relight the page behind the dialog
  if (el.name === 'zoom') {
    // live preview behind the dialog
    setUserZoom(settings.zoom);
    layoutPanels();
    draw();
  }
  if (el.name === 'kbZoom') buildPiano();
});

function renderStats() {
  const rows = Object.entries(stats.notes)
    .filter(([, s]) => s.seen >= 3)
    .map(([id, s]) => ({ id, acc: 1 - s.wrong / s.seen, avg: s.ms / Math.max(1, s.seen - s.wrong), seen: s.seen }))
    .sort((a, b) => a.acc - b.acc || b.avg - a.avg)
    .slice(0, 8);
  $('#stats-list').innerHTML = rows.length
    ? rows.map((r) => `<li><b>${labelFromId(r.id)}</b> ${(r.acc * 100).toFixed(0)}% · ${(r.avg / 1000).toFixed(1)}s · ${r.seen}×</li>`).join('')
    : `<li>${t('weakestEmpty')}</li>`;
}

$('#tpl-name').addEventListener('input', (e) => {
  const tpl = activeTemplate();
  if (!tpl || onLevel()) return;
  tpl.name = e.target.value.slice(0, 40);
  saveCustoms();
  renderTemplates();
  updateLevelPill();
});
$('#tpl-customize').onclick = () => {
  const src = activeTemplate();
  const tpl = { id: newId(), name: t('customCopy', { name: levelName(src) }), base: isLevel(src.id) ? src.id : src.base, settings: exerciseOf(settings), goal: clone(src.goal || DEFAULT_GOAL) };
  customs.push(tpl);
  saveCustoms();
  applyTemplate(tpl);
  renderTemplates();
  syncForm();
  updateLevelPill();
  showTab('exercise');
  $('#tpl-name').focus();
};
$('#tpl-export').onclick = async () => {
  const tpl = activeTemplate();
  const text = exportTemplate({ ...tpl, name: levelName(tpl) });
  const ta = $('#tpl-export-text');
  ta.value = text;
  ta.hidden = false;
  try {
    await navigator.clipboard.writeText(text);
    toastIn(ta, t('copied'));
  } catch {
    ta.select();
  }
};
$('#tpl-share').onclick = async () => {
  const tpl = activeTemplate();
  try {
    await navigator.share({ title: levelName(tpl), text: exportTemplate({ ...tpl, name: levelName(tpl) }) });
  } catch { /* cancelled */ }
};
$('#tpl-delete').onclick = () => deleteTemplate(activeTemplate());
function toastIn(el, text) {
  const prev = $('#tpl-import-msg').textContent;
  $('#tpl-import-msg').textContent = text;
  setTimeout(() => ($('#tpl-import-msg').textContent = prev), 2000);
}
function doImport(text) {
  const msg = $('#tpl-import-msg');
  try {
    const tpl = importTemplate(text, newId);
    customs.push(tpl);
    saveCustoms();
    applyTemplate(tpl);
    renderTemplates();
    syncForm();
    updateLevelPill();
    msg.textContent = t('imported', { name: tpl.name });
    $('#tpl-import-text').value = '';
  } catch {
    msg.textContent = t('importError');
  }
}
$('#tpl-import').onclick = () => doImport($('#tpl-import-text').value);
$('#tpl-import-file').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (f) doImport(await f.text());
  e.target.value = '';
});
$('#reset-progress').onclick = () => {
  progress.done = {};
  progress.results = {};
  saveProgress();
  renderTemplates();
  updateLevelPill();
};
$('#rank-pill').onclick = () => {
  showTab('levels');
  $('#open-settings').onclick();
};
$('#level-pill').onclick = () => {
  showTab('levels');
  $('#open-settings').onclick();
};

$('#open-settings').onclick = () => {
  if (managed) {
    companionPause(); showTab('practice');
  } else stopTimed();
  syncForm();
  dialog.showModal();
};
// MIDI pill opens the settings on the tab with the MIDI section
$('#midi-pill').onclick = () => {
  showTab('general');
  $('#open-settings').onclick();
};
function applySettings() {
  if (managed) {
    settings.input = managed.context === 'mobile' ? (settings.input === 'names' ? 'names' : 'piano') : 'none';
    syncQuick(); buildPiano(); layoutPanels(); draw(); return;
  }
  stopTimed();
  save('sr.settings', settings);
  startBtn.hidden = false;
  pianoEl.dataset.range = '';
  syncQuick();
  newLine(false, pendingWarmup);
  pendingWarmup = false;
  syncWarmupButtons();
}
dialog.addEventListener('close', applySettings);

// ---------- top-bar shortcuts ----------
const CLEF_LABEL = { treble: 'qTreble', bass: 'qBass', grand: 'qBoth' };
const isNarrow = () => isPhone();
const SOUND_ORDER = ['off', 'tone', 'voice'];
const SOUND_ICON = { off: '🔇', tone: '🎵', voice: '🗣' };
const SOUND_SHORT = { off: 'soundOffShort', tone: 'soundTone', voice: 'soundVoiceShort' };
function syncStartButton() {
  const practiceClock = $('#practice-clock');
  const playing = timed && timed.suspendedAt == null || waiting && !waiting.paused;
  const label = managed ? (playing ? ui('Pause','Pausar') : ui('Continue','Continuar')) : t(playing ? 'stop' : 'start');
  if (managed) {
    startBtn.innerHTML = playing
      ? '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/></svg>'
      : '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M7 4L21 12L7 20Z" fill="currentColor"/></svg>';
    startBtn.append(practiceClock);
    $('.session-time-stat').hidden = true;
    startBtn.setAttribute('aria-describedby', 'practice-clock');
  } else {
    $('.session-time-stat').append(practiceClock);
    $('.session-time-stat').hidden = false;
    startBtn.removeAttribute('aria-describedby');
    startBtn.textContent = isNarrow() ? (playing ? 'Ⅱ' : '▶') : label;
  }
  startBtn.setAttribute('aria-label', label);
  startBtn.title = label;
}
function syncQuick() {
  setNaming(settings.naming);
  setLanguage(settings.lang);
  document.documentElement.dataset.light = settings.light || 'normal';
  setUserZoom(settings.zoom);
  applyStatic();
  syncStartButton();
  renderDevices();
  namesEl.querySelectorAll('[data-letter]').forEach((b) => (b.textContent = letterName(b.dataset.letter)));
  $('#bpm-show').textContent = settings.bpm;
  const gl = { off: 'guideOff', keys: 'guideKeys', lights: 'guideLights' }[settings.guide] || 'guideOff';
  $('#guide-btn').textContent = `${t('guideLabel')}: ${t(gl)}`;
  $('#guide-btn').classList.toggle('on', settings.guide !== 'off');
  $('#guide-btn').title = $('#guide-btn').textContent;
  $('#guide-btn').setAttribute('aria-label', $('#guide-btn').textContent);
  $('#finger-btn').textContent = `${t('fingering')}: ${t(fingersShown() ? 'yes' : 'no')}`;
  $('#finger-btn').classList.toggle('on', fingersShown());
  $('#finger-btn').title = $('#finger-btn').textContent;
  $('#finger-btn').setAttribute('aria-pressed', String(fingersShown()));
  if (managed) {
    $('#guide-btn').textContent = '💡';
    $('#finger-btn').textContent = '①';
  }
  const clefLabel = t(settings.pianoMode ? 'qBoth' : CLEF_LABEL[clef()]);
  $('#q-clef').title = clefLabel;
  $('#q-clef').setAttribute('aria-label', clefLabel);
  $('#q-clef').textContent = isNarrow() ? clefLabel.split(' ')[0] : clefLabel; // phones: the clef symbol only
  if (managed) { $('#q-clef').textContent = '⚙'; $('#q-clef').title = ui('Practice settings','Ajustes de práctica'); $('#q-clef').setAttribute('aria-label', ui('Practice settings','Ajustes de práctica')); }
  updateLevelPill();

  // the tempo only matters when playing in time; the start button sits right next to the timing toggle
  $('.tempo').hidden = selfPaced();
  $('#timing-mode').hidden = !selfPaced();
  if(!managed?.block.quickPractice){$('#timing-mode').classList.remove('quick-game-hud','is-record');$('#timing-mode').textContent = ui('No tempo', 'Sin tempo');}
  $('.session-time-stat').title = ui('Practice time', 'Tiempo de práctica');
  $('.session-time-stat').setAttribute('aria-label', $('.session-time-stat').title);
  startBtn.hidden = false;
  const snd = SOUND_ORDER.includes(settings.soundMode) ? settings.soundMode : 'tone';
  $('#q-sound').setAttribute('aria-label', `${t('soundMode')}: ${t(SOUND_SHORT[snd])}`);
  $('#q-sound').title = `${t('soundMode')}: ${t(SOUND_SHORT[snd])}`;
  $('#q-sound').textContent = managed || isNarrow() ? SOUND_ICON[snd] : `${SOUND_ICON[snd]} ${t(SOUND_SHORT[snd])}`;
}
$('#q-sound').onclick = () => {
  const cur = SOUND_ORDER.indexOf(settings.soundMode);
  settings.soundMode = SOUND_ORDER[(cur + 1) % SOUND_ORDER.length];
  save('sr.settings', settings);
  syncQuick();
};
let narrowWas = null;
window.addEventListener('resize', () => {
  layoutPanels();
  if (isNarrow() !== narrowWas) {
    narrowWas = isNarrow();
    syncQuick();
  }
});
function nudgeBpm(delta) {
  const at = timed && (timed.suspendedAt ?? performance.now());
  const beat = timed && (at - timed.t0) / beatMs();
  forkIfLevel();
  settings.bpm = Math.max(30, Math.min(160, settings.bpm + delta));
  if (timed) {
    cancelClicks();
    timed.t0 = at - beat * beatMs();
    timed.nextClick = Math.floor(beat) + 1;
  }
  syncTemplateFromSettings();
  save('sr.settings', settings);
  syncQuick();
}
// Move keys live; apply an intentional range change only when the control is released.
kbShift.addEventListener('input', () => {
  settings.kbLo = +kbShift.value;
  buildPiano();
  pauseForKeyboardRange();
});
kbShift.addEventListener('change', () => applyKeyboardShift());
function keyboardRangeChanged() {
  return mobileKeyboardPractice() && pianoVis && practiceKeyboardRange
    && (pianoVis.loMidi !== practiceKeyboardRange.loMidi || pianoVis.hiMidi !== practiceKeyboardRange.hiMidi);
}
function pauseForKeyboardRange() {
  if (keyboardRangeChanged() && (timed && timed.suspendedAt == null || waiting && !waiting.paused)) companionPause();
}
// After the keyboard moved: follow with the clef and regenerate music for the visible keys
function applyKeyboardShift() {
  if (mobileKeyboardPractice()) {
    if (keyboardRangeChanged()) {
      companionPause();
      stopTimed();
      // A dead band around middle C prevents repeated clef flips near the boundary.
      const middle = (pianoVis.lo + pianoVis.hi) / 2;
      settings.clef = middle < 26 ? 'bass' : middle > 30 ? 'treble' : settings.clef;
      // This is an explicit exercise-range change. Keep the chosen scale and
      // session results; replace prefetched notes as well as the visible line.
      newLine(false, false);
      if (selfPaced()) waiting = { paused: true };
      syncQuick(); updateHud();
      feedback(t('keyboardRangeApplied'), '');
      readerEvent('range-changed');
    }
    save('sr.settings', settings);
    return;
  }
  // Moving the keys during practice must not replace the music being read.
  if (timed || selfPaced()) {
    save('sr.settings', settings);
    return;
  }
  // single staff follows the keyboard: bass clef for low keys, treble for high ones
  if (!settings.pianoMode) {
    const mid = (pianoVis.lo + pianoVis.hi) / 2;
    const want = mid < 26 ? 'bass' : mid > 30 ? 'treble' : settings.clef;
    if (want !== settings.clef) {
      forkIfLevel();
      settings.clef = want;
      syncTemplateFromSettings();
    }
    syncQuick();
  }
  save('sr.settings', settings);
  stopTimed();
  newLine();
}
kbAuto.onclick = () => {
  settings.kbLo = null;
  if (mobileKeyboardPractice()) { buildPiano(); applyKeyboardShift(); }
  else applySettings();
};

// one button cycles the guide: off -> keys -> lights -> off
$('#guide-btn').addEventListener('click', () => {
  const order = ['off', 'keys', 'lights'];
  settings.guide = order[(order.indexOf(settings.guide) + 1) % order.length];
  save('sr.settings', settings);
  syncQuick();
  lightsBeat = null;
  layoutPanels();
  draw();
});
$('#finger-btn').addEventListener('click', () => {
  if (managed?.block.type === 'warmup') managed.fingers = !fingersShown();
  else { settings.fingering = !settings.fingering; save('sr.settings', settings); }
  syncQuick();
  draw();
});
// One BPM per tap; holding a button keeps changing the tempo.
for (const [id, delta] of [['#bpm-down', -1], ['#bpm-up', 1]]) {
  const button = $(id);
  let timer = null, held = false;
  const stop = () => { clearTimeout(timer); timer = null; };
  const repeat = (wait) => { timer = setTimeout(() => { held = true; nudgeBpm(delta); repeat(90); }, wait); };
  button.addEventListener('pointerdown', () => { stop(); held = false; repeat(450); });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(type, stop);
  button.onclick = () => { if (!held) nudgeBpm(delta); held = false; };
}
$('#q-clef').onclick = () => {
  if (managed) { $('#open-settings').onclick(); return; }
  forkIfLevel();
  const cur = settings.pianoMode ? 'grand' : settings.clef;
  const order = ['treble', 'bass', 'grand'];
  const next = order[(order.indexOf(cur) + 1) % order.length];
  settings.pianoMode = next === 'grand';
  if (next !== 'grand') settings.clef = next;
  settings.kbLo = null; // re-centre the keyboard on the new staves
  syncTemplateFromSettings();
  applySettings();
};

$('#scan-ble').onclick = async () => {
  const btn = $('#scan-ble');
  btn.textContent = t('scanning');
  try {
    await midi.scanBluetooth();
  } catch (err) {
    $('#ble-list').textContent = tError(err.message);
  }
  setTimeout(() => (btn.textContent = t('scanBle')), 10000);
};
$('#reset-stats').onclick = () => {
  stats.notes = {};
  save('sr.stats', stats);
  renderStats();
};
$('#play-line').onclick = () => {
  if (!line) return;
  // play the next 8 notes from where the player is
  const bm = 60 / Math.max(settings.bpm, 72);
  const start = audioNow() + 0.1;
  const first = line.idx;
  line.notes.slice(first, first + 8).forEach((n, j) => {
    const i = first + j;
    const len = (n.units / 4) * bm;
    const when = start + (line.onsets[i] - line.onsets[first]) * bm;
    if (settings.soundMode === 'voice') sing(n.midi, syllableFor(settings.naming, n.letter, n.acc), { when, duration: Math.min(0.9, len * 0.95) });
    else playNote(n.midi, len * 1.1, when);
  });
};
startBtn.onclick = () => managed ? (timed && timed.suspendedAt == null || waiting && !waiting.paused ? companionPause() : startTimed()) : (timed ? stopTimed() : startTimed());
$('#new-key').onclick = () => {
  stopTimed();
  newLine(true);
};

// debugging hook: inspect the note stream and layout from the console
Object.defineProperty(window, '__sr', { get: () => ({ line, layout, settings, timed, waiting, midi }) });

function companionPause() {
  countEl.hidden = true;
  if (feedbackEl.textContent === t('countIn')) feedback(ui('Paused', 'En pausa'), '');
  if (waiting) {
    if(!waiting.paused&&line)line.responseElapsed=(line.responseElapsed||0)+Math.max(0,performance.now()-line.shownAt);
    waiting.paused = true;
  }
  if (timed && timed.suspendedAt == null) {
    timed.suspendedAt = performance.now(); cancelAnimationFrame(timed.raf); cancelClicks();
  }
  suspendedByCompanion = true;
  syncStartButton(); readerEvent('pause');
}
const reader = {
  setLanguage(language) {
    settings.lang = language; save('sr.settings', settings); syncQuick();
    $('#practice-return').textContent = '←';
    $('#practice-advance').textContent = '→';
  },
  get devices() { return [...midiDevices]; },
  get warmupIndex() { return line?.warmIndex || 0; },
  get measurement() { return { source: managed?.context === 'midi' ? 'midi' : 'screen', correct: session.correct, wrong: session.wrong, timing: selfPaced() ? 'wait' : 'timed', bpm: selfPaced() ? null : settings.bpm, input: settings.input, guide: settings.guide, fingering: settings.fingering, tolerance: selfPaced() ? null : settings.tolerance }; },
  get snapshot() { return line ? { line: {...clone(line),responseElapsed:(line.responseElapsed||0)+(waiting&&!waiting.paused?Math.max(0,performance.now()-line.shownAt):0)}, beat: readingBeat(), settings: clone(settings) } : null; },
  configure(block, context, snapshot = null) {
    stopTimed(); setMidiContext(context); managed = { block, context }; readerVisible = true; suspendedByCompanion = false;
    settings.timing = selfPaced() ? 'wait' : 'timed';
    const presentation = ['page', 'scroll'].includes(block.presentation) ? block.presentation : !isPhone() && context !== 'mobile' ? 'page' : 'scroll';
    Object.assign(settings, { templateId: null, lang: getAppLanguage(), clef: block.hand === 'left' ? 'bass' : 'treble', pianoMode: false, level: block.level ?? 0, mode: 'notes', layoutMode: presentation, input: context === 'mobile' ? block.input : 'none', bpm: block.bpm, timeSig: '4/4', ...rhythmFigures(block.figures), rhythm: rhythmLevel(block.figures), accidentals: false, kbLo: null });
    Object.assign(session, { correct: 0, wrong: 0, streak: 0, best: 0, times: [] });
    document.body.classList.add('managed-practice');
    $('#reader-view').hidden = false; $('#practice-toolbar').hidden = false;
    if (snapshot?.line && snapshot.line.notes?.length) {
      if (mobileKeyboardPractice() && ['bass', 'treble'].includes(snapshot.settings?.clef)) settings.clef = snapshot.settings.clef;
      settings.bpm = Math.max(30, Math.min(160, Number(snapshot.settings?.bpm) || block.bpm));
      settings.kbLo = Number.isInteger(snapshot.settings?.kbLo) && snapshot.settings.kbLo >= PIANO_BOTTOM && snapshot.settings.kbLo <= PIANO_TOP ? snapshot.settings.kbLo : null;
      line = clone(snapshot.line); scrollTo = snapshot.beat; layoutPanels(); buildPiano(); draw();
      practiceKeyboardRange = mobileKeyboardPractice() ? { ...pianoVis } : null;
      if (selfPaced()) waiting = { paused: true };
      else timed = { t0: performance.now() - snapshot.beat * beatMs(), audioOffset: 0, nextClick: Math.ceil(snapshot.beat), suspendedAt: performance.now(), clicks: [], raf: 0 };
      suspendedByCompanion = true;
    } else {
      if(Number.isInteger(block.keyboardStart))settings.kbLo=block.keyboardStart;
      newLine(false, false);
    }
    syncQuick(); updateHud();
  },
  show() { readerVisible = true; $('#reader-view').hidden = false; layoutPanels(); draw(); },
  hide() { companionPause(); readerVisible = false; $('#reader-view').hidden = true; },
  pause: companionPause,
  notify: toast,
  play: startTimed,
  stop() { stopTimed(); managed = null; readerVisible = false; $('#reader-view').hidden = true; document.body.classList.remove('managed-practice'); layoutPanels(); },
  async refreshMidi() { await midi.refreshMidi(); },
  settings() { showTab('general'); syncForm(); dialog.showModal(); },
};

// ---------- boot ----------
let lastSize = '';
new ResizeObserver(() => {
  const size = `${staffEl.clientWidth}x${staffEl.clientHeight}`;
  if (size !== lastSize) {
    lastSize = size;
    draw();
  }
}).observe(staffEl);
let lastPianoW = 0;
new ResizeObserver(() => {
  const w = pianoEl.clientWidth;
  if (!w || w === lastPianoW) return;
  const first = lastPianoW === 0;
  lastPianoW = w;
  const before = pianoVis && `${pianoVis.lo}-${pianoVis.hi}`;
  buildPiano();
  layoutPanels();
  // visible range changed (e.g. rotation): regenerate so every note is playable
  if (!first && before !== `${pianoVis.lo}-${pianoVis.hi}` && !timed && !selfPaced() && scrollTo === 0) newLine();
}).observe(pianoEl);
window.visualViewport?.addEventListener('resize', layoutPanels);
(async () => {
  await document.fonts.load('30px Bravura').catch(() => {});
  startBtn.hidden = false;
  syncQuick();
  newLine();
  renderDevices();
  updateHud();
  updateLevelPill();
  midi.initMidi().catch(error => console.warn('MIDI initialization failed', error));
  if (location.hash === '#reader') { readerVisible = true; $('#reader-view').hidden = false; $('#app-shell').hidden = true; newLine(); }
  else await bootCompanion(reader);
})();
