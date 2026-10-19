# Stable 6.1.0 native handoff

Signed production APK, `com.miguecoll.spino`, version 6.1.0/build76. Replacement-installed over stable 6.0.0/build53 on the existing emulator, then replaced with the final corrected stable artifact. No storage clear, uninstall or wipe. Private recovery archives are excluded from the repository.

Before each launch, all original files in the production and separate beta app's WebView, files and preferences directories retained their hashes. The final replacement preserves 50 production and 167 beta files. `native-handoff-final.json` records the foreground activity and final installation. `native-loaded-final.png` shows the loaded production UI. Native installation/startup evidence is separate from responsive-browser imagery and physical-device acceptance.
