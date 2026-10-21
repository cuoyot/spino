# Plan your practice

Calendar offers Week and Month views. Use the arrows to browse dates and the current-week/day action to return to today. Month view has a compact month heading, for example **October 2026**. Week view omits the month heading: each week shows its own date range. Scroll down to keep loading later weeks without changing pages. **Week/Month** and **Plan your week** share one toolbar inside the page, in the same position in both views. In Week, the arrows sit beside the first date range; tap that range to return to the current week. Month keeps its own month arrows and **Today** action. The app header contains the page title and connection indicators.

Saved practices use the same cards as **Progress → Activity → History**, work history and Today: title, date, local score thumbnail or activity icon, activity badges, optional mood with its label, duration and instrument/manual context. Partial practice remains labeled. Select the card to open its results, comments, next step and editing actions. Durations use hours and minutes from one hour upward.

Swipe sideways when a day has several saved practices; the scrollbar is hidden. Keyboard users can focus the row and use arrow keys, or tab through sessions. **+ Add** stays outside the scrolling row, below cards when space is narrow. Fine lines distinguish adjacent days. Month selected-day sessions use the same cards and scrolling treatment. A completed plan and its result occupy one card on the practice date; a moved plan keeps its result on the actual practice date. A completed plan's detail dialog also shows its saved result with the shared card.

Choose **+ Add** in a weekly day to plan practice, record a completed practice or add an event on that date. Planned practices and events retain their detail/actions.

Available in Android beta 12/build51. Responsive Chromium verification covers both themes, phone/tablet orientations, 320px layouts and durations through 720 minutes. Emulator replacement installation, data retention, version and foreground are verified separately. Physical-device gesture/visual acceptance remains open. The iOS Simulator download remains beta 9 and does not yet include these calendar refinements.


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
