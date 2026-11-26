# Interface and usability audit — 26 November 2026

Status: **proposal backlog for discussion**. The owner requested an extensive review with excellent usability, pure minimal design and limited interface complexity as the objective. This authorizes the review; none of the layouts below is accepted or implemented by this document.

The strongest opportunity is to remove inactive content, clarify actions and give existing information a more consistent hierarchy. The app already has a useful structure, recognizable activity colors, persistent navigation, a compact practice widget and a shared saved-session renderer. A broad visual redesign would introduce avoidable regression risk before the smaller problems are resolved.

## Reference and evidence

- Application reference: **6.2.4-beta.1 / Android versionCode 129**, commit `559c7949a0f180e36c826468daf59d2709b68f3c`, the latest publication recorded in this checkout's review handoff. This audit does not independently establish the current remote deployment or Play status.
- Source was exported to `/private/tmp/spino-ui-audit-20261126`. The older dirty main checkout and the other active worktree were preserved. The export uses the installed dependencies; its production Vite build passes. It is a review build derived from that commit, not a new signed release or a byte-for-byte package validation.
- [Evidence run](captures/interface/2026-11-26-extensive-audit-01/README.md): **104 screenshots retained; 101 have the requested viewport dimensions**. Three captures affected by browser score/orientation capture behavior are retained and excluded from responsive visual acceptance.
- The main-screen matrix contains **48 frames**: Today, Practice, Calendar, Library/Repertoire, Progress and Profile; light/dark; phone 390×844 and 844×390; tablet 768×1024 and 1024×768. No page-level horizontal overflow was measured in these 48 frames. Internal horizontal appointment/stand strips are separate from page overflow.
- Further inspection covers empty notebooks, 320×640 phones, unfinished sessions in four layouts, reading/repertoire preparation, piece selection, practice overview, generated reading, finish feedback, Calendar month/add/event/week planning, catalogue, work detail, add-work forms, multimedia entry, recording choices, progress detail/categories, practice preferences, profile editing, disconnected synchronization and MIDI entry/settings.
- All data is synthetic and isolated by a dedicated local origin and IndexedDB namespace. No personal notebook, PDF, recording or annotation was used. No camera/microphone recording, external account connection, APK installation or publication was performed.
- PDF controls were inspected in the DOM, and a valid synthetic PDF rendered after correcting the review server's `.mjs` content type. Score fullscreen/orientation screenshots and one generated-phone-landscape screenshot have capture limitations. They are not evidence of an app layout defect. MusicXML, annotation editing, saved-media playback/sharing, cloud conflicts, Bluetooth and physical audio timing are source/historical coverage only in this audit, not newly accepted native behavior.

Read [the light phone comparison](captures/interface/2026-11-26-extensive-audit-01/contact-light-phone-portrait.jpg), [dark phone comparison](captures/interface/2026-11-26-extensive-audit-01/contact-dark-phone-portrait.jpg), [preparation/forms comparison](captures/interface/2026-11-26-extensive-audit-01/contact-flows-setup.jpg), [information surfaces](captures/interface/2026-11-26-extensive-audit-01/contact-flows-information.jpg) and [empty/pending states](captures/interface/2026-11-26-extensive-audit-01/contact-flows-empty.jpg).

## Constraints retained from accepted decisions

