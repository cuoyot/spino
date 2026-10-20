import test from 'node:test';
import assert from 'node:assert/strict';
import { HANON, warmupById, warmupCycle, generateWarmupBars, nextWarmupId, warmupBlockValues, WARMUP_IDS, warmupSetSize, nextWarmupSet, readWarmupChoice, warmupChoices, warmupExercises } from '../src/companion/warmups.js';
import { warmupGuideMarkup } from '../src/companion/warmup-guide.js';
import { emptyData, block, beginSession, validateData } from '../src/companion/model.js';
import { generateTargetBars, targetById } from '../src/companion/curriculum.js';

const name = d => 'CDEFGAB'[((d % 7) + 7) % 7] + Math.floor(d / 7);
const names = list => list.map(n => name(n.d)).join(' ');

test('Hanon No. 1 follows the published figure, fingering and turning point in both hands', () => {
  const { notes, length } = warmupCycle(warmupById('hanon-1'), { unit: 2 });
  const right = notes.filter(n => n.clef === 'treble'), left = notes.filter(n => n.clef === 'bass');
  assert.equal(names(right.slice(0, 16)), 'C4 E4 F4 G4 A4 G4 F4 E4 D4 F4 G4 A4 B4 A4 G4 F4');
  assert.equal(right.slice(0, 8).map(n => n.finger).join(''), '12345432');
  assert.equal(names(left.slice(0, 8)), 'C3 E3 F3 G3 A3 G3 F3 E3');
  assert.equal(left.slice(0, 8).map(n => n.finger).join(''), '54321234');
  // Seven bars up, then the mirrored figure from G5 (G4 in the left hand) back down to the final tonic.
  const down = right.slice(7 * 8, 7 * 8 + 8);
  assert.equal(names(down), 'G5 E5 D5 C5 B4 C5 D5 E5');
  assert.equal(down.map(n => n.finger).join(''), '54321234');
  assert.equal(names(left.slice(7 * 8, 7 * 8 + 8)), 'G4 E4 D4 C4 B3 C4 D4 E4');
  assert.equal(name(right.at(-1).d), 'C4'); assert.equal(right.at(-1).units, 16);
  assert.equal(length, 14 * 16 + 16);
  // Every exercise ends on the tonic an octave below its turning figure, within a comfortable range.
  for (const exercise of HANON) {
    const { notes } = warmupCycle(exercise, { unit: 2, hands: ['treble'] });
    assert.ok(notes.every(n => n.d >= 28 && n.d <= 28 + exercise.top + 7 && n.finger >= 1 && n.finger <= 5), exercise.id);
    assert.equal(notes.length, 14 * 8 + 1);
  }
});

test('warm-up bars stream continuously through the reader chunk interface', () => {
  const opts = { clef: 'grand', timeSig: '4/4', rhythm: '2' };
  const all = [];
  for (let phase = 0; phase < 16; phase += 2) {
    const chunk = generateTargetBars(opts, 'hanon-1', false, phase);
    assert.ok(chunk.every(n => n.start >= 0 && n.start < 32 && [0, 1].includes(n.bar) && ['treble', 'bass'].includes(n.clef) && n.finger >= 1));
    all.push(...chunk.map(n => ({ ...n, absBar: phase + n.bar })));
  }
  // Eighth notes: one 8-note figure per bar; bar 14 holds the final whole note and bar 15 starts the next cycle.
  const treble = all.filter(n => n.clef === 'treble');
  assert.equal(treble.filter(n => n.absBar === 0).length, 8);
  assert.equal(treble.filter(n => n.absBar === 14).length, 1);
  assert.equal(name(treble.find(n => n.absBar === 15).d), 'C4');
  assert.equal(treble.filter(n => n.absBar === 7).length, 8);
  assert.equal(name(treble.find(n => n.absBar === 7).d), 'G5');
  // Level 1 reads the figure in quarter notes, so a figure spans two bars.
  const quarters = generateTargetBars({ clef: 'treble', timeSig: '4/4', rhythm: '1' }, 'hanon-2', false, 0);
  assert.equal(quarters.length, 8); assert.ok(quarters.every(n => n.dur === 'q'));
  assert.equal(targetById('hanon-3').label, 'Hanon No. 3');
});

