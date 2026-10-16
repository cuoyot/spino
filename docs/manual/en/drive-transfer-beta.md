# Google Drive transfer check (Android beta)

Update both Android devices to 6.1.0-beta.9/build62 or later. Open Profile using the avatar at the top left, then select Google Drive transfer check (Prueba de transferencia con Google Drive in Spanish). Beta7 accidentally hid this entry. The website and browser version do not expose the Android authorization entry.

The separate test screen uses a bundled synthetic two-minute recording. Connect the same Google account and use the same test notebook code on both devices. Upload on the first device, then find, download, verify and play on the second. While Google authorization is in testing, the account must be registered as a test user. Actual Google consent and physical two-device playback remain pending owner acceptance.

This check does not upload your personal recordings or enable automatic multimedia synchronization. Use Return to SPino to leave the test screen.

Beta8 can report “Google Drive permission was not granted” even after consent. Beta9/build62 corrects the native scope comparison. SDK-result tests and final-version emulator installation/navigation pass; successful consent and transfer on physical devices still need verification.