1. Preserve the five primary destinations, recognizable activity colors, original musical titles and user-entered content. The Profile avatar and MIDI utility remain compact.
2. Preserve the restored 9 November Today weekly module and its accepted palette as the starting reference. Earlier mirrored metrics, pill charts and alternate palettes are not the current baseline.
3. Preserve the separate mode-selection step, fixed total time, optional warm-up after total duration, multiple repertoire selection and stable block IDs. Simplification must retain detailed editing and existing repeated/mixed blocks.
4. Preserve the owner-approved upcoming-event allowances: one audition, one concert, two lessons, two rehearsals and two Other events, with performance priority. No global event cap or future cutoff is proposed.
5. Preserve compact, single-row score practice controls and score-edge paging. Do not restore a second permanent toolbar in the name of discoverability.
6. Every saved-session design change goes through `src/companion/saved-session-card.js` and its stylesheet. Today, Calendar, Progress, work history, completed lessons and result/history dialogs inherit it; passages, plan time and notes stay in the shared card. Planned and active practice keep their controls.
7. Retain the compact-help policy: optional explanations may fold; errors, save status, conflict choices and consequences of destructive actions remain visible. No automatic hiding of user content.
8. Keep all proposals below separate from existing acceptance. In particular, the work Actions menu, horizontal saved-session rows, pending-practice hierarchy and stand/collection structure already have accepted direction. Alternatives touching them require a concrete comparison.

## Priority and evidence key

**P1**: address clear task friction or an identified accessibility/content problem first. **P2**: useful simplification or consistency work after the first batch. **P3**: exploratory visual/composition alternative; compare before changing accepted design. No P0/data-loss defect is established by this review.

**O** = observed in a current responsive screenshot/DOM; **S** = confirmed in the reference source; **H** = expected usability benefit requiring a user-task comparison. Observing a layout does not prove that users fail at it. **Small / Medium** are relative implementation estimates, not delivery commitments. Shared changes can require much broader verification than their code size suggests.

## First discussion batch

### UX-01 — Collapse the disabled warm-up fields

**P1 · O/S · Small–Medium · PREP-01/02, C-PRACTICE, C-DURATION**

In repertoire preparation, the unchecked warm-up still shows disabled type, duration and exercise fields. Its card occupies about 318 px on a 390×844 phone, pushing the piece choices and Start action down. [Observed state](captures/interface/2026-11-26-extensive-audit-01/flow-repertoire-setup.png). `views.js` renders the fieldset and disables it rather than collapsing it.

Propose a single compact off row. Enabling it reveals its settings immediately below that row, at the accepted position after total duration. Retain the chosen values while off and preserve the fixed-total redistribution rules.

Acceptance: off/on/off restores the same settings and block IDs; the total stays fixed; focus remains on the toggle; selected pieces and Start require less scrolling in the same fixture. Do not hide a configured warm-up's identity or minutes while enabled.

### UX-02 — Give every actionable icon and piano key an accessible name

**P1 · O/S · Small–Medium · CAL-02/03, PRACTICE-02/03, CAT-01, C-NAV, C-SCORE**

The month-view add button is exposed simply as `+`. Generated reading exposes several piano keys as unnamed buttons; the keyboard renderer in `src/main.js` only adds visible text on C keys and supplies no accessible name for the others. Catalogue preview/download and repertoire print buttons also repeat generic action names without the work title. [Month DOM](captures/interface/2026-11-26-extensive-audit-01/flow-calendar-month.dom.txt), [generated-reader DOM](captures/interface/2026-11-26-extensive-audit-01/flow-generated-reading.dom.txt).

Propose descriptive names such as “Add activity on 26 November”, “D sharp 4”, and “Preview [original work title]”. Keep the visuals compact. Review whether the exercise's accessible note naming needs an equivalent assessment mode; an accessible key name identifies the control and must not expose the currently expected answer.

Acceptance: interactive controls have distinct meaningful names, the selected note-naming convention is respected, decorative edge keys remain noninteractive, and screen-reader/keyboard users can reach and activate the controls without guessing. This review is not an accessibility certification.

### UX-03 — Distinguish an empty collection from a filtered result

**P1 · O/S · Small · REP-01, C-EMPTY**

A genuinely empty notebook says “No hay obras con estos filtros. Cámbialos o añade una obra.” No filters were applied. [Empty Library](captures/interface/2026-11-26-extensive-audit-01/empty-piano-phone-portrait.png). `repertoire.js` uses the same fallback for zero collection entries and zero matches.

