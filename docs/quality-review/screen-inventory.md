# Screen review inventory

2026-10-15 Beta 6.1 multimedia: MEDIA-01/02 are new source surfaces. Reopen REP-02, PRACTICE-01, C-NAV and C-SCORE for piece recordings, the third Library tab and PDF/MusicXML recording entry points. The accepted local repertoire-recording objective is separate from layout acceptance. [Responsive evidence](captures/multimedia/2026-10-15-local-03/capture.json) uses disposable notebooks and synthetic streams; native camera/microphone acceptance remains open.

2026-10-15 dark follow-up: D-039's same navigation surfaces are reopened for stronger dark elevation. [Current comparison/evidence](captures/themes/2026-10-15-dark-depth/README.md) covers all eight populated navigation views, both themes and four orientations/narrow phones. All 40 light frames match the owner-liked prior version exactly. Revised dark/native acceptance remains open; stable IDs and prior evidence are preserved.

2026-10-15: D-039 reopens shared C-NAV/C-AGENDA visual evidence across TODAY-01, HUB-01, CAL-01/02, REP-01/Catalogue, PIANO-02 and PROFILE-01. Flat context and softly raised cards are implemented in the navigation scope; preparation, active practice and scores retain their current styling. [Final responsive evidence](captures/themes/2026-10-15-surface-depth-02/README.md) covers both themes, phone/tablet portrait/landscape and narrow-phone checks (80 frames). Existing accepted objectives and stable IDs remain. Owner/native visual acceptance is open; no new package/publication.

2026-10-11: [Native Android/iOS comparative audit](platform-comparison.md) adds dated phone/tablet portrait/landscape screenshots, form states and scroll frames. Stable surface IDs and prior browser evidence are preserved. PRACTICE-02 / Quick practice shared landscape controls are reopened for PLATFORM-13 safe-area handling; the accepted sidebar objective is unchanged. Capture coverage is tracked in the audit scenario matrix; it does not promote every surface to native acceptance. MIDI, reminders, provider accounts, printing and legacy-engine PDF compatibility are assessed separately.

2026-10-07 D-036 direct-print refinement reopens Repertoire table/work detail and Catalogue downloaded score cards/details for compact printer actions, plus paused PDF/XML editor tools. Missing files expose no print action. Direct system invocation/no viewer or custom preview verified with synthetic intercepted browser calls, four responsive repertoire layouts and full regression (288 pass, zero fail, one skipped). No APK/publication in this refinement; physical printing acceptance remains open.
2026-10-07 D-036 reopens score tools and PDF/MusicXML repertoire viewers for Print score and its temporary full-work preview. Annotated PDF formats/rotation and full-work A4 XML output browser-verified; source preservation and annotation-edit regression pass. Android system print bridge compilation passed, native print acceptance pending a package containing the bridge. No surface IDs retired or notebook data migrated.
2026-10-07 PRACTICE-02 and shared C-PRACTICE/C-SCORE phone-landscape evidence reopened for accepted sidebars: production browser captures in generated-practice/2026-10-07-landscape-applied. Managed mobile keyboard reading/technique receive the layout; PRACTICE-03 note-name and PRACTICE-04 physical-piano layouts are outside the scope. Portrait/tablet regression and standalone reader layout checks pass; native/accessibility gates remain open.

2026-10-06 D-034 extends HUB-01 and PRACTICE-02 with a direct Quick practice entry: random single hand/clef and keyboard position, mobile self-paced reader, existing-session guard. Stable surface IDs retained; responsive evidence/native approval separate. D-033 also supersedes the historical Profile placement of Progress below: it is now a main destination.

Created: 2026-10-01. Scope: the current SPino preliminary release, before declaring version 1.0 ready.

This is a navigation and coverage map, not a list of approved designs. It records current surfaces and explicitly identified surfaces in implementation. Start with `TODAY-01`; follow its entry points into the relevant child surfaces without treating those destinations as reviewed automatically. Keep IDs stable when labels, routes or layouts change. Add a new ID for a genuinely new surface and retain retired IDs with a reason.

D-002–D-004 are implemented with passing scoped checks, and the owner explicitly approved the presented compact Today result on 2026-10-01: “me gusta, aprobar y continuar”. Its 21-frame compact run is the accepted visual reference. TODAY-01 retains V because remaining behavior/accessibility/native coverage is open; visual acceptance does not close child flows. PRACTICE-01 retains its accepted and verified scope. Current focus is [PRACTICE-02 generated practice](generated-practice.md): D-013 supersedes D-012's consolidated menu with a minimal flat toolbar, direct frequent actions and direct tabbed settings. Its responsive verification is pending, while the proposed D-009 objective awaits feedback. READER-05 is now in implementation under D-015: its Hanon card and guide use a soft four-snapshot sequence, with owner acceptance, dated evidence and native coverage still open. Library/Biblioteca is the accepted replacement label for My piano; PIANO IDs remain stable. Progress moves under Profile without renumbering PIANO-02/03. Other destinations have shared-navigation smoke checks, not complete design reviews.

## How to maintain coverage

- **N**: not started. **B**: baseline in progress. **R**: under review. **I**: agreed changes in implementation. **V**: verification in progress. **D**: review closed with a recorded decision and evidence. **X**: retired, with a linked explanation. A screenshot alone does not close a review.
- Capture columns are **PP** (phone portrait), **PL** (phone landscape), **TP** (tablet portrait) and **TL** (tablet landscape). `—` means no evidence is linked here yet. Replace it with a relative link to the capture or the screen's evidence index. Record viewport, device scale, platform, app revision, language, data fixture and state alongside the image. A browser emulation must be identified as such, not presented as a native-device verification.
- Capture both the initial viewport and any lower content or expanded panels needed to understand the surface. Long pages, on-screen keyboards, menus and dialogs require their own evidence. A route's four captures do not cover every state listed in its row.
- For each row, retain a state checklist in its detailed review. The table lists the minimum state families to visit; it does not imply they are currently correct. Add newly discovered branches as they are reached.
- Record behavior checks separately from visual evidence: navigation/back, primary action, cancellation, error recovery, persistence/relaunch, rotation and accessibility. Mark a unavailable device or provider check as blocked with its concrete prerequisite, not passed.
- Every accepted decision must list affected surface and component IDs. Search the component map below, record an impact check for earlier closed reviews, and reopen affected rows if their previous evidence is no longer representative. Apply the same check when a shared implementation changes later.
- Use synthetic, clearly identified review data. Never erase a personal notebook, annotations, cloud file or completed practice merely to obtain an empty-state screenshot. Destructive flows and synchronization need disposable fixtures.
- Preserve the distinction between current behavior, observed issue, proposal, accepted decision and verified result. Link the corresponding manual chapter only after the behavior has been checked; label unfinished manual content as draft.

