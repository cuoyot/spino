# Compact multimedia icons and filters — responsive browser evidence

2026-10-17. Complete run: 100 frames in light/dark at 390×844, 844×390, 768×1024, 1024×768 and 320×640. Includes existing Progress/streak context, default/expanded/boundary/empty calendars, recording list, combined type/piece filters, filtered empty states and piece picker. Synthetic notebook and media only; no personal installation used.

`metadata.json` records the production index, source hashes, Git HEAD, frames, runtime errors and retention assertions. `fixture.json` and `recordings.json` retain source fixtures. Assertions verify inline/contained icons without visible counters, compact days, keyboard toggle, filter intersections/reset/cancellation, month/week navigation and unchanged notebook/recording IDs. Existing capture/playback/restart and media-sync regressions pass separately. Earlier partial runs 01/02 are retained with explanations.

Use bundled Node 22+ and Chrome:

```sh
BROWSER_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' RHYTHM_CAPTURE=<new-dated-folder> <node-22-or-newer> --test tests/progress-rhythm.test.js tests/progress-rhythm.browser.test.js
```

Preview:

```sh
RHYTHM_EVIDENCE=docs/quality-review/captures/multimedia/2026-10-17-calendar-filters-03 RHYTHM_PORT=5291 node scripts/review/preview-progress-rhythm.mjs
```

Open http://127.0.0.1:5291/?review=media. The review origin seeds only an empty notebook. This is responsive-browser evidence, not native-device or owner visual acceptance. No new APK/version/publication.
