import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beginSession, block, emptyData, finishBlock, saveSession, validateBackup, validateData } from '../src/companion/model.js';
import { editSession, restoreCurrentRuntime, settleSuspendedBlocks } from '../src/companion/session-edit.js';
import { readSessionBlockEditor } from '../src/companion/session-block-editor.js';

const now = Date.parse('2026-10-01T10:00:00.000Z');
const measurement = { source: 'screen', correct: 7, wrong: 2, timing: 'wait', bpm: null };
const snapshot = {
  line: {
    notes: [{ d: 28, midi: 60, letter: 'c', acc: '', dur: 'q', bar: 0, start: 0, units: 4, clef: 'treble' }],
    onsets: [0], states: ['current'], key: 'C', idx: 0, beats: 4, bars: 1, waitBars: 2,
  }, beat: 0, settings: { timing: 'wait', kbLo: 25 },
};
const session = (context = 'mobile', count = 3) => beginSession({
  title: 'Adapt this practice', context, planId: 'source-plan',
  blocks: Array.from({ length: count }, (_, i) => block(i % 2 ? 'technique' : 'reading', { id: `block-${i}`, minutes: 10 })),
}, now);
function progressed(context = 'mobile') {
  const active = session(context);
  active.elapsedMs = active.blockElapsedMs = 120000;
  active.currentMeasurement = structuredClone(measurement);
  active.readerSnapshot = structuredClone(snapshot);
  active.notes = 'Keep this observation';
  return active;
}
const restoredBackup = active => validateBackup(JSON.stringify({ format: 'cuaderno-piano', version: 1, data: { ...emptyData(), active }, assets: [] })).data.active;

test('saving unchanged editor defaults does not reset an exercise or rewrite a free block target', () => {
  for (const type of ['reading', 'free']) {
    const original = block(type), data = emptyData(); data.active = session('piano');
    const form = new FormData();
    for (const [key,value] of Object.entries({ ...original, level: 0, presentation: 'auto' })) form.set(key,String(value));
    assert.deepEqual(readSessionBlockEditor(form, original, data), {});
  }
});

test('editing musical settings preserves performed material under the original settings and stable block ID', () => {
  const active = progressed(), original = structuredClone(active);
  const edited = editSession(active, { type: 'update', blockId: 'block-0', values: { target: 'G-major', hand: 'left', minutes: 20 } }, { now }).active;
  assert.equal(edited.blocks[0].id, active.blocks[0].id);
  assert.equal(edited.blocks[0].target, 'G-major');
  assert.equal(edited.blockElapsedMs, 0);
  assert.equal(edited.elapsedMs, 120000);
  assert.equal(edited.readerSnapshot, undefined);
  assert.equal(edited.currentMeasurement, undefined);
  assert.equal(edited.results[0].block.target, 'C-major');
  assert.deepEqual(edited.results[0].measurement, measurement);
  assert.deepEqual(edited.results[0].material.notes, snapshot.line.notes);
  assert.deepEqual(active, original);
  assert.equal(restoredBackup(edited).results[0].elapsedMs, 120000);
  const unchanged = editSession(active, { type: 'update', blockId: 'block-0', values: { target: 'C-major', minutes: 20 } }, { now }).active;
  assert.deepEqual(unchanged.readerSnapshot, snapshot);
  assert.equal(unchanged.results.length, 0);
  assert.equal(unchanged.blockElapsedMs, 120000);
});

test('editing a postponed block archives only its performed work; invalid changes are atomic', () => {
  const active = editSession(progressed(), { type: 'move', blockId: 'block-0', toIndex: 2 }, { now }).active;
  const edited = editSession(active, { type: 'update', blockId: 'block-0', values: { bpm: 80 } }, { now }).active;
  assert.equal(edited.blockRuntime, undefined);
  assert.equal(edited.results[0].block.bpm, 60);
  assert.equal(edited.blocks[2].bpm, 80);
  assert.equal(edited.blocks[0].id, active.blocks[0].id);
  assert.equal(edited.elapsedMs, active.elapsedMs);
  for (const values of [{ id: 'replacement' }, { bpm: 900 }, { minutes: 0 }, { type: 'free' }, { type: 'theory' }]) {
    assert.throws(() => editSession(active, { type: 'update', blockId: 'block-0', values }, { now }));
  }
  assert.deepEqual(active.blockRuntime[0].readerSnapshot, snapshot);
  const completed = session(); finishBlock(completed, null, now);
  assert.throws(() => editSession(completed, { type: 'update', blockId: 'block-0', values: { bpm: 80 } }, { now }), /Completed/);
});

