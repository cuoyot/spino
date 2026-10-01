import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beginSession, block, emptyData, saveSession, validateBackup } from '../src/companion/model.js';
import { preparationMarkup } from '../src/companion/views.js';

test('self-paced timing survives routine, plan, active session and completed-session backups', () => {
  const data = emptyData();
  const practice = { title: 'At my pace', context: 'mobile', blocks: [block('reading', { timing: 'wait', bpm: 82, presentation: 'scroll' })] };
  data.routines.push({ ...structuredClone(practice), id: 'routine' });
  data.plans.push({ ...structuredClone(practice), id: 'plan', date: '2026-10-01', time: '', status: 'planned' });
  const completed = beginSession(practice, 1000);
  saveSession(data, completed, { measurement: { source: 'screen', correct: 8, wrong: 2 } }, 2000);
  data.active = beginSession(practice, 3000);
  const restored = validateBackup(JSON.stringify({ format: 'cuaderno-piano', version: 1, data, assets: [] })).data;
  for (const owner of [...restored.routines, ...restored.plans, restored.active, ...restored.sessions]) {
    assert.equal(owner.blocks[0].timing, 'wait');
    assert.equal(owner.blocks[0].bpm, 82);
    assert.equal(owner.blocks[0].presentation, 'scroll');
    assert.equal(owner.blocks[0].id, practice.blocks[0].id);
  }
  assert.equal(restored.sessions[0].results[0].block.timing, 'wait');
});

test('legacy blocks stay compatible and unknown timing values fail backup validation', () => {
  const data = emptyData(), b = block('technique');
  assert.equal(b.timing, 'timed');
  delete b.timing;
  data.routines.push({ id: 'old-routine', title: 'Existing routine', context: 'mobile', blocks: [b] });
  const restore = () => validateBackup(JSON.stringify({ format: 'cuaderno-piano', version: 1, data, assets: [] }));
  assert.equal(restore().data.routines[0].blocks[0].timing, undefined);
  for (const invalid of ['auto', '', true, null]) {
    b.timing = invalid;
    assert.throws(restore);
  }
});

test('preparation offers self-paced mobile exercises and preserves timed piano controls', () => {
  const data = emptyData();
  for (const type of ['reading', 'technique']) {
    const draft = { context: 'mobile', blocks: [block(type, { bpm: 82, presentation: 'scroll' })] };
    const timed = preparationMarkup(draft, 'start', data);
    assert.match(timed, /name="timing-0"/);
    assert.match(timed, /value="timed" selected/);
    assert.match(timed, /name="bpm-0"/);
    draft.blocks[0].timing = 'wait';
    const waiting = preparationMarkup(draft, 'start', data);
    assert.match(waiting, /value="wait" selected/);
    assert.doesNotMatch(waiting, /name="bpm-0"|name="presentation-0"/);
    assert.equal(draft.blocks[0].bpm, 82);
    assert.equal(draft.blocks[0].presentation, 'scroll');
    for (const context of ['piano', 'midi']) {
      draft.context = context;
      const connected = preparationMarkup(draft, 'start', data);
      assert.doesNotMatch(connected, /name="timing-0"/);
      assert.match(connected, /name="bpm-0"/);
      assert.match(connected, /name="presentation-0"/);
    }
  }
});
