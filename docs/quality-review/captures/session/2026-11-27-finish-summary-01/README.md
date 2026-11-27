# Summary-first finishing · 27 November 2026

Accepted owner objective: finishing should review the practice and its actions; editing minutes is uncommon and should require Edit practice. The owner also retains the earlier visible compact feeling row and Save-only completion.

Local implementation: practice title, context/partial state, exact minute:second total and performed activity/piece/passage/time rows are read-only. Unplayed planned blocks are omitted. Existing notes and next step appear when present. Five feeling choices remain visible. Edit practice expands minutes, name, partial status, notes, passages, piece tagging and next step. Valid changes update the summary on change; invalid corrections retain the last valid preview and required validation opens the editor. Save, Keep practising and Finish without saving retain their existing semantics.

Preview finalization uses a validated copy, including postponed blocks. Opening the summary and changing its fields do not write the notebook or mutate active IDs/results. Untouched practice time keeps original milliseconds, rather than converting the displayed hundredth-minute value back into recorded time. Explicit duration correction uses the existing proportional adjustment. Saved-session summaries and their shared renderer are unchanged; this view belongs to the active finalization flow.

Production build and 24 focused unit checks pass. Tests compare preview to actual finalization, preserve exact time/IDs/data, apply corrected time/passages without mutating the source, escape text, exclude unplayed blocks and retain fields under a closed editor with rating outside it.

Responsive/browser/native visual acceptance is NOT verified in this run. Browser discovery/tab access reports an unavailable native pipe, native Codex app control is denied, and the supported open_in_codex API queues the review. No alternative browser or personal notebook is used. There are no new screenshot or browser-save/retry claims. Earlier beta134 evidence remains historical.

Review: http://127.0.0.1:5383/?screen=finish. Both-theme phone/tablet portrait/landscape, long translations, keyboard editor opening, direct Save without editing, changed-time Save, required-field reveal, failure/retry and Keep practising should be reviewed once browser control returns. The local server uses the retained pre-edit dist and a disposable synthetic notebook on a separate origin; fixtures and source/build hashes are in this run. No APK, version change or publication was requested or performed.

Reproduce: SPINO_REVIEW_BEFORE=/private/tmp/spino-finish-summary-before-20261127 SPINO_REVIEW_BEFORE_LABEL=beta134 SPINO_REVIEW_TITLE='Practice summary' SPINO_REVIEW_PORT=5383 node scripts/review/preview-second-batch.mjs
