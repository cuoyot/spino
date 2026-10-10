# Generated practice with note-name answers

Review ID: **PRACTICE-03**. Status: **baseline reviewed; objective and refinements proposed**. Started: 2026-10-05.

Owner feedback, 2026-10-05: “all fine now, move to the next one” accepts the presented D-016–D-018 refinement. Continue to PRACTICE-04. Outstanding accidental, accessibility, enlarged-text and native checks remain open; the original tall-answer-button finding is retained as an observation, with no further density change requested.

The owner requested progression to the next UI surfaces after approving the presented on-screen practice direction. Hanon and manual-piano timer visibility remain deferred. This child review covers note-name input for generated reading and technique.

## Proposed objective

Let the pianist identify the current note, choose its name and accidental, and understand feedback immediately, with readable answer labels and a clear Pause/Continue action in all four layouts.

## Evidence and behavior

[Baseline gallery](captures/generated-practice/2026-10-05-note-names-baseline/index.html) contains twelve production-browser captures: paused timed reading, self-paced reading after one correct and one wrong answer, and self-paced technique after a correct answer, each in phone/tablet portrait/landscape. The fixtures are disposable synthetic notebooks; capture metadata records build/source hashes and geometry. This is responsive-browser evidence, not native acceptance.

The existing focused browser test for self-paced note-name technique passes: correct answers advance, wrong answers retain the expected note, score geometry stays fixed, and idle time does not generate misses. The reading capture also records one correct and one wrong response. Other interaction branches remain open.

## Findings and proposed refinements

- NAMES-F01: the recovery toast covers the vertically centred answer labels in phone portrait. This extends GEN-F01 to PRACTICE-03. Proposed refinement: place recovery status above the answer area, clear of playable controls.
- NAMES-F02: phone landscape reduces Pause to **P…** in a 44 px slot. This is the shared phone-landscape grid issue from GEN-F06; note-name input hides recenter, so the narrow primary button is visible here. Proposed refinement: reserve a dedicated column wide enough for the complete primary label.
- NAMES-F03: phone-portrait answer buttons stretch through the full input area, with labels centred deep in the tall controls. Proposed refinement: compare a more compact answer strip that preserves readable labels and comfortable touch targets while giving the score more space. The current layout has not been rejected or changed.

## Remaining coverage

2026-10-05 D-018: the owner requested shortcuts at the top of Settings in every layout and a single mobile statistics/feedback row. [Current gallery](captures/generated-practice/2026-10-05-settings-shortcuts-names/index.html) includes four Settings states. The phone practice header now uses two lines; statistics and feedback share one row below the score. Visual feedback and native acceptance remain open.

2026-10-05 message refinement: D-017 implements the owner's request to reuse the existing feedback/count-in row. The floating recovery notice no longer covers answer labels; [new captures](captures/generated-practice/2026-10-05-note-names-inline-status/index.html) verify this in all four layouts. NAMES-F01 is resolved for the responsive-browser shell; native verification and NAMES-F03 remain open.

2026-10-05 refinement: D-016 implements the owner's requested play triangle and two pause bars, with localized labels/tooltips retained. [Updated four-layout gallery](captures/generated-practice/2026-10-05-note-names-icons-02/index.html). The shared phone grid is corrected to keep the control and shortcuts in separate slots; this resolves NAMES-F02's truncated textual action. NAMES-F01/F03 remain open.

- Review the objective, current gallery and proposed refinements with the owner.
- Verify sharp/flat toggling, enharmonic names, English labels, keyboard focus and enlarged text.
- Check pause/settings/return/resume and timed answer behavior specifically with note-name input.
- Recheck shared controls across PRACTICE-02–04 when any accepted refinement is implemented.

The manual remains unchanged in this baseline pass. No proposed behavior is described as available.
