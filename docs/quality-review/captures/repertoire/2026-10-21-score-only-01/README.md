# Score-only catalogue — 2026-10-21

Responsive browser evidence, using a disposable synthetic notebook. Native-device and owner visual acceptance remain open. No APK built.

The visible catalogue includes only downloadable MusicXML/MXL or acquired local scores, plus the separate PDF collection. Research references remain in internal snapshots for stable IDs, backups and existing history, but are excluded from catalogue searches, filters, counts and composer choices. No notebook migration or asset deletion occurs.

Removed the Research tab, editorial review panels, pending-analysis text, raw metrics/evidence JSON and excerpt proposals. Useful score controls and attribution remain.

Validation: production build; 15 scoped unit checks; four-layout catalogue/detail browser regression. downloads.json records successful full-file responses and score signatures for all 55 default XML/MXL downloads and 10 PDFs. This checks file availability, not every score's musical accuracy. Optional accompaniment downloads are outside this default-catalogue audit.

The broader existing library.browser.test.js did not complete within 120 seconds, after requesting the synthetic score download. Its full practice flow is not claimed as passing in this run. The focused four-layout catalogue/detail regression passes.
