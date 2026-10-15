# Calendar header stays on one row — October 15, 2026

Owner requested keeping Week/Month beside the Calendar title instead of adding another header line on phones. Calendar-only rules override the mobile stacked header. Narrow-phone title/control spacing adapts while both choices retain complete labels and 44×44px minimum targets. Existing Profile and MIDI actions remain visible.

`metadata.json` records 96 measured combinations: Spanish, English and Catalan; light/dark; Week/Month; widths 320, 360, 390, 599, 600, 844, 768 and 1024. Portrait-notch, landscape side insets and tablet safe areas are included. Assertions verify title/selector center alignment, a gap of at least 4px, no header overflow or clipped text, full touch targets and header height at most 82px. Thirty header/context screenshots cover both themes, four representative orientations and the narrow phones. Prior baselines are preserved.

Production build and the two existing shared-header/navigation regressions pass. They also verify six screens, fixed navigation under scrolling, style/contrast and view-specific controls. Logs: `/tmp/spino-calendar-inline-header-build.log`, `/tmp/spino-calendar-inline-header-review.log`, `/tmp/spino-calendar-inline-header-regression.log`. Review driver: `scripts/review/capture-calendar-header.mjs` (pass a new dated run name to preserve the baseline). The fixture references the prior disposable circle notebook; no personal notebook was used.

Browser preview refreshed at http://127.0.0.1:5187/. Responsive browser evidence does not imply native acceptance. No new APK or website publication.
