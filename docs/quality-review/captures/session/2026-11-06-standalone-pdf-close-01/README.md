# Standalone PDF floating Close — 6 November 2026

Owner reports that opening a work for annotation has no Close option in the floating menu. Reproduced source cause: the only Close lived inside the initially collapsed tools panel, while editing hid and rejected that action. Standalone score reading now has exactly one Close in the floating bar, visible in reading, annotation and framing states. Existing practice exit/pause/edit behavior is retained.

Close uses the existing save-and-exit path. Pending marks and framing writes must succeed before removal. A failed annotation save keeps the viewer open with its marks and error state; retrying Close saves the same mark before returning to the work. The original PDF bytes, work/session IDs and notebook are retained.

Three focused browser regressions pass: the new standalone touch-close/save-failure/retry test, existing practice Back/edit/save behavior and work-detail navigation/PDF/shared-history retention. Twenty responsive frames cover reading/editing in light/dark at 390×844, 844×390, 768×1024, 1024×768 and 320×640. Tests assert real touch reachability and 44px targets; the fixture is a disposable synthetic notebook, never the installed notebook.

Built with Vite production bundling on the current beta115 source checkout. Existing unchanged public assets were retained to avoid copying historical authoring banks on the low-space host (`publicDir:false`, `emptyOutDir:false`, stale hashed chunks removed before bundling). Source/index hashes and fixture accompany this run. This is responsive browser evidence, not native acceptance.

This fix is source/web only after published beta115. No APK, tag, push or website deployment was performed for this follow-up. Next: owner review and separately requested packaging. Preview: http://127.0.0.1:5312/ (open the work thumbnail).
