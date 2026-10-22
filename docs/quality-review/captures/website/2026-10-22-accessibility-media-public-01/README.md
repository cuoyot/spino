# Public website verification — 22 October 2026

The download-button contrast and deferred video-loading changes are live at
[spinoapp.com](https://spinoapp.com/). This run verifies production in a disposable
desktop Chromium profile using Lighthouse's mobile preset; it is not native-device
acceptance and does not use a personal notebook.

- Current deployed source: `f1a3cd21b9ef3dc1a1f065069c9e4e39a8ed4e33`, stable 6.1.1.
- Cloudflare version: `4b2b5af8-23f2-4d5f-9f53-7c2fa863e646`, confirmed with
  Wrangler 4.151.3 using the existing OAuth session. No new login was necessary.
- The Spanish, English and Catalan public HTML matches the committed files byte
  for byte, without cache-busting parameters. All contain the corrected button
  background and `preload="none"`.
- The original Hanon video responds with HTTP 206 and the expected
  `Content-Range: bytes 0-1/22190578` for a two-byte request.
- Lighthouse 12.8.2: accessibility **100/100**, best practices **100/100**;
  `color-contrast` and `errors-in-console` pass with no failing items. No runtime
  error or run warning was reported. Scores apply to this production run.

`verification.json` records URLs, hashes, timestamps and results; `lighthouse.json`
is the complete audit. Deployment evidence is in
`docs/releases/6.1.1-direct-deployment.json`. Playback, seek and responsive-layout
regressions remain documented in the original
[local run](../2026-10-21-accessibility-media-01/README.md).

No upload was needed for this verification: the newer published release already
included the requested changes. The reusable deployment and session-reuse routine
is now in `docs/website-deployment.md`, linked from `AGENTS.md`, the publishing
guide, the release skill and Wrangler configuration.
