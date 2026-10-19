import { setAppLanguage } from '../src/companion/locale.js';
import assert from 'node:assert/strict';
import { test, beforeEach } from 'node:test';
beforeEach(() => setAppLanguage('es'));
import { emptyData, block, beginSession, saveSession } from '../src/companion/model.js';
import { agendaEntries, todayPractice, todayMarkup, weekAgendaMarkup, todayWeeklyProgress } from '../src/companion/agenda.js';

const today = '2026-09-30';
test('Home weekly progress counts saved time through today and compares an optional goal',()=>{
 const data=emptyData();data.preferences.weeklyMinutes=90;
 data.sessions=[{date:'2026-09-28',elapsedMs:30*60000},{date:today,elapsedMs:15*60000,status:'partial',manual:true},{date:'2026-09-27',elapsedMs:100*60000},{date:'2026-10-01',elapsedMs:100*60000}].map(s=>({...s,id:s.date,blocks:[block('free')],results:[]}));
 data.active={date:today,elapsedMs:60*60000};
 const html=todayWeeklyProgress(data,today);assert.match(html,/>45<small>/);assert.match(html,/aria-valuenow="50"/);assert.match(html,/45 min para tu objetivo/);
 data.preferences.weeklyMinutes=0;const noGoal=todayWeeklyProgress(data,today);assert.match(noGoal,/>45<small>/);assert.doesNotMatch(noGoal,/progressbar|objetivo/);
 data.preferences.weeklyMinutes=30;const reached=todayWeeklyProgress(data,today);assert.match(reached,/>45<small>/);assert.match(reached,/aria-valuenow="100"/);assert.match(reached,/Objetivo cumplido/);
});
function fixture() {
  const data = emptyData();
  const plan = { id: 'reading', title: 'Reading', context: 'mobile', date: today, time: '10:00', status: 'planned', blocks: [block()] };
  data.plans.push(plan);
  data.events.push({ id: 'lesson', title: 'Lesson', type: 'Clase', date: today, time: '09:00' });
  const active = beginSession({ ...plan, planId: plan.id }, new Date(today + 'T10:00:00').getTime());
  active.elapsedMs = active.blockElapsedMs = 300000;
  return { data, plan, active };
}

test('day agenda orders appointments and merges a completed plan with its result', () => {
  const { data, plan, active } = fixture();
  const saved = saveSession(data, active, { mood: 4, notes: 'Steady pulse' });
  const entries = agendaEntries(data, today);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].kind, 'event');
  assert.equal(entries[1].session.id, saved.id);
  assert.equal(entries[1].plan.id, plan.id);
  const html = todayMarkup(data, () => '', today);
  assert.match(html, /Steady pulse/);
  assert.match(html, /cp-history-duration">5 min<\/span>/);
  assert.doesNotMatch(html, /data-action="start-plan"/);
  plan.date = '2026-10-01';
  assert.equal(agendaEntries(data, today).filter(e => e.session?.id === saved.id).length, 1, 'moving a plan retains the actual practice date');
  assert.equal(agendaEntries(data, plan.date)[0].session, undefined);
});

test('Today gives a pending session one continuation card and retains other plans', () => {
  const { data, active } = fixture();
  data.active = active;
  data.plans.push({ ...data.plans[0], id: 'later', time: '18:00', title: 'Later' });
  const state = todayPractice(data, today);
  assert.equal(state.next.id, 'later');
  assert.equal(state.entries.filter(e => e.plan?.id === active.planId).length, 0);
  const html = todayMarkup(data, () => '', today);
  assert.equal((html.match(/data-action="resume-session"/g) || []).length, 1);
  assert.doesNotMatch(html, /data-action="start-plan" data-id="reading"/);
});

test('weekly agenda crosses month boundaries and keeps unplanned practice visible', () => {
  const { data, active } = fixture();
  active.planId = null;
  saveSession(data, active);
  const html = weekAgendaMarkup(data, today);
  assert.match(html, /data-week-start="2026-09-28"/);
  assert.match(html, /data-week-start="2026-10-05"/);
  assert.equal((html.match(/data-action="add-on-day"/g) || []).length, 14);
  assert.match(html, /5 min<\/b> practicados · 5 min previstos/);
  assert.equal(agendaEntries(data, today).length, 3);
});
