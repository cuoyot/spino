# Practice notifications — 23 October 2026

Responsive browser evidence, not native-device acceptance. The current source implements the requested opt-in notification and practice-suggestion controls under Profile → Reminders. The schedule uses 18:00 local time and a seven-day horizon, with at most one suggestion per day and appointment reminders taking priority. Suggestions use saved practice dates and the existing weekly streak semantics.

The browser test uses an isolated disposable notebook and a synthetic Android notification bridge. It verifies explicit permission requests, both switches, cancellation, persistence across reload, and the enable-notifications offer after saving an alarm. Screenshots cover phone/tablet portrait/landscape with both switches enabled. No personal notebook was used.

Validation: reminder/profile unit tests; profile browser regression; notification browser integration; production Vite build; Android `:app:compileDebugJavaWithJavac` with JDK 21. No APK was built or installed in this run. Native delivery while closed, system permission UI and reboot recovery remain unverified for this change. No release or website publication occurred.

Reproduce with `BROWSER_PATH` pointing to a Chromium binary and `node --experimental-websocket --test tests/practice-notifications.browser.test.js`. Set `REMINDER_CAPTURE_DIR` to a new dated directory to capture another run. `verification.json` identifies the build. Earlier runs are retained.
