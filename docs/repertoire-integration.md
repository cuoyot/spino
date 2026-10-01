# Repertoire integration

Implemented on 2026-09-30 for SPino 5.0.0. The package remains in `Exercises_Library`; no catalogue service or new infrastructure is required.

## Using the library

### Current personal-practice flow

The library now opens on **scores with an actual file or enabled download**, rather than the first page of bibliographic references. Its MusicXML view contains the 55 candidate editions on a clean installation; the PDF tab contains ten directly downloadable Mutopia editions. The 563 reference-only works remain accessible under **Research** and through the all-records filter. They are a source-discovery backlog, not hundreds of usable exercises. Their stable IDs, metadata and any existing progress are retained.

For personal, full-score practice, download a MusicXML edition and let the existing validation and analysis finish. **Practice** becomes available when the score is valid and the piano selection is identified or explicitly chosen by the user. For unnamed instruments, select the parts once; that choice is bound to the asset hash and analysis configuration and does not create an editorial suitability approval. It does not require the user to complete a licensing form, enable a test override, or open and close a preview first. Actual score opening still checks its hash and renders it; opening failures pause a running session. A rejected suitability review, invalid score, stale analysis or a missing part selection remains a concrete blocker. Manual practice does not grade MIDI or promise automatic score following.

`manualPracticeState` serves this local practice flow. The stricter `practiceState` remains for editorial/distribution and excerpt workflows. No rights approval, difficulty grade, hand assignment, preview success or segment approval is fabricated. Existing review records and the legacy `personalTesting` preference are preserved, with editorial tools under a secondary disclosure. UI counts distinguish manual preparation from stricter editorial readiness.

PDF scores can be downloaded, annotated and used in a practice without MusicXML analysis. The eight newly checked editions are Burgmüller Op.100 Nos.1–6, Bach BWV772 and Schumann Op.15 No.1. See [edition evidence and live-download checks](catalogue-sources.md). New downloaded PDF assets retain editor, license URL, edition and source-check evidence alongside the runtime hash. The PDF catalogue remains separate from the 618 manifest records; these numbers are not a unique-work total.

The older sections below document earlier integration stages. Their requirement for a separate preview/rights approval before ordinary manual practice has been superseded by this flow. Network, foreground, opt-in acquisition, stable IDs and annotation-preservation policies are unchanged. [Musora integration](musora-integration.md) records the provider-dependent limits separately.

Verification of this flow passed **184 automated tests**, with the optional live catalogue test skipped in the full run and passed separately against the source URLs. The package validator passed all 13 manifests. Browser coverage includes first-use download to practice with no reviews, explicit choice of unnamed parts, preserved preparation drafts, rejected selections, corrupt-file opening that pauses the session, and phone/tablet layouts.

The rebuilt APK was installed over the existing emulator app. Its catalogue reported 618 manifest records and 51 editions prepared for manual practice, plus ten separate PDF download entries. Native diagnostics fetched a genuine 64,659-byte Burgmüller PDF and a 4,745-byte MXL, checked their hashes, and rendered the MXL. These diagnostic bytes stayed in memory: zero new notebook assets, analyses or segments were installed by the diagnostic. Existing works, assets, annotations and sessions were unchanged. Android Back, catalogue filters and preparation-draft preservation passed; no frontend exceptions were reported.

### Personal testing override and visible acquisition

The catalogue now exposes **Show downloadable scores**, direct download buttons and an explicit **Download candidate piano editions** batch action. The latter queues missing editions from the 55 piano candidates only; it never includes optional accompaniment, replaces an existing local asset, or changes Wi-Fi/foreground policies. Failed transfers remain visible and do not remove catalogue records.

Acquisition analyzes the full score without generating excerpts. **Analyze parts and excerpts** explicitly performs independent excerpt analysis later. Full-score practice therefore does not wait for hundreds of repeated excerpt parses on a long edition. The parent analysis, validation and rendering requirements still apply.

