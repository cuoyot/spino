import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupHeaderLines, suggestScoreDetails, suggestTempo } from '../src/companion/score-metadata.js';

const row = (text, x, y, h = .02, w = .25, confidence) => ({ text, x, y, h, w, confidence });
test('score headers separate a centred title, catalogue reference and composer from musical directions', () => {
  const result = suggestScoreDetails([
    row('Nocturne', .35, .06, .04, .3), row('Op. 9 No. 2', .4, .11, .02),
    row('Frédéric Chopin (1810–1849)', .65, .16), row('Andante espressivo', .07, .22),
    row('Piano', .04, .27), row('Arranged by Jane Smith', .65, .20),
  ], { Author: 'Music Typesetter', Title: 'Untitled' });
  assert.deepEqual(result, { title: 'Nocturne · Op. 9 No. 2', composer: 'Frédéric Chopin', bpm: null, tempoMark: 'Andante espressivo' });
});
test('PDF words are grouped without joining opposite sides of the header', () => {
  const lines = groupHeaderLines([row('J. S.', .64, .15, .02, .065), row('Bach', .72, .15, .02, .07), row('Andante', .1, .15)]);
  assert.equal(lines.length, 2); assert.ok(lines.some(line => line.text === 'J. S. Bach'));
});
test('explicit labels and cover-page names are accepted; credits, notes and low-confidence OCR are not', () => {
  assert.deepEqual(suggestScoreDetails([row('Título: Pequeño vals', .12, .05), row('Compositor: Albéniz', .12, .1)]), { title: 'Pequeño vals', composer: 'Albéniz', bpm: null, tempoMark: '' });
  assert.deepEqual(suggestScoreDetails([row('Arabesque', .33, .08, .04), row('Claude Debussy', .36, .14)]), { title: 'Arabesque', composer: 'Claude Debussy', bpm: null, tempoMark: '' });
  assert.deepEqual(suggestScoreDetails([row('Allegro', .1, .2), row('o o o o', .1, .3), row('Copyright Jane Smith', .5, .35), row('Invented title', .35, .1, .04, .3, 30)], { Title: 'Microsoft Word', Author: 'MuseScore' }), { title: '', composer: '', bpm: null, tempoMark: 'Allegro' });
});
test('printed numeric tempo is suggested without inventing BPM for words, dates or catalogue numbers', () => {
  for (const text of ['♩ = 80', '𝅘𝅥 = 80', 'Allegro (♩ = 80)', '♪ = 80', 'M.M. 80', 'Tempo: 80', '80 BPM', 'J = 80']) {
    assert.deepEqual(suggestTempo([row(text, .1, .2)]), { bpm: 80, tempoMark: text });
  }
  assert.deepEqual(suggestTempo([row('Andante', .1, .2), row('Op. 80', .3, .1), row('(1810–1849)', .7, .2)]), { bpm: null, tempoMark: 'Andante' });
  for (const text of ['♩ = 80–96', '♩ = 200']) assert.deepEqual(suggestTempo([row(text, .1, .2)]), { bpm: null, tempoMark: text });
  assert.equal(suggestScoreDetails([row('Nocturne', .35, .08, .04), row('♩ = 80', .1, .2)]).bpm, 80);
  assert.equal(suggestTempo([row('1=96', .1, .2, .02, .1, 82)]).bpm, 96);
  assert.equal(suggestTempo([row('1=96', .1, .2)]).bpm, null, 'only OCR receives the ambiguous stem fallback');
});
