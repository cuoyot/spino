# Fast Drive synchronization — 24 October 2026

Source/browser validation for 6.1.5-beta.3 (102). Synthetic notebooks only. No personal Drive writes, conversion or local reset were performed.

128 focused unit tests and 8 website checks pass. Android testDebugUnitTest, assembleDebug and signed bundleRelease pass. Browser IndexedDB lifecycle verifies completed history before PDF bytes, downloaded score cache retained after sync, complete ZIP with audio, durable recovery archive and separate restoration with exact PDF/audio bytes. The actual app connects a synthetic legacy file after the mandatory update confirmation and opens it without merging local data, retaining the complete prior local notebook.

The browser capture is a component fixture, not native-device acceptance. Requested viewport overrides did not yield four distinct capture sizes; only the actual resulting browser capture is retained. Physical two-device Google Drive and 5G acceptance remain open. The emulator replacement install timed out and a package query also timed out; no wipe was requested. Native installation/foreground are not verified.

Synthetic benchmark with 89 commits: old full read 182 content GETs / 1,413,674 response bytes; checkpoint-assisted metadata read 2 content GETs / 147,221 bytes, with one score deferred. This excludes request headers, TLS and account calls and is not a measurement of the owner's Drive. Without a checkpoint, first metadata reads use bounded concurrency instead.

The source includes explicit per-file legacy conversion consent. Existing incremental clients retain their graph and immutable object IDs. An old application without a migration detector cannot be remotely updated: all devices must be updated and synchronized before conversion.
