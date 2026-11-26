import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bindMidiShortcuts} from '../src/companion/midi-shortcuts.js';
import {plannerDayAvailability, proposeSchedule} from '../src/companion/planner.js';
import {emptyData} from '../src/companion/model.js';
import {keyboardNoteLabel, setNaming} from '../src/music.js';

test('MIDI settings are available to keyboard users and first-time disconnected users',()=>{
  for(const [detail,canReconnect,expected] of [[0,true,'settings'],[1,false,'settings'],[1,true,'connect']]) {
    const root=new EventTarget(), calls=[];
    root.closest=()=>root;
    bindMidiShortcuts(root,{connected:()=>false,canReconnect:()=>canReconnect,connect:()=>calls.push('connect'),settings:()=>calls.push('settings')});
    const event=new Event('click',{cancelable:true});
    Object.defineProperty(event,'detail',{value:detail});
    root.dispatchEvent(event);
    assert.deepEqual(calls,[expected]);
    assert.equal(event.defaultPrevented,true);
  }
});

test('past weekdays are unavailable for a single week but retained in a future recurring series',()=>{
  const week='2026-11-23', today='2026-11-26';
  const once=plannerDayAvailability(week,1,today);
  assert.deepEqual(once.map(day=>day.available),[false,false,false,true,true,true,true]);
  const recurring=plannerDayAvailability(week,4,today);
  assert.ok(recurring.every(day=>day.available));
  assert.deepEqual(recurring.map(day=>day.startsLater),[true,true,true,false,false,false,false]);
  const proposal=proposeSchedule(emptyData(),{week,weeks:4,days:[0,2,4],minutes:40,context:'piano',routineId:'',tutor:false},today);
  assert.equal(proposal.plans.length,10);
  assert.ok(proposal.plans.every(plan=>plan.date>=today));
  assert.ok(proposal.plans.some(plan=>plan.date==='2026-11-30'));
  assert.ok(proposal.plans.some(plan=>plan.date==='2026-12-02'));
});

test('piano-key names identify pitch and octave without depending on visible assistance',()=>{
  try {
    setNaming('english');
    assert.equal(keyboardNoteLabel(21),'A0');
    assert.equal(keyboardNoteLabel(60),'C4');
    assert.equal(keyboardNoteLabel(61),'C♯4');
    assert.equal(keyboardNoteLabel(61,{letter:'d',acc:'b'}),'D♭4');
    assert.equal(keyboardNoteLabel(108),'C8');
    setNaming('solfege');
    assert.equal(keyboardNoteLabel(62),'Re4');
    setNaming('german');
    assert.equal(keyboardNoteLabel(71),'H4');
  } finally { setNaming('english'); }
});
