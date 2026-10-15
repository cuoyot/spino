# Subtle calendar day separators — October 15, 2026

Owner-requested CAL-01 refinement: adjacent days have a 1px divider using the existing theme line color. The first day retains the week-header separator; no extra outer frame is added. Circle rows and their hidden horizontal scrolling remain intact.

Thirty new responsive Chromium frames in both themes cover phone/tablet portrait/landscape and 320px. Screenshots were inspected in light tablet landscape and dark phone portrait. Existing circle-row capture checks pass: touch/arrow scrolling, fixed Add, one row, duration/mood separation through 720 minutes, detail routing and monthly focus. Production build passes. This small CSS refinement has no new unit tests. Prior evidence is preserved.

`capture.json` and `fixture.json` retain browser/source/build identity and the disposable notebook. Reproduce with Node 22, `BROWSER_PATH` set to Chromium, and `scripts/review/capture-calendar-circles.mjs 2026-10-15-day-separators`. Logs: `/tmp/spino-calendar-separators-build.log`, `/tmp/spino-calendar-separators-capture.log`.

Browser preview refreshed at http://127.0.0.1:5187/. This is responsive browser evidence, not native acceptance. No new APK or website publication.
