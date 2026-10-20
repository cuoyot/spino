import { Renderer, Stave, StaveNote, TickContext, ModifierContext, Accidental, Annotation, Beam, Dot, StaveConnector, BarlineType } from 'vexflow/bravura';
import { clefOf, keyAccidentals } from './music.js';
import { pageRows, pageBeatGrid } from './page-layout.js';

const COLORS = {
  pending: '#1a1a1a',
  current: '#1565c0',
  correct: '#2e7d32',
  late: '#ef6c00',
  missed: '#c62828',
};
const STAVE_GAP = 120; // logical px between treble and bass staves
const PAD = 24; // logical px before the first rendered beat

const headCentre = note => (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2;

// Stave.y includes headroom; it is not the top staff line. Read the drawn staff
// bounds once per render so guides share its origin, spacing and pixel alignment.
function staffGuide(staves, zoom) {
  const bounds = staves.map(stave => stave.getSVGElement().getBBox());
  const top = Math.min(...bounds.map(box => box.y));
  const bottom = Math.max(...bounds.map(box => box.y + box.height));
  const padding = 12;
  return { staffTop: (top - padding) * zoom, staffH: (bottom - top + 2 * padding) * zoom };
}

// Centre every head on its beat, including wider whole notes and displaced heads.
function placeNote(note, x) {
  const tick = new TickContext().addTickable(note).preFormat().setX(0);
  tick.setX(x - headCentre(note));
}

// Which accidental symbol (if any) to print, honouring key signature and in-bar alterations.
function accidentalsToShow(notes, key, perNote) {
  const keyMap = keyAccidentals(key);
  let state = {};
  let bar = -1;
  return notes.map((n) => {
    if (perNote || n.bar !== bar) {
      state = {};
      bar = n.bar;
    }
    const k = n.letter + n.octave;
    const current = k in state ? state[k] : keyMap[n.letter] || '';
    state[k] = n.acc;
    if (n.acc === current) return null;
    return n.acc === '' ? 'n' : n.acc;
  });
}

function makeStaveNote(n, clef, accSym, color, fingering = false) {
  const dotted = n.dur.endsWith('d');
  const note = new StaveNote({ keys: [`${n.letter}${n.acc}/${n.octave}`], duration: n.dur.replace('d', ''), dots: dotted ? 1 : 0, clef, autoStem: true });
  if (dotted) Dot.buildAndAttach([note], { all: true });
  if (accSym) note.addModifier(new Accidental(accSym), 0);
  // recommended finger: above the right hand, below the left; an arrow marks a change of hand position
  if (fingering && n.finger) {
    const a = new Annotation((n.shift ? '→' : '') + n.finger);
    a.setVerticalJustification(clef === 'bass' ? Annotation.VerticalJustify.BOTTOM : Annotation.VerticalJustify.TOP);
    a.setFont('Arial', 11, 'bold');
    if (n.shift) a.setStyle({ fillStyle: '#ef6c00', strokeStyle: '#ef6c00' });
    note.addModifier(a, 0);
  }
  note.setStyle({ fillStyle: color, strokeStyle: color });
  return note;
}

function svgSize(target, W, H, cw, ch) {
  const svg = target.querySelector('svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.width = `${cw}px`;
  svg.style.height = `${ch}px`;
  return svg;
}

const logicalHeight = (grand) => (grand ? 344 : 184); // includes room at the top for the key label
const BAR_GAP = 22; // extra logical px at each bar line, so accidentals on the downbeat don't touch it

// Logical spacing for a note value: sixteenths need more room than quarters
export function pxPerBeatFor(shortestUnit) {
  return shortestUnit <= 1 ? 110 : shortestUnit <= 2 ? 74 : 60;
}

// User's score size preference (1 = automatic size)
let userZoom = 1;
export function setUserZoom(z) {
  userZoom = Math.max(0.5, Math.min(2, +z || 1));
}
export const getUserZoom = () => userZoom;

// Largest zoom that still leaves `beats` of look-ahead across the width, scaled by the user's preference.
function widthZoom(cw, ppb, beats = 6) {
  return Math.max(0.9, Math.min(2.6, (cw * 0.65) / (beats * ppb))) * userZoom;
}

// Height (CSS px) the score needs for this width: 8 beats of look-ahead is comfortable, 6 is the largest we allow.
export function idealScoreHeight(cw, clef, ppb, beats = 8) {
  return logicalHeight(clef === 'grand') * widthZoom(cw, ppb, beats) + 12;
}

/**
 * Scrolling score divided into bars. Notes sit at fixed positions by beat (plus a small gap at each
 * bar line), so the strip can slide left as you play. The clef/key/time header stays fixed on the left
 * and masks the music passing underneath.
 *
 * Returns { xOf(beat), readX, strip, ... }: translate `strip` by (readX - xOf(beat)) to put `beat`
 * at the reading position.
 */
export function renderScore(container, { notes, onsets, states, clef, key, beatsPerBar = 4, ppb = 60, from, to, scrollBeat = 0, fingering = false }) {
  const grand = clef === 'grand';
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const logicalH = logicalHeight(grand);
  const zoom = Math.max(0.45, Math.min(widthZoom(cw, ppb), ch / logicalH));
  const H = ch / zoom;
  const top = Math.max(0, (H - logicalH) / 2) + (grand ? 44 : 34);
  const clefs = grand ? ['treble', 'bass'] : [clef];
  const timeSig = `${beatsPerBar}/4`;

  // x of a beat in global logical units. Time maps linearly to x (the bar-line room is spread over the bar),
  // so the score scrolls at a perfectly constant speed in timed mode.
  const unit = ppb + BAR_GAP / beatsPerBar;
  const X = (beat) => beat * unit;
  // Bar lines split the space between consecutive rhythmic slots.
  const minSpacing = ppb >= 110 ? unit / 4 : ppb >= 74 ? unit / 2 : unit;
  const barOffset = minSpacing / 2;

  container.replaceChildren();

  // --- fixed header: clef, key signature, time signature
  const headerEl = document.createElement('div');
  headerEl.className = 'score-header';
  const probe = new Stave(0, 0, 400).addClef('treble').addKeySignature(key).addTimeSignature(timeSig);
  const headerW = (grand ? 18 : 0) + 8 + probe.getNoteStartX() + 6;

  // --- scrolling strip with notes [from, to)
  // the strip reaches back under the header from the reading position, so staff lines are continuous
  const free = cw - headerW * zoom;
  const readX = headerW * zoom + Math.min(free * 0.3, 160 * zoom); // ~70% of the width stays for reading ahead
  const beat0 = Math.min(onsets[from] ?? scrollBeat, scrollBeat) - readX / (ppb * zoom) - 1;
  const lastBeat = to > from ? onsets[to - 1] + 4 : beat0 + 8;
  const W = PAD + X(lastBeat) - X(beat0) + 40;
  const xLocal = (beat) => PAD + X(beat) - X(beat0);

  const strip = document.createElement('div');
  strip.className = 'score-strip';
  const inner = document.createElement('div');
  inner.style.position = 'absolute';
  inner.style.left = `${(X(beat0) - PAD) * zoom}px`; // strip coordinates are global
  strip.appendChild(inner);
  container.append(strip, headerEl);

  const hr = new Renderer(headerEl, Renderer.Backends.SVG);
  hr.resize(headerW, H);
  const hctx = hr.getContext();
  svgSize(headerEl, headerW, H, headerW * zoom, ch);
  const headerStaves = clefs.map((c, i) => {
    const s = new Stave(8 + (grand ? 18 : 0), top + i * STAVE_GAP, headerW - 8 - (grand ? 18 : 0));
    s.addClef(c).addKeySignature(key).addTimeSignature(timeSig);
    s.setEndBarType(BarlineType.NONE);
    s.setContext(hctx).draw();
    return s;
  });
  if (grand) {
    new StaveConnector(headerStaves[0], headerStaves[1]).setType('brace').setContext(hctx).draw();
    new StaveConnector(headerStaves[0], headerStaves[1]).setType('singleLeft').setContext(hctx).draw();
  }

  const r = new Renderer(inner, Renderer.Backends.SVG);
  r.resize(W, H);
  const ctx = r.getContext();
  svgSize(inner, W, H, W * zoom, ch);

  const staves = clefs.map((c, i) => {
    const s = new Stave(0, top + i * STAVE_GAP, W);
    s.setBegBarType(BarlineType.NONE).setEndBarType(BarlineType.NONE);
    s.setContext(ctx).draw();
    return s;
  });

  const probeNote = new StaveNote({ keys: ['b/4'], duration: 'q', clef: 'treble' });
  probeNote.setStave(staves[0]).setContext(ctx);
  new TickContext().addTickable(probeNote).preFormat().setX(0);
  const headOffset = headCentre(probeNote);

  // bar lines
  for (let b = Math.ceil(beat0 / beatsPerBar) * beatsPerBar; b <= lastBeat; b += beatsPerBar) {
    if (b <= 0) continue;
    const x = xLocal(b) + headOffset - barOffset;
    ctx.beginPath();
    ctx.moveTo(x, staves[0].getYForLine(0));
    ctx.lineTo(x, staves[staves.length - 1].getYForLine(4));
    ctx.stroke();
  }

  const slice = notes.slice(from, to);
  const accs = accidentalsToShow(slice, key, false);
  const drawn = slice.map((n, j) => {
    const i = from + j;
    const c = clefOf(n, clef);
    const sn = makeStaveNote(n, c, accs[j], COLORS.pending, fingering);
    sn.setStave(staves[clefs.indexOf(c)]).setContext(ctx);
    sn.addToModifierContext(new ModifierContext());
    placeNote(sn, xLocal(onsets[i]) + headOffset);
    return { sn, c, bar: n.bar };
  });

  // beam runs of consecutive notes on the same staff within one bar
  const beams = [];
  const runs = {}; // one beam run per staff, broken at bar lines
  const flush = (c) => {
    const run = runs[c] || [];
    if (run.length > 1) beams.push(...Beam.generateBeams(run.map((d) => d.sn)));
    runs[c] = [];
  };
  drawn.forEach((d) => {
    const run = (runs[d.c] ||= []);
    if (run.length && run[0].bar !== d.bar) flush(d.c);
    (runs[d.c] ||= []).push(d);
  });
  Object.keys(runs).forEach(flush);
  drawn.forEach((d) => d.sn.draw());
  beams.forEach((b) => b.setContext(ctx).draw());

  // Note states are CSS classes on each note's SVG group, so progress only recolours notes (no re-render).
  const groups = drawn.map((d) => d.sn.getSVGElement());
  const painted = new Map();
  // tier: 'past' | 'near' | 'far' — how far the note is from the reading zone (drives ink weight)
  const setState = (i, state, tier = 'near') => {
    const g = groups[i - from];
    const cls = `vf-stavenote st-${state} tier-${tier}`;
    if (g && painted.get(i) !== cls) {
      g.setAttribute('class', cls);
      painted.set(i, cls);
    }
  };
  for (let i = from; i < to; i++) setState(i, states[i]);

  const xOf = (beat) => (X(beat) + headOffset) * zoom;
  const guide = staffGuide(staves, zoom);
  return { xOf, readX, zoom, ppb, top: guide.staffTop, height: guide.staffH, strip, headerW: headerW * zoom, from, to, setState, elementOf: (i) => groups[i - from] };
}

/**
 * Fixed sheet: `systems` lines of `barsPerSystem` bars each, starting at `startBeat`, filling the
 * container. Clef and key on every system, time signature on the first. Notes are placed by beat
 * within their bar (equal-width bars), so the eye has to travel like on printed music.
 *
 * Returns { xOfNote(i), xAtBeat(beat), systemOf(beat), rows[], setState, from, to, zoom }.
 */
export function renderPage(container, { notes, onsets, states, clef, key, beatsPerBar = 4, barsPerSystem = 4, systems = 3, startBeat = 0, zoomHint = 1.8, widthHint = 620, fingering = false }) {
  const grand = clef === 'grand';
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const clefs = grand ? ['treble', 'bass'] : [clef];
  const GAP = 90; // treble-to-bass stave distance on the sheet: compact, like printed piano music
  const logicalH = grand ? 40 + GAP + 80 : 130; // per system, with room for ledger lines
  const zoom = Math.max(0.6, Math.min(zoomHint, Math.max(1,ch-48) / (systems * logicalH), (cw / widthHint) * userZoom));
  const {rowHeight:rowH,offset}=pageRows(ch,systems,logicalH,zoom);
  const W = cw / zoom;
  const beatsPerSystem = barsPerSystem * beatsPerBar;
  const timeSig = `${beatsPerBar}/4`;
  const from = onsets.findIndex((o) => o >= startBeat);
  let to = onsets.findIndex((o) => o >= startBeat + systems * beatsPerSystem);
  if (to < 0) to = notes.length;
  const shortestBeat = Math.min(beatsPerBar, ...notes.slice(from, to).map(n => n.units / 4));
  container.replaceChildren();

  const rows = [];
  const groups = [];
  const posOf = new Map(); // note index -> css x
  for (let s = 0; s < systems; s++) {
    const sysStart = startBeat + s * beatsPerSystem;
    const rowEl = document.createElement('div');
    rowEl.className = 'page-row';
    rowEl.style.cssText = `position:absolute;left:0;top:${offset+s * rowH}px;width:${cw}px;height:${rowH}px`;
    container.appendChild(rowEl);
    const r = new Renderer(rowEl, Renderer.Backends.SVG);
    const H = rowH / zoom;
    r.resize(W, H);
    const ctx = r.getContext();
    svgSize(rowEl, W, H, cw, rowH);
    // Ledger lines and clef tails may extend beyond the nominal row, not the page.
    rowEl.querySelector('svg').style.overflow='visible';
    // VexFlow places the first staff line 40 logical pixels below Stave.y.
    const top = (H - (grand ? GAP+40 : 40)) / 2 - 40;
    const staves = clefs.map((c, i) => {
      const st = new Stave(8 + (grand ? 18 : 0), top + i * GAP, W - 16 - (grand ? 18 : 0));
      st.addClef(c).addKeySignature(key);
      if (s === 0) st.addTimeSignature(timeSig);
      st.setEndBarType(s === systems - 1 ? BarlineType.END : BarlineType.SINGLE);
      st.setContext(ctx).draw();
      return st;
    });
    if (grand) {
      new StaveConnector(staves[0], staves[1]).setType('brace').setContext(ctx).draw();
      new StaveConnector(staves[0], staves[1]).setType('singleLeft').setContext(ctx).draw();
      new StaveConnector(staves[0], staves[1]).setType(s === systems - 1 ? 'boldDoubleRight' : 'singleRight').setContext(ctx).draw();
    }
    // Keep every notehead inside its measure, with half a rhythmic slot on either side.
    // A fixed inset can exceed the last slot in a dense bar and push that note across the bar line.
    const x0 = Math.max(...staves.map((st) => st.getNoteStartX())) + 4;
    const x1 = staves[0].getNoteEndX() - 6;
    const {barWidth:barW,xAt} = pageBeatGrid(x0,x1,barsPerSystem,beatsPerBar,shortestBeat);
    const xLocal = beat => xAt(beat-sysStart);
    // bar lines between bars
    for (let b = 1; b < barsPerSystem; b++) {
      const x = x0 + b * barW;
      ctx.beginPath();
      ctx.moveTo(x, staves[0].getYForLine(0));
      ctx.lineTo(x, staves[staves.length - 1].getYForLine(4));
      ctx.stroke();
    }
    // notes of this system
    const idx = [];
    for (let i = from; i < to; i++) if (onsets[i] >= sysStart && onsets[i] < sysStart + beatsPerSystem) idx.push(i);
    const slice = idx.map((i) => notes[i]);
    const accs = accidentalsToShow(slice, key, false);
    const drawn = idx.map((i, j) => {
      const n = notes[i];
      const c = clefOf(n, clef);
      const sn = makeStaveNote(n, c, accs[j], COLORS.pending, fingering);
      sn.setStave(staves[clefs.indexOf(c)]).setContext(ctx);
      sn.addToModifierContext(new ModifierContext());
      placeNote(sn, xLocal(onsets[i]));
      return { sn, c, bar: n.bar, i };
    });
    const beams = [];
    const runs = {}; // one beam run per staff, broken at bar lines
    const flush = (c) => {
      const run = runs[c] || [];
      if (run.length > 1) beams.push(...Beam.generateBeams(run.map((d) => d.sn)));
      runs[c] = [];
    };
    drawn.forEach((d) => {
      const run = (runs[d.c] ||= []);
      if (run.length && run[0].bar !== d.bar) flush(d.c);
      (runs[d.c] ||= []).push(d);
    });
    Object.keys(runs).forEach(flush);
    drawn.forEach((d) => d.sn.draw());
    beams.forEach((b) => b.setContext(ctx).draw());
    drawn.forEach((d) => {
      groups[d.i] = d.sn.getSVGElement();
      posOf.set(d.i, headCentre(d.sn) * zoom);
    });
    rows.push({ top: offset+s * rowH, height: rowH, sysStart, xAt: (beat) => xLocal(beat) * zoom, ...staffGuide(staves, zoom) });
  }

  const systemOf = (beat) => Math.max(0, Math.min(systems - 1, Math.floor((beat - startBeat) / beatsPerSystem)));
  const painted = new Map();
  const setState = (i, state, tier = 'near') => {
    const g = groups[i];
    const cls = `vf-stavenote st-${state} tier-${tier}`;
    if (g && painted.get(i) !== cls) {
      g.setAttribute('class', cls);
      painted.set(i, cls);
    }
  };
  for (let i = from; i < to; i++) setState(i, states[i]);
  return {
    page: true, zoom, from, to, rows, systemOf,
    startBeat, endBeat: startBeat + systems * beatsPerSystem,
    xOfNote: (i) => posOf.get(i),
    xAtBeat: (beat) => rows[systemOf(beat)].xAt(beat),
    setState, elementOf: (i) => groups[i],
  };
}
