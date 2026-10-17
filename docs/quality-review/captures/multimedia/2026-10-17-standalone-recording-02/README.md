# Standalone repertoire recording — responsive browser evidence

2026-10-17. Complete run: 60 light/dark frames at 390×844, 844×390, 768×1024, 1024×768 and 320×640. States: Home entry, repertoire picker, detected audio, Multimedia entry, live video and video review. Synthetic oscillator/gain audio and canvas video; no personal device data, microphone or camera used.

`verification.json` records source/build hashes, geometry, saved recording metadata, exact work/null-session links, notebook/assets retention and signal/permission cleanup assertions. `fixture.json` retains the original disposable notebook, including a trashed piece excluded from selection. Signal and silence both change the actual analyser/meter/status; camera preview uses the actual synthetic captured stream. Background stopping, denied/cancelled permission, ended tracks/closed analyser contexts, empty repertoire and persisted saved takes are checked.

Run 01 remains preserved. It passed functional tests but visual inspection found choice-label clipping at 320 px; this run uses two choice columns plus a separate Cancel row and asserts text containment. Production build and 23 unique focused checks pass across standalone/shared recording, duration, Drive copies, header parity, PDF practice and recording calendar. This is responsive-browser evidence, not native/physical/owner acceptance. No APK/version/publication.

Reproduce using Node 22+ and Chrome:

```sh
BROWSER_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' SPINO_STANDALONE_CAPTURE=<new-dated-folder> <node-22-or-newer> --test tests/media-standalone.browser.test.js
```

Preview with synthetic notebook/media:

```sh
RHYTHM_EVIDENCE=docs/quality-review/captures/multimedia/2026-10-17-calendar-filters-03 RHYTHM_PORT=5293 node scripts/review/preview-progress-rhythm.mjs
```

Open http://127.0.0.1:5293/?review=media. Record is available in the Multimedia and Home headers.
