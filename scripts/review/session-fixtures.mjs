import { beginSession, block, finishBlock, validateData } from '../../src/companion/model.js';
import { todayFixtures, REVIEW_DATE, REVIEW_NOW } from './today-fixtures.mjs';

export { REVIEW_DATE, REVIEW_NOW };

// These isolated notebooks exercise the real Today entry points, without score assets or MIDI simulation.
export function sessionFixtures() {
  const { typical, pending } = todayFixtures(), now = Date.parse(REVIEW_NOW);
  const resumed = structuredClone(pending);
  resumed.active.elapsedMs = resumed.active.blockElapsedMs = 10 * 60000;
  finishBlock(resumed.active, null, now);
  resumed.active.elapsedMs += 8 * 60000;
  resumed.active.blockElapsedMs = 8 * 60000;

  const free = structuredClone(typical);
  free.active = beginSession({ title: 'Práctica libre', context: 'piano', blocks: [
    block('free', { id: 'review-free-block', minutes: 40, passage: 'Sonido y fraseo', bpm: 60 }),
  ] }, now);
  free.active.id = 'review-free-active';
  free.active.date = REVIEW_DATE;
  free.active.elapsedMs = free.active.blockElapsedMs = 8 * 60000;

  const midi = structuredClone(typical);
  midi.active = beginSession({ title: 'Lectura a dos manos', context: 'midi', blocks: [
    block('reading', { id: 'review-midi-block', minutes: 40, hand: 'both', target: 'G-major', presentation: 'page' }),
  ] }, now);
  midi.active.id = 'review-midi-active';
  midi.active.date = REVIEW_DATE;

  return Object.fromEntries(Object.entries({ planned: typical, resumed, running: free, disconnected: midi })
    .map(([id, data]) => [id, validateData(data)]));
}

export const sessionStateLabels = {
  planned: 'Planned session · before playing',
  resumed: 'Resumed session · second block paused',
  running: 'Free practice · timer running',
  disconnected: 'MIDI reading · no instrument connected',
};
