import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,validateData,validateBackup,deleteSession} from '../src/companion/model.js';
import {completeLesson,lessonResult,linkLessonRecordings} from '../src/companion/lessons.js';
import {mergeNotebooks} from '../src/companion/cloud-merge.js';
import {eventsBetween} from '../src/companion/event-recurrence.js';
import {agendaEntries,agendaCard} from '../src/companion/agenda.js';
import {reminderNotifications} from '../src/companion/reminders.js';
const now=Date.parse('2026-10-18T12:00:00Z');
function fixture(){const d=emptyData();d.works=['a','b'].map(id=>({id,title:id,composer:'',stage:'En estudio',notes:'Original',passage:'',target:null,bpm:60}));d.events=[{id:'lesson',type:'Clase',date:'2026-10-18',time:'18:00',title:'Tutor lesson',place:'Studio',notes:'Preparation stays',workIds:['a'],reminder:true,recurrence:{id:'lesson',frequency:'weekly',until:null,rule:true,excluded:[]}}];return d;}
const values={title:'Lesson result',date:'2026-10-18',minutes:75,mood:4,workIds:['a','b'],notes:'Teacher fingering',next:'Practise slowly'};
test('complete one lesson occurrence, retain planning, stable result edits and backup links',()=>{
 const d=fixture(),before=structuredClone(d.events);const s=completeLesson(d,'lesson@2026-10-18',values,now);
 assert.equal(s.elapsedMs,4500000);assert.equal(s.results[0].block.workId,'','Score tags do not invent per-score timings');assert.equal(s.results.reduce((n,r)=>n+r.elapsedMs,0),s.elapsedMs);assert.deepEqual(d.events,before);assert.equal(s.notes,values.notes);assert.deepEqual(s.workIds,['a','b']);
 const id=s.id,blockId=s.blocks[0].id;completeLesson(d,'lesson@2026-10-18',{...values,minutes:90},now);assert.equal(d.sessions.length,1);assert.equal(d.sessions[0].id,id);assert.equal(d.sessions[0].blocks[0].id,blockId);assert.equal(lessonResult(d,'lesson@2026-10-25'),undefined);
 linkLessonRecordings(d,'lesson@2026-10-18',['teacher-a','teacher-a','teacher-video']);assert.equal(d.events.length,2);assert.deepEqual(eventsBetween(d.events,'2026-10-25','2026-10-25')[0].recordingIds,undefined);assert.deepEqual(validateData(d).events[1].recordingIds,['teacher-a','teacher-video']);
 const entries=agendaEntries(d,'2026-10-18');assert.equal(entries.filter(e=>e.session).length,1);assert.match(agendaCard(entries.find(e=>e.event)),/Completed lesson|Clase completada/);
 assert.equal(reminderNotifications(d,'en',now).some(n=>n.extra.recordId==='lesson@2026-10-18'),false);
 deleteSession(d,id);assert.equal(lessonResult(d,'lesson@2026-10-18'),undefined);assert.equal(d.events[1].recordingIds.length,2);assert.ok(reminderNotifications(d,'en',now).some(n=>n.extra.recordId==='lesson@2026-10-18'));
});
test('reject invalid lessons and feedback without changing the notebook; support long lessons without a score',()=>{
 const d=fixture();for(const change of [{minutes:0},{minutes:721},{date:'2026-10-19'},{mood:6},{workIds:['missing']}]){const before=structuredClone(d);assert.throws(()=>completeLesson(d,'lesson@2026-10-18',{...values,...change},now));assert.deepEqual(d,before);}
 assert.throws(()=>completeLesson(d,'missing',values,now));
 const s=completeLesson(d,'lesson@2026-10-18',{...values,minutes:720,workIds:[]},now);assert.equal(s.results[0].elapsedMs,43200000);assert.doesNotThrow(()=>validateData(d));
 d.sessions[0].lessonEventId=22;assert.throws(()=>validateData(d));
});

test('lesson result and recording references survive notebook backup and independent cloud edits',()=>{
 const initial=fixture(),base={format:'cuaderno-piano',version:1,data:initial,assets:[]},local=structuredClone(base),remote=structuredClone(base);
 completeLesson(local.data,'lesson@2026-10-18',values,now);linkLessonRecordings(local.data,'lesson@2026-10-18',['original-media-id']);remote.data.works[0].notes='Independent teacher note';
 const merged=mergeNotebooks(base,local,remote);assert.deepEqual(merged.conflicts,[]);const restored=validateBackup(JSON.stringify(merged.backup));assert.equal(restored.data.sessions[0].lessonEventId,'lesson@2026-10-18');assert.deepEqual(restored.data.events.find(e=>e.id==='lesson@2026-10-18').recordingIds,['original-media-id']);assert.equal(restored.data.works[0].notes,'Independent teacher note');
});
