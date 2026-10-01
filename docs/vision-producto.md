# Product vision: a companion for piano practice

Status: accepted product direction, extended with scale/mode lessons, the September 2026 usability review and the Today/navigation decisions of 2026-10-01. Development of the first release was authorised on 2026-09-30. [Release candidate scope](primera-version.md) distinguishes implemented behaviour from future proposals in this document; [quality-review decisions](quality-review/decisions.md) record the latest refinement and verification status.

Product name: **SPino: Smart Piano Notebook**, selected by the product owner. Use **SPino** in compact headers and the launcher, preserving that exact capitalization. The [branding record](branding-review.md) contains the decision and historical naming research. Sight-reading is one practice activity within a broader companion.

Promise: open the app, find something useful to practise today and keep a meaningful record of what you are learning. The main cycle is **plan → practise → record → review → adjust**. Time, consistency and personal goals matter without turning everything into a score.

## 1. Structure and navigation

| Destination | User question | Main content |
|---|---|---|
| Today (Hoy) | What am I practising today? | Contextual start/resume action, today's agenda, compact week context and upcoming commitments. |
| Practice (Practicar) | What do I want to play now? | Activity choices and saved routines leading into existing preparation/practice. |
| Calendar | When will I practise, and what did I do? | Month/week grid, day agenda, plans, completed sessions, concerts and auditions. |
| Library (Biblioteca) | Where is my music and practice material? | Repertoire, scores, catalogue and routines. |
| Profile avatar | How is my practice progressing, and what are my preferences? | Progress/history, practice totals and personal preferences, defaults, backup and synchronization. |

Keep the four labeled destinations in this order. Give Profile a distinct, prominent avatar without a visible text label, retaining an accessible name. MIDI is a compact connection/activity utility with an instrument-settings entry, not a peer navigation destination. No hosted account is required: the name and preferences live on the device. Active practice uses its own screen with stable pause, help, return and finish controls. Leaving an unfinished session offers continuation later, saving or explicit discard.

Phones use bottom navigation; tablets and short landscape windows can use a side rail. Keep the shared header compact in landscape so branding does not displace the screen's main action. Rotation rearranges the same content without changing the exercise, context or settings. Use the original dark controls and ink-on-paper score across the product, as explicitly selected by the user. Documentation and source comments are English; user-facing text follows the interface language.

## 2. Content and context are independent

Each activity declares the contexts in which it works and the measurements it can produce.

| Context | Experience | Input and evaluation |
|---|---|---|
| Without a piano | Reading, recognition and theory on a phone or tablet. | Reading always requires explicit on-screen responses: piano keys or note names. Never allow “no input” here. |
| With a piano | Acoustic or digital piano without a connection; content, instructions, metronome and timer. | Manual reflection, practised tempo and goals. No invented correct/wrong counts; no implied microphone evaluation. |
| MIDI piano | USB or Bluetooth MIDI connection. | Evaluate supported exercises against a compatible reference. Free practice without a reference has no accuracy percentage. |

Reading supports on-screen responses, manual score use and reference-based MIDI evaluation. Technique offers conceptual preparation without a piano and physical patterns at the instrument. Repertoire offers score study and manual tracking; evaluation needs a separately supported musical reference. Theory connects explanations to questions or instrument application. Future rhythm activities can use touch taps, metronome patterns or compatible MIDI timing.

Remember and display the context before starting. Explain incompatibilities and offer a suitable alternative. In the first release, free/repertoire practice requires a piano context; without a piano, reading, technique and theory provide explicit interaction. Advanced future activities must not blur conceptual study with physical technique training.

## 3. Today

Name the main destination **Today** (Spanish UI: **Hoy**). Give one contextual action priority: resume an unfinished session, otherwise start the next planned practice, otherwise choose an activity through Practice. Keep the date and seven-day strip as compact support; practice totals and the optional goal belong under Profile. Tapping a date opens that day in the calendar. Completed sessions follow with actual/planned minutes, feeling and a short note visible on their cards. A plan and its saved result occupy one card. Reading, Technique, Repertoire and Free practice choices, plus saved routine quick starts, live in the dedicated Practice destination; routine editing remains separate.

