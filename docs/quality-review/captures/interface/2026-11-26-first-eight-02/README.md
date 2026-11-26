# First eight improvements — dated responsive-browser comparison

Date: 26 November 2026. Status: final beta130 responsive evidence; publication authorized; physical acceptance remains open.

[Review summary](../../../interface-first-eight-2026-11-26.md) · [Interactive comparison](http://127.0.0.1:5378/)

## Reference and final capture set

Before: 6.2.4-beta.1, commit `559c7949a0f180e36c826468daf59d2709b68f3c`, built in the original isolated audit export. After: the isolated managed worktree `/Users/migue/.codex/worktrees/interface-first-eight/spino` with UX-01–08 and the owner's icon-only repetition refinement. After is 6.2.4-beta.2 / build130, including the final scrollbar refinement. Build/source hashes and screenshot hashes are recorded in `manifest.json`.

`responsive-matrix.json` lists 128 final captures: eight proposals × before/after × light/dark × phone 390×844 / 844×390 and tablet 768×1024 / 1024×768. Every PNG in this matrix is checked against its requested dimensions. No measured page overflow or offscreen dialog-action footer remains in the matrix. This does not certify every child state, text scale or native configuration.

The eight `ux-XX-before-after.png` images combine the original phone-portrait screenshots with clearly labeled Before/After columns. They do not alter the app screenshots. Original frames remain available separately.

`locale-checks.json` records 32 additional English/Catalan/German/Hungarian phone states; the main comparison uses Spanish. `behavior-checks.json` records the targeted interactive checks. `keyboard-accessible-after.dom.txt` captures the actual generated-reader control names. The 320×640, 390×520, failed-save, repetition-open, preparation-error and finish-form images are supplementary states.

## Fixtures, build and reproduction

The harness `scripts/review/preview-interface-first-eight.mjs` runs from the prepared worktree after the normal Vite build. It serves `/before/` from the earlier audit build and `/after/` from the prepared worktree's `dist`. It loads the original audit's synthetic fixtures, fixes the date to 26 November 2026 and uses separate `ui-first-eight-20261126-` IndexedDB prefixes for each version/scenario. Navigating a harness URL intentionally resets only that synthetic state.

Start with the bundled current Node runtime and open `http://127.0.0.1:5378/` in Codex's in-app browser. `SPINO_REVIEW_BEFORE`, `SPINO_REVIEW_FIXTURES` and `SPINO_REVIEW_PORT` can point to another isolated baseline/fixture copy/port. Direct routes such as `/after/?ux=5&lang=es` support targeted checks. The `failSave=1` diagnostic injects a single synthetic state-write failure only after fixture setup; retry then uses the normal store. It is not shipped in the production build.

The final production build log and focused-test logs are retained. The focused run passes 42 of 43 checks; the same obsolete Today assertion fails on the original reference. No full-suite or native-device pass is claimed.

## Preserved intermediate captures

- `attempt-01-hidden-tab/`: 32 diagnostic captures used a hidden tab while the browser viewport override applied to the selected visible tab. Their 1280×720 dimensions do not match the requested devices. They are excluded from responsive acceptance and are not app layout defects.
- `interim-before-repetition-icon/`: the initial UX-01–08 after captures before the owner's repetition refinement, plus their matrix record.
- `interim-before-preparation-alert/`: the icon-only repetition revision before moving preparation validation into the sticky action row, plus its matrix record.

These earlier runs remain intact. The final matrix uses the untouched reference's 64 Before frames and the final implementation's 64 After frames. Supplementary behavior captures are identified separately.

All visual/behavior notebooks and assets are synthetic. Native replacement/data-retention/foreground evidence is recorded separately in the beta130 validation manifest; the existing emulator notebook was neither cleared nor used as a visual fixture. No native camera/microphone or Google account was connected. Earlier baselines remain preserved.

`interim-before-scrollbar-refinement/` retains the prior After frames, language frames and pairs. `scroll-checks.json` records retained keyboard scrolling with hidden mobile scrollbars.
