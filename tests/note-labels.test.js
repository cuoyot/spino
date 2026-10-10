import test from 'node:test';
import assert from 'node:assert/strict';
import { pitchName, noteLabel, labelFromId, noteId, makeNote, setNaming } from '../src/music.js';

test('standalone labels prefer Bb, Eb and Ab without changing pitch or IDs', () => {
  setNaming('solfege');
  for (const [letter, d, expected] of [['a', 33, 'Si♭'], ['d', 29, 'Mi♭'], ['g', 32, 'La♭']]) {
    const note = makeNote(d, '#');
    assert.equal(pitchName(letter, '#'), expected);
    assert.equal(noteLabel(note), expected + '4');
    assert.equal(labelFromId(noteId(note)), expected + '4');
    assert.equal(note.acc, '#');
    assert.equal(noteId(note), letter + '#4');
  }
  assert.equal(pitchName('c', '#'), 'Do♯');
  assert.equal(pitchName('f', '#'), 'Fa♯');
  assert.equal(pitchName('g', '#', false), 'Sol♯');
  setNaming('english');
  assert.equal(pitchName('a', '#'), 'B♭');
  assert.equal(pitchName('d', '#'), 'E♭');
  assert.equal(pitchName('g', '#'), 'A♭');
  setNaming('german');
  assert.equal(pitchName('a', '#'), 'B');
  setNaming('english');
});
