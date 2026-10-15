# Native Android recording verification — 2026-10-15

The local same-version beta1 review APK is replacement-installed and the activity is confirmed foreground. All 259 packaged web files match the production build. The initial replacement retains the seven original IndexedDB file hashes (`../2026-10-15-native-permissions-01/handoff.json`); the final run retains all 16 existing file hashes, including earlier synthetic test databases.

The test uses namespaced synthetic IndexedDB databases and in-memory localStorage on a review-only URL. The installed notebook is never seeded or used as a fixture. The final activity displays synthetic preparation; a normal relaunch uses the original notebook.

Audio (36,054 bytes, Opus WebM) and video (61,908 bytes, VP8/Opus WebM) start with permissions already granted, reach the review panel, and save as non-draft local recordings linked to the synthetic piece. No runtime exceptions occur. Fresh Android microphone/camera permission screenshots are retained in `../2026-10-15-native-permissions-05/`; that provisional run later missed an exact clock assertion. Final numeric-duration waiting avoids that test timing race.

The existing emulator uses WebView 113.0.5672.136. Native PDF initialization stalls before control listeners/rendering complete; the native test therefore uses the repertoire session. The complete PDF recording flow, permission-prompt visibility transition and score controls are verified separately in responsive Chromium with synthetic streams. No physical-device PDF or capture-quality acceptance is claimed.

See `native-verification.json` for fixture, source/APK hashes, before/after storage hashes, capture metadata and foreground identity. The APK is a local review artifact at `artifacts/review/stand-recording-2026-10-15/spino-6.1.0-beta.1-review.apk`; no version bump or publication.
