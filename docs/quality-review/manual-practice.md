# Free and repertoire practice

Review ID: **PRACTICE-05**. Status: **free-practice/metronome responsive layout accepted; repertoire and native review continuing**. Started: 2026-10-05.

## Proposed objective

Let a pianist time independent practice, choose or change repertoire, open the available score and pause or finish without losing performed time or annotations.

## Evidence and verification

2026-10-15 fixed-control refinement: the paused clock stays visible and disabled while editing. Toolbar width, dial geometry and anchor remain stable; only the pencil/check changes. Owner likes the direction and authorizes the first 6.1 beta. [Current geometry evidence](captures/multimedia/2026-10-15-fixed-edit-bar-03/verification.json).

2026-10-15 owner follow-up: pause keeps the score visible without opening annotation tools. Explicit Edit replaces its pencil with the Done editing checkmark in the same position. Record becomes Stop during capture, with no live panel covering the score; stopping opens review. [Current responsive evidence](captures/multimedia/2026-10-15-floating-stop-05/verification.json) includes pause/edit in both themes and phone/tablet orientations, plus 320px. Shared C-SCORE is reopened; native acceptance remains separate.

MusicXML baseline, 2026-10-05: [twelve four-layout browser examples](captures/session/2026-10-05-musicxml-practice-baseline-03/index.html). Synthetic direct viewer session; fixed clock, original notation, selected piano part, no real MIDI. Follow activation is asserted. Three follower unit tests cover chords/rests/hand filtering; these do not validate actual hardware or full repertoire entry. Observed: phone toolbar overflows/clips actions, long fixture title clips, timer remains separate from play and return arrow resembles page navigation. Proposed: align primary controls with accepted PDF hierarchy and move secondary zoom/follow settings into an explicit panel. Await owner direction; no product implementation or visual approval.

[Current split-page review](captures/session/2026-10-05-pdf-split-review/index.html) adds actual drawing of a saved section and reading it in four viewports. Landscape section mode is asserted. Synthetic staff-line fixture; this does not verify real score readability, native gestures or approve the visual result. D-027 compact framing and its expanded options are included.

Current owner visual review: [repertoire PDF gallery](captures/session/2026-10-05-repertoire-pdf-baseline-02/index.html), twenty examples (session entry, running, paused, expanded annotation tools and framing tools) across phone/tablet portrait/landscape. The PDF is a synthetic staff-line fixture, not a real engraved score. Source/build inputs and fixture provenance are recorded; only disposable browser notebooks were used. This is responsive browser evidence, not native acceptance. Functional checks are separate from owner visual acceptance. Review score visibility, floating controls, tool density and framing discoverability before continuing MusicXML.

[Baseline gallery](captures/session/2026-10-05-manual-practice-baseline-02/index.html) contains thirteen frames across twelve state/layout views: free practice paused/running and repertoire without a score paused, in the four standard phone/tablet layouts. Disposable synthetic notebooks, source/build hashes and measurements are preserved. The timer is frozen at eight minutes for visual comparison; these captures alone do not test elapsed time. No horizontal overflow or runtime exceptions were recorded. This is responsive-browser evidence, not native acceptance.

The immersive PDF regression passes all six child checks: running score fills the viewport; pause-only tools; fingering/annotation undo-redo; saved framing through page changes/rotation/reopen; movable widget bounds and anchored position; finish opens feedback without saving automatically. The manual background-pause regression also passes. Score fixtures are synthetic and disposable. Native file handling, real MIDI, background timing and missing-file recovery remain separate checks.

## Findings

- PDF-UI-F02: framing options are available, but the expanded portrait panel occupies most of the lower score. Review the hierarchy and explanation of **Save frame** versus **Split page** using [current portrait example](captures/session/2026-10-05-pdf-no-metronome/framing-tools-phone-portrait-01.png). Saved framing is separately regression-tested; visual acceptance is open. Current next point after the owner's “siguiente”; D-025 annotation acceptance remains pending.

