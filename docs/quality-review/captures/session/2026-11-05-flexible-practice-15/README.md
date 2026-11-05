# Flexible practice, shared controls and a frameless reader — 2026-11-05

**Responsive browser evidence, disposable synthetic notebooks. Not native-device acceptance.** No APK or publication was requested. Earlier runs 01–14 remain retained.

The owner accepted flexible direct block entry and requested the successive refinements documented in `docs/quality-review/session.md`: warm-ups remain selectable; every block accumulates time across visits; Continue later sits upper right; Finish/Discard sit together lower right; the stop square returns to the menu for multi-block practice. The common floating grip/clock/stop/options slots start at the same lower-right position in PDF, MusicXML, generated reading, note names, technique, Hanon and free practice. Block and whole-session clocks remain separate.

The final physical-piano/MIDI generated sheet reaches all viewport edges without an external header/card/frame, with an internal 120 px notation inset for bottom clearance. Previous/Next buttons are replaced by the shared PDF/MusicXML edge-tap rules, with keyboard alternatives and a read-only measure label. Page browsing pauses/checkpoints without adding time; a swipe returning to its starting edge is rejected.

## Final checks

- Run 15: **9 browser checks pass**, covering real pointer entry, accumulated times, shared-control geometry, portrait/landscape phone/tablet and narrow/reported layouts, both themes, keyboard clearance, edge navigation/swipe rejection, full-viewport bounds and bottom notation clearance, repetition/recovery, final accounting, cursor/light alignment, clock cadence/pause/return and free-practice containment.
- Run 14: **13 browser checks pass**, including the full PDF recording/MIDI/minimization/drag/rotation/framing/annotation/editing/final-feedback regression. Recording panels expand without displacing the core slots and dragged widgets use viewport-safe positioning.
- Run 13: the PDF/MusicXML score-timer regression passes, including independent XML total/block clocks, pause/resume, minimization and editing in phone/tablet orientations. Its combined suite retained an obsolete expected Spanish stop label; that assertion was updated to the owner-requested Stop wording and the full PDF suite passes in run 14. The combined run-13 log is retained there.
- Full unit suite: **378 pass, 1 skip, 1 existing failure** out of 380. The lesson-reminder expectation also fails against an isolated export of unchanged HEAD: its fixture leaves notifications disabled. This failure is unrelated to the practice changes and is not presented as a passing check.
- Production build and scoped whitespace checks pass. `metadata.json` records actual source/build hashes and fixture asset identities. Logs are retained alongside it.

The synthetic score bytes, annotation IDs/content, block/session identities, passages and PDF reading position are checked through switching, reload and final save. The copied-Hanon preparation defect is covered by a narrow recovery test and a repeat-practice browser regression. Actual entry and stop-to-menu were additionally exercised in the existing browser review notebook without replacing its saved practices or active progress.

## Reproduce

Fixture factory: `scripts/review/flexible-practice-fixture.mjs`. Checks: `tests/flexible-practice.browser.test.js`, `tests/flexible-practice.test.js`, `tests/practice-clock.browser.test.js`, `tests/score-guides.browser.test.js`, `tests/free-fullscreen.browser.test.js`, `tests/pdf-practice.browser.test.js`, `tests/score-timer.browser.test.js` and `tests/pdf-recording-finish.browser.test.js`.

The review app is served from the current checkout at `http://127.0.0.1:5174/`, using the isolated synthetic review notebook established for this task. Its contents may include the owner's subsequent experiments; do not overwrite it. Native fullscreen/system bars, physical MIDI and final owner visual acceptance remain separate.

Final in-app browser handoff: the old development server had stopped while the tab retained its loaded styles. The server was restarted on the same 5174 origin and a fresh tab reopened the existing review notebook without reseeding it. Actual browser fullscreen was then verified at 2560×1440: sheet bounds exactly `(0,0)–(2560,1440)`, zero corner radius and the shared clock paused. The original review session, earlier saved practice and resumed Hanon reading position were retained. The final tab is marked as the review output.
