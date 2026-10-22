# Website contrast and video loading — 21 October 2026

This directory records the original local responsive-browser evidence, captured before deployment; it is not native-device acceptance. Existing synthetic website images and disposable Chromium profiles were used; no personal notebook was accessed. Subsequent production verification is recorded in [the 22 October run](../2026-10-22-accessibility-media-public-01/README.md).

The owner supplied two Lighthouse failures: low contrast on the stable/beta download buttons and a failed connection to the Hanon MP4. Both localized download buttons now use white text on `#2563eb` (5.17:1, previously 3.22:1), with a darker hover color (6.70:1) and a visible keyboard focus ring. The shared page generator applies this to Spanish, English and Catalan.

The video retains its poster, native controls and original reviewed file, but uses `preload="none"`. It requests bytes when playback starts, avoiding an unnecessary video connection during the landing-page load. The reported production connection failure could not be reproduced: HTTP HEAD returned 200, a two-byte request returned 206, and a complete 22,190,578-byte download matched the reviewed SHA-256. This is not evidence of a repaired hosting outage; no Worker or video bytes were changed.

## Verification

- `lighthouse.json`: Lighthouse 12.8.2, mobile preset, local Spanish home page; accessibility 100/100 and best practices 100/100. Color contrast and console-error audits both pass with no failing items. These scores apply to the local run only.
- Eight unit checks pass for localized assets, SEO/FAQ metadata, inline video ranges and unchanged download streaming.
- Four browser checks pass for localized screenshots/layout, SEO/FAQ without page JavaScript, release dialogs, and the new media regression.
- The media check verifies no initial MP4 request, actual decoded frames, playback, midpoint seeking and resumed playback in all three languages. `playback.json` records each result.
- Twenty-four new captures cover Downloads and Hanon in Spanish, English and Catalan at 390×844, 844×390, 768×1024 and 1024×768, without page overflow. Previous baselines are preserved. Representative phone downloads and tablet video captures were visually inspected. Some early video captures show the browser's transient initialization spinner; a subsequent in-app browser inspection confirmed the settled poster and an empty browser error log.
- `verification.json` records the base commit, changed source/build hashes, fixture, layout coverage and public diagnostic results. `git diff --check` passes.

The corrected local website was reviewed at `http://localhost:5187/#downloads`. Public deployment and production Lighthouse were still pending at the time of this local capture. No APK or AAB was built for these changes.

## Publication handoff

The owner authorized publication on 21 October 2026. Commit `af41e1298eca55038d5fc4c9e475fc398838c75a` was pushed to `master` and verified through GitHub. Cloudflare did not register a corresponding build after several minutes; its build history still ended at the previous SEO commit, with builds enabled and available build minutes. A documentation follow-up retried Git-triggered publication without changing the reviewed website or its hashes; it also produced no observed build. `deployment-diagnostics.json` preserves that historical state.

Both fixes subsequently shipped with the direct beta 9 deployment and remain in stable 6.1.1, commit `f1a3cd21b9ef3dc1a1f065069c9e4e39a8ed4e33`, Cloudflare version `4b2b5af8-23f2-4d5f-9f53-7c2fa863e646`. On 22 October, all three public pages matched that commit byte for byte, the video returned HTTP 206 for a range request, and production Lighthouse scored 100/100 in accessibility and best practices with both reported audits passing. See the new evidence run linked above; the original local results remain unchanged.
