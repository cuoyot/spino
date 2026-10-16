import test from 'node:test';
import assert from 'node:assert/strict';
import {monthWeeks,shiftMonth,recordingDate,filterRecordings,monthCalendarMarkup} from '../src/companion/activity-calendar.js';
import {streakDetailMarkup,progressHighlightsMarkup} from '../src/companion/progress-rhythm.js';
import {setAppLanguage} from '../src/companion/locale.js';

test('month grids cover leap days and cross years using Monday weeks',()=>{
  assert.equal(shiftMonth('2026-12-31',1),'2027-01-01');assert.equal(shiftMonth('2026-01-31',-1),'2025-12-01');
  const leap=monthWeeks('2024-02-29').flat();assert.equal(leap[0],'2024-01-29');assert.equal(leap.at(-1),'2024-03-03');assert.ok(leap.includes('2024-02-29'));
  assert.equal(monthWeeks('2026-03-01').length,6);
  setAppLanguage('es');
  const heading=date=>monthCalendarMarkup(date,{prefix:'media',mode:'week',toggleAction:'media-toggle-month',day:()=>''}).match(/class="cp-media-calendar-title"[^>]*>(.*?)<\/button>/)[1];
  assert.equal(heading('2026-10-16'),'<span>octubre de 2026</span>');
  assert.match(heading('2026-10-01'),/septiembre.*octubre de 2026/);
  assert.match(heading('2026-12-31'),/diciembre de 2026.*enero de 2027/);
  assert.doesNotMatch(heading('2026-10-01'),/<small|<i/);setAppLanguage('en');
});
test('recording filters intersect local dates, type and piece without mutating metadata',()=>{
  const rows=[['a','audio','one','2026-10-01T12:00:00'],['b','video','one','2026-10-02T12:00:00'],['c','audio','two','2026-10-02T12:00:00']].map(([id,kind,workId,createdAt])=>({id,kind,workId,createdAt})),before=JSON.stringify(rows);
  assert.equal(recordingDate({createdAt:'invalid'}),'');
  assert.equal(recordingDate({createdAt:'2026-10-02T00:15:00'}),'2026-10-02');
  assert.deepEqual(filterRecordings(rows,{from:'2026-10-02',to:'2026-10-02',workId:'one',type:'video'}).map(r=>r.id),['b']);
  assert.equal(filterRecordings(rows,{to:'2026-10-01'}).length,1);assert.equal(JSON.stringify(rows),before);
});
test('streak detail retains open week, excludes future/zero time and counts only the active streak',()=>{
  setAppLanguage('en');
  const data={preferences:{weeklyMinutes:30},sessions:[['2026-09-21',20],['2026-10-05',40],['2026-10-06',10],['2026-10-14',0],['2026-10-17',90]].map(([date,m])=>({date,elapsedMs:m*60000}))};
  const before=JSON.stringify(data),markup=streakDetailMarkup(data,'2026-10-16','2026-10-16');
  assert.match(markup,/Streak sessions<\/span><strong>2</);assert.match(markup,/1 <small>weeks/);assert.doesNotMatch(markup,/2026-10-17[^>]+is-practiced/);
  assert.match(progressHighlightsMarkup(data,[],'2026-10-16'),/data-action="progress-streak"/);assert.equal(JSON.stringify(data),before);
});

test('empty rhythm and period navigation render in English and Catalan without a weekly goal',async()=>{
  const {mediaMarkup}=await import('../src/companion/media-view.js');
  const data={preferences:{weeklyMinutes:0},sessions:[]};
  setAppLanguage('en');assert.match(streakDetailMarkup(data,'2026-10-01','2026-10-16'),/0 <small>weeks/);assert.match(mediaMarkup([],[]),/No local recordings/);
  setAppLanguage('ca');assert.match(progressHighlightsMarkup(data,[],'2026-10-16'),/Gravacions/);assert.match(streakDetailMarkup(data,'2026-10-01','2026-10-16'),/Sessions de la ratxa/);const markup=mediaMarkup([],[],{month:'2026-10-16'});assert.match(markup,/Setmana/);assert.match(markup,/Mostrar mes/);assert.doesNotMatch(markup,/media-from|media-type|media-work/);assert.doesNotMatch(markup,/Offline playback and sync/);setAppLanguage('en');
});
