# Initial final-version native run — 2026-10-16

Replacement installation and foreground activity succeeded, and the verifier reached its final storage comparison. Original logical stores compared equal (including content hashes). The subsequent raw physical blob-file assertion failed because a previously present file was absent after WebView activity. This run does not establish the stricter physical-file retention check; its screenshots are retained. The next run uses `2026-10-16-beta13-native-02` without clearing storage or restarting the emulator.

Subsequent logcat confirms WebView LevelDB corruption and automatic deletion/recovery, not merely removal of an orphan file. See the next run’s README and release validation; original retention across the corruption is not verified.