- PDF-UI-F01: in phone landscape the expanded annotation panel covers almost the whole visible score, making it difficult to choose a tool and then mark a note. Evidence: [expanded phone landscape](captures/session/2026-10-05-pdf-timer-bar-02/annotation-tools-phone-landscape-01.png). Proposed direction, not implemented: collapse the palette after a finger/tool/color selection, keep a compact visible current-tool indicator and allow explicit reopening. Preserve 44px touch targets, undo/redo access, movable controls, persisted annotations and the accepted D-024 toolbar. Frame/split workflows must remain separate; do not automatically close controls needed to finish splitting.

Owner accepted the presented D-024 toolbar on 2026-10-05 (“looks good, continue”); this does not approve the expanded annotation panel or close PDF-UI-F01.

- MANUAL-F01: repertoire without a score exposes Finish session both in the page heading and inside the current-block card. Proposed review: decide whether one visible finish destination is sufficient in compact layouts while retaining the accepted session hierarchy.
- MANUAL-F02: these manual-timer views still use textual Continue/Pause alongside separate clocks, while generated practice uses D-019's timer/icon button. Proposed review: consider consistent control language across practice types; no automatic generalization has been implemented.

No product behavior was changed in this baseline pass. The accepted PRACTICE-01 session layout remains the reference; observations do not revoke its approval.

## Remaining coverage

D-027 implements the requested compact framing hierarchy. [Current gallery](captures/session/2026-10-05-pdf-compact-framing/index.html), including Additional options open/closed. Next point after the owner's request to apply and continue: splitting a PDF page and reading the saved sections in landscape. Implementation is not automatic visual acceptance; native gates remain open.

D-026 removes the old repertoire metronome option, retaining timer options and the dedicated free-practice metronome. [Updated examples](captures/session/2026-10-05-pdf-no-metronome/index.html). A future floating metronome from the practice toolbar is explicitly deferred and not implemented. D-025 annotation visual acceptance remains pending.

D-025 implements the accepted PDF-UI-F01 compact-palette direction plus requested sizing and editing. [Current examples](captures/session/2026-10-05-pdf-editable-marks-02/index.html). Select/move and endpoint resize are browser-verified for highlight, line, arrow, ellipse and rectangle; selected edits retain IDs, support undo/redo and survive reopening. Text/number size and line thickness are relative to page width. Owner visual acceptance and native gesture checks remain open.

D-024: elapsed time is inside the PDF play/pause button. Stop-square opens finish feedback; Return to session in the tools panel exits without finishing. [Current browser gallery](captures/session/2026-10-05-pdf-timer-bar-02/index.html). Toolbar fits a single row, including 320px phones (page count omitted at the smallest width). MIDI status is in the panel heading. Sixteen PDF checks pass; owner visual acceptance and expanded-panel density remain open.

Missing local PDF recovery passes in `tests/repertoire-recovery.browser.test.js`: a synthetic work references an absent asset; opening explains that the score must be added/downloaded again, releases the loading control, preserves paused performed time and permits another attempt or piece change. No product change was needed. Next review branch: MusicXML score presentation/follow in the browser, followed by native file and touch checks.

Owner approved D-022/D-023's presented free-practice/metronome layout on 2026-10-05 (“approve now and continue”), scoped to the final favorites-below gallery. Earlier pending visual notes below are historical. Continue repertoire score entry/recovery, not another metronome redesign. Fresh checks pass: six immersive PDF child checks, four repertoire model checks and three MusicXML-follow checks (14 including the PDF parent). These do not verify missing-asset recovery or native score handling.

Latest D-023 layout places favorites beneath the reduced landscape circle. [Current gallery](captures/session/2026-10-05-metronome-favorites-below/index.html); five-layout placement and favorite persistence checks pass. Owner visual acceptance remains pending.

D-023 follow-up corrects landscape beat placement and favorite-marker overlap. [Updated four-layout evidence](captures/session/2026-10-05-metronome-markers-01/index.html); browser geometry checks also cover 320px portrait. Favorites occupy a separate wrapping row below the faders. Owner visual and native acceptance remain open.

