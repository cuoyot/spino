# First native attempt — 2026-10-16

The existing emulator stopped responding before replacement installation. `adb shell am force-stop` timed out after 30 seconds. Restarting adb exposed the emulator as offline. The same AVD was restarted without wiping data or loading a snapshot; the subsequent attempt uses `2026-10-16-drive-reconnect-native-02`. No acceptance claim is made for this run.
