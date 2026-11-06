import test from 'node:test';
import assert from 'node:assert/strict';
import {workPracticeTotals} from '../src/companion/work-practice.js';
import {eventCountdown} from '../src/companion/event-countdown.js';
import {setAppLanguage} from '../src/companion/locale.js';

test('piece totals sum attributed blocks across sessions without sharing tagged lesson time',()=>{
 const totals=workPracticeTotals([{workIds:['a','b'],elapsedMs:999999,results:[{block:{workId:'a'},elapsedMs:60000},{block:{workId:'b'},elapsedMs:120000},{block:{},elapsedMs:900000}]},{results:[{block:{workId:'a'},elapsedMs:30000},{block:{workId:'b'},elapsedMs:-100}]}]);
 assert.deepEqual([...totals],[['a',90000],['b',120000]]);
});
test('event countdown handles weeks, days, today and past dates',()=>{
 setAppLanguage('es');
 for(const [date,label] of [['2026-12-17','5 semanas y 6 días'],['2026-11-13','1 semana'],['2026-11-07','1 día'],['2026-11-06','Hoy'],['2026-11-05','Evento pasado']])assert.equal(eventCountdown(date,'2026-11-06'),label);
 setAppLanguage('en');
});
