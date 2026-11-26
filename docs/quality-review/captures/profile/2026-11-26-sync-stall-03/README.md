# Resume long Drive discovery — 26 November 2026

Beta133 (`6.2.4-beta.5`) adds per-page discovery checkpoints to beta132 (`2b3d2c62`). Runs 01 and 02 remain unchanged.

The owner supplies an additional phone screenshot: 154 request attempts / 665 KB / 70 seconds, still checking Drive. This proves ongoing work but does not identify the exact failed request. Source previously committed its changes cursor only after the entire feed finished. A late interruption could restart the entire scan. Completed pages now persist their catalog before their matching cursor; retry/restart resumes that cursor, while notebook reconstruction/adoption still require a complete successful scan.

The new synthetic interruption/restart test starts at the last retained page and receives a second-device note, keeping original sessions, score bytes and annotations. Existing cycle, timeout, cancellation, uncertain accepted-upload and manual-retry tests remain passing. The production UI also separates notebook-file inventory from Drive-history checking.

Eight responsive browser captures show stopped/recovered states in phone/tablet portrait/landscape. The browser deadline is accelerated to 800 ms; production remains 180 seconds per transport operation. Original IndexedDB notebook and score records remain identical before/after the simulated timeout, successful retry and late response.

Native replacement installation on the existing emulator retains eight original IndexedDB files byte-for-byte before launch and confirms foreground/version133. Private recovery archives remain ignored. The personal notebook is not functional test data. Real-account transfer on the owner's phone remains pending; source, responsive simulation and native installation are distinct evidence.

Validation: 120 focused application tests, two production-browser/journal checks, 15 Android checks and nine website checks pass. Existing manual-sync browser request-count debt was reproduced against beta131 and intermediate beta132; no clean broad-suite claim is made.
