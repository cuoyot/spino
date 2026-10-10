import {test} from 'node:test';
import assert from 'node:assert/strict';
import {progressMetrics} from '../src/companion/progress-metrics.js';
const data=sessions=>({preferences:{weeklyMinutes:90},sessions:sessions.map(([date,minutes])=>({date,elapsedMs:minutes*60000}))});
test('weekly streaks tolerate unfinished current week, distinguish goals and exclude future sessions',()=>{
 const source=data([['2026-09-14',90],['2026-09-21',100],['2026-09-28',45],['2026-10-01',45],['2026-10-07',100]]),before=JSON.stringify(source);
 const m=progressMetrics(source,'2026-10-06');assert.equal(m.practiceStreak,3);assert.equal(m.goalStreak,3);assert.deepEqual(m.weeks.map(w=>w.minutes),[90,100,90,0]);assert.equal(JSON.stringify(source),before);
 source.sessions.push({date:'2026-10-06',elapsedMs:20*60000});const n=progressMetrics(source,'2026-10-06');assert.equal(n.practiceStreak,4);assert.equal(n.goalStreak,3);
});
test('gaps, empty records, no goal and year boundaries',()=>{
 assert.equal(progressMetrics(data([['2026-09-21',100]]),'2026-10-06').practiceStreak,0);
 const empty=data([]);empty.preferences.weeklyMinutes=0;assert.equal(progressMetrics(empty,'2026-10-06').goalStreak,null);
 assert.equal(progressMetrics(data([['2025-12-29',95],['2026-01-05',100]]),'2026-01-06').goalStreak,2);
 assert.equal(progressMetrics(data([['2026-10-06',0]]),'2026-10-06').practiceStreak,0);
});
