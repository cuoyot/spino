# Drive storage and complete backups — 24 October 2026

26 October 2026 D-071 follow-up: the owner rejected D-070 layouts and replaced the automatic-backup wizard with direct settings. New configurations default to local disk; principal takeover, separate Drive folder and notebook/date names are explicit. Manual save/restore stay on the main page. Recordings follow the first successful notebook check, without a second routine sync button; multimedia + Info is removed. Revised responsive evidence: [settings review](captures/profile/2026-10-26-sync-backup-settings-11/README.md). Layout acceptance remains open. Native [local ZIP/retention evidence](captures/profile/2026-10-26-automatic-backup-native-08/README.md) and [live phase evidence](captures/profile/2026-10-26-automatic-backup-progress-11/README.md) are separate from physical Google acceptance. 80 focused JavaScript checks, six final responsive browser checks, 15 Java checks and one native archive instrumentation test pass. Unreleased; public beta.3 remains unchanged.

26 October 2026 D-070 source follow-up: Sync & backups now groups multimedia inside cloud synchronization and all ZIP/automatic archive controls inside Backups. Android ZIP save uses CREATE_DOCUMENT rather than sharing. [Responsive review](captures/profile/2026-10-26-sync-backup-sections-01/README.md). This is an unreleased review build; published beta.3 remains unchanged. Native/provider acceptance is recorded separately.

26 October 2026 follow-up (D-069): distinct cloud synchronization, ZIP backup and JSON export/import wording, plus verified-settings gating for startup setup notices. [Responsive synthetic evidence](captures/profile/2026-10-26-sync-copy-03/README.md). Beta.3 packaging/publication is tracked in `../releases/6.1.6-beta.3.md`; physical Google timing remains unverified.

Owner approved the synchronization/storage preview and requested a website beta. Implemented folder/file setup, a principal device, seven changed daily snapshots, remote recording placeholders and manual cellular downloads, a one-time settings review prompt, complete ZIP export and separate local recovery.

Migration preserves the existing notebook/object IDs. The existing data folder remains intact beneath the selected folder; Multimedia and Copias group recordings and verified archives. Old clients still use the same notebook. Media discovery relocates legacy-client uploads to the configured media folder. Retrying setup reuses marked child folders. No original Drive folder was modified during testing.

Validation: 109 focused automated tests pass. Eight website tests pass. Android assembleDebug, bundleRelease and testDebugUnitTest pass. Browser review uses a synthetic storage manager for native-only Drive controls and the actual application for ZIP export. These are browser checks, not physical Google Drive acceptance.

With the owner's permission, a private local Drive notebook was reconstructed from 356 content objects and 89 commits: 29 sessions, five works, four events and eight assets, no merge conflicts. ZIP round-trip preserves sessions, events and assets exactly. Existing backup normalization supplies local theme and Wi-Fi preferences. An older JSON backup with 13 sessions and six assets also round-trips. Neither sample has linked event recording references; this does not prove physical two-device media transfer. Private data is excluded from source, release files and public captures.

Beta limits: automatic checks run with the application open; archives are limited to 250 MB. Incomplete recordings or checksum failures block complete backup creation. Real two-device Google Drive, physical 5G and background scheduling remain outside this beta's verified scope.

A broad test attempt passed 376 tests, skipped three and encountered 148 browser-listener sandbox failures, five missing sparse site fixtures, and one unrelated timezone-sensitive lesson reminder assertion. Focused feature tests and rebuilt-site tests are the release gates; do not claim the full suite passed.

Connection feedback follow-up: the notebook picker now shows animated activity, real connect/list/compare phases, comparison count and elapsed seconds. After ten seconds it explains that Drive/network/notebook size can extend the wait. Closing the dialog suppresses late picker/error reopening and skips subsequent comparison requests, without claiming cancellation of the active native request. Fourteen existing Drive/recovery tests pass; a synthetic browser preview validates copy and layout. Actual phone latency remains unmeasured. Source-only fix, not included in the published beta APK.

## Beta.3 follow-up

Fast metadata reads and deferred PDF hydration, bounded parallel native requests, retry/elapsed feedback, local recovery before opening a remote notebook without merging, explicit legacy conversion confirmation and guarded device reset are implemented in beta.3 (102). See captures/profile/2026-10-24-sync-fast-beta3/README.md for synthetic validation and acceptance limits. Conversion is no longer implicit: the exact selected old file requires confirmation that every device has updated and synchronized. The owner's stable file remains untouched.

## Folder setup failure follow-up

A synthetic Drive transport returning 404 for the selected folder's inaccessible My Drive ancestor reproduces the owner's beta.4 error verbatim. Ancestor traversal now permits only that missing optional ancestor; selected folders and notebook resources remain mandatory. Permission errors still stop setup, visible descendants are rejected, and Drive remains responsible for rejecting any cycle beyond the visible ancestry boundary. The real incremental adapter is exercised by the storage regression; no personal Drive data is changed. Retry reuses child folders and retains notebook/object IDs. Physical Google Drive acceptance remains pending.


## Beta 6.1.6 follow-up

Bounded optional compressed segments replace the single checkpoint acceleration path without changing the connected notebook or original commit/object files. 86 focused protocol/indicator tests and two responsive spinner tests pass. Stable 6.1.5 interoperability is checked against its frozen adapter; unavailable or corrupt acceleration falls back to verified originals. Native replacement installation preserves 135 IndexedDB file hashes and launches the exact APK. This does not compact history. Physical Google/two-device acceptance remains open. See `../releases/6.1.6-beta.1.md` and the dated profile evidence.


## Unreleased manual-check follow-up — 26 October 2026

Owner beta feedback reproduces unnecessary manual inventory/local export and a recording-check status left active after ineligibility. Source fixes and synthetic protocol/browser validation are in `captures/profile/2026-10-26-manual-sync-01/README.md`. The panel now distinguishes known wait blockers without weakening adoption guards. Physical Google timing remains unmeasured; no new APK/publication is claimed.


## Beta.2 release packaging

The 26 October manual-check follow-up is packaged as 6.1.6-beta.2 (108). Native replacement installation, foreground activity, 135 preserved IndexedDB hashes and exact packaged web bytes pass. The live Google timing remains owner acceptance work; public release evidence is recorded in the versioned reports.
