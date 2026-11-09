# Plan your practice

Calendar offers Week and Month views. Week opens at the current week and continuously loads complete, expanded weeks as you scroll upward or downward. Each rounded week panel shows its date range, week number, saved minutes practised and existing planned minutes. The current week has a blue heading. No practice percentage is displayed. Week/Month and Plan your week stay available in the page toolbar. A floating Today button appears when you move away from the current week; select it to return. Month retains its existing arrows and Today action.

Each weekly day has a single horizontal row containing its planned practices, saved practices and events. Cards show an activity icon, title and duration or existing event information; saved practices show their completed/partial state. Part of the next card remains visible when more entries exist. Swipe sideways or tab through entries; selecting a card opens its full existing detail. Saved summaries are the compact variant of the shared saved-session component; full results, optional mood, comments, instrument context and editing remain in the detail. Other saved-card contexts and Month retain their complete shared-card presentation.

Choose + Add beside a day to plan practice, record completed practice or add an event on that date. Pending practices keep their keyboard/drag move handle; open their detail to start, edit, reschedule or delete them. A completed plan and its result occupy one saved card on the practice date; a moved plan keeps its result on the actual practice date.

The 7 November 2026 design is a responsive browser review with synthetic notebook data, not a published release or native-device acceptance. Owner review of the snapshots precedes APK preparation and website publication.


## Complete a lesson

In a Lesson appointment, choose **Complete lesson**. Enter the actual date and duration, then optionally add a rating, comments, selected repertoire pieces and a next step. Save adds one result to your history and marks that appointment completed. **Edit completed lesson** updates the same result. The original plan and the other lessons in a recurring series stay independent. Deleting the saved result makes the appointment pending again.

Before completing a lesson, choose **Practice score** beside a linked score to open practice with its clock running. Stopping or leaving the score returns to the lesson directly. Each piece keeps its own accumulated time when reopened. Completing the lesson saves those measured times in the pieces' practice history; any additional lesson duration is saved as unassigned time. Merely selecting a piece does not assign time to it. **Scores worked on** opens the selected repertoire entries and their available scores.

Direct lesson score practice is verified in the source/browser build on 2026-10-20; native-device acceptance remains open.

Under **Teacher recordings**, choose **Associate recordings** to link saved audio/video, or **Record teacher** to make a new take. Saving a take from the lesson links it automatically. You can play or share it from the lesson or its saved result. Unchecking a recording removes only its association. An unavailable local recording retains a placeholder; recordings keep the existing separate recording-copy policy.

These lesson additions are currently verified in the source/browser review after Android beta20/build73 and are not yet included in a new published APK. Responsive checks use a disposable notebook and synthetic microphone; native and physical-device acceptance remains open.


Release follow-up: D-064 is packaged in website Android beta21/build74. Final responsive checks use the production web build; replacement installation retains the current emulator notebook and original blobs and confirms the app is in the foreground. Publication/download verification is tracked separately in the release record. Physical-device lesson capture and owner visual acceptance remain open.

## Set an event time

In **New event** or **Edit event**, choose the hour and minute from the two **Time** lists, using the 24-hour clock. `00:00` is midnight. Choose `--` for the hour to leave the event without a time. A reminder requires a time. Saving and reopening keeps the chosen hour and minute.

This correction is verified in responsive browsers and the Android emulator and included in a local beta22/build75 review APK. It is not yet in the published beta22 download; physical-device acceptance remains open.

The unfinished-session card uses the same design on Today and Practice and is also available on other browsing pages. Calendar omits this card to keep the calendar content higher on screen; the Practice navigation indicator remains visible. It shows the session title, elapsed time, context and **Resume session**. A dot on the Practice navigation icon indicates an unfinished session; it disappears when the session is saved or discarded.


2026-11-06 beta115 release: owner accepts the reviewed event/work detail cleanup. Event and work titles stay inside their overview cards, Close is inside the overview, events show a calendar date tile and weeks/days remaining. Work overview includes thumbnail-to-score opening, added date (explicitly unknown for legacy records) and saved attributed practice totals shared with event/repertoire rows. All five work overview actions are in one Actions menu. Shared saved-session design and existing notebook/assets are retained. Source/browser acceptance is recorded in the new dated event and repertoire evidence; native/release verification is recorded separately in docs/releases/6.2.1-beta.3-validation.json.


Synchronization keeps the visible calendar date at its current offset when incoming cards are added above it. Previously loaded weeks and explicit navigation remain available.
