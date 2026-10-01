import { children, child, content, xmlDocument, serializeXML } from './musicxml-document.js';
import { analyzeScore, parseScore, selectionHash } from './musicxml-analysis.js';
import { digest } from './library.js';

function activeTies(measures) {
  const ties = new Set();
  for (const measure of measures) for (const note of [...measure.notes].sort((a, b) => a.onset - b.onset)) {
    const key = `${note.part}:${note.voice}:${JSON.stringify(note.pitch)}`;
    if (note.tiedStop) ties.delete(key);
    if (note.tiedStart) ties.add(key);
  }
  return [...ties];
}
export function boundaryContext(score, selection, start, end) {
  const contexts = {}, reasons = [];
  for (const id of selection) {
    const part = score.parts.find(p => p.id === id);
    if (!part || !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > part.measures.length || end <= start) throw new Error('Invalid written-order excerpt boundaries.');
    const initial = part.measures[start], last = part.measures[end - 1];
    const incoming = activeTies(part.measures.slice(0, start)), outgoing = activeTies(part.measures.slice(0, end));
    if (incoming.length || outgoing.length) reasons.push(`${id}: the cut crosses a sustained tie.`);
    if (initial.initial.tuplets.length || last.end.tuplets.length) reasons.push(`${id}: the cut crosses a tuplet group.`);
    if (part.measures.slice(start, end).some(m => m.notes.some(n => n.tuplet) && !m.xml.includes('<tuplet'))) reasons.push(`${id}: tuplet grouping is not explicit; boundary review is required.`);
    const repeatContext = part.measures.slice(0, end).flatMap(m => m.end.repeats).filter((v, i, a) => a.findIndex(x => JSON.stringify(x) === JSON.stringify(v)) === i);
    if (repeatContext.length) reasons.push(`${id}: review repeat/ending context before approving this excerpt.`);
    const active = initial.contexts.filter(c => c.offset === 0).at(-1)?.state || initial.initial;
    contexts[id] = { ...active, pickup: initial.implicit, cross_boundary_ties: { incoming, outgoing }, repeat_context: repeatContext };
  }
  const entries = Object.entries(contexts);
  const divisions = [...new Set(entries.map(([, c]) => c.divisions))];
  const tempos = [...new Set(entries.map(([, c]) => c.tempo?.quarter_bpm ?? null))];
  const clefs = entries.flatMap(([id, c]) => Object.entries(c.clefs).map(([staff, xml]) => { const node = xmlDocument(xml).documentElement; return { part_id: id, staff: Number(staff), sign: content(node, 'sign'), line: content(node, 'line') == null ? null : Number(content(node, 'line')), octave_change: Number(content(node, 'clef-octave-change') || 0) }; }));
  const transpositions = entries.flatMap(([id, c]) => Object.values(c.transposes).filter(t => t.chromatic != null).map(t => ({ part_id: id, chromatic: t.chromatic, diatonic: content(xmlDocument(t.xml).documentElement, 'diatonic') == null ? null : Number(content(xmlDocument(t.xml).documentElement, 'diatonic')), octave_change: t.octave })));
  const context = { key_signatures: entries.flatMap(([, c]) => Object.values(c.keys).filter(Boolean)), time_signatures: entries.flatMap(([, c]) => Object.values(c.times).filter(Boolean)), clefs: clefs.length ? clefs : null,
    divisions: divisions.length === 1 && Number.isInteger(divisions[0]) ? divisions[0] : null, transpositions: transpositions.length ? transpositions : null,
    tempo_bpm: tempos.length === 1 ? tempos[0] : null,
    pickup_quarter_notes: selection.some(id => score.parts.find(p => p.id === id).measures[start].implicit) ? Math.max(...selection.map(id => score.parts.find(p => p.id === id).measures[start].duration || 0)) : null,
    cross_boundary_ties: entries.flatMap(([, c]) => [...c.cross_boundary_ties.incoming, ...c.cross_boundary_ties.outgoing]), repeat_context: JSON.stringify(entries.map(([part_id, c]) => ({ part_id, events: c.repeat_context }))) };
  if (!context.key_signatures.length) context.key_signatures = null;
  if (!context.time_signatures.length) context.time_signatures = null;
  return { context, warnings: [...new Set(reasons)] };
}

