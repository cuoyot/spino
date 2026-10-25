# Google Drive notebook and recording copies (Android beta)

Android beta14 uses one Google Drive connection for the notebook, scores and saved audio/video copies. Profile → Backup & sync shows the Google account and notebook explicitly. Use the same Google account on both devices. Google OAuth test users may still be required while the Google project is in testing.

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

Saved notebook edits upload shortly afterwards (about 1.5 seconds when eligible). SPino checks for changes from the other device every 30 seconds while open. An unchanged check keeps the existing card and controls mounted. Incoming notebook changes wait for practice initialization, active practice, editing and dialogs to finish.

Starting practice uses the notebook already saved on this device and does not wait for a Drive check. Slow, offline or failed synchronization does not require **Continue locally** before starting, and starting practice does not pause automatic synchronization. When practice is saved and the app can apply incoming changes safely, pending synchronization continues; overlapping edits still require review. This behavior is verified in the 2026-10-17 browser follow-up and included in Android beta16/build69. Physical two-device Google acceptance remains open.

Manage can pause automatic synchronization or disconnect this device. Local saves continue. Errors keep local data and show connection details; reconnect the same Google account when permission expires.

## Incremental notebook format (beta14)

Update both Android devices to beta14/build67 before syncing again. A previously connected Drive JSON notebook migrates automatically on synchronization. SPino first saves a local recovery copy, transfers and verifies separate records and score pieces, and only then activates the new notebook. The previous JSON file's content and name are retained; its connection marker becomes an archive pointing to the new notebook. Older app versions stop syncing that file. Interrupted migration resumes verified transfers; a concurrent old-format edit blocks activation until it has been reread.

New synchronization stores immutable, checksummed objects inside a dedicated SPino notebook folder in Drive. Keep that folder intact. Works, sessions, plans, preferences and annotations travel as changed records; score bytes travel separately in bounded pieces. A note edit does not resend the PDF. Saved audio/video still uses the separate resumable recording-copy system below. JSON export/restore/conversion remains a complete portable copy.

Retries retain allocated file IDs and verify accepted content before creating another operation. Concurrent independent edits merge; overlapping edits and delete-versus-edit require review. Without changes, each 30-second notebook check reads only the small Drive changes response, with no upload or notebook/score download. The verified cache survives app restart and ordinary account disconnect. Initial connection/migration and joining on a new device still transfer the necessary notebook content once. HTTP/authentication overhead and separate media-copy checks still consume some network data.

Immutable history is retained in this beta; automatic history compaction is not implemented. Never delete change/object files to save space. Protocol/browser checks are synthetic and do not establish real Google or physical two-device acceptance.

## Audio and video copies

Local review follow-up, 21 October 2026 (same-version beta8/build84 review APK; not the published beta8): a recording with rejected Drive metadata or an integrity/identity problem is listed by title and reason while independent valid copies continue. The status separates completed copies from recordings needing attention. **Retry recording copies** retains completed copies and checks pending files again; it does not delete local recordings or replace invalid remote files. Supported recordings with quoted codec parameters are accepted. **Recording copies are up to date** appears only after the check completes without unresolved errors. The global synchronization indicator keeps the attention state while recording issues remain. Browser tests use synthetic Drive; native checks establish installation and data retention, not copying against a real Google account.

Saved takes linked to works in the connected notebook are copied through that same account. The copies preserve recording and work IDs, title at upload, creation date, duration, kind and verified file bytes. Drafts and recordings bound to another account/notebook are excluded. Media copies wait for practice, recording, editors and other transfers to finish. They respect the device’s network preference and pause when SPino goes into the background. Interrupted uploads/downloads retain progress for retry.

Audio and video copies shows progress and any transfer error independently of notebook status. Copy recordings now checks the notebook and runs the copies when eligible. After a verified download is saved in local media storage, play it from Library → Multimedia without an internet connection.

Copies are additive. Deleting a local take keeps any existing Drive copy and prevents automatic redownload on that device. Other devices keep their copies. Title edits after copying remain local to each copy. Use Google Drive itself to manage remote files. Local notebook restore/merge does not delete recordings.

## Local copies and offline use

