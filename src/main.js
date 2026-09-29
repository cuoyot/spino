import './style.css';
import { KEYS, NAMINGS, generatePhrase, generateRandomBars, generateScaleBars, generateTwoHands, assignFingering, scaleNotes, pickKey, keyInfo, TIME_SIGS, allowedUnits, shortestUnit, noteLabel, noteId, rangeFor, makeNote, samePitchClass, setNaming, namingForLocale, letterName, labelFromId, pitchName } from './music.js';
import { renderScore, renderPage, idealScoreHeight, pxPerBeatFor, setUserZoom } from './render.js';
import { LANGUAGES, t, tError, setLanguage, languageForLocale, applyStatic } from './i18n.js';
import { LEVELS, TEMPLATE_KEYS, levelIndex, isLevel, clone, exerciseOf, exportTemplate, importTemplate, DEFAULT_GOAL, prefersMidi } from './levels.js';
import { playNote, holdNote, click, now as audioNow } from './audio.js';
import { sing, syllableFor } from './voice.js';
import * as midi from './midi.js';

// ---------- persistence ----------
const DEFAULTS = {
  mode: 'melody', pianoMode: false, hands: 'alternate', layoutMode: 'scroll', position: 'free', clef: 'treble', level: 0, maxAcc: 2, scale: 'major', accidentals: false,
  timeSig: '4/4', figures: { w: false, h: true, q: true, e: false, s: false }, dotted: false,
  timing: 'timed', bpm: 60, metronome: true, stopOnMiss: false, tolerance: 'normal', light: 'normal', zoom: 1, guide: 'off', fingering: false, input: 'piano', soundMode: 'tone', reveal: true,
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
// the app always plays in time: mistakes are counted and the music keeps flowing
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

// Phones get one hand (single staff); tablets can also use the grand staff.
const isPhone = Math.min(screen.width, screen.height) < 600;
const clef = () => (settings.pianoMode ? (isPhone ? (line && line.hand) || 'treble' : 'grand') : settings.clef === 'grand' ? 'treble' : settings.clef);
// Fixed sheet (several systems, eyes travel) needs tablet width; phones always scroll.
const pageMode = () => settings.layoutMode === 'page' && !isPhone;
const BARS_PER_SYSTEM = 4;
// Both hands at once needs the grand staff (tablet) and melodies; a MIDI keyboard is recommended but not required
const togetherMode = () => settings.pianoMode && settings.hands === 'together' && !isPhone && settings.mode === 'melody';
const MIN_KEY = 34; // px, smallest comfortable white key
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
const lightsEl = $('#lights');

// ---------- session state ----------
const session = { correct: 0, wrong: 0, streak: 0, best: 0, times: [] };
let line = null; // note stream: { notes, onsets, states, key, melody, beats, bars, idx, misses, shownAt }
let timed = null; // timed-mode clock: { t0, audioOffset, nextClick, paused, raf }
let layout = null;
let pianoVis = null; // visible keyboard window { lo, hi, loMidi, hiMidi }
let pianoKeyW = 40;

// a key within the allowed number of accidentals (different from the current one when possible)
function resolvedKey(forceNew) {
  const k = line && line.key;
  const ok = k && Math.abs(KEYS[k]) <= settings.maxAcc && (settings.scale === 'both' || (settings.scale === 'minor') === k.endsWith('m'));
  return ok && !forceNew ? k : pickKey(settings.maxAcc, settings.scale, k);
}

const beatsPerBar = () => TIME_SIGS[settings.timeSig] || 4;
const ppb = () => pxPerBeatFor(shortestUnit(allowedUnits(settings.figures, settings.dotted)));

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
  return { ...settings, clef: clef(), key: line.key, prevPos: line.lastPos, vis: settings.input === 'piano' ? { ...pianoVis, exact: settings.kbLo != null } : null };
}

