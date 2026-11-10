# Recording stop and export — 2026-11-10

Current source review from published beta125 `b8e8947bd3b436d56b2112cc599f4c7dc4b5420b`, with the owner-accepted repertoire selector retained. Worktree: `/Users/migue/.codex/worktrees/repertoire-multiselect/spino`, branch `codex/repertoire-multiselect`.

These are responsive Chromium captures with synthetic PDF/MIDI/video/camera data. The native-sharing lifecycle test is a simulated Android bridge, not an emulator/device claim. No personal notebook, recording, score or annotation was used. No APK or publication.

The recording stop is labeled and separated from practice stop. An accidental practice stop leaves the retained review visible. Video sharing offers exact original bytes without re-encoding, or optional title/closing cards. Browser conversion pauses while hidden, retains progress and resumes; the native request is not automatically cancelled and its chooser waits for visibility. The prepared result uses a new share action and can be reused while the app stays open. Closing/killing/reloading the process still loses that in-memory job/cache; this delivery is not a persistent background service. Physical Android lock/recipient acceptance remains open.

Production build, source/lock hashes and frame list are in `verification.json`. Final focused results are in `checks.log`; the independent preview smoke checks are in `preview-checks.log`. Original video hash, native chunk reconstruction, decoded decorated duration/fades, cache retry, cancellation and original retention are asserted by the tests. Run logs for two unchanged published-baseline failures are retained separately. The old bottom-caption placement assertion and previous-week media-filter assertion fail on unchanged beta125 as well; neither is claimed fixed here.

Preview: http://127.0.0.1:5342/ (synthetic active score recording); http://127.0.0.1:5342/?review=export (synthetic saved-video chooser). `scripts/review/preview-recording-stop-export.mjs` serves this production build using namespaced disposable databases and a virtual camera. Both preview routes pass a separate smoke check. The in-app browser was unavailable.

Reproduce with Node 20.20.2, the locked dependencies and an isolated temporary browser profile:

```sh
npm run build
BROWSER_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" SPINO_RECORDING_EVIDENCE=docs/quality-review/captures/multimedia/2026-11-10-recording-stop-export-05 SPINO_EXPORT_EVIDENCE=docs/quality-review/captures/multimedia/2026-11-10-recording-stop-export-05 node --experimental-websocket --test --test-concurrency=2 tests/media-export-lifecycle.browser.test.js tests/media-bookends.browser.test.js tests/media-bookends.test.js tests/media-share.test.js tests/media-share.browser.test.js tests/media-trim.test.js tests/media-trim.browser.test.js tests/midi-recording.browser.test.js tests/pdf-recording-finish.browser.test.js tests/pdf-practice.browser.test.js tests/musicxml-view.browser.test.js tests/screen-awake.test.js tests/repertoire-multiselect.browser.test.js
```

Runs 01–04 retain intermediate layout/verification states. Run 05 adds opaque, theme-consistent export dialogs and is the current review. Next: owner layout review, followed by native/physical lock, interruption and receiving-app verification when packaged.
