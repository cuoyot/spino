# Calendar review

## 2026-10-15 — Compact saved sessions

The owner requests less vertical space for completed practice, especially when several sessions share a day. This is the accepted objective; the implemented pill layout awaits owner visual acceptance.

CAL-01 weekly days now group saved sessions below appointments as wrapping pills: completion/partial indicator, title, actual minutes and optional mood face. Full titles, notes, results, editing and feedback remain available through the existing session detail. Long titles truncate visually but remain in the accessible name and tooltip. CAL-02 selected-day results use the same pills. Planned practices and events retain their existing actions. Session IDs and notebook data are unchanged. Today keeps its detailed cards; existing navigation regression passes.

[Responsive browser gallery](captures/calendar/2026-10-15-compact-sessions/index.html) uses a disposable synthetic notebook with linked/ad-hoc/partial records, three- and six-session days, a long title, lesson and pending practice. Both themes pass at 390×844, 844×390, 768×1024, 1024×768 and 320×640. Pills have 44px minimum targets and no horizontal overflow. A three-session day decreases from approximately 315 to 168px on a portrait phone and 315 to 118px on a portrait tablet. The conservative former-card comparison excludes its Add button. Exact detail routing, preserved notes, month detail and day Add pass. Build, nine agenda/planner unit checks and two existing browser regressions pass.

No APK built or publication performed. Responsive Chromium evidence does not imply native-device or owner visual acceptance. Continue with owner feedback on the pills and native packaging only when requested.

Publication follow-up: Android beta 11/build50 now contains the compact sessions. Replacement installation, data retention and foreground/version checks pass; website commit aa3038f and public artifact hashes are verified. iOS remains beta 9/build48. Owner/native visual acceptance remains open. See [release evidence](../releases/6.0.0-beta.11.md).

## 2026-10-15 — Circular session design proposal

The owner requests a design mockup using activity icons/colors, elapsed minutes and mood, potentially removing the visible title from the compact token. This is a proposal for validation, not an accepted replacement for D-040 or an implemented app change.

The conversation mockup compares **Circles** (64px default, icon and time inside, optional mood badge), **Icon with time below** (56px disc) and the current title-bearing pills. It uses the existing blue reading, purple technique, gold repertoire and teal free-practice identities. Three- and six-session synthetic days, a lesson, missing mood and a partial session expose density and meaning. Selection reveals the full title/type/minutes/mood; the partial indicator remains explicit. The title is deliberately absent from the two icon-first variants, so same-type sessions become distinguishable by duration/mood until opened. Multi-activity icon policy remains a later implementation decision.

The inline proposal is stored in the thread visualization directory as `calendar-session-circles.html` for thread `01a13e78-7a2b-7ba1-a190-5a2ce8450140`. Browser layout/interaction evidence is local in `artifacts/calendar-circle-mockup/`. No production app, manual feature claims, APK or website is changed by this design exploration. Beta 11 remains the published behavior; owner choice is the next step.

## 2026-10-15 — Accepted circles and horizontal rows

The owner accepted the circular design and authorized implementation, explicitly asking to test sessions longer than one hour. The later instruction keeps one line of circles with horizontal scrolling and no visible scrollbar. This supersedes D-040's title-bearing pill presentation; D-041 records the accepted scope.

Implemented 64px circles reuse the existing Practice/navigation SVG icons and activity palette, with actual minutes and optional mood. The first non-warm-up block represents the main activity; all activity labels and the full title remain in the accessible label/tooltip and existing detail route. A partial badge remains explicit. Durations stay in minutes, including 75, 95, 120, 180 and 720. Neither notebook records nor stored durations are modified.

Week and Month selected-day results share a horizontally scrollable row. Week Add stays fixed outside the strip. The row is focusable/labeled, supports native touch scrolling and arrow keys, hides its scrollbar and lets normal focus reveal offscreen buttons. Padding preserves mood/partial badges. Today retains its detailed cards. Icon paths were extracted unchanged into `icons.js` for reuse rather than duplicated.

[Final responsive evidence](captures/calendar/2026-10-15-session-circles/README.md) contains 30 frames in both themes, phone/tablet portrait/landscape and 320px. One-row geometry, touch/keyboard movement, hidden bars, fixed Add, long-time/mood separation, detail routing and month focus pass. Production build, nine agenda/planner unit checks and two existing navigation/planner browser regressions pass. Browser review is refreshed with synthetic long sessions. No APK/publication in this follow-up; native device and owner verification of the implemented interaction remain open.

## 2026-10-15 — Subtle day boundaries

Owner requests a light separator so sessions clearly belong to their day. Adjacent weekly days now have a 1px line using the existing theme line color, without adding a second divider beneath the week header. [New dated evidence](captures/calendar/2026-10-15-day-separators/README.md) preserves the previous baseline. Production build and 30-frame circle-row responsive checks pass in both themes/four orientations and 320px. Browser preview refreshed. Source-only follow-up; no new APK/publication or native acceptance.

