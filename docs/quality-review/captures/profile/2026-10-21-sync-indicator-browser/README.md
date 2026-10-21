# Global synchronization indicator — responsive browser evidence

2026-10-21. Owner requested a persistent synchronization icon beside MIDI whenever synchronization is configured, with a clear problem signal and direct access to recovery.

Implemented in the shared application header. Notebook errors/conflicts and recording-copy errors/offline state receive a red icon and an exclamation badge. Paused, pending, waiting and transferring states have localized accessible labels. Opening the indicator reaches Backup & sync; notebook conflicts use the existing conflict review action.

Validation: production build passed; 45 unit tests covering the indicator and notebook cloud/backup passed; isolated browser regression passed at 390×844, 844×390, 768×1024 and 1024×768. Browser test connects a disposable synthetic Drive notebook, corrupts synthetic remote score bytes, requests synchronization, verifies the global error indication, and opens recovery from Profile. No personal notebook or remote account was used. Screenshots are responsive Chromium evidence, not native-device acceptance. Conflict routing is implemented; this run verifies error routing only. Owner visual/native acceptance remains open.

Source: working tree based on commit `2b1bc229b4bffb2cb9e070ac952992ec7c4382a7`, package `6.1.1-beta.5`. No APK or release publication.

SHA-256:

- `src/companion/sync-indicator.js`: `c1cfb93349024787003365233b44f8a720d1190bb0a99364c09797afe7018e0e`
- `src/companion/app.js`: `1e3ee26ac15b76d0403a21a50222a71eb611c9e7edb623355a19af873302c299`
- `src/companion/app.css`: `46a7696d1dca8dd39f6de31208c0c0a9addd99f4b23dad535ca80db2afac5c22`

Reproduce with `npm run build`, then run `tests/sync-indicator.browser.test.js` with a modern Node runtime and `BROWSER_PATH` pointing to Chromium.

Follow-up: the owner rejected the filled red/exclamation treatment and accepted the subtle proposal. The error screenshots now show the current approved indicator after the recovery regression was rerun. Final production UI evidence is in ../../navigation/2026-10-21-page-actions-03; the earlier description above records implementation history.
