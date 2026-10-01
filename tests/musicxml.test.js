import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strToU8 } from 'fflate';
import { musicXMLFixture, mxlFixture } from './musicxml-fixture.js';
import { readMusicXML, bytesToBase64, SCORE_LIMITS } from '../src/companion/musicxml-document.js';
import { parseScore, analyzeSelection } from '../src/companion/musicxml-analysis.js';
import { boundaryContext, generateSegments } from '../src/companion/musicxml-segments.js';
import { processScore } from '../src/companion/library-pipeline.js';
import { digest } from '../src/companion/library.js';

test('MXL resolves container.xml instead of the first XML entry', () => {
  const parsed = readMusicXML(mxlFixture(), 'mxl'); assert.equal(parsed.rootfile, 'scores/piano.musicxml'); assert.match(parsed.xml, /score-partwise/);
  assert.equal(readMusicXML(strToU8(musicXMLFixture()), 'musicxml').rootfile, null);
});
test('score validation rejects HTML, timewise, malformed XML, entities, traversal and excessive decompression', () => {
  for (const xml of ['<html>error</html>', '<score-timewise/>', '<score-partwise><part-list></score-partwise>', '<!DOCTYPE x [<!ENTITY secret SYSTEM "file:///private">]><score-partwise>&secret;</score-partwise>']) assert.throws(() => readMusicXML(strToU8(xml), 'musicxml'));
  assert.throws(() => readMusicXML(mxlFixture(undefined, { '../outside': strToU8('x') }), 'mxl'), /Unsafe/);
  assert.throws(() => readMusicXML(mxlFixture(), 'mxl', { ...SCORE_LIMITS, maxInflated: 1000 }), /decompression/);
  assert.throws(() => readMusicXML(mxlFixture(), 'mxl', { ...SCORE_LIMITS, maxEntries: 1 }), /entries/);
});
test('written measures, pickups, key/meter changes, voices, ties, tuplets and cross-staff notes have independent features', () => {
  const score = parseScore(musicXMLFixture()), result = analyzeSelection(score, ['P']);
  const m = result.metrics;
  assert.deepEqual(score.parts.filter(p => p.pianoCandidate).map(p => p.id), ['P']);
  assert.equal(m.measure_count, 8); assert.equal(m.duration_quarter_notes, 27.5);
  assert.equal(m.lowest_note.midi, 48); assert.equal(m.highest_note.midi, 72);
  assert.equal(m.voice_count, 2); assert.equal(m.max_chord_notes, 2); assert.equal(m.max_simultaneous_notes, 2);
  assert.equal(m.tuplets_present, true); assert.ok(m.rhythm_values.includes('eighth:3:2'));
  assert.equal(m.accidentals.printed_count, 1); assert.equal(m.accidentals.courtesy_count, 1); assert.equal(m.accidentals.chromatic_pitch_count, 1);
  assert.deepEqual(m.key_signatures.map(k => k.fifths), [1,-1,0]); assert.ok(m.time_signatures.some(t => t.beats === '3+2'));
  assert.equal(m.hand_assignment, null); assert.equal(m.right_hand_range, null); assert.equal(m.sightreading_level, null); assert.equal(m.estimated_key, null);
  const reviewed = analyzeSelection(score, ['P'], { hands: { 'P:1': 'right', 'P:2': 'left' } }).metrics;
  assert.equal(reviewed.left_hand_range.highest.midi, 50); assert.equal(reviewed.right_hand_range.highest.midi, 72);
  assert.equal(analyzeSelection(score, ['V']).metrics.highest_note.midi, 84);
});
test('segments validate ownership/boundaries and recalculate metrics instead of inheriting parent totals', async () => {
  const bytes = mxlFixture(), sha256 = await digest(bytes), record = { piece_id: 'fixture', provenance: [] };
  const asset = { pieceId: 'fixture', sourceAssetId: 'fixture_asset', format: 'mxl', base64: bytesToBase64(bytes), sha256 };
  const result = await processScore(asset, record);
  assert.equal(result.analysis.status, 'complete'); assert.equal(result.segments.length, 3);
  const latter = result.segments.find(s => s.start_measure_index === 4 && s.end_measure_index_exclusive === 8);
  assert.equal(latter.analysis.metrics.measure_count, 4); assert.equal(latter.analysis.metrics.duration_quarter_notes, 16);
  assert.equal(latter.analysis.metrics.accidentals.printed_count, 0); assert.equal(latter.analysis.metrics.accidentals.chromatic_pitch_count, 0);
  assert.equal(latter.boundary_review_status, 'pending'); assert.notEqual(latter.status, 'ready');
  const score = parseScore(musicXMLFixture());
  assert.throws(() => analyzeSelection(score, ['P'], { start: 8, end: 9 })); assert.throws(() => analyzeSelection(score, ['P'], { start: 3, end: 3 }));
  assert.ok(boundaryContext(score, ['P'], 2, 4).context.cross_boundary_ties.length);
  await assert.rejects(generateSegments({ record, asset: { ...asset, pieceId: 'another' }, score, xml: musicXMLFixture(), analysis: result.analysis, selection: ['P'] }), /parent/);
});