Keep detailed practice statistics under Profile. Below today's practice, show upcoming rehearsals, lessons, concerts and auditions with dates and days remaining. Event countdowns support the practice decision without taking over the screen. First use offers a clear Practice entry and useful empty-state guidance rather than empty charts or mandatory profile setup. New events entered from Today default to today; date-specific Calendar actions retain the selected day. Learn and its lesson card remain deferred.

Commitments are entered manually initially; personal concerts are distinct from an external public concert directory. An unfinished scale lesson occupies the existing continuation area, identifying the target and next block. Future shortcut personalisation can build on the same layout.

## 4. Starting practice

Common setup should fit one phone screen at normal text size: context, activity, musical target or work, suggested minutes, a tempo slider and the required response mode. Detailed hand, rhythm, score presentation and passage controls collapse under exercise options. Short landscapes use columns. Small screens and enlarged accessibility text may scroll; controls must remain reachable.

Do not ask for a session name at the start. Use an activity/routine title automatically and offer the final name during save and feedback. Naming a reusable routine or a calendar plan remains appropriate when saving that object.

The user can start a single exercise, a scale/mode lesson, a saved routine, a planned session or free practice. A musical target can be the starting point: “G major” or “D Dorian” leads to generated work, reviewed pieces/passages or a combined lesson. Advanced reading options include clef, range, rhythmic values, tempo, aids and response type. Repertoire focuses on a piece, passage and goal.

Suggested duration is guidance, not an automatic stop. Never change the piece while the pianist is still playing. MIDI connection is requested only in that context. A brief orientation suggestion can appear before practice: landscape on a phone with MIDI for more staff width, portrait on a tablet for a fuller page. It must be dismissible/non-blocking and never rotate the device automatically or insert moving instructions over an active score.

## 5. Library and routines

A routine is a reusable sequence of blocks; a session records what happened on one occasion. Editing a routine must never rewrite completed sessions. A typical routine combines warm-up, technique, reading, repertoire and reflection. The editor supports adding, removing and reordering blocks with accessible buttons, setting objectives and scheduling the result. Duplication and drag ordering can follow later.

Library cards identify objectives, prerequisites, supported contexts and suggested duration; difficulty is displayed only when reviewed. Suggestions can use local rules and personal goals without hosted AI.

### 5.1. Bundled repertoire catalogue: Exercises_Library

The [v2 index](../Exercises_Library/library.json) is the runtime entry point. Its enabled manifests provide 563 canonical works and 55 candidate piano editions (618 records); optional OpenScore accompaniment adds 1,462 editions. Catalogue identity, located assets, local files, musical analysis, suitability and edition rights are separate states. A clean installation has zero playable scores from this package.

Every record stays accessible. The default catalogue presents actual downloadable or local scores; reference-only works live in a separate Research view. A bibliographic reference is not advertised as an available exercise. English editorial labels update stable v2 IDs without replacing progress or human reviews. Search by composer, collection, title or number; distinguish unknown level and use only measured signatures/leaps as musical filters. The separate Mutopia PDF catalogue now contains ten editions, preserving the original two IDs and their download behavior.

The legacy [v1 manifest](../Exercises_Library/sightreader_public_domain_manifest_v1.json) remains historical input and is not imported with v2. Its key-based Chaulieu IDs have no verified mapping to ordinal v2 IDs. Preserve existing progress under those IDs and report it as unmapped instead of inventing a correspondence.

Acquired MusicXML/MXL can be validated, analyzed and rendered offline. Personal full-score practice requires a valid score and identified or explicitly selected parts, with rendering checked when opened. It does not require a separate preview or a licensing approval form from the pianist. Editorial distribution and excerpt readiness retain their separate reviews; explicit suitability rejection still blocks the affected selection. Excerpt proposals use independent analysis and reviewed written-order boundaries. Source-wide claims are not universal permission for arrangements, and no rights approval is inferred from enabling local practice. No arbitrary difficulty, hand assignment or estimated tonality is inferred from filenames, staff numbers or exercise order. See the [implemented pipeline and limits](repertoire-integration.md).

### 5.2. Scale or mode practice

Technique, Reading, Learn and routine editing share the same musical-target selector. Preserve the target when arriving from a lesson. Start with tonic and scale/mode, objective and content type; advanced settings include hands/clef, range, rhythm, duration, tempo and aids. Future filters can cover leaps, chords, chromaticism, modulation, reviewed difficulty and downloaded-only material.

