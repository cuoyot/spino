import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyData, block} from '../src/companion/model.js';
import {preparationMarkup, feedbackFields, readFeedback} from '../src/companion/views.js';
import {repertoireProgressMarkup} from '../src/companion/progress-learning.js';
import {setAppLanguage} from '../src/companion/locale.js';

test('single-block preparation retains allocation while showing only the total; real splits remain editable', () => {
  setAppLanguage('en');
  const data = emptyData(), single = {context:'piano',blocks:[block('reading',{minutes:240})]};
  const plain = preparationMarkup(single,'start',data);
  assert.match(plain, /type="hidden" name="minutes-0" value="240"/);
  assert.match(plain, /data-exact-max="600"/);
  const warm = preparationMarkup({...single,includeWarmup:true,warmupBlock:{kind:'free',minutes:3}},'start',data);
  assert.match(warm, /type="number" name="minutes-0"/);
  assert.match(warm, /data-exact-max="603"/);
  const multiple = preparationMarkup({...single,blocks:[...single.blocks,block('technique',{minutes:10})]},'plan',data);
  assert.match(multiple, /type="number" name="minutes-0"/);
  assert.match(multiple, /type="number" name="minutes-1"/);
});

test('compact finishing retains editable feedback and existing passage attribution', () => {
  const session = {title:'Evening routine',notes:'Keep this note',next:'Next passage',mood:4,workIds:['piece'],blockIndex:0,blocks:[block('repertoire',{workId:'piece',passage:'Bars 9–16'})]};
  const html = feedbackFields(session,[{id:'piece',title:'Original musical title'}],{compact:true});
  assert.ok(html.indexOf('class="cp-rating"') < html.indexOf('class="cp-feedback-details"'));
  assert.match(html, /Comments and notes/);
  assert.match(html, /Session details/);
  for (const name of ['title','mood','notes','next','workIds','part-0']) assert.ok(html.includes(`name="${name}"`),name);
  assert.match(html, /Bars 9–16/);
  const fields = new FormData();
  for (const [name,value] of [['title',session.title],['notes',session.notes],['next',session.next],['mood','4'],['workIds','piece'],['part-0','Bars 9–16']]) fields.append(name,value);
  assert.deepEqual(readFeedback(fields),{title:session.title,notes:session.notes,next:session.next,mood:4,workIds:['piece'],parts:['Bars 9–16']});
});

test('Progress uses a singular practice label in all five languages', () => {
  const data = emptyData();
  data.works=[{id:'piece',title:'Original title',stage:'En estudio'}];
  data.sessions=[{date:'2026-11-26',workIds:['piece'],results:[{block:block('repertoire',{workId:'piece'}),elapsedMs:60000}]}];
  try {
    for (const [lang,text] of [['en','1 practice'],['es','1 práctica'],['ca','1 pràctica'],['de','1 Übung'],['hu','1 gyakorlás']]) {
      setAppLanguage(lang);
      const html = repertoireProgressMarkup(data);
      assert.ok(html.includes(text),lang);
      assert.ok(!html.includes('2026-11-26'),lang);
      assert.ok(html.includes('Original title'),lang);
    }
  } finally { setAppLanguage('en'); }
});

test('a saved calendar date keeps the same displayed day across device time zones', () => {
  const previous = process.env.TZ, data = emptyData();
  data.works=[{id:'piece',title:'Piece',stage:'En estudio'}];
  data.sessions=[{date:'2026-11-26',workIds:['piece'],results:[]}];
  setAppLanguage('es');
  try {
    const views = ['UTC','America/Los_Angeles','Pacific/Kiritimati'].map(zone => {process.env.TZ=zone;return repertoireProgressMarkup(data);});
    assert.equal(views[0],views[1]);
    assert.equal(views[1],views[2]);
    assert.match(views[0],/26 nov 2026/);
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ=previous;
    setAppLanguage('en');
  }
});