export function excerptXML(xml, selection, start, end) {
  const doc = xmlDocument(xml), root = doc.documentElement;
  for (const part of children(root, 'part')) {
    if (!selection.includes(part.getAttribute('id'))) { root.removeChild(part); continue; }
    const measures = children(part, 'measure');
    if (start < 0 || end > measures.length || end <= start) throw new Error('Cannot extract unknown measure boundaries.');
    // Replay notation context at the first written measure without unfolding repeats.
    const inherited = new Map(); let direction = null;
    for (const measure of measures.slice(0, start)) for (const element of children(measure)) {
      if (element.localName === 'attributes') for (const value of children(element)) inherited.set(`${value.localName}:${value.getAttribute('number') || ''}`, value);
      if (element.localName === 'direction' && (child(element, 'sound')?.hasAttribute('tempo') || child(child(element, 'direction-type'), 'metronome'))) direction = element;
    }
    const first = measures[start], opening = children(first)[0];
    if (opening?.localName === 'attributes') for (const value of children(opening)) inherited.delete(`${value.localName}:${value.getAttribute('number') || ''}`);
    if (inherited.size) {
      const attributes = doc.createElement('attributes');
      for (const value of inherited.values()) attributes.appendChild(value.cloneNode(true));
      first.insertBefore(attributes, first.firstChild);
    }
    if (direction) first.insertBefore(direction.cloneNode(true), first.firstChild);
    measures.forEach((measure, index) => { if (index < start || index >= end) part.removeChild(measure); });
  }
  const list = child(root, 'part-list');
  for (const part of children(list)) if (part.localName === 'part-group' || part.localName === 'score-part' && !selection.includes(part.getAttribute('id'))) list.removeChild(part);
  return serializeXML(doc);
}

export async function generateSegments({ record, asset, score, xml, analysis, selection, hands = {}, lengths = [4, 8, 16], stride = 4 }) {
  if (asset.pieceId !== record.piece_id || analysis.status !== 'complete' || analysis.input_asset_id !== asset.sourceAssetId || analysis.input_sha256 !== asset.sha256) throw new Error('The parent analysis does not belong to this score edition.');
  const configHash = await selectionHash(selection, hands), segments = [];
  for (let start = 0; start < analysis.metrics.measure_count; start += stride) for (const length of lengths) {
    const end = start + length; if (end > analysis.metrics.measure_count) continue;
    const context = boundaryContext(score, selection, start, end);
    const excerpt = excerptXML(xml, selection, start, end), parsed = parseScore(excerpt);
    const independent = await analyzeScore({ score: parsed, assetId: asset.sourceAssetId, sha256: asset.sha256, selection, hands });
    independent.warnings.push(...context.warnings, 'Excerpt metrics were recalculated from extracted notation; input_sha256 identifies the original parent asset.');
    const id = `seg_${(await digest(`${record.piece_id}:${asset.sha256}:${configHash}:${start}:${end}`)).slice(0, 24)}`;
    segments.push({ schema_version: '2.0.0', segment_id: id, piece_id: record.piece_id, asset_id: asset.sourceAssetId, input_sha256: asset.sha256,
      status: 'extracted', measure_addressing: 'zero_based_written_order', start_measure_index: start, end_measure_index_exclusive: end,
      source_measure_labels: score.parts.find(p => p.id === selection[0]).measures.slice(start, end).map(m => m.label),
      part_selection: selection.map(id => { const part = score.parts.find(p => p.id === id); return { part_id: id, staves: [...new Set(part.measures.slice(start, end).flatMap(m => m.notes.map(n => n.staff)))], role: part.pianoCandidate ? 'piano' : 'other' }; }),
      start_context: context.context, boundary_review_status: 'pending', analysis: independent, provenance: structuredClone(record.provenance) });
  }
  return segments;
}
