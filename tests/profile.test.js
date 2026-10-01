import { test } from 'node:test';
import assert from 'node:assert/strict';
import { block, emptyData, beginSession, validateBackup } from '../src/companion/model.js';
import { practiceDefaults } from '../src/companion/practice-defaults.js';
import { generateTargetBars, TARGETS } from '../src/companion/curriculum.js';

test('profile defaults and two-hand reading survive backups without changing old notebooks', () => {
  const data = emptyData();
  assert.equal(practiceDefaults(data.preferences, 'reading').level, 0);
  data.preferences.practiceDefaults = { reading: { level: 2, bpm: 80, hand: 'both', figures: 'hqe' } };
  const b = block('reading', practiceDefaults(data.preferences, 'reading'));
  b.bpm = 65;
  data.active = beginSession({ title: 'Reading', context: 'piano', blocks: [b] });
  const serialize = () => JSON.stringify({ format: 'cuaderno-piano', version: 1, data, assets: [] });
  const restored = validateBackup(serialize());
  assert.equal(restored.data.active.blocks[0].hand, 'both');
  assert.equal(restored.data.active.blocks[0].level, 2);
  assert.equal(restored.data.preferences.practiceDefaults.reading.bpm, 80);
  data.preferences.practiceDefaults.reading.level = 3;
  assert.throws(() => validateBackup(serialize()));
});

test('two-hand reading stays in the scale, fills both staves and has separate registers', () => {
  for (const target of TARGETS) for (const level of [0, 1, 2]) {
    const notes = generateTargetBars({ clef: 'grand', level, timeSig: '4/4', figures: { q: true, h: true, e: true } }, target.id);
    for (const clef of ['treble', 'bass']) {
      const hand = notes.filter(n => n.clef === clef);
      assert.equal(hand.reduce((sum, n) => sum + n.units, 0), 32);
      assert.ok(hand.every(n => clef === 'treble' ? n.midi >= 60 : n.midi < 60));
      assert.ok(hand.every(n => target.notes.some(p => p.letter === n.letter && p.acc === n.acc)));
    }
    assert.ok(notes.every((n, i) => i === 0 || n.start >= notes[i - 1].start));
  }
});
