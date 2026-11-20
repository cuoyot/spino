# Shared clock timeline correction — 19 November 2026

Responsive Chromium browser evidence with disposable synthetic notebooks and scores. No native-device acceptance or publication.

The baseline sets `Animation.currentTime` from fresh elapsed time while the document timeline still represents the previous frame. A 1.8-second synchronous task followed by a timer update moves the origin backwards. On the next rendered frame the animation counts the blocked interval twice: the visible digit regression observes **1:02 instead of 1:00**. Pausing on a stale timeline also drifts. The fix sets the running `startTime` from `performance.now() - elapsedMs`, preserving the origin through ordinary refreshes, and pauses before assigning held time.

- `before.json` / `after.json`: real Chromium timing probe before/after, using the same 1.8-second long task. The baseline advances to about 3.84 s when actual elapsed time is about 2.02 s, then rewinds. The fixed animation remains aligned within a frame.
- `before-tests-visible.tap`: both final regressions fail against an isolated copy of the unchanged baseline renderer retained in the 6.2.3 workspace.
- `after-tests-visible.tap`: both final regressions pass, reading transformed digit rows rather than only accessible text. Includes pause/resume and m:ss → mm:ss rebuilding during stale frames.
- `checks.tap`: 11/12 initial focused checks pass, including all clock checks, free/generated modes, checkpoints, PDF/MusicXML pause/edit/return behavior and responsive control geometry. The auxiliary worklet check fails its minimum beat count before reaching its clock assertion.
- `audio-recheck.tap` / `audio-probe.json`: the isolated auxiliary repeat passes; the diagnostic receives seven regularly timestamped worklet beats across a 1.8-second blocked UI. The initial failure remains preserved rather than being treated as a clean first run.
- `score-layouts/`: 50 PDF/MusicXML responsive frames, running/paused/editing/minimized, including phone/tablet portrait/landscape and 320 px PDF. Representative frames inspected for legible, unclipped clocks.
- `fixtures.json`: synthetic notebook/generated-score/PDF/MusicXML inputs. `verification.json` records source, build and screenshot hashes and tools. `before-tests.tap` retains the earlier stricter diagnostic version of the assertions; `before-tests-visible.tap` is the final behavior-level regression.

Reproduction commands (Node 22; set `BROWSER_PATH` to a separate Chromium executable):

```sh
npm run build
node --test --test-concurrency=1 tests/practice-clock.test.js tests/clock-display.browser.test.js tests/practice-clock.browser.test.js tests/score-timer.browser.test.js tests/practice-revision.browser.test.js
node --test --test-name-pattern='worklet audio grid' tests/practice-revision.browser.test.js
node scripts/review/preview-preparation.mjs
```

The selected workspace is `/Users/migue/Source/spino`, HEAD `902f0e7ee5ab6933e36421b17631d5fe61dad894`, with extensive pre-existing pending work. The timing fix changes only the shared renderer; its unchanged baseline also exists in the retained 6.2.3 source. This local build is for reproducing/reviewing the correction, not a promotion of the older root to a new release. A future delivery must integrate the correction into the current release source recorded in the release handoff.

Preview: http://127.0.0.1:5196/?review=pdf. The Codex open-panel request returned queued; computer-use reports no available browser, so the preview was not interactively confirmed in that panel. Automated browser verification and the screenshots above are separate evidence. No personal notebook, stable record IDs, PDFs or annotations were edited.
