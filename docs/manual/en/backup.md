# Back up and synchronize your notebook

## Connect another device

On the connected device, open Profile → Connect another device → Show my notebook QR. On the new device, open the same Profile option and choose Scan a notebook QR, or Enter a connection code. After reading the QR/code, select the indicated sync file in the same Google Drive/iCloud account. The QR does not sign you into that account or carry its credentials. SPino checks the notebook identity before retaining file access. Wait for your provider's upload to finish before connecting the other device. Camera/provider behavior still requires native-device acceptance.

## Backup formats and conversion

Both formats contain repertoire, practice history, scores and annotations. The default compatible JSON copy retains format 1. An organized format 2 copy separates notebook state, repertoire, scores, annotations and score views into sections inside one file; beta 3 or later can restore it. Older apps cannot open format 2. The export dialog requires acknowledging this before writing a format 2 copy.

Convert a backup creates a separate compatible or organized copy without restoring it or modifying its source. Restore previews the format conversion and annotation count before asking permission to replace the local notebook. Future unsupported formats require updating SPino; no data is changed. Cloud synchronization still uses format 1, so choosing an organized manual copy does not change the shared file format.

## Connect an existing file without a QR

Open Profile → Connect another device → Select an existing cloud file. Manage connection also opens Connect another device. Select the same file used by your other SPino installation in the provider's picker; stable and beta each need their own grant even on the same tablet.

A pending practice must be finished and saved before incoming data can replace its state; simply pausing preserves it. Waiting now identifies the blocking practice, visible editor, score or dialog. Closed dialogs do not block incoming sync. A reviewed conflict choice is retained while waiting, and is applied once safe; if either copy changes, SPino requests a new review. Independent records from both notebooks are kept.

## Continue locally when synchronization needs attention

Choose **Continue locally** from the synchronization check before practice, the cloud overview, or Manage connection. SPino pauses automatic synchronization on this device and keeps the selected file, notebook, scores, annotations and merge history. You can start and save practice immediately, including when the provider is still responding. The pause remains after restarting the app. Changes stay on this device until you resume synchronization.

If Android can no longer open the selected provider or its permission is lost, choose **Select the sync file again**. Open your provider and check its account first, then select the same notebook file. SPino checks its notebook identity and keeps the existing merge history, so local deletions and independent edits are reconciled when access returns. Cancelling the picker keeps the current connection. **Resume** enables the existing connection again; overlapping edits still need review.

These flows are verified with synthetic provider failures in the production browser UI. Android compilation, replacement installation, retained notebook file hashes and foreground launch are verified separately. The reported physical tablet's Drive access still requires device verification.
