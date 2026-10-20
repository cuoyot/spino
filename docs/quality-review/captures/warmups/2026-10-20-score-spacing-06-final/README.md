# Hanon score spacing — final browser verification

Date: 2026-10-20. Source commit baseline: b8ba36b plus the existing working tree and the D-068 correction. This is a production-build responsive Chromium review with disposable synthetic notebooks, not native-device acceptance. The local review stays open at http://127.0.0.1:5482/.

The owner reports excessive density and heads touching/crossing bar lines, then requests seeing the result. Page density adapts to width, the real Hanon rhythm and notation size. Rhythmic centres leave half a slot at each measure edge; the cursor follows the same linear grid. Continuous scroll uses the real warm-up rhythm and aligns its bar lines with the notehead grid.

## Verification

- All ten Hanon exercises cover complete ascending/descending cycles and final tonics, with page turns and phone/tablet portrait/landscape rotation. No musical notes or finger numbers change.
- Hanon No. 5 additionally covers quarter, eighth and sixteenth rhythms, plus a 320 px phone.
- 284 pages and 12,498 rendered note/fingering bounds pass. The minimum measured left/right margins are 9.03 / 9.66 CSS px. Maximum note/cursor difference is 0 px.
- All three continuous-scroll rhythms clear measure boundaries. Exact results are in verification.json.
- Existing generated reading/technique, two-hand manual/MIDI, self-paced rotation/progress, page/scroll cursor and warm-up behavior receive focused regressions. The production build passes.
- Synthetic active-session IDs remain stable and no completed sessions are added. The installed personal notebook is not used.

fixtures.json retains the test notebooks. verification.json records every page, margin and source/build hash. The screenshots show the first page and final-tonic page in five layouts. The first visual presentation is retained separately in ../2026-10-20-score-spacing-02/. Owner visual feedback and native-device acceptance remain open. No APK, version change or publication.

## Evidence continuity

- ../2026-10-20-score-spacing-01-baseline/: original production tablet rendering, synthetic fixture and pre-change source hashes.
- ../2026-10-20-score-spacing-03-verification/: passing page-only matrix before the continuous-scroll follow-up.
- ../2026-10-20-score-spacing-04-final/: retained test-harness failure; a change event did not apply the layout setting, so the attempted scrolling measurement still saw a page.
- ../2026-10-20-score-spacing-05-final/: retained failed scrolling clearance. This exposed the separate scrolling bar-line offset, corrected in the current run.
