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
