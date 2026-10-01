# Integration pipeline

## 1. Import the catalogue

Read `library.json`, check the schema version, validate manifests and upsert by `piece_id`. Import must be idempotent and transactional per manifest. Report inserted, updated, skipped and failed records. An empty `assets` array never justifies discarding a bibliographic record.

Keep source data and input snapshots. Merge execution results through a separate persisted state layer. Reimporting a pending snapshot must not erase completed analyses, local scores, human reviews or user progress.

Use English for default UI states, errors and editorial labels. Preserve original source titles and names. Additional languages belong in the app's localization layer; do not use translated text as an identifier.

## 2. Resolve and acquire assets

Prioritize the 55 piano MXL candidates for technical pipeline checks without assuming their individual licenses are approved. For the main repertoire, locate a permitted edition of each work/number, attach it to the canonical ID and record evidence. If only a PDF is available, retain it as a reference and create a reviewed transcription/OMR task; do not treat it as MusicXML.

Use only non-null `assets[].download_url` values and enabled sources. Raw endpoints are pinned to observed blob paths and commits. Do not fill gaps by constructing expected filenames. Inventories allow offline inspection of the observations.

Use bounded download limits and retries, respect 429/Retry-After, and record final URL, status, timestamp, actual size and SHA-256. Write to a temporary file and rename atomically. A failed update must not overwrite the only valid copy. An HTML error response with status 200 is not a score.

The default host allowlist includes `raw.githubusercontent.com`. When adding a source, add only its specifically observed host. Check redirect targets, content limits and paths. Frontend downloads may fail due to CORS; use an ingestion/build/backend process appropriate for the app.

## 3. Validate and normalize

For MXL, read `META-INF/container.xml` to find the score; do not open the first XML file in the ZIP. Reject paths escaping the output directory and excessive decompression. Disable XML external entities and network access. Support partwise scores; explicitly convert or reject timewise when the selected library does not support it. Preserve the original.

Technical reference: [MusicXML 4.0 — Compressed MXL files](https://www.w3.org/2021/06/musicxml40/tutorial/compressed-mxl-files/).

If MSCX/MSCZ assets are added later, convert using an available MuseScore exporter and record tool version and before/after hashes. Conversion does not automatically resolve rights, transcription errors or hand assignments.

## 4. Select parts, analyze and review

Detect instruments, parts and staves, and preserve voices. Do not select tracks by fixed position. A two-staff piano score can be one part; hands may cross staves. For Lieder, select only verified piano parts and exclude the voice from piano ranges and scoring. If compatible piano material cannot be identified, mark it unsuitable while retaining its catalogue record.

Handle `backup`, `forward`, `chord`, `divisions`, ties, rests, grace notes, tuplets, repeats, clef/key/meter changes and transposition. Distinguish written notes, attacks and sounding notes. If a structure is unsupported, leave dependent metrics pending and explain why.

Calculate the features defined in `DATA_CONTRACT.md`. Do not invent values to satisfy app filters. Difficulty requires an explicit versioned algorithm. “Exercise 1” and a filename containing “easy” do not establish a level.

## 5. Generate segments

After parent analysis, propose windows of 4, 8 and 16 measures. `stride_measures=4` configures proposals; it is not a guarantee of musically suitable boundaries. Validate starts/ends, pickups, ties and repeats. Avoid excerpts that begin with contextless sustained notes or split a tuplet group.

Record written-order indices, source labels, selected parts and initial context. Render a sample and recalculate all features for each segment. Preserve failures as rejected or pending, never ready.

## 6. Publish playable content

Check the correct asset, current analysis, suitable part selection, valid rendering and composition/edition rights for the app's jurisdictions. Store credits and license information on the record and in exports. Only then set `playable=true`.

Rights approval is pipeline data, not a confirmation required to display the catalogue. Show a pending-review state and retain reasons; do not ask the user to approve all files blindly.

## Expansion

OpenScore is already enumerated as an optional corpus with 1,462 actual MXL paths. PDMX is configured as a future source without speculative records. Before adding it, resolve a specific release and its index; apply `no_license_conflict`, valid-file, piano, identity and deduplication filters. The extraction software's license does not transfer to scores.
