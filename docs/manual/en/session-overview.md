# Your practice session

The current-block panel shows what to practise and whether it is Ready, Paused, Practising or waiting for MIDI. Your session lists the blocks in order and highlights the current one.

## Start or resume

In short phone-landscape on-screen keyboard practice, pause/timer and tools appear on the right, with answer statistics and quick-practice points on the left. Session and Feedback stay aligned at the top; the score and taller keyboard occupy the center. Timed exercises keep tempo adjustment on the left. Portrait and tablet layouts retain their existing arrangement.

Starting a planned practice from Today opens this overview. Resuming an unfinished session returns here paused. For reading and technique, tap **Start exercise** or **Continue exercise** to enter the exercise and begin playing. For repertoire or free practice, tap **Start** or **Continue** to start timing.

A saved routine can enter its first reading or technique exercise directly when the required input is available. Returning from an exercise pauses it and opens this overview.

The on-screen piano retains ivory white keys and dark black keys in light and dark appearance. Press shading and red black-key guides remain visible. This correction is included in published website Android beta 6.1.0-beta.5/build58 and verified in responsive browsers; native visual acceptance remains pending.

Inside a generated reading or technique exercise, the compact controls stay at the top. The first row has back-to-session navigation, identifies the exercise, shows MIDI state and moves forward to the next block or Feedback. Wider layouts name the next block; narrow phones show directional arrows with the same accessible meaning. Tempo (or **No tempo**), play/pause and the settings gear occupy the second row. The gear opens Practice settings directly. Sound, guide/lights and fingering shortcuts sit at the top of Settings beside Done in every layout. Keyboard recenter is beside the detailed keyboard-position controls in the Practice tab. Elapsed practice time, correct answers, errors, streak and average response time appear in the compact status row; mobile answer feedback shares that row. The on-screen input stays at the bottom.

## Read the time

Inside a generated exercise, the main blue control uses a play triangle to continue and two vertical bars to pause. Its tooltip and accessible name describe the current action.
The same button shows total active practice time across the session. The clock freezes while paused and continues when you resume.

**This block** measures active time in the current block. **Session**, beside the heading, totals active time across all blocks. Both exclude pauses. Suggested minutes describe your intention; they are not a countdown and do not automatically advance the session.

For example, after ten minutes of technique and eight minutes of reading, the block clock shows **8:00** and the session clock shows **18:00**.

## Adapt your session

You can adjust remaining blocks directly in **Your session**:

- Drag a block's duration slider, or enter exact minutes beside it. The total previews your change; releasing the slider saves it. A shorter suggestion never removes time already practised.
- Tap the pencil to **Edit block**. Change its activity, minutes, scale or work, hands and tempo. **More settings** contains additional reading options and a focus/passage note. Available fields depend on the activity and input context. Cancel leaves the block unchanged.
- Hold a remaining block until it lifts, drag to the insertion marker and release. Moving a block ahead of the current one makes it current. A quick swipe scrolls normally.
- While holding a block, drop it into the bin that appears near the bottom to remove it. Keep at least one remaining block, or choose **Finish session**.
- Tap **Add**, choose an activity and minutes, then a scale/mode or repertoire work where relevant. The new block goes at the end; move it up if needed. Reading and technique use your profile defaults. Without a piano, only reading and technique are available.

Picking up a block pauses practice. Cancel the gesture to keep the order unchanged. You can also tap or keyboard-activate the small grip for move/remove options. Changes pause practice so you can check the new sequence. They apply to this session only; the original routine and planned block structure remain unchanged. Completed blocks stay fixed.

A started block that you move later keeps its elapsed time, answers and generated exercise. Its row shows time already practised. When it becomes current again, you can continue from that checkpoint. Removing a started block keeps its performed work in the saved session; ending early also retains work from postponed blocks.

Changing only the suggested minutes keeps your position in the exercise. Changing its musical settings keeps earlier practice under its original settings and starts the revised exercise fresh. The session's total time is preserved.

