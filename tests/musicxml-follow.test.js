import test from 'node:test';
import assert from 'node:assert/strict';
import { createFollower, expectedKeys, noteMidi, staffHand } from '../src/companion/musicxml-follow.js';

// Minimal stand-ins for OSMD notes and cursor: halfTone 48 is middle C.
const piano = { Staves: [] };
const upper = { ParentInstrument: piano }, lower = { ParentInstrument: piano };
piano.Staves.push(upper, lower);
const note = (midi, staff = upper, extra = {}) => ({ halfTone: midi - 12, ParentStaff: staff, isRest: () => false, ...extra });
const rest = (staff = upper) => ({ halfTone: 0, ParentStaff: staff, isRest: () => true });
function cursorOver(steps) {
  let index = 0;
  return { Iterator: { get EndReached() { return index >= steps.length; } }, NotesUnderCursor: () => steps[index] || [], next() { index++; }, reset() { index = 0; }, get index() { return index; } };
}

test('expected keys skip rests, grace notes, tied continuations and the other hand', () => {
  assert.equal(noteMidi({ halfTone: 48 }), 60);
  const start = note(64), tie = { StartNote: start };
  start.NoteTie = tie;
  const continued = note(64, upper, { NoteTie: tie });
  const notes = [note(60), start, continued, rest(), note(67, upper, { ParentVoiceEntry: { IsGrace: true } }), note(48, lower)];
  assert.deepEqual([...expectedKeys(notes)], [60, 64, 48]);
  assert.deepEqual([...expectedKeys(notes, 'right')], [60, 64]);
  assert.deepEqual([...expectedKeys(notes, 'left')], [48]);
  assert.deepEqual([...expectedKeys([continued])], []);
  assert.equal(staffHand(note(60, { ParentInstrument: { Staves: [{}] } })), 'both');
  assert.equal(staffHand(note(48, lower)), 'left');
});

test('the cursor waits for every key of a chord, counts wrong keys and skips rests', () => {
  const steps = [[note(60), note(48, lower)], [rest(), rest(lower)], [note(62)], [note(64), note(52, lower)]];
  const cursor = cursorOver(steps), moves = [];
  const follow = createFollower(cursor, { onMove: state => moves.push(cursor.index) });
  assert.deepEqual(follow.start().pending.sort(), [48, 60]);
  follow.press(60);
  assert.equal(cursor.index, 0, 'half a chord does not move the cursor');
  follow.press(61);
  follow.press(60);
  assert.equal(follow.state.wrong, 1, 'repeating an already played key is not an error');
  follow.press(48);
  assert.equal(cursor.index, 2, 'the rest is skipped');
  follow.press(62);
  follow.press(64); follow.press(52);
  assert.deepEqual(follow.state, { correct: 5, wrong: 1, finished: true, pending: [], hands: 'both' });
  assert.deepEqual(moves, [0, 2, 3, 4]);
  follow.press(70);
  assert.equal(follow.state.wrong, 1, 'nothing is counted after the end');
  follow.restart();
  assert.equal(cursor.index, 0);
});

test('following one hand ignores the other and resumes from the session totals', () => {
  const cursor = cursorOver([[note(48, lower)], [note(60), note(50, lower)], [note(62)]]);
  const follow = createFollower(cursor, { hands: 'right', correct: 10, wrong: 2 });
  follow.start();
  assert.equal(cursor.index, 1, 'a left-hand-only step is skipped');
  follow.press(60);
  assert.equal(cursor.index, 2);
  assert.deepEqual([follow.state.correct, follow.state.wrong], [11, 2]);
  follow.setHands('left');
  assert.equal(follow.state.finished, true);
});
