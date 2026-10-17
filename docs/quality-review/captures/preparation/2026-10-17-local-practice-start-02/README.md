# Practice starts locally while Drive is stalled

2026-10-17. Twelve responsive Chromium frames across 390×844, 844×390, 768×1024 and 1024×768: session started with a stalled provider, late incoming change deferred during active practice, and saved session followed by safe synchronization. Disposable synthetic notebook/Drive only; no Google authorization or personal data used.

`verification.json` records timing for the synthetic start, source/build hashes, saved session ID, retention assertions and frames. `fixture.json` retains the original disposable notebook with PDF/annotation. A valid second-device edit is published through the production incremental adapter. The browser test holds a provider request, verifies immediate start without a sync prompt, rejects one local save then retries, ignores duplicate submission and retains the saved session plus the remote note after completion. Sync remains enabled. PDFs and annotations are unchanged.

The first run is retained; its intentional local-storage failure toast appears in the screenshots. This run hides that already-asserted test toast before capturing. Production build and 62 focused checks pass; the five cloud-local checks pass again after this capture-only refinement. Browser review only, not native/physical-device acceptance. No new APK/version/publication.

Reproduce with Node 22+ and Chrome:

```sh
BROWSER_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' SPINO_PRACTICE_SYNC_EVIDENCE=<new-dated-folder> <node-22-or-newer> --test tests/cloud-local.browser.test.js
```

Preview: `node scripts/review/preview-local-practice.mjs`, http://127.0.0.1:5292/. It connects only a simulated account/notebook, stalls its provider read and opens practice preparation.
