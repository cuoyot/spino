# Signed stable Android handoff — October 15, 2026

SPino 6.0.0/build53, production package `com.miguecoll.spino`, signed with the owner-supplied existing key. APK/AAB signatures and all 259 packaged web files per artifact are verified. Installed with `adb install -r` on the existing emulator without clearing storage. The production package was absent before this installation; the separate beta notebook retains all seven IndexedDB file hashes. This verifies first stable installation, not a Google Play upgrade.

The production activity is confirmed in the foreground. `native-loaded.png` shows the first-launch walkthrough above a fresh empty notebook after WebView loading. No personal notebook is used as a fixture. Populated phone/tablet/theme/header evidence remains in the responsive-browser review and Play screenshot pack. Physical-device acceptance and Google Play distribution remain separate.

Metadata records artifact sizes/hashes, public signing-certificate fingerprint, installed version and foreground activity. Passwords and private keys are excluded.
