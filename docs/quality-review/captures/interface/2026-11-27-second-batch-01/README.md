# Four priorities · synthetic responsive browser evidence

Date: 27 November 2026. Base: `935c26329661542beda90ffb4dd39714d6f26d3a`, published beta131. Current source is uncommitted local work in the interface-first-eight worktree; see `source-build.json` for exact hashes and built files. No personal or installed notebook was used.

`review-frames.json` selects 80 representative JPEGs and their hashes: 12 beta131 phone baselines, 48 current-source frames across phone 390×844 / 844×390 and tablet 768×1024 / 1024×768 in both themes, and 20 narrow 320×640 EN/CA/DE/HU frames. The six surfaces are duration, finish, picker, sort controls, Progress Repertoire and preferences; narrow coverage omits preferences. Every selected JPEG has its expected dimensions.

`selected2-*` shows matched two-piece selection through controls scoped to the dialog. Earlier `final-*-ux12-*` are exploratory zero/one-choice captures from an unscoped automation attempt and are superseded. `*-mood-visible-*` supersedes the initial folded-rating trial after the owner's instruction to keep feelings visible. Earlier evidence is retained, not overwritten. `matrix-inspection.jpg` and `locales-inspection.jpg` inspect the initial trial and are historical.

`browser-checks.json` records layout measurements and eight functional groups. `mood-visible-checks.json` adds the owner's visible-rating follow-up, four narrow measurements and keyboard/blur/mode behavior. The eight phone/tablet feeling follow-up frames are included by `review-frames.json`; they were saved before a long capture call timed out. The four narrow captures were completed separately. Timeout and selector adjustments are automation limitations, not product failures or native evidence.

Verified: exact values and invalid/cancel/extended-duration handling; allocation and mode transitions; retained preference tempo; visible feeling targets; required-field reveal; failed save/retry with corrected title/time/passage and retained notes; one persisted saved result after reload; Keep practising and Save and schedule; selection counts across searches; quiet sort targets; localized singular/date and timezone stability. `mood-visible-save-failure.jpg` shows recovery while retaining the new feeling.

The selected current-source sort and exact-value controls meet the 44 px project target; initial matrix page-width measurements and four final narrow feeling measurements show no horizontal overflow. Phone/tablet finish changes were also visually reviewed. This is browser review, not an Android or physical acceptance claim.

Production build: `build.log`. Final focused tests: `tests.log` (18 pass). Earlier test output is preserved separately. No clean broad-suite claim, APK, version increment or publication.

Reproduce with `node scripts/review/preview-second-batch.mjs`. It reads the retained pre-edit dist at `/private/tmp/spino-ux-batch2-before-20261127` and current `dist`, with synthetic fixtures and fixed review date. `retain=1` skips resetting data/startup navigation for persistence checks; `failSave=1` injects one test-only state-write failure at finish, without consuming it on active-session checkpointing.