Natural, harmonic and melodic minor are different targets. Where relevant, specify ascending/descending direction. Store tonic and mode separately from signature: C major and A minor share a signature but are distinct; a Dorian classification requires musical context, not just a matching pitch collection. A generic “minor” label does not establish which minor variant a passage practises.

Show signature and scale notes as a preview. Generate variants locally within the selected restrictions, before or between attempts, never by replacing notes while the user plays. Technical scale patterns and reading exercises based on that scale are distinct activities. Characteristic notes and alterations should serve the lesson's purpose.

### 5.3. Lesson and piece selection

A lesson presents an objective, short explanation, proposed blocks and approximate duration, with start, adapt, save-as-routine and schedule actions. Snapshot block content when practice starts.

| Stage | Without a piano | With piano or MIDI |
|---|---|---|
| Understand | Explanation and a signature/interval question | Same concept, with optional musical demonstration |
| Prepare | Identify the target notes with explicit responses | Play a scale or pattern with selected hands |
| Read | Generated exercise with required on-screen input | Read/play the exercise; measure only supported MIDI references |
| Apply | Compatible interactive passage or conceptual questions | Practise a reviewed related piece/passage |
| Review | Measured responses and what to repeat | Reflection and available manual/MIDI results |

For example, a G-major lesson can introduce F-sharp, practise a pattern, read generated material and apply it in a reviewed tonal piece. The Chaulieu entry is only a candidate until bars and difficulty are analysed. A Dorian lesson remains useful with generated content when no reviewed piece exists.

Piece cards should show title, composer, tonal target, extent, reviewed difficulty, format and local availability, plus a supported reason for their relationship to the lesson. Unknown analysis must not be presented as a lack of difficulty. A passage gets its own analysis; whole-work range and difficulty do not automatically describe it. Preserve the signature, accidentals and instructions active at the passage start.

Preview actions can include use in lesson, download, add to repertoire and inspect source. When no material satisfies the filters, offer generation or explicit filter changes. Never silently change scale or difficulty. Mark related material that exceeds restrictions. Any future transposition is an identified adaptation linked to the original.

### 5.4. Downloads and offline material

| Available resource | Supported capability |
|---|---|
| Source/landing-page metadata | Consult the source; no download button until an accessible reviewed file exists. |
| PDF | View and practise with manual tracking. The PDF alone supplies no note reference for evaluation. |
| Validated compatible MusicXML/MXL | Validated partwise analysis, independent excerpt review, offline rendering and personal manual practice. General MIDI evaluation remains future work. |
| Locally generated exercise | Immediate offline practice within the chosen constraints. |

Review rights for the exact file/edition and applicable territory; a composer's age or collection label is insufficient. Retain source, edition, stated conditions, evidence date, downloaded file hash and future parser version. Downloading a file and adding a work to personal repertoire are separate actions. Removing a file keeps the work and practice history.

Catalog revisions ship inside new app versions initially. There is no distribution backend and no requirement to redownload material on every upgrade. Stable item IDs and per-edition revisions detect updates to existing downloads; new entries are browseable. Show update availability and let the user choose what to obtain. Previously stored content and generated practice remain available even when an optional download is pending.

Provide a persistent queue, per-file byte/progress status, completion, waiting-for-Wi-Fi, pause, failure and retry. Default to unmetered Wi-Fi; explicitly allow cellular/other networks in download settings. Enforce that policy during the transfer, including network changes. When a browser cannot identify the network, explain the limitation and wait for explicit permission to use any network.

First release: serial foreground downloads, pausing on backgrounding and restarting interrupted transfers from zero. Avoid claiming byte-range resume or background downloading. Validate the PDF before atomically replacing asset and metadata, retaining the old edition on failure. A local SHA-256 identifies content but is not independent proof of publisher authenticity.

Phone filters collapse above the list; details can open separately. Tablets may later show list and preview side by side. Download controls must not displace a live score.

## 6. Practice without a piano

Use a compact header, central score/question and mandatory response area. Reserve a feedback region separate from accuracy statistics. Aids such as names, fingering and keyboard guidance use stable slots. Preserve the existing tempo-driven reading and minimum key size/zoom behaviour.

