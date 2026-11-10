# Repertoire selection — 2026-11-10

Responsive Chromium browser evidence only, with a disposable synthetic notebook. No installed personal notebook, PDF or annotation was used. The accepted objective is direct multiple-piece selection; this layout awaits owner feedback. No Android APK or deployment.

Source: `/Users/migue/.codex/worktrees/repertoire-multiselect/spino`, branch `codex/repertoire-multiselect`, from published beta125 `b8e8947bd3b436d56b2112cc599f4c7dc4b5420b`. Source hashes and the synthetic fixture are in `verification.json`; build/lock hashes are in `build.json`. Existing source trees and unrelated changes remain intact.

Preview: http://127.0.0.1:5341/. The in-app browser was unavailable. `scripts/review/preview-preparation.mjs` serves this production build with synthetic works and a synthetic PDF; it opens two selected stand pieces. Search opens the rest of the repertoire. `?review=pdf` retains the single-score regression preview.

Production build passes. Nine unit checks and five browser checks pass for selection limits, fixed allocation, stable activity IDs, preserved custom plans/settings, all four practice modes, automatic MIDI, advanced selection/catalogue, and start behavior. Twenty dated frames cover light/dark in phone portrait/landscape, tablet portrait/landscape and 320 px. Works and history remain unchanged. Saved-session summaries use their existing shared component.

Run with Node 20.20.2 (`--experimental-websocket` for browser tests), locked dependencies, and an isolated temporary Chromium profile through `tests/browser.js`. No owner browser profile is used. Final checks:

```sh
npm run build
BROWSER_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" SPINO_REPERTOIRE_EVIDENCE=docs/quality-review/captures/preparation/2026-11-10-repertoire-multiselect-01 node --experimental-websocket --test tests/repertoire-preparation.test.js tests/preparation-warmup.test.js tests/practice-duration.test.js tests/repertoire-multiselect.browser.test.js tests/preparation-repertoire.browser.test.js tests/practice-mode.browser.test.js tests/practice-duration.browser.test.js
```

Next: owner responsive layout review. Native/physical-device acceptance, packaging and publication remain open.
