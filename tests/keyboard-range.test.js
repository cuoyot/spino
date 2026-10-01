import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KEYS, generateScaleBars, makeNote } from '../src/music.js';

test('warm-ups remain playable on a narrow, enlarged keyboard', () => {
  for (const key of Object.keys(KEYS)) {
    for (let lo = 24; lo < 38; lo++) {
      const vis = { lo, hi: lo + 2, loMidi: makeNote(lo, '').midi, hiMidi: makeNote(lo + 2, '').midi, exact: true };
      for (let phase = 0; phase < 2; phase++) {
        const notes = generateScaleBars({ clef: 'treble', key, level: 0, timeSig: '4/4', vis }, phase);
        assert.ok(notes.length > 0, `${key}, ${lo}, ${phase}`);
        assert.ok(notes.every((n) => n.midi >= vis.loMidi && n.midi <= vis.hiMidi));
      }
    }
  }
});