Save aids alongside measured results: reading with visible names is not equivalent to reading unaided. Scale/mode targets stay visible; generated notes remain playable within the selected input range without changing their spelling. Unsupported chords/ranges require another passage or an explicit adaptation. A PDF with no response activity must not be presented as interactive reading.

## 7. Practice with a piano

Prioritise the score, instructions and passage objective. Hide the virtual keyboard by default. Provide a reference tempo, timer, metronome, pause and explicit next/finish actions. Repeating or extending a block should remain under the user's control. An optional keyboard is a reference, not a source of invented evaluation.

Tracking consists of time, blocks, declared targets and reflection. It is not an automatic assessment of performance. In fixed-page presentation, provide large previous/next controls and a page/bar indicator. Manual browsing pauses an evaluated generated exercise without converting skipped notes into errors. Resuming is explicit. PDF page changes preserve zoom and framing. Reading mode supports Kindle-style turns through brief edge taps: right advances, left returns. The zones occupy only 3.5% of the visible page width, capped at 18 CSS pixels, including while zoomed. Holds, drags, multiple fingers and annotation tools disable these gestures. Accessible page buttons remain available in every tool and zoom level.

PDF practice prioritises the largest possible score surface. Hide app headers/navigation and Android system bars, with a browser fullscreen option where supported. Combine time, pause/resume, page navigation and paused tools in one movable floating widget. While running, collapse it to essential reading controls and disable annotation and exit actions. Back pauses first; leaving is a separate paused action. Restore system bars on exit. In pause, allow zoom up to 300%, panning and an explicit Save framing action to hide unnecessary printed title/footer margins. Keep a separate local default per PDF and orientation, with full-page reset; do not modify or destructively crop the PDF.

## 8. MIDI practice

Use the piano layout plus stable connection status and instrument name. When a reference is compatible, show note/timing results and tolerance; otherwise provide content/timing/manual reflection. MIDI does not grade musicality, posture or tone.

Connection loss freezes evaluation and keeps prior work. Offer reconnection, finish or continuation without evaluation. Store the context of each measured/manual section separately. An optional on-screen keyboard must not consume the main score area by default.

## 9. Saving and reviewing a session

Show elapsed practice excluding pauses, completed blocks, practised works/passages and results with their measurement source. Ask for an optional five-face feeling rating (very difficult through very good), comments/annotations, the final editable session name and next steps. Piece selection can be adjusted at save time. Use progressive disclosure for additional details.

Save and Save-and-plan-next complete the review. Activity is checkpointed during practice; this screen is not the only persistence point. Partial sessions and past manual entries remain useful and are labelled. Historical details allow editing declared feedback while measured results retain their provenance.

Lessons retain the musical target and distinguish generated content from repertoire. Later practice can reuse the passage or choose another compatible example. Manual free/repertoire timers may continue with the screen off if explicitly chosen. Interactive exercises pause when hidden. Recover interrupted sessions paused rather than counting closed-app hours.

## 10. Calendar

Open in a weekly agenda inspired by the user-provided Runna screenshots: two adjacent week sections, each with its date range, actual/planned minutes and seven day rows. A narrow left gutter holds weekday/date; compact activity cards and an Add action sit beside it. Highlight today's date and distinguish activities with restrained colour strips. Keep written completion states and feelings, not colour alone. Previous/next week and return-to-current-week controls stay available. A month toggle provides a compact grid and selected-day agenda.

Completing a plan links its result: show planned versus actual minutes without duplicate activities. Unplanned practice appears on its actual date. Future linking of a past session to a plan should preserve both identities. Reprogramme or leave a missed plan pending without punitive streak messaging.

The reference is **Runna**, as clarified by the user, rather than Runnea. Use its weekly hierarchy and Today overview as structural inspiration while preserving this app's dark controls and ink-on-paper score. No promotional cards, social features, external weather services or Runna assets are required. The [official Runna guide](https://support.runna.com/es/articles/10473504-tu-guia-rapida-para-usar-la-app-runna) also describes daily practice access and a weekly overview.

## 11. Plans, events and reminders