test('warm-up blocks and preferences validate, rotate and stay out of phone sessions', () => {
  const data = emptyData();
  assert.equal(nextWarmupId(data), 'hanon-1');
  data.sessions.push({ id: 's1', results: [{ block: { type: 'warmup' } }] }, { id: 's2', results: [{ block: { type: 'reading' } }] });
  assert.equal(nextWarmupId(data), 'hanon-2');
  data.preferences.warmup = { enabled: true, minutes: 5, exercise: 'hanon-4' };
  assert.equal(nextWarmupId(data), 'hanon-4');
  assert.equal(warmupBlockValues(data).minutes, 5);
  const notebook = { ...emptyData(), routines: [{ id: 'r', title: 'Routine', context: 'piano', blocks: [block('warmup', warmupBlockValues(emptyData()))] }] };
  assert.equal(validateData(notebook).routines[0].blocks[0].target, 'hanon-1');
  assert.throws(() => validateData({ ...notebook, routines: [{ ...notebook.routines[0], blocks: [block('warmup', { target: 'C-major', hand: 'both' })] }] }));
  assert.throws(() => validateData({ ...notebook, routines: [{ ...notebook.routines[0], blocks: [block('reading', { target: 'hanon-1' })] }] }));
  assert.throws(() => validateData({ ...emptyData(), preferences: { ...emptyData().preferences, warmup: { enabled: true, minutes: 0, exercise: 'rotate' } } }));
  assert.throws(() => beginSession({ title: 'Phone', context: 'mobile', blocks: [block('warmup', warmupBlockValues(emptyData()))] }));
  assert.ok(WARMUP_IDS.every(id => warmupById(id)));
});

test('Hanon Nos. 6-10 follow the Mutopia edition', () => {
  assert.deepEqual(WARMUP_IDS, Array.from({ length: 10 }, (_, i) => `hanon-${i + 1}`));
  const right = id => warmupCycle(warmupById(id), { unit: 2, hands: ['treble'] }).notes;
  // No. 6: the fifth finger returns between the others, then the mirrored figure descends from G5 around the thumb.
  assert.equal(names(right('hanon-6').slice(0, 8)), 'C4 A4 G4 A4 F4 A4 E4 A4');
  assert.equal(right('hanon-6').slice(0, 8).map(n => n.finger).join(''), '15453525');
  assert.equal(names(right('hanon-6').slice(56, 64)), 'G5 B4 C5 B4 D5 B4 E5 B4');
  assert.equal(right('hanon-6').slice(56, 64).map(n => n.finger).join(''), '51213141');
  assert.equal(names(right('hanon-7').slice(0, 8)), 'C4 E4 D4 F4 E4 G4 F4 E4');
  assert.equal(right('hanon-7').slice(56, 64).map(n => n.finger).join(''), '53423134');
  assert.equal(names(right('hanon-8').slice(0, 8)), 'C4 E4 G4 A4 F4 G4 E4 F4');
  assert.equal(names(right('hanon-9').slice(0, 8)), 'C4 E4 F4 E4 G4 F4 A4 G4');
  assert.equal(names(right('hanon-10').slice(0, 8)), 'C4 A4 G4 F4 E4 F4 E4 F4');
  const left = warmupCycle(warmupById('hanon-10'), { unit: 2, hands: ['bass'] }).notes;
  assert.equal(left.slice(0, 8).map(n => n.finger).join(''), '51234343');
});

