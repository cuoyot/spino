# Android 6.1.1-beta.3 (79) verification

The final signed APK is replacement-installed on the existing emulator. native-final-install/native-handoff.json records the matching APK hash, installed version, 120 original IndexedDB files unchanged before launch, a private recovery archive and foreground activity. No application data was cleared.

The actual app’s Hanon score and Home/Practice/Calendar/Profile header after returning from generated practice pass in native-scenarios-03/. All original logical notebook, score and media stores have identical before/after hashes. The test uses a unique disposable storage prefix and in-memory device preferences; personal data is not used as a fixture.

Native lesson/PDF acceptance remains open on the existing Android WebView 113, which stays in PDF.js’s opening state. The complete direct lesson/PDF and measured-time flow passes in the production browser. Run 01 preserves the fullscreen tip and PDF-load limitation; run 02 preserves a startup-asset readiness race in the test; run 03 corrects startup waiting and limits native acceptance to Hanon/header/data retention. No drawing or engine shim is used.

The initial pre-header-fix APK/AAB and their native-install evidence remain preserved. They were not published. The final handoff uses only native-final-install/ and the final artifact manifest. Physical-device acceptance remains separate.