## Today and its immediate branches

Source: `src/companion/agenda.js`, `app.js`, `profile-view.js`. The current main navigation route is `home`; its user-facing name is **Today / Hoy**.

| ID | Surface and entry point | States and branches to inspect | Shared components | Status | PP | PL | TP | TL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TODAY-01 | Today; launch or main navigation; compact visual reference accepted | Empty notebook; populated day; personalized greeting and long name; contextual main action; current date and activity markers; long content and bottom navigation; remaining gates in today.md | C-NAV, C-AGENDA, C-EMPTY, C-LOCALE | V | [Accepted compact](captures/today/2026-10-01-compact/typical-phone-portrait-01.png) | [Accepted compact](captures/today/2026-10-01-compact/typical-phone-landscape-01.png) | [Accepted compact](captures/today/2026-10-01-compact/typical-tablet-portrait-01.png) | [Accepted compact](captures/today/2026-10-01-compact/typical-tablet-landscape-01.png) |
| TODAY-02 | Week strip and today's activity cards | Tap each day to open the calendar; planned/completed/manual practice and event cards; several activities on one day; open plan (`CAL-05`), session (`PIANO-03`) and event (`CAL-07`) | C-AGENDA, C-NAV | N | — | — | — | — |
| TODAY-03 | Unfinished session card | Pending session alone or beside today's entries; elapsed time; resume (`PRACTICE-01`); existing active session while attempting another start; resume after relaunch | C-PRACTICE, C-AGENDA | N | — | — | — | — |
| TODAY-04 | Today-to-Practice entry (shortcuts/routines move to HUB-01 under D-003) | Reading, technique, repertoire, free; no routines versus saved routines; long routine titles; quick start versus preparation (`PREP-01`); unavailable MIDI on a saved routine | C-DURATION, C-PRACTICE, C-EMPTY | N | — | — | — | — |
| TODAY-05 | Upcoming commitments | Empty state; one/two upcoming events; countdown/date/type; create event (`CAL-06`); open event (`CAL-07`); same-day versus future event placement | C-AGENDA, C-DIALOG, C-EMPTY | N | — | — | — | — |

## Practice entry

HUB-01 is a new destination under D-003. It reuses existing preparation and routine flows. Four responsive smoke captures and shared-navigation checks exist, but its detailed design review remains open; creating the entry does not review its child flows. D-004 adds a consistent compact treatment alongside Today, with passing scoped layout/touch checks; it does not change the entry's actions or close its visual review.

| ID | Surface and entry point | States and branches to inspect | Shared components | Status | PP | PL | TP | TL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HUB-01 | Practice; main navigation or Today action | Reading, technique, repertoire and free practice; saved routines and empty state; unfinished session; context/default preservation; configure versus quick start; return/back | C-NAV, C-PRACTICE, C-DURATION, C-EMPTY | R | — | — | — | — |

## Calendar and planning

Source: `src/companion/agenda.js`, `views.js`, `planner.js`, `calendar-drag.js`, `app.js`.

| ID | Surface and entry point | States and branches to inspect | Shared components | Status | PP | PL | TP | TL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAL-01 | Calendar week route | Empty/populated week; previous/next/current week; selected day; planned/completed/manual/event rows; long titles; week crossing month/year | C-NAV, C-AGENDA, C-EMPTY | N | — | — | — | — |
| CAL-02 | Calendar month tab | Grid, markers and legend; selected-day entries; adjacent-month days; empty/busy day; previous/next/current month | C-NAV, C-AGENDA | N | — | — | — | — |
| CAL-03 | Add-on-day dialog | Schedule practice, event/audition, manual log; date context survives the chosen branch; cancel and Android back | C-DIALOG, C-AGENDA | N | — | — | — | — |
| CAL-04 | Plan your week route | Days/duration/context; routine choice; tutor lesson fields; single week/recurring series; proposal; past/occupied dates; invalid/empty selection; save failure | C-DURATION, C-DIALOG, C-AGENDA | N | — | — | — | — |
| CAL-05 | Planned-practice detail dialog | Start/result; edit blocks (`PREP-03`); reschedule dialog with date/time/reminder; recurring-series explanation; delete and cancel-future-series confirmations; active/completed plan restrictions | C-DIALOG, C-AGENDA, C-PRACTICE | N | — | — | — | — |
| CAL-06 | New/edit event dialog | Event type, date/time, recurrence frequency and optional inclusive end date, place/notes, linked works and reminder; no repertoire; long content; keyboard open; save/cancel/errors | C-DIALOG, C-AGENDA | N | — | — | — | — |
| CAL-07 | Event detail route | Future/past event; milestones; linked works and rehearsal preparation; edit; recurring-series cancellation; delete confirmation; missing linked work | C-AGENDA, C-DIALOG | N | — | — | — | — |
| CAL-08 | Drag rescheduling in week calendar | Pending practice plan; events and completed/active plans are not draggable; D-006 long-press lift versus scrolling; target-day highlight and release; temporary bin following appointment/recurrence deletion rules; canceled drag; invalid/unchanged target; pointer/keyboard alternative via reschedule; preservation of recurring siblings | C-MOVE, C-AGENDA, C-DIALOG | N | — | — | — | — |
| CAL-09 | Log completed practice dialog | Date/minutes/activity/optional work; feedback and next step; no works; validation; save result (`PIANO-03`); cancel | C-DIALOG, C-FEEDBACK | N | — | — | — | — |

## Practice preparation and sessions

Source: `src/companion/views.js`, `practice-duration.js`, `practice-defaults.js`, `app.js`, `src/main.js`.

D-027 compacts the shared PDF framing panel in SCORE-01/03: [evidence](captures/session/2026-10-05-pdf-compact-framing/index.html). Next is split-page drawing/landscape reading. Existing framing, annotation and practice behavior is preserved; visual/native approval remains open.

D-026 removes the repertoire card's legacy metronome entry in PRACTICE-01/05. [Current evidence](captures/session/2026-10-05-pdf-no-metronome/index.html); free practice is unchanged. Future floating score metronome is deferred, not an available surface.

D-025 implements SCORE-03's compact palette, sizing and mark editing within PRACTICE-05 / SCORE-01. [Four-layout evidence](captures/session/2026-10-05-pdf-editable-marks-02/index.html). PDF study/practice and backup compatibility are rechecked; owner visual and native editing acceptance remain open. Earlier proposal-only text is historical.

D-024 compact PDF toolbar visually approved on 2026-10-05. Continue SCORE-03 expanded annotation-panel usability (PDF-UI-F01), before MusicXML. The auto-collapse/current-tool direction is proposed, not implemented or accepted.

