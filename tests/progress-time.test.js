import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceTime, TIME_RANGES} from '../src/companion/progress-time.js';
const session=(date,parts,extra={})=>({date,elapsedMs:parts.reduce((n,p)=>n+p[1]*60000,0),results:parts.map(([type,min,workId=''])=>({block:{type,workId},elapsedMs:min*60000})),...extra});
const data=sessions=>({sessions});
test('time filters allocate only matching blocks, preserve notebook and exclude future/unsaved time',()=>{
 const source=data([session('2026-10-15',[['warmup',5],['repertoire',20,'a'],['repertoire',10,'b'],['free',3]],{workIds:['a','b','tag-only'],status:'partial',manual:true}),session('2026-10-16',[['free',900]])]);
 source.active=session('2026-10-15',[['free',500]]);const before=JSON.stringify(source),base={today:'2026-10-15',range:'7d'};
 assert.equal(practiceTime(source,base).totalMs,38*60000);
 assert.equal(practiceTime(source,{...base,workId:'a'}).totalMs,20*60000);
 assert.equal(practiceTime(source,{...base,type:'repertoire'}).totalMs,30*60000);
 assert.equal(practiceTime(source,{...base,type:'free',workId:'a'}).totalMs,0);
 assert.equal(practiceTime(source,{...base,workId:'tag-only'}).totalMs,0);
 assert.equal(JSON.stringify(source),before);
});
test('overview contains 12 Monday-based weeks including zero weeks and unfinished current week',()=>{
 const m=practiceTime(data([session('2026-07-27',[['free',10]]),session('2026-10-12',[['free',30]]),session('2026-10-15',[['free',8]])]),{today:'2026-10-15',overview:true});
 assert.equal(m.start,'2026-07-27');assert.equal(m.buckets.length,12);assert.equal(m.buckets[1].ms,0);assert.equal(m.weekMs,38*60000);assert.equal(m.buckets.at(-1).end,'2026-10-15');assert.equal(m.totalMs,48*60000);
});
test('previous comparison uses equal calendar-day duration and same filters',()=>{
 const m=practiceTime(data([session('2026-10-02',[['free',999]]),session('2026-10-08',[['free',10],['repertoire',100,'a']]),session('2026-10-09',[['free',20]]),session('2026-10-15',[['free',5]])]),{today:'2026-10-15',range:'7d',type:'free'});
 assert.equal(m.start,'2026-10-09');assert.equal(m.previousStart,'2026-10-02');assert.equal(m.previousEnd,'2026-10-08');assert.equal(m.totalMs,25*60000);assert.equal(m.previousMs,1009*60000);assert.equal(m.days,2);
});
test('month ends, leap year and year-to-date use calendar boundaries',()=>{
 assert.equal(practiceTime(data([]),{today:'2026-03-31',range:'1m'}).start,'2026-03-01');
 assert.equal(practiceTime(data([]),{today:'2024-03-31',range:'1m'}).start,'2024-03-01');
 assert.equal(practiceTime(data([]),{today:'2024-02-29',range:'1y'}).start,'2023-03-01');
 const ytd=practiceTime(data([]),{today:'2026-01-01',range:'ytd'});assert.equal(ytd.buckets.length,1);assert.equal(ytd.previousStart,'2025-12-31');
});
test('every range partitions its total without gaps or duplicates across DST/year changes',()=>{
 for(const today of ['2026-10-31','2026-03-31','2026-01-01'])for(const range of TIME_RANGES){
  const m=practiceTime(data([session(today,[['free',10]])]),{today,range});
  assert.equal(m.buckets.reduce((n,b)=>n+b.ms,0),m.totalMs);assert.equal(m.buckets[0].start,m.start);assert.equal(m.buckets.at(-1).end,today);
 }
});
