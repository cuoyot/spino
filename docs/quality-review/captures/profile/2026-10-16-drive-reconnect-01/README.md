# Drive setup and Google account reconfiguration — 2026-10-16

This is responsive browser evidence using disposable synthetic notebooks and simulated Drive/native adapters. No personal notebook or Google account is used. The exact HTTP failure on the owner’s physical devices remains unconfirmed.

- Production web build passes; 48 focused notebook, cloud, browser and locale checks pass. The two account tests pass again after final copy/capture refinements.
- The fixture distinguishes metadata and media ETags. Before the download correction, 9 of the existing 10 adapter tests failed under this model. After correction, all 12 adapter tests pass, including bounded retry, cache safety, conditional writes, second-device joining and incomplete-file resumption.
- Failed migration and cancelled selection both offer Manage and Disconnect Google account. Browser checks retain exact serialized local notebook data, the previous provider link and remote files. Returning to Connect starts configuration again. Errors remain visible and translated.
- 28 frames include phone/tablet portrait/landscape for the overview, picker, connected, copy export, offline, failed-setup management and disconnected-account states. The short landscape management frame scrolls to expose the new disconnect control.
- Android app unit checks: six pass. The local APK contains 260 web files matching dist byte-for-byte. Version remains beta12/build65; this review APK has not been published.

[Validation and source/build hashes](validation.json). [Main browser flow and source hashes](verification.json). Native evidence is tracked separately in the active cloud review. The first native attempt timed out on an unresponsive emulator before installation; the emulator was restarted without wiping its storage. Earlier baselines are preserved.

[Successful native review](../2026-10-16-drive-reconnect-native-04/native.json) confirms replacement install, foreground activity, original logical-store equality and 21 immutable blobs matching the prior beta12 evidence. Earlier stalled/racing attempts remain recorded separately.
