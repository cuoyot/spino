# Catalogue contrast and control cleanup

2026-10-21. Responsive Chromium browser verification using a disposable profile; no personal notebook data. Native-device acceptance is separate.

The format menu options have explicit foreground/background colors and inherit the resolved color scheme in both themes. Each option exceeds 4.5:1 contrast. Refresh catalogue and Download piano editions are absent; individual score actions remain. See verification.json, dark.png and light.png. Screenshots show the catalogue; the operating-system popup is not captured by page screenshots.

Command: Node 24 --test tests/catalogue-contrast.browser.test.js. Production build and four catalogue unit checks pass. Not packaged or published in beta7/build83.
