# Compact calendar sessions — October 15, 2026

Responsive browser evidence, not native acceptance. See [the Calendar review](../../../calendar.md) and [gallery](index.html).

20 frames cover light/dark, phone 390×844 and 844×390, tablet 768×1024 and 1024×768, plus 320×640. `fixture.json` contains the disposable synthetic notebook, including three- and six-session days, a linked completed plan, partial session, long title, lesson and future plan. No personal notebook was used or changed. `capture.json` records browser identity, package version, source/build hashes, dimensions and former/current day-height measurements. Existing baseline images are preserved.

Production build passes. Nine agenda/planner unit checks and two existing navigation/planner browser regressions pass. The capture script verifies 44px targets, no horizontal overflow, at least 35% less day height at all sizes, exact routing to linked/ad-hoc/partial/long-title details with retained notes, monthly result detail and day Add. Logs: `/tmp/spino-calendar-compact-build.log`, `/tmp/spino-calendar-capture.log`, `/tmp/spino-calendar-regression.log`.

Reproduce: build with `npm run build`, then run `scripts/review/capture-calendar-sessions.mjs` using Node 22 and `BROWSER_PATH` pointing to Chromium. `scripts/review/preview-calendar-sessions.mjs` serves an interactive production build with the fixture at `http://127.0.0.1:5187/`; this dedicated local origin is for synthetic review only.

The compact layout is implemented and browser verified; owner/native acceptance remains open. No APK or release was built/published.