If saving a change fails, the original sequence remains available in pause. Retry the change after resolving the storage problem.

## Warm up

Piano and MIDI sessions start with a Hanon warm-up unless it is switched off in Practice preferences. The warm-up is a set of exercises from Hanon Nos. 1–10, played one after another without a break: each one goes one octave up and back, then the next starts on C. The number of exercises fits the warm-up minutes (at least two). Each session starts the set one exercise later, so consecutive warm-ups share all but one exercise. A fixed exercise in Practice preferences plays on its own.

**How to play** shows one exercise at a time with **Exercise 1 of 3** and links to the others. The hand demonstration covers the complete ascending and descending pattern on a fixed keyboard: blue pressed keys belong to the left hand and orange keys to the right. Choose **Play**, **Slow**, **Next note** or drag the position slider to inspect the movement. The demonstration uses the block's selected hand mode and starts paused. Its fingering rows follow the current passage. Released fingers gather and prepare while the playing finger stays on its key, then the spaces between fingers reopen gradually. The wrist follows, advancing slightly toward the back of the keys when the thumb needs room. While playing the score, the reader names the current exercise, for example **Hanon No. 4 · 2/3**. From rhythm level 2, each exercise starts 4 BPM faster than the previous one; the set starts again at the first tempo. **Edit block** can switch between the set and a single exercise.

## Practise with a piano or score

Free practice opens its own workspace from the session's blue icon/time button. The large play/pause control shows time spent on the current block. Back to Session pauses practice and preserves that time. Repertoire's manual timer also uses an icon/time control; the session heading keeps the single Finish session action on the final block.

The free-practice metronome offers audio, visual or both. Set tempo from 30 to 240 BPM using the vertical tempo fader or numeric field, or tap **Tap tempo** several times at your desired pace. The volume fader controls the metronome click; zero is silent. Save the current tempo with **+**, tap a chalk-style favorite to switch to it, or remove it with **×**. Favorites and volume are kept with the pending session. Choose 2–7 beats per bar and beat, eighth-note, triplet or sixteenth-note subdivisions. The first pulse is accented; visual mode shows beat indicators and a marker around the dial. Starting the metronome starts practice timing if needed; stopping it leaves practice timing running. Pausing practice stops both. The metronome stops when the app goes into the background; timing follows **Keep timing in the background**.

Free and repertoire practice use a manual timer. Tap **Pause** when taking a break. The metronome is currently available only in free practice, not in the repertoire session card or score toolbar.

A repertoire block can be planned without a piece (**Choose when practising**). When it becomes current, it lists the pieces on your music stand first and the rest of your repertoire on demand. Time spent before choosing stays with the chosen piece. **Change piece** switches to another piece during the block: the time already spent stays with the previous piece as its own part, and the new piece starts at 0:00. A piece chosen from the rest of the repertoire goes on the stand. MusicXML pieces whose score has not been downloaded cannot be chosen yet.

If a repertoire work has a saved score, **Open score** opens it using the current timer state. Opening it while paused does not start timing. **Timer options** lets you keep free/repertoire timing running in the background.

In a MusicXML score, **Follow** turns on MIDI follow mode. A cursor waits on each chord until every key has been played, then moves on; wrong keys are counted but never move it. Tied continuations and grace notes are skipped. Choose both hands, the right hand (upper staff) or the left hand (lower staff). The page turns when the cursor reaches the next page. Correct and wrong notes are saved with the block as MIDI notes. The choice is remembered on this device. Ties are recognised only when the file notates them (`<tied>`), as most editors do.

## Connect MIDI

In fixed-page practice, Next/Previous pauses playback and moves to the selected page without recording skipped notes as errors. While paused, tap a note to move the starting focus there, then use the play button to resume. Rotating the screen preserves the selected note.

Practice settings describes whether you are using manual piano tracking or automatic MIDI evaluation. Screen-keyboard sizing is available only with on-screen piano keys. Manual piano tracking hides reveal-after-errors and weakest-note statistics; MIDI retains those evaluation options. Score size, sound, fingering and reading light remain available.

