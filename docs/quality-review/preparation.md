# Preparation and recording follow-up — 2026-10-15

The owner requests a clearly selected stand piece, a simpler horizontal selector with equal-size choices, one **Other pieces** entry for repertoire/catalogue discovery, and a fix for recording choices that remain visible after Android permission approval. This accepts the objectives; the implemented layout still awaits owner visual acceptance.

## Implemented preparation

PREP-01 uses equal 176 × 100 px cards in one horizontally scrolling row. The selected card has a theme-aware fill, accent border and checkmark; the full selected title appears below the row. Choosing updates the existing form without rebuilding it, retaining horizontal position and unrelated settings. Resizing reveals the selected card again.

**Other pieces** opens a searchable list of all non-trashed repertoire, including pieces off the stand. Search matches title/composer without accent sensitivity. The dialog contains **Search the full catalogue** and **Choose when practising**. The previous inline library search, duplicate piece select and duplicate catalogue links are removed from repertoire preparation. Generated-activity preparation retains its existing catalogue entry. Catalogue return and scheduled-practice selection preserve the draft, total duration, block IDs and warm-up choice.

[Responsive evidence](captures/preparation/2026-10-15-stand-other-pieces-04/verification.json) contains 20 light/dark captures across phone/tablet portrait/landscape and 320 px. The disposable fixture includes a long title, pieces off the stand and a trashed piece. Checks cover exact card sizes, visible selection after rotation, search, catalogue return, choose-later and unchanged repertoire records. This is responsive Chromium evidence, separate from native acceptance. Review origin: http://127.0.0.1:5196/ (`scripts/review/preview-preparation.mjs`).

## Recording repair

The installed Capacitor Android WebChromeClient requests both `RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS`, and denies the WebView request if either is ungranted. The app declared only the former. The manifest now includes the normal `MODIFY_AUDIO_SETTINGS` permission; granting microphone access alone could not fix the missing declaration. Android's [permission reference](https://developer.android.com/reference/android/Manifest.permission#MODIFY_AUDIO_SETTINGS) documents that permission.

The capture controller also invalidated a pending request on every hidden visibility event. Native permission dialogs can temporarily hide the WebView. Pending requests now survive that transition, wait for visibility before capture, and retain practice timing. Explicit Cancel/page exit invalidates the attempt and releases acquired or late-arriving tracks. Active recording still stops when the app backgrounds. Permission/start errors remain visible inside the recording panel so the modal score layer cannot obscure them.

PDF browser regression simulates a permission result delivered while hidden, then returns to visible capture and Stop/review. Existing PDF pause/edit/annotations/framing, local audio/video storage, save retry, device isolation and background-stop checks pass. Shared MEDIA-02 applies to repertoire, PDF and MusicXML callers. This does not assert physical-device microphone/camera quality or full native PDF rendering.

## Verification and next action

Production build passes. The main focused run passes 31 checks; catalogue planning and the additional language, timing, PDF Back and import checks also pass after updating catalogue navigation to the new entry. Source/build hashes and fixtures are retained with evidence. [Native verification](captures/multimedia/2026-10-15-native-permissions-07/README.md) confirms audio/video start, review and final Save with already-granted permissions in the repertoire session, without runtime errors. Fresh permission dialogs were also exercised. All 259 packaged web files match. The emulator's WebView 113 stalls during PDF initialization before listeners/rendering finish, so full native PDF acceptance remains open. Initial replacement retains seven original IndexedDB hashes; later runs also retain synthetic namespaces. The final activity is foreground on synthetic preparation. No version bump or public publication is included.

Next: owner reviews the opened responsive preparation and tests the replacement APK on the reported physical device. Existing native PDF rendering and physical capture acceptance remain separate from the permission repair.

## Authorized publication follow-up

After the local review above, the owner requested website publication. D-043 is included in Android 6.1.0-beta.2/build55, published from `1704af3` and tagged `v6.1.0-beta.2`. Final-version package, signature, 259 web-file hashes, replacement install/storage retention/foreground and all required checks pass. [Public verification](../releases/6.1.0-beta.2-publication.json) confirms the three language pages, manifest and APK bytes. The preceding same-version/local-only statements are historical. Physical PDF/capture and owner visual acceptance remain open.


## 2026-11-05 — Pending practice beta handoff

The owner reviewed the responsive pending-session snapshot and requested an APK and website delivery. Practice emphasizes Resume and disables/mutes alternative activity and routine controls while retaining navigation. Beta 6.2.1-beta.2 (114) packages this on beta 113 without overwriting concurrent work. Responsive and native installation evidence remain separate; physical-device acceptance remains open.


## 2026-11-09 — Practice block configuration, calendar position and precise timing

Accepted owner objectives: keep the visible calendar position during synchronization; put the activity selector at the beginning of each practice block; remove repertoire tempo from preparation and the overview; show an initially disabled, configurable warm-up block; preview scale notes without animation; eliminate interface-scheduled metronome jitter and regularize practice-clock display. The follow-up also requires the circular marker to be centered on the cardinal axes.

