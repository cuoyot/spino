import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reminderNotifications, createReminderScheduler } from '../src/companion/reminders.js';
const now = new Date('2030-01-01T00:00:00').getTime();
const event = (id, time='12:00') => ({ id, title: `Event ${id}`, date: '2030-01-02', time, reminder: true });
const data = () => ({ plans: [{...event('plan'), status:'planned'}], events:[event('event')] });

test('reminders use local appointment time minus 15 minutes, retain record identity and skip completed or expired items', () => {
  const d=data();d.plans.push({...event('finished'),status:'complete'});d.events.push({...event('old'),date:'2020-01-01'},event('no-time',''));
  const n=reminderNotifications(d,'en',now);assert.equal(n.length,2);
  assert.ok(n.every(n=>n.schedule.at.getTime()===new Date('2030-01-02T11:45:00').getTime()));
  const again=reminderNotifications({...d,events:[...d.events].reverse()},'es',now);
  assert.deepEqual(n.map(n=>n.id),again.map(n=>n.id));assert.equal(n[0].extra.spinoReminder,true);
  assert.deepEqual(d.events[0],event('event'));
});

test('permission checks never prompt; an explicit request handles refusal without scheduling', async () => {
  let checks=0,requests=0;
  const sync=createReminderScheduler({checkPermissions:async()=>{checks++;return {display:'prompt'};},requestPermissions:async()=>{requests++;return {display:'denied'};}});
  assert.equal((await sync(data(),false,'en')).enabled,false);assert.equal(requests,0);
  assert.equal((await sync(data(),true,'en')).permission,'denied');assert.equal(checks,1);assert.equal(requests,1);
});

test('rescheduling and deleting cancel only obsolete SPino reminders and preserve foreign notifications', async () => {
  let scheduled,cancelled;
  const sync=createReminderScheduler({checkPermissions:async()=>({display:'granted'}),getPending:async()=>({notifications:[{id:9,extra:{spinoReminder:true}},{id:10,extra:{other:true}}]}),schedule:async o=>{scheduled=o.notifications;},cancel:async o=>{cancelled=o.notifications;}});
  const result=await sync(data(),false,'en');assert.equal(result.scheduled,2);assert.deepEqual(cancelled,[{id:9}]);assert.ok(scheduled.every(n=>n.id!==10));
  await sync({plans:[],events:[]},false,'en');assert.deepEqual(cancelled,[{id:9}]);
});

test('iOS pending capacity schedules the closest reminders and reports deferred appointments', async () => {
  let scheduled;
  const d={plans:[],events:Array.from({length:70},(_,i)=>({...event(String(i)),date:`2030-02-${String(1+Math.floor(i/3)).padStart(2,'0')}`,time:`${String(10+i%3).padStart(2,'0')}:00`}))};
  const sync=createReminderScheduler({checkPermissions:async()=>({display:'granted'}),getPending:async()=>({notifications:[{id:1,extra:{other:true}}]}),schedule:async o=>{scheduled=o.notifications;},cancel:async()=>{}});
  const result=await sync(d,false,'ca');assert.equal(result.scheduled,63);assert.equal(result.deferred,7);assert.ok(scheduled.every(n=>n.id!==1));assert.ok(scheduled[0].schedule.at<=scheduled.at(-1).schedule.at);
});

test('a failed native scheduling call keeps the queue usable for a later retry', async () => {
  let fail=true;
  const sync=createReminderScheduler({checkPermissions:async()=>({display:'granted'}),getPending:async()=>({notifications:[]}),schedule:async()=>{if(fail)throw Error('native failure');},cancel:async()=>{}});
  await assert.rejects(sync(data(),false,'en'),/native failure/);fail=false;assert.equal((await sync(data(),false,'en')).scheduled,2);
});

test('editing then deleting an appointment updates its notification without changing record IDs or leaving stale reminders', async () => {
  const pending=new Map();
  const sync=createReminderScheduler({checkPermissions:async()=>({display:'granted'}),getPending:async()=>({notifications:[...pending.values()]}),schedule:async({notifications})=>{for(const n of notifications)pending.set(n.id,n);},cancel:async({notifications})=>{for(const n of notifications)pending.delete(n.id);}});
  const d=data();await sync(d,false,'en');const original=[...pending.values()].find(n=>n.extra.recordId==='event');
  d.events[0].time='13:00';d.events[0].title='Updated title';await sync(d,false,'en');
  assert.equal(pending.size,2);assert.equal(pending.get(original.id).title,'Updated title');assert.equal(pending.get(original.id).schedule.at.getTime(),new Date('2030-01-02T12:45:00').getTime());assert.equal(d.events[0].id,'event');
  d.events=[];await sync(d,false,'en');assert.equal(pending.size,1);assert.equal(pending.has(original.id),false);
});
