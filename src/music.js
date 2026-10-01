// Note model, key signatures and exercise generators.
// A pitch is described in diatonic space: d = octave * 7 + letterIndex (C4 = 28).

export const LETTERS = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
const SEMIS = [0, 2, 4, 5, 7, 9, 11];
const ACC_OFFSET = { '': 0, '#': 1, b: -1, n: 0, '##': 2, bb: -2 };
const SHARP_ORDER = ['f', 'c', 'g', 'd', 'a', 'e', 'b'];
const FLAT_ORDER = ['b', 'e', 'a', 'd', 'g', 'c', 'f'];

// Keys in VexFlow notation (minor keys end in "m") -> sharps (+) / flats (-) in the key signature
export const KEYS = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7, F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7,
  Am: 0, Em: 1, Bm: 2, 'F#m': 3, 'C#m': 4, 'G#m': 5, 'D#m': 6, 'A#m': 7, Dm: -1, Gm: -2, Cm: -3, Fm: -4, Bbm: -5, Ebm: -6, Abm: -7,
};

export function keyAccidentals(key) {
  const n = KEYS[key] ?? 0;
  const map = {};
  if (n > 0) SHARP_ORDER.slice(0, n).forEach((l) => (map[l] = '#'));
  if (n < 0) FLAT_ORDER.slice(0, -n).forEach((l) => (map[l] = 'b'));
  return map;
}

// Tonic and mode of a key: "F#m" -> { letter: 'f', acc: '#', minor: true }
export function keyInfo(key) {
  return { letter: key[0].toLowerCase(), acc: key[1] === '#' || key[1] === 'b' ? key[1] : '', minor: key.endsWith('m') };
}

// Pick a key whose signature has at most `maxAcc` sharps/flats; scale: 'major' | 'minor' | 'both'
export function pickKey(maxAcc, scale, avoid) {
  const keys = Object.entries(KEYS)
    .filter(([k, n]) => Math.abs(n) <= maxAcc && (scale === 'both' || (scale === 'minor') === k.endsWith('m')))
    .map(([k]) => k);
  const pool = keys.length > 1 ? keys.filter((k) => k !== avoid) : keys;
  return pool[Math.floor(Math.random() * pool.length)] || 'C';
}

// raise / lower an accidental by a semitone
const RAISE = { bb: 'b', b: '', '': '#', '#': '##' };

// Ranges in diatonic indices per clef and level
const RANGES = {
  treble: [[29, 39], [26, 42], [24, 44]], // D4–G5, A3–C6, F3–E6
  bass: [[17, 27], [14, 30], [12, 32]],   // F2–B3, C2–E4, A1–G4
};

export function rangeFor(clef, level) {
  if (clef === 'grand') return [RANGES.bass[level][0], RANGES.treble[level][1]];
  return RANGES[clef][level];
}

// Intersect a clef range with the keys visible on the on-screen piano (vis = { lo, hi, loMidi, hiMidi }).
export function clampRange([lo, hi], vis) {
  if (!vis) return [lo, hi];
  if (vis.exact) return [vis.lo, vis.hi]; // keyboard moved by hand: use every visible key
  const a = Math.max(lo, vis.lo);
  const b = Math.min(hi, vis.hi);
  return b - a >= 4 ? [a, b] : [vis.lo, vis.hi];
}

// Drop an accidental that would push the note off the visible keyboard.
function fitAcc(d, acc, vis) {
  if (!vis || !acc) return acc;
  const m = makeNote(d, acc).midi;
  return m < vis.loMidi || m > vis.hiMidi ? '' : acc;
}

export function makeNote(d, acc, dur = 'q') {
  const letter = LETTERS[((d % 7) + 7) % 7];
  const octave = Math.floor(d / 7);
  const midi = 12 * (octave + 1) + SEMIS[LETTERS.indexOf(letter)] + ACC_OFFSET[acc];
  return { d, letter, acc, octave, midi, dur };
}

