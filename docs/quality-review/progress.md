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


## 2026-10-16 — Musical rhythm and recording calendar (D-053)

The owner requests visual musical streaks inspired by the supplied Strava screenshots, a clickable streak detail, an adjacent weekly recording card and a recording calendar with filters and audio/video icons. The objective is accepted; the implemented layout remains open for owner visual acceptance.

**Progress → Activity** now pairs the musical rhythm card with weekly recordings. The streak keeps existing Monday-based practice/goal arithmetic, including the unfinished-current-week allowance. Its monthly detail shows practice days, weekly streak badges and the number of sessions in the current streak. Month navigation, Close, Escape and platform Back are covered. The recording card includes saved/recoverable pending local takes created Monday through today and opens Multimedia with that inclusive date range, clearing piece/type filters.

**Multimedia** opens with a weekly calendar, expandable to month with Week/Month controls. It combines the calendar, day selection, inclusive From/To dates and existing piece/type filters. Calendar markers follow piece/type, while month browsing does not silently apply a date filter. Microphone/camera icons distinguish both kinds in the calendar and recording list. Empty filtered results explain how to change filters. Storage/sync guidance remains in a disclosure. Playback/capture/review/save/title/delete and original media/date/record identities are preserved.

[Final metadata and 60 frames](captures/progress/2026-10-16-rhythm-media-05/metadata.json) cover light/dark, phone/tablet portrait/landscape and narrow 320 px: overview, streak detail, weekly multimedia, expanded month, selected day and recording list. This is responsive Chromium browser evidence from the current production build, with disposable notebook/media fixtures and source/build hashes. Earlier runs are retained: 01 exposed a missing import in weekly navigation; 02 exposed a missing asynchronous test wait; 03 passed before the storage disclosure and calendar framing refinement; 04 passed for the monthly version before the owner requested a default weekly view. Run 05 is the final weekly/monthly source baseline. Those runs are not the final source baseline.

The build and 22 focused arithmetic/navigation and existing Progress, Today, local capture/playback/duration and recording-copy checks pass. Calendar boundary tests include leap months, six-row months, year changes, local midnight, empty/no-goal states and English/Catalan strings. The browser run checks filter intersections, empty results, inverted ranges, current-week reset, month navigation and byte-equivalent notebook plus retained recording IDs. Runtime exceptions are absent from the final run. Native-device and owner visual acceptance remain open; no new APK/version/publication is included.

Run `node scripts/review/preview-progress-rhythm.mjs` after building to open http://127.0.0.1:5201/. The origin seeds only an empty notebook with synthetic data; its review audio/video is generated locally. [Manual](../manual/en/progress-recordings.md).


### 2026-10-16 — Remove explanatory copy

The owner requests removing the explanatory paragraph entirely, with information at the end only if needed. Removed the storage/synchronization disclosure and its paragraph from Multimedia. The screen begins with piece/type filters, the default weekly calendar and recordings. Existing Backup & sync guidance remains available in its own screen; no additional information block is needed here.

Production build and five focused checks pass. [60 fresh responsive frames](captures/progress/2026-10-16-rhythm-media-06/metadata.json) cover both themes and phone/tablet orientations, including 320 px, with unchanged notebook contents and recording IDs. Run 05 remains the preceding weekly/monthly baseline. The live preview serves the updated build at http://127.0.0.1:5201/. This is browser evidence; owner/native acceptance remains open and no new APK/publication is included.


### 2026-10-16 — Separate audio/video indicators

The owner reports crowding when a date contains both audio and video. Each date now reserves separate rows for microphone/audio and camera/video, each with its own count. Taller day cells prevent either row from touching the date or spilling into adjacent days. Counts above 99 display as 99+ while the date's accessible label retains exact per-kind totals. Weekly/monthly navigation and date filtering remain unchanged.

The production build and five focused checks pass. [60 fresh responsive-browser frames](captures/progress/2026-10-16-rhythm-media-07/metadata.json) include mixed-media dates in both themes, phone/tablet orientations and 320 px. Browser geometry assertions verify that every indicator stays inside its day and mixed types have at least 3 px vertical separation. The synthetic notebook and recording IDs remain intact. Run 06 is retained; native/owner acceptance and APK/publication remain separate.


### 2026-10-16 — Recording-only highlights and richer color

The owner reports blue dates without recordings and requests a less sober appearance. The previous filled selection style marked every date in the inclusive filter interval. The calendar now colors only dates with matching recordings. Empty dates, including today, stay neutral even when selected by the filter. Date selection and its accessible pressed state remain available without implying that a recording exists.

Audio uses teal and video coral across day indicators, the legend and recording-list icons. Mixed dates combine both colors, with a violet selection outline; populated tiles have subtle depth and separate count rows. The scoped calendar panel and period controls adopt the same palette. Shared practice/streak calendars are unchanged. This is an implemented design proposal awaiting owner visual acceptance.

The production build and five focused checks pass. [60 responsive-browser frames](captures/progress/2026-10-16-rhythm-media-08/metadata.json) cover both themes, phone/tablet orientations and 320 px. Geometry checks retain containment and separation assertions and now require every empty date to have transparent background/no shadow and every populated date to have color. Notebook contents and recording IDs remain unchanged. Prior runs remain retained; native/device acceptance and packaging/publication are separate.