Plan with date, optional time, routine/blocks, context and optional reminder. The calendar supports individual appointments and finite weekly series. Editing a pending occurrence opens its structured block editor and can apply a saved routine without modifying that routine. Review date, time and reminders before committing. Drag the calendar grip onto a day to reschedule one occurrence; support touch, mouse, keyboard and scrolling near viewport edges. Preserve the appointment ID, time, blocks and recurrence; refresh reminders only after a successful save. Active and completed sessions cannot be moved or rewritten. Editing reschedules one occurrence; a separate confirmed action cancels this and future pending occurrences while preserving history. Preserve lesson targets and chosen materials in plans, and indicate missing optional files.

Provide a basic **Organise your week** assistant in the first release. On one form, choose a week, practice weekdays and minutes per session, with an optional tutor-class day/time. Use simple manual piano practice or on-screen reading according to context, or reuse a saved routine with its original blocks, duration and context. Preview the actual dates and total practice time before saving. Tutor classes are separate calendar events and do not count as completed practice. Skip past dates, dates already containing practice and duplicate classes, explaining the omissions. Choose one week or repeat weekly for 4, 8, 12, 26 or 52 weeks. Preview the end date and aggregate appointment counts. Saving materializes those dates locally with separate practice and tutor series IDs; it never overwrites existing appointments or extends a series beyond its reviewed end date. Individual appointments can then be rescheduled and reminders enabled separately.

Defer goal-based planning: no automatic programme for an audition, repertoire target, specific passages or readiness deadline in this release. That future planner may combine available days, tutor feedback, works and passage priorities into proposals for review. The basic weekly assistant is scheduling help, not an adaptive teaching or readiness assessment system.

Events include title, type, date/time, place, notes, linked works and a reminder. Local notifications are opt-in. Request OS permission when the user first asks for reminders, expose permission state and keep the calendar functional when denied. Android may delay inexact reminders for battery management; do not promise alarm-clock precision. Reschedule future reminders after reboot/app update, and cancel changed/deleted plans' old reminders.

## 12. Concert and audition preparation

Event detail shows the date/countdown, linked repertoire and manual preparation milestones: first reading, difficult passages, complete run-through and simulated performance. Memory work is optional where appropriate. Session history stays attached to each work.

The first release uses manual steps. A future goal-based preparation planner can propose dated milestones and musical blocks for review; this is separate from the basic weekly scheduling assistant. Accumulated minutes must never imply guaranteed readiness.

## 13. Library and Profile responsibilities

Library/Biblioteca replaces My piano, as explicitly selected by the product owner. It manages current works and their manual stages, scores, catalogue material and reusable routines. Profile owns progress, saved practice history, practice totals and future motivational summaries such as streaks. The October navigation pass moves the relevant entry points; it does not redesign either destination in depth or promise new metrics. Those screens will receive their own objective, evidence and design review.

Make useful data visible before a click where it helps the screen's objective. Clicking should open detail rather than reveal the first useful fact; avoid turning either destination into an unexplained grid of links.

Name, experience and goals are optional local preferences, not a required profile or public account. Avoid a dashboard made entirely of navigation cards.

## 14. Progress

Track time by activity, days/sessions, planned versus completed work, scales/modes practised and work stages. The first version provides weekly summaries, recent history and a 30-day detail; custom periods and comparable exercise trends can follow.

There is no overall “pianist score.” Separate MIDI, screen answers, manual records and self-assessment. Any comparison must consider content familiarity, difficulty, tempo, tolerance and aids. Time in G major is evidence of practice, not proof of mastery. Repeating a known passage differs from reading a new one. Suggestions can propose another compatible passage without silently changing the goal. No social comparison or obligatory daily streak is needed.

## 15. Repertoire and work detail

Stages are To start, Studying, Consolidating, Maintenance and Archived; the user sets them. Cards identify title/composer, stage and musical target. Future search/filter and last-practice summaries can build on the same data.

A work holds basic details, optional PDF/reference, tonal target, source, current passage/goal, reference tempo, personal notes and linked session history. Practice and Plan are direct actions. Start with a title; an attachment is optional. PDF viewing does not imply note recognition or MIDI compatibility.

PDF selection must be visible directly at the top of Add work, with the same review flow for Import PDF and attachments to existing works. Validate the selected local file before creating the work or attachment. Suggest title, composer and printed numeric tempo from the first-page header, using embedded text or basic local OCR for scans. Keep suggestions editable, protect existing/manual input and allow detection to be skipped. Retain the printed tempo mark for checking the pulse figure; do not invent BPM from verbal directions or silently choose a value from a range. Collapse additional study fields. Save the work and PDF together only after review; cancellation must leave no partial work. Bundle recognition resources so there is no upload or recurring infrastructure cost.

