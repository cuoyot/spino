# Automatic backup through system file providers

In Settings, choose **Cloud backup**, then choose a new backup file in the system document picker. Android can expose Google Drive; iOS Files can expose iCloud Drive and installed third-party providers such as Google Drive. The provider must support persistent read/write access. Selecting a local folder creates a local backup, not a cloud backup.

SPino does not operate a server or require an SPino account, OAuth client or API key. Sign in to the storage provider using its own application. On iOS, enable the provider in Files. Provider storage quotas and network settings still apply.

## Automatic writes and manual restoration

Backup is disabled until the user chooses a destination. Independent backup creates a separate named JSON file per installation. Shared notebook mode is separately opt-in. Successful notebook transactions schedule a backup after 30 seconds without another change. Writes wait until SPino is visible, Today or Settings is open, no practice session or editor is active, and downloads/restoration have finished. Pending changes are checked again when the app starts. This is foreground automatic backup, not an operating-system background job.

The snapshot includes notebook history, plans, repertoire, available score assets, annotations and saved framing. Device-specific destination credentials and automatic-backup preferences are not restored from the notebook. The current 60 MB JSON restore limit also applies to automatic copies.

**Saved to file provider** confirms a verified file write, not successful upload to the remote cloud. Drive/iCloud controls eventual upload, offline queuing and cellular usage. SPino's score-download Wi-Fi setting cannot control that provider upload; configure the provider separately.

Restoration is always manual and replaces the notebook after validation and confirmation. This manual restore action does not merge devices. Restoration disconnects automatic backup first so the selected external file cannot be immediately overwritten. Choose a new destination to re-enable automatic backup after restoring. Disconnecting leaves the external file intact.

## Shared notebook synchronization

Choose **Create shared notebook** on the first device. Sign in to the same provider account on the other device and choose **Join existing shared notebook…**, selecting that exact file. Account sign-in alone does not discover or link notebooks. Choose **Use independent backup instead** to return to separate device backups.

Shared mode reads the linked file every 30 seconds while foreground eligibility allows it, even when there are no local edits. It retains a private last-synchronized snapshot in IndexedDB, excluded from exported backups. A three-way merge combines independent changes by stable IDs, including works, sessions, plans, routines, score assets and annotation marks. Deletion versus an unchanged record deletes it; deletion versus a concurrent edit requires a choice. On first joining there is no common baseline, so separate records are retained from both notebooks.

Incompatible values pause automatic synchronization. The conflict list identifies affected paths; the user chooses this device's or the cloud's conflicting values. Independent changes from both remain included. If either snapshot changes before resolution, the choice must be reviewed again. Existing annotation marks, active sessions, score framing and individual score execution records are merged atomically when both sides edit them. Unkeyed arrays and legacy JSON strings require a choice when both differ. The final merged backup is validated; broken references or incompatible library records stop synchronization without replacing local data.

Before applying incoming data, the app saves a native local recovery copy. The notebook and its new merge baseline commit in one IndexedDB transaction. SPino then reloads to refresh practice settings and asset availability. An edit during provider I/O postpones local replacement until a new merge pass. Errors require an explicit retry. Switching to a shared destination pauses the old independent backup, including if the picker is cancelled.

The shared file contains the full notebook, including PDFs and annotations, with the same 60 MB limit. This is foreground file-provider synchronization, not an always-running background service. The native providers do not expose a cross-device atomic lock; simultaneous offline updates can still be subject to provider conflict/version handling. Check the provider's version history if its own reconciliation replaces a version before SPino can read it.

## Failure handling

Before replacement, the native bridge compares the file's SHA-256 with the last successful version and keeps a private local recovery copy. External changes stop backup with a conflict instead of being overwritten. A failed provider write retains the previous success metadata and offers retry, another destination or manual recovery. Disconnecting removes the private recovery copy, not the external file.

Android document providers do not provide a universal atomic compare-and-swap operation across devices. Independent backup uses a separate file for each device. Shared mode merges the latest version visible to the provider, but cannot guarantee conflict detection for simultaneous writes against stale offline provider caches. Finish synchronization and allow the provider to upload before switching devices. Provider access can expire or fail when a document is moved, deleted, read-only or the account becomes unavailable. Such failures must be resolved explicitly. Shared mode stops on incompatible edits or invalid merged data; it does not silently overwrite these conflicts.

## Platforms and development

Android uses `ACTION_CREATE_DOCUMENT` and persisted URI permissions in `CloudBackupPlugin.java`. iOS uses a document picker, security-scoped bookmarks and coordinated file access in the local `plugins/cloud-backup` Swift package. User-selected Files documents do not require an app-owned iCloud container. The browser retains manual export/import.