D-023 adds tempo/volume mixer faders and persistent chalk-style tempo favorites. See the [current responsive gallery](captures/session/2026-10-05-metronome-mixer-03/index.html). Favorite creation/selection/removal/recovery and zero-volume visual timing pass in the disposable browser regression; owner visual feedback remains pending.

2026-10-05 D-022 implements both owner-approved MANUAL-F01/F02 refinements and the requested dedicated free-practice workspace. The Soundbrenner screenshot guided the large tempo dial, beat indicators and Tap-tempo hierarchy. [Current four-layout gallery](captures/session/2026-10-05-free-practice-metronome-03/index.html) includes paused/running free practice and updated repertoire controls. Audio/visual selection, subdivisions, accented first beat, pause behavior and settings recovery are verified. Session editing/feedback and PDF checks pass. Owner visual feedback and native audio/touch coverage remain open; audio/video recording is a future idea, not available behavior.

- Discuss current timer/score workflow and findings with the owner.
- Metronome start/stop, manual timer accounting, background timing preference and interrupted score reopening.
- Work choice/change with accumulated time and unavailable PDF/MusicXML assets.
- MusicXML follow and PDF/native touch/rotation as separate child evidence.
- Large text, English/Spanish wording, accessible controls and save/error recovery.

## 2026-10-14 — Raised timer follow-up

D-037 applies the owner-approved reduced-depth circular timer to PDF and MusicXML practice. Teal running and ochre paused states retain icon/text cues and existing paused editing/finish rules. The timer remains inside the movable score toolbar; its raised edge is included in PDF drag bounds. See [dated responsive evidence](captures/session/2026-10-14-raised-timer/README.md). Timing past seven seconds, pause stability and resume pass; the owner's reported two-second freeze has not reproduced and remains open pending practice-type/device details. Browser verification is separate from native acceptance.

## 2026-10-14 — Direct entry, Edit/Finish and editing return

D-038 supersedes the pause-first Edit/Finish visibility rule. Start/continue score practice uses one action; the current repertoire score opens automatically at session start/Next block, with configured warm-ups respected. Edit/Finish remain visible; Edit pauses automatically, Done editing/Back resume, and Finish stops timing and opens feedback. A visible automatically opened PDF panel previously closed to the paused overview on Back; this is reproduced and corrected. See [final responsive evidence](captures/session/2026-10-14-score-actions/README.md). Owner clarified Android PDF for the two-second report; exact native freeze remains unverified because the emulator did not boot. No notebook cleared and no new package.

## 2026-10-14 — Fullscreen free-practice metronome

Owner requested all metronome controls within the viewport without scrolling. The dedicated free-practice workspace now occupies the viewport with safe-area padding; Session and Finish/Next remain available. Portrait uses a compact console, while landscape places the dial and controls side by side and settings in one row. Existing timing and audio behavior is unchanged. `tests/free-fullscreen.browser.test.js` passes six responsive sizes, start/stop-state entry and return to session. Evidence: `captures/session/2026-10-14-free-fullscreen/`. Native-device acceptance, large text and extensive saved-tempo lists remain unverified. No APK built.

## 2026-10-14 — Edit completed practice

Owner requested a separate edit action on saved practice. Implemented minutes/seconds and passage editing, repertoire score replacement, and adding manual blocks (repertoire/free/reading/technique). Saves use a copied notebook and preserve IDs, date, feedback and annotations; cancel makes no mutation. Totals and work references are recomputed, and score replacement clears only that result's automatic measurement/material. Unit validation and browser cancel/save regression pass. Four responsive synthetic captures: `captures/session/2026-10-14-edit-completed/`. Native acceptance remains open; no APK built.

## 2026-10-15 — Local recording entry points

Beta 6.1 source adds Record to repertoire blocks and PDF/MusicXML practice controls. The recording panel stays in the active modal top layer and can minimize during score reading. [Synthetic responsive evidence](captures/multimedia/2026-10-15-local-03/capture.json) covers choose/live/library/preview; existing PDF practice, annotation Back/resume and session/header/navigation checks pass. Native camera/microphone and owner layout acceptance remain open; no package or release is implied. See the recording decision and MEDIA-01/02 inventory.