function appendChunk() {
  const chunk = line.warmup
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
  const logicalH = clef() === 'grand' ? 210 : 130; // must match renderPage
  return Math.max(1, Math.min(6, Math.floor(h / (logicalH * pageZoom()))));
}
const pageBeats = () => systemsFit() * BARS_PER_SYSTEM * beatsPerBar();
const pageEnd = () => (line.pageStart || 0) + pageBeats();

// Turn the page when the reading position passes its end
function maybeTurnPage(beat) {
  if (!pageMode() || beat < pageEnd()) return false;
  line.pageStart = pageEnd();
  ensureAhead(beat);
  draw();
  return true;
}

// Split the height: the score gets what it needs at its ideal size, the input area gets the rest
// (piano keys up to ~7x their width, like a real keyboard).
function layoutPanels() {
  const wrap = $('#staff-wrap');
  const input = settings.input === 'piano' ? pianoEl : settings.input === 'names' ? namesEl : null;
  lightsEl.hidden = !(settings.guide === 'lights' && settings.input === 'piano');
  if (pageMode()) {
    // the sheet is the point: it takes the height, the keys keep a playable minimum
    wrap.style.maxHeight = '';
    if (!input) return;
    const avail = $('main').clientHeight - $('#status-row').offsetHeight + input.offsetHeight;
    const h = Math.max(120, Math.min(pianoKeyW * 4.5, avail * 0.3));
    if (input === pianoEl) pianoEl.style.height = `${Math.round(h)}px`;
    else namesEl.style.setProperty('--name-h', `${Math.round(Math.min(h - 22, 96))}px`);
    lightsEl.style.height = `${Math.round(Math.max(80, Math.min(140, h * 0.9)))}px`;
    return;
  }
  // never draw a score card taller than the largest score (avoids a big empty white area)
  wrap.style.maxHeight = `${Math.round(idealScoreHeight(staffEl.clientWidth, clef(), ppb(), 6) * 1.08)}px`;
  if (!input) return;
  const avail = $('main').clientHeight - $('#status-row').offsetHeight + input.offsetHeight;
  const scoreH = idealScoreHeight(staffEl.clientWidth, clef(), ppb());
  if (input === pianoEl) {
    let h = Math.max(110, Math.min(avail - scoreH, pianoKeyW * 7, avail * 0.6));
    // score already at its largest (6 beats of look-ahead)? give the leftover to the keys
    const scoreMax = idealScoreHeight(staffEl.clientWidth, clef(), ppb(), 6);
    if (avail - h > scoreMax) h = Math.min(avail - scoreMax, pianoKeyW * 9);
    if (!lightsEl.hidden) {
      // the lane takes a share of the keyboard's height
      const lane = Math.max(80, Math.min(160, h * 0.45));
      lightsEl.style.height = `${Math.round(lane)}px`;
      h -= lane * 0.6;
    }
    pianoEl.style.height = `${Math.round(Math.max(110, h))}px`;
  } else {
    const h = Math.max(48, Math.min(avail - scoreH - 22, 120));
    namesEl.style.setProperty('--name-h', `${Math.round(h)}px`);
  }
}

// A warm-up survives incidental restarts (resize, keyboard move, timed start); only applySettings decides it.
function newLine(forceNewKey = false, warmup = !!(line && line.warmup)) {
  const key = resolvedKey(forceNewKey);
  // phone + piano mode: one staff at a time, the hand alternates with every new line
  const hand = settings.pianoMode && isPhone ? (line && line.hand === 'treble' ? 'bass' : 'treble') : null;
  line = { notes: [], onsets: [], states: [], key, hand, warmup, warmPhase: 0, together: togetherMode() && !warmup, melody: settings.mode === 'melody', beats: 0, bars: 0, idx: 0, misses: 0, shownAt: performance.now() };
  buildPiano();
  layoutPanels();
  ensureAhead(0);
  if (settings.timing === 'wait') setCurrentGroup();
  scrollTo = null;
  draw();
  ensureAhead(0) && draw(); // the first draw tells us how wide the look-ahead area really is
}

let scrollTo = null; // beat currently at the reading position