A reading or technique session configured for MIDI needs an available input. Its primary action becomes **Connect instrument** when disconnected. You can choose **Use manual tracking** instead. The small MIDI indicator also opens instrument settings.

A connected device and a session configured to evaluate MIDI are separate things. A compatible reading or technique session can offer **Use MIDI** when appropriate.

If MIDI disconnects during practice, evaluation pauses and the session overview opens. Reconnecting does not restart playback automatically; use **Continue exercise** to resume with the same generated notes and recorded answers. You can instead choose **Use manual tracking** to continue with a piano without automatic note evaluation.

## Move on, finish or return later

**Next block** records the current block and opens the next one paused. **Finish session** opens feedback, including on the final block. For each repertoire piece practised, **Part of the piece you worked on** records the passage (for example "bars 1–16, section B"). It appears in the session details and in the work's session list, and can be changed later with **Edit feedback**. **Keep practising** closes feedback and leaves the current block available; saving records it once and returns to Today. Save and schedule opens the scheduling dialog over Today. Quick practice keeps its result dialog, with Today shown after closing it.

In PDF practice, elapsed time appears inside the play/pause button. When paused, the stop-square opens finish feedback. Open tools and choose **Return to session** to leave the score without finishing. Previous/next arrows only turn score pages. On the narrowest phones the page counter is hidden to keep the control bar on one line; MIDI status is available in the tools panel.

PDF annotation tools collapse after selecting a tool, finger or color, leaving a current-tool button that reopens options. Adjust number/text size and line thickness there; percentages are relative to the PDF page width, not the zoom level. Choose **Select** and drag an existing mark to move it. For highlights, lines, arrows, circles and rectangles, drag a blue endpoint to resize it. Selected numbers/text also support size changes. Edits save locally, retain the mark ID, and support undo/redo. Arrow keys move the selected mark or focused endpoint. Editing is disabled while practice is running.

In PDF framing options, zoom, fit and **Save frame** are directly visible. Expand **Additional options** for reset, fullscreen and page splitting. Saved views remain separate for portrait and landscape.

While paused, open score tools and choose the printer icon. Starting with Android test version 5.2.7/code39, the printer icon is also available for downloaded scores in Repertoire rows/work details and Catalogue cards/details. It opens system printing directly, without an app-owned preview; use the system's PDF destination to save a copy. The whole original PDF includes current annotations with each page's dimensions and rotation, regardless of saved crops. MusicXML printing lays out the entire source work on A4 portrait pages with added fingering, independent of the open excerpt and screen zoom. Original scores and notebook annotations remain unchanged. Physical printer acceptance remains separate from browser output checks and native installation.

If feedback cannot be saved, your paused session and form stay available for retry. A failed save does not create a duplicate history entry.

**Continue later** pauses and keeps the unfinished session, then returns to Today. Use **Resume session** when you return. This checkpoint is separate from a completed practice in your history.

**Discard session** asks for confirmation before removing the unfinished session. Existing saved practices, works, scores and annotations remain available.


## Beta 2 timing and MIDI

New practices start with the timer running. Pause stops timing and allows the device to sleep normally. Recovered practices remain paused. In PDF practice, Done editing saves pending changes before resuming timing; a save error leaves practice paused. When saving the activity, adjust Practice time (minutes) if necessary. SPino keeps the original measured duration and updates the activity breakdown consistently.

Tap the MIDI icon when disconnected to refresh inputs and attempt the last remembered Android Bluetooth instrument. Hold it to open MIDI settings. On iOS, unavailable Bluetooth inputs use Apple's connection panel. Configured automatic cloud sync saves changes throughout the app; incoming changes wait until practice and editing finish. A sync problem at practice start offers a direct route to resolve it.

## Circular score timer (local source follow-up)

