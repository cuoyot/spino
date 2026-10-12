# Session overview review

Review ID: **PRACTICE-01**, reached from TODAY-02/03. Status: **D-005 direction accepted; implemented and in scoped verification; approved except the original movement controls, revised under D-006**. Updated: 2026-10-01.

The compact Today presentation is visually accepted under D-004. This review follows its Start/Resume actions into the current session overview. No application behavior or session design was changed while collecting this baseline. Feedback defects are recorded against PRACTICE-06 without implying that its full review is complete.

## Accepted objective

Know the current block and whether practice is running, then start/resume, advance or finish without uncertainty or losing work. The current block and its primary action should dominate; the session sequence and elapsed time provide context. Apply the accepted compact density where it supports that objective.

Accepted success criteria:

- Distinguish ready, paused, running and blocked states explicitly.
- Keep the appropriate play/pause/recovery action visible in the four standard layouts.
- Distinguish elapsed block time, elapsed session time and suggested duration.
- Preserve a usable return path from an exercise, feedback, instrument settings and backgrounding.
- Make Next block, Finish and Continue later predictable; a failed save must leave a retryable session.

## Baseline evidence

[Open the four-layout gallery](captures/session/2026-10-01-baseline/index.html). It contains **27 frames from 16 state/layout combinations**, including content below the first viewport. [Metadata](captures/session/2026-10-01-baseline/capture.json) records source/build hashes, geometry, fixture inputs, timer text and browser version.

| State | Entry and fixture |
| --- | --- |
| Planned | Today → Start practice; 40-minute piano session with technique, reading and repertoire; first block has not started. |
| Resumed | Today → Resume session; first block completed, second reading block paused; 18 minutes overall, 8 in the current block. |
| Running | Today → Resume session → Start / continue; single 40-minute free-practice block; 8 minutes already elapsed. |
| Disconnected | Today → Resume session; two-hand MIDI reading; no connected instrument or invented input. |

Each orientation starts from a fresh synthetic notebook and uses the actual UI entry. Time is frozen for reproducible screenshots, so the images do not establish live timer accuracy. No PDFs, personal notebook or installed emulator data were changed. These are Chromium responsive captures, not native-device or physical-MIDI acceptance.

| Layout | Planned session | Open exercise bounds | Fully visible initially |
| --- | --- | --- | --- |
| Phone portrait, 390 × 844 | [Image](captures/session/2026-10-01-baseline/planned-phone-portrait-01.png) | y=396–440 | Yes |
| Phone landscape, 844 × 390 | [Image](captures/session/2026-10-01-baseline/planned-phone-landscape-01.png) | y=384–428 | No |
| Tablet portrait, 768 × 1024 | [Image](captures/session/2026-10-01-baseline/planned-tablet-portrait-01.png) | y=428–472 | Yes |
| Tablet landscape, 1024 × 768 | [Image](captures/session/2026-10-01-baseline/planned-tablet-landscape-01.png) | y=444–488 | Yes |

All four landscape-phone states hide part or all of the exercise/timer primary action below the initial viewport. The disconnected state places Open exercise at y=540–584. No horizontal page overflow or runtime exceptions occurred in the 16 captures. The MIDI utility and Finish do not overlap in the checked tablet-landscape probe.

## Findings

