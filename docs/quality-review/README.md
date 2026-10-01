# Release quality review

This workspace records the screen-by-screen review requested on 2026-10-01 before SPino is considered ready for product version 1.0. The installed technical version remains 5.0.0; this review does not renumber packages or publish a release.

Current focus: [PRACTICE-01, the session overview](session.md) reached through Today's Start/Resume action. The product owner explicitly approved compact [Today](today.md) on 2026-10-01: “me gusta, aprobar y continuar”. The presented Today layout is now the accepted visual reference for D-002–D-004; its remaining child, accessibility and native coverage stays tracked. The new surface's proposed objective is to understand the current block and begin or resume playing with minimal friction, keeping time, pause and finish unambiguous. Its layout is not yet approved.

## Resume work here

1. Read this file, the active screen review, [decisions](decisions.md) and [screen inventory](screen-inventory.md).
2. Check whether new user feedback accepts, changes or supersedes a pending proposal. Record its scope and rationale without treating silence as acceptance.
3. Continue the current screen or its named child surface. Do not restart completed reviews or assume that visiting a destination reviews it.
4. Before changing a shared component, find every affected screen using the inventory. Create explicit follow-up checks, including already closed screens.
5. At the end of each session, update the current focus, open question, evidence links, decision status, affected screens and manual status.

The product owner accepted `D-002`'s main-action hierarchy, `D-003`'s navigation responsibilities and `D-004`'s presented compact result. The next action is to review PRACTICE-01's captured baseline and decide whether Today Start/Resume should open the current block ready for an explicit Play action or show the summary first. No new behavior is implemented or accepted by this audit. Then continue Today's remaining child interactions one at a time. Keep compact Today as the cross-screen visual reference and recheck it when shared controls change. The broader Library/Profile redesign, detailed progress presentation and new streak features are deferred to those screens' reviews. The product owner selected **Library / Biblioteca** as the replacement name for My piano.

The [accepted compact gallery](captures/today/2026-10-01-compact/index.html) contains 21 frames from the same three fixtures and four viewports. All 12 main actions are visible, with no page-width overflow or runtime errors. The populated portrait-phone page is 248px shorter; both populated tablet-portrait states now fit without scrolling. Nine focused browser tests passed. The Android APK was built, installed and checked for the compact styling, navigation and visible MIDI target, preserving the notebook and all 55 assets. The [navigation refinement gallery](captures/today/2026-10-01-practice-navigation-02/index.html) is the pre-density comparison; all earlier runs remain preserved. The Today manual describes unchanged behavior, checked against the compact run, and remains **draft** while its behavior/wording review and outstanding coverage continue. Visual acceptance does not establish four-orientation native, physical-MIDI or accessibility acceptance.

The [session overview baseline](captures/session/2026-10-01-baseline/index.html) contains **27 frames across 16 state/viewport views**: planned, resumed, running and disconnected in the four standard layouts. No horizontal overflow or runtime errors were recorded. The primary action is below the first viewport in all four landscape-phone states. These are responsive-browser findings from disposable fixtures, not native-device acceptance; this pass changes no app behavior.

## Review cycle

| Step | Required output |
| --- | --- |
| Objective | The user's question, primary action and success criteria for this surface. Distinguish existing product constraints from new proposals. |
| Baseline | Current phone/tablet portrait/landscape captures, representative data and relevant empty/pending/error states. Include content below the initial viewport. |
| Review | Observed design/behavior issues tied to evidence, possible changes and their tradeoffs. |
| Decision | Stable decision ID, exact agreement, rationale, scope, affected components/screens, manual impact and any deferred points. |
| Refinement | Implement the agreed behavior and preserve notebook data, stable IDs, assets and annotations. |
| Verification | Repeat comparable captures and relevant interaction checks; test navigation/back, cancellation, persistence, orientation, touch and accessibility. Native-only features need native evidence. |
| Documentation | Update the user manual to verified behavior and reconcile older product/developer documentation for this surface. |
| Closure | Product acceptance plus linked evidence; unresolved issues are fixed, explicitly deferred or tied to a concrete missing prerequisite. |

Screenshots do not establish functional correctness. Passing tests do not establish that the design is accepted. Keep both records.

## Baseline capture conventions