2026-10-15 month-heading wording: owner requests removing the preposition from “Octubre De 2026”. Week/Month headings now join localized month/year parts as “Octubre 2026”; English remains “October 2026”. Spanish/English/Catalan rendering checks and production build pass. No new package/publication.

## 2026-10-15 — Single-row header controls

Owner requests that Week/Month not introduce a new header line. Calendar now keeps the title and view selector aligned horizontally at phone/tablet sizes. Narrow-phone spacing/type adjusts while preserving full labels, Profile/MIDI and 44px choice targets. The change is Calendar-scoped; other screen headers retain their established layout. [Evidence](captures/calendar/2026-10-15-inline-header/README.md): 96 measured language/theme/mode/size states, 30 captures and both existing header/navigation regressions pass. Browser preview refreshed; no new APK/publication or native acceptance.

## 2026-10-15 — Beta 12 release

Owner authorizes website and Git publication. Android beta 12/build51 packages the accepted circles/horizontal row, separators, compact month/year wording and inline header. Build, signature/packaging hashes, 208 unit/static checks (one skipped), five browser regressions and emulator replacement-install/data-retention/foreground checks pass. The source and corresponding tests are recorded in Git alongside the release. [Release record](../releases/6.0.0-beta.12.md); website commit b5417da and public pages/download hashes are verified in the publication report. Physical/native visual acceptance remains separate; iOS stays beta 9/build48.

## 2026-10-15 — Shared primary-header height

Owner reports that Calendar is taller than Progress. The shared primary bar is now 68 px high and keeps Profile, title and MIDI aligned across main routes; Week/Month remains inline and retains its labels and targets. Library tabs use a separate sticky page row. Three-language/two-theme responsive measurements and representative phone/tablet captures are in [header parity](captures/themes/2026-10-15-header-parity/README.md). Included in signed stable 6.0.0/build53 and published on the website. Native installation, loaded first launch and foreground are verified; populated native/physical and owner visual acceptance remain separate.

## 2026-10-18 — Lesson completion and teacher recordings (D-064)

The owner requests completing a planned lesson with duration, rating, scores, comments and next steps, then adds teacher audio/video demonstrations. This is an accepted functional objective; the implemented visual arrangement remains open for feedback.

CAL-07 now exposes Complete lesson, an editable actual date/duration, optional mood, comments, repertoire selection and next step. The completed summary links to the saved result and selected works/scores. Calendar/Today mark the appointment as completed; its single result is also available in the existing calendar circles and Progress history. Actual dates can differ from the appointment date. The original plan remains intact. Editing retains the saved result/block IDs; deleting the result returns the appointment to pending. Completed reminders are excluded without affecting other dates in a series.

Teacher recordings can be associated before or after completion. Associate recordings selects existing saved local audio/video. Record teacher uses the existing recorder and links the take automatically after saving; Play and Share remain available in the lesson and its result. Removing an association retains the original file. Missing local recordings keep a visible placeholder and their link unless explicitly unchecked. These links survive notebook validation/backup and independent cloud edits; recording binaries retain their existing separate local/Drive policy.

The lesson total uses one manual timing block, with selected pieces retained as tags rather than fabricated equal per-score durations. Later explicit edits to its activity breakdown are preserved when the lesson total/feedback is edited.

Final evidence: [2026-10-18-lesson-completion-04](captures/calendar/2026-10-18-lesson-completion-04/verification.json), 40 responsive-browser frames covering form, completed summary, recording actions and association picker, both themes, phone/tablet portrait/landscape and 320 px. Tests use a disposable notebook and a synthetic microphone; no personal notebook or emulator was changed. Runs 01/02/03 remain historical iterations; run 04 waits for the save toast to expire before capturing the completed view.

Validation: production build, 64 focused unit checks (lesson/model, agenda, recurrence, reminders, planning, saved edits, localization, backup and cloud), and five browser checks pass. The new browser flow covers failed result save/retry, duplicate submission, stable result editing, failed recording-link save/retry, automatic association, unlink/relink, playback, reload and unchanged works. Existing audio/video standalone capture, recurrence editing and saved-practice editing remain covered.