// Note-name systems, in LETTERS order (c d e f g a b)
export const NAMINGS = {
  english: { label: 'English (C D E)', names: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
  solfege: { label: 'Español / Italiano / Português (Do Re Mi)', names: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'] },
  french: { label: 'Français (Do Ré Mi)', names: ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'] },
  german: { label: 'Deutsch (C D E … H)', names: ['C', 'D', 'E', 'F', 'G', 'A', 'H'] },
  russian: { label: 'Русский (До Ре Ми)', names: ['До', 'Ре', 'Ми', 'Фа', 'Соль', 'Ля', 'Си'] },
  japanese: { label: '日本語 (ハ ニ ホ)', names: ['ハ', 'ニ', 'ホ', 'ヘ', 'ト', 'イ', 'ロ'] },
};

// Default naming from the device language
export function namingForLocale(lang = '') {
  const l = lang.toLowerCase().slice(0, 2);
  if (['es', 'it', 'pt', 'ca', 'gl', 'ro'].includes(l)) return 'solfege';
  return { fr: 'french', de: 'german', ru: 'russian', ja: 'japanese' }[l] || 'english';
}

let naming = 'english';
export function setNaming(n) {
  naming = NAMINGS[n] ? n : 'english';
}

export function letterName(letter) {
  return NAMINGS[naming].names[LETTERS.indexOf(letter)];
}

// Name without octave, e.g. "Sol♯", "F♯", German "B" for B♭
export function pitchName(letter, acc) {
  if (naming === 'german' && letter === 'b' && acc === 'b') return 'B';
  const sym = { '#': '♯', b: '♭', '##': '♯♯', bb: '♭♭' }[acc] || '';
  return letterName(letter) + sym;
}

export function noteLabel(n) {
  return pitchName(n.letter, n.acc) + n.octave;
}

// Label from a stats id such as "f#4" or "bb3"
export function labelFromId(id) {
  const m = /^([a-g])(##|bb|#|b|)(-?\d+)$/.exec(id);
  return m ? pitchName(m[1], m[2]) + m[3] : id;
}

export function noteId(n) {
  return n.letter + n.acc + n.octave;
}

export function clefOf(n, clef) {
  if (clef !== 'grand') return clef;
  if (n.clef) return n.clef;
  return n.d >= 28 ? 'treble' : 'bass';
}

function pickWeighted(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function accidentalFor(letter, keyMap, allowChromatic) {
  const base = keyMap[letter] || '';
  if (!allowChromatic || Math.random() > 0.12) return base;
  const options = ['', '#', 'b'].filter((a) => a !== base);
  // skip awkward spellings (E#, B#, Cb, Fb)
  const ok = options.filter((a) => !(a === '#' && (letter === 'e' || letter === 'b')) && !(a === 'b' && (letter === 'c' || letter === 'f')));
  return ok.length ? ok[Math.floor(Math.random() * ok.length)] : base;
}

// ---------- rhythm ----------
// Durations are counted in sixteenths.
export const DUR_CODE = { 16: 'w', 12: 'hd', 8: 'h', 6: 'qd', 4: 'q', 3: '8d', 2: '8', 1: '16' };
export const TIME_SIGS = { '2/4': 2, '3/4': 3, '4/4': 4 };

// Note values allowed by the settings. figures = { w, h, q, e, s } (whole … sixteenth)
export function allowedUnits(figures = {}, dotted = false) {
  const u = [];
  if (figures.w) u.push(16);
  if (figures.h) u.push(8);
  if (figures.q) u.push(4);
  if (figures.e) u.push(2);
  if (figures.s) u.push(1);
  if (dotted) {
    if (figures.h) u.push(12);
    if (figures.q && figures.e) u.push(6); // dotted quarter + eighth
    if (figures.e && figures.s) u.push(3); // dotted eighth + sixteenth
  }
  return u.length ? u : [4];
}

// Shortest note that can appear (dotted values bring a shorter companion note)
export function shortestUnit(units) {
  return Math.min(...units.map((u) => (u === 6 ? 2 : u === 3 ? 1 : u)));
}

// Can a note of length d start at position p of a bar? Keeps the beat readable:
// halves don't cross the middle of 4/4, quarters start on beats, eighths on eighth positions.
function fitsAt(p, d, len, beats) {
  if (p + d > len) return false;
  if (d === 16 || d === 12) return p === 0;
  if (d === 8) return beats === 4 ? p % 8 === 0 : p % 4 === 0;
  if (d === 6) return p % 4 === 0 && p + 8 <= len;
  if (d === 4 || d === 3) return p % 4 === 0;
  if (d === 2) return p % 2 === 0;
  return true;
}
const FALLBACK_UNITS = [16, 12, 8, 4, 2, 1];

// One bar of rhythm. The last bar of a phrase ends on the longest possible note.
export function barRhythm(beats, units, final = false) {
  const len = beats * 4;
  const out = [];
  let p = 0;
  while (p < len) {
    // the last bar must end on a long note, so no dotted pairs there (their second note is short)
    let opts = units.filter((d) => fitsAt(p, d, len, beats) && !(final && (d === 6 || d === 3)));
    // nothing allowed fits here (e.g. only whole notes in 3/4): use the nearest value that does
    if (!opts.length) opts = [FALLBACK_UNITS.find((d) => fitsAt(p, d, len, beats))];
    const d = final ? Math.max(...opts) : pickWeighted(opts, opts.map((x) => (x === 4 ? 2 : 1)));
    out.push(d);
    p += d;
    if (d === 6) (out.push(2), (p += 2));
    if (d === 3) (out.push(1), (p += 1));
  }
  return out;
}

function rhythmSlots(opts, bars) {
  const beats = TIME_SIGS[opts.timeSig] || 4;
  const units = allowedUnits(opts.figures, opts.dotted);
  const slots = [];
  for (let b = 0; b < bars; b++) {
    let pos = 0;
    for (const u of barRhythm(beats, units, opts.final && b === bars - 1)) {
      slots.push({ u, bar: b, pos, strong: pos === 0 || (beats === 4 && pos === 8) });
      pos += u;
    }
  }
  return slots;
}

// on the grand staff each phrase is for one hand, so it lands on one staff
function chooseHand(opts) {
  if (opts.forceHand) return opts.forceHand;
  let hand = opts.clef === 'grand' ? (Math.random() < 0.5 ? 'treble' : 'bass') : opts.clef;
  if (opts.clef === 'grand' && opts.vis?.exact) hand = (opts.vis.lo + opts.vis.hi) / 2 >= 28 ? 'treble' : 'bass';
  const fits = (h) => { const [a, b] = rangeFor(h, opts.level); return !opts.vis || Math.min(b, opts.vis.hi) - Math.max(a, opts.vis.lo) >= 4; };
  if (opts.clef === 'grand' && !opts.vis?.exact && !fits(hand)) hand = hand === 'treble' ? 'bass' : 'treble';
  return hand;
}

// ---------- random notes (reviewing weak notes) ----------
// Left-hand accompaniment over a progression: chord roots on strong beats, broken chords
// (root–fifth–third–fifth, Alberti style) on the others, closing on the tonic.
// Progressions available: inside a hand position only chords whose roots fit within a fifth (no vi)
function progFor(opts) {
  const list = opts.position && opts.position !== 'free' ? PROGRESSIONS.filter((p) => p.every((x) => x <= 4)) : PROGRESSIONS;
  return list[Math.floor(Math.random() * list.length)];
}

export function generateBassPhrase(opts, prog = progFor(opts)) {
  const [lo, hi] = clampRange(rangeFor('bass', opts.level), opts.vis);
  const keyMap = keyAccidentals(opts.key);
  const ki = keyInfo(opts.key);
  const tonic = LETTERS.indexOf(ki.letter);
  const deg = (d) => (((d % 7) - tonic) % 7 + 7) % 7;
  const accOf = (d) => {
    const base = keyMap[LETTERS[d % 7]] || '';
    return ki.minor && deg(d) === 6 ? RAISE[base] : base;
  };
  const slots = rhythmSlots({ ...opts, final: true }, prog.length);
  const barLen = (TIME_SIGS[opts.timeSig] || 4) * 4;
  // Hand position (basic levels): a five-finger window with the little finger on the tonic; every
  // chord root and broken-chord note must fit inside it.
  let pos = null;
  if (opts.position && opts.position !== 'free' && hi - lo >= 4) {
    const cands = [];
    for (let d = lo; d + 4 <= hi; d++) if (deg(d) === 0) cands.push(d);
    const midW = Math.round((lo + hi) / 2) - 2;
    pos = cands.length ? cands.reduce((a, b) => (Math.abs(b - midW) < Math.abs(a - midW) ? b : a)) : lo;
  }
  // root of each chord in the lower part of the range, so the broken chord stays in range above it
  const rootFor = (chordDeg) => {
    if (pos != null) return pos + chordDeg; // inside the window (progressions here use degrees 0..4)
    let d = lo;
    while (deg(d) !== chordDeg) d++;
    if (d + 4 > hi && d - 7 >= lo) d -= 7;
    return d;
  };
  const ALBERTI = [0, 4, 2, 4]; // degree offsets: root, fifth, third, fifth
  const out = [];
  let k = 0; // position inside the bar (note index)
  let lastBar = -1;
  slots.forEach((s, i) => {
    if (s.bar !== lastBar) {
      k = 0;
      lastBar = s.bar;
    }
    const root = rootFor(i === slots.length - 1 ? 0 : prog[s.bar]);
    let d = root + (s.strong || i === slots.length - 1 ? 0 : ALBERTI[k % 4]);
    if (pos != null) {
      // stay in the window: fifth -> third -> root as the chord climbs
      if (d > pos + 4) d = root + 2;
      if (d > pos + 4) d = root;
    }
    if (d > hi) d -= 7;
    if (d < lo) d += 7;
    k++;
    const n = makeNote(d, fitAcc(d, accOf(d), opts.vis), DUR_CODE[s.u]);
    out.push(Object.assign(n, { units: s.u, bar: s.bar, start: s.bar * barLen + s.pos, clef: 'bass', pos }));
  });
  return out;
}

// Both hands at once (MIDI): melody in the right hand and accompaniment in the left over the same
// progression and bars. The left hand keeps to quarters and longer so the pair stays playable.
// Returns one list ordered by start time; notes sharing a start form a chord to be played together.
export function generateTwoHands(opts, prevD = null) {
  const prog = progFor(opts);
  const treble = generatePhrase({ ...opts, forceHand: 'treble' }, prevD, prog);
  const f = opts.figures || {};
  const lhFigures = { w: !!f.w, h: !!f.h, q: !!f.q || !(f.w || f.h), e: false, s: false };
  const bass = generateBassPhrase({ ...opts, figures: lhFigures, dotted: false, vis: null }, prog);
  return [...treble, ...bass].sort((a, b) => a.start - b.start || (a.clef === 'treble' ? -1 : 1));
}

// ---------- scale fingering (standard thumb crossings) ----------
// One octave, tonic to tonic, ascending. Descending uses the same finger per degree.
const RH_STD = [1, 2, 3, 1, 2, 3, 4, 5];
const LH_STD = [5, 4, 3, 2, 1, 3, 2, 1];
const SCALE_FINGERS = {
  RH: {
    F: [1, 2, 3, 4, 1, 2, 3, 4], Bb: [4, 1, 2, 3, 1, 2, 3, 4], Eb: [3, 1, 2, 3, 4, 1, 2, 3], Ab: [3, 4, 1, 2, 3, 1, 2, 3],
    Db: [2, 3, 1, 2, 3, 4, 1, 2], Gb: [2, 3, 4, 1, 2, 3, 1, 2], 'F#': [2, 3, 4, 1, 2, 3, 1, 2], 'C#': [2, 3, 1, 2, 3, 4, 1, 2],
    Fm: [1, 2, 3, 4, 1, 2, 3, 4], 'F#m': [3, 4, 1, 2, 3, 1, 2, 3], 'C#m': [3, 4, 1, 2, 3, 1, 2, 3], 'G#m': [3, 4, 1, 2, 3, 1, 2, 3],
    Ebm: [3, 1, 2, 3, 4, 1, 2, 3], 'D#m': [3, 1, 2, 3, 4, 1, 2, 3], Bbm: [2, 1, 2, 3, 1, 2, 3, 4], 'A#m': [2, 1, 2, 3, 1, 2, 3, 4],
  },
  LH: {
    B: [4, 3, 2, 1, 4, 3, 2, 1], Cb: [4, 3, 2, 1, 4, 3, 2, 1], Bb: [3, 2, 1, 4, 3, 2, 1, 3], Eb: [3, 2, 1, 4, 3, 2, 1, 3],
    Ab: [3, 2, 1, 4, 3, 2, 1, 3], Db: [3, 2, 1, 4, 3, 2, 1, 3], 'C#': [3, 2, 1, 4, 3, 2, 1, 3], Gb: [4, 3, 2, 1, 3, 2, 1, 4], 'F#': [4, 3, 2, 1, 3, 2, 1, 4],
    Bm: [4, 3, 2, 1, 4, 3, 2, 1], 'F#m': [4, 3, 2, 1, 3, 2, 1, 4], 'C#m': [3, 2, 1, 4, 3, 2, 1, 3], 'G#m': [3, 2, 1, 4, 3, 2, 1, 3],
    Ebm: [2, 1, 4, 3, 2, 1, 3, 2], 'D#m': [2, 1, 4, 3, 2, 1, 3, 2], Bbm: [2, 1, 4, 3, 2, 1, 3, 2], 'A#m': [2, 1, 4, 3, 2, 1, 3, 2],
  },
};
export function scaleFingering(key, hand) {
  const table = hand === 'bass' ? SCALE_FINGERS.LH : SCALE_FINGERS.RH;
  return table[key] || (hand === 'bass' ? LH_STD : RH_STD);
}

// Mark the thumb crossings: a thumb arriving from a non-adjacent finger (thumb under), or a 3rd/4th
// finger right after the thumb (crossing over) — the moments the hand actually moves.
function markCrossings(list) {
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1].finger;
    const b = list[i].finger;
    const step = Math.abs(list[i].d - list[i - 1].d);
    list[i].shift = step <= 2 && ((b === 1 && a >= 3) || (a === 1 && b >= 3));
  }
}

// ---------- fingering ----------
// Recommended fingers from a sliding five-finger window per hand: right hand thumb at the bottom of
// the window, left hand thumb at the top. Notes carrying `pos` (from a hand-position phrase) pin the
// window; otherwise the window moves only when a note falls outside it. The note where the window
// moves is flagged `shift` so the player can be warned to move the hand.
export function assignFingering(notes, prevWindows = {}) {
  const win = { ...prevWindows };
  const byClef = {};
  notes.forEach((n) => (byClef[n.clef || 'treble'] ||= []).push(n));
  for (const [clef, list] of Object.entries(byClef)) {
    const lh = clef === 'bass';
    list.forEach((n, i) => {
      if (n.finger != null) return; // scale fingering already decided
      let w = win[clef];
      let shift = false;
      if (n.pos != null) {
        shift = w != null && n.pos !== w;
        w = n.pos;
      } else if (w == null) {
        w = n.d; // first note at the bottom of the window: RH thumb, LH little finger (a bass root)
      } else if (n.d < w) {
        w = n.d;
        shift = true;
      } else if (n.d > w + 4) {
        w = n.d - 4;
        shift = true;
      }
      win[clef] = w;
      n.finger = lh ? 5 - (n.d - w) : n.d - w + 1;
      n.shift = shift && i > 0 ? true : shift && i === 0 && prevWindows[clef] != null;
    });
  }
  return win;
}

// ---------- scales ----------
// The seven notes of a key as { letter, acc, degree }, tonic first. Minor keys use the harmonic minor
// (raised 7th), which is what the melody generator plays.
export function scaleNotes(key) {
  const keyMap = keyAccidentals(key);
  const ki = keyInfo(key);
  const tonic = LETTERS.indexOf(ki.letter);
  return [0, 1, 2, 3, 4, 5, 6].map((deg) => {
    const letter = LETTERS[(tonic + deg) % 7];
    const base = keyMap[letter] || '';
    return { letter, acc: ki.minor && deg === 6 ? RAISE[base] : base, degree: deg };
  });
}

// Scale notes as real notes from the tonic at diatonic index d0 upwards for `count` steps
function scaleRun(key, d0, count) {
  const sc = scaleNotes(key);
  const tonic = LETTERS.indexOf(keyInfo(key).letter);
  const out = [];
  for (let i = 0; i < count; i++) {
    const d = d0 + i;
    out.push(makeNote(d, sc[((d - tonic) % 7 + 7) % 7].acc, 'q'));
  }
  return out;
}

// Warm-up: scale patterns in the current key filling whole bars with quarter notes.
// phase 0: up and down one octave; phase 1: the same in broken thirds. Ends on the tonic,
// which is lengthened to complete the last bar.
export function generateScaleBars(opts, phase = 0) {
  const hand = chooseHand(opts);
  const [lo, hi] = clampRange(rangeFor(hand, opts.level), opts.vis);
  const tonic = LETTERS.indexOf(keyInfo(opts.key).letter);
  // lowest tonic that leaves room for an octave above; otherwise the lowest tonic in range
  let d0 = lo;
  while (d0 % 7 !== tonic) d0++;
  if (d0 > hi) d0 = lo; // a zoomed keyboard may only show a fragment of the scale
  while (d0 + 7 <= hi - 7 && d0 + 7 < lo + 7) d0 += 7;
  const top = Math.min(hi, d0 + 7);
  const span = top - d0; // usually 7 (an octave)
  const run = scaleRun(opts.key, d0, span + 1);
  let seq;
  if (phase % 2 === 0 || span < 2) {
    seq = [...run, ...run.slice(0, -1).reverse()];
  } else {
    // broken thirds up: 1-3, 2-4, 3-5 … then down
    // 1-3 2-4 … 6-8, then 8-6 7-5 … 3-1 (the top note sounds twice, as in the classic exercise)
    const up = [];
    for (let i = 0; i + 2 <= span; i++) up.push(run[i], run[i + 2]);
    const down = [];
    for (let i = span; i - 2 >= 0; i--) down.push(run[i], run[i - 2]);
    seq = [...up, ...down];
  }
  const beats = TIME_SIGS[opts.timeSig] || 4;
  const barLen = beats * 4;
  const notes = seq.map((n) => makeNote(n.d, fitAcc(n.d, n.acc, opts.vis), 'q'));
  // lengthen the final tonic to close the bar
  const used = notes.length * 4;
  const pad = (barLen - (used % barLen)) % barLen;
  const last = notes[notes.length - 1];
  last.dur = DUR_CODE[4 + pad] || 'q';
  const fingers = scaleFingering(opts.key, hand);
  notes.forEach((n) => { n.finger = fingers[Math.min(7, Math.max(0, n.d - d0))]; });
  markCrossings(notes);
  let pos = 0;
  notes.forEach((n, i) => {
    n.units = i === notes.length - 1 ? 4 + pad : 4;
    n.start = pos;
    n.bar = Math.floor(pos / barLen);
    n.clef = hand;
    pos += n.units;
  });
  return notes;
}

export function generateRandomBars(opts, weightOf, bars = 2) {
  const [lo, hi] = clampRange(rangeFor(opts.clef, opts.level), opts.vis);
  const keyMap = keyAccidentals(opts.key);
  const pool = [];
  for (let d = lo; d <= hi; d++) pool.push(d);
  let prev = null;
  return rhythmSlots({ ...opts, final: false }, bars).map((s) => {
    const candidates = pool.filter((d) => d !== prev);
    const d = pickWeighted(candidates, candidates.map((c) => weightOf(makeNote(c, keyMap[LETTERS[c % 7]] || ''))));
    const acc = fitAcc(d, accidentalFor(LETTERS[d % 7], keyMap, opts.accidentals), opts.vis);
    prev = d;
    const n = makeNote(d, acc, DUR_CODE[s.u]);
    return Object.assign(n, { units: s.u, bar: s.bar, start: s.bar * (TIME_SIGS[opts.timeSig] || 4) * 4 + s.pos });
  });
}

// ---------- harmony-based melodies ----------
// Four-bar phrases, one chord per bar, always closing with a V–I cadence. Degrees: 0 = I … 6 = vii.
const PROGRESSIONS = [
  [0, 3, 4, 0], // I  IV V I
  [0, 1, 4, 0], // I  ii V I
  [0, 5, 4, 0], // I  vi V I
  [3, 0, 4, 0], // IV I  V I
];

/**
 * Melodic phrase following basic voice-leading rules:
 * chord tones on strong beats, passing/neighbour tones by step on weak beats, mostly stepwise motion,
 * leaps recovered by a step the other way, the leading tone resolving up, cadence on the tonic.
 * Minor keys use the harmonic minor (raised 7th) and melodic minor when rising 6→7.
 */
export function generatePhrase(opts, prevD = null, prog = progFor(opts)) {
  const hand = chooseHand(opts);
  // piano mode: the left hand reads accompaniment, not melodies
  if (opts.pianoMode && hand === 'bass') return generateBassPhrase(opts, prog);
  const barLen = (TIME_SIGS[opts.timeSig] || 4) * 4;
  let [lo, hi] = clampRange(rangeFor(hand, opts.level), opts.vis);
  const keyMap = keyAccidentals(opts.key);
  const ki = keyInfo(opts.key);
  const tonic = LETTERS.indexOf(ki.letter);
  // Hand position: a five-finger window (a fifth) the whole phrase stays inside.
  // 'five': thumb (RH) or little finger (LH) on the tonic. 'phrase': the window may move a step or
  // two between phrases, never inside one. 'free': no window.
  let pos = null;
  if (opts.position && opts.position !== 'free' && hi - lo >= 4) {
    const fits = (w) => w >= lo && w + 4 <= hi;
    const midW = Math.round((lo + hi) / 2) - 2;
    let w = null;
    const prevPos = opts.prevPos && opts.prevPos[hand];
    if (opts.position === 'phrase' && prevPos != null && fits(prevPos) && Math.random() < 0.5) w = prevPos;
    else if (opts.position === 'phrase' && prevPos != null) {
      const shifts = [-3, -2, -1, 1, 2, 3].map((s) => prevPos + s).filter(fits);
      w = shifts.length ? shifts[Math.floor(Math.random() * shifts.length)] : prevPos;
    }
    if (w == null || !fits(w)) {
      // tonic position closest to the middle of the range
      const cands = [];
      for (let d = lo; d + 4 <= hi; d++) if ((((d % 7) - tonic) % 7 + 7) % 7 === 0) cands.push(d);
      w = cands.length ? cands.reduce((a, b) => (Math.abs(b - midW) < Math.abs(a - midW) ? b : a)) : Math.max(lo, Math.min(hi - 4, midW));
    }
    pos = w;
    lo = w;
    hi = w + 4;
  }
  const deg = (d) => (((d % 7) - tonic) % 7 + 7) % 7;
  const accOf = (d) => {
    const base = keyMap[LETTERS[d % 7]] || '';
    return ki.minor && deg(d) === 6 ? RAISE[base] : base;
  };
  const midiOf = (d, acc = accOf(d)) => makeNote(d, acc).midi;
  const onKeys = (m) => !opts.vis || (m >= opts.vis.loMidi && m <= opts.vis.hiMidi);
  const slots = rhythmSlots({ ...opts, final: true }, prog.length);
  const mid = (lo + hi) / 2;
  const span = Math.max(4, hi - lo);
  const chordOf = (bar) => [0, 2, 4].map((x) => (prog[bar] + x) % 7);

  // start on a chord tone of the first chord, near where the previous phrase ended
  const anchor = prevD != null && prevD >= lo && prevD <= hi ? prevD : Math.round(mid);
  const starts = [];
  for (let d = lo; d <= hi; d++) if (chordOf(0).includes(deg(d)) && onKeys(midiOf(d))) starts.push(d);
  starts.sort((a, b) => Math.abs(a - anchor) - Math.abs(b - anchor));
  const ds = [starts[Math.floor(Math.random() * Math.min(2, starts.length))] ?? Math.round(mid)];

  const tonics = [];
  for (let d = lo; d <= hi; d++) if (deg(d) === 0 && onKeys(midiOf(d))) tonics.push(d);

  for (let i = 1; i < slots.length; i++) {
    const prev = ds[i - 1];
    const prev2 = i > 1 ? ds[i - 2] : null;
    if (i === slots.length - 1) {
      // final note: the tonic closest to where we are
      // final note: the tonic closest to where we are; inside a hand position without a tonic, the
      // nearest note of the tonic chord
      let ends = tonics;
      if (!ends.length) {
        ends = [];
        for (let d = lo; d <= hi; d++) if ([0, 2, 4].includes(deg(d)) && onKeys(midiOf(d))) ends.push(d);
      }
      ds.push(ends.length ? ends.reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a)) : prev);
      continue;
    }
    const slot = slots[i];
    const chord = chordOf(slot.bar);
    const penultimate = i === slots.length - 2;
    const cands = [];
    const ws = [];
    for (let d = Math.max(lo, prev - 5); d <= Math.min(hi, prev + 5); d++) {
      if (!onKeys(midiOf(d))) continue;
      const iv = Math.abs(d - prev);
      let w = [0.4, 6, 3, 1.3, 1, 0.5][iv];
      const chordTone = chord.includes(deg(d));
      if (slot.strong) w *= chordTone ? 3 : 0.08;
      else w *= chordTone ? 1.2 : iv === 1 ? 1.3 : 0.1; // non-chord tones only by step
      if (prev2 != null && Math.abs(prev - prev2) >= 3) {
        // after a leap, move back by step
        const back = Math.sign(d - prev) === -Math.sign(prev - prev2);
        w *= back && iv <= 2 ? 3 : 0.3;
      }
      if (deg(prev) === 6) w *= d === prev + 1 ? 5 : 0.3; // leading tone resolves up
      if (ki.minor && iv === 1 && deg(prev) === 6 && deg(d) === 5) w *= 0.2; // avoid the augmented 2nd downwards
      if (penultimate) w *= [1, 6].includes(deg(d)) && tonics.some((t) => Math.abs(t - d) === 1) ? 5 : 0.4;
      w *= Math.exp(-(((d - mid) / (span / 2)) ** 2)); // stay in the comfortable middle
      cands.push(d);
      ws.push(w);
    }
    ds.push(cands.length ? pickWeighted(cands, ws) : prev);
  }

  return ds.map((d, i) => {
    const s = slots[i];
    let acc = accOf(d);
    const next = ds[i + 1];
    // melodic minor: raise the 6th when it rises to the raised 7th
    if (ki.minor && deg(d) === 5 && next === d + 1) acc = RAISE[acc];
    // optional chromaticism on weak beats: chromatic leading tone into a strong note, or chromatic lower neighbour
    if (opts.accidentals && !s.strong && next != null && acc !== '#' && acc !== '##' && Math.random() < 0.4) {
      const toStrong = next === d + 1 && slots[i + 1].strong && midiOf(next) - midiOf(d, acc) === 2;
      const neighbour = i > 0 && ds[i - 1] === next && d === next - 1 && midiOf(next) - midiOf(d, acc) === 2;
      const raised = RAISE[acc];
      const letter = LETTERS[d % 7];
      const awkward = raised === '#' && (letter === 'e' || letter === 'b');
      if ((toStrong || neighbour) && !awkward && onKeys(midiOf(d, raised))) acc = raised;
    }
    const n = makeNote(d, fitAcc(d, acc, opts.vis), DUR_CODE[s.u]);
    return Object.assign(n, { units: s.u, bar: s.bar, start: s.bar * barLen + s.pos, clef: hand, pos });
  });
}

// Pitch-class comparison for note-name answers (enharmonics accepted)
export function samePitchClass(a, b) {
  return ((a % 12) + 12) % 12 === ((b % 12) + 12) % 12;
}
