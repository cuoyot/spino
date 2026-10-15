# Progress time chart — beta 6.1

Review ID: **PIANO-02**. Updated: **2026-10-15**. The owner requested a Strava-style time chart, with practice-type and repertoire-piece filters plus additional periods behind **More details**. This objective is accepted; implementation is responsive-browser verified and awaits owner visual/native acceptance.

The Activity overview replaces its weekly time card, four-week bars and activity bars with one weekly line/area chart. It shows this week's saved minutes, the optional current weekly goal and twelve Monday-based weeks. Empty weeks remain visible as zero. The current week ends today and is explicitly labeled as in progress. Consistency, scales/target history, saved session history and the Repertoire/Technique sections remain available. Today retains its existing weekly summary.

**More details** opens a child route with combinable practice-type and piece filters. Periods are 7 days, 1/3/6 calendar months, year to date and 1 year. Short periods use daily points; longer periods use clipped Monday-based weeks. The total compares with the immediately preceding equal number of calendar days, with both intervals shown. No percentage is calculated when the previous total is zero. Month-end shifts clamp safely, and local calendar dates avoid DST duration errors.

Only saved positive time through today is counted, including manual and saved partial sessions. Unfinished and future records are excluded. Unfiltered time uses session totals; filters use explicitly timed result blocks. A session-wide work tag does not attribute a mixed session's entire duration to each tagged piece. Historic timed pieces remain selectable even if trashed or missing from the current repertoire. No notebook schema or persisted selection preference is added. Filters and range survive Back during the current app session. Exact chart values are available in a keyboard-accessible disclosure table.

## Evidence and handoff

[Responsive gallery](captures/progress/2026-10-15-time-chart/index.html), [metadata](captures/progress/2026-10-15-time-chart/metadata.json) and [synthetic fixture](captures/progress/2026-10-15-time-chart/fixture.json). This is a production Vite browser build of the current working tree, including independent existing work; source hashes identify the run. Fifty-five captures cover overview and piece detail in phone/tablet portrait/landscape, both themes, English/Spanish/Catalan, narrow 320px detail and an empty state. Earlier baselines are retained.

Five new arithmetic tests plus four existing progress/learning tests pass. Browser checks verify 35 total / 30 repertoire / 20 selected-piece minutes, an empty filter intersection, every range, table values, keyboard focus after rerender, Back, section highlighting, overflow, 44px range targets and byte-equivalent notebook data after navigation. There are no runtime exceptions in the chart run. The final five-test browser run passes with zero failures, including section, Today and shared-navigation regressions. Initial runs exposed a navigation-context race in the old test waits. The touched tests now avoid stale-document waits; all five pass in the final evidence log.

Run `node scripts/review/preview-progress-time.mjs` after a production build to open the isolated synthetic review at `http://127.0.0.1:5192/`. This origin contains disposable data. The manual describes verified source behavior; no 6.1 APK/AAB, version bump or publication is part of this change. Native/device and owner visual acceptance remain open.

## 2026-10-15 — Hours and minutes (D-044)

The owner requests 139 minutes as **2 hr 19 min**. Progress now formats saved totals/weekly goals, detail totals, chart ticks/point titles/value tables, repertoire totals, scales and its saved-session summaries in hours/minutes from one hour upward. Under an hour remains minutes; an exact hour omits zero minutes. Existing nearest-minute rounding is retained, including the 59.5-minute boundary becoming 1 hr. Numeric totals, goal percentages, filters and notebook contents are unchanged. The shared session-card helper has an explicit Progress-only formatting option; other routes retain their presentation.

A two-column summary and dynamically reserved chart-label space keep longer values readable. [55 fresh responsive frames and metadata](captures/progress/2026-10-15-hours-minutes-01/metadata.json) cover both themes, Spanish/English/Catalan, phone/tablet portrait/landscape, narrow detail and empty data. The synthetic fixture reproduces 139 saved minutes and a 90-minute goal; repertoire totals also verify 476 min → 7 hr 56 min and 300 min → 5 hr. Build and focused existing tests pass, along with 30 one-off rounding/locale assertions. Chart labels stay inside the SVG and navigation leaves the notebook byte-equivalent. Prior baselines remain intact.

Review is open at http://127.0.0.1:5198/ using `PROGRESS_TIME_PORT=5198 PROGRESS_TIME_FIXTURE=docs/quality-review/captures/progress/2026-10-15-hours-minutes-01/fixture.json node scripts/review/preview-progress-time.mjs`. This is a responsive browser review of source after beta2/build55; no new APK/version/publication. Owner and native visual acceptance remain open.


## Website publication — 2026-10-15

Published as website Android 6.1.0-beta.3/build56 on 2026-10-15. Final production package/signature, 16 focused regressions, replacement installation, 18 unchanged IndexedDB file hashes and foreground activity pass. Public verification confirms all three language pages, the checksum manifest and four download hashes. Native/owner visual acceptance remains open. [Release validation](../releases/6.1.0-beta.3-validation.json); [public delivery](../releases/6.1.0-beta.3-publication.json). Earlier source-only statements describe the preceding review stage. The emulator handoff verifies installation and data retention; the 55 layout frames are responsive-browser evidence.
