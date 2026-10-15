import test from 'node:test';
import assert from 'node:assert/strict';
import { eventsBetween, findEvent, saveEventOccurrence, removeEventOccurrence, eventDateAt, upcomingEvents } from '../src/companion/event-recurrence.js';
import { emptyData, validateData, validateBackup } from '../src/companion/model.js';
import { cancelSeries } from '../src/companion/planner.js';
import { agendaEntries } from '../src/companion/agenda.js';
import { reminderNotifications } from '../src/companion/reminders.js';

const event = (frequency='weekly', until=null) => ({id:'series',title:'Lesson',type:'Clase',date:'2026-01-31',time:'18:00',place:'Studio',notes:'Keep',workIds:[],reminder:true,milestones:[{title:'Ready',done:false}],recurrence:{id:'series',frequency,until,rule:true,excluded:[]}});
test('monthly and yearly rules clamp short months without drifting the original day',()=>{
 assert.deepEqual([0,1,2,3].map(i=>eventDateAt('2026-01-31','monthly',i)),['2026-01-31','2026-02-28','2026-03-31','2026-04-30']);
 assert.equal(eventDateAt('2024-02-29','yearly',1),'2025-02-28');assert.equal(eventDateAt('2024-02-29','yearly',4),'2028-02-29');
});
test('open series is bounded by requested range, has stable IDs and an inclusive optional end',()=>{
 const events=[event()];const result=eventsBetween(events,'2036-01-01','2036-01-31');assert.ok(result.length>=4&&result.length<=5);assert.equal(events.length,1);
 assert.deepEqual(result,eventsBetween(events,'2036-01-01','2036-01-31'));
 assert.deepEqual(eventsBetween([event('weekly','2026-02-07')],'2026-01-01','2026-03-01').map(e=>e.date),['2026-01-31','2026-02-07']);
 for(const [frequency,count] of [['daily',15],['weekly',3],['fortnightly',2]]) assert.equal(eventsBetween([event(frequency)],'2026-01-31','2026-02-14').length,count);
});
test('editing, moving, marking and deleting one occurrence preserve the rest and stable IDs',()=>{
 const original=[event()],id='series@2026-02-07',edited=findEvent(original,id);edited.title='Changed';edited.date='2026-02-08';edited.milestones[0].done=true;
 const saved=saveEventOccurrence(original,edited);assert.equal(original[0].milestones[0].done,false);assert.equal(eventsBetween(saved,'2026-02-07','2026-02-07').length,0);
 assert.equal(eventsBetween(saved,'2026-02-08','2026-02-08')[0].id,id);assert.equal(findEvent(saved,id).milestones[0].done,true);
 assert.equal(eventsBetween(saved,'2026-02-14','2026-02-14')[0].title,'Lesson');
 const deleted=removeEventOccurrence(saved,id);assert.equal(eventsBetween(deleted,'2026-02-07','2026-02-08').length,0);
 const excluded=removeEventOccurrence(original,'series@2026-01-31');assert.equal(eventsBetween(excluded,'2026-01-31','2026-01-31').length,0);assert.equal(eventsBetween(excluded,'2026-02-07','2026-02-07').length,1);
});
test('cancelling an open series retains past dates and removes future exceptions',()=>{
 const data=emptyData();data.events=[event()];data.events=saveEventOccurrence(data.events,{...findEvent(data.events,'series@2026-02-14'),title:'Exception'});
 const next=cancelSeries(data,'series','2026-02-07','2026-01-01');assert.equal(eventsBetween(next.events,'2026-01-01','2036-01-01').length,1);assert.equal(next.events[0].recurrence.until,'2026-02-06');
 assert.equal(data.events[0].recurrence.until,null);
});
test('recurrence survives validation and backup round trips and rejects malformed rules',()=>{
 const data=emptyData();data.events=[event('monthly')];validateData(structuredClone(data));
 const backup=validateBackup(JSON.stringify({format:'cuaderno-piano',version:1,data,assets:[],legacy:{}}));assert.deepEqual(backup.data.events,data.events);
 for(const change of [{frequency:'invalid'},{until:'2026-02-30'},{until:'2025-01-01'},{excluded:['bad']},{id:'different'}]) {const invalid=structuredClone(data);Object.assign(invalid.events[0].recurrence,change);assert.throws(()=>validateData(invalid));}
});
test('agenda and reminders include future occurrences with independent notification IDs',()=>{
 const data=emptyData();data.events=[event()];assert.equal(agendaEntries(data,'2026-02-07')[0].id,'series@2026-02-07');
 const notifications=reminderNotifications(data,'en',new Date('2026-02-01T00:00:00').getTime());assert.ok(notifications.length>40);assert.equal(new Set(notifications.map(n=>n.id)).size,notifications.length);assert.equal(notifications[0].extra.recordId,'series@2026-02-07');
});
test('upcoming events include series starting years ahead and skip excluded dates',()=>{
 const e=event('yearly');e.date='2035-01-31';e.recurrence.excluded=['2035-01-31','2036-01-31'];
 assert.deepEqual(upcomingEvents([e],'2026-10-14').map(v=>v.date),['2037-01-31','2038-01-31']);
});