Propose “No pieces yet” with the existing Add work action for a new collection. For an actual search/filter miss, keep a specific no-results explanation and expose the existing Clear filters action in context. Keep Trash-empty distinct as well.

Acceptance: first launch, nonmatching search, stage/tag filter, and empty Trash have truthful copy and an appropriate existing next action. Clearing a filter never changes collection membership.

### UX-04 — Use one practice-mode vocabulary across the app

**P1 · O/S · Medium · PREP-01, CAL-04, PROFILE-03, PRACTICE-01, C-PRACTICE, C-LOCALE**

Preparation uses “Móvil”, preferences use “En pantalla”, the weekly planner uses “Sin piano” and a third “Piano MIDI” option, and the active-session summary returns to “Sin piano”. These labels require the user to translate between views. [Reading setup](captures/interface/2026-11-26-extensive-audit-01/flow-reading-setup.png), [planner](captures/interface/2026-11-26-extensive-audit-01/flow-plan-week.png), [preferences](captures/interface/2026-11-26-extensive-audit-01/flow-practice-preferences.png).

Propose a consistent visible distinction such as “On screen” / “With piano”, plus the actual MIDI connection/evaluation state where relevant. Preserve the accepted mode-selection step, automatic MIDI behavior and backward compatibility of stored MIDI preferences/plans; copy cleanup alone must not change evaluation policy.

Acceptance: users can predict the required instrument, answer method and measurement in preparation, routine/planning, defaults and active practice. Check all five locales and legacy routines.

### UX-05 — Keep long-form completion actions reachable

**P1 · O/H · Medium · CAL-06, PREP-01, PRACTICE-06, REP-03, C-DIALOG**

In the phone event form, the Save/Cancel controls are below the first viewport. Repertoire setup and finish feedback can also require scrolling past optional content. Profile preferences already demonstrate a persistent Save treatment. [Event form](captures/interface/2026-11-26-extensive-audit-01/flow-event-form.png), [feedback](captures/interface/2026-11-26-extensive-audit-01/flow-finish-feedback.png).

Propose one shared action footer for the affected long forms, with a clearly dominant primary action. Retain the existing close control and validation. Do not indiscriminately add fixed bars to short dialogs or practice workspaces.

Acceptance: Save/Start and Cancel remain reachable with the soft keyboard and enlarged text; the footer does not cover the last field or errors, steal focus, duplicate actions, or collide with navigation/safe areas. Failed saves retain edits. Keyboard/device verification is still required.

### UX-06 — Make additional appointments in a day discoverable

**P1 · O/H · Medium · CAL-01/02, C-AGENDA, C-SESSION-CARD**

On the portrait phone, the week row shows one appointment and a narrow slice of another. A busy day can look like a single-entry day. The horizontal grouping is intentional and already accepted; the issue is discoverability. [Calendar phone](captures/interface/2026-11-26-extensive-audit-01/calendar-light-phone-portrait.png).

Compare a quiet visible count (“2 activities”) or a clearer next-card cue within the existing row. Preserve horizontal navigation and the shared saved-session renderer. Avoid adding another permanent button to every day.

Acceptance: a person unfamiliar with the screen notices and opens the second/third entry; vertical scrolling still works; keyboard access reaches offscreen cards; completed/planned/event states remain distinct. Test one, two, five and long-title entries.

### UX-07 — Make the planner's past-day behavior explicit before saving

**P1 · O/H · Small–Medium · CAL-04, C-AGENDA, C-DURATION**

On Thursday, the default Monday/Wednesday/Friday selection leaves Monday and Wednesday visibly checked even though the resulting proposal contains only Friday. The exclusion is explained lower down. [Observed planner](captures/interface/2026-11-26-extensive-audit-01/flow-plan-week.png).

Propose distinguishing unavailable past days at the day selector, and showing the count/minute consequence near it. Preserve the current safeguards, recurring-week rules and explicit ability to plan future weeks. Do not silently discard selected days in a multiweek series where they are valid in later weeks.

