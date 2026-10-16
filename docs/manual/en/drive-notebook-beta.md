# Google Drive notebook and recording copies (Android beta)

Android beta12 uses one Google Drive connection for the notebook, scores and saved audio/video copies. Profile → Backup & sync shows the Google account and notebook explicitly. Use the same Google account on both devices. Google OAuth test users may still be required while the Google project is in testing.

## Connect the first device

Finish practice and close editors. Open Profile → Backup & sync → Connect Google Drive. Sign in, select this device’s notebook, and press **Connect selected notebook**. The selected radio choice shows what will be connected; Cancel closes the selection without creating or moving a notebook.

An old provider-file connection is paused. Its automatic synchronization and connection menus are retired in this beta. Connect Google Drive to move it. SPino keeps the previous file, local data, stable notebook/record IDs, PDFs, annotations and local recovery copy. If that notebook already exists in the selected Google account, choose it to retain its identity and merge history. Independent edits combine; overlapping edits require review. No old file is deleted.

## Connect the second device

Open Backup & sync, connect the **same Google account**, select the existing notebook and confirm. Do not create a second notebook when the first device has already connected it. An optional notebook QR narrows the list; it does not grant Google access. A connected notebook must be disconnected before selecting another identity. Reconnect in Manage renews access for the same account.

The overview says Connected to Google Drive when the notebook is connected, and shows its account and notebook name separately. Paused or error states remain visible. An account may be authorized while no notebook is selected; that is still shown as Not connected.

## Reconfigure the Google account

Android beta13 adds Manage whenever an account is authorized, including after cancelled or failed notebook selection. Choose **Disconnect Google account**, then **Connect Google Drive** to start account selection again. This disconnects SPino on this device and keeps the local notebook, recordings, recovery and Drive files. A paused previous file connection and its merge baseline are preserved after failed migration. It does not revoke Google's existing permission grant. Disconnecting an already connected notebook uses the existing confirmation.

Setup errors remain visible in Manage. A revision conflict can distinguish downloading, uploading and finalizing the connection. Retry after another device finishes its update; local notebook data is kept. These changes are verified with simulated Drive/browser checks; real account selection and two-device copying need physical verification. This follow-up is included in beta13/build66.

## When synchronization runs

Saved notebook edits upload shortly afterwards (about 1.5 seconds when eligible). SPino checks for changes from the other device every 30 seconds while open. An unchanged check keeps the existing card and controls mounted. Incoming notebook changes wait for practice, editing and dialogs to finish.

Manage can pause automatic synchronization or disconnect this device. Local saves continue. Errors keep local data and show connection details; reconnect the same Google account when permission expires.

## Audio and video copies

Saved takes linked to works in the connected notebook are copied through that same account. The copies preserve recording and work IDs, title at upload, creation date, duration, kind and verified file bytes. Drafts and recordings bound to another account/notebook are excluded. Media copies wait for practice, recording, editors and other transfers to finish. They respect the device’s network preference and pause when SPino goes into the background. Interrupted uploads/downloads retain progress for retry.

Audio and video copies shows progress and any transfer error independently of notebook status. Copy recordings now checks the notebook and runs the copies when eligible. After a verified download is saved in local media storage, play it from Library → Multimedia without an internet connection.

Copies are additive. Deleting a local take keeps any existing Drive copy and prevents automatic redownload on that device. Other devices keep their copies. Title edits after copying remain local to each copy. Use Google Drive itself to manage remote files. Local notebook restore/merge does not delete recordings.

## Local copies and offline use

Export file, Restore file and Convert a copy remain in Backup & sync. JSON copies include repertoire, history, plans, scores, annotations and notebook preferences; audio/video binaries remain separate. Practice and play downloaded/local recordings offline. Manage → Restore local recovery copy reviews the snapshot before incoming synchronization. Disconnect keeps local notebook data, recordings, recovery and Drive files. Explicit Erase notebook removes local notebook data and recordings.

## Verification status

Synthetic protocol/browser checks cover first/second-device connection, migration/cancel/reconnect, concurrent edits, no-change polling, recording-copy integrity/resumption, network policy and offline playback. Native checks verify actual menus, account guards, transfer-cache readback and original notebook/media retention. Real Google authorization and copying on the owner’s physical devices remain separate acceptance checks. The earlier isolated transfer test has been removed from beta12.