The same score opens for study and timed practice, with a pause/resume control inside the viewer. A foreground PDF does not pause manual practice; keeping time while the app itself is hidden remains an explicit preference.

The shared Android/browser score editor offers text, lines, arrows, circles/ovals, rectangles, freehand pen, underlining and translucent highlighting. Present tools as visual buttons and colours as a basic palette rather than dropdown lists. Direct 1–5 buttons stamp fingering on a touched note without opening a keyboard. Start in reading mode; annotation requires pause. Include text editing, individual deletion, undo/redo and automatic local saving. The single floating widget can be moved or collapsed to uncover the music, without resizing the score. Preserve page-relative positions across phone/tablet sizes, portrait/landscape, zoom and PDF page rotations. Two fingers pan/zoom while annotating without leaving marks or triggering page turns.

Store annotations and saved framing with the exact local PDF edition, leaving the source file unchanged. Notebook export/restore includes both; standalone PDF export with embedded marks is deferred. On catalog updates, keep an annotated edition accessible and store changed pages as a separate asset; never apply old marks or framing to a different score. Identical PDF bytes preserve both across metadata updates. Storage failures must be visible and allow retry before leaving. Bundle PDF rendering resources with the app so reading and annotation stay offline and incur no central infrastructure costs.

Works discovered through lessons retain their provenance. Future passage entities can serve several objectives with explicit reasons and local tonal analysis, while adaptations stay linked to the original. Do not infer a mastery percentage from time.

## 16. Learn

Short lessons connect explanations, musical examples and a related activity. Initial scale/mode lessons follow understand → prepare → read → apply → review as content permits. The first implementation includes theory, technique and reading; reviewed repertoire is an optional related resource rather than a promised piece for every target.

Future concepts include rhythm, intervals and chord construction. Bundled text, examples and local generation avoid hosted video/AI costs. A full course requires gradual editorial work; empty categories do not constitute learning content.

## 17. Settings, first use and backups

Let the user practise immediately. Language, experience and usual context can be offered without compulsory onboarding. Group settings into practice/aids, notation/accessibility, MIDI, reminders, downloads and local data.

Backup is part of the first history-enabled release. Explain what is stored, when the last export happened and what it contains. System file selection lets the user choose a destination without an app-owned cloud service. Include attachments explicitly. Optional automatic backup writes a separate file per device through Google Drive on Android or a writable Files provider on iOS, including iCloud Drive and Google Drive. Before manual restoration, show counts and explain replacement; disconnect automatic backup before replacing local data. Users may instead choose a shared notebook: select the same provider file on both devices, merge independent changes by stable IDs, and explicitly resolve incompatible values. Synchronization is foreground-only; a private local recovery copy precedes incoming replacement. Provider upload and network policy are distinct from SPino's foreground file writes; see [implementation details](cloud-backup.md).

## 18. Device adaptation

| Viewport | Navigation and overview | Practice | Calendar |
|---|---|---|---|
| Phone portrait | Single column, bottom navigation | Score above touch input, fixed controls, separate feedback | Compact month/week grid and day agenda |
| Phone landscape | Compact side navigation; setup columns | Wider staff, restrained toolbars, optional lower keyboard | Grid/day content with reachable scrolling |
| Tablet portrait | Side navigation, appropriate panels | More score height, fixed page where useful | Larger grid and day detail |
| Tablet landscape | Side navigation and multiple content columns | Wide score or page; orientation suggestion where useful | Grid/agenda with space for details |

Use the available viewport, including split-screen, not device-model detection. Large text, long titles and system insets must not hide essential controls. Help opens a panel or reserved area rather than pushing the active score. Orientation advice must remain brief and optional.

## 19. Local architecture and costs

Core entities: preferences, lesson/target, exercise block, routine, plan, session/result, work/passage, event/milestone, content source, attachment and download job. Plans link completed sessions; sessions can involve multiple works/activities; events can involve several works. Preserve context/configuration/measurement source on each result. Editing a routine or catalog entry must not rewrite history.