Preview: `node scripts/review/preview-lessons.mjs`, [light](http://127.0.0.1:5301/?theme=light) / [dark](http://127.0.0.1:5301/?theme=dark). The preview uses namespaced disposable storage, a synthetic audio example and a synthetic microphone. Source only after beta20/build73; no new APK/publication. Physical Android/iOS, actual teacher camera/microphone capture and owner visual acceptance remain separate.


2026-10-18 beta21/build74 delivery preparation: the owner authorizes website publication of D-064. [Release validation](../releases/6.1.0-beta.21-validation.json) and [native emulator evidence](captures/calendar/2026-10-18-beta21-native-01/native.json) record final packaging, replacement installation, current-data retention and sharing. The 40 lesson frames remain responsive-browser evidence; native installation does not establish physical lesson camera/microphone acceptance. Public deployment/download verification is recorded separately. Earlier source-only statements are historical.


2026-10-18 beta21 publication follow-up: source/APK tag `v6.1.0-beta.21` is pushed and Cloudflare deployment succeeds. [Publication record](../releases/6.1.0-beta.21-publication.json) keeps public-domain verification incomplete because spinoapp.com times out, while the immutable GitHub APK download matches the release size/SHA-256. Provider success is separate from custom-domain acceptance.

## 2026-10-19 — Event time input repair

The owner reports that CAL-06's HTML time input focuses segmented placeholders but offers neither a keyboard nor a picker on Android. New/edit event forms now expose separate native hour (00–23) and minute (00–59) selects. An empty hour keeps time optional; `00:00` remains midnight. The existing serialized `HH:MM`, reminder validation, recurrence and stable event identities are retained. The functional objective is accepted; the select layout awaits owner feedback.

[Final responsive-browser evidence](captures/calendar/2026-10-19-event-time-02/verification.json) covers ten frames, both themes, phone/tablet portrait/landscape and 320 px. One focused browser flow, two existing recurrence/lesson browser flows and ten unit checks pass. [Native emulator evidence](captures/calendar/2026-10-19-event-time-native-02/native.json) separately verifies both Android option lists opening from actual taps, selection/saving/reopening of 18:35, midnight, clearing optional time, replacement installation, foreground and original notebook/blob retention. Native run 01 is retained: its hour list opened correctly, but the test's DPAD offset selected 17 rather than the expected 18; run 02 corrects only that test offset.

Local same-version beta22/build75 review APK only; published website/downloads are unchanged. Physical-device and owner visual acceptance remain open. [Synthetic browser preview](http://127.0.0.1:5304/?theme=light) uses isolated disposable storage. No shared dialog, practice scheduling or weekly tutor time control was changed.

## 2026-10-19 — Shared saved-session cards

The owner's shared-design rule supersedes the previous saved-practice circles. Week and Month now render the same card as Progress/work history, with horizontal scrolling for several results, plan timing, the linked-plan/result deduplication rule and separate Add actions. Container queries keep the title and mood readable in narrow day columns. Completed-plan and target-history dialogs and completed-lesson results use the shared card too. [Responsive evidence and verification](captures/repertoire/2026-10-19-work-detail-05/README.md); earlier Calendar baselines remain historical. Owner/native layout acceptance remains open. The separate event-time repair retains its own native/browser evidence.

## Pending session consistency — 2026-10-21

The owner requested one consistent unfinished-session card across Today, Practice and Calendar, with a Practice navigation indicator visible from other destinations. The existing focus card now replaces the generic notice across browsing pages. Source/build and responsive browser checks pass in four layouts, including resume/discard and indicator removal. [Evidence](captures/session/2026-10-21-pending-session-01/README.md) uses only a disposable synthetic notebook. Owner visual and native acceptance remain open; no APK or publication.

2026-10-21 owner follow-up: omit the unfinished-session card from Calendar to avoid pushing its content down. Keep the Practice navigation indicator and the card on Today, Practice and other browsing destinations. Earlier Calendar-card captures remain historical evidence.

2026-10-21 continuous weekly calendar — owner requests scrolling to keep showing weeks and removal of the month title in Week view. The agenda appends two weeks near the bottom, retains loaded weeks during same-date rerenders, preserves selected-day highlighting and shared saved-session cards, and keeps previous/next/This week controls. Month view retains its month title. Build, four agenda unit checks and two browser checks pass with disposable notebooks; responsive evidence: [week-scroll-02](captures/calendar/2026-10-21-week-scroll-02/README.md). Owner visual/native acceptance remains open; no APK/publication.

## 2026-10-21 — Accepted subtle sync indicator and page action placement

The owner accepted the 19px, unfilled synchronization proposal, without the redundant exclamation badge. Connected/error states retain their accessible labels and 44px touch target. The owner then requested moving Record to Today’s practice focus, Quick practice to the activity choices, and Week/Month beside Plan your week within Calendar. The planner action occupies the same toolbar position in Week and Month; week arrows sit beside the first date range, which returns to the current week when selected. Multimedia keeps Record within its page.

A reported broken Profile ring was caused by the external avatar outline being clipped by the generic header button. Selection now uses one continuous inset border, with a circular button and visible keyboard focus. Source/browser acceptance passes 54 unit checks and four final browser regressions, including 60 light/dark responsive captures at 320×640, 390×844, 844×390, 768×1024 and 1024×768. Earlier UI evidence is reopened for Today, Practice, Calendar, Multimedia, Profile and shared header geometry. [Final browser evidence](captures/navigation/2026-10-21-page-actions-03/README.md). Native/package and publication acceptance are tracked in the beta6 release.
