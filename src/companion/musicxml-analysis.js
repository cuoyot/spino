import { child, children, content, serializeXML, xmlDocument } from './musicxml-document.js';
import { emptyMetrics } from './library-contract.js';
import { digest } from './library.js';
import { PARSER_VERSION, ALGORITHM_VERSION } from './analysis-versions.js';

const EPS = 1e-7;
const number = (text, fallback = null) => text == null || text === '' ? fallback : Number.isFinite(Number(text)) ? Number(text) : null;
const attrNumber = (node, name, fallback = null) => number(node?.getAttribute(name), fallback);
const fail = message => { throw new Error(message); };
const pitchClass = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const sorted = value => [...value].sort();
export const selectionConfiguration = (parts, hands = {}) => ({ part_selection: sorted(parts), hand_assignment: Object.fromEntries(Object.entries(hands).sort(([a], [b]) => a.localeCompare(b))) });
export const selectionHash = async (parts, hands = {}) => digest(JSON.stringify(selectionConfiguration(parts, hands)));

export function parseScore(xml) {
  const document = xmlDocument(xml), root = document.documentElement;
  if (root.localName !== 'score-partwise') fail('Only partwise scores can be analyzed.');
  const definitions = children(child(root, 'part-list'), 'score-part');
  const parts = [], ids = new Set(), warnings = new Set();
  for (const node of children(root, 'part')) {
    const id = node.getAttribute('id');
    if (!id || ids.has(id)) fail('Missing or duplicate score part ID.'); ids.add(id);
    const definition = definitions.find(d => d.getAttribute('id') === id);
    if (!definition) fail(`Part ${id} has no definition.`);
    const instruments = children(definition, 'score-instrument').map(n => ({ id: n.getAttribute('id'), name: content(n, 'instrument-name'), sound: content(n, 'instrument-sound') }));
    const name = content(definition, 'part-name');
    const piano = instruments.some(i => /^keyboard\.piano(?:\.|$)/i.test(i.sound || '') || /^(?:piano|grand piano|acoustic grand piano)$/i.test(i.name || '')) || /^(?:piano|pianoforte)$/i.test(name || '');
    const state = { divisions: null, keys: {}, times: {}, clefs: {}, transposes: {}, tempo: null, staves: null, repeats: [], tuplets: [] };
    const measures = [];
    for (const [index, measure] of children(node, 'measure').entries()) {
      let cursor = 0, maximum = 0, last = null;
      const notes = [], keys = [], times = [], contexts = [], initial = structuredClone(state);
      const label = measure.getAttribute('number') || '';
      let timingKnown = true;
      for (const item of children(measure)) {
        if (item.localName === 'attributes') {
          const divisions = content(item, 'divisions');
          if (divisions != null) { state.divisions = number(divisions); if (!(state.divisions > 0)) fail(`${id}, measure ${label}: invalid divisions.`); }
          if (content(item, 'staves') != null) state.staves = number(content(item, 'staves'));
          for (const key of children(item, 'key')) {
            const staff = attrNumber(key, 'number'), fifths = number(content(key, 'fifths'));
            const event = { part_id: id, staff, measure_index: index, fifths, mode: content(key, 'mode'), nontraditional: fifths == null ? serializeXML(key) : null };
            keys.push({ ...event, offset: cursor }); state.keys[staff || 'all'] = event;
          }
          for (const time of children(item, 'time')) {
            const staff = attrNumber(time, 'number'), beats = children(time, 'beats'), types = children(time, 'beat-type');
            if (!beats.length || beats.length !== types.length) { warnings.add('Senza misura or unsupported meter: meter-dependent indicators remain unknown.'); state.times[staff || 'all'] = null; }
            else for (let i = 0; i < beats.length; i++) {
              const beatType = number(types[i].textContent);
              if (!(beatType > 0)) fail('Invalid meter denominator.');
              const event = { part_id: id, staff, measure_index: index, beats: beats[i].textContent.trim(), beat_type: beatType };
              times.push({ ...event, offset: cursor }); state.times[staff || 'all'] = event;
            }
          }
          for (const clef of children(item, 'clef')) state.clefs[attrNumber(clef, 'number', 1)] = serializeXML(clef);
          for (const transpose of children(item, 'transpose')) state.transposes[attrNumber(transpose, 'number') || 'all'] = { chromatic: number(content(transpose, 'chromatic')), octave: number(content(transpose, 'octave-change'), 0), double: !!child(transpose, 'double'), xml: serializeXML(transpose) };
          contexts.push({ offset: cursor, state: structuredClone(state) });
          if (child(item, 'measure-style')) warnings.add('Measure styles are preserved; repeat expansion and hidden repeated material are not analyzed.');
        } else if (item.localName === 'direction') {
          const sound = child(item, 'sound'), tempo = attrNumber(sound, 'tempo');
          const metro = child(child(item, 'direction-type'), 'metronome');
          if (tempo != null) state.tempo = { quarter_bpm: tempo, marking: metro ? serializeXML(metro) : null };
          else if (metro) state.tempo = { quarter_bpm: null, marking: serializeXML(metro) };
        } else if (item.localName === 'backup' || item.localName === 'forward') {
          const duration = number(content(item, 'duration'));
          if (!(state.divisions > 0) || !(duration > 0)) fail(`${id}, measure ${label}: duration/divisions missing.`);
          cursor += (item.localName === 'backup' ? -1 : 1) * duration / state.divisions;
          if (cursor < -EPS) fail(`${id}, measure ${label}: backup precedes the measure.`);
          cursor = Math.max(0, cursor); maximum = Math.max(maximum, cursor); last = null;
        } else if (item.localName === 'note') {
          const grace = !!child(item, 'grace'), chord = !!child(item, 'chord'), rest = !!child(item, 'rest');
          const rawDuration = number(content(item, 'duration'));
          if (!grace && (!(rawDuration > 0) || !(state.divisions > 0))) fail(`${id}, measure ${label}: note duration/divisions missing.`);
          const duration = grace ? 0 : rawDuration / state.divisions;
          const voice = content(item, 'voice') || '1', staff = number(content(item, 'staff'), 1);
          if (!Number.isInteger(staff) || staff < 1) fail('Invalid staff number.');
          if (chord && (!last || last.voice !== voice || last.rest)) fail('Chord without a preceding note in the same voice.');
          const onset = chord ? last.onset : cursor;
          const pitch = child(item, 'pitch'), transpose = state.transposes[staff] || state.transposes.all;
          let tone = null;
          if (pitch) {
            const step = content(pitch, 'step'), alter = number(content(pitch, 'alter'), 0), octave = number(content(pitch, 'octave'));
            if (!(step in pitchClass) || alter == null || !Number.isInteger(octave)) fail('Invalid written pitch.');
            const transposition = transpose ? transpose.chromatic == null || transpose.double ? null : transpose.chromatic + transpose.octave * 12 : 0;
            tone = { step, alter, octave, midi: transposition == null ? null : 12 * (octave + 1) + pitchClass[step] + alter + transposition };
            if (transposition == null) warnings.add('Unsupported transposition: sounding ranges remain unknown.');
          } else if (!rest) warnings.add('Unpitched or unsupported note: pitch-dependent metrics remain unknown.');
          const accidental = child(item, 'accidental'), modification = child(item, 'time-modification');
          const ties = children(item, 'tie').map(t => t.getAttribute('type'));
          const tupletNodes = children(child(item, 'notations'), 'tuplet');
          for (const t of tupletNodes) {
            const token = `${voice}:${t.getAttribute('number') || '1'}`;
            if (t.getAttribute('type') === 'start') state.tuplets.push(token);
            if (t.getAttribute('type') === 'stop') state.tuplets = state.tuplets.filter(x => x !== token);
          }
          const note = { part: id, measure: index, label, onset, duration, voice, staff, pitch: tone, rest, grace, chord,
            tiedStart: ties.includes('start'), tiedStop: ties.includes('stop'),
            accidental: accidental ? { value: accidental.textContent, courtesy: accidental.getAttribute('cautionary') === 'yes' || accidental.getAttribute('editorial') === 'yes', explicit: accidental.hasAttribute('cautionary') || accidental.hasAttribute('editorial') } : null,
            key: structuredClone(state.keys[staff] || state.keys.all || null),
            type: content(item, 'type'), dots: children(item, 'dot').length,
            tuplet: modification ? { actual: number(content(modification, 'actual-notes')), normal: number(content(modification, 'normal-notes')), normalType: content(modification, 'normal-type') } : null,
            cue: !!child(item, 'cue') };
          notes.push(note); last = note;
          if (!chord) cursor += duration;
          maximum = Math.max(maximum, onset + duration, cursor);
        } else if (item.localName === 'barline') {
          for (const n of children(item)) if (['repeat', 'ending'].includes(n.localName)) state.repeats.push({ measure_index: index, xml: serializeXML(n) });
        }
      }
      if (!notes.length && maximum === 0) { timingKnown = false; warnings.add('Empty measure without duration: duration-dependent metrics remain unknown.'); }
      measures.push({ index, label, implicit: measure.getAttribute('implicit') === 'yes', duration: timingKnown ? maximum : null, notes, keys, times, initial, contexts, end: structuredClone(state), xml: serializeXML(measure) });
    }
    if (!measures.length) fail(`Part ${id} has no written measures.`);
    parts.push({ id, name, instruments, pianoCandidate: piano, measures, staves: state.staves, voices: sorted(new Set(measures.flatMap(m => m.notes.map(n => n.voice)))) });
  }
  if (!parts.length) fail('The score contains no parts.');
  const identification = child(root, 'identification');
  return { parts, warnings: [...warnings], credits: [...children(identification, 'creator').map(n => ({ type: n.getAttribute('type') || null, text: n.textContent })), ...children(identification, 'rights').map(n => ({ type: 'rights', text: n.textContent })), ...children(root, 'credit').map(n => ({ type: 'credit', text: n.textContent }))] };
}

