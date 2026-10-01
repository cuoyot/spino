# Data contract

## Language, identity and provenance

English is the base language for documentation, operational text and editorial labels. `library.json.base_language` is `en`. Preserve composer names, original titles, source paths and source-provided titles in their original form; translating these is not required to make English the base language. Additional UI languages should be separate localizations, not changes to stable IDs.

`piece_id` identifies a catalogue record, not a URL. `record_kind=work` represents a canonical work/exercise; `score_edition` represents an edition or transcription awaiting reconciliation. `canonical_work_id` stays `null` until the work is identified. Multiple editions may later point to one work after checking composer, opus, number, movement and content.

Do not merge records solely by title, key or filename. Do not count each edition as a new work. Keep user progress associated with works and/or editions according to the app's existing rules, and preserve it when rebuilding the catalogue.

`known_metadata` contains bibliographic facts or labels published by the source. `metadata_basis` explains their origin. `original_title=null` means only an editorial label is available. The Lieder corpus documents its directory conventions; composer names remain in “Last, First” order. A directory label is not a musical-analysis result.

`provenance[].evidence_id` references `provenance/evidence.json`. `fields` identifies supported fields; `source_record` identifies the original entry, number or path. Pedagogical priorities are editorial decisions for this package, not official grades.

## Availability

Keep independent state dimensions:

- `availability.status`: `catalogue_only → asset_located → downloaded → parsed → ready`; `blocked` represents an error or outstanding review.
- `availability.download_status`: acquisition execution state, `pending/running/complete/failed`.
- `analysis.status`: analysis execution state, `pending/running/complete/failed`.
- `rights.distribution_status`: `pending_review/approved/blocked`; record jurisdictions when approving.
- `pedagogy.verified_suitability`: `null` before review; `true/false` after checking instrumentation and intended use.

`playable` is derived from these states and must be recalculated. It requires a validated local score, a selected asset, completed analysis, verified suitability and approved rights for deployment. HTTP 200 is insufficient. A failure must not delete the record.

`assets=[]` means no specific file has been identified. The bibliographic page remains available through the evidence, but **is not a download URL**. Use `download_url=null` when an asset exists but its URL is unknown. `source_path` and `revision` describe the origin, not a local path.

`source.enabled` controls participation in automatic acquisition; `enabled_by_default` controls initial manifest loading. Enable both to activate OpenScore throughout the pipeline. Audit scripts may inspect optional manifests without enabling them in the app.

## Analysis results

Every `analysis.metrics` field initially contains `null`. Null never means zero, an empty result, C major, easy difficulty or both hands. An unsupported metric may remain null after analysis, with an explanation in `warnings`.

| Field | Required semantics |
|---|---|
| `measure_count` | Written measures aligned across parts; do not count the same measure once per staff or unfold repeats |
| `duration_quarter_notes` | Written duration in quarter-note units, accounting for pickups and divisions changes |
| `key_signatures` | Events per part/staff; retain nontraditional signatures instead of forcing a fifths value |
| `estimated_key` | Separate from the key signature; include method and confidence when estimated |
| `time_signatures` | Events including additive meters such as `3+2`; do not retain only the first |
| `lowest_note`, `highest_note` | Written `step/alter/octave` and sounding MIDI after transposition; MIDI can be fractional for microtones |
| Hand ranges | Require explicit or reviewed hand assignment; upper staff does not establish right hand |
| `accidentals.printed_count` | Printed accidental signs, distinct from chromatic notes |
| `accidentals.courtesy_count` | Identified courtesy accidentals; null if they cannot be distinguished |
| `accidentals.chromatic_pitch_count` | Attacks outside the active key signature under a versioned definition; count effective pitches, not just `<accidental>` tags |
| `voice_count` | Number of distinct `(part, voice)` streams in the selection, not maximum sounding-note count |
| `max_chord_notes` | Largest group of notes sharing an onset in one voice, distinct from combined hand simultaneity |
| `max_simultaneous_notes` | Maximum sounding polyphony across the selection, including overlapping durations |
| `max_melodic_leap_semitones` | Maximum leap within an identified voice; never arbitrarily join voices or chord extremes |
| `rhythm_values` | Normalized written values; preserve tuplets and dots |
| `note_density_per_quarter` | Note attacks divided by written quarter-note duration; document grace-note and tied-note treatment |
| `syncopation_ratio`, `hand_independence_score` | Versioned indicators from 0 to 1; null until implemented |
| `sightreading_score`, `sightreading_level` | Algorithm score from 0 to 100 and level label; not equivalent to conservatory grades |

Store `parser_version`, `algorithm_version`, timestamp and input SHA-256. Changes to score content, selected parts or algorithm invalidate the previous result. Store selection/configuration hashes in the app's execution records without rewriting original manifests.

No arbitrary difficulty formula is presented as a calibrated level. Extract features first, review samples with people, and version weights and thresholds. Until then, show “Level pending” and allow filtering by features that have actually been calculated.

## Segments

`segments/index.json` is deliberately empty. `examples/segment.pending.json` is a template with null boundaries, not evidence that particular measures exist.

Boundaries use **zero-based indices in written order**, with the interval `[start_measure_index, end_measure_index_exclusive)`. The first eight measures would be `[0,8)` only after verification. Preserve original measure labels in `source_measure_labels`; they may be `0`, `1a`, repeated or nonnumeric. Printed numbers and indices need not match.

An extracted segment requires an asset, source hash, boundaries, selected parts and initial context. A ready segment additionally requires boundary approval and its own completed analysis. Check `end > start`, boundaries within the parent, and asset ownership semantically; these relationships exceed standard JSON Schema.

`start_context` preserves key signatures, meter, clefs, transposition, divisions, tempo if available, pickup, cross-boundary ties and repeat context. It must support correct isolated rendering. Do not reuse whole-work metrics as segment metrics. Segments inherit provenance and licensing from the asset; check the parent record before publication.
