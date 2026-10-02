import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, block, beginSession, accrue, pause, finishBlock, saveSession, deleteSession, validateBackup, validateData, weekOf, addDays, daysUntil, summary } from '../src/companion/model.js';
import { TARGETS, generateTargetBars, targetById } from '../src/companion/curriculum.js';

test('sessions exclude pauses, preserve each block and link a plan without duplication', () => {
  const data=emptyData();const blocks=[block('technique'),block('reading')];
  data.plans.push({id:'plan',title:'Plan',context:'mobile',blocks,date:'2026-10-01',time:'',status:'planned'});
  const active=beginSession({title:'Scale practice',context:'mobile',blocks,planId:'plan'},1000);data.active=active;
  active.runningSince=1000;pause(active,61000);accrue(active,120000);
  assert.equal(active.elapsedMs,60000);
  active.runningSince=120000;finishBlock(active,{source:'screen',correct:5,wrong:2},180000);
  assert.equal(active.results[0].elapsedMs,120000);
  active.runningSince=240000;const session=saveSession(data,active,{notes:'First session',measurement:{source:'screen',correct:8,wrong:0}},300000);
  assert.equal(session.elapsedMs,180000);assert.equal(data.active,null);assert.equal(session.results.length,2);
  assert.equal(data.plans[0].sessionId,session.id);assert.equal(data.plans[0].status,'completed');
  blocks[0].target='D-dorian';assert.equal(session.results[0].block.target,'C-major');
  assert.throws(()=>saveSession(data,active),/already been saved/);
  assert.equal(summary(data.sessions).minutes,3);
});
test('logging a past manual session preserves the active practice',()=>{
  const data=emptyData();const pending=beginSession({title:'Pending',context:'piano',blocks:[block('free')]});data.active=pending;
  const past=beginSession({title:'Yesterday',context:'piano',blocks:[block('free')]});saveSession(data,past);
  assert.equal(data.active.id,pending.id);
});

test('deleting a saved session updates totals and unlinks its plan without removing other user data', () => {
  const data = emptyData(), blocks = [block('free')];
  data.plans.push({ id: 'plan', status: 'planned' });
  const first = beginSession({ title: 'Delete me', context: 'piano', blocks, planId: 'plan' }, 1000);
  first.runningSince = 1000; saveSession(data, first, {}, 61000);
  const second = beginSession({ title: 'Keep me', context: 'piano', blocks }); saveSession(data, second);
  data.active = beginSession({ title: 'Pending', context: 'piano', blocks });
  data.works.push({ id: 'work', assetId: 'annotated-pdf' });
  const preserved = structuredClone({ active: data.active, works: data.works, second: data.sessions[0] });
  deleteSession(data, first.id);
  assert.equal(summary(data.sessions).minutes, 0);
  assert.deepEqual(data.plans[0], { id: 'plan', status: 'planned' });
  assert.deepEqual({ active: data.active, works: data.works, second: data.sessions[0] }, preserved);
  assert.throws(() => deleteSession(data, first.id), /no longer exists/);
});
test('calendar weeks and countdowns cross DST and year boundaries by calendar day',()=>{
  assert.equal(weekOf('2026-10-04'),'2026-09-28');assert.equal(addDays('2026-12-31',1),'2027-01-01');
  assert.equal(daysUntil('2026-10-26','2026-10-24'),2);assert.equal(daysUntil('2026-03-30','2026-03-28'),2);
});
test('backup rejects incompatible data, duplicate identities and missing attachments before restore',()=>{
  const data=emptyData();const backup={format:'cuaderno-piano',version:1,data,assets:[],legacy:{}};
  assert.equal(validateBackup(JSON.stringify(backup)).data.schemaVersion,1);
  assert.throws(()=>validateBackup('{bad'),/invalid/);
  assert.throws(()=>validateBackup(JSON.stringify({...backup,version:2})),/invalid/);
  data.works.push({id:'a',title:'Work',composer:'',stage:'En estudio',notes:'',passage:'',bpm:60,target:'C-major',assetId:'missing'});
  assert.throws(()=>validateBackup(JSON.stringify(backup)),/invalid/);
  delete data.works[0].assetId;data.works.push({...data.works[0]});assert.throws(()=>validateData(data),/invalid/);
});
test('recovery pauses an interrupted session without accumulating closed-app time',()=>{
  const data=emptyData();data.active=beginSession({title:'Read',context:'mobile',blocks:[block()]},1000);data.active.runningSince=1000;accrue(data.active,5000);
  const recovered=validateData(data);assert.equal(recovered.active.runningSince,null);assert.equal(recovered.active.elapsedMs,4000);
});
test('mobile practice always has a meaningful input activity',()=>{
  assert.throws(()=>beginSession({title:'Free',context:'mobile',blocks:[block('free')]}),/piano/);
});
test('every target keeps its pitches, rhythms and visible range even on narrow keyboards',()=>{
  const options={clef:'treble',level:0,timeSig:'4/4',figures:{q:true,h:true,e:true},vis:{lo:28,hi:32,loMidi:60,hiMidi:67}};
  for(const target of TARGETS)for(const technique of [false,true])for(let phase=0;phase<3;phase++){
    const notes=generateTargetBars(options,target.id,technique,phase);
    assert.equal(notes.reduce((sum,n)=>sum+n.units,0),32);
    for(const note of notes){assert.ok(note.midi>=60&&note.midi<=67,`${target.id}: ${note.midi}`);assert.ok(target.notes.some(n=>n.letter===note.letter&&n.acc===note.acc),`${target.id}: pitch outside scale`);}
  }
  assert.equal(targetById('D-dorian').key,'C');assert.equal(targetById('A-natural').notes[6].acc,'');assert.equal(targetById('A-harmonic').notes[6].acc,'#');
});

test('two-hand technique preserves every scale and continues across generated chunks',()=>{
  for(const target of TARGETS){
    const notes=[0,2,4].flatMap(phase=>generateTargetBars({clef:'grand',timeSig:'4/4'},target.id,true,phase));
    for(let i=0;i<notes.length;i+=2){
      const [right,left]=notes.slice(i,i+2);
      assert.equal(right.clef,'treble');assert.equal(left.clef,'bass');
      assert.equal(right.midi-left.midi,12);assert.equal(right.start,left.start);
      assert.equal(right.bar,left.bar);assert.equal(right.units,4);
      assert.ok(target.notes.some(n=>n.letter===right.letter&&n.acc===right.acc),target.id);
      // Steps move by one degree; only the turning tonic repeats.
      if(i){const step=Math.abs(right.d-notes[i-2].d);assert.ok(step===1||step===0&&right.letter===target.notes[0].letter,target.id);}
    }
  }
});

test('two-hand technique survives session recovery and backup validation',()=>{
  const data=emptyData();
  data.active=beginSession({title:'Together',context:'midi',blocks:[block('technique',{hand:'both'})]});
  const recovered=validateBackup(JSON.stringify({format:'cuaderno-piano',version:1,data,assets:[],legacy:{}}));
  assert.equal(recovered.data.active.blocks[0].hand,'both');
});