function signatureAlter(key, step) {
  if (!key || key.fifths == null || !Number.isInteger(key.fifths) || Math.abs(key.fifths) > 7) return null;
  const order = key.fifths < 0 ? 'BEADGCF' : 'FCGDAEB';
  return order.slice(0, Math.abs(key.fifths)).includes(step) ? Math.sign(key.fifths) : 0;
}
const pitchValue = n => n.pitch?.midi;
const range = notes => {
  if (!notes.length || notes.some(n => pitchValue(n) == null)) return null;
  const ordered = [...notes].sort((a, b) => pitchValue(a) - pitchValue(b));
  return { lowest: ordered[0].pitch, highest: ordered.at(-1).pitch };
};
export function analyzeSelection(score, selection, { start = 0, end, hands = {} } = {}) {
  if (!Array.isArray(selection) || !selection.length || new Set(selection).size !== selection.length) fail('Select at least one distinct score part.');
  const parts = selection.map(id => score.parts.find(p => p.id === id) || fail(`Unknown score part: ${id}`));
  const count = parts[0].measures.length;
  if (parts.some(p => p.measures.length !== count)) fail('Selected parts have unaligned measure counts; review alignment before analysis.');
  end ??= count;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > count || end <= start) fail('Excerpt boundaries are outside the validated written score.');
  const streams = new Set(parts.flatMap(p => p.voices.map(v => `${p.id}:${v}`)));
  for (const [stream, hand] of Object.entries(hands)) if (!streams.has(stream) || !['left', 'right'].includes(hand)) fail('Hand assignment must identify an existing part/voice stream.');
  const warnings = new Set(score.warnings), metrics = emptyMetrics();
  const durations = Array.from({ length: end - start }, (_, i) => { const d = parts.map(p => p.measures[start + i].duration); return d.includes(null) ? null : Math.max(...d); });
  const total = durations.includes(null) ? null : durations.reduce((sum, n) => sum + n, 0);
  const offsets = []; let offset = 0; for (const duration of durations) { offsets.push(offset); offset += duration || 0; }
  const notes = parts.flatMap(p => p.measures.slice(start, end).flatMap(m => m.notes.map(n => ({ ...n, absolute: offsets[m.index - start] + n.onset }))));
  const sounding = notes.filter(n => !n.rest && !n.cue), attacks = sounding.filter(n => !n.grace && !n.tiedStop);
  const extent = range(sounding);
  metrics.measure_count = end - start; metrics.duration_quarter_notes = total;
  metrics.lowest_note = extent?.lowest || null; metrics.highest_note = extent?.highest || null;
  metrics.hand_assignment = Object.keys(hands).length ? { method: 'reviewed', confidence: null, notes: JSON.stringify(hands) } : null;
  for (const hand of ['left', 'right']) metrics[`${hand}_hand_range`] = range(sounding.filter(n => hands[`${n.part}:${n.voice}`] === hand));
  if (!Object.keys(hands).length) warnings.add('Hands are unassigned; staff and clef are not hand assignments.');
  metrics.key_signatures = []; metrics.time_signatures = [];
  for (const part of parts) for (const [field, stateField] of [['key_signatures', 'keys'], ['time_signatures', 'times']]) {
    const measures = part.measures.slice(start, end);
    const firstEvents = measures[0][stateField];
    if (start > 0) for (const inherited of Object.values(measures[0].initial[stateField]).filter(Boolean)) {
      if (!firstEvents.some(e => e.offset === 0 && (e.staff === inherited.staff || e.staff == null))) metrics[field].push({ ...inherited, measure_index: 0 });
    }
    for (const measure of measures) for (const event of measure[stateField]) { const { offset: ignored, ...value } = event; metrics[field].push({ ...value, measure_index: measure.index - start }); }
  }
  if (!metrics.key_signatures.length) metrics.key_signatures = null;
  if (!metrics.time_signatures.length) metrics.time_signatures = null;
  const chromatic = attacks.map(n => n.pitch ? signatureAlter(n.key, n.pitch.step) : null);
  if (!chromatic.includes(null)) metrics.accidentals = { printed_count: sounding.filter(n => n.accidental).length, courtesy_count: sounding.some(n => n.accidental && !n.accidental.explicit) ? null : sounding.filter(n => n.accidental?.courtesy).length, chromatic_pitch_count: attacks.filter((n, i) => n.pitch.alter !== chromatic[i]).length, definition_version: 'signature-attacks-1' };
  else warnings.add('Missing/nontraditional signature or unsupported pitch: chromatic accidental metrics remain unknown.');
  metrics.voice_count = new Set(notes.map(n => `${n.part}:${n.voice}`)).size;
  const groups = new Map();
  for (const note of sounding.filter(n => !n.grace)) { const key = `${note.part}:${note.voice}:${note.absolute.toFixed(7)}`; const group = groups.get(key) || []; group.push(note); groups.set(key, group); }
  metrics.max_chord_notes = [...groups.values()].reduce((max, group) => Math.max(max, group.length), 0);
  const events = sounding.filter(n => !n.grace).flatMap(n => [[n.absolute, 1], [n.absolute + n.duration, -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let active = 0, maximum = 0; for (const [, change] of events) { active += change; maximum = Math.max(maximum, active); }
  metrics.max_simultaneous_notes = total == null ? null : maximum;
  let leap = null;
  for (const stream of streams) {
    const melody = [...groups.values()].filter(g => `${g[0].part}:${g[0].voice}` === stream).sort((a, b) => a[0].absolute - b[0].absolute);
    for (let i = 1; i < melody.length; i++) if (melody[i].length === 1 && melody[i - 1].length === 1 && pitchValue(melody[i][0]) != null && pitchValue(melody[i - 1][0]) != null) leap = Math.max(leap ?? 0, Math.abs(pitchValue(melody[i][0]) - pitchValue(melody[i - 1][0])));
  }
  metrics.max_melodic_leap_semitones = leap;
  if ([...groups.values()].some(g => g.length > 1)) warnings.add('Melodic leaps use adjacent monophonic onsets only; chord voice-leading is not inferred.');
  metrics.rhythm_values = notes.some(n => !n.type) ? null : sorted(new Set(notes.map(n => `${n.grace ? 'grace:' : ''}${n.type}${'.'.repeat(n.dots)}${n.tuplet ? `:${n.tuplet.actual}:${n.tuplet.normal}` : ''}`)));
  metrics.tuplets_present = notes.some(n => n.tuplet != null);
  metrics.note_density_per_quarter = total > 0 ? attacks.length / total : null;
  warnings.add('Written-order features exclude cue notes, count chord pitches separately and exclude grace/tied-continuation notes from attack density. Repeats are not unfolded.');
  warnings.add('Estimated tonality, syncopation, hand independence and calibrated difficulty are not implemented; those metrics remain null.');
  return { metrics, warnings: [...warnings], selection: sorted(selection), start, end };
}

export async function analyzeScore({ score, assetId, sha256, selection, hands = {}, start = 0, end }) {
  const result = analyzeSelection(score, selection, { start, end, hands });
  return { status: 'complete', parser_version: PARSER_VERSION, algorithm_version: ALGORITHM_VERSION, input_asset_id: assetId, input_sha256: sha256, computed_at: new Date().toISOString(), error: null, metrics: result.metrics, warnings: result.warnings };
}