test('changing minutes pauses accrued time without restarting the current exercise or changing its source', () => {
  const active = progressed(); active.runningSince = now;
  const original = structuredClone(active);
  const { active: edited, currentChanged } = editSession(active, { type: 'minutes', blockId: 'block-0', minutes: 1 }, { now: now + 15000 });
  assert.equal(currentChanged, false);
  assert.equal(edited.runningSince, null);
  assert.equal(edited.elapsedMs, 135000);
  assert.equal(edited.blockElapsedMs, 135000, 'A shorter suggestion cannot discard already elapsed time or advance the block');
  assert.equal(edited.blocks[0].minutes, 1);
  assert.equal(edited.blockIndex, 0);
  assert.equal(edited.planId, 'source-plan');
  assert.equal(edited.id, active.id);
  assert.equal(edited.notes, active.notes);
  assert.deepEqual(edited.readerSnapshot, snapshot);
  assert.deepEqual(edited.currentMeasurement, measurement);
  assert.deepEqual(active, original, 'The caller can persist before replacing its active notebook');
});

test('postponing a progressed block restores its independent time, answers and score when it becomes current again', () => {
  let active = progressed();
  const moved = editSession(active, { type: 'move', blockId: 'block-0', toIndex: 2 }, { now });
  active = moved.active;
  assert.equal(moved.currentChanged, true);
  assert.deepEqual(active.blocks.map(b => b.id), ['block-1', 'block-2', 'block-0']);
  assert.equal(active.blockElapsedMs, 0);
  assert.equal(active.currentMeasurement, undefined);
  assert.equal(active.readerSnapshot, undefined);
  assert.equal(active.elapsedMs, 120000);
  assert.deepEqual(active.blockRuntime, [{ blockId: 'block-0', context: 'mobile', elapsedMs: 120000, measurement, readerSnapshot: snapshot }]);
  active.runningSince = now;
  active = editSession(active, { type: 'move', blockId: 'block-0', toIndex: 0 }, {
    now: now + 30000, measurement: { source: 'screen', correct: 3, wrong: 0 }, readerSnapshot: null,
  }).active;
  assert.equal(active.elapsedMs, 150000);
  assert.equal(active.blockElapsedMs, 120000);
  assert.deepEqual(active.readerSnapshot, snapshot);
  assert.deepEqual(active.currentMeasurement, measurement);
  assert.equal(active.blockRuntime[0].blockId, 'block-1');
  assert.equal(active.blockRuntime[0].elapsedMs, 30000);
  finishBlock(active, active.currentMeasurement, now + 30000);
  active = restoreCurrentRuntime(active);
  assert.equal(active.blocks[active.blockIndex].id, 'block-1');
  assert.equal(active.blockElapsedMs, 30000);
  assert.deepEqual(active.currentMeasurement, { source: 'screen', correct: 3, wrong: 0 });
  assert.equal(active.readerSnapshot, undefined, 'The preceding block snapshot must not leak into the next block');
  assert.equal(active.blockRuntime, undefined);
  assert.deepEqual(active.results[0].measurement, measurement);
  assert.deepEqual(active.results[0].material.notes, snapshot.line.notes);
});

test('upcoming order and duration changes keep the current block and its result history intact', () => {
  const active = progressed();
  const moved = editSession(active, { type: 'move', blockId: 'block-2', toIndex: 1 }, { now });
  assert.equal(moved.currentChanged, false);
  assert.equal(moved.active.blocks[0].id, active.blocks[0].id);
  assert.deepEqual(moved.active.readerSnapshot, snapshot);
  assert.deepEqual(moved.active.currentMeasurement, measurement);
  assert.equal(moved.active.blockElapsedMs, active.blockElapsedMs);
  assert.deepEqual(moved.active.results, active.results);
  assert.equal(moved.active.blockRuntime, undefined);
  const edited = editSession(moved.active, { type: 'minutes', blockId: 'block-2', minutes: 20 }, { now }).active;
  assert.equal(edited.blockElapsedMs, 120000);
  assert.deepEqual(edited.readerSnapshot, snapshot);
});