**Personal testing: skip rights review** is an opt-in local setting. It allows manual testing without a composition/edition rights approval. In this mode, validated explicitly identified piano parts can be used without a manual suitability form, but a current unsuitable review still blocks them. Unknown parts still require selection/review. Current musical analysis and successful rendering of the exact asset/selection remain mandatory. The UI labels this readiness as personal testing; rights metadata, evidence, hashes and reviews remain unchanged. Turning the setting off restores the normal review gates. No excerpt boundary approvals or distribution approvals are inferred from this mode.

With an updated Android emulator running, `node scripts/prepare-personal-catalogue.mjs` explicitly enables personal testing, requests the candidate batch through the app UI, and previews each analyzed score. It preserves existing works, sessions and attachments, leaves acquired files in the local notebook, and writes counts/failures to `artifacts/repertoire/personal-test-report.json`. This is a state-changing preparation command, unlike the older read-only diagnostics. It stops if the network policy requires Wi-Fi and never enables cellular data itself.

Open **Mi piano → Biblioteca**. The new catalogue uses English labels while the existing Spanish notebook and reviewed PDF translations remain intact. Search composer, collection, title or number, and expand Filters for groups, availability, unknown level, analyzed signature and measured melodic leap. All records stay browsable even without a score. Details explain each practice blocker.

The default catalogue contains **618 records: 563 canonical works and 55 candidate piano editions**. Enabling optional OpenScore accompaniment also enables its acquisition source and adds **1,462 edition records**, giving **2,080**, without downloading anything. These editions are not an additional count of unique compositions. The two reviewed Mutopia PDFs remain a separate section with their original IDs and download behavior.

From a record, explicitly download its observed MXL or attach a local MusicXML/MXL/reference PDF. Local attachments retain the same catalogue ID. PDFs remain reference material requiring reviewed transcription/OMR for musical analysis; Open reference PDF uses the existing annotation editor. Neither header OCR nor a PDF attachment creates note data. The discovery queue includes canonical works without acquired musical editions, including Czerny, Chaulieu Jr., Clementi, Bach, Burgmüller, Schumann, Duvernoy, Tchaikovsky and Gurlitt.

A validated edition exposes part selection, analysis, preview, suitability review and per-edition rights review. Initial piano candidates come from explicit instrument/part labels, never track positions. Confirm the parts against notation. Hands remain unknown unless a reviewer assigns verified part/voice streams. Accompaniment excludes unselected vocal parts. Rights reviews record composition evidence, edition/transcription evidence, credits, reviewer, jurisdiction and exact asset hash. Source-wide public-domain or CC0 claims do not automatically approve a file.

Outside personal testing, **Practice** enables only with a local validated asset, current analysis, approved piano suitability, approved composition/edition rights and successful rendering for the same hash/selection. It starts a manual repertoire session with an offline MusicXML viewer, floating timer, pause, zoom and page-height navigation. It does not grade MIDI performance. Unknown musical targets stay null when creating a work/session. A preview is an inspection tool, not evidence of distribution permission.

Excerpt proposals have separate preview and boundary review. Cuts across ties or unresolved tuplets cannot be approved. Repeat/ending context requires inspection. Proposal generation never automatically approves boundaries. This version offers excerpt review; scheduling an excerpt as a standalone practice block is not implemented.

## Local storage and compatibility

`library.js` traverses `library.json`, checks JSON Schema, file hashes, identity, group/count, duplicate IDs and source/evidence references, and commits each changed manifest transactionally. Errors identify the manifest and retain its previous snapshot. Reports distinguish inserted, updated, unchanged and failed records. General import has no asset, format, analysis or playable filter.

Input snapshots and execution results are separate under `state['repertoire-library-v2']` in the existing `cuaderno-piano` IndexedDB database. No database version change or destructive migration is used. Reimport updates English editorial labels by stable v2 ID without resetting downloaded assets, analysis or human reviews. Disabled optional records remain stored. The legacy v1 manifest is retained as historical input and is not bundled/imported with v2. Actually encountered key-based Chaulieu IDs receive an unmapped migration report; there is no fabricated ordinal mapping.

Original assets, hashes, source descriptors/revisions, evidence, credits, reviews, analyses and segments are included in notebook backups. Older backups without library state still restore. Rendering is checked again after restore. Existing sessions, PDFs, annotations and framing retain their established IDs and formats. Identical reference-PDF attachments preserve their annotation layer. A failed score replacement does not replace the previous valid asset. Removing a score invalidates its readiness while retaining the work and history.

