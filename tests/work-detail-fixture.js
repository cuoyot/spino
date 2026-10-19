import { historyFixture } from './progress-history-fixture.js';
import { localDate, addDays } from '../src/companion/model.js';

export function workDetailFixture() {
  const fixture = historyFixture(), { data } = fixture, today = localDate();
  Object.assign(data.works[0], { title: 'Balada Para Adelina', composer: 'Synthetic review', onStand: true, target: 'C-major' });
  const session = data.sessions.find(s => s.id === 'history-session-1');
  session.date = today;
  session.results[0].block.passage = 'Bars 9–16 · melody and accompaniment';
  session.notes = 'Keep the melody singing.';
  data.plans.push({ id: 'work-review-plan', title: session.title, date: today, time: '09:00', context: session.context, status: 'completed', sessionId: session.id, blocks: session.blocks });
  const older = data.sessions.find(s => s.id === 'history-session-2');
  data.plans.push({ id: 'work-review-moved-plan', title: 'Moved completed plan', date: addDays(today, 1), time: '10:00', context: older.context, status: 'completed', sessionId: older.id, blocks: older.blocks });
  return fixture;
}
