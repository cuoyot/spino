# Today review

Review ID: **TODAY-01**. Status: **presented compact layout visually accepted; remaining behavior/accessibility/native coverage tracked**. Updated: 2026-10-01.

The baseline below remains a historical record of the UI reviewed with the product owner. After accepting the Today hierarchy and navigation direction, the owner requested the denser presentation under D-004 and explicitly approved its rendered result on 2026-10-01: “me gusta, aprobar y continuar”. The compact run is now the accepted visual reference for the implemented scope of D-002–D-004. Earlier verification below applies to the navigation refinement. Immediate child views and outstanding release gates remain open; the next review is PRACTICE-01 through Today's Start/Resume action.

## Accepted objective

Help the pianist answer **“What should I practise now?”**, see what is due today and start or resume with minimal effort. Weekly context and commitments support that action. The dedicated Practice destination holds activity/routine selection; detailed progress belongs under Profile.

Refinement success criteria, to verify against the accepted direction:

- The next useful action is clear on arrival, including an unfinished session or a day without a plan.
- At standard text size the primary action fits the first viewport in the four baseline layouts. Larger text may scroll, while every control remains reachable.
- A tap has a predictable destination; start, configure, resume and inspect are distinguishable.
- A summary tells the truth about its time period, activity type and completion state.
- Calendar, progress and practice details remain available without competing with the primary action.

