# Circular session rows — October 15, 2026

Owner accepted the circular mockup and then requested one horizontal row with no visible scrollbar. [Calendar review](../../../calendar.md) · [Responsive gallery](index.html).

Thirty responsive Chromium captures cover both themes at 390×844, 844×390, 768×1024, 1024×768 and 320×640. Each layout includes the week and both ends of a six-session row. The disposable notebook contains 59, 60, 75, 95, 120, 180 and 720 minute sessions, all four main activity types, a linked completed plan with warm-up, missing moods, a partial session, a lesson and a pending plan. `fixture.json` is validated before browser use. No personal/native notebook was used.

The capture script verifies 64px circles, one row, hidden scrollbars, actual Chromium touch gestures and arrow-key scrolling on narrow phones, fixed Add position, no time/icon/mood overlap, long-minute text fit, no page overflow, full detail routing and retained notes, month-row focus revealing the final session, and Add. A 125% root-font check is supplementary layout evidence, not physical accessibility acceptance. Nine existing agenda/planner unit checks and two existing navigation/planner browser regressions pass; final production build passes. Logs: `/tmp/spino-calendar-circles-build.log`, `/tmp/spino-calendar-circles-unit.log`, `/tmp/spino-calendar-circles-capture.log`, `/tmp/spino-calendar-circles-regression.log`.

`capture.json` records source/build hashes, browser identity and measured rows. `scripts/review/capture-calendar-circles.mjs` reproduces this run with Node 22 and `BROWSER_PATH` set to Chromium. Existing pill/mockup baselines are retained. The synthetic browser preview at http://127.0.0.1:5187/ has been refreshed with this fixture and production build.

Implemented local-source follow-up to published Android beta 11/build50. No new APK, native acceptance or website publication is claimed. The accepted visual direction and requested row behavior are implemented; native device gestures and owner review of the implementation remain separate.