Acceptance: the visible selection and proposal communicate the same actionable dates; an empty valid selection has a clear local explanation; one-week and recurring series remain correct across week/year boundaries.

### UX-08 — Offer a discoverable route to disconnected MIDI settings

**P1 · O/S/H · Small–Medium · MIDI-01/02, C-MIDI, C-NAV**

Tapping the disconnected piano icon attempts reconnection. In this browser it reports failure and tells the user to hold the icon to open settings. A context click opens Instrument. Source `midi-shortcuts.js` confirms reconnect-on-click, settings-on-hold/context-menu behavior. [Tap outcome](captures/interface/2026-11-26-extensive-audit-01/flow-midi-instrument.png), [settings](captures/interface/2026-11-26-extensive-audit-01/flow-midi-settings-disconnected.png).

Propose an explicit “Open instrument settings” action in the failed-reconnect state, or opening Instrument on the first disconnected/no-saved-device use while retaining reconnect as a shortcut for known devices. Keep the icon compact. This concerns discovering settings; browser permission rejection is not evidence of native Bluetooth failure.

Acceptance: first-time, remembered/disconnected and connected users can reach settings with touch and keyboard without knowing a hidden gesture. No new MIDI permission is requested during review; native pairing is verified separately.

## Further proposals

Each item below is a discussion proposal. The acceptance condition names what would make the change worth retaining.

