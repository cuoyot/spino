import {block,beginSession,saveSession,validateData} from '../../src/companion/model.js';
import {todayEventPriorityFixture,REVIEW_NOW} from './today-event-priority-fixture.mjs';

export {REVIEW_NOW};
export function todayCompactFixtures() {
  const current=todayEventPriorityFixture({concert:true});
  current.preferences.weeklyMinutes=240;
  const practice={title:'Daily piano practice',context:'piano',blocks:[block('free',{id:'review-free',minutes:40})]};
  for(const [date,minutes] of [['2026-11-09',38],['2026-11-10',12]]) {
    const session=beginSession(practice,Date.parse(REVIEW_NOW));
    session.id=`review-saved-${date}`;session.date=date;session.elapsedMs=session.blockElapsedMs=minutes*60000;
    saveSession(current,session,{mood:4,notes:'Synthetic saved practice.'},Date.parse(REVIEW_NOW));
  }
  const singlePerformance=structuredClone(current);singlePerformance.events=singlePerformance.events.filter(event=>event.type!=='Concierto');
  const planned=structuredClone(current);
  planned.plans.push({...structuredClone(practice),id:'review-next-practice',date:'2026-11-10',time:'18:30',status:'planned',reminder:false});
  const pending=structuredClone(current);
  pending.active=beginSession(practice,Date.parse(REVIEW_NOW));pending.active.id='review-pending-practice';pending.active.elapsedMs=pending.active.blockElapsedMs=6*60000;
  return Object.fromEntries(Object.entries({current,singlePerformance,planned,pending}).map(([key,data])=>[key,validateData(data)]));
}