- Primary comparison: phone 390 × 844 and 844 × 390, tablet 768 × 1024 and 1024 × 768 CSS pixels. Additional sizes, large text and native safe areas are separate checks, not substitutes.
- Freeze date/time and use the same named synthetic fixture across all four viewports. Keep fixture inputs with the evidence. Never seed or clear the installed personal notebook to stage a screenshot.
- Use the current production web build for responsive comparisons. Record browser version, locale, timezone, pixel ratio, package version, commit and source hashes; uncommitted code is part of the baseline.
- Save each run under a new directory in `captures/<screen>/<run-id>/`. Keep old runs immutable. `capture.json` records each actual scroll offset, screenshot hash and measurements. Derived galleries may be regenerated.
- Capture the first viewport before scrolling. Additional frames retain actual screen geometry; do not stretch the page to create a misleading full-page screenshot of a fixed application shell.
- Do not imply that browser emulation verifies OS bars, system file pickers, keyboards, notifications, physical MIDI or iOS behavior. Track those separately.
- Inspect English and Spanish when copy changes. Preserve musical titles, user-entered text and source evidence.

To reproduce Today in a new evidence directory, with dependencies installed:

```sh
npm run build
node scripts/review/capture-today.mjs 2026-10-01-followup
```

The script refuses to overwrite an existing evidence directory, uses a disposable Chromium profile and local server, and leaves the installed app untouched. It writes the screenshots, synthetic fixtures, `capture.json` and an offline HTML gallery. Dates are deliberately fixed in `scripts/review/today-fixtures.mjs`; changing a fixture is a new comparison baseline and must be recorded.

## Cross-screen consistency

The inventory assigns stable IDs to surfaces and shared components. Each decision records where it applies, where it intentionally does not apply and why. When implementing it:

1. Search both the component map and actual call sites; the inventory may lag new code.
2. Record each affected screen as current, previously reviewed, or not yet reviewed.
3. Reopen previously closed screens whose behavior, wording, layout or screenshots change. Attach the new evidence to the same review ID.
4. Add the rule to future screens' acceptance criteria so it is not rediscovered independently.
5. Update the manual and translations together with the verified change.

Existing product constraints remain in force: local notebook and optional user-controlled cloud files, no proprietary backend, dark app controls with ink-on-paper scores, stable practice content, and preserved progress/PDFs/annotations. This review is not permission to broaden the release scope or reactivate Learn.

## User manual

[Manual source](../manual/README.md) is maintained separately from review notes. Chapters describe verified current behavior in English and are structured for a future bundled offline help reader. Draft/provisional status lives in its index rather than in user-facing prose. Do not describe proposed changes as available features.

## Session log

| Date | Focus | Evidence and outcome | Next action |
| --- | --- | --- | --- |
| 2026-10-01 | TODAY-01 baseline | Three fixtures × four viewports; 30 viewport/scroll captures; action map and three functional probes. No application behavior changed. Today manual chapter drafted. | `D-002` objective accepted. Discuss the concrete main card/layout, then review child flows. |
| 2026-10-01 | TODAY-01 and shared navigation refinement | `D-002/D-003` implemented; 23 follow-up frames, 12 visible primary actions, corrected event-date context and 44px narrow-phone day targets. 210 tests passed, one optional network test skipped; Android navigation smoke check passed with notebook/55 assets unchanged. Today manual refreshed. | Discuss the rendered result; continue Today child interactions. Visual acceptance and deeper destination reviews remain open. |
| 2026-10-01 | TODAY-01 density experiment | `D-004` implemented and scoped checks passed: 21 comparable frames, 12 main actions visible, no horizontal overflow; portrait-phone populated page 248px shorter. Nine browser tests passed; updated Android APK checked with notebook/55 assets unchanged. | Obtain visual feedback before generalizing the compact density to other screens; continue child reviews. |
| 2026-10-01 | TODAY-01 visual acceptance; PRACTICE-01 continuation | Owner explicitly approved the presented compact result: “me gusta, aprobar y continuar”. D-002–D-004 are accepted in their implemented scope. Today remains the visual reference; untouched branches and release gates stay open. | Review the session overview reached by Today Start/Resume. Establish four-layout evidence and discuss its proposed objective and refinements. |
| 2026-10-01 | PRACTICE-01 baseline | Four states × four viewports; 27 frames; no page-width overflow or runtime errors. All landscape-phone primary actions are below the initial viewport. No app behavior changed. | Discuss the proposed session objective and current-block versus summary-first entry. Objective/layout remain proposed; keep explicit Play separate from entering the session. |

## Current session-review findings

The [session overview baseline](session.md) includes 27 frames, 16 responsive state/layout combinations and disposable functional probes. Confirmed follow-up correctness work covers final-block feedback cancellation, stale manual-timer state after backgrounding, stale orientation advice and feedback save/retry after an injected storage failure. These are recorded findings, not fixes. The Start/Resume entry choice is awaiting the product owner; the compact Today remains the accepted visual reference. The application source is unchanged by this baseline review. The session manual chapter is draft.