Retain actual generated notes or reproducible content with generator identity, and retain file/edition and passage provenance for external resources. Unknown analysis stays unknown. The seed manifest's catalog/analysis distinction is useful without implying that its complete future schema has been implemented.

Android's core launches offline: generation, practice, sessions, repertoire, calendar, local reminders, statistics and bundled content. No login, application API, remote analytics, hosted AI or push server is required. Optional future APIs must be external and openly accessible, reviewed for terms, limits and continuity, and unnecessary for already-local practice. The initial downloads use direct source files rather than claiming that a discovery API exists.

Catalog preparation and review happen with app releases. Download permitted files directly from approved providers; do not introduce a proxy/storage backend. The economic goal is no recurring central infrastructure, while acknowledging distribution, maintenance and editorial work. The development web build still requires its local server and is not an offline-installed PWA.

## 20. Required states

| Situation | Product response |
|---|---|
| No history or today's plan | Offer a short practice and explain future summaries. |
| Missed or unfinished practice | Resume, reschedule, save partial or explicitly discard. |
| No piano / lost MIDI | Offer compatible interaction or pause and switch context explicitly. |
| Process interruption | Recover the last checkpoint paused without closed-app time. |
| Offline / notifications denied | Keep the core and calendar useful; defer only network work/alerts. |
| PDF or unsupported reference | Show its real manual-viewing capability, not fabricated evaluation. |
| No reviewed piece for a target | Offer generation or explicit filter changes. |
| Unknown difficulty/rights | Keep unknown status visible and avoid unsupported promises. |
| New bundled catalog revision | Show new/updated resources without compulsory downloads. |
| Interrupted transfer / network change | Pause or wait according to policy; retain the old offline edition. |
| Deleted score / new device | Keep history; reattach/download or restore an exported backup. |

## 21. First version and later scope

The first version should close the whole use cycle with a small set of useful modalities. It includes Today/Practice/Calendar/Library and the Profile avatar, existing reading in the three contexts, manual piano practice, simple blocks/routines, local scale/mode lessons, a small reviewed PDF selection, feedback, a basic weekly scheduling assistant, individual plans/events, reminders, repertoire and export/restore.

Later work can add rhythm/ear activities, wider modal coverage, structured score import/evaluation, larger reviewed catalogs, passage entities, recurring plans, external calendar exchange, advanced comparisons, richer local suggestions and profile/history merging. Each addition must preserve offline usefulness and truthful measurement.

The complete enabled v2 catalogue is imported without requiring score downloads. PDF-to-note transcription is not automatic. No downloadable repertoire is promised for every lesson. Content coverage must be reviewed before publication.

## 22. End-to-end example

A pianist adds an audition six weeks away and links two works. They plan technique and repertoire sessions. On a day without the instrument they complete five minutes of on-screen reading, recorded as reading rather than rehearsal of those works.

At the piano they start a saved routine, work the chosen passage with a metronome, rate the session, note a coordination issue and plan the next attempt. Compatible MIDI adds measured responses; manual playing still produces a useful diary.

For a G-major work they review the signature, play a pattern, read generated content and download a reviewed related piece once. Later they can use it offline or try another compatible passage while retaining the same objective and prior history. Library keeps the material accessible, Today shows upcoming commitments, and Profile provides practice history without a hosted account.

## 23. Decisions and validation

Confirmed in the usability review: preserve dark/ink styling, simplify common setup, name sessions at save time, expose routines directly, use a recognisable calendar and data-first dashboard, include subjective feedback, manage optional downloads/networks, support reminders and easy page changes, and write repository prose/comments in English.

Still open for release: final name/trademark assessment, production signing/store identity, physical USB/BLE acceptance, native backup/notification tests and real Wi-Fi/cellular transition testing. Future audience depth, recurring plans and broader editorial coverage remain product decisions rather than hidden launch promises.

## Profile and practice defaults

Profile is reached through the prominent, unlabeled navigation avatar. It groups personal progress/history with preferences, cloud backup/synchronization and separate defaults for reading and technique; its detailed redesign follows its own screen review. New sessions inherit hands, note range, tempo and reading rhythm; preparation allows per-session overrides without rewriting those defaults or existing routines. Two-hand reading is available with a physical piano or MIDI and always displays the grand staff, including on phones. Screen-input practice remains single-hand. The provider owns account authentication; the profile shows the selected backup file and connection state.