test('removing current or postponed blocks retains performed work in results and leaves total time unchanged', () => {
  const original = progressed();
  const removed = editSession(original, { type: 'remove', blockId: 'block-0' }, { now });
  assert.equal(removed.currentChanged, true);
  assert.equal(removed.active.elapsedMs, 120000);
  assert.equal(removed.active.blockElapsedMs, 0);
  assert.equal(removed.active.blocks[0].id, 'block-1');
  assert.equal(removed.active.results[0].removed, true);
  assert.equal(removed.active.results[0].block.id, 'block-0');
  assert.equal(removed.active.results[0].elapsedMs, 120000);
  assert.deepEqual(removed.active.results[0].measurement, measurement);
  assert.deepEqual(removed.active.results[0].material.notes, snapshot.line.notes);
  const postponed = editSession(original, { type: 'move', blockId: 'block-0', toIndex: 2 }, { now }).active;
  const removedLater = editSession(postponed, { type: 'remove', blockId: 'block-0' }, { now });
  assert.equal(removedLater.currentChanged, false);
  assert.deepEqual(removedLater.removedResult, removed.removedResult);
  assert.equal(removedLater.active.blockRuntime, undefined);
  assert.equal(removedLater.active.elapsedMs, 120000);
  const unplayed = editSession(session(), { type: 'remove', blockId: 'block-1' }, { now }).active;
  assert.deepEqual(unplayed.results, [], 'Removing an unplayed suggestion does not fabricate practice');
});

test('completed blocks stay fixed and the last remaining block cannot be removed', () => {
  const active = session();
  finishBlock(active, null, now);
  const original = structuredClone(active);
  for (const action of [
    { type: 'minutes', blockId: 'block-0', minutes: 15 },
    { type: 'move', blockId: 'block-0', toIndex: 1 },
    { type: 'remove', blockId: 'block-0' },
    { type: 'move', blockId: 'block-2', toIndex: 0 },
    { type: 'add', block: block('reading'), toIndex: 0 },
  ]) assert.throws(() => editSession(active, action, { now }), /Completed|remaining/);
  assert.deepEqual(active, original);
  const edited = editSession(active, { type: 'remove', blockId: 'block-2' }, { now }).active;
  assert.equal(edited.blocks[0].id, 'block-0');
  assert.deepEqual(edited.results, original.results);
  assert.throws(() => editSession(edited, { type: 'remove', blockId: 'block-1' }, { now }), /at least one remaining/);
  const completed = session('piano', 1); finishBlock(completed, null, now);
  assert.throws(() => editSession(completed, { type: 'remove', blockId: 'block-0' }, { now }), /no remaining blocks/);
});

test('an older all-complete checkpoint can append a fresh block without reopening completed results', () => {
  const active = session('piano', 1);
  active.elapsedMs = active.blockElapsedMs = 60000;
  active.currentMeasurement = structuredClone(measurement);
  active.readerSnapshot = structuredClone(snapshot);
  finishBlock(active, active.currentMeasurement, now);
  const original = structuredClone(active), added = block('free', { id: 'new-after-complete', minutes: 10 });
  const result = editSession(active, { type: 'add', block: added }, { now: now + 10000 });
  assert.equal(result.currentChanged, true);
  assert.equal(result.active.blockIndex, 1);
  assert.equal(result.active.blocks[result.active.blockIndex].id, added.id);
  assert.equal(result.active.elapsedMs, 60000);
  assert.equal(result.active.blockElapsedMs, 0);
  assert.equal(result.active.runningSince, null);
  assert.equal(result.active.currentMeasurement, undefined);
  assert.equal(result.active.readerSnapshot, undefined);
  assert.equal(result.active.blockRuntime, undefined);
  assert.deepEqual(result.active.results, original.results);
  assert.deepEqual(result.active.blocks[0], original.blocks[0]);
  assert.deepEqual(active, original);
  assert.deepEqual(restoredBackup(result.active), result.active);
  assert.throws(() => editSession(active, { type: 'add', block: added, toIndex: 0 }, { now }), /remaining session/);
  for (const type of ['minutes', 'move', 'remove']) {
    assert.throws(() => editSession(result.active, { type, blockId: 'block-0', minutes: 20, toIndex: 1 }, { now }), /Completed/);
  }
});

test('adding blocks preserves IDs and runtime while rejecting duplicate IDs, incompatible activities and limits', () => {
  const active = progressed(), added = block('technique', { id: 'new-block', minutes: 15 });
  const edited = editSession(active, { type: 'add', block: added, toIndex: 0 }, { now });
  assert.equal(edited.currentChanged, true);
  assert.equal(edited.active.blocks[0].id, added.id);
  assert.equal(edited.active.blockRuntime[0].blockId, 'block-0');
  assert.deepEqual(edited.active.blockRuntime[0].readerSnapshot, snapshot);
  added.minutes = 30;
  assert.equal(edited.active.blocks[0].minutes, 15);
  for (const minutes of [0, -1, 1.5, 601, NaN, Infinity, '10']) assert.throws(() => editSession(active, { type: 'minutes', blockId: 'block-0', minutes }, { now }), /whole minutes/);
  assert.throws(() => editSession(active, { type: 'add', block: active.blocks[0] }, { now }), /unique ID/);
  assert.throws(() => editSession(active, { type: 'add', block: block('free') }, { now }), /Without a piano/);
  assert.throws(() => editSession(active, { type: 'add', block: block('reading', { bpm: 999 }) }, { now }), /invalid/);
  assert.throws(() => editSession(session('piano', 30), { type: 'add', block: block('free') }, { now }), /30 blocks/);
  const duplicate = session(); duplicate.blocks[1].id = duplicate.blocks[0].id;
  assert.throws(() => editSession(duplicate, { type: 'remove', blockId: 'block-0' }, { now }), /unique ID/);
  const removed = editSession(active, { type: 'remove', blockId: 'block-0' }, { now }).active;
  assert.throws(() => editSession(removed, { type: 'add', block: active.blocks[0] }, { now }), /unique ID/);
});