PDF and MusicXML practice show elapsed time in a raised circular button on the floating score bar. Teal with the pause icon means timing is running; ochre with the play icon and **Paused** means timing is stopped. Tap the circle to pause or resume. Pausing keeps the score visible and does not open editing. Tap the pencil to open annotation and framing controls; the pencil is replaced in place by the Done editing checkmark. While editing, the paused clock stays visible with a checkmark. Tap it to save pending changes, close editing and keep practice paused; tap it again to resume. Failed saves keep editing paused for retry. The floating controls keep their positions. This 2026-10-14 change is included in published beta 5/build44 and verified in responsive browsers. Native PDF acceptance remains limited by the emulator WebView.

Double-tap the six-dot grip to minimize the floating practice bar to just the grip and clock. Double-tap it again to restore the other controls. The grip still moves the bar; Enter or Space on a focused grip also toggles the view. The clock keeps its pause/resume behavior and can close editing while keeping practice paused, including when the bar is minimized. The full bar uses less vertical space. This follow-up is included in website Android beta 6.1.0-beta.4/build57 and verified in responsive browsers. Package, replacement installation and public delivery are verified; native visual acceptance remains pending.

## Direct score practice and editing return (local source follow-up)

Starting practice opens the score automatically when the current block is repertoire with an attached score. If you have a configured warm-up, it runs before that repertoire block. The overview offers one **Start practice / Continue practice** button to open the score and start or resume timing.

**Edit score** and **Finish practice** stay visible in the expanded PDF and MusicXML floating controls. Edit pauses timing automatically and opens the annotation/framing tools. **Done editing** or Back returns to running score practice after pending changes are saved. Finish stops timing, saves pending annotations/views and opens feedback; it does not save the practice history automatically. A failed write leaves editing paused for retry. This 2026-10-14 behavior is included in published beta 5/build44 and browser-verified. Android replacement installation/version/foreground are confirmed; native PDF timing acceptance remains open.

### Preparing repertoire

When preparing repertoire, swipe the equal-size cards under **On your stand** and tap a piece. A colored card and checkmark identify the selected piece, with its full title below. **Other pieces** opens search across your repertoire by title or composer, including pieces outside the stand and excluding the bin. Choose **Search the full catalogue** there to browse catalogue scores, or **Choose when practising** to decide later. Download and score checks still apply to catalogue scores. Returning to preparation preserves your choices. This local follow-up is verified in responsive browsers; physical-device visual acceptance remains open.

**Include Hanon warm-up** controls the warm-up for this practice, starting from your saved preference. It does not change that preference. Scheduled practices retain the choice. Routines keep their own warm-up settings.

The free-practice metronome opens in a fullscreen workspace. Tempo, volume, beat/subdivision settings and timing controls use a compact layout that adapts to portrait and landscape. Use **Session** to return to the session overview or **Finish session** (or **Next block**) to continue.

### Correcting completed practice

Open a saved practice and choose **Edit practice**. Adjust minutes and seconds for each block, change a repertoire block's worked score and passage, or add a repertoire, free-practice, reading or technique block. Save updates the total and practiced works; Cancel leaves the record unchanged. The original session date, identity, notes and feedback are preserved. Changing a block's score removes its old automatic measurement so it is not attributed to the replacement score. **Edit feedback** remains available separately.

### Reviewing progress

Progress has three sections. **Activity** shows a practice-time chart, weekly goal, consistency and saved history. Time in Progress uses minutes below one hour and hours with remaining minutes from one hour upward: 139 minutes appears as **2 hr 19 min**, and 120 minutes as **2 hr**. This includes weekly goals, chart labels/details, repertoire totals and Progress history, retaining whole-minute rounding. This formatting follow-up is included in website Android beta 6.1.0-beta.3/build56 and verified in responsive browsers. The chart summarizes the last 12 weeks, with this week still in progress. **More details** opens practice-type and repertoire-piece filters, which can be combined. Choose 7 days, 1, 3 or 6 months, the current year or 1 year. Short ranges show daily time; longer ranges show weekly time. The total is compared with the preceding period of the same number of days. **View chart values** lists exact dates and minutes. Filters count only time explicitly recorded for the matching activity and piece; merely tagging a piece in session feedback does not assign all session time to it. This beta 6.1 behavior is verified in responsive browsers and packaged in the website Android beta; native visual acceptance remains pending. **Repertoire** shows each piece's current stage, recorded practice time, latest practice and next passage/goal; open a piece to review its history. Stages reflect your assessment, not an automatic proficiency score.

