# Drive storage and complete backups — 24 October 2026

Owner approved the synchronization/storage preview and requested a website beta. Implemented folder/file setup, a principal device, seven changed daily snapshots, remote recording placeholders and manual cellular downloads, a one-time settings review prompt, complete ZIP export and separate local recovery.

Migration preserves the existing notebook/object IDs. The existing data folder remains intact beneath the selected folder; Multimedia and Copias group recordings and verified archives. Old clients still use the same notebook. Media discovery relocates legacy-client uploads to the configured media folder. Retrying setup reuses marked child folders. No original Drive folder was modified during testing.

Validation: 109 focused automated tests pass. Eight website tests pass. Android assembleDebug, bundleRelease and testDebugUnitTest pass. Browser review uses a synthetic storage manager for native-only Drive controls and the actual application for ZIP export. These are browser checks, not physical Google Drive acceptance.

With the owner's permission, a private local Drive notebook was reconstructed from 356 content objects and 89 commits: 29 sessions, five works, four events and eight assets, no merge conflicts. ZIP round-trip preserves sessions, events and assets exactly. Existing backup normalization supplies local theme and Wi-Fi preferences. An older JSON backup with 13 sessions and six assets also round-trips. Neither sample has linked event recording references; this does not prove physical two-device media transfer. Private data is excluded from source, release files and public captures.

Beta limits: automatic checks run with the application open; archives are limited to 250 MB. Incomplete recordings or checksum failures block complete backup creation. Real two-device Google Drive, physical 5G and background scheduling remain outside this beta's verified scope.

A broad test attempt passed 376 tests, skipped three and encountered 148 browser-listener sandbox failures, five missing sparse site fixtures, and one unrelated timezone-sensitive lesson reminder assertion. Focused feature tests and rebuilt-site tests are the release gates; do not claim the full suite passed.

Connection feedback follow-up: the notebook picker now shows animated activity, real connect/list/compare phases, comparison count and elapsed seconds. After ten seconds it explains that Drive/network/notebook size can extend the wait. Closing the dialog suppresses late picker/error reopening and skips subsequent comparison requests, without claiming cancellation of the active native request. Fourteen existing Drive/recovery tests pass; a synthetic browser preview validates copy and layout. Actual phone latency remains unmeasured. Source-only fix, not included in the published beta APK.