See [D-002](decisions.md#d-002--prioritize-the-next-useful-practice-action-on-today) and [D-003](decisions.md#d-003--separate-todays-agenda-practice-planning-and-the-library). The product owner selected practice-first and accepted the proposed hierarchy on 2026-10-01. Those functional refinements and D-004's scoped density checks pass, and the presented compact result is visually accepted.

## Accepted refinement and scope

- Show one contextual main action before supporting content: resume an unfinished session, start today's next planned practice, or choose a practice through the new Practice destination.
- Reduce shared header and weekly-context height in landscape. Keep the primary action within the initial viewport at standard text size in the four comparison layouts.
- Put activity/routine quick paths in the dedicated **Practice / Practicar** destination. Today retains the daily agenda and upcoming commitments without repeating the full chooser.
- Use Today, Practice, Calendar and **Library / Biblioteca** as the accepted menu structure, plus an unlabeled, more prominent Profile avatar. The owner explicitly selected Library/Biblioteca.
- Present MIDI as a small connection/activity utility, not a main navigation item. Keep a reachable instrument settings entry and an accessible status description.
- Associate detailed progress and practice history with Profile. Limit this pass to access/grouping changes; its deeper design and new motivational features await that screen's review.
- Make Today's Add event and View calendar use today's date. Calendar's date-specific actions retain their chosen date.

## Compact density experiment

[D-004](decisions.md#d-004--try-a-more-compact-today-and-practice-entry) responds to the owner's request for smaller-looking widgets and buttons. Reduce card spacing, typography and button width while preserving the contextual main action, available information and actions, and touch areas of at least 44px. Apply consistent compact treatment to the Practice entry; other destination contents remain outside this pass.

[Open the accepted compact gallery](captures/today/2026-10-01-compact/index.html): **21 viewport/scroll frames**, using the same three synthetic fixtures and four viewports. [Capture metadata](captures/today/2026-10-01-compact/capture.json) records the source and image hashes. All **12** primary actions remain visible on arrival; no page-width overflow or runtime errors were recorded. Only scoped density rules in `src/companion/app.css` changed; navigation geometry, data and actions are unchanged. The owner accepted this presented result; it is not an app-wide redesign or release-wide acceptance.

| Populated-day layout | Page scroll height, prior → compact | Primary action, top → bottom |
| --- | --- | --- |
| Phone portrait | 1,209 → 961 CSS px | 203 → 247 CSS px |
| Phone landscape | 915 → 749 CSS px | 105 → 149 CSS px |
| Tablet portrait | 1,188 → 1,024 CSS px; the full day now fits | 145 → 189 CSS px |
| Tablet landscape | 1,006 → 821 CSS px | 127 → 171 CSS px |

On the portrait phone, the main action is 127px wide instead of 316px while retaining its 44px height. Its secondary action sits alongside it. Week targets are 61px high instead of 75px, and remain 44px wide at a 320px viewport. Today's event card shrinks from 138 to 107px; its saved-session card from 203 to 164px. Upcoming rows shrink from 81 to 61px. The tablet portrait agenda uses two columns, making the complete typical and pending days visible without scrolling. Scroll height is bounded by the viewport, so it is not a direct content-height measure for already short pages.

The date-context and unfinished-session probes still pass. These measurements are responsive-browser comparisons; they do not establish native-device or enlarged-text acceptance. The Today manual's behavior is unchanged.

### Compact verification

- Production web build and Android debug APK build passed. The updated APK was installed in the existing emulator without resetting its notebook.
- **Nine focused browser tests passed** across `today-focus`, `agenda`, `profile-navigation`, `notebook-layout` and `locale`. Local run log: `artifacts/today-compact-tests.log`.
- [Android smoke script](../../scripts/review/check-navigation-android.mjs), run with `--compact`, confirmed the installed compact focus-card styling, actual Android Back navigation and visible 44px MIDI target. The notebook and all **55 local assets** retained their hashes. Local run log: `artifacts/today-compact-android-check.log`.
- All 21 screenshot hashes and recorded source hashes match the compact run. Navigation geometry is unchanged; its existing controls remain available. These checks do not close Today, Practice or their child reviews, nor establish physical MIDI, iOS or four-orientation native acceptance.
- Supplemental Practice entry checks passed in all four responsive sizes: no horizontal overflow, with all visible controls at least 44px. Local captures: `artifacts/today-compact/practice-*.png`. These are layout smoke evidence, not a complete HUB-01 review.

The owner approved the compact result on 2026-10-01. The manual index references this checked run and records visual acceptance; the chapter remains draft while behavior/wording review and remaining coverage continue.

## Navigation refinement evidence

[Open the follow-up gallery](captures/today/2026-10-01-practice-navigation-02/index.html), with the same three fixtures and four viewports as the baseline: **23 viewport/scroll frames**. [Capture metadata](captures/today/2026-10-01-practice-navigation-02/capture.json) records source hashes and measurements. The first refinement run remains preserved in `2026-10-01-practice-navigation/`; the `-02` run includes the final MIDI target and narrow-phone week spacing corrections.

| Layout | Populated day after refinement | Primary Start action, top → bottom |
| --- | --- | --- |
| Phone portrait | [Open screenshot](captures/today/2026-10-01-practice-navigation-02/typical-phone-portrait-01.png) | 242 → 286 CSS px |
| Phone landscape | [Open screenshot](captures/today/2026-10-01-practice-navigation-02/typical-phone-landscape-01.png) | 91 → 135 CSS px |
| Tablet portrait | [Open screenshot](captures/today/2026-10-01-practice-navigation-02/typical-tablet-portrait-01.png) | 157 → 201 CSS px |
| Tablet landscape | [Open screenshot](captures/today/2026-10-01-practice-navigation-02/typical-tablet-landscape-01.png) | 128 → 172 CSS px |

The primary action is fully visible on arrival in all **12** state/viewport combinations. No horizontal page overflow or runtime errors were recorded. On the landscape phone, the main action previously began around y=529 for planned practice, y=469 for an empty day and y=521 for unfinished practice; it now begins around y=91, y=102 and y=102 respectively.

The stale Add event date probe now selects **1 October**, despite previously choosing 4 October in Calendar. At 320×568, all seven week targets measure **44×75.3 CSS px**, up from about 39.7px wide in the baseline. The unfinished-session shortcut still returns to the existing session with an explanation. These are responsive-browser results, not native or physical-MIDI acceptance.

### Changed behavior

- The redundant brand row no longer consumes content height. The small MIDI utility keeps its own touch target and opens instrument settings.
- The first card resolves unfinished session → next planned practice → Practice chooser. A featured plan is not duplicated in the remaining agenda.
- Practice contains the four activity choices and **all** saved routines, instead of hiding those choices below Today's cards and limiting Today to three routines.
- Today retains the compact date strip, remaining daily cards and the next two future commitments. Both View calendar and Add event use today as their date context.
- Weekly totals/chart and existing history are accessed through **Profile → Your progress**. Library retains repertoire, scores, catalogue and routine management. No new streak or mastery metric has been introduced.

C-NAV destination and Back checks apply across the new menu; they do not close the destination screens' design reviews. The English Today manual has been rewritten against these checked entry points and returned to draft status; editorial acceptance remains open.

## Navigation refinement verification

- Production web build and Android debug APK build passed. The APK was installed in the existing emulator without resetting its notebook.
- Full application suite: **211 tests; 210 passed, 0 failed, 1 skipped**. The skipped test requires optional live network access to official PDF downloads. Relevant coverage includes [Today/calendar actions](../../tests/agenda.browser.test.js), [Profile/navigation](../../tests/profile-navigation.browser.test.js) and [responsive notebook layout](../../tests/notebook-layout.browser.test.js). Local run log: `artifacts/today-navigation-tests-final.log`.
- [Android navigation smoke script](../../scripts/review/check-navigation-android.mjs): Spanish Today/Practice/Calendar/Library labels, actual Android Back from Practice to Today, a fully visible 44×44px MIDI utility, Profile progress and Library collection access passed. The personal notebook and all **55 local assets** retained their hashes. Local run log: `artifacts/today-navigation-android-check.log`.
- All 23 screenshot hashes and recorded source hashes match the final capture run. Supplemental Practice hub captures cover four responsive layouts in `artifacts/today-navigation/`; these are smoke evidence, not a complete HUB-01 review.

Native four-orientation layout acceptance, physical USB/Bluetooth activity and iOS behavior are not established by these checks. The later compact result is visually accepted; remaining state/accessibility checks are still open.

## Original baseline evidence

[Open the interactive capture gallery](captures/today/2026-10-01-baseline/index.html). It includes three states, four sizes and all 30 scroll frames. The gallery is an offline file; click any image to view it at full resolution.

| Layout | Viewport | Initial populated-day capture |
| --- | --- | --- |
| Phone portrait | 390 × 844 | [Open screenshot](captures/today/2026-10-01-baseline/typical-phone-portrait-01.png) |
| Phone landscape | 844 × 390 | [Open screenshot](captures/today/2026-10-01-baseline/typical-phone-landscape-01.png) |
| Tablet portrait | 768 × 1024 | [Open screenshot](captures/today/2026-10-01-baseline/typical-tablet-portrait-01.png) |
| Tablet landscape | 1024 × 768 | [Open screenshot](captures/today/2026-10-01-baseline/typical-tablet-landscape-01.png) |

The images show the actual production frontend in Chromium responsive emulation, not a proposed design or native-device acceptance. UI language is Spanish; date is fixed to Thursday 1 October 2026 in Europe/Madrid. OS bars, notches, software keyboards and real-device text scaling are not represented. [Capture metadata](captures/today/2026-10-01-baseline/capture.json) records browser/build information, source hashes, image hashes and measurements. The source tree includes existing uncommitted work.

Fixtures are synthetic and isolated from the installed notebook:

- **Typical:** Alex; 95/200 saved weekly minutes; a 40-minute three-block practice at 18:00, today's tutor class, a completed session with feedback, two saved routines and two future commitments. No downloaded score or MIDI measurement is fabricated.
- **Empty:** no personal content; current default weekly goal of 90 minutes.
- **Pending:** typical data plus eight minutes in an unfinished practice. The active plan is correctly not duplicated in today's cards.

Recovery toast was hidden after loading for stable screenshots; transient notices require separate review. Every frame retains its true viewport and scroll position. No horizontal page overflow was measured in the 12 baseline combinations.

## Baseline action map

| Entry on Today | Baseline behavior | Child review |
| --- | --- | --- |
| View calendar | Opens the last selected date and calendar view | CAL-01/02 |
| Week day | Opens that date in the weekly agenda | TODAY-02, CAL-01 |
| Weekly minutes | Opens general Progress, whose summary is the last 30 days | PIANO progress surface |
| Start practising / + Practise | Opens reading preparation, normally 40 minutes and saved defaults | PREP-01 |
| Reading / Technique / Repertoire / Free practice | Opens that activity's preparation; repertoire/free choose With piano | TODAY-04, PREP-01 |
| Planned card body | Opens plan details, blocks, reschedule/edit/delete and series options | CAL-05 |
| Planned Start | Opens the session overview; exercise/timer is started there | PRACTICE-01 |
| Edit practice | Opens the existing plan's preparation | PREP-03 |
| Resume session | Opens the unfinished session overview | TODAY-03, PRACTICE-01 |
| Saved/partial card | Opens saved result and feedback | PIANO-03 |
| Today's event or upcoming commitment | Opens event details and preparation steps | CAL-07 |
| Saved routine | Starts with saved settings; reading/technique can open directly into the exercise | TODAY-04, PRACTICE-01 and exercise variants |
| + Event | Opens a new event; currently uses the last selected calendar date and Audition type | CAL-06 |
| Main navigation | Today, Calendar, My piano, MIDI, Profile | C-NAV and destination reviews |

Only the first three routines and first two future events appear here. Today's events are in today's cards. Saved results follow pending entries. Weekly totals include saved partial and manual sessions, exclude the unfinished session, and are rounded to whole minutes. A plan and result on the same date share one card.

## Findings

These observations describe the original baseline. D-002/D-003 accept the scoped refinements above; unresolved questions and later-screen work remain separate.

| ID | Evidence or observed behavior | Impact and candidate refinement | Scope |
| --- | --- | --- | --- |
| TODAY-F01 | On the 844×390 phone, planned Start begins at y≈529; Resume at y≈521; the empty-state Start at y≈469. All are below the initial viewport. | High: the screen's intended main action is displaced by brand/title/week context. Consider a compact landscape header and a primary practice area visible on arrival. | TODAY-01/03, C-NAV |
| TODAY-F02 | In the typical fixture, activity shortcuts start at y≈1056 on portrait phone and y≈1071 on portrait tablet; routines are even lower. | High: the advertised quick paths are not quick to discover on a populated day. Consider placing an activity/routine entry near the main practice action and reducing completed-card prominence. | TODAY-04, C-PRACTICE |
| TODAY-F03 | Empty state repeats a practice heading, introductory card, generic Start action and four activity choices. Populated state offers several practice entry points. | Medium: the hierarchy makes the user interpret several overlapping options. Choose one main action and make alternatives clear. | TODAY-01/04, C-EMPTY |
| TODAY-F04 | Reproduced: choose 4 October in Calendar, return to Today on 1 October, tap + Event; the form preselects 4 October. | High: a new commitment can be saved on an unintended day. Discuss a date-context rule for Today vs date-specific calendar entry points. | TODAY-05, CAL-03/06, PREP |
| TODAY-F05 | Planned Start opens session overview, but a routine can immediately open/start its exercise. | Medium: similar intentions have different steps. Define common Start/Prepare/Resume semantics before refining all related buttons. | TODAY-02/03/04, CAL-05, PRACTICE |
| TODAY-F06 | With unfinished practice, other practice actions remain visible. Technique shortcut was reproduced redirecting to the existing session with a message; plan/routine paths redirect without that same explanation. | Medium: visible choices cannot perform the action they appear to offer. Make pending-session handling consistent. | TODAY-03/04, CAL-05, C-PRACTICE |
| TODAY-F07 | Today dots encode the first activity type; month-calendar dots encode planned/completed/event state. Today has no marker legend. | Medium: similar date controls communicate different things. Decide marker semantics across calendars together. | TODAY-01, CAL-02, C-AGENDA |
| TODAY-F08 | `95 / 200 min` has no explicit weekly/saved-time label; its tap opens a 30-day summary. | Medium: amount and destination can be misread. Add meaningful labeling and align the destination or explain the time period. | TODAY-01, PIANO progress |
| TODAY-F09 | At 320×568, all seven day targets measure approximately 39.7×84 CSS px. | Medium: below the app's usual 44px-wide touch convention. This is a measurement, not a claim of failure against an external accessibility standard. Review compact-phone hit areas and enlarged text. | TODAY-01, C-AGENDA |
| TODAY-F10 | A three-block “Lectura y repertorio” plan is labeled only “Técnica · Con piano” because the subtitle uses its first block. | Medium: mixed sessions can look like single-activity practice. Consider a compact block summary shared with Calendar. | TODAY-02, CAL-01/05, C-AGENDA |
| TODAY-F11 | Yesterday's unstarted plans are absent; routines/future events are silently limited to three/two. | Open product question: should Today surface missed practice or offer direct View all links? Avoid adding clutter without agreeing the objective. | TODAY-01/04/05, Calendar, My piano |

Visual observations are based on the linked baseline captures. Functional probes for F04/F06 and measurements for F09 are saved in the baseline `capture.json`. Start-path and marker differences were also traced in the baseline action handlers and rendering code. Keep these original observations when adding the refinement results so changes remain reviewable.

## Open coverage

- [x] Baseline: empty, typical and unfinished-session states in all four primary viewports, including lower content.
- [x] No page-width overflow in those combinations; no runtime exceptions in the isolated capture run.
- [x] Three targeted probes: date carry-over, unfinished-session shortcut, narrow-phone week targets.
- [x] Agree the practice-first objective and record D-002.
- [x] Agree the main-action hierarchy and compact landscape direction; record shared navigation in D-003.
- [x] Implement D-002/D-003 and capture comparable empty/typical/pending states; the primary action is visible and the page does not overflow in all four layouts.
- [x] Complete scoped functional/shared-navigation verification, including native Android Back and preservation of the installed notebook/assets.
- [x] Record the owner's positive response to the structure and request for a denser trial under D-004.
- [x] Implement and compare D-004 against the same three fixtures/four layouts; recheck first-view action, touch areas, overflow and affected shared controls, with scoped browser and native checks passing.
- [x] Obtain visual acceptance for the rendered compact result: “me gusta, aprobar y continuar”, 2026-10-01. D-002–D-004 are accepted in their presented implementation scope.
- [ ] Visit each child surface deliberately, including cancel/back and returning to Today; a route map is not an end-to-end review.
- [ ] Long names/titles/notes; many sessions/routines; only completed sessions; zero weekly goal; unavailable MIDI; missing repertoire; errors/recovery messages.
- [ ] English comparison, enlarged text, screen reader/keyboard focus, larger/smaller phones and tablets.
- [ ] Midnight/week/DST boundaries, foreground date rollover, resumed app and prior-day unfinished sessions.
- [ ] Native Android safe areas/system navigation/software keyboard; iOS device evidence when available.
- [ ] Close remaining coverage and child reviews before claiming complete Today-flow or release acceptance; recheck the accepted visual reference after shared-component changes.
- [x] Refresh and check the [Today manual](../manual/en/today.md) against the implemented entry points; it remains draft while the review is open.

## Continuation

Continue with **PRACTICE-01**, the session overview reached from Today's Start/Resume action. Proposed objective: understand the current block and begin or resume playing with minimal friction, keeping time, pause and finish unambiguous. Establish its four-layout baseline before proposing changes; this new objective and layout are not yet approved. Then continue the remaining Today branches: week, plan/result cards and events, plus the Practice hub under HUB-01. Keep the accepted compact Today as the shared visual reference without treating an opened child as a completed review.

## October 14, 2026 — Weekly practice summary

Owner explicitly requests restoring a prominent weekly summary to Home, with a comparison when a goal exists. Current source places it below the start/resume card and above the week strip. It uses the same Monday-based saved-time metrics as Progress, excludes future records and unfinished practice, retains actual minutes above the goal, and omits target/bar when the goal is zero. Four-layout, both-theme synthetic evidence is in [weekly progress](captures/today/2026-10-14-weekly-progress/README.md). The prior accepted screenshots remain historical; the new layout is implemented and browser-verified, not visually accepted by the owner or native-device verified.

### 2026-10-14 — Merged weekly summary

Owner requested weekly progress/calendar as the first block, overriding prior practice-first ordering. One colored card now contains the total/optional goal and seven-day calendar with per-day saved-minute bars. Compact copy, day navigation and Progress/Calendar links retained. Evidence: `captures/today/2026-10-14-merged-week/`; unit and browser checks pass. No APK or web release for this change yet.

### 2026-10-15 — Two visual planes

D-039 refines the merged-week appearance using the owner's Runna references. The week remains first, now a neutral raised card with a short shadow; the next-practice context and headings sit directly on the page background. Saved/appointment cards float independently. Activity markers, daily bars, goal and navigation behavior are retained. [Final responsive evidence](captures/themes/2026-10-15-surface-depth-02/README.md) reopens the shared navigation surfaces in both themes/four orientations. Implemented and browser-verified, awaiting owner/native visual acceptance; no new package/publication.


## Weekly duration follow-up — 2026-10-16

Owner requested the weekly widget use hours/minutes like Progress. The total and optional goal now reuse the existing formatter, including the progress bar’s accessible value; numeric calculations and whole-minute rounding stay unchanged. Production build and ten focused unit/browser checks pass. [Dated responsive evidence](captures/today/2026-10-16-hours-minutes-01/README.md) covers both themes and four phone/tablet orientations using disposable notebooks, including 199 min → 3 hr 19 min and a 90-minute goal → 1 hr 30 min. Source/build hashes and fixtures are retained. Local browser review is open at http://127.0.0.1:5216/. No APK or publication; native and owner visual acceptance remain open.


## 2026-10-17 — Standalone recording (D-057)

Owner requests Record from Home and Multimedia. Implemented as a contextual header button, opening only recording controls and current repertoire selection, with live camera or measured microphone level feedback. Existing practice/weekly/commitment hierarchy remains in place. Shared header parity and Home entry geometry pass in both themes, phone/tablet orientations and 320 px. [Current evidence](captures/multimedia/2026-10-17-standalone-recording-02/verification.json); [recording review](recording.md). No new practice session is created by recording, and the existing notebook remains unchanged. Responsive browser only; owner/native acceptance and packaging remain open.