test('warm-ups are sets of exercises that rotate by one and fit the minutes', () => {
  // One pass is about two minutes in quarter notes and one minute in eighths at 60 BPM.
  assert.equal(warmupSetSize({ minutes: 3, figures: '1' }), 2);
  assert.equal(warmupSetSize({ minutes: 3, figures: '2' }), 3);
  assert.equal(warmupSetSize({ minutes: 1, figures: '2' }), 2);
  assert.equal(warmupSetSize({ minutes: 30, figures: '4' }), 5);
  const data = emptyData(); data.preferences.level = 2;
  assert.deepEqual(warmupBlockValues(data).exercises, ['hanon-1', 'hanon-2', 'hanon-3']);
  data.sessions.push({ id: 's1', results: [{ block: { type: 'warmup' } }] });
  assert.deepEqual(warmupBlockValues(data).exercises, ['hanon-2', 'hanon-3', 'hanon-4']);
  for (let i = 0; i < 8; i++) data.sessions.push({ id: `w${i}`, results: [{ block: { type: 'warmup' } }] });
  assert.deepEqual(nextWarmupSet(data, 3), ['hanon-10', 'hanon-1', 'hanon-2']);
  // A fixed exercise in the preferences plays alone; the block editor can still pick a set or one exercise.
  data.preferences.warmup = { enabled: true, minutes: 3, exercise: 'hanon-7' };
  assert.deepEqual(warmupBlockValues(data).exercises, ['hanon-7']);
  assert.match(warmupChoices(data)[0][0], /^set:hanon-10,hanon-1,hanon-2$/);
  assert.deepEqual(readWarmupChoice('set:hanon-3,hanon-4'), { target: 'hanon-3', exercises: ['hanon-3', 'hanon-4'] });
  assert.deepEqual(readWarmupChoice('hanon-9'), { target: 'hanon-9', exercises: ['hanon-9'] });
  assert.throws(() => readWarmupChoice('set:hanon-3,C-major'));
  assert.deepEqual(warmupExercises({ target: 'hanon-2' }).map(e => e.id), ['hanon-2']);
  // Old single-exercise blocks stay valid; sets are validated.
  const routine = blocks => ({ ...emptyData(), routines: [{ id: 'r', title: 'R', context: 'piano', blocks }] });
  assert.ok(validateData(routine([block('warmup', warmupBlockValues(emptyData()))])));
  assert.ok(validateData(routine([block('warmup', { target: 'hanon-1', hand: 'both' })])));
  assert.throws(() => validateData(routine([block('warmup', { target: 'hanon-1', hand: 'both', exercises: [] })])));
  assert.throws(() => validateData(routine([block('warmup', { target: 'hanon-1', hand: 'both', exercises: ['hanon-1', 'x'] })])));
  assert.throws(() => validateData(routine([block('reading', { exercises: ['hanon-1'] })])));
});

test('a warm-up set streams each exercise once, then starts again', () => {
  const opts = { clef: 'treble', timeSig: '4/4', rhythm: '2', warmupSet: ['hanon-3', 'hanon-4'] };
  const bars = phase => generateTargetBars(opts, 'hanon-3', false, phase);
  // Each pass is 15 bars: 14 figures and the final C. Bar 15 starts No. 4, bar 30 starts No. 3 again.
  assert.ok(bars(0).every(n => n.exercise === 0));
  const turn = bars(14);
  assert.equal(turn.filter(n => n.bar === 0).length, 1);
  assert.ok(turn.filter(n => n.bar === 1).every(n => n.exercise === 1));
  assert.equal(names(turn.filter(n => n.bar === 1)), 'C4 D4 C4 E4 A4 G4 F4 E4');
  assert.ok(bars(30).every(n => n.exercise === 0));
});

test('the guide offers the approved animation and explains independent finger preparation', () => {
  const both = warmupGuideMarkup(warmupById('hanon-1'), { hand: 'both', start: true });
  assert.match(both, /data-hanon-animation/);
  assert.match(both, /posters\/hanon-1-both.webp/);
  assert.match(both, /data-ha-play disabled/);
  assert.match(both, /data-warmup-start/);
  assert.match(both, /Right hand/); assert.match(both, /Left hand/);
  assert.match(both, /playing finger stays on its key/);
  for (const hand of ['left', 'right']) {
    const single = warmupGuideMarkup(warmupById('hanon-7'), { hand });
    assert.match(single, new RegExp(`posters/hanon-7-${hand}.webp`));
    assert.equal((single.match(/class="wg-figure"/g) || []).length, 1);
  }
});
