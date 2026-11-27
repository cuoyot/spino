import test from 'node:test';
import assert from 'node:assert/strict';
import {beginSession, block, finishBlock, emptyData, saveSession} from '../src/companion/model.js';
import {finishPracticePreview, finishPracticeSummaryMarkup, finishPracticeFields, finishPracticeTitle, applyFinishPieceEdits} from '../src/companion/finish-practice.js';
import {setAppLanguage} from '../src/companion/locale.js';

const works = [{id:'piece',title:'Prélude en do majeur'}];
function activePractice() {
  const active = beginSession({title:'Evening practice',context:'piano',blocks:[block('reading'),block('repertoire',{workId:'piece',passage:'Bars 9–16'}),block('free')]});
  active.elapsedMs = active.blockElapsedMs = 300123;
  finishBlock(active);
  active.elapsedMs += 120666;
  active.blockElapsedMs = 120666;
  active.notes = 'Keep this note';
  return active;
}

test('summary matches finalization without changing exact recorded time, active IDs or data', () => {
  const active = activePractice(), original = structuredClone(active);
  const preview = finishPracticePreview(active,{partial:true});
  assert.deepEqual(active,original);
  assert.equal(preview.elapsedMs,420789);
  assert.equal(preview.id,active.id);
  assert.equal(preview.status,'partial');
  assert.deepEqual(preview.results.map(r=>r.elapsedMs),[300123,120666]);
  const saved = saveSession(emptyData(),structuredClone(active),{partial:true});
  assert.deepEqual(preview.results,saved.results);
  assert.equal(preview.elapsedMs,saved.elapsedMs);
});

test('edited preview reflects total, title and passage while preserving the original', () => {
  const active = activePractice(), original = structuredClone(active);
  const preview = finishPracticePreview(active,{minutes:9,feedback:{title:'Reviewed <practice>',notes:'Edited note',parts:['Bars 17–24']}});
  assert.equal(preview.elapsedMs,540000);
  assert.equal(preview.results.reduce((sum,r)=>sum+r.elapsedMs,0),540000);
  assert.equal(preview.results[1].block.passage,'Bars 17–24');
  const html = finishPracticeSummaryMarkup(preview,works);
  assert.match(html,/9:00/);
  assert.match(html,/Reviewed &lt;practice&gt;/);
  assert.match(html,/Prélude en do majeur/);
  assert.match(html,/Bars 17–24/);
  assert.equal(preview.notes,"Edited note");
  assert.doesNotMatch(html,/<input/);
  assert.deepEqual(active,original);
});

test('review omits unplayed blocks and keeps corrections in their own sections', () => {
  setAppLanguage('en');
  const active = activePractice(), html = finishPracticeFields(active,works,true);
  const summary = html.slice(0,html.lastIndexOf('</section>'));
  assert.doesNotMatch(summary,/name=|<input|Free practice/);
  assert.match(summary,/data-finish-edit="piece-1"/);
  assert.match(summary,/data-finish-edit="title"/);
  assert.match(summary,/Keep this note/);
  assert.match(summary,/Set next steps/);
  assert.doesNotMatch(summary,/<details|<a |<summary|>Edit name<|>Edit time</);
  assert.equal((summary.match(/>Prélude en do majeur</g)||[]).length,1);
  for (const name of ['practicedMinutes','title','partial','notes','next','workIds']) assert.ok(html.includes(`name="${name}"`),name);

});

test('a zero-time session does not report unplayed activities as performed', () => {
  const active=beginSession({title:'Not started',context:'piano',blocks:[block('free'),block('reading')]});
  const html=finishPracticeSummaryMarkup(finishPracticePreview(active),works);
  assert.match(html,/0:00/);
  assert.doesNotMatch(html,/<li>/);
});

test('an unnamed practice gets a local time-of-day suggestion while planned titles are preserved', () => {
  const active = beginSession({title:'Reading',context:'piano',blocks:[block('reading')]}, new Date(2026,10,27,13).getTime());
  assert.equal(finishPracticeTitle(active),'Sight-reading · Midday');
  assert.equal(finishPracticeTitle({...active,planId:'plan',title:'My plan'}),'My plan');
});

test('correcting one recorded passage preserves its duration and the other results', () => {
  const session = finishPracticePreview(activePractice());
  const first = structuredClone(session.results[0]), time = session.elapsedMs;
  const result = session.results[1], id = result.block.id;
  result.measurement = {correct:3};
  applyFinishPieceEdits(session, new Map([[1,{workId:'piece',passage:'Bars 4–6'}]]));
  assert.deepEqual(result.measurement,{correct:3});
  applyFinishPieceEdits(session, new Map([[1,{workId:'study',passage:'Intro'}]]));
  assert.equal(result.block.id,id);
  assert.equal(result.elapsedMs,120666);
  assert.equal(result.measurement,null);
  assert.equal(session.blocks.find(b=>b.id===id).workId,'study');
  assert.equal(session.elapsedMs,time);
  assert.deepEqual(session.results[0],first);
});