test('postponed progress survives backup roundtrip and recovery resumes paused', () => {
  const active = editSession(progressed(), { type: 'move', blockId: 'block-0', toIndex: 2 }, { now }).active;
  active.runningSince = now;
  const recovered = restoredBackup(active);
  assert.equal(recovered.runningSince, null);
  assert.deepEqual(recovered.blockRuntime, active.blockRuntime);
  const restored = editSession(recovered, { type: 'move', blockId: 'block-0', toIndex: 0 }, { now: now + 86400000 }).active;
  assert.equal(restored.elapsedMs, 120000, 'Closed-app time is excluded');
  assert.equal(restored.blockElapsedMs, 120000);
  assert.deepEqual(restored.readerSnapshot, snapshot);
  assert.deepEqual(restored.currentMeasurement, measurement);
});

test('finalizing or changing context archives each postponed result exactly once without mutating a retryable session', () => {
  let active = editSession(progressed(), { type: 'move', blockId: 'block-0', toIndex: 2 }, { now }).active;
  active.runningSince = now;
  active = editSession(active, { type: 'minutes', blockId: 'block-1', minutes: 15 }, {
    now: now + 30000, measurement: { source: 'screen', correct: 2, wrong: 1 },
  }).active;
  const original = structuredClone(active), settled = settleSuspendedBlocks(active);
  assert.equal(settled.results.length, 1);
  assert.equal(settled.results[0].partial, true);
  assert.equal(settled.results[0].context, 'mobile');
  assert.equal(settled.results[0].block.id, 'block-0');
  assert.deepEqual(settleSuspendedBlocks(settled), settled, 'Settling cannot count postponed work twice');
  assert.deepEqual(active, original);
  const data = emptyData(); data.active = settled;
  const saved = saveSession(data, settled, { partial: true, measurement: settled.currentMeasurement }, now + 30000);
  assert.equal(saved.elapsedMs, 150000);
  assert.equal(saved.results.reduce((sum, result) => sum + result.elapsedMs, 0), 150000);
  assert.deepEqual(saved.results.map(result => result.block.id), ['block-0', 'block-1']);
  assert.equal(saved.results.some(result => result.block.id === 'block-2'), false);
  assert.equal(saved.blockRuntime, undefined);
});

test('backup validation rejects malformed postponed runtime instead of losing or misattributing it', () => {
  const active = editSession(progressed(), { type: 'move', blockId: 'block-0', toIndex: 2 }, { now }).active;
  const corruptions = [
    value => { value.blockRuntime = {}; },
    value => { value.blocks[1].id = value.blocks[2].id; },
    value => { value.blockRuntime.push(structuredClone(value.blockRuntime[0])); },
    value => { value.blockRuntime[0].blockId = 'missing'; },
    value => { value.blockRuntime[0].blockId = value.blocks[value.blockIndex].id; },
    value => { value.blockRuntime[0].elapsedMs = -1; },
    value => { value.blockRuntime[0].elapsedMs = value.elapsedMs + 1; },
    value => { value.blockRuntime[0].context = 'other'; },
    value => { value.blockRuntime[0].measurement.correct = -1; },
    value => { value.blockRuntime[0].readerSnapshot.line.idx = 100; },
    value => { value.blockRuntime[0].readerSnapshot.line.waitBars = 7; },
  ];
  for (const corrupt of corruptions) {
    const invalid = structuredClone(active); corrupt(invalid);
    assert.throws(() => validateData({ ...emptyData(), active: invalid }), /invalid/);
  }
  const differentContext = structuredClone(active); differentContext.context = 'piano';
  assert.throws(() => editSession(differentContext, { type: 'move', blockId: 'block-0', toIndex: 0 }, { now }), /before changing/);
  assert.deepEqual(active.blockRuntime[0].readerSnapshot, snapshot);
});
