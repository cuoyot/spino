import test from 'node:test';
import assert from 'node:assert/strict';
import { block } from '../src/companion/model.js';
import { isRepertoirePreparation, togglePreparationPiece } from '../src/companion/repertoire-preparation.js';
import { practiceMinutes } from '../src/companion/practice-duration.js';
import { practiceWithWarmup } from '../src/companion/preparation-warmup.js';

test('multiple pieces share a fixed total while retaining settings, IDs and warm-up',()=>{
  const source={context:'piano',includeWarmup:true,warmupBlock:{kind:'free',minutes:3},blocks:[block('repertoire',{minutes:37})]};
  const one=togglePreparationPiece(source,{id:'one',passage:'Bars 1–8'});
  const two=togglePreparationPiece(one,{id:'two'});
  assert.equal(two.blocks[0].id,source.blocks[0].id);
  assert.equal(two.blocks[0].passage,'Bars 1–8');
  assert.deepEqual(two.blocks.map(b=>b.minutes),[19,18]);
  assert.equal(source.blocks[0].workId,'');
  assert.equal(practiceMinutes(practiceWithWarmup(two,{preferences:{}}).blocks),40);
  const remaining=togglePreparationPiece(two,{id:'one'});
  assert.equal(remaining.blocks[0].id,two.blocks[1].id);
  assert.equal(remaining.blocks[0].minutes,37);
  const empty=togglePreparationPiece(remaining,{id:'two'});
  assert.equal(empty.blocks[0].workId,'');assert.equal(practiceMinutes(empty.blocks),37);
});

test('selection never exceeds the available minutes or twenty pieces',()=>{
  const short={blocks:[block('repertoire',{minutes:1,workId:'one'})]};
  assert.equal(togglePreparationPiece(short,{id:'two'}),null);
  const full={blocks:Array.from({length:20},(_,i)=>block('repertoire',{minutes:2,workId:String(i)}))};
  assert.equal(togglePreparationPiece(full,{id:'extra'}),null);
});

// Repeated-piece and deliberately unassigned plans keep their full block editor.
test('existing custom plans remain editable without merging activity identities',()=>{
  assert.equal(isRepertoirePreparation({blocks:[block('repertoire')]}),true);
  assert.equal(isRepertoirePreparation({blocks:[block('repertoire',{workId:'one'}),block('repertoire',{workId:'one'})]}),false);
  assert.equal(isRepertoirePreparation({blocks:[block('repertoire',{workId:'one'}),block('repertoire')]}),false);
  assert.equal(isRepertoirePreparation({routinePolicy:{},blocks:[block('repertoire')]}),false);
});