| ID / priority / effort | Observation and proposed change | Evidence and acceptance condition |
| --- | --- | --- |
| **UX-09 · P2 · Small** | Increase the invisible hit areas of compact Library sort controls. “Author” measures about 31×44 px and “Stage” about 39×44 px at the phone reference. Keep their quiet visual size and spacing. | O, `baseline.json`, REP-01/C-NAV. Use a project target near 44×44 CSS px where feasible; this is a design target, not a claimed standards violation. Adjacent targets must not overlap and long translations must fit. |
| **UX-10 · P2 · Small–Medium** | In a one-block reading practice, both Total duration and Duration of block show the same value. Give the user one authoritative control; show individual allocation when multiple blocks or warm-up make it meaningful. | O/H, [reading setup](captures/interface/2026-11-26-extensive-audit-01/flow-reading-setup.png), PREP-01/02. Single→multiple→single transitions retain total, block IDs and settings. Detailed editing stays available. |
| **UX-11 · P2 · Medium** | Make displayed duration and tempo values directly editable for precision while retaining their sliders. Avoid a permanent extra row of −/+/preset buttons. | O/H, preparation/preferences, C-DURATION. Users can set an exact minute/BPM by touch and keyboard, understand bounds, and cancel invalid edits. Scope to value controls that lack a numeric alternative; some block durations already have one. |
| **UX-12 · P2 · Small–Medium** | In the multiple-piece search dialog, make the completion action communicate selection, such as “Done · 2 pieces”. Keep selection persistent across searches and avoid a second selected-items panel. | O/H, [picker](captures/interface/2026-11-26-extensive-audit-01/flow-repertoire-picker.png), PREP-01/04. Zero/one/many choices are clear; the existing on/off-stand semantics and time redistribution remain unchanged. |
| **UX-13 · P2 · Medium** | Make finishing a routine practice feel shorter: put duration and the existing Save action first in the visual hierarchy, then mood/notes, with less frequent attribution/next-step editing secondary. Required corrections and missing-work attribution stay visible. | O/H, [feedback](captures/interface/2026-11-26-extensive-audit-01/flow-finish-feedback.png), PRACTICE-06/C-FEEDBACK. A user can save without optional typing; keep practising, partial sessions, save failure and edit-later behavior remain unambiguous. Assess together with UX-05. |
| **UX-14 · P2 · Small** | Move the Quick practice scoring formula into the existing optional-help pattern. Before the first result, its prominent card currently contains several lines of rules despite holding no record. Retain the record and a short useful next action. | O/H, [Practice](captures/interface/2026-11-26-extensive-audit-01/practice-light-phone-portrait.png), HUB-01/D-060. Scoring remains available on demand; practice choices and routines become easier to scan. |
| **UX-15 · P2 · Small–Medium** | Distinguish Today's next practice action from Record more clearly through one modest weight/contrast difference. They currently occupy equal-width, similar-weight buttons below a large weekly summary. Resume remains the primary action when a session exists. | O/H, TODAY-01/03/04. Compare within the accepted weekly structure and palette; do not reintroduce mirrored metrics or another start control. Users should identify the next action immediately in planned, pending and unscheduled states. |
| **UX-16 · P2 · Small–Medium** | Clarify what the colored markers under Today dates mean. The accessible date labels include activity counts, but the visible tiny dots have no visible interpretation. Test restrained grouping or a short contextual explanation instead of an always-present legend. | O/H, TODAY-02/C-AGENDA. A user distinguishes practice from appointments without relying on color alone; the seven-day strip stays compact. Do not add a new metric. |
| **UX-17 · P3 · Medium** | Compare a tighter treatment for secondary upcoming commitments so repeated date tiles, type, title and countdown consume less vertical space. Keep performances visually prominent. | O/H, TODAY-05/C-AGENDA. Retain every accepted per-type allowance and accessible date/countdown. Do not replace the list with a global cap or hide near-term events behind extra interaction. Needs owner composition comparison. |
| **UX-18 · P2 · Small–Medium** | Make the existing way to return to the current Calendar period easier to recognize after browsing. Review the current week/date interaction and the Month “Today” action as one convention. | O/S/H, CAL-01/02. Test after browsing several periods and after sync adoption. Preserve date/scroll anchors; do not duplicate an already available control with a second toolbar. Benefit needs task validation. |
| **UX-19 · P2 · Small** | Clarify the event form's unset time. The hour selector displays `--` beside minute `00`; the visible pair can look partly entered. Use a clear no-time state while preserving arbitrary-minute support. | O/H, [event form](captures/interface/2026-11-26-extensive-audit-01/flow-event-form.png), CAL-06. “No time” and 00:00 are distinct; editing/recurrence/reminders do not invent a time. Localize labels. |
| **UX-20 · P3 · Medium** | In a tiny collection where every work is on the stand, the same rows and sort/print chrome appear twice. Compare reducing repeated chrome or making the collection section quieter while retaining the stand/collection distinction and global search. | O/H, [Library](captures/interface/2026-11-26-extensive-audit-01/piano-light-phone-portrait.png), REP-01/D-030. Do not remove works from either semantic set, change stand membership, or filter global collection search to the stand. Requires comparison against the accepted structure. |
| **UX-21 · P2 · Small–Medium** | When a work has no next step, replace the full repeated generic paragraph with a quiet action to add one using the existing editor. Keep a real passage/goal fully visible. The unqualified default 60 BPM should not visually imply a verified score tempo. | O/H, [work detail](captures/interface/2026-11-26-extensive-audit-01/flow-work-detail.png), REP-02. Existing work Actions menu remains accepted; no second management menu. User notes, musical metadata and history remain intact. |
| **UX-22 · P3 · Medium** | Compare a calmer hierarchy within saved-session cards: title and duration lead; activity/context/date support; mood has less competing visual weight. Preserve every field and the whole-card opening action. | O/H, C-SESSION-CARD. Implement only through `saved-session-card.js`/CSS and compare Today, Calendar compact/full, Progress, work history, completed lessons and result/history dialogs in both themes/four layouts. Do not create per-screen copies or flatten contextual notes. |
| **UX-23 · P2 · Medium** | Make multiple editions distinguishable using verified format/edition/source metadata in the existing secondary line. Catalogue titles such as “Canon in D”, “Canon in D (2)” and “(3)” offer little basis for choosing. | O/S/H, [catalogue](captures/interface/2026-11-26-extensive-audit-01/flow-catalogue.png), CAT-01/02/04. Preserve original titles/IDs; no invented difficulty, rewriting musical titles or new default grouping/navigation is proposed. Preview and individual download remain immediate. |
| **UX-24 · P2 · Small–Medium** | Reduce the empty media calendar's visual dominance before a user has any recordings; give the existing Record entry a clearer relationship to the empty message. Preserve date browsing once it contains data. | O/H, [Multimedia](captures/interface/2026-11-26-extensive-audit-01/flow-multimedia-empty.png), MEDIA-01/02/C-EMPTY. No duplicate Record button, new library mode, or automatic recording. Distinguish an empty library, empty week and filtered miss. |
| **UX-25 · P2 · Small–Medium** | Use a concise first-use state in Progress instead of giving a twelve-week all-zero graph the full populated-chart footprint. Technique's empty state should link to the existing relevant practice entry. | O/H, [empty Progress](captures/interface/2026-11-26-extensive-audit-01/empty-progress-phone-portrait.png), [Technique](captures/interface/2026-11-26-extensive-audit-01/flow-progress-technique.png), PIANO-02/C-EMPTY. Do not fabricate statistics or collapse zero weeks inside a real history. Keep historical/filter comparisons and pending-session guards. |
| **UX-26 · P2 · Small** | Format last-practice dates and practice-count plurals consistently in Progress → Repertoire. The current view displays `2026-11-25` and `1 prácticas` beside localized dates elsewhere. | O/S, [Progress Repertoire](captures/interface/2026-11-26-extensive-audit-01/flow-progress-repertoire.png), `progress-learning.js`, C-LOCALE. Use the existing date/duration vocabulary in all five locales, with zero/one/many counts and no timezone day shift. Good early polish item. |
| **UX-27 · P2 · Small** | Reduce oversized gaps around the Profile identity block and before its settings. Keep name/avatar recognizable and the familiar row hierarchy. | O/H, PROFILE-01. More useful settings should enter the first phone viewport without decreasing their touch targets or making the profile cramped. Check unnamed users, photos and long names. |
| **UX-28 · P3 · Medium** | Review the disconnected Profile entries “Sync & backups” and “Connect another device” as one account/notebook task. They currently present two equally prominent starting points for closely related decisions. | O/H, PROFILE-01/CLOUD-01/02. A small subordinate link may be enough; preserve create/join distinction, account choice and notebook retention. Actual connection/recovery/conflict behavior needs native validation, not a cosmetic browser simulation. |
| **UX-29 · P3 · Medium** | Consolidate surface, spacing and text tokens so semantically equivalent navigation cards, content cards and quiet rows use consistent borders, radii, elevation and label hierarchy. Screens currently combine raised cards, gradients, bordered cards, bare rows and several pill treatments. | O/S/H, C-NAV/C-DIALOG/C-EMPTY. Preserve the accepted palette and functional activity colors. Compare a contact sheet and change the smallest inconsistent set; uniform styling for every semantic type would reduce useful hierarchy. No blanket flattening or palette replacement. |
| **UX-30 · P2 · Medium** | Optimize short landscape browsing: large vertical summaries can consume the entire available phone height before the next practice action or today's appointment. Compare compact spacing and an appropriate wide layout of the same content. | O/H, main-screen landscape matrix, SYSTEM-03/TODAY-01/C-PRACTICE. Do not shrink text/touch targets or alter the accepted generated-reader landscape arrangement. Check safe areas and restore scroll/selection on rotation. |
| **UX-31 · P3 · Small–Medium** | Compare removing the redundant Add work chooser: the “Enter details” branch opens a form that already contains the optional PDF picker. A single form may support both intents with one fewer decision. | O/H, [choice](captures/interface/2026-11-26-extensive-audit-01/flow-add-work-choice.png), [form](captures/interface/2026-11-26-extensive-audit-01/flow-add-work-form.png), REP-03/04. Keep direct import discoverable, preserve OCR progress/corrections and file-picker cancellation, and do not open the OS picker automatically. |
| **UX-32 · P2 · Small–Medium** | Let labels/selected values use the space they need on narrow forms. Reading's Hands choice and detailed Progress's work filter truncate useful text in their two-column arrangement. Stack selectively or show a concise unambiguous selected summary. | O/H, reading setup/progress detail, C-DURATION/C-LOCALE. Check 320 px, enlarged text and all five locales; retain full original work titles and access to the selected value without relying on hover. |