Export file, Restore file and Convert a copy remain in Backup & sync. JSON copies include repertoire, history, plans, scores, annotations and notebook preferences; audio/video binaries remain separate. Practice and play downloaded/local recordings offline. Manage → Restore local recovery copy reviews the snapshot before incoming synchronization. Disconnect keeps local notebook data, recordings, recovery and Drive files. Explicit Erase notebook removes local notebook data and recordings.

## Verification status

Synthetic protocol/browser checks cover first/second-device connection, migration/cancel/reconnect, concurrent edits, no-change polling, recording-copy integrity/resumption, network policy and offline playback. Native checks verify actual menus, account guards and transfer-cache readback. The beta14 emulator has an empty original logical baseline following the previously recorded beta13 WebView corruption, so this run does not establish preservation of that earlier notebook. Real Google authorization and copying on the owner’s physical devices remain separate acceptance checks. The earlier isolated transfer test has been removed from beta12.


2026-10-17 source follow-up D-056: production build and 62 focused checks pass. Twelve responsive-browser frames in `docs/quality-review/captures/preparation/2026-10-17-local-practice-start-02/` use disposable notebooks and simulated stalled/offline Drive, including a valid late second-device change, retained saved practice/PDFs/annotations and automatic sync remaining enabled. Native/physical-device acceptance remains open; no new package or publication.


Android beta16/build69 includes these 2026-10-17 follow-ups. Final source passes 117 focused checks, 3 website checks and 7 Android unit checks. See `docs/releases/6.1.0-beta.16-validation.json` and the accompanying publication manifest for package hashes, emulator installation, retention scope and verified public delivery. Browser recording evidence uses synthetic streams; native emulator camera/rotation evidence and physical-device acceptance are identified separately.


## Reviewing overlapping changes

New practices have separate stable identities and combine automatically, including offline practices from both devices. When another value overlaps, Review changes lists the independent practices that will be retained and shows Here/Cloud values for each conflicting field. For example, two practices of the same shared plan can conflict over which one is linked to that plan, while both remain saved in History. Prefer this device for conflicts or Prefer the cloud for conflicts applies only to the overlapping values, retaining independent fields and records. Closing the review makes no selection.

Changes to an already-reviewed conflicting value require another review. Unrelated new practices or regenerated local catalogue reports do not invalidate that choice. Catalogue import diagnostics stay on their device and in complete manual JSON copies. Existing incremental report-only conflicts can clear automatically; repertoire, practices, files and annotations retain their identities. Update both devices to the version containing this correction before retesting the same notebook.

## Recording network permission (Android beta17)

In the updated source, open **Profile > Backup & sync > Audio and video copies** and enable **Allow mobile data for recordings** to copy audio/video using Wi-Fi or mobile data. Turn it off to wait for unmetered Wi-Fi. The choice is saved on this device and does not change score-download settings or the other device's permission. Before the first explicit choice, recordings retain the existing network preference. An internet connection is still required for copying; local recordings remain playable offline.

Included in Android beta17/build70. Browser/fixture verification covers uploads and downloads over a simulated metered mobile network, persistence and unchanged score-download settings. Actual cellular/Google acceptance remains separate. Publication and package verification are recorded in the beta17 release manifests.

Android beta18/build71 keeps optional explanations behind **+ Info**. Open it to read the detail and close it to return to the compact view; keyboard users can focus the link and press Enter. Recording review no longer shows the paragraph about offline playback and JSON exports. Transfer state, permissions, errors, data and required compatibility warnings remain visible.


## Pending practice and connection recovery

From beta22/build75, a running, paused or unfinished practice stays on its own device. Finishing the practice saves it to completed history, which then synchronizes when connectivity and synchronization policy permit. Repertoire, scores and annotations continue to synchronize. Full manual JSON exports still include that device's pending practice. A paused phone practice can remain available to continue while newly saved tablet history arrives from navigation screens. Incoming updates wait while practice is running, a practice/score screen is open, or editing/recording is in progress.

Synchronization shows the current phase and a **Pause synchronization** action. Pause retains local work and pending transfers. Resume automatic synchronization and use **Sync now** to retry. Each request has a bounded wait. Transient incremental transfers retry safely; reopening the app can check again after connectivity recovers. Account permission and genuine overlapping edits still require attention. **Last checked** records a successful check even when the last changed notebook time is older.