| ID | Observation and evidence | Scope |
| --- | --- | --- |
| SESSION-F01 | The large clock and centered card displace the main action in phone landscape. Current timer typography is 48–84px; the current card has substantial vertical padding. All four landscape states require scrolling to use its primary control. | PRACTICE-01; C-PRACTICE; D-004 consistency |
| SESSION-F02 | Today Start/Resume and preparation submit open a paused overview. Quick routines can open and play reading/technique immediately. The same intent has different entry behavior. | TODAY-02/03, HUB-01, PREP-01, CAL-05 |
| SESSION-F03 | A resumed second block shows **18:00** beside **10 suggested minutes**, though only 8 minutes belong to that block. The timer is the whole-session total; the duration belongs to the current block. There is no explicit paused badge or current-block emphasis in the sequence. | PRACTICE-01; C-PRACTICE |
| SESSION-F04 | Complete session advances beyond the final block before opening feedback. Choosing Keep practicing then leaves no Start/Open exercise control. Header Finish opens the same dialog without first advancing. Both labels obscure this difference. | PRACTICE-01/06; C-FEEDBACK |
| SESSION-F05 | A manual timer pauses when the browser becomes hidden, but on return its button can still say Pause. The next press starts time. This is a reproduced browser lifecycle inconsistency; native lifecycle verification remains open. | PRACTICE-01/05; C-PRACTICE |
| SESSION-F06 | Orientation advice is computed during rendering and remains stale after an in-place rotation. It can also recommend score orientation during free practice without a score. | PRACTICE-01; orientation helpers |
| SESSION-F07 | MIDI-disconnected view offers connection/manual recovery yet keeps Open exercise as the main exercise action. Opening refuses unavailable MIDI; a browser permission denial produces a toast. Physical USB/Bluetooth behavior was not tested here. | PRACTICE-01/04, MIDI-01 |
| SESSION-F08 | Starting the metronome starts the timer; stopping the metronome leaves time running. This behavior is verified but not stated by the control. Whether to retain it needs a product decision. | PRACTICE-01/05 |
| SESSION-F09 | An injected feedback storage failure leaves the pending session on disk but mutates in-memory history and clears its active session. Retry says it is already saved; returning Today loses the in-memory Resume entry. This is a confirmed persistence defect, not a visual finding. | PRACTICE-06; C-FEEDBACK; release-blocking correctness work |

The [interaction probe output](captures/session/2026-10-01-baseline/interaction-probes.json) covers final-block cancellation, manual timing, orientation and MIDI refusal. The separate [save-failure probe](captures/session/2026-10-01-baseline/save-failure-probe.json) uses an injected failing write in a disposable browser. Neither is evidence of a physical-device failure. Reproduction steps and source references follow.

## Baseline actions and reproduction paths

| Action | Verified baseline behavior |
| --- | --- |
| Open exercise | Configures/restores reading or technique and starts playing; the overview is hidden. Refreshes MIDI first when required. |
| Start / continue / Pause | Toggles manual practice timing for free/repertoire blocks. |
| Open score | Available when the work has an asset. Shares the session timer state; opening a paused score does not itself start timing. This asset-specific branch still needs its own visual evidence. |
| Next block | Pauses, records the current block and advances to the next paused block. |
| Complete session | Advances beyond the final block and opens feedback. Closing that feedback reproduces F04. |
| Header Finish | Pauses and opens feedback without first advancing. Closing leaves the current block paused and available. |
| Continue later | Pauses, persists the active checkpoint and returns Today. It does not add a completed history entry. |
| Discard session | Confirms, then removes the pending session after persistence succeeds. Saved sessions remain. |
| Connect instrument / MIDI status | Pauses and opens Instrument. |
| Use MIDI / Continue with manual tracking | Records the current measurement, resets current-block runtime and changes the active session context. |
| Main navigation / Back | Keeps the active session; leaving its overview pauses timing. Back from the exercise returns to the overview paused. |

For F05, start a free-practice timer, trigger a browser hidden/visible cycle and compare its Pause label with persisted `runningSince: null`. For F06, open a MIDI reading session in phone portrait, then rotate without another action. For F09, fail one notebook write during feedback Save, retry, inspect both disk and UI, then return Today. The stored session remains pending while in-memory state diverges.

Primary source references: [session creation and overview](../../src/companion/app.js:362), [exercise entry and block completion](../../src/companion/app.js:382), [feedback persistence](../../src/companion/app.js:404), [timer/metronome actions](../../src/companion/app.js:678), [visibility handling](../../src/companion/app.js:753), [saveSession mutation](../../src/companion/model.js:53), [orientation advice](../../src/companion/views.js:130).

## Refinement accepted under D-005

- A compact current-block panel, explicit Ready/Paused/Practising state and one appropriate primary action.
- Separate block elapsed time from session total; show suggested duration without implying a countdown or automatic advance.
- A concise sequence with the current block highlighted. Keep its detail reachable without a large second panel dominating the screen.
- Distinguish Next block from Finish session, and retain a working return path when feedback is canceled. Repair F04/F05/F09 before considering this flow release-ready.
- Show relevant orientation advice only, update it after rotation, and align MIDI recovery with the blocked primary action.