D-024 updates PRACTICE-05 / SCORE-01 / SCORE-03's shared PDF toolbar: [timer inside play/pause and one-line controls](captures/session/2026-10-05-pdf-timer-bar-02/index.html). PDF study mode and practice regressions pass; visual approval remains pending. MusicXML's independent controls are unchanged.

Current visual branch: PRACTICE-05 / SCORE-01 / SCORE-03 repertoire PDF, [twenty four-layout examples](captures/session/2026-10-05-repertoire-pdf-baseline-02/index.html). Session entry, running, paused, expanded annotation/framing panels; owner visual acceptance pending. MusicXML follows this review, not the earlier functional PDF tests.

PRACTICE-05 free-practice/metronome layout D-022/D-023 visually accepted on 2026-10-05 (“approve now and continue”), scoped to the final favorites-below responsive gallery. Keep PRACTICE-05 under review for repertoire score/recovery, accessibility and native gates. Next: missing local score recovery and MusicXML presentation.

PRACTICE-05 latest D-023 layout: [favorites below the landscape dial](captures/session/2026-10-05-metronome-favorites-below/index.html). Reduced landscape circle reserves room for favorite tempos; four-layout evidence and five-layout browser placement checks supersede earlier favorite positioning.

PRACTICE-05 D-023 corrected layout evidence: [beat row and non-overlapping chalk favorites](captures/session/2026-10-05-metronome-markers-01/index.html), four responsive layouts with an additional 320px portrait bounds regression. Earlier mixer galleries remain historical.

PRACTICE-05's current dedicated free-practice surface uses D-023's tempo/volume mixer and chalk favorites. The [current four-layout browser gallery](captures/session/2026-10-05-metronome-mixer-03/index.html) supersedes its table's baseline for free-practice layout evidence; native and owner visual acceptance remain open. Shared audio click volume defaults remain unchanged for generated practice and repertoire callers.

PRACTICE-01 has [27 baseline frames](captures/session/2026-10-01-baseline/index.html) across planned, resumed, running and disconnected states in all four standard viewports. No horizontal overflow or runtime errors were recorded; all four landscape-phone primary actions are below the fold. That historical baseline is preserved. D-005 now adds the compact current-block view and live editing, with [20 follow-up frames](captures/session/2026-10-01-session-editor/index.html) and an [eight-frame Add dialog gallery](captures/session/2026-10-01-add-block/index.html). All 16 primary actions are now visible; functional regressions pass. PRACTICE-02 adds a [16-frame generated-practice baseline](captures/generated-practice/2026-10-04-baseline/index.html) for timed/self-paced reading, range adaptation and technique; its proposed objective and findings await feedback.

