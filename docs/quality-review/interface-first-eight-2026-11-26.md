# First eight interface improvements — before/after review

Date: 26 November 2026. Status: **implemented and verified for beta 6.2.4-beta.2 / build130; publication authorized; physical-device acceptance remains open**.

The owner requested preparation of UX-01–08 from the [interface audit](interface-audit-2026-11-26.md), with a before/after comparison before creating a beta. The subsequent event-form refinement is explicit: use **only a repetition icon beside Time**, without visible button text; opening the options explains the function. The icon retains an accessible name and a selected treatment when repetition is enabled.

## Review entry

Open the [interactive before/after comparison](http://127.0.0.1:5378/). The eight numbered entries load the same synthetic notebook, date, language and viewport into the original beta and the prepared implementation. Phone/tablet portrait/landscape, both themes and five languages are selectable. Each side is an actual built app, not a visual mockup. Navigating the harness reseeds its disposable notebook deliberately.

Source base: `559c7949a0f180e36c826468daf59d2709b68f3c`, 6.2.4-beta.1 / versionCode 129. Prepared source is isolated in `/Users/migue/.codex/worktrees/interface-first-eight/spino`; the older dirty main checkout and other worktrees remain preserved. The release source additionally includes the later published App Store website link from `8e4ff745`. The new release is 6.2.4-beta.2 / Android versionCode 130.

## Prepared changes

| Proposal | Before | Prepared behavior | Comparison |
| --- | --- | --- | --- |
| UX-01 | Disabled warm-up fields occupy about 310 px in the phone fixture. | Off state is a 76 px row. Enabling reveals the retained settings after total duration. Fixed total and selected block identities remain intact. | [Warm-up](captures/interface/2026-11-26-first-eight-02/ux-01-before-after.png) |
| UX-02 | The month add action is named `+`; several playable piano keys are unnamed; list icon actions repeat generic names. | Add activity includes its date; piano keys expose pitch/octave using the selected naming and spelling; keyboard/assistive button activation plays one answer; catalogue and repertoire actions include original work titles. | [Calendar accessibility](captures/interface/2026-11-26-first-eight-02/ux-02-before-after.png); [keyboard DOM](captures/interface/2026-11-26-first-eight-02/keyboard-accessible-after.dom.txt) |
| UX-03 | A new collection reports that filters caused the empty result. | Empty collection, empty Trash and filtered miss have distinct copy; a filtered miss exposes the existing Clear filters action. | [Empty Library](captures/interface/2026-11-26-first-eight-02/ux-03-before-after.png) |
| UX-04 | Mobile, Without piano, On screen and MIDI piano vary between related views. | On screen / With piano are the common visible labels. An explicitly configured legacy MIDI context is With piano · MIDI. Stored context values and evaluation behavior are unchanged. | [Practice mode](captures/interface/2026-11-26-first-eight-02/ux-04-before-after.png) |
| UX-05 | Long-form Save/Cancel actions sit inside the scrolling fields. | Dialog fields scroll independently of a shared action footer. Errors stay with the actions; preparation keeps Start/options and local validation reachable. The new event form includes the owner's icon-only repetition refinement. | [Event form](captures/interface/2026-11-26-first-eight-02/ux-05-before-after.png) |
| UX-06 | A second appointment appears only as a narrow card fragment on a phone. | Multi-entry week rows show a quiet count and horizontal-scroll cue. The original strip and shared saved-session cards are retained. The count adds a small line to busy rows; this composition remains for owner review. | [Busy Calendar](captures/interface/2026-11-26-first-eight-02/ux-06-before-after.png) |
| UX-07 | Past weekdays remain checked although the proposal excludes them. | Unavailable past weekdays are disabled and visibly unselected for one week. Count/minutes appear beside the selection. Choosing a recurring series restores requested weekdays with future occurrences; returning to one week omits only unavailable dates. | [Weekly planning](captures/interface/2026-11-26-first-eight-02/ux-07-before-after.png) |
| UX-08 | A disconnected icon tap tries reconnecting and can instruct the user to hold for settings. | First-time disconnected and keyboard activation open Instrument directly. A remembered native device retains its tap-to-reconnect shortcut; failed reconnection opens settings. Hold/context-menu behavior remains available. | [Instrument entry](captures/interface/2026-11-26-first-eight-02/ux-08-before-after.png) |

No per-screen saved-session renderer was introduced. The shared card's markup/styles and contextual notes/passages/plan fields remain unchanged. The common mode wording naturally reaches its callers. Planned and active practice retain their own controls.

## Icon-only repetitions

In New event, the repeat icon sits in the Time row with a 44×44 px target. There is no visible label on the icon. Its accessible name/title is localized in all five languages.

Pressing it selects Every week and opens the frequency/end-date controls. The icon highlights while a frequency is active. Closing the panel keeps the choice. Choosing Does not repeat removes it and disables recurrence fields so they are omitted from saving. The existing daily, weekly, fortnightly, monthly/yearly and optional inclusive end-date behavior is retained.

Editing an existing recurring occurrence keeps the current appointment-only scope and series explanation; no new series-editing behavior or notebook migration is introduced.

## Verification

- Production Vite build passes; `git diff --check` passes.
- Focused unit run: **42 passed / one failed** across 43 checks. The failing Today weekly-progress assertion expects the superseded compact daily layout. The same assertion fails on the untouched beta129 reference. Its baseline and final logs are retained; no clean-suite pass is claimed. New MIDI entry, weekday availability, pitch/octave naming, warm-up retention, repertoire selection, locale and event recurrence checks pass.
- [Final responsive matrix](captures/interface/2026-11-26-first-eight-02/responsive-matrix.json): **128 dimension-verified screenshots**, eight proposals × before/after × two themes × four layouts. No page-level horizontal overflow was measured in this matrix; every measured dialog action footer stays inside its viewport.
- [Language checks](captures/interface/2026-11-26-first-eight-02/locale-checks.json): 32 further phone frames cover English, Catalan, German and Hungarian; Spanish is covered by the main matrix. New repetition accessible labels resolve in all five languages.
- [Behavior checks](captures/interface/2026-11-26-first-eight-02/behavior-checks.json) cover warm-up on/off/on with retained five-minute setting and fixed total/focus; filtered-result recovery; one-week/recurring weekday selection; piano key names and Enter activation; MIDI keyboard entry; controlled save failure, retained title and successful duplicate-free retry; visible preparation validation; reduced-height forms; collapsed recurrence saving at 18:47 and retained occurrence-edit scope; and finish actions in portrait, landscape and a narrow phone.
- Additional 320×640 and 390×520 captures verify the repetition target and action reachability. Reduced browser height is **not** native soft-keyboard acceptance.

Evidence uses a dedicated local origin and per-version/scenario IndexedDB prefixes. No personal notebook, PDF, recording, annotation or cloud account is used. Normal form interactions are exercised against synthetic data. The fault-injection query belongs only to the review harness; it is not included in the production application.

## Scrollbars and release handoff

The exact layouts are presented for owner feedback. Native Android/iOS safe areas, OS keyboard/Back behavior, TalkBack/VoiceOver, physical USB/Bluetooth reconnection and broad shared-dialog regression remain separate acceptance gates. Browser MIDI denial is an environment limitation, not proof of native pairing failure.

The owner subsequently authorized publishing the completed beta while away. Horizontal practice-card scrollbars are hidden; page/dialog/form scrollbars are hidden on narrow or touch devices and thin/muted on desktop. Overflow and touch/trackpad/keyboard scrolling remain enabled. Scroll checks verify the strip moves with focus and the page moves with PageDown. Final After frames and language captures include this refinement; earlier frames remain in `interim-before-scrollbar-refinement`.

Android release/debug APK and signed AAB build successfully; all three contain identical 685 built web files. All 15 Android unit tests pass. Replacement installation on the existing emulator preserves eight original IndexedDB files byte-for-byte before launch, confirms version130 and foreground activity. This is installation/data-retention evidence, separate from synthetic responsive layout evidence and physical owner acceptance.

Publication status and exact commit/provider/public-download hashes are recorded in `docs/releases/6.2.4-beta.2-publication.json` once verified. Website beta distribution is requested; no production Play rollout is part of this delivery.
