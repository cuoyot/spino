# Notebook synchronization with Google Drive (Android beta)

Android 6.1.0-beta.10/build63 adds direct Google Drive API synchronization for the notebook. Install beta11 or later on both devices. Use your own Google account; while OAuth remains in testing, the account must be listed as a Google test user. The beta9 synthetic recording test has owner-reported two-device acceptance. The owner reports beta10 working on the first device and a revision error on the second. Beta11 corrects revision handling; complete two-device acceptance remains open.

## Connect the first device

Finish practice, close editors and let the previous connection synchronize on both devices before moving it. Export a JSON copy from Profile → Backup & sync if you want an additional portable copy.

For an existing file-provider connection, open Manage → Move this connection to Google Drive. Connect Google, select Move this connection to Google Drive in the account screen, and confirm Connect notebook. SPino creates a Drive copy or reconnects an existing API notebook with the same notebook identity. It keeps the previous provider file, local notebook, scores, annotations and a local recovery copy. After a successful move, the previous provider connection is released on this device.

For a local notebook with no existing connection, open Connect → Connect with Google → Use this notebook in Google Drive → Connect notebook. Only this explicit action uploads the notebook. It does not upload personal audio/video recordings.

## Connect the other device

For a device with the same previous provider connection, follow the same Move flow using the same Google account. SPino finds the already moved notebook by its identity, combines independent changes and asks you to review overlapping edits.

For an unconnected device, open Profile → Connect another device, or Backup & sync → Connect → Connect with Google. Choose the notebook shown in your Google account. A notebook QR can narrow the selection; it does not authorize an account. Disconnect the current notebook before choosing a different one. The earlier provider connection remains available under Other connection options.

## Work offline and keep local copies

The notebook always remains saved locally. If Drive is unavailable, choose Continue locally and keep practicing. This pause survives restarting the app. Export file, Restore file and Convert a backup remain available in Backup & sync. On Android, Restore file opens the native document picker, where you can select a local JSON copy without a cloud connection. Exporting includes the complete local preferences; importing a copy remains an explicit replacement operation and disconnects automatic synchronization.

To resume, open Backup & sync and press Resume or enable Automatic updates in Manage, then use Sync now. If Google access expired or was revoked, use Reconnect Google Drive for the same account. A missing/deleted remote file is not silently replaced. Disconnecting keeps the local notebook, recovery copy and Drive file. Erase the notebook remains a separate destructive action and also removes the Android recovery copy.

## Shared and device settings

Direct Drive sync includes repertoire, practice history, planning, routines, scores, annotations and shared practice preferences. Theme and Wi-Fi download preferences remain on each device. MIDI configuration, notification permissions, Google connection metadata and personal recordings are also local.

Automatic updates run while SPino is open. Incoming changes wait until practice and editing finish. The existing conflict review is retained. A file revision is required before writing; contention triggers a fresh read and merge, and uncertain writes are never retried as blind overwrites. JSON copies and the local recovery path remain independent of successful cloud access.

## Retrying the beta10 revision error

If a second device reports “Drive did not provide a safe file revision”, update both devices to beta11 or later. On the affected device, open Profile → Backup & sync → Manage and retry Move this connection to Google Drive with the same account. Choose the existing notebook when offered. Keep the current notebook and cloud file; deleting or recreating them is unnecessary. Local practice and JSON copies remain available while the connection is paused.

The owner reports beta10 working on the first device and this error on the second. Beta11 has synthetic regression coverage; successful physical synchronization in both directions still needs owner confirmation.
