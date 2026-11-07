# Practice overview total — 7 November 2026

Accepted objective: reduce the empty header and make total practice time clearly visible.

The implemented header pairs **Total practice time** and large tabular digits with **Continue later** in the same row. Input context stays below; the current activity retains its independent block clock. Existing title routing, practice controls and saved-session cards remain unchanged.

Ten responsive browser captures cover light/dark appearance, phone/tablet portrait/landscape and 320 px. The synthetic example shows 67:58 total and 32:26 in the current block. No personal notebook was used. Earlier evidence is preserved.

Production build and all three existing flexible-practice browser regressions pass. Geometry checks verify readable total size, no header overlap and no horizontal overflow. See verification.json and build-source.json. Owner approved this layout on 7 November and requested APK/website delivery. Beta119 packages it; publication evidence is recorded separately. Native physical-device acceptance remains open.

Reproduce evidence with Node 22 or later:
`BROWSER_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node scripts/review/capture-session-header.mjs`

Preview: `node scripts/review/preview-session-header.mjs`, then http://127.0.0.1:5298/. The Codex in-app browser could not be opened because local browser use is disabled in Work settings.