The implemented browser proposal offers Free, Hanon (exercise choice), Sight-reading and Scales (key/mode choice) with a warm-up duration. The optional block is materialized into the existing activity model, retaining the other blocks and their IDs. Scheduled practices retain the warm-up configuration; notebook defaults remain intact. New ordinary preparation starts without the optional block. The saved warm-up enable preference applies to new routines; minutes/exercise remain configuration defaults. Repertoire keeps its stored BPM for compatibility while omitting the control and overview value. The activity selector precedes all affected block content. Enabled warm-up minutes are included in the total-duration slider.

Calendar rerenders retain a visible-date anchor and its offset, including lazily loaded weeks. Incoming cards above that date no longer shift the viewport. Explicit range/mode changes retain their navigation behavior. No personal notebook, score or annotation is used or changed in validation.

Free and generated practice use the same packaged AudioWorklet processor. Beat synthesis and its sample grid run on the audio rendering thread; interface callbacks only paint indicators. Pause, stop, backgrounding, subdivisions, accents, volume and visual-only mode are covered. Practice clock digits use discrete compositor transform animations, with accessible text and persisted totals still sampled from authoritative elapsed time. PDF/MusicXML share that display. This implementation uses [the Web Audio rendering-thread model](https://www.w3.org/TR/webaudio/); it does not rely on a Node timer for audio precision.

[Responsive browser evidence](captures/preparation/2026-11-09-blocks-timing-01/README.md) covers phone/tablet portrait/landscape. The audio processor is checked against the ideal beat grid for 60 seconds at both 44.1 and 48 kHz, within half a sample with no accumulated drift. A browser stress test blocks the UI for 1.8 seconds and verifies uninterrupted audio-grid timestamps. Marker pixel centers deviate by at most 0.1 px from the relevant cardinal axis in the captured layouts. Existing PDF/MusicXML clock, pause/resume, scrolling, duration and synthetic cloud-adoption regressions pass. Layout acceptance and native/physical-device audio timing remain open. No APK, release or publication is included.


## 2026-11-09 — Warm-up first, fixed total and piano preview

Owner refinement supersedes the earlier placement: the optional warm-up comes immediately after Total duration, before context and practice blocks. Selecting it takes minutes from the practice blocks rather than extending the selected total; changing its duration reallocates the same total, and disabling it returns those minutes. Existing block IDs and musical settings remain intact. A minimum minute per block is retained.

When only Passage or goal remains, it is shown directly, without an exercise-options disclosure. Reading/technique keep the disclosure for their additional settings. The scale's overlapping note-name row is replaced by a static two-octave piano: actual scale pitches, including enharmonic spellings, are highlighted alongside the unchanged staff.

[Responsive verification](captures/preparation/2026-11-09-warmup-first-02/README.md) passes six focused unit checks and five browser checks, with both themes in phone/tablet portrait/landscape. The source/build hashes and isolated fixture references are retained there; earlier run 01 remains historical evidence. Functional direction is accepted; the exact layout still awaits owner review. No APK, native acceptance or publication.


2026-11-09 scale-degree follow-up: the owner explicitly selects Roman numerals I–VII alongside each highlighted piano note. The repeated upper tonic is I again. This is an accepted display preference; it does not introduce chord-quality analysis. Both the visible labels and the keyboard accessible name retain pitch spelling and degree. See preparation/2026-11-09-warmup-first-02. The usual chord-analysis convention is documented in [Open Music Theory](https://viva.pressbooks.pub/openmusictheory/chapter/roman-numerals/); the owner chose the Roman degree display deliberately.


## 2026-11-09 — Choose Mobile or piano before configuration

Owner-approved direction: changing setup must not insert dependent content above the selection, for any practice type. New practice now has a separate Mobile/With piano choice before its configuration. Repertoire and Free require piano; Reading/Technique support both. MIDI is detected at physical-practice start/reopen, without a third setup choice. Change returns to the first step, preserving the goal, total duration and block identities. The selected-mode summary precedes total duration; warm-up still follows the total. This supersedes the earlier inline context selector.

All four types, mode transitions, fixed totals, retained goals and automatic MIDI are covered by the dedicated browser regression. Physical/native timing checks and beta122 publication are tracked in release validation.


## 2026-11-10 — Select multiple repertoire pieces without building blocks

Accepted owner objective: choose total time, optional warm-up and several stand pieces directly, with access to repertoire search. Implemented source proposal replaces ordinary repertoire setup with a multiple-selection stand strip and a search dialog that stays open for several choices. Off-stand selections remain visible without changing repertoire membership. Selecting/deselecting reallocates the existing practice minutes equally; optional warm-up retains its configured share of the same total. Selection requires at least one piece and keeps at least one minute per piece, up to 20.

The existing per-piece activity model remains in use. Retained activities keep their IDs and musical settings. More options → Adjust individual pieces opens the detailed block editor. Mixed practices, policy routines and existing repeated-piece/unassigned multi-block plans retain their full editor. No notebook schema or shared saved-session-card change.

Implementation is isolated at `/Users/migue/.codex/worktrees/repertoire-multiselect/spino`, branch `codex/repertoire-multiselect`, from published beta125 website commit `b8e8947bd3b436d56b2112cc599f4c7dc4b5420b`. The old main checkout and unrelated pending work are preserved. [Evidence](captures/preparation/2026-11-10-repertoire-multiselect-01/README.md) records nine unit and five browser passes; the precise layout remains proposed for owner review. Preview: http://127.0.0.1:5341/. In-app browser opening returned unavailable; no native acceptance, APK, publication or release is claimed.
