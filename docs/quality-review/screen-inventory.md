# Screen review inventory

Created: 2026-10-01. Scope: the current SPino preliminary release, before declaring version 1.0 ready.

This is a navigation and coverage map, not a list of approved designs. It records current surfaces and explicitly identified surfaces in implementation. Start with `TODAY-01`; follow its entry points into the relevant child surfaces without treating those destinations as reviewed automatically. Keep IDs stable when labels, routes or layouts change. Add a new ID for a genuinely new surface and retain retired IDs with a reason.

D-002–D-004 are implemented with passing scoped checks, and the owner explicitly approved the presented compact Today result on 2026-10-01: “me gusta, aprobar y continuar”. Its 21-frame compact run is the accepted visual reference. TODAY-01 retains V because remaining behavior/accessibility/native coverage is open; visual acceptance does not close child flows. Current focus is [PRACTICE-01](session.md) through Today Start/Resume, with D-005 accepted, live editing implemented and four-layout verification captured; the owner approved the rest of the layout and D-006 revises movement controls; child coverage stays open. Library/Biblioteca is the accepted replacement label for My piano; PIANO IDs remain stable. Progress moves under Profile without renumbering PIANO-02/03. Other destinations have shared-navigation smoke checks, not complete design reviews.

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
| CAL-06 | New/edit event dialog | Event type, date/time, place/notes, linked works and reminder; no repertoire; long content; keyboard open; save/cancel/errors | C-DIALOG, C-AGENDA | N | — | — | — | — |
| CAL-07 | Event detail route | Future/past event; milestones; linked works and rehearsal preparation; edit; recurring-series cancellation; delete confirmation; missing linked work | C-AGENDA, C-DIALOG | N | — | — | — | — |
| CAL-08 | Drag rescheduling in week calendar | Pending practice plan; events and completed/active plans are not draggable; D-006 long-press lift versus scrolling; target-day highlight and release; temporary bin following appointment/recurrence deletion rules; canceled drag; invalid/unchanged target; pointer/keyboard alternative via reschedule; preservation of recurring siblings | C-MOVE, C-AGENDA, C-DIALOG | N | — | — | — | — |
| CAL-09 | Log completed practice dialog | Date/minutes/activity/optional work; feedback and next step; no works; validation; save result (`PIANO-03`); cancel | C-DIALOG, C-FEEDBACK | N | — | — | — | — |

## Practice preparation and sessions

Source: `src/companion/views.js`, `practice-duration.js`, `practice-defaults.js`, `app.js`, `src/main.js`.

PRACTICE-01 has [27 baseline frames](captures/session/2026-10-01-baseline/index.html) across planned, resumed, running and disconnected states in all four standard viewports. No horizontal overflow or runtime errors were recorded; all four landscape-phone primary actions are below the fold. That historical baseline is preserved. D-005 now adds the compact current-block view and live editing, with [20 follow-up frames](captures/session/2026-10-01-session-editor/index.html) and an [eight-frame Add dialog gallery](captures/session/2026-10-01-add-block/index.html). All 16 primary actions are now visible; functional regressions pass.

| ID | Surface and entry point | States and branches to inspect | Shared components | Status | PP | PL | TP | TL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PREP-01 | Prepare your practice route | Each activity; mobile/piano/MIDI context; duration slider; defaults; hands/range/figures; timed/self-paced mobile mode; tempo; expanded Options; input choice; presentation; passage; field validation and keyboard | C-DURATION, C-PRACTICE, C-DIALOG | N | — | — | — | — |
| PREP-02 | Multi-block practice and More options | Collapsed/expanded blocks; add/remove/reorder using D-006 long-press/bin standard with accessible alternatives; total-duration redistribution; up to supported block limit; save routine name dialog; schedule draft; cancel and return without losing draft | C-MOVE, C-DURATION, C-DIALOG, C-PRACTICE | N | — | — | — | — |
| PREP-03 | Plan/edit planned practice variants | Apply saved routine; edit only the chosen appointment; date/time/reminder save dialog; changed context/material; required fields; return/back preservation | C-DURATION, C-AGENDA, C-DIALOG | N | — | — | — | — |
| PREP-04 | Choose catalogue material from preparation | Add a repertoire block or replace one; catalogue selection mode; download/pending state; choose PDF/MusicXML; return to preparation; preserve duration, date and purpose | C-PRACTICE, C-TRANSFER, C-NAV | N | — | — | — | — |
| PRACTICE-01 | Session route; current review from Today Start/Resume | Before start, running, paused, resumed; block list/timer; orientation advice; next/final block; continue later; reopen after background/relaunch; accepted objective: understand the current block and begin/resume with clear time, pause and finish; inline durations, reorder, add/remove and preserved progress | C-MOVE, C-PRACTICE, C-MIDI, C-DURATION | V | [Refinement](captures/session/2026-10-01-session-editor/planned-phone-portrait-01.png) | [Refinement](captures/session/2026-10-01-session-editor/planned-phone-landscape-01.png) | [Refinement](captures/session/2026-10-01-session-editor/planned-tablet-portrait-01.png) | [Refinement](captures/session/2026-10-01-session-editor/planned-tablet-landscape-01.png) |
| PRACTICE-02 | Generated reading/technique with mobile keyboard | Timed and self-paced; correct/wrong answer; feedback/focus stability; key size, pinch/pan and range commit; paused adapted line; guides/fingering; screen rotation; multiple systems/pages | C-PRACTICE, C-MIDI, C-SCORE | N | — | — | — | — |
| PRACTICE-03 | Generated reading/technique with note names | Timed/self-paced; all answer names/accidentals; feedback and mistakes; no physical piano requirement; narrow/short viewports; pause/settings/finish | C-PRACTICE, C-SCORE | N | — | — | — | — |
| PRACTICE-04 | Generated reading/technique with piano or MIDI | One/two hands and grand staff; manual versus measured input; scroll/fixed page; page controls; focus across bar/system boundaries; MIDI connected/disconnected/reconnected; switch to manual tracking | C-PRACTICE, C-MIDI, C-SCORE | N | — | — | — | — |
| PRACTICE-05 | Free/repertoire session timer | Work with/without score; start/pause; metronome; open PDF/MusicXML; background-timer option; interrupted/reopened score; unavailable local asset; manual tracking labels | C-PRACTICE, C-SCORE, C-MIDI | N | — | — | — | — |
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
| READER-05 | Show scale dialog and warm-up | Staff/note names/mini keyboard; close; warm-up entry/exit; viewport fitting; managed versus legacy behavior | C-DIALOG, C-SCORE, C-PRACTICE | N | — | — | — | — |
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
| C-DIALOG | Heading, primary/cancel/destructive actions, safe-area sizing, internal scroll, focus, validation, keyboard, native back | All dialog rows; READER tabs; SCORE text input; native picker transitions |
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
