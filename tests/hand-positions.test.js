import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTargetBars, TARGETS, bassSection, BASS_PATTERNS, SECTION_BARS } from '../src/companion/curriculum.js';
import { assignFingering } from '../src/music.js';

const figures = { w: true, h: true, q: true, e: true };
// Generate chunks the way the reader does, recording each note's absolute bar.
function stream(opts, target, technique, bars = 48) {
  let win = {}; const notes = [];
  for (let phase = 0; phase < bars; phase += 2) {
    const chunk = generateTargetBars({ timeSig: '4/4', figures, level: 1, vis: null, ...opts }, target, technique, phase);
    win = assignFingering(chunk, win);
    notes.push(...chunk.map(n => Object.assign(n, { absBar: phase + n.bar })));
  }
  return notes;
}
const longestRun = list => list.reduce((r, n) => n.shift ? { run: r.run + 1, max: Math.max(r.max, r.run + 1) } : { run: 0, max: r.max }, { run: 0, max: 0 }).max;

test('sight-reading keeps one hand position and moves only at phrase starts', () => {
  for (const target of ['C-major', 'Eb-major', 'A-harmonic', 'F#-major']) for (const clef of ['treble', 'bass']) {
    const notes = stream({ clef }, target, false);
    const shifts = notes.filter(n => n.shift);
    assert.ok(shifts.length <= 8, `${target} ${clef}: ${shifts.length} position changes in 48 bars`);
    assert.ok(shifts.every(n => n.start === 0 && n.absBar % 4 === 0), 'positions change on a new phrase');
    assert.equal(longestRun(notes), 1);
    assert.ok(notes.every(n => n.finger >= 1 && n.finger <= 5));
    // Stretches reach one step outside the position and return immediately.
    notes.forEach((n, i) => {
      if (n.d >= n.pos && n.d <= n.pos + 4) return;
      assert.ok(n.d === n.pos - 1 || n.d === n.pos + 5, 'a stretch is one step');
      const next = notes[i + 1];
      assert.ok(!next || next.d >= next.pos && next.d <= next.pos + 4, 'never two stretches in a row');
    });
  }
});

test('scales use standard fingering without consecutive thumb crossings', () => {
  for (const target of TARGETS) for (const clef of ['treble', 'bass', 'grand']) {
    const notes = stream({ clef }, target.id, true, 16);
    for (const hand of ['treble', 'bass']) {
      const list = notes.filter(n => n.clef === hand);
      if (!list.length) continue;
      assert.ok(longestRun(list) <= 1, `${target.id} ${clef}/${hand}`);
      assert.ok(list.every(n => n.finger >= 1 && n.finger <= 5));
    }
  }
});

test('two-hand reading holds one bass pattern per section of a small form', () => {
  for (const target of ['C-major', 'A-harmonic']) {
    const bass = stream({ clef: 'grand' }, target, false, 64).filter(n => n.clef === 'bass');
    assert.ok(bass.every(n => BASS_PATTERNS.includes(n.pattern)));
    for (let section = 0; section < 64 / SECTION_BARS; section++) {
      const patterns = new Set(bass.filter(n => Math.floor(n.absBar / SECTION_BARS) === section).map(n => n.pattern));
      assert.equal(patterns.size, 1, `${target} section ${section}`);
    }
    assert.equal(bass.filter(n => n.shift).length, 0, 'the left hand stays in position');
  }
  const forms = new Set();
  for (let bar = 0; bar < 400; bar++) forms.add(bassSection(bar, 7).form);
  assert.ok(forms.size >= 2);
  // Repeated A sections share their pattern within a piece.
  for (let seed = 1; seed < 40; seed++) {
    const form = bassSection(0, seed).form, sections = Array.from(form, (_, i) => bassSection(i * SECTION_BARS, seed));
    const a = sections.filter(s => s.label === 'A').map(s => s.pattern), b = sections.filter(s => s.label === 'B').map(s => s.pattern);
    assert.equal(new Set(a).size, 1);
    assert.notEqual(a[0], b[0]);
  }
});

test('rhythm levels mean different values for each hand', async () => {
  const { handRhythm, rhythmLevel } = await import('../src/companion/rhythm-levels.js');
  assert.equal(rhythmLevel('q'), '1'); assert.equal(rhythmLevel('hqe'), '3'); assert.equal(rhythmLevel('4'), '4'); assert.equal(rhythmLevel('bogus'), '1');
  const values = (level, clef) => new Set(stream({ clef, rhythm: level }, 'C-major', false, 32).filter(n => n.clef === (clef === 'grand' ? 'bass' : clef)).map(n => n.units));
  // Level 1: the right hand reads quarters while the two-hand bass holds whole notes.
  assert.deepEqual([...values('1', 'treble')], [4]);
  assert.deepEqual([...values('1', 'grand')], [16]);
  // Higher levels bring shorter bass values: halves, then quarter arpeggios, then Alberti eighths.
  assert.ok([...values('2', 'grand')].every(u => u >= 8));
  assert.ok([...values('3', 'grand')].every(u => u >= 4));
  const advanced = stream({ clef: 'grand', rhythm: '4' }, 'C-major', false, 64).filter(n => n.clef === 'bass');
  assert.ok(advanced.every(n => ['arpeggio', 'alberti'].includes(n.pattern)));
  assert.ok(advanced.some(n => n.pattern === 'alberti' && n.units === 2));
});

test('two-hand melodies land on chord tones of the bass on strong beats', async () => {
  const { CHORD_DEGREES } = await import('../src/companion/curriculum.js');
  for (const target of TARGETS.filter(t => ['C-major', 'Eb-major', 'A-harmonic', 'B-natural'].includes(t.id))) for (const rhythm of ['1', '3']) {
    const notes = stream({ clef: 'grand', rhythm }, target.id, false, 48);
    const root = 'cdefgab'.indexOf(target.tonic[0].toLowerCase());
    const chords = new Map(notes.filter(n => n.clef === 'bass').map(n => [n.absBar, n.chord]));
    const strong = notes.filter(n => n.clef === 'treble' && (n.start % 16 === 0 || n.start % 16 === 8));
    assert.ok(strong.length > 20);
    for (const n of strong) assert.ok(CHORD_DEGREES[chords.get(n.absBar)].includes(((n.d - root) % 7 + 7) % 7), `${target.id} bar ${n.absBar}`);
  }
});