The owner agreed with this analysis and requested live session editing. The implementation places a compact current-block panel first, beside or above the editable sequence. Today Start/Resume still opens this paused overview with an explicit start action. Quick-routine auto-entry remains unchanged and tracked as SESSION-F02; choosing a common entry contract across all sources is separate from accepting the editing direction.

## Live editing implementation and verification

[D-005](decisions.md#d-005--adapt-the-current-session-without-losing-performed-work) records the accepted direction. The active sequence now supports inline minutes, up/down moves, removal and a compact Add block dialog. Edits pause practice and preserve source routine/plan structure. Completed blocks stay fixed. Moving a started block retains its time, answers and generated-score snapshot; removing it archives performed work. An old all-complete checkpoint can recover by adding a fresh block.

[Session comparison gallery](captures/session/2026-10-01-session-editor/index.html): **20 frames, 16 views**, using the same four fixtures and standard layouts. All 16 primary controls are visible initially; no page-width overflow or runtime exceptions. Planned landscape-phone primary moves from y=384–428 to **y=202–246**. Separate block/session clocks correctly show 8:00/18:00 for resumed practice. Touch controls retain 44px targets. The [Add block gallery](captures/session/2026-10-01-add-block/index.html) adds **eight English/Spanish modal captures**, with all fields and submit visible even in phone landscape; exact synthetic inputs and hashes are retained.

Confirmed repairs: F01 density, F03 time/state distinction, F04 final-block cancellation, F05 background pause labels, F06 relevant/updated orientation advice, F07 MIDI recovery as primary, and F09 atomic feedback-save retry. F02 start semantics and F08 metronome/timer coupling remain unchanged for their child review. Old findings/actions above describe the immutable baseline, not current behavior.

Verification evidence:

- Ten pure edit/model tests cover accrued time, generated material, suspended answers, removal without loss, source IDs, completed-prefix protection, limits, backup/recovery, finalization and old all-complete checkpoints.
- Six browser regressions cover final feedback cancellation, write failure/retry without duplicates, background control refresh, live add/reorder/remove/minutes across reload, failed removal rollback, repertoire selection and live orientation advice. These use disposable notebooks and simulated failures/lifecycle events.
- Full suite: 227 tests exercised, 224 passed, one optional network test skipped, and two reported failures from the same obsolete PDF button-label assertion and its parent test. The assertion was updated for the new Continue label; the focused PDF suite then passed all nine tests. No unresolved failure remains. Logs: [full run](../../artifacts/session-editor-tests.log), [PDF rerun](../../artifacts/session-editor-pdf-recheck.log), [focused browser run](../../artifacts/session-refinement-browser-tests.log). This accurately distinguishes the full run from its focused correction.
- Today/navigation/layout/locale checks from the full suite remain valid. Session styling and Add-form styling are scoped; the accepted Today layout is unchanged. Source routine/plan isolation and Today Resume are exercised by the new regressions.
- Production web and Android APK builds passed. The APK was installed in the existing emulator. [Native navigation smoke](../../artifacts/session-editor-native-check.log) verified Android Back, navigation and the 44px MIDI target; notebook and all 55 asset/annotation hashes stayed unchanged. Live editing itself was verified in disposable browsers, not by modifying the installed notebook. No claim of physical MIDI, iOS, native four-orientation or OS-keyboard acceptance is made by responsive captures.

## Continuation

- [x] Accept objective/refinement direction and add live editing.
- [x] Repair F04/F05/F06/F09 with regression evidence; capture the compact result in four layouts.
- [x] Update the [session manual](../manual/en/session-overview.md); it stays draft while child reviews continue.
- [x] Owner approved the result except the always-visible movement controls. D-006 supplies long-press movement and a temporary bin.
- [ ] Resolve common entry semantics and review metronome start/stop wording in the relevant child flow.
- [ ] Review repertoire with/without PDF or MusicXML, connected/reconnected MIDI, no-tempo mobile input, prior-day recovery, feedback, long text and assistive input.
- [ ] Verify real background/foreground, safe areas, soft keyboard and orientation on Android; physical MIDI and iOS remain separate gates.

Next: review the compact session/editor result, then follow Start/Continue exercise into the reading/technique child view. Keep the accepted Today as the density reference and carry D-005 data-preservation rules into later preparation/routine reviews.

## D-006 follow-up and handoff

The owner approved the rest of this screen and requested long-press rearrangement with a temporary bin. The arrow-based 20-frame gallery remains historical; the [new gesture gallery](captures/session/2026-10-01-session-drag-02/index.html) includes held states in all four layouts. Seventeen focused tests pass, including actual Chromium touch gestures, native-scroll cancellation, bin removal with retained progress and last-block protection. Existing feedback/edit failure regressions still pass. Touch behavior on physical Android/iOS devices remains a separate gate.

Stop here for this conversation. Next: PRACTICE-02 reading/technique baseline and objective, preserving the approved overview and D-006 gesture convention.

Updated Android APK built and installed after D-006. Navigation/Back smoke checks passed; the installed notebook and all 55 assets/annotations were unchanged. [Native check](../../artifacts/session-drag-native-check.log). Gesture verification remains Chromium touch emulation; no synthetic notebook was written into the emulator.

## D-007 block editor and duration refinement

The owner requested editing each block, using the card width and easier duration changes. Each unfinished row now groups Edit and the drag grip on the right, with a full-width duration slider and exact minutes beneath. The planned total previews slider changes; release commits them. D-006 long-press/bin behavior remains intact. The pencil opens activity, minutes, scale/work, hands and tempo, plus context-specific timing and a More settings disclosure. Completed blocks remain read-only.

Changing musical settings archives earlier performed work with its original settings and clears only the edited block's exercise runtime. Duration-only changes retain the current exercise position. Both preserve total time, stable IDs and original routines/plans. Cancel leaves settings unchanged; failed saves keep the original paused session and form for retry.

Evidence: [overview and held states](captures/session/2026-10-01-block-controls-02/index.html), 24 frames across 16 views; [English/Spanish editor, basic and expanded](captures/session/2026-10-01-edit-block-02/index.html), 24 frames across 16 views. Both use the four standard layouts and disposable notebooks. The basic phone-landscape editor fits Save/Cancel without scrolling; expanded settings remain scrollable. Historical runs are retained. New visuals await feedback.

Production web build passed. [Twenty-four focused tests](../../artifacts/session-block-edit-tests.log) pass: 13 model/editor cases, seven session browser regressions, touch drag/bin and notebook layout checks. Coverage includes preview versus commit, cancel, musical edits, unchanged defaults, failed save/retry, reload and preserved earlier work. The manual now describes verified editing behavior. Do not start a new screen in this conversation; next review remains PRACTICE-02 after this final refinement.

The Android APK built successfully and was installed and launched in the existing emulator. [Native navigation/Back check](../../artifacts/session-block-edit-native-check.log) passed with the notebook and all 55 assets/annotations unchanged. Editing was exercised in disposable browser fixtures; physical touch, MIDI, iOS and native keyboard/orientation remain separate coverage gates.


## Beta 2 practice behavior — 2026-10-12

New sessions autoplay the timer; saving allows duration adjustment while retaining measured duration and consistent breakdowns. PDF Done editing resumes only after successful persistence; a pause releases screen-awake policy and permits finishing. Ongoing cloud writes preserve revision/conflict/recovery guards and defer incoming changes during practice/editing. MIDI short reconnect and held-settings apply to main screens and score/generated readers. Four responsive layout checks and the PDF regression suite pass; native Android installation/foreground is confirmed, with physical MIDI/cloud and notification delivery acceptance still open. See ../releases/6.0.0-beta.2.md and captures/beta/2026-10-12/beta2.

## Tablet warm-up toolbar review — 2026-10-12

The owner's portrait-tablet capture shows Next: Free practice on an otherwise empty second row. The toolbar defines four columns but contains five visible items when the warm-up guide is available. Implemented a tablet-only five-column grid (minimum width/height 600 px), keeping Session, title, guide, MIDI and Next on one row. Tablet portrait/landscape geometry and minimum 44 px action height pass; phone layouts and landscape safe-area regression pass. Dated before/after captures use a disposable synthetic warm-up/free-practice session in captures/generated-practice/2026-10-12-tablet-toolbar-review. This is responsive browser review; the proposed visual arrangement awaits owner assessment and is not in the published beta 4 APK/archive. No further native package has been built for this layout change.
