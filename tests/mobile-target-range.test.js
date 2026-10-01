import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TARGETS, generateTargetBars } from '../src/companion/curriculum.js';
import { makeNote, rangeFor } from '../src/music.js';

test('mobile reading and technique honor a manually selected narrow keyboard throughout the piano', () => {
  // Three white keys are the smallest keyboard window offered by the pinch control.
  for (let lo = 5; lo <= 54; lo++) {
    const hi = lo + 2;
    const vis = { lo, hi, loMidi: makeNote(lo, '').midi, hiMidi: makeNote(hi, '').midi, exact: true };
    for (const clef of ['treble', 'bass']) for (const target of TARGETS) for (const technique of [false, true]) {
      const notes = generateTargetBars({ clef, level: 0, timeSig: '4/4', figures: { q: true, h: true, e: true }, vis }, target.id, technique, 2);
      const context = `${target.id}, ${clef}, ${technique ? 'technique' : 'reading'}, ${lo}–${hi}`;
      assert.ok(notes.length > 0, context);
      assert.equal(notes.reduce((sum, note) => sum + note.units, 0), 32, context);
      for (const note of notes) {
        assert.ok(note.midi >= vis.loMidi && note.midi <= vis.hiMidi, `${context}: MIDI ${note.midi} is not playable`);
        assert.ok(note.d >= lo && note.d <= hi, `${context}: the generator reverted to the difficulty range`);
        assert.ok(target.notes.some(pitch => pitch.letter === note.letter && pitch.acc === note.acc), `${context}: an accidental changed to fit the keyboard`);
        assert.equal(note.clef, clef, context);
      }
    }
  }
});

test('generation without a screen keyboard retains the selected hand and difficulty range', () => {
  for (const clef of ['treble', 'bass']) for (const level of [0, 1, 2]) for (const technique of [false, true]) {
    const [lo, hi] = rangeFor(clef, level);
    for (const target of TARGETS) {
      const notes = generateTargetBars({ clef, level, timeSig: '4/4', figures: { q: true, h: true, e: true }, vis: null }, target.id, technique, 4);
      for (const note of notes) {
        assert.ok(note.d >= lo && note.d <= hi, `${target.id}: ${clef} level ${level}`);
        assert.equal(note.clef, clef);
      }
    }
  }
});