function setScroll(beat, animate) {
  if (!layout || layout.page) return;
  const x = layout.readX - layout.xOf(beat);
  layout.strip.style.transition = animate ? 'transform 0.3s cubic-bezier(0.25, 0.8, 0.3, 1)' : 'none';
  layout.strip.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
  scrollTo = beat;
}

function draw(animate = false) {
  if (!line) return;
  $('#key-name').textContent = line.warmup ? t('warmupOn', { k: keyName(line.key) }) : `${keyName(line.key)} · ${settings.timeSig}`;
  $('#key-label').classList.toggle('warm', !!line.warmup);
  const target = timed ? timedBeat() : line.onsets[line.idx] ?? line.beats;
  if (pageMode()) {
    line.pageStart ||= 0;
    ensureAhead(target);
    layout = renderPage(staffEl, { notes: line.notes, onsets: line.onsets, states: line.states, clef: clef(), key: line.key, beatsPerBar: beatsPerBar(), barsPerSystem: BARS_PER_SYSTEM, systems: systemsFit(), startBeat: line.pageStart, zoomHint: pageZoom() * 1.08, fingering: settings.fingering });
    showGuides();
    return;
  }
  const prev = scrollTo;
  // render from a little behind the reading position so passed notes slide away under the header
  const behind = layout ? layout.readX / (layout.ppb * layout.zoom) + 1 : 4;
  let from = line.idx;
  while (from > 0 && line.onsets[from - 1] > target - behind) from--;
  layout = renderScore(staffEl, { notes: line.notes, onsets: line.onsets, states: line.states, clef: clef(), key: line.key, beatsPerBar: beatsPerBar(), ppb: ppb(), from, to: line.notes.length, scrollBeat: target, fingering: settings.fingering });
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
  const cur = timed ? timedBeat() : line.onsets[line.idx] ?? line.beats;
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
  pianoEl.querySelectorAll('.key.guide').forEach((k) => k.classList.remove('guide'));
  if (settings.guide === 'off' || !line || settings.input !== 'piano' || pianoEl.hidden) return;
  currentGroup().forEach((j) => {
    if (line.states[j] !== 'current' && line.states[j] !== 'pending') return;
    const k = pianoEl.querySelector(`[data-midi="${line.notes[j].midi}"]`);
    if (k && settings.guide === 'keys') k.classList.add('guide');
  });
  if (settings.guide === 'lights') drawLights();
}