### 2026-10-16 — Period navigation replaces filtering

The owner supersedes the earlier filtering request: only backward/forward week or month navigation is wanted. Removed piece/type selectors, From/To, Clear dates and clickable day filtering. The calendar opens weekly, expands to month and uses the arrows to change the displayed period. The recording list follows the inclusive week or calendar month automatically. Dates remain accessible noninteractive indicators and only recorded dates are colored. The weekly Progress shortcut resets to the current week. A piece's Multimedia entry opens the week of its latest local take, without applying a hidden piece/type filter.

The source and manual reflect the simplified current behavior; earlier filtering sections above describe historical iterations. The scoped teal/audio, coral/video and mixed-date treatment remains. Run 09 covers overview, streak, weekly/monthly recordings, empty week and recording list. Run 10 adds month-navigation assertions and exposes the loss of the week anchor after browsing months; it is not a passing final baseline. The following heading-toggle iteration fixes that anchor behavior and records current source/build hashes. Native/device and owner visual acceptance remain open; no APK/version/publication.


## 2026-10-16 — Visual practice history (D-054)

The owner requests a more visual History, a less prominent View session action, score thumbnails, practice-type icons/color, and then explicitly asks for a more visible feedback emoji. These objectives are accepted; implementation layout is pending owner acceptance.

Progress History now uses compact whole-card session buttons, original piece titles, colored practice badges, stronger saved duration and quiet View session cues. Each existing rating appears as a 32–36 px emoji with its text label. Sessions without a rating do not invent feedback. PDF/MXL thumbnails are generated lazily from local score assets; missing/unreadable files keep the practice icon. The renderer never persists thumbnails or changes original scores, annotations or records. Work/target history cards retain their existing presentation, so earlier reviewed shared cards are unaffected.

The production build and history browser check pass, including PDF/MXL images, mixed activities, missing-file fallback, absent mood, partial practice, long escaped titles, keyboard opening by stable session ID, geometry and exact notebook/asset retention. Three existing Progress sections/time and Today browser checks pass. [Final ten-frame evidence](captures/progress/2026-10-16-visual-history-05/metadata.json) includes both themes, phone/tablet portrait/landscape and 320 px. Intermediate runs are retained and labeled. This is responsive-browser review; native/owner acceptance remains open. No new APK, version or publication.

Preview: `node scripts/review/preview-progress-history.mjs` at http://127.0.0.1:5287/, using disposable synthetic data. [Manual](../manual/en/progress-recordings.md).


### 2026-10-16 — Month heading expands/collapses the calendar

The owner removes the separate Week/Month buttons. Multimedia opens weekly; selecting its month/year heading expands the month, and selecting it again returns to the week. The small chevron and accessible expanded state reflect this interaction. Previous/next arrows continue to browse the displayed period; the recording list follows automatically and no filters are shown. Reuse the existing clamped calendar navigation to preserve the day/week anchor while browsing months, fixing the issue exposed in run 10. The shared streak heading stays unchanged.

[60 final frames and metadata](captures/progress/2026-10-16-rhythm-media-11/metadata.json) cover both themes, four orientations and 320 px. The browser checks verify heading expansion/collapse, focus, correct lists after forward/back month and week navigation, absence of filters/segmented controls, recording-only highlights and indicator separation. Notebook contents and recording IDs remain intact. Production build, three browser regressions (rhythm navigation, local media capture/playback and duration) and four arithmetic/locale checks pass; the locale assertion was updated to the new heading control. Earlier runs remain preserved. Native/owner acceptance and APK/publication are separate.


### 2026-10-16 — Month-only title and boundary weeks

The owner removes the repeated day-range subtitle and green toggle chevron. The clickable heading now contains only month/year. Weeks spanning two months name both; a December/January week includes both years. Expanding/collapsing through the heading and previous/next navigation remain unchanged. Long headings wrap within the center column while both navigation arrows stay beside the title; scoped header columns override the reader's generic responsive header rules.

Production build and five focused checks pass. [70 current responsive frames](captures/progress/2026-10-16-rhythm-media-14/metadata.json) include cross-month weeks in both themes, four orientations and 320 px. Tests verify single-month headings, cross-month/year text, absence of subtitle/chevron, inline navigation geometry and unchanged data. Run 12 passed functional checks but visual inspection exposed wrapped header controls; run 13 exposed generic landscape header columns; run 14 fixes the scoped geometry. All prior images are retained. Owner/native visual acceptance remains open; no package/version/publication.


2026-10-16 beta15/build68 delivery — the owner accepts the presented rhythm/calendar layout and authorizes APK and website publication, including the visual History accepted in the companion review and Today hours/minutes. [Final validation](../releases/6.1.0-beta.15-validation.json) records 28 focused app checks, four website checks, seven Android unit checks and 261 byte-matching packaged web files. [Native emulator evidence](captures/progress/2026-10-16-beta15-native/native.json) separately verifies replacement installation, foreground, disposable rhythm/calendar navigation and unchanged existing blobs; its original logical baseline remains empty after the prior recorded beta13 incident. The stable Android, Google Play and iOS Simulator versions are retained. [Public verification](../releases/6.1.0-beta.15-publication.json) confirms successful Cloudflare deployment, all three language pages, the exact manifest, four downloads and 34 current images. Beta15/build68 is published; native physical-device/Google acceptance remains separate.
