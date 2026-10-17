# Larger header avatar — responsive browser evidence

2026-10-17. Owner requests a slightly larger profile-photo circle. `src/companion/app.css` increases the header avatar from 36 to 44 px and includes its border within those dimensions. The existing header button, title and MIDI positions are retained. No stored photo or notebook changes.

Production build and existing `tests/header-parity.browser.test.js` pass: 384 route measurements across three languages, two themes and eight viewports; 48 phone/tablet portrait/landscape frames reopen six shared-header surfaces. Disposable synthetic notebooks; source hashes and browser/geometry/error details in `metadata.json`. No new tests were added for this CSS adjustment. The interaction/manual behavior is unchanged.

Responsive-browser review only. Native-device and owner visual acceptance remain open. No new APK/version/publication.
