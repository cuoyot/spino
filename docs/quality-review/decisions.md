# Review decisions and consistency checks

Status is explicit: **proposed**, **accepted**, **implemented**, **verified**, **superseded** or **deferred**. Retain old IDs and link replacement decisions. An accepted direction is not a claim that every affected screen has been implemented or verified.

## D-001 — Review each screen before declaring the release ready

- Status: **accepted process**, requested by the product owner on 2026-10-01.
- Agreement: start with Today; define each screen's purpose; compare phone/tablet portrait/landscape snapshots; discuss refinements; follow every menu, exercise and child view; carry decisions across later and already reviewed screens; build an embeddable user manual alongside the work.
- Applies to: all IDs in [screen inventory](screen-inventory.md), all shared components and the manual.
- Implementation: review workspace, stable surface inventory, immutable baseline captures and draft manual source created.
- Verification: no application screen is accepted merely because the review structure exists. Today's presented compact layout is explicitly accepted; its remaining coverage and child reviews remain tracked.

## D-002 — Prioritize the next useful practice action on Today

- Status: **implemented, functionally verified and visually accepted in the presented scope** on 2026-10-01. The first response selected practice-first; the follow-up accepted the conclusions/proposals and clarified the navigation in D-003. After the compact comparison, the owner explicitly confirmed “me gusta, aprobar y continuar”. This accepts the rendered hierarchy without closing untouched child flows or release gates.
- Accepted objective: let the pianist understand what to practise now and start or resume with minimal effort; use the current week and commitments as context.
- Accepted ordering: unfinished session first; otherwise the next planned practice; otherwise choose a practice activity. Keep alternatives available without competing equally with the main action. Keep weekly context and the shared header compact, especially in landscape. Today explains what is due and encourages practice; the new Practice destination provides the activity/routine chooser.
- Evidence: in all three landscape-phone fixtures, the session's Start/Resume or empty-state Start action is below the first viewport. In the populated fixture, activity and routine shortcuts are below the initial viewport at all four sizes.
- Alternatives considered and not selected: make the daily agenda dominant; or prioritize progress summary and then practice choices.
- Current surfaces: TODAY-01, TODAY-03, TODAY-04; inspect CAL-05 and PRACTICE-01 before deciding common start/resume semantics. Components: C-AGENDA, C-PRACTICE, C-NAV, C-EMPTY.
- Previously closed reviews affected: none yet. Future checks: preserve card meaning in Calendar and the renamed Library; keep the main action usable with long labels and enlarged text.
- Manual impact: Today chapter describes the checked hierarchy, Practice entry, Calendar/event date context and Profile progress entry. Its index records visual acceptance; the chapter remains editorially draft while behavior/wording review and remaining coverage continue.
- Implementation scope: contextual main action, compact week/header and explicit today date when adding an event or opening Calendar from Today. Retain existing session start/resume semantics while their child views await review. Compare against the immutable baseline using the same synthetic fixtures; do not silently treat the agreed direction as verified behavior.
- Verification: [final follow-up evidence](captures/today/2026-10-01-practice-navigation-02/index.html) has all 12 primary actions visible, no horizontal page overflow or runtime errors, corrected event date and 44px-wide week targets at 320px. See [Today verification](today.md#navigation-refinement-verification) for the test/native scope and remaining gates.

## D-003 — Separate today's agenda, practice, planning and the library

- Status: **implemented, functionally verified and visually accepted in the presented scope** on 2026-10-01, including the owner's later “me gusta, aprobar y continuar” response to the compact result. The product owner selected **Library / Biblioteca** in the naming response. This accepts the navigation/access changes, not the detailed design of each destination.
- Agreement: main destinations are Today, Practice, Calendar and the renamed My piano section. Today shows what is due and encourages action; Practice is the quick path to playing; Calendar plans the schedule; Library manages repertoire, scores, catalogue and routines. Use a more prominent Profile avatar without a visible text label, retaining its accessible name.
- MIDI: remove it as a peer navigation destination. Keep a compact connection/activity utility resembling a device status indicator, with access to instrument settings. Preserve accessible state descriptions and the score/practice activity indicators; compact presentation must not imply that a connected instrument has produced input.
- Profile: progress, practice totals, streaks and motivational information belong here. This pass only changes existing access/grouping where necessary. Detailed progress/Profile design and any new streak behavior wait for their later review; do not fabricate metrics or broaden this pass into those screens.
- Evidence/rationale: the owner identified wasted landscape header space, excessive MIDI prominence, a weak labeled Profile entry and a mismatch between the My piano name and its content. A persistent Practice entry makes quick practice independent of scrolling through Today's agenda.
- Scope: C-NAV across TODAY, CAL, PREP, PRACTICE, PIANO, REP, CAT, PROFILE, MIDI and SYSTEM-02/03; C-MIDI status rendering; new HUB-01 Practice destination. Keep existing review IDs and internal routes/stable notebook identifiers where possible; no data migration is implied by relabeling.
- Previously closed reviews affected: none. TODAY-01 baseline is historical, with comparable follow-up evidence linked above. Other destinations remain unreviewed; shared-menu smoke checks do not accept their contents.
- Required checks: four viewport navigation/primary-action reachability; landscape header height; active destination on child routes; icon-only Profile accessible name and touch area; MIDI connection versus activity; nested Back behavior; English and Spanish labels. Native bars, real MIDI and iOS remain separate evidence gates.
- Verification: 210 app tests passed with one optional network skip. Android smoke verified the four labels, actual Back from Practice to Today, the visible 44px MIDI utility and Profile/Library entry points; notebook and 55 asset hashes remained unchanged. Native four-orientation, physical MIDI and iOS acceptance remain separate.
- Documentation: product navigation and Today instructions reconciled with checked behavior. Future progress design remains separate from implemented capabilities.

## D-004 — Try a more compact Today and Practice entry

- Status: **implemented, scoped verification passed and presented compact result visually accepted** on 2026-10-01. The owner first requested smaller widgets/buttons, then explicitly approved the result: “me gusta, aprobar y continuar”. Compact Today is the visual reference for subsequent reviews; this does not close untouched Practice or other destination flows.
- Direction: reduce card padding, gaps, oversized type and unnecessarily wide buttons. Preserve D-002's contextual main action, D-003's navigation roles, all visible data/actions and touch areas of at least 44px. Do not reduce the interface by hiding useful information or shrinking controls below that working convention.
- Scope: TODAY-01/03/05 and consistent compact treatment in HUB-01 through scoped rules in `src/companion/app.css`. Shared focus: C-AGENDA, C-PRACTICE and C-EMPTY. C-NAV geometry is unchanged. Calendar, Library, Profile and practice/score controls are not redesigned in this experiment.
- Consistency: preserve earlier captures and use the accepted compact Today as the reference. Recheck its states and four layouts whenever shared components change. Apply the density direction to later screens after reviewing their content and input needs; no blanket redesign is implied.
- Data and behavior: no notebook migration, new settings, changed session semantics or content removal. No translation or manual behavior change is expected.
- Evidence: [compact gallery](captures/today/2026-10-01-compact/index.html), 21 frames using the existing typical, empty and pending fixtures. Compare with [the navigation refinement](captures/today/2026-10-01-practice-navigation-02/index.html). All 12 primary actions remain visible; no page-width overflow or runtime errors. The portrait-phone populated page is 248px shorter, its primary button is 127px wide instead of 316px and remains 44px high. Week targets at 320px remain 44px wide.
- Verification: nine focused browser tests passed, covering Today, Calendar actions, navigation, notebook layout and localization. Production web and Android APK builds passed. The installed Android compact-style/navigation smoke check passed, preserving notebook and 55 asset hashes. See [compact verification](today.md#compact-verification). Visual acceptance is recorded above; broader accessibility/native-device gates remain open.
- Manual: behavior is unchanged. Retain chapter text and the checked compact evidence; record explicit visual acceptance in the index without advancing the chapter beyond draft before the behavior/wording review and outstanding coverage close.

## D-005 — Adapt the current session without losing performed work

- Status: **direction accepted and implementation in verification**, 2026-10-01. The owner agreed with the session analysis and added live duration changes, moving blocks up/down, removal and addition. Visual acceptance of the resulting layout remains separate.
- Objective: identify the current block and practice state, then start/resume, advance, adapt or finish without uncertainty or losing work. A compact current-block panel leads; separate block/session clocks and an editable sequence provide context.
- Editing: change suggested minutes inline; use accessible up/down controls; remove a remaining block; add reading, technique, repertoire or free practice when compatible with the session context. Changes pause practice. Completed blocks stay fixed; retain at least one pending block, or use Finish session. Changes belong to the active session, not its source routine or planned structure.
- Continuity: postponing a started block retains its clock, answers and generated-score snapshot under its stable ID. Returning to it restores those values. Removing a started block preserves performed work in history results; finalizing early also retains postponed work. Suggestions never truncate elapsed time or automatically advance practice.
- Persistence: save an edited clone before replacing live state. Failed edits/feedback saves leave the paused session available for retry. Finish opens feedback without prematurely exhausting the current block; Keep practising can return to it.
- Scope: PRACTICE-01 and the confirmed PRACTICE-06 save/cancel defects; C-PRACTICE, C-DURATION, C-FEEDBACK. Today remains the accepted visual reference and its Start/Resume route remains unchanged. Score controls, preparation, Calendar structures and Library routines are not redesigned here. Existing quick-routine auto-entry remains tracked separately under SESSION-F02.
- Data: additive optional suspended-runtime field, no migration or ID remapping. Preserve notebook, source blocks, PDF assets and annotations. Local backups validate and restore suspended progress.
- Manual/locale: update the session chapter with verified behavior; concise English base and Spanish labels. Keep the chapter draft until its remaining child reviews are complete.
- Verification: attach the new four-layout gallery and regression/native results in [session review](session.md). Do not treat implementation as visual or release-wide approval.

## Questions still separate from D-002

| Question | Initial evidence | Affected surfaces | Status |
| --- | --- | --- | --- |
| Should actions entered from Today default their date to today rather than the last calendar selection? | TODAY-F04 | TODAY-05, CAL-03, CAL-06, PREP-01, PREP-03 | Accepted for Today's Add event under D-002; verify Calendar retains its selected-day context |
| What does Start/Resume mean consistently for planned, ad-hoc and routine practice? | TODAY-F05/F06 | TODAY-02/03/04, CAL-05, PRACTICE-01, PIANO routine actions | Open |
| What should date markers encode: activity, completion, or both? | TODAY-F07 | TODAY-01, CAL-01/02, C-AGENDA | Open |
| How should weekly progress be labeled, and where should it open? | TODAY-F08 | TODAY-01, PIANO progress surfaces, PROFILE-01, C-AGENDA | Weekly totals moved to Profile → Your progress (D-003); Today retains calendar context; detailed metrics design deferred |
| Should Today offer recovery of missed planned practices? | TODAY-F11 | TODAY-01, CAL-01/02/05 | Deferred for discussion; no scope commitment |

## Decision entry template

For each new decision record: ID/title/date, exact accepted behavior, evidence/rationale, exceptions, current and previously reviewed affected screens, shared components, migration/data impact, implementation references, manual/translation impact, verification evidence and closure state. Avoid recording a suggestion or a preselected answer as an accepted decision.
