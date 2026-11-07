# Calendar reference and browsing-screen alignment — 7 November 2026

## Accepted scope

The owner supplied the approved calendar mockup in this chat after rejecting the initial repository-derived visual pass. The attached image, rather than the old calendar source, is the visual reference: rounded week panels, a soft blue current-week heading, compact icon/title/duration cards, horizontal overflow with a visible next card, a single row per day and a floating Today action. All weeks remain expanded; the mockup's chevrons do not authorize collapsible weeks.

Calendar opens at the current week and extends in either direction. Headers use saved elapsed practice time and existing planned block minutes. No percentages or goals are invented. Saved summaries continue through the shared saved-session renderer; the compact calendar variant opens the full original session by stable ID. Planned practices retain their detail, start/edit/reschedule and keyboard/drag move flows.

Library keeps its existing My repertoire / Catalogue / Multimedia navigation, semantic tables, search, filters, sorting, stand, trash/restore, printing and score workflows. Its sole Add work entry offers the existing work-details form and existing Import PDF picker. No new import formats or sources are introduced.

Progress keeps Activity / Repertoire / Technique, real metrics, history, charts and their existing drill-downs. Panel shape, current-week emphasis, action hierarchy and spacing follow Calendar. Today and Practice are retained as-is; Profile is explicitly excluded. Navigation correctly selects Calendar on its own route.

## Implementation

- `src/companion/agenda.js`: expanded week headings with actual ISO week number, compact mixed planned/saved/event strips, existing detail actions.
- `src/companion/app.js`: bidirectional week extension with scroll-position preservation, current-week positioning, floating Today, unified Add work chooser and Calendar navigation selection.
- `src/companion/saved-session-card.js` / `.css`: compact variant of the shared renderer; other saved-card contexts retain their existing layout.
- `src/companion/navigation-refinement.css`: route-scoped visual treatment for Calendar, Library and Progress. No Profile, Today or Practice rules.
- Browser regressions follow the actual Add work chooser. New synthetic responsive coverage checks horizontal overflow, one row, compact height, continuous weeks, Today, details and exact notebook/score-byte retention.

## Review state

The owner reviewed the corrected snapshots and requested APK creation and website publication. Beta 6.2.1-beta.5 (117) is signed and replacement-installed on the existing emulator. All 135 original data-file hashes are retained and MainActivity is foreground. Physical-device acceptance remains open; publication proof is recorded separately in the release evidence.

The first three snapshot runs in the chat workspace are superseded; they were based on the old repository visuals. Runs named `reference-*` use the supplied mockup. Final evidence and source/build hashes are saved with the snapshot gallery in the chat outputs.

## Validation

Production build and 47 focused arithmetic/model/regression checks pass. Responsive checks cover both themes, phone/tablet portrait and landscape, 320px, original PDF import/OCR and the existing shared history.

Four older browser scenarios also fail on an isolated unmodified copy of base `e7e1af9` at the same steps: cloud-fixture connection in `header-page-actions`, removed catalogue action in `management-print`, the research action in `navigation`, and the backup action in the final `pdf.browser` subtest. They remain separate existing failures, not a claimed green full-suite result. The PDF import/OCR and the earlier annotation subtests pass.
