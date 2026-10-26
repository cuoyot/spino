# Android automatic local archive acceptance — 26 October 2026

The existing API 34 emulator retains its notebook. Replacement installation preserves all 135 pre-launch IndexedDB file hashes; no application storage was cleared. The foreground activity was verified. See install.json.

LocalBackupArchiveInstrumentedTest passes on Android: nine synthetic ZIP files are written without a picker, each destination stream is compared byte for byte, the oldest two are removed after commit, and another notebook cannot claim/prune these archives. All test files are removed afterward. No personal notebook was used by the archive test. See automatic-local.json. The app instrumentation APK builds with :app:assembleDebugAndroidTest; an earlier root-wide Android-test build encountered unrelated duplicate Kotlin classes in the Cordova plugin test target.

Manual CREATE_DOCUMENT save/cancel acceptance is retained separately in ../2026-10-26-sync-backup-save-native-01/document-save.json. Physical Google Drive acceptance is still open. This is an unreleased review, not the public website APK.