Build Android with `scripts/build-apk.ps1`. For iOS, use a Mac with the Capacitor-compatible Xcode version:

```sh
npm ci
npm run build
npx cap sync ios
npx cap open ios
```

Select a signing team in Xcode and test on a physical device. The initial iOS target includes the backup bridge; Android-specific native MIDI, reminders and immersive system-bar handling are not implemented for iOS. Do not infer feature parity from the presence of an iOS project.

Before release, verify creating, reopening and updating a file with actual Google Drive on Android and iOS and iCloud Drive on iOS. Include offline writes, account/permission revocation, externally modified files, interrupted writes, relaunch, annotations, restore and switching devices. Windows builds cannot validate Swift compilation, Apple signing or actual iOS provider behavior.

`node scripts/check-cloud-backup.mjs` tests the installed Android bridge. Pause practice and leave backup disconnected first. When the picker opens, save the newly named diagnostic JSON to local Downloads. The check verifies update/read-back hashes, recovery, conflict rejection, disconnect retaining the file and unchanged notebook works/assets. It leaves the small diagnostic file in Downloads. This is a local provider test, not evidence that a cloud upload completed.

Platform references: [Android document access](https://developer.android.com/training/data-storage/shared/documents-files), [Apple document picker access](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/DocumentPickerProgrammingGuide/AccessingDocuments/AccessingDocuments.html), and [enabling third-party providers in Files](https://support.apple.com/en-sa/102238).

## Validation on September 30, 2026

The shared-notebook change passed the web build and all 148 regression tests, plus a subsequent focused UI assertion. Tests include two simulated devices, offline additions, incoming-only updates, deletion propagation, annotation IDs, conflicts, repeated conflict review, local changes during reads, invalid input, independent backup debounce and backup round trips. The Android debug APK compiled and the native emulator diagnostic passed against local Downloads: creation, verified replacement, recovery, conflict protection and disconnect without deleting the file. Existing notebook works/assets remained unchanged. No Google Drive or iCloud remote upload was exercised. The iOS project synchronizes with Capacitor and the local Swift package, but Swift compilation, signing and device/provider acceptance remain unverified on this Windows workstation.

Shared-mode validation: 14 focused backup/synchronization tests passed after the final controller changes. The Android APK rebuilt successfully and was installed with `adb install -r`. `scripts/check-cloud-sync-ui.mjs` confirmed both shared setup actions, rejection of an unlinked native read, no frontend exceptions and unchanged notebook works/assets. This check did not link or exercise an actual cloud provider.

## Android picker lifecycle fix

The full JSON snapshot is staged in a private app file before launching `ACTION_CREATE_DOCUMENT`, then removed from the Capacitor call arguments. Capacitor otherwise saves those arguments in the Android activity Bundle, which is unsuitable for multi-megabyte PDF backups. Cancellation and completion remove the staged file. A native setup receipt persists the selected mode and verified destination until JavaScript has saved its configuration and acknowledges it. The receipt can be consumed after activity recreation or on the next launch.

Validation: all 153 regression tests passed with bounded browser concurrency. The installed Android emulator successfully created and read back a 3,000,029-byte synthetic backup using local Downloads, returned to MainActivity, retained the setup receipt and preserved notebook works/assets. This verifies a local provider, not Google Drive/iCloud transport. The iOS bridge includes the acknowledgement API but still requires compilation and device testing on a Mac.

The complete Profile → Choose cloud destination flow was also tested with a new local file. SPino returned from the picker, saved the enabled configuration, and kept it after a WebView reload. The diagnostic then disconnected its own local destination and confirmed unchanged notebook works/assets. Actual provider-account uploads remain untested.

## October 15, 2026 — provider recovery and local continuation

The owner's new diagnostic identifies Android's `No content provider` for a Google Drive document URI. The bridge now distinguishes missing provider, revoked permission and missing file from transient provider reads. The JavaScript controller also recognizes the earlier generic bridge error. Permanent access failures stop scheduled retries and expose a direct same-notebook file picker. Regranting access retains the three-way merge baseline, local deletions, scores and annotations; Android's setup receipt preserves that baseline across picker activity recreation.

Continue locally persistently pauses automatic work without disconnecting or clearing notebook data. It is available in Manage, the error overview and the pre-practice check, including while a provider read is pending. Late reads/failures cannot apply incoming changes or overwrite the pause; an acknowledged outbound write retains its local baseline before stopping. Practice selection and quick-practice entry continue once, and saved local progress is synchronized after explicit resume or file repair. The preflight progress dialog is excluded from editing blockers; other visible dialogs and editors retain their guards.

Dated responsive evidence and native installation records: `quality-review/captures/profile/2026-10-15-sync-local/`. The real tablet's provider/account state cannot be repaired from this workspace and remains a physical-device acceptance check.
