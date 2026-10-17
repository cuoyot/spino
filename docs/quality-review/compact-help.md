# Short explanations and optional information

Decision D-060, 2026-10-17. The owner requests less explanatory commentary across the app, with + Info where detail is useful. The objective is accepted. The implemented layout uses explicit, selected explanatory blocks; it does not automatically hide text by length.

| Surface | Change | Kept visible |
| --- | --- | --- |
| Recording review/playback | Remove offline/Drive/JSON paragraph | Player, title, save/discard/delete/close and errors |
| Recording copies | Move account/copy background explanation to + Info | Mobile-data permission, transfer status/progress and actions |
| Sync management and notebook picker | Fold technical, background and recovery explanations | Account/notebook selection, automatic switch and disconnect consequences |
| Downloads | Fold browser-network and edition background detail; shorten counts | Network setting, available/missing counts, jobs, errors and actions |
| Profile editing/reminders | Fold level-default and deferred scheduling detail | Editable fields, permission state, reminder action and normal guidance |
| Repertoire/technique progress | Fold interpretation/method explanations; shorten empty guidance | Stages, practice totals, comparisons and next actions |
| Backup export | Fold portable-content/format background and shorten compatibility explanation | Format selector and required format-2 compatibility confirmation |

Home, calendar, routine building, practice preparation/session instructions, instrument pairing and explicitly opened warm-up/help/credits guides were reviewed in source and retain their concise operational or requested guide content. User-entered notes, titles and musical content are unchanged. Errors, conflict choices, alerts and destructive-action confirmations remain visible. The redundant progress subtitle and commentary about time versus musical mastery are removed.

The shared + Info disclosure starts closed, uses native details/summary keyboard semantics, a link appearance and a 44 px target. Background sync-card replacement preserves opened explanations and their summary focus. There is no automatic folding of arbitrary paragraphs or user data.

The production build and final focused suite pass 26 checks; one optional real acquired-score fixture test is skipped. [Seventy-seven browser frames](captures/themes/2026-10-17-beta18-compact-help-01/verification.json) verify seven changed surfaces, both themes/five layouts, closed/expanded states, keyboard access, non-overflow, preserved open state, mandatory compatibility confirmation and unchanged notebook/PDF/annotations. The final recording and mobile-data browser suites also pass. Native-emulator and public delivery evidence are recorded separately in the beta18 release manifests; physical Google/cellular acceptance remains separate.

The owner has authorized website publication during this follow-up. Beta17 was already published with the caption/network changes; beta18/build71 includes this final copy review. Earlier source-only/no-APK statements record preceding stages. Preview: http://127.0.0.1:5294/?review=media-network (disposable simulated Google Drive, responsive browser).