Old conflicts concerning only the shared current-practice slot can clear after a fresh read with the updated version. Other conflicts continue to show the values requiring review. Update both devices to the version containing this correction; keep the phone's pending practice available locally. Browser/fixture and Java-unit checks are complete; physical Google/two-device acceptance remains open.


Beta22/build75 packages the behavior above. Update both devices before testing a pending phone practice alongside completed tablet history. Synthetic browser checks and native installation/retention pass; actual Google authorization and owner-device acceptance remain pending. See `docs/releases/6.1.0-beta.22-validation.json`.

## Notebook recovery and duplicate names (6.1.2-beta.1)

Open Backup & sync → Manage → Rename Drive notebook to rename the connected Drive descriptor. The file and notebook identities, sessions, scores, annotations and recordings are retained. Give the original tablet's notebook a distinctive name before reconnecting another installation. In beta.6, connected devices refresh the verified descriptor name through the changes feed; renaming is not a new notebook or a merge operation.

When more than one notebook is offered, the chooser compares saved session count, practice this week, latest practice date, work count, weekly goal and sessions absent from the other available copies. The file reference distinguishes equal names. These are summaries, not a claim that equal counts mean identical content. No option is preselected when there are multiple matches. Failed content checks remain visibly unavailable; they are not shown as empty notebooks.

New QR codes identify the exact Drive file as well as the logical notebook. Updated readers filter by both. Older stable readers retain their earlier behavior; select the distinctive renamed notebook explicitly. Showing a connected Drive QR does not start a data refresh that could reload and dismiss the dialog. First connection and Sync now inventory existing changes in addition to polling the changes feed.

Save a local copy is available in Manage and through Export file. Export from the installation that contains the wanted practices. Beta and stable have separate native storage even on one device; each exports only its own notebook. Filenames include channel, version and a timestamp. JSON includes history, scores and annotations, but not audio/video binaries. Restoring replaces the notebook in the app where Restore is used and disconnects that app's synchronization; it does not replace the other installed channel's notebook. Export both notebooks before a manual restore if both contain wanted local changes.

Verification uses disposable synthetic notebooks in browser portrait/landscape layouts and protocol tests. The owner's real duplicate Drive files and unsupported recording metadata remain uninspected; no remote file is deleted or automatically combined by the comparison screen.


## Beta.3 connection and recovery

History and settings arrive before score downloads. A score marked “In Drive” downloads when opened; the confirmation allows mobile data. Opening an existing notebook offers “Add my data” or “Open without adding them”. The latter first retains a verified complete local ZIP, accessible from Profile. Restoring a complete ZIP opens a separate notebook. Storage management exposes the latest seven changed daily backups, the principal device, and a guarded reset that retains a complete recovery archive before clearing this installation. Daily checks run while Spino is open; complete archives have a 250 MB beta limit.

Converting an old Drive file requires confirming that Spino is updated on every device and all their changes are synchronized. Keep older devices disconnected until updated. Updated devices follow a verified migration redirect. The original file is retained for recovery.

## Beta.6 setup, identity and recording recovery

Backup setup waits for the current notebook synchronization and media operation, then reserves the short storage operation so automatic polling cannot race its requests. Its wait dialog shows elapsed time and available notebook progress; closing before activation prevents any storage writes. Name, chosen Drive folder link and the descriptor reference are visible on Backup & sync, Manage and the notebook picker. Match the same account and reference on both devices; identical old names or logical notebook IDs do not establish the same Drive connection. No duplicate notebook is merged automatically. When organizing under another folder, only the app-owned internal data folder may adopt the notebook name; selected user folders retain their names.

MP3 and recognized audio MIME aliases are supported. A legacy invalid remote MIME label can be handled using private Spino format metadata only when the exact local original is available and the remote identity, size, checksum and downloaded bytes verify against it. The file ID and bytes are retained. Without that original, unrecognized formats remain blocked rather than guessed; independent recordings still synchronize. Complete ZIP creation uses the same verified repair path. An unresolved failure names the affected recording; no incomplete archive is reported complete. These paths pass synthetic two-device and ZIP round-trip checks. Physical Google Drive acceptance remains pending.