// ---------- falling lights (Synthesia-style lane above the keyboard) ----------
const LIGHT_BEATS = 4; // beats of music visible in the lane
let lightsBeat = null; // beat shown at the keyboard edge (tweened in wait mode)
let lightsRaf = 0;
function lightsTarget() {
  return timed ? timedBeat() : line.onsets[line.idx] ?? line.beats;
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
  setScroll(timed ? timedBeat() : line.onsets[line.idx] ?? line.beats, animate && !timed);
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

function flashWrong() {
  staffEl.classList.remove('shake');
  void staffEl.offsetWidth;
  staffEl.classList.add('shake');
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
  if (settings.fingering && g.some((j) => line.notes[j].shift)) feedback(t('moveHand'), 'warn');
}
function matches(n, answer) {
  return answer.pitchClassOnly ? samePitchClass(n.midi, answer.midi) : n.midi === answer.midi;
}

function answer(a) {
  if (!line) return;
  if (!timed) return startTimed(); // playing a key starts the metronome (after a bar of count-in)
  if (settings.timing === 'timed') return answerTimed(a);
  const group = currentGroup();
  if (!group.length) return;
  const i = group.find((j) => line.states[j] !== 'correct' && line.states[j] !== 'late' && matches(line.notes[j], a));
  if (i != null) {
    const n = line.notes[i];
    const ms = performance.now() - line.shownAt;
    line.states[i] = line.misses ? 'late' : 'correct';
    record(n, line.misses === 0, ms);
    noteResult(line.misses === 0);
    session.correct++;
    session.streak = line.misses ? 0 : session.streak + 1;
    session.best = Math.max(session.best, session.streak);
    if (!line.misses) session.times.push(ms);
    feedback(line.misses ? noteLabel(n) : '✓ ' + noteLabel(n), 'ok');
    const done = group.every((j) => line.states[j] === 'correct' || line.states[j] === 'late');
    if (done) {
      line.idx = group[group.length - 1] + 1;
      line.misses = 0;
      line.shownAt = performance.now();
      ensureAhead(line.onsets[line.idx]);
      setCurrentGroup();
      if (!maybeTurnPage(line.onsets[line.idx])) refresh(true);
    } else refresh();
  } else {
    line.misses++;
    session.wrong++;
    session.streak = 0;
    flashWrong();
    const pending = group.filter((j) => line.states[j] === 'current' || line.states[j] === 'pending').map((j) => noteLabel(line.notes[j])).join(' + ');
    feedback(settings.reveal && line.misses >= 2 ? t('itsNote', { n: pending }) : t('tryAgain'), 'bad');
  }
  updateHud();
}

// ---------- timed mode ----------
// The score scrolls continuously at tempo past a fixed playhead.
const beatMs = () => 60000 / settings.bpm;

function startTimed() {
  stopTimed();
  if (!line || line.idx > 0 || line.states.some((st) => st !== 'pending' && st !== 'current')) newLine();
  line.states = line.states.map((st) => (st === 'current' ? 'pending' : st));
  const bm = beatMs();
  timed = {
    t0: performance.now() + 150 + beatsPerBar() * bm, // after a one-bar count-in
    audioOffset: audioNow() - performance.now() / 1000,
    nextClick: -beatsPerBar(),
    paused: -1, // index of the note we are stopped on (stop-on-miss), or -1
    raf: 0,
  };
  startBtn.textContent = isNarrow() ? '■' : t('stop');
  feedback(t('countIn'), '');
  draw();
  timed.raf = requestAnimationFrame(tick);
}

function stopTimed() {
  if (timed) cancelAnimationFrame(timed.raf);
  timed = null;
  startBtn.textContent = isNarrow() ? '▶' : t('start');
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

// beat under the playhead (frozen while stopped on a mistake)
function timedBeat() {
  if (!timed) return 0;
  if (timed.paused >= 0) return line.onsets[timed.paused];
  return Math.max(-0.5, (performance.now() - timed.t0) / beatMs());
}

// The reading light: starts just behind the note to play, brightest right ahead of it and fading
// to the right, with a soft vertical fall-off (the CSS mask) so it never ends in a hard edge.
const LIGHT_BEHIND = 44; // px of light before the note, enough to hold the current head
function lightAt(x, width, top, height, transition) {
  readWinEl.style.transition = transition;
  Object.assign(readWinEl.style, {
    display: 'block',
    left: `${x - LIGHT_BEHIND}px`,
    width: `${width}px`,
    top: `${top}px`,
    height: `${height}px`,
    background: 'linear-gradient(to right, rgba(255,255,255,0) 0%, #ffffff 9%, #ffffff 40%, #fffdf8 62%, rgba(255,255,255,0) 100%)',
  });
}

// The red line marks the note to play (in timed mode notes cross it at their exact time);
// the reading window highlights the notes coming next, which is what you should be reading.
function showGuides() {
  if (!layout) return;
  if (layout.page) {
    // cursor at the current note (or the beat under the clock), light on the current system
    const beat = timed ? Math.max(layout.startBeat, timedBeat()) : line.onsets[line.idx] ?? layout.startBeat;
    const row = layout.rows[layout.systemOf(beat)];
    const x = !timed && layout.xOfNote(line.idx) != null ? layout.xOfNote(line.idx) : layout.xAtBeat(beat);
    const smooth = timed ? 'none' : 'left 0.25s ease-out, top 0.25s ease-out, width 0.25s ease-out';
    playheadEl.style.transition = smooth;
    Object.assign(playheadEl.style, { display: 'block', left: `${x}px`, top: `${row.top + row.staffTop}px`, height: `${row.staffH}px` });
    // bright part (up to 62% of the pool) covers at least a bar and a half ahead of the cursor
    const bars = 1.5 * beatsPerBar();
    const barPx = Math.abs(row.xAt(row.sysStart + bars) - row.xAt(row.sysStart));
    lightAt(x, Math.max(220, (barPx + LIGHT_BEHIND) / 0.62), row.top - row.height * 0.15, row.height * 1.3, smooth);
    layout.lightBeats = bars + 0.5;
    paintStates();
    return;
  }
  const top = `${layout.top}px`;
  const height = `${layout.height}px`;
  Object.assign(playheadEl.style, { display: 'block', left: `${layout.readX}px`, top, height });
  // the light pool spans from the header to the right edge; its bright centre sits on the red line and
  // its glow reaches ~60% of the look-ahead area, so the header (opaque paper) never cuts it
  const cw = staffEl.clientWidth;
  const ahead = cw - layout.readX;
  // bright part (up to 62% of the pool) covers at least a bar and a half ahead of the red line
  const bars = 1.5 * beatsPerBar();
  const barPx = layout.xOf(bars) - layout.xOf(0);
  const w = Math.max(220, ahead * 0.7, (barPx + LIGHT_BEHIND) / 0.62);
  lightAt(layout.readX, w, 0, staffEl.clientHeight, 'none');
  layout.lightBeats = Math.max(bars + 0.5, (w * 0.55) / (layout.ppb * layout.zoom)); // full ink in the light
  paintStates();
}

// move line.idx past notes that have been judged, and mark the next one as current
function advance() {
  if (line.states[line.idx] === 'current') line.states[line.idx] = 'pending';
  while (line.idx < line.notes.length && !['pending', 'current'].includes(line.states[line.idx])) line.idx++;
  if (line.idx < line.notes.length) setCurrentGroup();
}

// Stop-on-miss: freeze the clock on note i until it is played correctly.
function pauseOn(i) {
  timed.paused = i;
  const n = line.notes[i];
  feedback(settings.reveal ? t('stoppedIts', { n: noteLabel(n) }) : t('stoppedPlay'), 'bad');
  refresh();
}

function tick() {
  if (!timed) return;
  timed.raf = requestAnimationFrame(tick);
  if (timed.paused >= 0) return;
  const bm = beatMs();
  const now = performance.now() - timed.t0;

  // metronome, scheduled slightly ahead on the audio clock
  while (timed.nextClick * bm <= now + 120) {
    const b = timed.nextClick;
    if (b < 0 || settings.metronome) click(((b % beatsPerBar()) + beatsPerBar()) % beatsPerBar() === 0, (timed.t0 + b * bm) / 1000 + timed.audioOffset);
    timed.nextClick++;
  }

  let changed = false;
  while (line.idx < line.notes.length && now > line.onsets[line.idx] * bm + window_()) {
    const i = line.idx;
    record(line.notes[i], false, 0);
    noteResult(false);
    session.wrong++;
    session.streak = 0;
    updateHud();
    if (settings.stopOnMiss) return pauseOn(i);
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

  if (timed.paused >= 0) {
    const i = timed.paused;
    const n = line.notes[i];
    if (!matches(n, a)) {
      session.wrong++;
      flashWrong();
      updateHud();
      return;
    }
    // resume: treat now as the moment note i sounds and keep the tempo from here
    line.states[i] = 'late';
    timed.paused = -1;
    timed.t0 = performance.now() - line.onsets[i] * bm;
    timed.nextClick = Math.floor(line.onsets[i]) + 1;
    session.correct++;
    feedback(noteLabel(n), 'ok');
    advance();
    refresh();
    updateHud();
    return;
  }

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
    flashWrong();
    feedback('✗', 'bad');
    if (settings.stopOnMiss && now >= -window_() && line.idx < line.notes.length) {
      record(line.notes[line.idx], false, 0);
      noteResult(false);
      pauseOn(line.idx);
    }
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
  const hit = timed && target && (spelled ? samePitchClass(target.midi, midiNote) : wouldMatch(midiNote));
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

// Fit the keyboard to the screen: as many white keys as fit at MIN_KEY, centred on the clef's range.
function buildPiano() {
  pianoEl.hidden = settings.input !== 'piano';
  kbBar.hidden = settings.input !== 'piano';
  namesEl.hidden = settings.input !== 'names';
  if (settings.input !== 'piano') return;
  const [lo, hi] = rangeFor(clef(), settings.level);
  const avail = pianoEl.clientWidth - 24;
  const fit = Math.max(7, Math.floor(avail / MIN_KEY));
  const need = hi - lo + 1;
  const count = fit >= need ? Math.min(fit, Math.max(need, Math.ceil(avail / MAX_KEY))) : fit;
  // keyboard slider: a manual start key (settings.kbLo) or centred on the clef's range
  const maxLo = PIANO_TOP - count + 1;
  const autoLo = Math.round((lo + hi) / 2) - Math.floor((count - 1) / 2);
  const visLo = Math.max(PIANO_BOTTOM, Math.min(maxLo, settings.kbLo ?? autoLo));
  const visHi = visLo + count - 1;
  pianoVis = { lo: visLo, hi: visHi, loMidi: makeNote(visLo, '').midi, hiMidi: makeNote(visHi, '').midi };
  kbShift.min = PIANO_BOTTOM;
  kbShift.max = maxLo;
  kbShift.value = visLo;
  kbRange.textContent = `${noteLabel(makeNote(visLo, ''))}–${noteLabel(makeNote(visHi, ''))}`;
  kbAuto.hidden = settings.kbLo == null;
  const keyW = avail / count;
  pianoKeyW = keyW;
  const id = `${visLo}-${visHi}-${keyW.toFixed(1)}`;
  if (pianoEl.dataset.range === id) return;
  pianoEl.dataset.range = id;
  pianoEl.style.setProperty('--wk', `${keyW}px`);
  pianoEl.style.setProperty('--bk', `${keyW * 0.62}px`);
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

// ---------- screen keyboard: play with one finger, slide with two ----------
// One finger plays at once. A second finger is held back briefly: if both move sideways together the
// keyboard slides and nothing counts; if they lift or stay still it is a two-note chord.
// Wrong notes wait 150 ms before counting, so the first finger of a slide never costs a mistake.
const touches = new Map(); // pointerId -> { x, cx, key, pending, timer, deferred }
let slide = null; // { startLo } while sliding
const SLIDE_START_PX = 14;
const DEFER_WRONG_MS = 150;

// Would this key be accepted right now? (mirrors answer / answerTimed)
function wouldMatch(midiNote) {
  if (!line || !line.notes[line.idx]) return false;
  if (settings.timing === 'timed' && timed) {
    if (timed.paused >= 0) return line.notes[timed.paused].midi === midiNote;
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
  const voice = answerSound(midiNote, null, false);
  const tp = touches.get(id);
  if (wouldMatch(midiNote) || !tp) answer({ midi: midiNote, pitchClassOnly: false });
  else tp.deferred = setTimeout(() => {
    tp.deferred = null;
    answer({ midi: midiNote, pitchClassOnly: false });
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
  slide = { startLo: pianoVis.lo };
  touches.forEach((tp, id) => {
    clearTimeout(tp.timer);
    clearTimeout(tp.deferred);
    tp.pending = false;
    tp.deferred = null;
    silence(id);
  });
  pianoEl.classList.add('sliding');
}

pianoEl.addEventListener('pointerdown', (e) => {
  const k = e.target.closest('.key');
  if (!k) return;
  e.preventDefault();
  try { pianoEl.setPointerCapture(e.pointerId); } catch { /* not supported */ }
  if (touches.has(e.pointerId)) touchEnd(e); // a lost pointerup must not turn the next tap into a "second finger"
  const others = touches.size;
  const tp = { x: e.clientX, cx: e.clientX, key: k, pending: others > 0, timer: 0, deferred: null };
  touches.set(e.pointerId, tp);
  if (slide) return; // extra fingers just join the slide
  if (others === 0) pianoPress(e.pointerId, k);
  else tp.timer = setTimeout(() => playPending(e.pointerId), 160);
});

pianoEl.addEventListener('pointermove', (e) => {
  const tp = touches.get(e.pointerId);
  if (!tp) return;
  tp.cx = e.clientX;
  if (touches.size < 2 && !slide) return;
  const dxs = [...touches.values()].map((t) => t.cx - t.x);
  const avg = dxs.reduce((a, b) => a + b, 0) / dxs.length;
  if (!slide) {
    const together = dxs.every((d) => Math.sign(d) === Math.sign(avg) || Math.abs(d) < 6);
    if (Math.abs(avg) < SLIDE_START_PX || !together) return;
    startSlide();
  }
  // dragging right reveals lower keys, like pulling the keyboard
  const lo = Math.max(PIANO_BOTTOM, slide.startLo - Math.round(avg / pianoKeyW));
  if (lo !== pianoVis.lo) {
    settings.kbLo = lo;
    buildPiano();
    if (settings.kbLo !== pianoVis.lo) settings.kbLo = pianoVis.lo; // clamped at the ends
  }
});

function touchEnd(e) {
  const tp = touches.get(e.pointerId);
  if (!tp) return;
  if (tp.pending && !slide) playPending(e.pointerId); // a quick second tap is still a note
  touches.delete(e.pointerId);
  if (slide && touches.size === 0) {
    slide = null;
    pianoEl.classList.remove('sliding');
    applyKeyboardShift();
  }
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
  if (e.target.closest('dialog') || e.repeat) return;
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
});
function renderDevices() {
  const devices = midiDevices;
  const pill = $('#midi-pill');
  const full = devices.length ? `🎹 ${devices[0]}${devices.length > 1 ? ` +${devices.length - 1}` : ''}` : t('noMidi');
  pill.textContent = isNarrow() ? (devices.length ? 'MIDI ✓' : 'MIDI –') : full;
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
  $('#rank-pill').textContent = `🏅 ${t('rankPill', { n: rank.passed })}`;
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
  return t(ki.minor ? 'keyMinor' : 'keyMajor', { k: pitchName(ki.letter, ki.acc) });
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
  $('#piano-phone-note').hidden = !(isPhone && settings.pianoMode);
  $('#page-phone-note').hidden = !(isPhone && settings.layoutMode === 'page');
  $('#midi-pref-note').hidden = !(prefersMidi(settings) && midiDevices.length === 0);
  const togetherOpt = dialog.querySelector('select[name=hands] option[value=together]');
  togetherOpt.disabled = isPhone;
  $('#hands-midi-note').hidden = !(settings.pianoMode && settings.hands === 'together' && midiDevices.length === 0 && !isPhone);
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
  $('#scale-names').innerHTML = sc.map((s, i) => `<span class="${i === 0 ? 'tonic' : ''}">${pitchName(s.letter, s.acc)}<small>${ROMAN[i]}</small></span>`).join('');
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
  $('#bpm-val').textContent = settings.bpm;
  $('#maxacc-val').textContent = settings.maxAcc;
  $('#zoom-val').textContent = `${Math.round((settings.zoom || 1) * 100)}%`;
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
  stopTimed();
  syncForm();
  dialog.showModal();
};
// MIDI pill opens the settings on the tab with the MIDI section
$('#midi-pill').onclick = () => {
  showTab('general');
  $('#open-settings').onclick();
};
function applySettings() {
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
const isNarrow = () => window.matchMedia('(max-width: 600px)').matches;
const SOUND_ORDER = ['off', 'tone', 'voice'];
const SOUND_ICON = { off: '🔇', tone: '🎵', voice: '🗣' };
const SOUND_SHORT = { off: 'soundOffShort', tone: 'soundTone', voice: 'soundVoiceShort' };
function syncQuick() {
  setNaming(settings.naming);
  setLanguage(settings.lang);
  document.documentElement.dataset.light = settings.light || 'normal';
  setUserZoom(settings.zoom);
  applyStatic();
  startBtn.textContent = isNarrow() ? (timed ? '■' : '▶') : t(timed ? 'stop' : 'start');
  renderDevices();
  namesEl.querySelectorAll('[data-letter]').forEach((b) => (b.textContent = letterName(b.dataset.letter)));
  $('#bpm-show').textContent = settings.bpm;
  const gl = { off: 'guideOff', keys: 'guideKeys', lights: 'guideLights' }[settings.guide] || 'guideOff';
  $('#guide-btn').textContent = `${t('guideLabel')}: ${t(gl)}`;
  $('#guide-btn').classList.toggle('on', settings.guide !== 'off');
  $('#finger-btn').textContent = `${t('fingering')}: ${t(settings.fingering ? 'yes' : 'no')}`;
  $('#finger-btn').classList.toggle('on', !!settings.fingering);
  const clefLabel = t(settings.pianoMode ? 'qBoth' : CLEF_LABEL[clef()]);
  $('#q-clef').textContent = isNarrow() ? clefLabel.split(' ')[0] : clefLabel; // phones: the clef symbol only
  updateLevelPill();

  // the tempo only matters when playing in time; the start button sits right next to the timing toggle
  $('.tempo').hidden = false;
  startBtn.hidden = false;
  const snd = SOUND_ORDER.includes(settings.soundMode) ? settings.soundMode : 'tone';
  $('#q-sound').textContent = isNarrow() ? SOUND_ICON[snd] : `${SOUND_ICON[snd]} ${t(SOUND_SHORT[snd])}`;
}
$('#q-sound').onclick = () => {
  const cur = SOUND_ORDER.indexOf(settings.soundMode);
  settings.soundMode = SOUND_ORDER[(cur + 1) % SOUND_ORDER.length];
  save('sr.settings', settings);
  syncQuick();
};
let narrowWas = null;
window.addEventListener('resize', () => {
  if (isNarrow() !== narrowWas) {
    narrowWas = isNarrow();
    syncQuick();
  }
});
function nudgeBpm(delta) {
  forkIfLevel();
  settings.bpm = Math.max(30, Math.min(160, settings.bpm + delta));
  syncTemplateFromSettings();
  save('sr.settings', settings);
  syncQuick();
  if (timed) startTimed(); // restart the line at the new tempo
}
// keyboard slider: move keys live while dragging, regenerate notes for the new keys on release
kbShift.addEventListener('input', () => {
  settings.kbLo = +kbShift.value;
  buildPiano();
});
kbShift.addEventListener('change', () => applyKeyboardShift());
// After the keyboard moved: follow with the clef and regenerate music for the visible keys
function applyKeyboardShift() {
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
  applySettings();
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
  settings.fingering = !settings.fingering;
  save('sr.settings', settings);
  syncQuick();
  draw();
});
$('#bpm-down').onclick = () => nudgeBpm(-4);
$('#bpm-up').onclick = () => nudgeBpm(4);
$('#q-clef').onclick = () => {
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
startBtn.onclick = () => (timed ? stopTimed() : startTimed());
$('#new-key').onclick = () => {
  stopTimed();
  newLine(true);
};

// debugging hook: inspect the note stream and layout from the console
Object.defineProperty(window, '__sr', { get: () => ({ line, layout, settings, timed, midi }) });

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
  if (!first && before !== `${pianoVis.lo}-${pianoVis.hi}` && !timed) newLine();
}).observe(pianoEl);
window.addEventListener('resize', layoutPanels);
(async () => {
  await document.fonts.load('30px Bravura').catch(() => {});
  startBtn.hidden = false;
  syncQuick();
  newLine();
  updateHud();
  updateLevelPill();
  midi.initMidi();
})();
