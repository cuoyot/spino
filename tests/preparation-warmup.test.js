import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData,block,beginSession,validateData,validateBackup} from '../src/companion/model.js';
import {warmupPreferences} from '../src/companion/warmups.js';
import {practiceWithWarmup,resizePreparationWarmup} from '../src/companion/preparation-warmup.js';
import {scalePianoKeys,scalePreviewMarkup} from '../src/companion/scale-preview.js';
import {TARGETS} from '../src/companion/curriculum.js';
import {preparationMarkup} from '../src/companion/views.js';
import {sessionMarkup} from '../src/companion/session-view.js';

test('optional warm-ups materialize every configured type without rewriting the practice',()=>{
  const data=emptyData(), source={title:'Piece',context:'piano',blocks:[block('repertoire',{target:null})]};
  assert.equal(warmupPreferences(data.preferences).enabled,false);
  assert.equal(practiceWithWarmup(source,data),source);
  for(const [kind,type] of Object.entries({free:'free',hanon:'warmup',reading:'reading',scales:'technique'})) {
    const configured={...source,includeWarmup:true,warmupBlock:{kind,minutes:4,target:'F#-harmonic',exercise:'hanon-7'}};
    const planned=practiceWithWarmup(configured,data);
    assert.equal(planned.blocks[0].type,type);assert.equal(planned.blocks[0].minutes,4);
    assert.equal(planned.blocks[0].target,kind==='hanon'?'hanon-7':'F#-harmonic');
    assert.deepEqual(planned.blocks[1],source.blocks[0]);assert.equal(source.blocks.length,1);
    assert.equal(practiceWithWarmup(planned,data),planned);
    const notebook={...data,active:beginSession(planned)};assert.ok(validateData(notebook));
    notebook.plans=[{...configured,id:'plan',date:'2026-11-09',time:'',status:'planned'}];
    const restored=validateBackup(JSON.stringify({format:'cuaderno-piano',version:1,data:notebook,assets:[]}));
    assert.deepEqual(restored.data.plans[0].warmupBlock,configured.warmupBlock);
  }
});

test('repertoire has its type before its content and omits the tempo in preparation and overview',()=>{
  const data=emptyData(),source={title:'Piece',context:'piano',blocks:[block('repertoire',{target:null})]};
  const markup=preparationMarkup(source,'start',data);
  assert.ok(markup.indexOf('name="type-0"')<markup.indexOf('data-practice-pieces'));
  assert.doesNotMatch(markup,/name="bpm-0"/);
  assert.match(markup,/name="include-warmup"\s*\/>/);
  assert.match(markup,/<fieldset disabled>/);
  data.active=beginSession(source);
  assert.doesNotMatch(sessionMarkup(data),/cp-session-tempo/);
});

test('warm-up consumes the selected total and returns its minutes when disabled',()=>{
  const data=emptyData(),source={context:'piano',includeWarmup:true,warmupBlock:{kind:'scales',minutes:3,target:'C-major',exercise:'rotate'},blocks:[block('repertoire',{minutes:10}),block('reading',{minutes:30})]};
  const resized=resizePreparationWarmup(source,data,40);
  assert.equal(resized.blocks.reduce((sum,b)=>sum+b.minutes,0),37);
  assert.deepEqual(resized.blocks.map(b=>b.id),source.blocks.map(b=>b.id));
  const longer=resizePreparationWarmup({...resized,warmupBlock:{...resized.warmupBlock,minutes:8}},data,40);
  assert.equal(longer.blocks.reduce((sum,b)=>sum+b.minutes,0),32);
  const off=resizePreparationWarmup({...longer,includeWarmup:false},data,40);
  assert.equal(off.blocks.reduce((sum,b)=>sum+b.minutes,0),40);
  assert.equal(off.warmupBlock.minutes,8);
  const short=resizePreparationWarmup(source,data,3);
  assert.equal(short.warmupBlock.minutes,1);assert.ok(short.blocks.every(b=>b.minutes===1));
  assert.equal(resizePreparationWarmup(source,data,2).includeWarmup,false);
  assert.deepEqual(source.blocks.map(b=>b.minutes),[10,30]);
});

test('static piano marks the real pitches, including enharmonic scale spellings',()=>{
  for(const target of TARGETS) {
    const keys=scalePianoKeys(target.id),marked=keys.filter(k=>k.marked);
    assert.equal(marked.length,8,target.id);assert.equal(marked.at(-1).midi-marked[0].midi,12,target.id);
    assert.deepEqual(marked.map(k=>k.degree),['I','II','III','IV','V','VI','VII','I']);
    assert.equal(marked[0].label,target.notes[0].label);
    assert.doesNotMatch(scalePreviewMarkup(target.id),/wg-figure|<ol>|<video/);
  }
  const raised=scalePianoKeys('F#-harmonic').find(key=>key.label==='E♯');
  assert.equal(raised.midi%12,5);assert.equal(raised.black,false);
  assert.equal(scalePianoKeys('Eb-natural').find(key=>key.midi===63).marked,true);
  assert.equal(scalePianoKeys('Eb-natural').find(key=>key.midi===64).marked,false);
});
