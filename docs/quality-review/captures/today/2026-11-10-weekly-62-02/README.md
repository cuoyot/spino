# Today: restore the 6.2 weekly overview

2026-11-10. Responsive browser evidence with disposable synthetic notebooks; not native-device acceptance. Reference: `v6.2.0`, `todayWeeklyProgress` in agenda.js. The owner requested a similar weekly overview while retaining every other pending change. The direction is requested; this rendered layout is presented for feedback.

The weekly total, explicit View progress action, optional goal and visible remaining minutes, View calendar action and vertical daily bars return. Current practice/recording controls, appointment cards, featured performances and shared saved-session cards are retained. No notebook migration or data writes are introduced by the UI change.

Production build and three focused browser tests pass. Forty captures cover four notebook states, light/dark themes, phone/tablet portrait/landscape and 320 px. Checks cover weekly totals with no goal, reached goal, empty records and hour formatting; navigation; event priority; horizontal overflow; touch controls and unchanged saved fixtures. `verification.json` records source/build hashes and measurements. The incomplete `../2026-11-10-weekly-62-01` run is preserved: an obsolete compact-height assertion was removed for the restored taller design.

Interactive synthetic preview: http://127.0.0.1:5343/ . Opened in the Codex in-app browser. This Today revision is not yet included in the previously built beta126 Android artifacts or the public site; rebuild and exact-commit publication verification remain required for release.