## Acquisition and validation

MusicXML uses `score-transfer.js` and Android `Notebook.downloadScore`, never `downloadPDF`. Both queues share one transfer slot. The app intentionally keeps its stricter existing serial, opt-in, foreground-only policy instead of the package's suggested concurrency of three. Downloads default to unmetered Wi-Fi; browsers with unknown network type wait until the user allows other networks. Opening a score or leaving the foreground pauses transfers. Launching the app never resumes them automatically.

Only observed, commit-pinned URLs in the enabled `musetrainer/library` and `OpenScore/Lieder` repositories on `raw.githubusercontent.com` are acquired. No filenames are guessed. Redirects are refused; new hosts require deliberate adapter review. Responses record status, final URL, timestamp, validator, actual size and computed SHA-256. HTML/JSON, oversized files, malformed XML and invalid archives are rejected. A SHA-256 identifies bytes, not independent permission or a publisher signature.

With a strong ETag or Last-Modified, interrupted bytes form a durable checkpoint. Retry uses Range/If-Range; a matching 206 must cover the expected suffix with the same validator. A 200 restarts safely. Invalid ranges discard the checkpoint. Retry-After blocks premature retries; retries remain explicit instead of running a background loop. Partial data never becomes a playable asset. Score and execution state commit together in an IndexedDB transaction (the local equivalent of an atomic file replacement).

Limits: 25 MB per MusicXML/MXL, 100 MB actual decompression, 256 ZIP entries, 20,000 measures and 200,000 notes. Reference PDFs keep the existing 20 MB limit. Backups retain their 60 MB import and 500-attachment limits. MXL resolves `META-INF/container.xml`, including declared rootfiles lacking a MIME attribute; it never assumes the first XML is the score. ZIP traversal, duplicate paths, unsupported/encrypted entries, CRC failures and truncated archives are rejected. External entities/references and custom DTDs are rejected. A standard MusicXML public DOCTYPE is stripped without fetching it. Only UTF-8 partwise MusicXML is currently supported; timewise and unsupported encodings produce explicit errors.

## Musical features and limitations

`@xmldom/xmldom` parses notation, `fflate` handles bounded archive expansion, AJV validates package contracts and OpenSheetMusicDisplay renders local SVG. These libraries and notices ship with the app. Score analysis runs in a worker with a two-minute limit to keep touch controls responsive.

Results identify parser `spino-musicxml-1.0.0`, algorithm `written-features-1.0.0`, input SHA-256 and selected-parts/hand-configuration hash. Content, algorithm or configuration changes invalidate readiness. Measured features include written measure count and quarter-note duration, pitches/ranges after supported transposition, signature/meter events, printed/courtesy/chromatic accidentals, voices, chords, sounding overlap, monophonic melodic leaps, rhythmic values, tuplets and attack density. Pickups, divisions, backup/forward, chords, rests, cues, grace notes, ties and cross-staff writing are handled explicitly.

Repeats are preserved in written order, not unfolded. Attack density excludes cue/grace/tied-continuation notes and counts chord pitches separately. Melodic leaps compare adjacent monophonic onsets within the same voice; chord voice-leading is not inferred. Unsupported pitch/transposition, absent signatures or ambiguous courtesy signs leave dependent values unknown. Estimated tonality, syncopation, hand independence and calibrated difficulty remain null with warnings. A filename, exercise number or key signature never supplies a difficulty grade or tonal target.

Valid parents produce 4/8/16-measure proposals at stride four, without incomplete final windows. Each uses `[start, end)` written indices, original measure labels, selected parts and inherited key/meter/clef/divisions/tempo/transposition/tie/repeat context. Each extracted notation document is parsed and analyzed independently; parent metrics are not copied. IDs derive from parent identity/hash, selection and boundaries. Credits remain in the extracted XML, and provenance follows the parent.

## Reproduce validation

```sh
npm ci
npm test
npm --prefix Exercises_Library/scripts ci --ignore-scripts
npm --prefix Exercises_Library/scripts run validate
node scripts/verify-repertoire.mjs
```

The last command validates/imports metadata without network access. For an explicit acquisition diagnostic:

