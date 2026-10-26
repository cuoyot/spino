# Manual ZIP save follow-up — 26 October 2026

The owner reports a confirmed saved ZIP still offering Choose where to save, and overlapping/uneven dialog actions. Accepted objective: a completed save must leave the pending state and present a clear next action. This revised layout is a source proposal pending owner acceptance.

Provider `{saved:true}` now transitions to a distinct saved state. The main page reports Backup saved with the archive date and Prepare a new copy. Reopening cannot present the pending chooser. Cancellation retains the prepared blob; failed writes can retry without rebuilding. Browser-triggered downloads do not claim provider-confirmed completion. Preparing/error summaries also work before an archive date exists.

The nested tinted card is replaced with an inline summary. Ready actions stack with a gap; top Close is the single dismissal action in preparation/ready dialogs. The initial preparation dialog uses the same action spacing. Shared dialog and saved-session components are unchanged.

Production build and 19 focused tests pass, including real browser cancel/save/new-copy flows and the existing synchronization/settings regression. Eight final responsive captures cover prepared and saved states on phone/tablet portrait/landscape with a disposable synthetic notebook and document writer. Source hashes are recorded in verification.json. Run 01 is retained as intermediate evidence.

Interactive preview: http://127.0.0.1:5227/ (simulated completion) or http://127.0.0.1:5227/?zip=ready (simulated cancellation). No actual file is written. Browser evidence is separate from Android/native acceptance. No APK or release was built. The next check is owner visual review, followed by verification of an owner-provided real ZIP against its notebook and recordings; no personal archive was inspected in this change.
