# SPino user manual source

Packaged 2026-10-07 in test-only 5.2.4/code36: Catalan language and the accepted piano-style keyboard. The keyboard has neutral physical-press shading, subtle black-key texture and clearer raised octave labels. Glossy side cheeks appear only at A0 and C8, never at cropped viewport edges. Red felt and decorative edges do not change touch areas or MIDI mapping. No Play Store bundle was produced.

Verified source behavior 2026-10-07: Profile → Edit profile → Language offers English, Spanish and Catalan. Saving changes updates notebook screens and practice/score controls together; the choice survives reopening. New notebooks follow Catalan device language. Existing notebook text, musical titles, saved history and archived release notes retain their original language. Catalan is source/browser-verified and is not in the existing Android package.

Verified 2026-10-06 quick-practice refinement: the toolbar shows points and your previous best in place of No tempo. Beating the best triggers a short celebration (disabled for reduced motion). Mobile Back or either practice arrow offers Finish and see score, Continue later, or Keep practising. Continue later retains the paused session and points without registering a completed score. Finish saves the result and shows accuracy, speed bonus and previous best; choose Play again for another randomized practice. Records are at the bottom of Practice. This supersedes the earlier immediate finish description.

Verified source behavior 2026-10-06, after existing 5.2.3 builds: Quick practice earns 100 points per correct note plus up to 100 speed points, with 50 deducted for each error and a minimum total of zero. Pauses do not add response time. Finish opens your result and saves the practice automatically. The five highest saved results appear in Practice with date and difficulty; longer practices can accumulate more points. Deleting a saved practice removes its record as well. Ordinary practices are not scored.

Verified source behavior 2026-10-06: in on-screen practice, tapping a key while paused resumes the exercise and evaluates that same tap. An incorrect untimed answer counts as an error but leaves the current note in place. This follow-up is not included in the already-built 5.2.3 packages.

Verified 2026-10-06: untimed exercises use multiple staff systems when the available height allows at the chosen score size. Read from one system to the next; a new page appears after all visible music is answered. Rotation keeps note progress, reframing the active system if the shorter viewport would hide it.

Verified source behavior 2026-10-06: in untimed practice, a correct answer moves the reading guide smoothly toward the next note. The guide follows immediately without animation when reduced motion is enabled on the device; page changes remain immediate. This later source refinement is not in the already-built Android 5.2.2 package.

Verified source behavior 2026-10-06 (not in the existing 5.2.2 Android build): choose Quick practice in Practice to open a self-paced on-screen reading exercise immediately. A single hand/clef and keyboard position are chosen randomly each time. Existing sessions are not overwritten. The five-minute block is a suggestion; finish whenever you want. Profile defaults are unchanged.

Verified 2026-10-06: Progress compares the current calendar week and previous three weeks with your current weekly goal. Practice streaks count consecutive weeks with saved practice time; goal streaks count weeks reaching that goal. An unfinished current week does not end the previous streak. Historical goal changes are not tracked, so comparisons use the current goal.

Verified 2026-10-06: Progress is available directly from main navigation and is no longer a Profile row. Select the SPino version at the bottom of Profile to view credits and archived release notes. Historical entries without detailed notes are labelled accordingly.

This is the English source for a future help manual bundled with SPino. It is authored alongside the [release quality review](../quality-review/README.md) and describes actual behavior, not proposals. No help screen or runtime manual renderer has been added in this phase.

`index.json` supplies stable chapter IDs, order, local paths and editorial status. Chapter Markdown contains only user-facing instructions. Keep review IDs, unresolved design decisions and implementation notes in the index/review workspace rather than in the rendered chapter body.

| Status | Meaning |
| --- | --- |
| draft | Checked against the current implementation, but its screen review is still open. |
| reviewed | The screen's behavior and wording have been accepted and verified. |
| needs-update | A later decision changes behavior described in the chapter. |

Today and the session overview have draft chapters; the other topics are planned in the index. The manual is deliberately incomplete until those screens are reviewed. New chapters should explain the screen's purpose, how to perform its main tasks, the meaning of visible statuses, recovery/cancellation and useful next steps. Use stable headings, relative local links and semantic lists. Keep instructions concise enough for phone reading.

Future app integration can bundle these local assets during the existing build, render Markdown with safe link handling and navigate by chapter ID. It does not require a server, account, remote content service or runtime network request. English remains the authoring language; translated chapters should share IDs and be reviewed against the same accepted behavior. Review galleries are engineering evidence and should not be shipped as manual content.

After a shared UI decision, check all indexed chapters that reference the affected screen/component. Mark stale chapters `needs-update` until their instructions match the verified application. Never publish a proposed feature as an available task.
# Verified Library navigation (2026-10-06)

## Routine builder

In Calendar, choose Add on a day → Schedule practice. If routines exist, select one or choose New practice. A routine opens the date/time/reminder form directly; scheduling copies it without changing the saved routine.

The routine name is requested only after pressing Save routine; editing pre-fills the existing name. Cancel in that dialog returns to the same draft. Delete routine appears when editing a saved routine and in the saved-routines list. Confirming deletes only that routine, retaining completed sessions, planned practices and any active session.

Add block appears below the sequence. Total practice time is shown beside it and includes the warm-up only when enabled; changes to minutes update it immediately.

Current refinement: routines are piano sequences; the builder no longer asks for piano/MIDI/mobile context or tempo. MIDI is detected when starting/entering practice, falling back to manual piano. The first warm-up can be enabled/disabled and timed; its exercise set is generated during practice, not stored as a template preset. Tempo comes from current practice settings and can be adjusted for the current practice. Older routine records stay intact unless edited/saved. Physical MIDI hotplug is not yet accepted.

From Practice, use Create routine or Manage → Edit. Enter a name and choose a practice context. Add block offers compatible activities; tapping a block or its pencil opens settings. Minutes can be changed directly on each row. Adding/removing changes the total without changing the other blocks' minutes. Hold the grip to drag a block; tap the grip for Move up, Move down or Remove. At least one block must remain. Save routine saves the sequence without starting a session; Cancel discards only the draft after confirmation. Existing routine and block IDs are retained. Responsive browser creation/editing, pointer movement and active-session preservation are verified; native gestures and injected storage-failure acceptance remain open.

Library contains My repertoire and Catalogue. Switch using the top navigation; each view retains its search and scroll position while navigating within the running app. My repertoire contains the music stand and collection, plus Add work and Import PDF. Catalogue offers score discovery/download. Routines can be created, managed and started from Practice; routine management highlights Practice in the primary navigation. This behavior is verified in responsive browser checks, not native-device acceptance. MusicXML/MXL direct repertoire import remains deferred and is not documented as available.