```sh
node scripts/verify-repertoire.mjs --download
node --test tests/library.browser.test.js
```

The diagnostic downloads one actual observed candidate and writes ignored files under `artifacts/repertoire/`. It also derives uncompressed MusicXML from those same bytes, records both hashes and checks that format independently. It does not modify bundled manifests or the user's notebook. Browser tests use disposable profiles; the only automated approval is for a synthetic fixture, never for the public candidate.

Build/install the current debug APK with the README commands, then run `node scripts/check-repertoire.mjs`. It checks catalogue counts, search/pending UI, native Wi-Fi acquisition and actual SVG rendering. Downloaded diagnostic bytes remain in memory, and the script compares notebook works/assets/sessions before and after. Existing PDF checks remain in `check-emulator.mjs` and `check-pdf-practice.mjs`.

## Delivery evidence

### Personal-testing acquisition follow-up

The updated APK was installed without clearing the notebook. The package validator and all 143 app tests passed. Real acquisition through the Android queue and subsequent previews produced:

| Result | Installed emulator |
|---|---:|
| Enabled catalogue records | 618 |
| Candidate editions attempted | 55 |
| Validated local score assets | 53 |
| Completed full-score analyses | 51 |
| Successfully rendered, ready for personal testing | 51 |
| Existing independently analyzed excerpt proposals retained | 102 |
| Rights approvals created | 0 |

The 102 excerpts came from three editions processed before acquisition was changed to defer excerpt generation. The remaining newly acquired full scores do not require excerpts for manual practice. Existing works, sessions, active-session identity/time and attachments were checked for preservation; no frontend exceptions occurred. The full runtime report is in ignored `artifacts/repertoire/personal-test-report.json`.

Four candidate editions remain blocked: `mt_c61974e09652bd46` (Ballade I, measure 246) and `mt_9283f10baa8897f7` (Nocturne in C sharp Minor, measure 58) contain backup durations exceeding the preceding written durations. Inspection of the original bytes confirmed deficits of 0.025 and 0.0125 quarter notes respectively; no silent timing repair was applied. `mt_f13723baabd078b0` (Mozart - Piano Sonata No. 16 - Allegro) and `mt_0e1f30af3a1085f6` (The Entertainer - Scott Joplin) are stored but have unnamed/unidentified instrument parts and need part selection and suitability review. The 563 bibliographic works still need concrete score editions. Personal testing does not invent missing URLs, musical metadata or permission.

### Initial integration baseline

Package validation passed for 13 manifests / 2,080 total records. The full application suite passed **115 checks**, including the real candidate preview, optional catalogue toggle, null filters, edition reviews, worker analysis, independent excerpts, acquisition failures/resume, PDF/OCR/annotations/backups and responsive practice.

| Result | Clean default installation | Explicit diagnostic |
|---|---:|---:|
| Imported records | 618 | 618 |
| Located MusicXML/MXL editions | 55 | 55 |
| Downloaded score assets | 0 | 1 |
| Independently analyzed source scores | 0 | 1 |
| Generated excerpt proposals | 0 | 20 |
| Edition rights approved | 0 | 0 |
| New pieces ready to practice | 0 | 0 |

The diagnostic candidate is `mt_eb69b7b3cfc165d7`, 4,745 bytes, SHA-256 `490aba9a679e06429e0b7e6e58e50701658389d64c3b5c91511af3ec68355b4d`. Its original source title and embedded Petzold credit are retained without an unverified merge with the legacy Mutopia entry. Browser and installed Android preview succeeded. The native check also verified the same hash after Wi-Fi acquisition, 618 visible records, collection search and pending states; user works/assets/sessions were unchanged, with no frontend exceptions. The twenty segment proposals remain boundary-review pending. Neither this file nor its derived XML is a bundled or approved score.

Concrete content blockers remain: the 563 canonical records lack acquired editions; the 55 candidate editions require individual composition/edition rights and suitability reviews; optional accompaniment requires selected piano parts and equivalent reviews. Reliable difficulty requires calibration; general MIDI evaluation and PDF-to-note transcription are not implemented. Wi-Fi-to-cellular transitions still need a physical dual-network device. None of these limitations hides catalogue records.