## Recommended sequence

1. **Clarity and accessibility:** discuss UX-01–08 first. Add the small UX-26 date/plural repair to this batch if accepted. These have concrete evidence and do not require a new product structure.
2. **Less configuration effort:** UX-09–14, UX-19, UX-25 and UX-32. Prototype the warm-up, exact-value and action-footer behavior together so one simplification does not add another control elsewhere.
3. **Quiet visual refinement:** UX-15/16, UX-21, UX-23/24, UX-27 and UX-30. Show matched before/after states with identical data before choosing a layout.
4. **Optional composition comparisons:** UX-17/20/22/28/29/31. These touch accepted structures or aesthetic balance and should follow stronger evidence of benefit. UX-18 needs a targeted navigation task before changing existing Calendar controls.

The first implementation batch should stay small enough to compare as a whole. Accepting an objective such as “less scrolling” does not pre-approve a sticky footer, a collapsed group or a new card treatment.

## Suggested validation tasks and success conditions

Use disposable notebooks with no works; two all-on-stand works; a large collection; long original titles; one/two/five daily activities; planned, running, paused and unfinished practices; missing files; and controlled save/download failures. Keep old evidence runs unchanged.

| Task | What to measure or observe |
| --- | --- |
| Start a repertoire practice, warm-up off, two pieces | Decisions/taps, scrolling before piece selection and Start, comprehension of the fixed total. Compare the same task against this baseline; no invented improvement percentage. |
| Change a duration/BPM to an exact value | Successful entry, correction and cancellation with touch and keyboard; block allocation/IDs retained. |
| Finish with no optional feedback, then finish with passages/notes | Save reachability, distinction from Discard/Continue later, one saved record, retry retention. |
| Open a second activity on a busy day and return to today | Discovery without coaching; date/scroll retained after navigation, rotation and synchronization. |
| Add a piece to an empty notebook, then search for a missing piece | Truthful empty/no-match state, obvious recovery and preserved library/stand membership. |
| Find disconnected MIDI settings | Successful first-use path with touch and keyboard; permission denial/reconnect remain distinguishable. |
| Use the UI with enlarged text and German/Hungarian/Catalan | Full selected values, readable labels, reachable actions, no hidden errors, no page overflow or unsafe overlap. This audit's visual matrix primarily uses Spanish. |
| Review shared saved sessions across their callers | Same renderer, consistent hierarchy, contextual passages/plan/notes retained and no loss of card opening/action semantics. |

Physical/native follow-up remains necessary for soft keyboard/safe areas/Android Back; VoiceOver/TalkBack and switch/keyboard access; MIDI USB/Bluetooth recovery; interruptions/background timers; PDF/MusicXML annotation persistence; camera/audio capture and actual receiving-app sharing; and Drive account/notebook conflict resolution. Existing release evidence is useful context, not proof that a new proposal passes these tasks.

## What this review does not recommend

No additional primary tab, new global floating button, permanent legend/tool row, new configuration mode, cosmetic charts, fabricated score difficulty, general gamification, new onboarding wizard, automatic upload, or font/theme replacement is justified by the findings. Keep helpful progressive disclosure local to the task. Original notebook data, stable IDs, assets and accepted translations are preserved.

## Handoff

Next action: discuss the first batch by UX ID, choose a concrete scope, then produce matched prototypes before implementation acceptance. This review changes documentation/evidence only. The manual is not updated to claim any proposal is available. Existing screen status codes and native gates remain unchanged; [screen inventory](screen-inventory.md) now links this dated cross-screen audit.
