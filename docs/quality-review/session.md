# Session overview review

Review ID: **PRACTICE-01**, reached from TODAY-02/03. Status: **baseline captured; objective and refinement proposed**. Updated: 2026-10-01.

The compact Today presentation is visually accepted under D-004. This review follows its Start/Resume actions into the current session overview. No application behavior or session design was changed while collecting this baseline. Feedback defects are recorded against PRACTICE-06 without implying that its full review is complete.

## Proposed objective

Know the current block and whether practice is running, then start/resume, advance or finish without uncertainty or losing work. The current block and its primary action should dominate; the session sequence and elapsed time provide context. Apply the accepted compact density where it supports that objective.

Success criteria for discussion:

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

## Current actions and reproduction paths

| Action | Verified current behavior |
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

## Proposed refinement, not yet accepted

- A compact current-block panel, explicit Ready/Paused/Practising state and one appropriate primary action.
- Separate block elapsed time from session total; show suggested duration without implying a countdown or automatic advance.
- A concise sequence with the current block highlighted. Keep its detail reachable without a large second panel dominating the screen.
- Distinguish Next block from Finish session, and retain a working return path when feedback is canceled. Repair F04/F05/F09 before considering this flow release-ready.
- Show relevant orientation advice only, update it after rotation, and align MIDI recovery with the blocked primary action.

The open entry decision is whether Today Start/Resume should open the current block ready for an explicit start, or show the overview first. Do not change Today's accepted behavior or silently auto-start the timer while that decision is unresolved. Any agreement applies to planned practices, routines, preparation and Calendar; update those previously reviewed entry points together.

## Verification and continuation

- [x] Production build; immutable inputs, source hashes and 27 captures; no capture runtime errors or horizontal overflow.
- [x] Read-only code audit and disposable interaction probes; application source unchanged.
- [x] Draft the [session overview manual](../manual/en/session-overview.md) from current behavior.
- [ ] Agree the objective and entry semantics; then refine and capture comparable after states.
- [ ] Repair confirmed correctness findings and add focused regression coverage as part of implementation.
- [ ] Review repertoire with/without PDF or MusicXML, connected/reconnected MIDI, no-tempo mobile input, prior-day recovery, completed blocks, feedback, long text and assistive input.
- [ ] Verify real background/foreground, safe areas and orientation on Android; physical MIDI and iOS remain separate gates.

Next: discuss this baseline and the proposed entry decision, implement the agreed session flow, then continue into its exercise, timer, score and feedback child views. The approved compact Today remains the density reference and must be rechecked if shared navigation or Start/Resume behavior changes.
