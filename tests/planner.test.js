import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyData, block, validateData } from '../src/companion/model.js';
import { proposeWeek, proposeSchedule, cancelSeries } from '../src/companion/planner.js';

const settings = { week: '2026-09-30', days: [0,2,4], minutes: 20, context: 'piano', routineId: '', tutor: true, tutorDay: 3, tutorTime: '18:00' };

test('weekly series cross year boundaries, avoid duplicates and survive backup validation', () => {
  const data = emptyData(), config = {...settings, week:'2026-12-28', weeks:4};
  const proposal = proposeSchedule(data,config,'2026-12-28');
  assert.equal(proposal.plans.length,12); assert.equal(proposal.events.length,4);
  assert.equal(proposal.until,'2027-01-24');
  assert.equal(proposal.plans[3].date,'2027-01-04');
  assert.equal(new Set(proposal.plans.map(p=>p.recurrence.id)).size,1);
  assert.notEqual(proposal.plans[0].recurrence.id,proposal.events[0].recurrence.id);
  data.plans=proposal.plans; data.events=proposal.events;
  assert.deepEqual(validateData(JSON.parse(JSON.stringify(data))).plans,data.plans);
  assert.equal(proposeSchedule(data,config,'2026-12-28').plans.length,0);
  assert.equal(proposeSchedule(data,config,'2026-12-28').events.length,0);
  assert.throws(()=>proposeSchedule(data,{...config,weeks:53}));
  assert.throws(()=>proposeSchedule(data,{...config,weeks:1.5}));
  const bad=structuredClone(data);bad.plans[0].recurrence.frequency='daily';assert.throws(()=>validateData(bad));
});

test('stopping future practice preserves history, active sessions and the independent tutor series', () => {
  const data=emptyData(), p=proposeSchedule(data,{...settings,week:'2026-10-05',weeks:4},'2026-10-05');
  data.plans=p.plans;data.events=p.events;
  data.plans[4].status='completed'; data.active={planId:data.plans[5].id};
  const next=cancelSeries(data,data.plans[0].recurrence.id,'2026-10-12','2026-10-05');
  assert.equal(next.plans.length,5);assert.equal(data.plans.length,12);
  assert.equal(next.events.length,4);assert.ok(next.plans.some(v=>v.id===data.active.planId));
  const withoutClasses=cancelSeries(next,data.events[0].recurrence.id,'2026-10-05','2026-10-15');
  assert.deepEqual(withoutClasses.events.map(e=>e.date),['2026-10-08']);
  assert.deepEqual(withoutClasses.plans,next.plans);
});

test('weekly assistant previews only future free dates and separates tutor classes', () => {
  const data = emptyData();
  data.plans.push({ id: 'existing', title: 'Existing', date: '2026-10-02', time: '', context: 'piano', blocks: [block('free')], status: 'planned' });
  const before = structuredClone(data);
  const p = proposeWeek(data, settings, '2026-09-30');
  assert.deepEqual(data, before, 'preview does not mutate the notebook');
  assert.equal(p.start, '2026-09-28');
  assert.deepEqual(p.plans.map(p=>p.date), ['2026-09-30']);
  assert.equal(p.minutes, 20);
  assert.equal(p.events[0].date, '2026-10-01');
  assert.equal(p.events[0].type, 'Clase');
  assert.equal(p.events[0].time, '18:00');
  assert.equal(p.skipped.length, 2);
  data.plans.push(...p.plans); data.events.push(...p.events);
  assert.equal(validateData(data).events.length, 1);
  const repeated = proposeWeek(data, settings, '2026-09-30');
  assert.equal(repeated.plans.length + repeated.events.length, 0, 'repeating the assistant does not duplicate appointments');
});

test('weekly routines retain their blocks and context without changing the source', () => {
  const data = emptyData();
  const routine = { id: 'warmup', title: 'Warm-up', context: 'midi', blocks: [block('technique',{minutes:7,target:'G-major'}),block('reading',{minutes:8,target:'D-dorian'})] };
  data.routines.push(routine);
  const original = structuredClone(routine);
  const p = proposeWeek(data, {...settings, days:[2,2,4],routineId:routine.id,tutor:false}, '2026-09-30');
  assert.equal(p.plans.length, 2); assert.equal(p.minutes, 30);
  assert.equal(p.plans[0].context, 'midi'); assert.deepEqual(p.plans[0].blocks, routine.blocks);
  p.plans[0].blocks[0].minutes = 50;
  assert.equal(p.plans[1].blocks[0].minutes, 7); assert.deepEqual(routine, original);
  assert.throws(()=>proposeWeek(data,{...settings,routineId:'missing'}));
});

test('weekly assistant validates class time and supports a class without practice days', () => {
  const data = emptyData();
  const p = proposeWeek(data,{...settings,days:[]},'2026-09-30');
  assert.equal(p.plans.length,0);assert.equal(p.events.length,1);assert.equal(p.minutes,0);
  assert.throws(()=>proposeWeek(data,{...settings,tutorTime:'25:00'}));
  assert.throws(()=>proposeWeek(data,{...settings,week:'2026-02-31'}));
  assert.throws(()=>proposeWeek(data,{...settings,days:[7]}));
  const mobile = proposeWeek(data,{...settings,context:'mobile',tutor:false},'2026-09-30');
  assert.equal(mobile.plans[0].blocks[0].type,'reading');assert.equal(mobile.plans[0].blocks[0].input,'piano');
});