**Technique** groups measured reading/technique blocks by their recorded settings. After six comparable blocks, it compares response accuracy for the preceding three and latest three. Smaller groups show that more data is needed. Manual time remains in Activity; response accuracy does not assess expression or overall musical mastery.

### Recording repertoire practice (Beta 6.1 source preview)

Website Android beta7 adds **Profile → Google Drive transfer check**, an isolated feasibility check using a bundled synthetic tone and your own test Google account. It does not upload personal recordings or the notebook. On the second device, use the same Google account and test notebook code to find, download and verify the test recording. Real Google authorization and cross-device playback still require physical testing; automatic personal recording sync is not enabled.

Playback progress uses the full take duration. The current source also repairs missing duration information when opening older WebM takes, keeping their original stored recordings intact. A two-minute take shows approximately 4% progress after five seconds. This correction is verified in responsive browsers, including seeking and reopening, and is included in website Android beta7/build60. Physical-device playback verification remains pending.

Choose **Record** from a piece or its repertoire practice block, then choose **Record audio** or **Record video**. PDF and MusicXML practice controls also include **Record practice**. Allow the microphone, and the camera for video, when prompted. A temporary permission dialog keeps the capture request pending; recording begins when the app is visible again. If permission is denied or capture cannot start, the recording panel displays the error and lets you retry. In the score viewer, capture starts with its panel hidden. The same red Record button becomes Stop; tap it to stop capture and open the review. Outside the score viewer, the recording panel can be minimized. In the review, play the take, edit its title and **Save**, or **Discard** it. Each take is limited to 15 minutes or 250 MB; reaching a limit stops capture for review. Backgrounding the app, changing the repertoire piece/block or finishing the session stops capture.

Open **Recordings** on the piece, or **Library → Multimedia**, to browse locally available takes. Filter by piece or audio/video type. **Play** opens the saved take with **Delete** as a red link and **Close**. Select the pencil beside its title to edit, then the checkmark to save the title without interrupting playback. Escape cancels title editing; a failed save retains your text for retry. These saved-viewer refinements are verified in responsive browsers and included in website Android beta7/build60. New takes retain **Save** and **Discard**. A completed take is stored as a pending draft before final Save; if that write succeeded, an app restart exposes it through **Review and save**. A failed storage write keeps the preview open for retry while the app remains open. An abrupt app termination during active capture can lose that unfinished take.

Recordings are stored only in this installation. Notebook JSON export, backup and synchronization do not include the media files or installation identity. Restoring or synchronizing the notebook leaves local recordings intact. Another device does not show these local-only takes. Clearing app/browser storage, uninstalling, or confirming **Erase notebook** can remove them. Cloud media copies and sharing are not available. This behavior is verified in responsive Chromium with synthetic audio/video. A local Android review APK also verifies repertoire-session audio/video capture, review and Save with emulator microphone/camera streams and already-granted permissions. Physical-device capture quality and native PDF recording acceptance remain pending; the emulator's WebView 113 stalls during PDF initialization.

## Practice clock update (6.1.1-beta.1)

Practice seconds repaint when they change, independently of periodic saving. PDF and MusicXML clock digits keep a fixed width. Tapping the clock during editing saves pending changes and returns to paused practice. The separate Done editing checkmark and Back retain their save-and-resume behavior. These changes are verified in responsive browsers with disposable notebooks, including pause/resume, delayed frames and phone/tablet layouts. Android package installation is recorded separately from physical-device acceptance.