| ID | Surface and entry point | States and branches to inspect | Shared components | Status | PP | PL | TP | TL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PREP-01 | Prepare your practice route | Each activity; mobile/piano/MIDI context; duration slider; defaults; hands/range/figures; timed/self-paced mobile mode; tempo; expanded Options; input choice; presentation; passage; field validation and keyboard | C-DURATION, C-PRACTICE, C-DIALOG | N | — | — | — | — |
| PREP-02 | Multi-block practice and More options | Collapsed/expanded blocks; add/remove/reorder using D-006 long-press/bin standard with accessible alternatives; total-duration redistribution; up to supported block limit; save routine name dialog; schedule draft; cancel and return without losing draft | C-MOVE, C-DURATION, C-DIALOG, C-PRACTICE | N | — | — | — | — |
| PREP-03 | Plan/edit planned practice variants | Apply saved routine; edit only the chosen appointment; date/time/reminder save dialog; changed context/material; required fields; return/back preservation | C-DURATION, C-AGENDA, C-DIALOG | N | — | — | — | — |
| PREP-04 | Choose catalogue material from preparation | Add a repertoire block or replace one; catalogue selection mode; download/pending state; choose PDF/MusicXML; return to preparation; preserve duration, date and purpose | C-PRACTICE, C-TRANSFER, C-NAV | N | — | — | — | — |
| PRACTICE-01 | Session route; current review from Today Start/Resume | Before start, running, paused, resumed; block list/timer; orientation advice; next/final block; continue later; reopen after background/relaunch; accepted objective: understand the current block and begin/resume with clear time, pause and finish; inline durations, reorder, add/remove and preserved progress | C-MOVE, C-PRACTICE, C-MIDI, C-DURATION | V | [Refinement](captures/session/2026-10-01-session-editor/planned-phone-portrait-01.png) | [Refinement](captures/session/2026-10-01-session-editor/planned-phone-landscape-01.png) | [Refinement](captures/session/2026-10-01-session-editor/planned-tablet-portrait-01.png) | [Refinement](captures/session/2026-10-01-session-editor/planned-tablet-landscape-01.png) |
| PRACTICE-02 | Generated reading/technique with mobile keyboard; [active review](generated-practice.md) | Timed and self-paced; correct/wrong answer; minimal D-013 flat controls, D-011 directional navigation and compact metrics; direct settings tab; key size, pinch/pan and range commit; paused adapted line; guides/fingering; screen rotation; multiple systems/pages | C-PRACTICE, C-MIDI, C-SCORE, C-DIALOG | I | [Historical D-012](captures/generated-practice/2026-10-04-consolidated-tools-03/adapted-range-phone-portrait-tools.png) | [Historical D-012](captures/generated-practice/2026-10-04-consolidated-tools-03/adapted-range-phone-landscape-tools.png) | [Historical D-012](captures/generated-practice/2026-10-04-consolidated-tools-03/adapted-range-tablet-portrait-tools.png) | [Historical D-012](captures/generated-practice/2026-10-04-consolidated-tools-03/adapted-range-tablet-landscape-tools.png) |
| PRACTICE-03 | Generated reading/technique with note names | Timed/self-paced; all answer names/accidentals; feedback and mistakes; no physical piano requirement; narrow/short viewports; pause/settings/finish | C-PRACTICE, C-SCORE | R | [Baseline](captures/generated-practice/2026-10-05-note-names-baseline/self-paced-reading-phone-portrait-01.png) | [Baseline](captures/generated-practice/2026-10-05-note-names-baseline/self-paced-reading-phone-landscape-01.png) | [Baseline](captures/generated-practice/2026-10-05-note-names-baseline/self-paced-reading-tablet-portrait-01.png) | [Baseline](captures/generated-practice/2026-10-05-note-names-baseline/self-paced-reading-tablet-landscape-01.png) |
| PRACTICE-04 | Generated reading/technique with piano or MIDI; [active review](piano-practice.md) | One/two hands and grand staff; manual versus measured input; practised-time visibility; context-appropriate settings; scroll/fixed page; page controls; focus across bar/system boundaries; MIDI connected/disconnected/reconnected; switch to manual tracking | C-PRACTICE, C-MIDI, C-SCORE | R | [Baseline](captures/generated-practice/2026-10-05-with-piano-baseline/timed-reading-phone-portrait-01.png) | [Baseline](captures/generated-practice/2026-10-05-with-piano-baseline/timed-reading-phone-landscape-01.png) | [Baseline](captures/generated-practice/2026-10-05-with-piano-baseline/timed-reading-tablet-portrait-01.png) | [Baseline](captures/generated-practice/2026-10-05-with-piano-baseline/timed-reading-tablet-landscape-01.png) |
| PRACTICE-05 | Free/repertoire session timer; [active review](manual-practice.md) | Work with/without score; start/pause; metronome; open PDF/MusicXML; background-timer option; interrupted/reopened score; unavailable local asset; manual tracking labels | C-PRACTICE, C-SCORE, C-MIDI | R | [Baseline](captures/session/2026-10-05-manual-practice-baseline-02/repertoire-paused-phone-portrait-01.png) | [Baseline](captures/session/2026-10-05-manual-practice-baseline-02/repertoire-paused-phone-landscape-01.png) | [Baseline](captures/session/2026-10-05-manual-practice-baseline-02/repertoire-paused-tablet-portrait-01.png) | [Baseline](captures/session/2026-10-05-manual-practice-baseline-02/repertoire-paused-tablet-landscape-01.png) |
| PRACTICE-06 | Finish session and feedback dialog; save/cancel repairs verified in [SESSION-F04/F09](session.md#live-editing-implementation-and-verification) | Optional mood/comments/works/next step; partial session; keep practicing; save; save and schedule; finish without saving and its confirmation; save failure without lost session | C-DIALOG, C-FEEDBACK, C-PRACTICE | R | — | — | — | — |
| PRACTICE-07 | Retained archived learning block | Old saved routines/backups containing a theory block; question/feedback; next/finish; cannot create a new learning block from the current activity picker | C-PRACTICE, C-FEEDBACK | N | — | — | — | — |
| PRACTICE-08 | Add block in an active session | Reading/technique; context-compatible repertoire/free; minutes, scale/mode, required repertoire selection; profile defaults; cancel, validation, save failure; no source-routine changes; soft keyboard remains a native gate | C-DIALOG, C-DURATION, C-PRACTICE | V | [ES/EN gallery](captures/session/2026-10-01-add-block/index.html) | [Landscape](captures/session/2026-10-01-add-block/add-es-pl.png) | [Portrait](captures/session/2026-10-01-add-block/add-es-tp.png) | [Landscape](captures/session/2026-10-01-add-block/add-es-tl.png) |
| PRACTICE-09 | Edit unfinished block; pencil on session row | Activity, duration, scale/work, hands, tempo; contextual timing/input; More settings; cancel, failed save/retry, reload; preserve earlier work and source routine/plan; duration-only retains exercise; completed blocks locked | C-DIALOG, C-DURATION, C-PRACTICE | V | [Editor gallery](captures/session/2026-10-01-edit-block-02/index.html) | [Landscape](captures/session/2026-10-01-edit-block-02/es-basic-phone-landscape-1.png) | [Portrait](captures/session/2026-10-01-edit-block-02/es-basic-tablet-portrait-1.png) | [Landscape](captures/session/2026-10-01-edit-block-02/es-basic-tablet-landscape-1.png) |

## Score viewers

Source: `src/companion/pdf-viewer.js`, `musicxml-viewer.js`, `score-controls.js`, `pdf-annotations.js`, `score-import.js`. Generated exercises use the separate reader listed above; sharing a visual convention does not imply identical behavior.

| ID | Surface and entry point | States and branches to inspect | Shared components | Status | PP | PL | TP | TL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCORE-01 | PDF viewer from work/file or practice | Loading/ready/error; study mode versus timed session; running/paused; fullscreen and native bars; single/multiple pages; narrow margin taps; first/last-page boundaries; pinch/pan | C-SCORE, C-MIDI | N | — | — | — | — |
| SCORE-02 | MusicXML full-score/excerpt viewer | Rendering/loading/error; selected parts; full score versus excerpt; page navigation; practice versus preview; no fabricated automated evaluation; return to correct parent | C-SCORE, C-MIDI | N | — | — | — | — |
| SCORE-03 | Floating control widget | Collapsed/expanded; dragged to each edge/corner; orientation changes; timer/MIDI/pause; finish/back visible in appropriate state; position after panel close; content occlusion | C-SCORE, C-MIDI, C-PRACTICE | N | — | — | — | — |
| SCORE-04 | Annotation panel | Fingering 1–5; pan, pen, highlight, underline, text, erase, line, arrow, circle, frame; colors; undo/redo; text-entry UI; canceled gesture; page/rotation persistence; save/error/retry | C-SCORE, C-DIALOG | N | — | — | — | — |
| SCORE-05 | Framing panel | Zoom, fit, save/reset frame for each orientation; reopen saved frame; fullscreen enter/exit; panel scrolling in short landscape; unsupported/native browser differences | C-SCORE | N | — | — | — | — |

## Library, progress and repertoire

Source: `src/companion/views.js`, `repertoire.js`, `score-import.js`, `pdf-metadata.js`, `app.js`.

Deferred D-028: when reviewing REP-03/REP-04, include local MusicXML/MXL alongside PDF and the MuseScore-assisted download/import/source-link flow. If not reached, carry this work beyond UI review. This is requested future coverage, not implemented direct account integration; retain existing surface IDs and historical PDF scope below.

| ID | Surface and entry point | States and branches to inspect | Shared components | Status | PP | PL | TP | TL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PIANO-01 | Library route (formerly My piano; internal route retained) | Empty/populated collection; active works; routines; catalogue link; long names and collection counts; existing progress/history entry moved to Profile under D-003 | C-NAV, C-EMPTY, C-AGENDA | N | — | — | — | — |
| PIANO-02 | Progress route from Profile and target history dialog | No history; recent statistics; measured versus manual practice; target summaries; target detail/history; navigation to session | C-FEEDBACK, C-DIALOG, C-EMPTY | N | — | — | — | — |
| PIANO-03 | Saved session detail | Full/partial/manual session; block measurements and MIDI/manual distinctions; mood/comments/next step; linked works; prepare another session; edit feedback; delete confirmation and linked-plan effect | C-FEEDBACK, C-DIALOG, C-PRACTICE | N | — | — | — | — |
| PIANO-04 | Routines route | Empty/list; start/edit; new routine to preparation; deletion confirmation; long names; active-session conflict | C-PRACTICE, C-DIALOG, C-EMPTY | N | — | — | — | — |
| REP-01 | Repertoire route | Empty/large collection; search; collection/stage/tag/sort filters; favorites; pagination; no matches; trash/restore; long original musical titles | C-EMPTY, C-NAV, C-LOCALE | N | — | — | — | — |
| REP-02 | Work detail route | Metadata/study stage; target/passages/notes; local PDF or catalogue score; practice/plan; history; edit; trash confirmation; deleted work still referenced by history | C-SCORE, C-DIALOG, C-PRACTICE | N | — | — | — | — |
| REP-03 | Add/edit work dialog | With/without PDF; expanded Study details; tags/stage/tempo/key/passage/notes; file-picker cancellation; recognized title/composer/printed tempo; ambiguous/failed OCR; preserve user corrections | C-DIALOG, C-SCORE, C-TRANSFER | N | — | — | — | — |
| REP-04 | Import/attach/replace/remove PDF | Direct import versus attach to existing work; validation/progress/cancel/error; size/password/invalid-file handling; replacement and annotation preservation rules; remove-file confirmation | C-TRANSFER, C-DIALOG, C-SCORE | N | — | — | — | — |

## Local multimedia (Beta 6.1 source preview)

| ID | Surface | States and coverage | Shared components | Status | Phone portrait | Phone landscape | Tablet portrait | Tablet landscape |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MEDIA-01 | Local multimedia library | Actual local files only; per-piece/type filters; pending drafts; playback; rename/delete; restart retention; foreign installation/missing Blob filtering | C-NAV, C-EMPTY | V | [Browser](captures/multimedia/2026-10-15-local-03/light-library-phone-portrait.png) | [Browser](captures/multimedia/2026-10-15-local-03/light-library-phone-landscape.png) | [Browser](captures/multimedia/2026-10-15-local-03/light-library-tablet-portrait.png) | [Browser](captures/multimedia/2026-10-15-local-03/light-library-tablet-landscape.png) |
| MEDIA-02 | Capture and preview panel | Audio/video; permission denial; live video/minimize; local save/discard; quota retry; top-layer score controls; background/limit stop paths; physical-device acceptance open | C-SCORE, C-PRACTICE | V | [Browser](captures/multimedia/2026-10-15-local-03/light-recording-phone-portrait.png) | [Browser](captures/multimedia/2026-10-15-local-03/light-recording-phone-landscape.png) | [Browser](captures/multimedia/2026-10-15-local-03/light-recording-tablet-portrait.png) | [Browser](captures/multimedia/2026-10-15-local-03/light-recording-tablet-landscape.png) |

## Catalogue and downloads

Source: `src/companion/library-browse.js`, `library-view.js`, `library-ui.js`, `download-view.js`, `app.js`. Catalogue records, downloaded assets, analyzed scores and material ready for practice are separate states.

| ID | Surface and entry point | States and branches to inspect | Shared components | Status | PP | PL | TP | TL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAT-01 | Scores catalogue: MusicXML tab | Available/downloaded/pending/ready cards; search, expanded filters, pagination, no matches; composer/group/key/level filters; selecting material from preparation | C-EMPTY, C-TRANSFER, C-PRACTICE | N | — | — | — | — |
| CAT-02 | Scores catalogue: PDF tab | Reviewed PDF editions; source/credits; not downloaded/downloading/local/update states; add to repertoire, open/practice/use in draft; target-filtered entry | C-TRANSFER, C-SCORE, C-PRACTICE | N | — | — | — | — |
| CAT-03 | Research tab and all-records view | Bibliographic references without downloadable file; explanation of limits; all-records filters; original titles/evidence; no implication that metadata is a playable score | C-EMPTY, C-LOCALE | N | — | — | — | — |
| CAT-04 | Catalogue detail route | Downloadable/no asset; validating/analysis pending/failed; part selection required; manual-ready/unsuitable; open/practice/attach; edition evidence and analysis disclosures; unavailable record | C-TRANSFER, C-SCORE, C-DIALOG | N | — | — | — | — |
| CAT-05 | Catalogue information/tools disclosure | Counts by lifecycle; import errors; refresh catalogue; batch piano-edition download; optional accompaniment; legacy personal-testing setting disclosure | C-TRANSFER, C-DIALOG | N | — | — | — | — |
| CAT-06 | Select piano parts dialog | Part/voice evidence; optional verified hand assignment; no selection/unsupported selection; analysis in progress/error; changed selection invalidating earlier result | C-DIALOG, C-SCORE | N | — | — | — | — |
| CAT-07 | Editorial review dialogs | Suitability and edition-rights reviews; required evidence/reviewer/jurisdiction fields; approve/reject; error states; exact-file/hash context; personal full-score practice kept distinct from distribution approval | C-DIALOG, C-SCORE | N | — | — | — | — |
| CAT-08 | Attach edition dialog | Local PDF/MusicXML/MXL; edition/source fields; native picker cancel; validation/progress/failure; reference PDF versus analyzable score; duplicate file | C-DIALOG, C-TRANSFER, C-SCORE | N | — | — | — | — |
| CAT-09 | Excerpt list, review dialog and preview | Independently analyzed boundary context; preview requirement; approve/reject; tie/tuplet boundary rejection; technical metrics disclosure; unavailable excerpt | C-DIALOG, C-SCORE | N | — | — | — | — |
| CAT-10 | Downloads route | Separate PDF/MusicXML jobs; empty, queued, downloading, waiting Wi-Fi, paused, failed, complete; progress/retry; pause all; updates; Wi-Fi/mobile-data policy; foreground and score-viewing suspension | C-TRANSFER, C-EMPTY, C-DIALOG | N | — | — | — | — |

## Profile, backup and instrument

Source: `src/companion/profile-view.js`, `cloud-backup-view.js`, `instrument-view.js`, `platform.js`, `app.js`, plus native plugins. Provider and system dialogs require installed-device evidence in addition to layout captures.

| ID | Surface and entry point | States and branches to inspect | Shared components | Status | PP | PL | TP | TL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PROFILE-01 | Profile route | Named/unnamed user; weekly goal; cloud status; file count/loading; reminder availability; progress/history access; prominent icon-only avatar; version/data footer; detailed progress redesign deferred under D-003 | C-NAV, C-LOCALE, C-EMPTY | N | — | — | — | — |
| PROFILE-02 | Edit profile dialog | Name/weekly goal/language; English/Spanish switch; cancel/validation/save failure; immediate labels and relaunch persistence; user content stays unchanged | C-DIALOG, C-LOCALE | N | — | — | — | — |
| PROFILE-03 | Practice defaults route | Context; reading/technique range, hands and tempo; reading note values; save/error; defaults inherited and overridden in preparation | C-DURATION, C-PRACTICE, C-DIALOG | N | — | — | — | — |
| PROFILE-04 | Scores on this device route and file dialog | Loading/empty/search/no matches/large collection; bytes/format; show more; open score or catalogue; remove-file branch; stale file reference | C-SCORE, C-TRANSFER, C-DIALOG, C-EMPTY | N | — | — | — | — |
| PROFILE-05 | Reminders route | Browser unavailable message; native disabled/enabled; OS permission prompt/denial/retry; actual scheduled practice/event notice and tap behavior (Android implementation) | C-DIALOG, C-AGENDA | N | — | — | — | — |
| PROFILE-06 | Data on this device dialog | Link to backup; erase-notebook confirmation; transfer-in-progress guard; cancel; disposable-data-only deletion and restart | C-DIALOG, C-TRANSFER | N | — | — | — | — |
| CLOUD-01 | Backup & sync route | Browser unavailable; disconnected; backup mode versus shared sync; automatic paused/pending/waiting/writing/saved/error/conflict; file name/time and manual export section | C-TRANSFER, C-DIALOG, C-EMPTY | N | — | — | — | — |
| CLOUD-02 | Connect backup dialog and provider picker | Create shared file, join existing file, one-device backup; native create/open picker; provider/account choice; cancel; return to SPino; persisted access; Android Drive/iOS provider prerequisites | C-TRANSFER, C-DIALOG | N | — | — | — | — |
| CLOUD-03 | Manage connection dialog | Automatic updates toggle; location/mode; retry/error details; recovery disclosure; disconnect confirmation; local/cloud files retained after disconnect | C-TRANSFER, C-DIALOG | N | — | — | — | — |
| CLOUD-04 | Review changes dialog | Conflict summary/groups; local versus cloud resolution; technical disclosure; independent changes merged; write failure/retry; two-device round trip with disposable accounts/files | C-TRANSFER, C-DIALOG | N | — | — | — | — |
| CLOUD-05 | Manual export, restore and recovery confirmation | Browser/native file chooser; backup review/counts; invalid/incompatible backup; cancel; local pre-sync recovery; busy-transfer guard; successful restore retains scores/annotations/preferences | C-TRANSFER, C-DIALOG | N | — | — | — | — |
| CLOUD-06 | How it works dialog | Shared sync versus backup explanation; provider upload caveat; foreground eligibility; long text/scroll and closing/back in all sizes | C-DIALOG, C-LOCALE | N | — | — | — | — |
| MIDI-01 | Instrument route | Available/unsupported; no instrument; connected devices/signal; connect/search; USB insertion/removal; Bluetooth nearby/saved devices; long names | C-MIDI, C-NAV, C-EMPTY | N | — | — | — | — |
| MIDI-02 | Bluetooth pairing/reconnection states | Native permission/Bluetooth-off/scan/no-results/failure; connect/open-input failure; saved devices/forget; reconnect on launch; web MIDI permission variant; resume practice after connection | C-MIDI, C-DIALOG, C-PRACTICE | N | — | — | — | — |

## Reader settings and retained entry points

Source: `index.html`, `src/main.js`, `src/i18n.js`. The generated-exercise settings dialog remains in the implementation. Managed practice hides its language selector; the global language setting is in Edit profile. The `#reader` hash opens the legacy reader directly. Review its actual reachability and current constraints before making any decision to retain, expose or retire it.

| ID | Surface and entry point | States and branches to inspect | Shared components | Status | PP | PL | TP | TL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| READER-01 | Exercise settings: Practice tab | Mobile keyboard/note names; piano/MIDI input constraints; sound, key/score size, light, reveal assistance; weakest notes/reset; close/back resumes only as intended | C-DIALOG, C-PRACTICE, C-SCORE | N | — | — | — | — |
| READER-02 | Exercise settings: Levels tab | Built-in levels/rank and custom templates; customize; import disclosure/file/paste/progress/errors; current managed-practice limitations | C-DIALOG, C-PRACTICE, C-TRANSFER | N | — | — | — | — |
| READER-03 | Exercise settings: Exercise tab | Template name/export/share/delete; staves/hands/presentation/clef/range; scale/key/metre/figures/tempo; conditional notices; very long form; actual changes during managed practice | C-DIALOG, C-PRACTICE, C-DURATION | N | — | — | — | — |
| READER-04 | Exercise settings: General tab | Note naming; MIDI status/Bluetooth list; progress reset; language hidden in managed practice and retained legacy selector; capabilities/permissions | C-DIALOG, C-MIDI, C-LOCALE | N | — | — | — | — |
| READER-05 | Show scale dialog and warm-up | Staff/note names/mini keyboard; close; warm-up entry/exit; four-snapshot Hanon sequence; viewport fitting; managed versus legacy behavior | C-DIALOG, C-SCORE, C-PRACTICE | I | — | — | — | — |
| READER-06 | Direct legacy reader (`#reader`) | Initial view, quick controls, help/notices, start/stop, built-in/custom exercise; transition/reload/back; distinguish from notebook-managed practice | C-PRACTICE, C-MIDI, C-SCORE | N | — | — | — | — |

## Cross-cutting system states

These rows are behavioral checks, not new navigation destinations. Link screenshots or recordings where a visible state exists; record device-only results separately.

| ID | Scope | States and checks | Shared components | Status | PP | PL | TP | TL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SYSTEM-01 | Launch/local storage | Loading/import status; unavailable storage/startup error; existing notebook migration; app update; large local library; no record/progress/annotation loss | C-EMPTY, C-TRANSFER | N | — | — | — | — |
| SYSTEM-02 | Navigation/back/modal stack | Main navigation, nested routes, dialogs, score viewers, Android back and root behavior; restore scroll/selection/draft; focus return; no accidental app exit during a child flow | C-NAV, C-DIALOG, C-SCORE | N | — | — | — | — |
| SYSTEM-03 | Rotation, accessibility and interruptions | Safe areas/system bars; enlarged text; touch target/focus/labels; screen reader and keyboard; soft keyboard; background/resume; wake lock only during practice; timer/MIDI state preservation | C-NAV, C-DIALOG, C-PRACTICE, C-SCORE, C-MIDI | N | — | — | — | — |
| SYSTEM-04 | Offline/network/provider errors | First launch offline versus cached use; downloads opt-in; Wi-Fi requirement/unknown network/mobile allowance; foreground suspension; permission loss; missing external provider; retry without duplicate data | C-TRANSFER, C-DIALOG, C-EMPTY | N | — | — | — | — |
| SYSTEM-05 | Language and content integrity | English/Spanish UI, dates/numbers/aria/errors/notifications; language change propagation; long translations; musical titles and user annotations unmodified; technical source evidence clearly separated | C-LOCALE, C-DIALOG, C-EMPTY | N | — | — | — | — |

## Shared-component impact map

Use this map when deciding whether a change belongs only to the current screen or requires revisiting earlier work. These are review IDs, not claims that all usages share one source component.

| Component ID | Contract to review consistently | Affected surfaces |
| --- | --- | --- |
| C-NAV | Phone bottom bar/tablet rail; Today/Practice/Calendar/Library destinations; selected child route; prominent Profile avatar without visible label; compact MIDI utility; short landscape header; back and scroll restoration | TODAY, HUB-01, CAL, PREP, PRACTICE, PIANO, REP, CAT, PROFILE, MIDI, SYSTEM-02/03 |
| C-DIALOG | Heading, primary/cancel/destructive actions, safe-area sizing, internal scroll, focus, validation, keyboard, native back; settings destinations open directly and use sections/tabs rather than sitting inside a generic overflow menu | All dialog rows; READER tabs; SCORE text input; native picker transitions |
| C-AGENDA | Activity color/meaning, date/time, planned/completed state, linked entry behavior, recurrence language | TODAY-01/02/05, CAL-01–09, PIANO-01/03, PREP-03, PROFILE-05 |
| C-MOVE | D-006 standard: long press to lift, visible destination, release to move; temporary bin where removal is supported; scrolling, cancellation and accessible alternatives; preserve each surface's deletion/recurrence rules | PRACTICE-01 (implemented), PREP-02 and CAL-08 (apply during review), future movable-item surfaces |
| C-DURATION | Duration/tempo controls, units, total versus block allocation, saved defaults and local overrides | PREP-01–03, PRACTICE-01/05, CAL-04, PROFILE-03, READER-03 |
| C-PRACTICE | Context/input distinction, single active session, pause/resume/finish, automatic versus manual evaluation, persistence | TODAY-03/04, PREP, PRACTICE, SCORE-03, PIANO-03/04, REP-02, CAT selection flows, MIDI-02 |
| C-FEEDBACK | Mood scale, comments, works, next step, measured results versus self-report, save/discard/delete semantics | CAL-09, PRACTICE-06/07, PIANO-02/03 |
| C-SCORE | Maximize notation, page/focus movement, zoom, paused editing, annotation persistence, controls not covering music | PRACTICE-02–05, SCORE, REP-02–04, CAT-04/06–09, PROFILE-04, READER |
| C-MIDI | Connection versus input activity versus evaluation context; accessible status; reconnect/permission behavior | Navigation, PRACTICE-01/04/05, SCORE-01–03, MIDI-01/02, READER-04/06 |
| C-TRANSFER | Local ownership, user-initiated acquisition, truthful progress/readiness, cancel/retry, connectivity/provider gates | REP-03/04, CAT, PROFILE-04/06, CLOUD, SYSTEM-01/04 |
| C-LOCALE | English base and Spanish translation, concise copy, dates/numbers, preserved source/user text | Every surface, especially PROFILE-02, READER-04, SYSTEM-05 |
| C-EMPTY | Empty versus loading versus error versus unavailable, useful next action without fabricating data | TODAY, CAL, PIANO, REP, CAT, PROFILE-04, CLOUD-01, MIDI-01, SYSTEM |

## Native evidence gates

- Android hardware/system back, notification scheduling and permission, USB/Bluetooth MIDI, native score fullscreen/system bars, keep-awake, file-provider return and persisted access need an installed Android build. Browser layout captures are useful but insufficient for these behaviors.
- Drive/iCloud integration is through the native file-provider workflow exposed by the app. An available picker/provider, account, permission and a second device are prerequisites for relevant cloud checks. Seeing a provider label or a successful local file write does not prove cloud upload or cross-device synchronization.
- iOS-specific provider/picker/fullscreen/MIDI behavior requires a working iOS build and an appropriate device/simulator. Do not infer parity from Android or a tablet-sized browser viewport. Record missing native capability or test environment as a blocker.
- Real MIDI activity, timing and reconnection require compatible hardware. Simulated messages can verify UI state handling but must be labeled and must not replace a hardware test result.
- External download availability is time-dependent. Record the edition/source and test date; retain a local fixture for repeatable UI review without downloading the entire catalogue for each screen pass.

## Initial scope boundary

`TODAY-01` has an explicitly accepted compact visual reference and passing scoped verification; remaining behavior/accessibility/native coverage and child flows remain tracked. `PRACTICE-01` is the current refinement review, with accepted D-005 direction and verified refinement; the owner approved the layout except old movement controls, now revised by D-006. `HUB-01`'s detailed review remains open. Other destination screens remain unreviewed; shared-navigation changes and smoke checks do not accept their content. Visual acceptance of Today is not release-wide approval. The initial list includes retained compatibility surfaces so they are not silently overlooked; identifying them here is not a decision to expand the product scope.

2026-10-11 source follow-up: approved PLATFORM-04/13 corrections have targeted native phone/tablet geometry evidence in the [iOS follow-up](platform-ios-followup.md). The iOS download policy now ignores network type, and local reminders are integrated. MIDI implementation, real notification delivery and physical touch/accessibility acceptance remain open. Historical coverage columns are not promoted to release acceptance.


2026-10-12 beta follow-up: shared Profile appearance and walkthrough are implemented and covered by responsive captures in light/dark across all six main screens. C-DIALOG warm-up initial focus/scroll is verified natively on iPhone and iPad portrait/landscape; other long dialogs retain their earlier findings. Core MIDI is simulator-compiled; physical acceptance and closed-app notifications remain open. See ../releases/6.0.0-beta.1.md.


Beta 2 (2026-10-12) reopens shared practice timing (PRACTICE-01/05/06), PDF pause/edit/resume (SCORE-02/03), MIDI indicator gestures (MIDI-01/02) and configured cloud synchronization. Four responsive practice/save layouts and existing PDF editing regressions pass. Android beta41 replacement installation/foreground is confirmed; native Android/iOS screen-awake bridge checks are separate from responsive captures. Prior physical/provider acceptance gates remain open. See ../releases/6.0.0-beta.2.md.


Persistent-header follow-up (2026-10-12): all six main screens and shared navigation chrome reopened. Profile moves from base navigation to the top left; title/context controls and MIDI remain fixed while .cp-page scrolls. Fullscreen reader/score chrome remains separate. Header stability, control placement and light MIDI checked in 48 responsive states; dated evidence: captures/beta/2026-10-12/beta2-header.

2026-10-12 beta 3 reopens PROFILE-01, CLOUD-02 and CLOUD-05: QR/code linking, matching-file validation, compatible/organized backup export, conversion and annotated restore counts. Four-layout responsive evidence is in captures/beta/2026-10-12/beta3-device-link. Physical native camera/provider acceptance remains open.

2026-10-12 beta 4 reopens CLOUD-01–04 and PROFILE-01 after the owner's tablet report. Direct file selection is nested under device linking/manage; waiting messages and deferred conflict choices are repaired. Closed-dialog browser and two-device synthetic sync checks are distinct from personal tablet/provider acceptance. Evidence: captures/beta/2026-10-12/beta4-device-link.

2026-10-12: generated warm-up/free-practice toolbar reopened for a portrait-tablet extra-row report. Tablet-only five-column header passes responsive geometry and phone/landscape safe-area regression; browser before/after evidence in captures/generated-practice/2026-10-12-tablet-toolbar-review. Current beta 4 downloads retain the earlier header pending a later package.

2026-10-14: shared light-appearance contrast follow-up reopens C-DIALOG/C-SCORE/C-NAV and practice/transfer text states. Local repairs and 52 responsive browser states are recorded in [light contrast](light-contrast.md); native coverage and unvisited populated dialogs remain open.

2026-10-14: D-037 reopens PRACTICE-05/SCORE-03 and shared C-SCORE/C-PRACTICE for the approved raised timer. PDF/MusicXML phone/tablet portrait/landscape responsive geometry and timing, PDF 320px layout, paused annotations/framing and drag regressions pass. Native and reported two-second freeze acceptance remain open; see captures/session/2026-10-14-raised-timer/README.md.

2026-10-14 D-038 reopens PRACTICE-01/05/06, SCORE-02/03 and shared C-PRACTICE/C-SCORE: automatic score entry with one overview action; always-visible Edit/Finish; automatic pause on editing, resume on Done/Back, and pending-write preservation on finishing. Android-style Back is browser-reproduced, fixed and tested. The original Android PDF two-second freeze remains a native acceptance issue. Evidence: captures/session/2026-10-14-score-actions/README.md.

2026-10-14 CAL-06/CAL-07 recurrence extension: four responsive browser layouts and synthetic creation/edit/cancellation flows verified in `captures/calendar/2026-10-14-event-recurrence`. TODAY-02/05 and CAL-01/02 share rule-based occurrence expansion; existing acceptance statuses are unchanged. Native reminders and package acceptance remain pending.

2026-10-14 TODAY-01 weekly summary reopened at owner request: large saved minute total, optional weekly target/progress and direct Progress link, with four-layout light/dark evidence in `captures/today/2026-10-14-weekly-progress`. Primary practice action and shared calendar/nav geometry are preserved. Prior visual acceptance does not automatically cover this addition.


2026-10-14 navigation color parity reopens HUB-01, CAL-01/02 and REP-01/Catalogue visual evidence. Practice hub joins the shared palette; actual practice/preparation/score surfaces keep their scope. Populated screenshots in `captures/themes/2026-10-14-navigation-parity/` cover phone/tablet portrait/landscape, both themes and prior Today/Progress/Profile surfaces. Existing accepted Library flat-table objective is retained. Owner/native visual acceptance stays open; source-only change after published beta 7.


2026-10-14 owner beta 8 feedback reopens HUB-01 fixed header, CAL-01/02 mode switch and PIANO-02 Progress section switch. Shared selector geometry/color and inline action evidence: `captures/themes/2026-10-14-navigation-controls/`. Responsive checks pass in both themes, including narrow phones. No changes to preparation, exercise or score screens; no new release/native acceptance.

2026-10-15 D-040 reopens CAL-01/02 for compact saved-session pills. Twenty synthetic responsive frames across both themes, phone/tablet orientations and 320px verify geometry, detail routing and Add. C-AGENDA impact is restricted to Calendar; existing Today/navigation regression passes. Owner/native acceptance remains open. See [Calendar review](calendar.md).

2026-10-15 CAL-01/02 proposed icon-circle follow-up: conversation mockup compares 64px circles, smaller icon discs and existing pills. Activity colors/icons, minutes, optional mood, partial status and detail-on-selection are explored. This does not change app behavior or acceptance status. See the [design proposal](calendar.md#2026-10-15--circular-session-design-proposal).

2026-10-15 D-041: CAL-01/02 saved sessions now use accepted circular tokens in one horizontally scrolling row without a scrollbar; Week Add remains fixed. Thirty responsive frames, real browser touch/arrow gestures and 59–720 minute fixtures verify layout/actions. C-AGENDA scope stays Calendar-only; existing navigation/Today regression passes. Native and owner review of implementation remain open. See [evidence](captures/calendar/2026-10-15-session-circles/README.md).

2026-10-15 CAL-01/D-041 boundary follow-up: subtle theme-aware 1px dividers between adjacent days, verified in 30 new responsive frames. Horizontal row behavior remains checked. See captures/calendar/2026-10-15-day-separators. Native acceptance remains open.

2026-10-15 CAL-01/02 and C-NAV: Calendar Week/Month is kept beside its title on one header line. Ninety-six measured states and 30 captures include both themes, three languages, narrow phones and safe areas. Shared-header/navigation regressions pass across six screens. See captures/calendar/2026-10-15-inline-header; native acceptance remains open.

2026-10-15 CLOUD-01–04, PRACTICE-01 and C-TRANSFER/C-DIALOG reopened for missing Android Drive provider and local continuation. Browser evidence covers error/Manage/preflight across phone/tablet orientations, practice/save/restart/relink and late provider responses. Local mode keeps notebook IDs, PDFs, annotations and merge history. Android bridge compilation and replacement installation/data retention/foreground are separate native checks; real Drive and physical visual acceptance remain open. See captures/profile/2026-10-15-sync-local/README.md.

2026-10-15 C-NAV reopens TODAY-01, HUB-01, CAL-01/02, REP-01/Catalogue, PIANO-02 and PROFILE-01 for equal primary headers. Exact 68 px geometry, Profile/MIDI/title positions and content-start parity verified in 384 responsive states; Library tabs stay sticky below the header. Forty-eight long-title states and 48 representative frames preserve the earlier baselines. Included in signed stable 6.0.0/build53 on the website. Native first installation/loaded UI/foreground verified; populated native/physical and owner visual acceptance remain separate. See captures/themes/2026-10-15-header-parity/README.md and captures/releases/2026-10-15-stable6/README.md.

2026-10-15 D-042 reopens PIANO-02 Activity time presentation for beta 6.1: 12-week area chart, More details, type/piece filters, six ranges and previous-period comparison. Fifty-five synthetic responsive frames cover both themes and three languages; scoped arithmetic/navigation/data-retention checks pass. Today weekly summary and other Progress sections retain their scope. [Review and evidence](progress.md). Native/owner acceptance remains open; no new package/publication.

2026-10-15: MEDIA-02/PRACTICE-05/SCORE-03 and shared C-SCORE reopened for integrated Record/Stop, pause without tools and in-place pencil/check replacement. [Responsive evidence](captures/multimedia/2026-10-15-floating-stop-05/verification.json) covers four orientations and 320px in both themes; native acceptance remains open.

2026-10-15: owner accepts fixed score-control direction. Visible disabled editing clock and stable control geometry are responsive-browser verified in [current evidence](captures/multimedia/2026-10-15-fixed-edit-bar-03/verification.json). First beta 6.1 packaging and native installation evidence: [release validation](../releases/6.1.0-beta.1-validation.json); physical capture/layout acceptance remains separate.
