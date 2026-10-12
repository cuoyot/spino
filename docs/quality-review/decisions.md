# Review decisions and consistency checks

Status is explicit: **proposed**, **accepted**, **implemented**, **verified**, **superseded** or **deferred**. Retain old IDs and link replacement decisions. An accepted direction is not a claim that every affected screen has been implemented or verified.

## D-036 — Complete annotated score printing

- 2026-10-07 owner refinement supersedes the app-owned preview: open system printing immediately. Compact printer icons in paused PDF/XML tools and downloaded-score Repertoire rows/details and Catalogue cards/details. Shared asset rendering avoids opening the viewer or modifying current view state. Browser calls intercepted in synthetic tests confirm direct print invocation and no custom preview/viewer. Published 5.2.6 retains the previous preview until another package is requested.
- Owner confirmed 2026-10-07: print complete PDF works with annotations in their original page formats; print entire MusicXML works on A4 with added fingering.
- Implemented in paused PDF/XML score tools: temporary preview, browser printing/PDF download, and an Android system print bridge. PDF pages are flattened at high resolution with original displayed size/rotation; XML receives independent A4 pagination, never the screen layout or current excerpt. Notebook/source records are not changed; all output is temporary unless the user saves it.
- Scope: PDF/MusicXML viewers and shared score tools (PRACTICE-05, repertoire previews). Annotation editing, source hashes, IDs, excerpts, zoom, saved crops and practice timing must remain intact.
- Browser PDF dimensions/rotation/annotation pixels and long XML A4/fingering outside excerpt checks pass. Android bridge compiles; native printing remains unverified until a new APK. No release/publication requested. Manual distinguishes source availability from the published package.

## D-035 — Catalan application and language-matched website evidence

- Status: owner-requested and implemented, 2026-10-07; scoped automated and responsive verification passed, native acceptance open.
- Catalan joins English/Spanish in Profile. New notebooks on Catalan devices default to Catalan; existing preferences are not migrated. The reader and companion share the language. Translate app-authored labels, accessible names, guidance and known diagnostics, never notebook text, musical titles, source evidence, stable IDs or archived release notes.
- Website Spanish/English/Catalan pages receive equivalent current-feature descriptions and actual language-matched synthetic screenshots. Disclose that screenshots show development source and the existing downloadable APK does not yet include Catalan. No package rebuild or public deployment in this request.
- Evidence: website/2026-10-07-current-app-07/capture.json (23 responsive frames including all four Catalan reader orientations). Build, Catalan startup/profile-save/reload/quick-exit, Spanish existing/legacy notebook flows, explicit reader/message/Hanon resource coverage, identity preservation and website image/link/no-overflow checks pass. Earlier accepted screens are reopened only for language presentation; no blanket native or accessibility closure.

## D-034 — One-tap casual practice

Game-design/exit follow-up: score now occupies the untimed toolbar slot, with previous personal best and progress meter. Correct/error point feedback and a once-per-run record banner animate; result uses a medal, prominent total, previous-best comparison, accuracy/bonus breakdown and replay. Reduced-motion disables animation. Records follow all other Practice content. Mobile Back and reader arrows use the same quick exit dialog; Finish saves and shows result, Continue later leaves the existing session paused, Keep practising resumes it. These supersede the earlier automatic finish-on-arrow behavior below. Synthetic tests verify previous best, new record, replay, shared exit actions, pending ID/score preservation, reload and record placement, with unchanged ordinary navigation. Evidence: quick-game-exit-02 (24 responsive frames). Latest request authorizes test APK rebuild, not another bundle; installed-native acceptance remains separate from browser interaction simulation.

Scoring follow-up: owner requested correctness/speed points, finish result and high scores. Formula v1 is 100 per correct response plus max(0,100−floor(active response milliseconds/30)); each wrong response subtracts 50, displayed total is never negative. Score is accumulated over the whole session, not a fixed-length/normalized competition. Results disclose this and show difficulty with records. Active note timing survives pause/recovery and excludes paused/closed time. Only newly marked quick blocks earn points; ordinary sessions are not retroactively scored. Finish quick practice atomically saves once and opens result/records, bypassing ordinary feedback; failed save leaves active practice retryable via shared commit handling. Scores stored on sessions, validated in backup; top five derived from saved sessions, so deleting a session removes its record too. Build, score unit/backup checks, eleven existing/quick self-paced checks and end/save/reload browser check pass; twelve responsive examples quick-score-01. No new Android rebuild; latest binaries remain prior 5.2.3.

Pause follow-up: owner explicitly chose tap-to-resume with the first tap evaluated. Mobile on-screen practice now resumes a paused self-paced/timed exercise from the same key event and evaluates it once; incorrect self-paced answers resume but do not advance. Hidden reader/background and piano/MIDI guards remain. Correct and incorrect self-paced tap probes pass, along with pause-time/recovery checks. This change is later source work, not in the already-built 5.2.3 margin-corrected packages; timed evaluation still follows its normal tolerance rules.

Margin correction: owner found clef tails/low notes clipped, excessive inter-system space and off-centre single systems. VexFlow's 40px staff offset is now accounted for; compact rows are centred as a stack below the key label with reserved bottom padding. Per-row SVG allows ledger/clef overflow within the page instead of clipping at each row. System count respects page margins; fewer systems are used where needed rather than shrinking notation unsafely. Existing timed page rendering shares this geometry and needs regression coverage. Owner explicitly requested rebuilding APK/AAB with unchanged 5.2.3/code35; prior same-version files are superseded, not published.

Multi-system follow-up: owner requested actual sheet-reading rather than a lone line. Self-paced layout now uses the existing size-based systems fit calculation (up to six), keeps all visible systems until answered and reframes the active system on a shorter viewport without replacing notes. Nine focused browser checks pass, with updated assertions for the full visible page. Four-layout evidence: generated-practice/2026-10-06-quick-practice-multiple-systems; tablet portrait visibly has four systems. Owner requested APK/AAB 5.2.3/code35; native acceptance remains separate.

Follow-up: untimed correct answers ease the playhead and reading light to the next onset with acceleration/deceleration, 160–320ms based on beat distance. Answer evaluation and active-note state update independently; no added answer delay. New systems/pages jump rather than sweeping across replaced notation. Reduced-motion preference disables the glide. Direct browser checks verify correct-answer transition and reduced-motion suppression; existing eight self-paced checks pass. Four-layout entry/playing evidence: generated-practice/2026-10-06-quick-practice-02 (before the last transition refinement; still images do not prove animation).

Owner requested a quick mobile mode with no setup: without piano, no tempo, one hand, randomized clef and keyboard position. Implemented as a prominent Quick practice entry in Practice, available in browser/mobile/tablet. Clef means treble or bass, paired with right or left hand; key signature stays C major. Reading uses the on-screen piano, a self-paced clock and current profile rhythm difficulty. Five minutes is a suggested block duration, not an automatic stop. Keyboard start is chosen from four comfortable diatonic positions per clef and retained in block/snapshot/backup data. No defaults or source routines are modified. An existing active session is shown, not replaced. Entry opens and plays the reader directly without a preparation dialog or warm-up.

Unit and mobile browser entry/pending-session probes pass. Responsive/native/visual evidence is distinct. No Android rebuild; the existing 5.2.2 release does not contain this later source change.

## D-033 — Main Progress destination and version history

Follow-up: owner requested spacing correction and motivating metrics. Progress now has a scoped 20px section rhythm, removes duplicated summary totals, and shows consecutive practice weeks and goal-reaching weeks. Monday-based calendar weeks; the unfinished current week does not break a streak completed through last week. Positive saved time only; future sessions excluded. Last four weeks include the current partial week, compared with the current preference goal (historical goal values are not stored). No goal disables goal-streak calculation. Unit tests cover gaps, no goal, future dates and year boundary; four-layout empty/populated captures and spacing/overflow probes pass in progress-metrics-01. Visual/native approval remains open.

Owner requested Progress without the possessive in main navigation, not inside Profile. Implemented with active-section highlighting including history detail. Profile product footer displays the package version and opens credits plus full archived release copy for 5.2.1/5.2.0, original-language listing notes for 5.1.1/5.1.0, and explicitly labelled incomplete historical records for 5.0.0/4.0. Missing notes are not invented; unbundled local changes are not labelled a new release.

Verified: production browser build, four-layout navigation bounds/profile/dialog/Back probes and existing navigation regression. Sixteen disposable responsive captures: profile/2026-10-06-progress-about-01. Earlier main destinations remain reachable. Owner visual, enlarged-text and native acceptance remain open; no APK/AAB rebuilt.

## D-032 — Dedicated routine creation and editing

- Calendar follow-up: Schedule practice now offers saved routines or New practice explicitly. Selecting a routine opens date/time/reminder scheduling directly, copies blocks and dynamic warm-up/MIDI policy into the appointment and leaves the source routine unchanged. Without routines, the existing new-practice flow remains. Four-layout actual Add-day entry probes pass in calendar-routine-choice-02; visual/native acceptance remains open.

- Latest owner refinement: no inline routine name. Save routine opens a naming dialog, prefilled when editing; cancelling it retains the sequence. Delete routine is available in the saved list and existing-routine editor, with confirmation. Deletion saves a clone atomically, retaining active/completed sessions, plans and other records; no personal notebook data was deleted during testing. [Thirty browser views](captures/routines/2026-10-06-routine-save-delete/index.html) cover naming/editor/delete confirmations, with four-layout save/cancel probes and exact notebook preservation after deletion.

- Owner layout refinement: Add block follows the last block; an explicit Total practice time updates for block edits and warm-up toggling. Shared minute column aligns warm-up with every block. Four-layout alignment probes exposed and corrected interference from the legacy preparation landscape grid. Evidence: routine-footer-03; owner visual/native acceptance pending.

- Latest owner refinement: routine builder is piano-only (no context/MIDI picker), and block tempo is not editable in the template. Routine policy resolves connected MIDI and current tempo defaults at session start; tempo chosen during practice preparation is retained. Warm-up is an optional, fixed-first policy row with duration only, not a movable exercise preset. Exercises are generated at practice time. Legacy routines remain unchanged until editing/saving. New policy fields are backup-validated; ordinary mobile casual practice stays available.
- Two policy tests cover manual/MIDI resolution, current tempo/default versus practice override, warm-up inclusion/exclusion and schema round-trip. Eighteen updated browser views and toggle/active-session checks pass in routine-dynamic-01. Physical MIDI hotplug remains unverified; detection runs at session start and reader entry, not a claim of uninterrupted live mode switching.

- Owner-requested, implemented 2026-10-06, following explicit advanced UI/UX model consultation. Routine creation/editing is no longer session-start preparation: inline name/context, computed total, ordered block rows, visible Add block and Save routine/Cancel. Ordinary session preparation and Start routine remain unchanged.
- Add offers context-compatible activities; edit reuses block settings with routine-specific copy. Adding/removing changes the total without redistributing other durations. Stable routine/block IDs survive edits. D-006 grip/380ms drag/insertion marker/temporary bin and tap/keyboard move/remove alternatives are reused; the last block remains protected.
- Saving writes an edited notebook clone before replacing live data; failure retains the draft. Editing is permitted while a session exists and does not change its contents. Cancel asks to discard the draft, leaving saved routines unchanged. No new APK/AAB.
- Scope PREP-02/HUB-01/C-MOVE. [Eighteen responsive browser examples](captures/routines/2026-10-06-routine-builder-03/index.html) verify create/add/edit/move/remove/save and stable IDs in four layouts; pointer dragging verified in phone/tablet portrait, active-session preservation checked. Native touch, injected save failure and owner visual acceptance remain open.

## D-030 — Quiet repertoire tables and stand membership

- Owner-requested, implemented 2026-10-06; visual acceptance pending. Stand precedes collection; free text searches across title/composer. Column headings toggle ascending/descending sorting. Filled/outline stand icon is the sole membership action.
- Owner rejected the boxed-control presentation and requested an advanced design-model consultation. The resulting scoped redesign uses flat headings/title links, subtle row dividers, compact search and collapsed secondary filters. Phone rows place composer/stage beneath title; three text sort controls remain available. Tablet retains separate sortable columns.
- Favorites category and column removed from this route at owner's request; stored favorite flags preserved. No record IDs, history, scores or annotations changed. REP-01 only; unrelated shared button styles remain unchanged. Import format D-028 remains separate.
- Production build and four repertoire unit checks pass. Responsive synthetic browser evidence: repertoire/2026-10-06-repertoire-minimal-02. Native and owner visual acceptance remain open.

- Owner accepted the presented minimal layout on 2026-10-06. Native acceptance is still separate.

## D-031 — Library repertoire/catalogue navigation; routines in Practice

- Owner accepted and authorized implementation on 2026-10-06: Library opens the last-used My repertoire or Catalogue pane; two persistent top navigation buttons switch directly between them. Each pane retains its filters, pagination, search text and scroll position during navigation. Unsubmitted catalogue search drafts do not change existing results.
- Library's former dashboard no longer duplicates routines or hides catalogue access. Existing Practice routine creation/management/start flows remain; the routines route now highlights Practice in primary navigation. Import/Add work stay in My repertoire. Material-selection catalogue entry keeps its explicit return-to-practice flow rather than offering unrelated repertoire navigation.
- Scope REP-01, CAT-01, HUB-01 and C-NAV. Notebook IDs, routines, scores and annotations unchanged. Production build and six navigation/catalogue/agenda checks pass; four-layout tab/scroll/search probes and [24 browser examples](captures/repertoire/2026-10-06-library-tabs-02/index.html) use a disposable notebook. Responsive evidence, not native acceptance. Owner visual approval of these new tabs remains open.

## D-029 — MusicXML practice control alignment and editable zoom

- Visual-parity correction after owner rejection: selecting a digit collapses the full settings panel to a persistent compact PDF-style palette; visible circular swatches, number-size slider, current-tool/options strip and blue Done editing. Size is stored on newly placed/replaced digit marks. MIDI/zoom stay in full options, not in the drawing palette. Four-layout captures inspected; visual approval remains open.

- Latest owner refinement: MusicXML supports fingering only, using the same visible 1–5 buttons and color swatches as PDF, followed by a note tap. Highlighting is withdrawn from tools and rendering; old stored highlight records are retained to avoid destructive cleanup. PDF highlighting is unchanged. Four-layout number/color replacement and build pass; remaining acceptance gates are unchanged.

- Owner follow-up: group MIDI, annotation and zoom controls; single minus/percentage/plus row, short connection state and only Done inside options. Note-linked fingering and note highlighting are implemented as separate asset marks with color/removal. Free-coordinate drawing is excluded. Four-layout placement/save-callback captures and build pass; persistence/reflow/chord/excerpt/backup acceptance remains open. This is per-note highlighting, not a full musical-range implementation.

- Owner-requested and implemented, 2026-10-05: match PDF hierarchy with timer/play-pause, adjacent stop icon, secondary options containing zoom, MIDI follow and explicit Return. Zoom percentage is editable from 60 to 200. Options temporarily hide primary session controls; Done restores them.
- Scope: SCORE-02 / PRACTICE-05, shared C-SCORE stylesheet. Build, three follower unit checks and four-layout capture probes pass; visual/native and full repertoire entry remain open. Original MusicXML files and records are unchanged.
- Annotation compatibility is a proposed future design, not implemented: link digit/text marks to stable note identities and highlights to musical ranges; regenerate geometry after reflow. Cross-system shapes require explicit range/anchor rules and edition-change reconciliation. Do not reuse PDF normalized page coordinates or promise automatic notation editing.

## D-028 — Repertoire MusicXML import and MuseScore-assisted flow

- Status: **owner-requested, deferred**, 2026-10-05. Address at REP-03/REP-04 import review, or after UI review if those screens are not reached. Offer local MusicXML/MXL import alongside PDF, checking existing catalogue import support before implementation.
- Include opening MuseScore's website, downloading an authorized score using the owner's account and importing the local file; retain its source link. Direct account/API integration is unconfirmed and is not part of an available feature. Do not store account passwords or bypass download restrictions.
- Scope: REP-03/REP-04, CAT-08 and C-TRANSFER. Preserve work IDs, practice history, original files and annotations. No implementation or manual availability claim in this turn; validation, cancellation, replacement and native picker coverage remain future work.

## D-027 — Compact framing controls

- Status: **owner-requested and implemented; visual acceptance pending**, 2026-10-05. Keep zoom/fit and Save frame visible; group reset, fullscreen and page splitting in Additional options. Existing saved frames, annotations and split-page behavior are unchanged.
- Scope: SCORE-01/SCORE-03 PDF framing panel, including study and practice. [Four-layout examples](captures/session/2026-10-05-pdf-compact-framing/index.html) include compact and expanded framing. Production build and framing/practice plus section-layout checks are rerun. Native and visual acceptance remain open.

## D-026 — Remove legacy repertoire metronome entry

- Status: **owner-requested and implemented**, 2026-10-05. Remove the metronome option from the repertoire session card; retain timer options and the free-practice metronome. Guard metronome startup so it cannot start from a repertoire block.
- Future direction, **deferred, not available**: a floating metronome launched from the practice-view toolbar. No floating widget or launcher is added now.
- Scope: PRACTICE-05 / PRACTICE-01 repertoire card. PDF/MusicXML annotation and score controls are unchanged. [Updated four-layout evidence](captures/session/2026-10-05-pdf-no-metronome/index.html); capture asserts the repertoire metronome is absent. Free-practice and missing-score recovery regressions remain in scope.

## D-025 — Compact annotation mode, mark sizing and editing

- Owner correction, 2026-10-05: contextual size/colors must also be available for active number/text tools before placement; colors/thickness for all active drawing tools before drawing. Hide the pencil whenever Done editing is visible, not just with the expanded panel. This supersedes the selected-only restriction immediately below. Production build and isolated browser assertions across seven drawing tools and fingering pass; visual/native acceptance remains open.

- Owner refinement, 2026-10-05: successive fingering keeps digits/colors available without reopening the full tool panel; selected marks keep recoloring available. Only selected text/digits show size, and only selected strokes/shapes show thickness. Annotation hints are removed. Hide the pencil when the expanded panel already exposes Done editing. This supersedes universal palette collapse and always-visible sizing below. Shared PDF study/practice controls change, not MusicXML or stored mark schema. Responsive visual/native acceptance remains pending.

- Status: **owner-requested and implemented; visual acceptance pending**, 2026-10-05. Owner accepted auto-collapse after selection and requested number/text size, line thickness and moving/resizing existing simple marks.
- Behavior: choosing a finger/tool/color collapses the palette to a current-tool/options strip. Size and thickness remain adjustable in annotation options (percent of page width, independent of zoom). Select a mark and drag to move it; two-point marks expose blue endpoint handles for resizing. Arrow keys move a selected mark or focused resize endpoint. Selection permits recoloring, changing thickness and text/number size. Moves/resizes retain IDs and use existing undo/redo/save behavior. Resuming practice disables editing and hides selection.
- Compatibility: optional validated fontSize preserves old defaults when absent; original PDF and existing annotation records are not replaced. Whole-mark translation stays within normalized page bounds. No MusicXML changes.
- Verification/evidence: production build; mark-edit browser checks cover five simple mark types, same-ID edits, size/thickness, undo/redo and reopening; existing annotation/backup, PDF practice and PDF study regressions. [Four-layout examples](captures/session/2026-10-05-pdf-editable-marks-02/index.html) include expanded settings, compact annotation mode, larger finger numbers and selected highlighting. Native touch/accessibility and visual acceptance remain open.

## D-024 — Compact PDF timer and distinct exit actions

- Status: **implemented, scoped verified and owner visually accepted**, 2026-10-05 (“looks good, continue”), scoped to the presented compact PDF toolbar. Expanded annotation/framing panels and native acceptance remain open. PDF practice combines elapsed time with play/pause. Stop-square opens finish feedback; page arrows only turn pages. Returning without finishing is explicitly labeled **Return to session** in the tools panel, rather than a competing chevron.
- Scope: PRACTICE-05, SCORE-01/SCORE-03 PDF controls; PDF study mode remains usable. MIDI status moved to the panel heading. The narrowest phone omits the page count to preserve a single control row, retaining previous/next accessible labels. MusicXML is unchanged.
- Verification: production build, seven immersive PDF checks (including single-line bounds at 320px) and nine PDF study/annotation/recovery checks pass. [Four-layout gallery](captures/session/2026-10-05-pdf-timer-bar-02/index.html). Expanded annotation-panel density and native/visual acceptance remain open.

## D-023 — Metronome mixer and chalk tempo favorites

- Status: **implemented, scoped verified and owner visually accepted**, 2026-10-05 (“approve now and continue”), for the [final responsive layout](captures/session/2026-10-05-metronome-favorites-below/index.html). Acceptance does not close native/audio/accessibility or unrelated repertoire branches. The owner requested tempo/volume faders beside the circle in portrait, a larger circle with controls to its side in landscape, and crayon/whiteboard-style favorite markers.
- Behavior: remove the range inside the dial; use vertical tempo and volume faders. Save the current BPM with +, select a labeled chalk favorite with one tap, remove with ×. Small chalk ticks mark saved positions along the tempo fader. Favorites and volume persist in the active session. No ambiguous sideways-save gesture is required.
- Scope: PRACTICE-05 only for layout; the shared audio click adds an optional volume argument whose default preserves other callers. Earlier reviewed practice timing and navigation remain unchanged.
- Latest owner-requested layout: favorite tempos belong below the circle in landscape, not below the side faders. Reduced landscape dial size to reserve the favorite row. [Updated evidence](captures/session/2026-10-05-metronome-favorites-below/index.html). Five-layout regression verifies placement, viewport visibility in landscape, and retained portrait fitting. This supersedes the earlier landscape favorite location without changing favorite behavior.
- Follow-up correction: owner requested landscape beat indicators above the circle and reported overlapping/hidden favorites. Replaced portrait floating positioning with explicit grid rows and a wrapping favorite grid. [Corrected gallery](captures/session/2026-10-05-metronome-markers-01/index.html). Browser bounds assertions verify no favorite/fader overlap and landscape beat placement in four standard layouts plus 320px portrait. Chalk styling is retained; this is not yet owner visual acceptance.
- Verification: production build and disposable free-practice regression pass, including 40/50/60 favorite creation/selection/removal, recovery, volume-zero silence with visual timing, and four-layout overflow checks. [Responsive browser gallery](captures/session/2026-10-05-metronome-mixer-03/index.html). Native touch/audio and owner visual acceptance remain open.

## D-022 — Dedicated free practice and an audio/visual metronome

- Status: **owner-requested, implemented and scoped verification passed**; the presented free-practice workspace was visually approved with D-023 on 2026-10-05. Owner requested both MANUAL-F01/F02 changes and a dedicated free-practice screen, then supplied a Soundbrenner screenshot as a visual reference. Repertoire and native acceptance remain separate.
- Agreement: remove the duplicate final Finish action from the session card; manual repertoire uses an icon/time control. Free practice opens its own workspace from the session, prioritizing the timer and metronome. It remains the same active block and returns paused to the session without losing performed time.
- Metronome: large circular tempo display with an adjustable slider and exact numeric BPM (30–240), Tap tempo, 2–7 beats per bar, beat/eighth/triplet/sixteenth subdivisions, and audio-only/visual-only/both selection. Beat indicators and ring position show visual timing; the first pulse is accented. Settings persist in the active notebook session. This borrows the reference's hierarchy while using SPino styling.
- Timing: starting the metronome starts practice timing if paused. Stopping the metronome leaves practice time running. Pausing practice stops both. Backgrounding stops the metronome; practice time follows the existing background-timer preference. Repertoire retains its existing audio click rather than inheriting a silent free-practice mode.
- Scope: PRACTICE-05, PRACTICE-01 session entry/control refinement and screen-awake policy. Audio/video recording remains a future idea; no recording controls, permissions or storage were added.
- Evidence: [four-layout gallery](captures/session/2026-10-05-free-practice-metronome-03/index.html), free paused/running visual metronome and repertoire controls. Production build passes. New browser checks verify visual-only has no audio oscillators, audio-only produces oscillators without beat flashes, pause/time retention, viewport fitting, return and settings recovery. Seven session editing/feedback regressions, six PDF child checks and three screen-awake checks also pass. Native touch/audio latency and visual acceptance remain open.

## D-021 — Accurate feedback when pausing count-in

- Status: **implemented and functionally verified**, 2026-10-05, following the owner's request to continue with this finding.
- Behavior: pausing while count-in feedback is visible replaces it with localized **Paused**. Resuming during count-in restores its countdown feedback. Other answer/notification messages are preserved.
- Scope: shared managed-practice pause, PRACTICE-02–04. Resolves paused-count-in feedback GEN-F02/PIANO-F03 in the browser shell.
- Verification: production build passes; [twelve piano captures](captures/generated-practice/2026-10-05-with-piano-paused-status-02/index.html) each assert the paused message, resumed count-in message and final pause across four layouts. Native coverage remains open.

## D-020 — Settings appropriate to the practice input

- Status: **owner-approved direction, implemented and scoped verification passed**, 2026-10-05.
- Agreement: physical-input Settings describes manual piano versus measured MIDI instead of showing a disabled on-screen input selector. Screen keyboard size/gesture instructions appear only for screen-keyboard input. Reveal-after-misses and weakest-note statistics are hidden for manual piano and retained for MIDI. Sound, fingering, score size and reading light remain available.
- Scope: PRACTICE-02–04 and READER-01, including note-name input's irrelevant keyboard-size controls. No stored settings or notebook data is removed.
- Verification: production build passes; [manual-piano gallery](captures/generated-practice/2026-10-05-with-piano-context-settings/index.html) includes Settings in four layouts. MIDI regression verifies hidden keyboard-size controls, retained evaluation options, the MIDI description and input behavior. Native evidence remains open.

## D-019 — Elapsed practice time inside play/pause

- Owner acceptance, 2026-10-05: **“perfecto, seguimos”** approves the presented integrated timer. Continue PRACTICE-04 settings and feedback review; native coverage remains open.

- Status: **owner-requested, implemented and functionally verified**, 2026-10-05.
- Agreement: show total elapsed session practice time beside the play/pause symbol in the main blue button across managed-practice inputs. The time freezes on pause and continues on resume; the statistics row no longer duplicates it. Localized action labels/tooltips remain, and the timer supplies an accessible description.
- Scope: PRACTICE-02–04 shared controls. Resolves manual-piano hidden time PIANO-F01/GEN-F07; the measurement remains total session time, consistent with the former practice clock. Session overview retains separate session/block clocks.
- Verification: production build and three real-time browser tests pass for timed reading, self-paced reading and manual piano: visible time, pause, resume and retained totals on return. [Four-layout piano gallery](captures/generated-practice/2026-10-05-with-piano-button-timer/index.html) contains twelve views. Owner visual feedback and native evidence remain open.


## D-018 — Settings-header shortcuts and a single mobile status row

- Owner acceptance, 2026-10-05: **“all fine now, move to the next one”** accepts the presented note-name/keyboard control refinements D-016–D-018. Remaining native/accessibility coverage is not closed by this visual approval. Continue PRACTICE-04.

- Status: **owner-requested, implemented and responsive-browser verified**, 2026-10-05.
- Agreement: move audio, guide/lights and fingering shortcuts into the Settings header between the title and Done in every viewport. Practice keeps tempo, play/pause and the direct settings gear. Keyboard recenter lives with keyboard positioning in the Practice tab. This supersedes D-013's exposed shortcut placement; settings still opens directly without an intermediate menu.
- Mobile status: statistics and answer feedback share one horizontal row on phone portrait as well as landscape, freeing score space and avoiding a third top control line.
- Scope: shared managed-practice shell PRACTICE-02–04 and READER-01. Legacy-reader placement is retained. Deferred Hanon artwork and manual-piano timer visibility are unchanged.
- Evidence: [note-name gallery](captures/generated-practice/2026-10-05-settings-shortcuts-names/index.html) and [keyboard gallery](captures/generated-practice/2026-10-05-settings-shortcuts-keyboard/index.html) include the Settings header in four layouts. Production build passes; updated warm-up regression checks the new control ownership. Owner visual acceptance and native coverage remain open.


## D-017 — Use the existing practice feedback row for notifications

- Status: **owner-requested, implemented and responsive-browser verified**, 2026-10-05.
- Agreement: display practice notifications in the same area as count-in and answer feedback, above the input controls. Pending recovery notices move out of the floating notebook toast when entering practice; subsequent count-in/answer messages use the same row and supersede stale notices.
- Scope: the shared managed-practice shell, PRACTICE-02–04. Notebook notifications outside practice retain their existing presentation. This resolves the overlapping recovery notification in GEN-F01/NAMES-F01 for the browser shell; native coverage remains open.
- Verification: production build passes; [twelve note-name captures](captures/generated-practice/2026-10-05-note-names-inline-status/index.html) cover three states and four layouts. Each entry asserts that the floating notebook toast is hidden while practice is visible.


## D-016 — Play and pause symbols for managed practice

- Status: **owner-requested and implemented**, 2026-10-05.
- Agreement: replace visible Continue/Pause text with a play triangle and two vertical pause bars. Preserve localized accessible names and tooltips, the blue primary treatment and the existing timing behavior.
- Scope: shared managed-practice controls in PRACTICE-02–04. This supersedes D-010's textual-primary-action requirement. Hanon artwork and manual-piano timer visibility remain deferred.
- Verification: production build passes. [Note-name captures](captures/generated-practice/2026-10-05-note-names-icons-02/index.html) and [keyboard captures](captures/generated-practice/2026-10-05-keyboard-icons-02/index.html) cover four responsive layouts. Phone-specific grid placement is corrected so shortcuts no longer cover the primary control or each other. Native coverage remains open.


## D-015 — Soft snapshot sequence for Hanon hand movement

- Status: **implemented; responsive browser review completed; owner visual acceptance and native evidence pending** on 2026-10-05.
- Agreement: replace the live SVG/3D hand animation with four clear, static snapshots using the softer B hand model: relaxed placement, playing the figure, gathering for the transition, and shifting/reopening for the next figure. The compact session card uses the same artwork, while **How to play** shows the complete sequence with short explanations and fingering rows.
- Biomechanics: for a wider span, the hand advances toward the back of the keys before reopening. This lets the thumb and little finger approach the keys more perpendicularly without twisting the wrist. The third and fourth snapshots and their copy must make that preparation visible.
- Rationale: the procedural 3D/SVG versions added complexity while producing distorted fingers, undersized thumbs and an unclear transition. Discrete snapshots explain the motion more legibly and preserve the preferred soft visual language.
- Scope: READER-05 and the shared Hanon warm-up card/guide used from piano and MIDI sessions. This does not change exercise notes, fingering, tempo, playback or warm-up selection.
- Verification: the production build and seven focused warm-up unit checks pass. The live browser card and guide were visually inspected, and the four guide cards were measured as a single 305 px column at 390 × 844. This is responsive-browser review, not a dated evidence run or native-device acceptance.
- Manual impact: the session manual now describes the four snapshots and the wider-span hand advance. The manual remains draft while owner feedback and native phone/tablet coverage are open.

## D-014 — Reusable, phrase-aware hand motion for keyboard guides

- Status: **superseded by D-015** on 2026-10-05. The implementation below was functionally verified but rejected after visual review.
- Agreement: replace per-note fingertip highlighting and abrupt whole-hand jumps with a reusable motion grammar. Each pattern has press, release, return/gather, travel and reopen phases. For ascending Hanon No. 1 transitions, the right thumb and left little finger prepare on the way back, the remaining fingers gather, both hands travel continuously by one white key and reopen into the next figure.
- Architecture: exercise notes and fingering remain in `warmups.js`; normalized hand and finger poses live in `warmup-hand-motion.js`; the SVG guide is only a renderer. This allows later renderers or anatomy refinements to keep the same musical timing and gesture behavior.
- Scope: READER-05 and the shared Hanon guide used from piano/MIDI warm-ups. It does not claim that the current drawn hand reaches the approved visual quality of the B concept image.
- Verification: production build, the focused warm-up browser flow and the pure motion/transition tests passed for this historical implementation. Its renderer and motion tests were removed when D-015 replaced the approach.

## D-001 — Review each screen before declaring the release ready

- Status: **accepted process**, requested by the product owner on 2026-10-01.
- Agreement: start with Today; define each screen's purpose; compare phone/tablet portrait/landscape snapshots; discuss refinements; follow every menu, exercise and child view; carry decisions across later and already reviewed screens; build an embeddable user manual alongside the work.
- Applies to: all IDs in [screen inventory](screen-inventory.md), all shared components and the manual.
- Implementation: review workspace, stable surface inventory, immutable baseline captures and draft manual source created.
- Verification: no application screen is accepted merely because the review structure exists. Today's presented compact layout is explicitly accepted; its remaining coverage and child reviews remain tracked.

## D-002 — Prioritize the next useful practice action on Today

- Status: **implemented, functionally verified and visually accepted in the presented scope** on 2026-10-01. The first response selected practice-first; the follow-up accepted the conclusions/proposals and clarified the navigation in D-003. After the compact comparison, the owner explicitly confirmed “me gusta, aprobar y continuar”. This accepts the rendered hierarchy without closing untouched child flows or release gates.
- Accepted objective: let the pianist understand what to practise now and start or resume with minimal effort; use the current week and commitments as context.
- Accepted ordering: unfinished session first; otherwise the next planned practice; otherwise choose a practice activity. Keep alternatives available without competing equally with the main action. Keep weekly context and the shared header compact, especially in landscape. Today explains what is due and encourages practice; the new Practice destination provides the activity/routine chooser.
- Evidence: in all three landscape-phone fixtures, the session's Start/Resume or empty-state Start action is below the first viewport. In the populated fixture, activity and routine shortcuts are below the initial viewport at all four sizes.
- Alternatives considered and not selected: make the daily agenda dominant; or prioritize progress summary and then practice choices.
- Current surfaces: TODAY-01, TODAY-03, TODAY-04; inspect CAL-05 and PRACTICE-01 before deciding common start/resume semantics. Components: C-AGENDA, C-PRACTICE, C-NAV, C-EMPTY.
- Previously closed reviews affected: none yet. Future checks: preserve card meaning in Calendar and the renamed Library; keep the main action usable with long labels and enlarged text.
- Manual impact: Today chapter describes the checked hierarchy, Practice entry, Calendar/event date context and Profile progress entry. Its index records visual acceptance; the chapter remains editorially draft while behavior/wording review and remaining coverage continue.
- Implementation scope: contextual main action, compact week/header and explicit today date when adding an event or opening Calendar from Today. Retain existing session start/resume semantics while their child views await review. Compare against the immutable baseline using the same synthetic fixtures; do not silently treat the agreed direction as verified behavior.
- Verification: [final follow-up evidence](captures/today/2026-10-01-practice-navigation-02/index.html) has all 12 primary actions visible, no horizontal page overflow or runtime errors, corrected event date and 44px-wide week targets at 320px. See [Today verification](today.md#navigation-refinement-verification) for the test/native scope and remaining gates.

## D-003 — Separate today's agenda, practice, planning and the library

- Status: **implemented, functionally verified and visually accepted in the presented scope** on 2026-10-01, including the owner's later “me gusta, aprobar y continuar” response to the compact result. The product owner selected **Library / Biblioteca** in the naming response. This accepts the navigation/access changes, not the detailed design of each destination.
- Agreement: main destinations are Today, Practice, Calendar and the renamed My piano section. Today shows what is due and encourages action; Practice is the quick path to playing; Calendar plans the schedule; Library manages repertoire, scores, catalogue and routines. Use a more prominent Profile avatar without a visible text label, retaining its accessible name.
- MIDI: remove it as a peer navigation destination. Keep a compact connection/activity utility resembling a device status indicator, with access to instrument settings. Preserve accessible state descriptions and the score/practice activity indicators; compact presentation must not imply that a connected instrument has produced input.
- Profile: progress, practice totals, streaks and motivational information belong here. This pass only changes existing access/grouping where necessary. Detailed progress/Profile design and any new streak behavior wait for their later review; do not fabricate metrics or broaden this pass into those screens.
- Evidence/rationale: the owner identified wasted landscape header space, excessive MIDI prominence, a weak labeled Profile entry and a mismatch between the My piano name and its content. A persistent Practice entry makes quick practice independent of scrolling through Today's agenda.
- Scope: C-NAV across TODAY, CAL, PREP, PRACTICE, PIANO, REP, CAT, PROFILE, MIDI and SYSTEM-02/03; C-MIDI status rendering; new HUB-01 Practice destination. Keep existing review IDs and internal routes/stable notebook identifiers where possible; no data migration is implied by relabeling.
- Previously closed reviews affected: none. TODAY-01 baseline is historical, with comparable follow-up evidence linked above. Other destinations remain unreviewed; shared-menu smoke checks do not accept their contents.
- Required checks: four viewport navigation/primary-action reachability; landscape header height; active destination on child routes; icon-only Profile accessible name and touch area; MIDI connection versus activity; nested Back behavior; English and Spanish labels. Native bars, real MIDI and iOS remain separate evidence gates.
- Verification: 210 app tests passed with one optional network skip. Android smoke verified the four labels, actual Back from Practice to Today, the visible 44px MIDI utility and Profile/Library entry points; notebook and 55 asset hashes remained unchanged. Native four-orientation, physical MIDI and iOS acceptance remain separate.
- Documentation: product navigation and Today instructions reconciled with checked behavior. Future progress design remains separate from implemented capabilities.

## D-004 — Try a more compact Today and Practice entry

- Status: **implemented, scoped verification passed and presented compact result visually accepted** on 2026-10-01. The owner first requested smaller widgets/buttons, then explicitly approved the result: “me gusta, aprobar y continuar”. Compact Today is the visual reference for subsequent reviews; this does not close untouched Practice or other destination flows.
- Direction: reduce card padding, gaps, oversized type and unnecessarily wide buttons. Preserve D-002's contextual main action, D-003's navigation roles, all visible data/actions and touch areas of at least 44px. Do not reduce the interface by hiding useful information or shrinking controls below that working convention.
- Scope: TODAY-01/03/05 and consistent compact treatment in HUB-01 through scoped rules in `src/companion/app.css`. Shared focus: C-AGENDA, C-PRACTICE and C-EMPTY. C-NAV geometry is unchanged. Calendar, Library, Profile and practice/score controls are not redesigned in this experiment.
- Consistency: preserve earlier captures and use the accepted compact Today as the reference. Recheck its states and four layouts whenever shared components change. Apply the density direction to later screens after reviewing their content and input needs; no blanket redesign is implied.
- Data and behavior: no notebook migration, new settings, changed session semantics or content removal. No translation or manual behavior change is expected.
- Evidence: [compact gallery](captures/today/2026-10-01-compact/index.html), 21 frames using the existing typical, empty and pending fixtures. Compare with [the navigation refinement](captures/today/2026-10-01-practice-navigation-02/index.html). All 12 primary actions remain visible; no page-width overflow or runtime errors. The portrait-phone populated page is 248px shorter, its primary button is 127px wide instead of 316px and remains 44px high. Week targets at 320px remain 44px wide.
- Verification: nine focused browser tests passed, covering Today, Calendar actions, navigation, notebook layout and localization. Production web and Android APK builds passed. The installed Android compact-style/navigation smoke check passed, preserving notebook and 55 asset hashes. See [compact verification](today.md#compact-verification). Visual acceptance is recorded above; broader accessibility/native-device gates remain open.
- Manual: behavior is unchanged. Retain chapter text and the checked compact evidence; record explicit visual acceptance in the index without advancing the chapter beyond draft before the behavior/wording review and outstanding coverage close.

## D-005 — Adapt the current session without losing performed work

- Status: **implemented and approved except the original reorder/remove controls, superseded by D-006**, 2026-10-01. The owner agreed with the session analysis and added live duration changes, moving blocks up/down, removal and addition. The owner approved the remaining layout and behavior in the follow-up requesting standard long-press dragging.
- Objective: identify the current block and practice state, then start/resume, advance, adapt or finish without uncertainty or losing work. A compact current-block panel leads; separate block/session clocks and an editable sequence provide context.
- Editing: change suggested minutes inline; use accessible up/down controls; remove a remaining block; add reading, technique, repertoire or free practice when compatible with the session context. Changes pause practice. Completed blocks stay fixed; retain at least one pending block, or use Finish session. Changes belong to the active session, not its source routine or planned structure.
- Continuity: postponing a started block retains its clock, answers and generated-score snapshot under its stable ID. Returning to it restores those values. Removing a started block preserves performed work in history results; finalizing early also retains postponed work. Suggestions never truncate elapsed time or automatically advance practice.
- Persistence: save an edited clone before replacing live state. Failed edits/feedback saves leave the paused session available for retry. Finish opens feedback without prematurely exhausting the current block; Keep practising can return to it.
- Scope: PRACTICE-01, its new PRACTICE-08 Add dialog and the confirmed PRACTICE-06 save/cancel defects; C-PRACTICE, C-DURATION, C-FEEDBACK. Today remains the accepted visual reference and its Start/Resume route remains unchanged. Score controls, preparation, Calendar structures and Library routines are not redesigned here. Existing quick-routine auto-entry remains tracked separately under SESSION-F02.
- Data: additive optional suspended-runtime field, no migration or ID remapping. Preserve notebook, source blocks, PDF assets and annotations. Local backups validate and restore suspended progress.
- Manual/locale: update the session chapter with verified behavior; concise English base and Spanish labels. Keep the chapter draft until its remaining child reviews are complete.
- Verification: attach the new four-layout gallery and regression/native results in [session review](session.md). Do not treat implementation as visual or release-wide approval.

## D-006 — Standard item movement: long press, drag and a temporary bin

- Accepted on 2026-10-01: the owner rejected the always-visible reorder arrows, requested standard long-press-and-move with a bin, and approved the rest of D-005. This revises only rearrangement/removal presentation.
- Hold a remaining block for 380ms to lift it; drag to the insertion marker and release to reorder. A bin appears during the gesture; release over it to remove. Normal early movement scrolls, cancellation leaves the order unchanged, and completed blocks remain fixed. Picking up pauses practice. Existing atomic writes and performed-work preservation apply.
- A 44px grip offers tap/keyboard alternatives through a small options menu. This preserves accessibility without leaving row arrows and delete controls visible. The last remaining block cannot be removed; Finish remains available.
- Product-wide agreement: the owner subsequently requested this as the standard for moving items, explicitly including the upcoming Calendar review. Use long press to lift, visible destination/insertion feedback, release to move, and a temporary bin when the item supports removal. Preserve normal scrolling, cancellation without changes and an accessible tap/keyboard alternative.
- Scope and implementation: implemented in PRACTICE-01; required when reviewing PREP-02, CAL-08 and other movable-item surfaces. The accepted compact layout, Add dialog and Today are retained. Calendar and preparation are future applications of the accepted standard, not already-updated implementations.
- Calendar acceptance: hold a movable appointment, drag to a highlighted destination day and release to reschedule. A bin must follow the appointment's existing deletion rules, including any recurrence choice or confirmation; dragging must not silently delete a series or alter completed/active-session restrictions. Verify scrolling, cancellation, save failure, preserved reminders and unaffected recurring siblings.
- Consistency boundary: this standard governs item rearrangement/rescheduling. Score panning, keyboard panning and annotation strokes retain their direct-manipulation gestures. Record any item-movement exception with its reason when that surface is reviewed.
- Evidence: [drag gallery](captures/session/2026-10-01-session-drag-02/index.html), including held states in four layouts; 17 focused tests pass, including real Chromium touch input, cancellation, movement/bin removal, retained elapsed time and last-block protection. Browser touch emulation does not establish physical-device gesture acceptance.
- Continuation: do not begin a new screen in this conversation. Resume from README.md with the generated reading/technique screen baseline; native touch and remaining accessibility gates stay tracked.

## D-007 — Edit block settings and use the row width for duration

- Status: **requested, implemented and scoped verification passed**, 2026-10-01. The owner requested full block editing, better use of card width and easier time changes, suggesting a slider. The resulting visuals await feedback; earlier approvals remain scoped to their presented versions.
- Each unfinished block has a pencil action beside its drag grip. The duration slider spans the row with an exact minutes field at the right. Preview the planned total while dragging; persist on release. The slider normally spans 1–60 minutes and expands for longer saved blocks; exact entry supports 1–600 minutes.
- Edit opens a compact dialog for activity, duration, scale/work, hands and tempo, plus context-relevant timing and additional reading settings. More settings keeps secondary options and focus/passage text reachable. Cancel does not change the block. Completed blocks remain locked.
- Duration-only changes preserve the exercise position. Musical/content changes archive any performed work under its original settings, then clear only that block's exercise runtime. Retain total session time, stable IDs, source routine/plan structure, assets and annotations. Failed writes keep the original paused session and the edit form available for retry.
- Scope: PRACTICE-01 and new PRACTICE-09; C-PRACTICE, C-DURATION and C-DIALOG. D-006 movement behavior is unchanged. Carry the control density and preservation rules into later preparation/routine reviews; no Calendar redesign is included.
- Evidence: [overview and drag states](captures/session/2026-10-01-block-controls-02/index.html), 24 frames across 16 views; [English/Spanish editor](captures/session/2026-10-01-edit-block-02/index.html), 24 frames across 16 views. Four standard layouts include basic and expanded editor states. The basic editor's Save/Cancel fit in phone landscape.
- Verification: 24 focused model/browser tests pass, covering duration preview/commit, editing, cancel, failure/retry, reload, retained progress, drag/bin and notebook layout. See the session review for native verification scope. Manual updated; no new child screen review starts in this conversation.

## D-008 — Warm-up sets, the music stand and pieces chosen at practice time

- Status: **requested, implemented and functionally verified**, 2026-10-03. The owner found a single Hanon exercise monotonous and accepted a proposal for multi-exercise warm-ups (“Me parece bien el enfoque”). In the same request they asked to mark catalogue pieces as repertoire, split the repertoire into “En el atril” and the rest, choose the piece of a repertoire block at practice time (changeable, several pieces per block), record the part of the piece worked on, and offer MIDI follow for MusicXML as an option. The new layouts await visual feedback; no capture run was made.
- Warm-up: Hanon Nos. 6–10 added from the Mutopia edition (fingering checked against the LilyPond source). A warm-up block stores `exercises` (1–5 ids; `target` = first). Each exercise plays once (one octave up and back), then the next; the stream loops the set. Set size = round(minutes · 60 / pass time) clamped to 2–5, so 3 minutes give two exercises at level 1 and three at level 2. The rotating set starts one exercise later per session with a warm-up. From rhythm level 2 each exercise starts +4 BPM relative to the previous one. The guide shows “Exercise n of N” with links; the reader names the current exercise. The proposed rhythmic variants were deferred.
- Music stand: works gain optional `onStand`. Without it, works count as on the stand unless in maintenance or archived (matching the previous Library summary). Repertoire lists the stand in full, then the paged rest, each with a stand toggle; Library’s summary uses the same rule. Catalogue cards (PDF and MusicXML) show “+ Repertoire” / “✓ In your repertoire”; adding does not put the piece on the stand, practising it does.
- Repertoire blocks: an empty `workId` means “choose when practising” in preparation, add-block and the block editor. The current block lists the stand first; unplayable MusicXML pieces are disabled. Choosing keeps any time already spent; “Change piece” archives the previous piece’s time as its own result through the D-007 edit path. The save dialog and Edit feedback record “Part of the piece you worked on” per repertoire result (`result.block.passage`), shown in session details and the work’s session list.
- MusicXML follow: optional “Follow” toggle in the practice viewer (remembered per device), with both/right/left hands by staff. The OSMD cursor waits for every key of each chord; wrong keys count but never advance; rests, grace notes and notated tied continuations are skipped; the page follows the cursor. Counts are stored as the repertoire block’s MIDI measurement. Limitation: ties notated only with `<tie>` (no `<tied>`) are not linked by OSMD.
- Scope: PRACTICE-01, Repertoire, Library summary, catalogue cards, MusicXML viewer, session feedback. Data: additive optional fields only (`exercises`, `onStand`); older notebooks validate unchanged.
- Verification: unit tests for Hanon 6–10, sets, rotation, stand paging, parts and the follower; browser tests for the warm-up set guide/reader label, add-block without a piece and MusicXML follow on the synthetic fixture (C4+C3, tied F#4 skipped, wrong key counted). Manual updated. Phone/tablet captures and native MIDI acceptance remain open.

## D-009 — Generated mobile practice objective and stable answer surface

- Status: **proposed for discussion**, 2026-10-04. Do not implement or record acceptance from silence.
- Proposed objective: let the pianist read the current prompt, answer confidently on a playable on-screen keyboard and understand the result immediately, while the score and current position stay stable.
- Proposed success criteria: distinguish timed/self-paced and paused/active states; never advance on a wrong answer; keep generated notes within the committed keyboard range; preserve line, answers and range across rotation/interruption; keep score, input and primary controls visible in the four standard layouts; prevent transient notices from covering playable keys.
- Evidence: [PRACTICE-02 baseline](captures/generated-practice/2026-10-04-baseline/index.html), 16 captures across four states and four viewports. No page overflow or runtime errors. Twenty-seven focused browser checks pass. GEN-F01 records the recovered-session toast covering the keyboard; GEN-F02 records stale count-in status when pausing during the initial transition.
- Scope: PRACTICE-02 now; later consistency checks for PRACTICE-03/04, C-PRACTICE, C-SCORE and SYSTEM-03. No source behavior, notebook schema, stable ID, score asset, annotation or manual capability changed in this baseline pass.
- Open gates: owner agreement, longer/enlarged content, assistive input, physical Android touch/rotation, native recovery timing, physical MIDI and iOS. See [generated-practice review](generated-practice.md).

## D-010 — One stable two-row toolbar above every generated practice

- Status: **owner-requested, implemented and scoped verification passed**, 2026-10-04. The owner observed that separate upper/lower button bars waste space, that the upper bar changes between one and two rows, and that Start/Stop moves between practice types. They requested one grouped upper area, a keyboard fixed at the bottom and controls that remain easy to find in the same place.
- Accepted layout: generated managed practice uses one compact upper control area. Row 1 is Back to session, exercise title, MIDI state and forward block navigation. Timing and the stable **Continue/Pause** action remain in the next control group. D-011 defines directional labels. D-012's overflow-menu placement was later superseded by D-013; on a narrow portrait phone its direct shortcuts wrap within the same upper control area.
- Main action: managed practice always shows the words **Continue** or **Pause**, including phones. It occupies the same row, column and 44 px height in every captured state; hiding tempo no longer moves it.
- Secondary tools: D-010 originally used a final fixed slot with an anchored panel for keyboard range, recenter, guide and fingering. It replaced the persistent lower bar and kept the keyboard at the bottom edge. D-013 supersedes only that panel hierarchy with direct compact shortcuts and direct tabbed settings.
- Scope: PRACTICE-02–04 and READER managed-practice shell; C-PRACTICE, C-SCORE and SYSTEM-03. The standalone legacy-reader layout is preserved. No session data, generated material, results, IDs, assets or annotations change.
- Evidence: [unified toolbar gallery](captures/generated-practice/2026-10-04-unified-toolbar-03/index.html), 16 state/layout views plus four opened Tools frames. The main action has identical x/y/width/height across the four states for each device; keyboard bottom equals viewport height in all 16 views. No page overflow or runtime exceptions.
- Verification: production build and 28 focused browser checks pass, covering 14 responsive sizes, timed/self-paced reading and technique, keyboard-range commits/recovery, score guides/fingering and interruption/rotation behavior. Native safe areas, physical touch, enlarged text and iOS remain open. The rendered follow-up still awaits visual feedback; implementation is not the same as final visual acceptance.

## D-011 — Directional navigation between session and practice blocks

- Status: **owner-requested, implemented and scoped verification passed**, 2026-10-04. The owner found **Session** and **Finish** confusing and requested a back/forward model: one control returns to the session and the other advances to the next block, naming that block when space permits.
- Accepted behavior: the left control returns to the session without completing the current block. The right control advances to the next block and uses **Next: [block type]** on layouts with room. On the final block it uses **Feedback**, which describes the actual destination. Phone portrait keeps only the directional arrows; full localized accessible names and tooltips remain available.
- Consistency: the two controls occupy the same outer positions in every generated practice type. Internal score page controls remain separate because they move within the current score rather than between session blocks.
- Scope: PRACTICE-02–04 and the READER managed-practice shell. No notebook records, progress, generated material, results, stable IDs, PDFs or annotations change.
- Evidence: [directional-navigation gallery](captures/generated-practice/2026-10-04-directional-navigation/index.html), 20 state/layout views across five fixtures and four viewports. The added two-block fixture shows arrow-only phone portrait and **Next: Technique** in wider Spanish layouts; final-block fixtures show **Feedback**. No page overflow or runtime exceptions were recorded.
- Verification: production build and 32 focused browser checks pass, including 14 responsive sizes, English/Spanish accessible labels, warm-up-to-reading navigation, timed/self-paced reading and technique, range adaptation, score guides/fingering and recovery/rotation. Native screen-reader and touch acceptance remain open; the rendered result still awaits visual feedback.

## D-012 — One consolidated practice menu and compact metrics row

- Status: **superseded by D-013 after rendered feedback**, 2026-10-04. The consolidated **…** implementation and its verification remain recorded as history, but it is no longer the accepted control hierarchy. The owner found a menu containing another entry point named Practice settings neither clean nor meaningful.
- Historical layout: the second toolbar row contained only Tempo or **No tempo**, the stable **Continue/Pause** action and **…**. The menu contained Practice settings, the current Sound mode, keyboard range/recenter, guide and fingering. Each menu option remained textual and at least 44 px high.
- Metrics: elapsed practice time now leads the compact row containing correct, wrong, streak and average response time. The group is left-aligned with a bounded responsive gap instead of distributing each metric across the full width.
- Scope: PRACTICE-02–04 and the READER managed-practice shell. The standalone reader restores its original quick controls. No session data, timing calculation, measurements, settings values, stable IDs, PDFs or annotations change.
- Evidence: [consolidated-tools gallery](captures/generated-practice/2026-10-04-consolidated-tools-03/index.html), 20 state/layout views plus four opened-menu frames. The menu is fully legible in all four standard layouts; the keyboard remains at the viewport bottom and no page overflow/runtime errors were recorded. Two earlier same-day capture iterations are retained as implementation history; `consolidated-tools-03` is the final D-012 stage.
- Verification: production build and the 32-check focused suite passed; an additional targeted browser assertion verified that Settings and Sound lived inside the menu and that the elapsed clock lived inside the metrics row. Subsequent rendered feedback rejected the hierarchy. Native screen-reader, safe-area and physical-touch acceptance remain open under D-013.

## D-013 — Minimal, flat practice controls with direct settings

- Status: **owner-requested and implemented; responsive visual/browser re-verification pending**, 2026-10-04.
- Review update, 2026-10-05: [four-layout production-browser gallery](captures/generated-practice/2026-10-05-flat-controls-settings/index.html) verifies direct settings entry and records GEN-F06: Continue/recenter and Sound/Guide overlap in phone landscape. D-013 remains open for this correction and owner visual feedback. Native coverage remains pending.
- Agreement: keep the upper practice controls minimal and flat. Do not place **Practice settings** inside a generic **…** menu. Tempo or **No tempo** and **Continue/Pause** retain their stable primary positions. Sound, guide, fingering and keyboard recenter are compact direct shortcuts; the settings gear opens the Practice tab directly. Detailed keyboard range and presentation choices are ordered inside that tab rather than exposed through a menu that opens another menu.
- Responsive behavior: phone portrait keeps the primary row visually dominant and puts the four direct shortcuts on a compact second line within the same upper control area. Phone landscape and tablets keep the shortcuts in one line. Controls retain textual accessible names and 44 px targets; icons are presentation only.
- Consistency rule for later screens: an overflow menu may contain terminal secondary actions, but must not act as a wrapper around a second settings menu or destination. Keep the primary action and the few context-frequent toggles visible; open substantial configuration directly and organize it by clear sections or tabs. Apply this during each later screen review rather than mechanically copying this practice-specific set of shortcuts.
- Scope: PRACTICE-02–04 and READER managed-practice shell now; C-PRACTICE, C-DIALOG, C-SCORE and future screen reviews as a hierarchy check. The standalone legacy reader retains its existing controls. No session data, timing, generated material, settings values, stable IDs, scores, PDFs or annotations change.
- Implementation: the **…** trigger and anchored panel are removed. Sound, guide, fingering, recenter and settings are direct children of the upper quick-control group. The existing Practice settings tab owns the detailed keyboard-position control. The compact metrics placement introduced with D-012 is retained.
- Verification: the production build and JavaScript syntax checks pass. The focused browser test and new deterministic capture run could not start their disposable Chromium session in this workspace and timed out before loading the application; therefore the new responsive layout is not yet claimed as browser-verified and no D-013 gallery is linked. Earlier D-012 captures remain historical evidence only. Native safe-area, touch and screen-reader gates remain open.

## Questions still separate from D-002

| Question | Initial evidence | Affected surfaces | Status |
| --- | --- | --- | --- |
| Should actions entered from Today default their date to today rather than the last calendar selection? | TODAY-F04 | TODAY-05, CAL-03, CAL-06, PREP-01, PREP-03 | Accepted for Today's Add event under D-002; verify Calendar retains its selected-day context |
| What does Start/Resume mean consistently for planned, ad-hoc and routine practice? | TODAY-F05/F06 | TODAY-02/03/04, CAL-05, PRACTICE-01, PIANO routine actions | Open |
| What should date markers encode: activity, completion, or both? | TODAY-F07 | TODAY-01, CAL-01/02, C-AGENDA | Open |
| How should weekly progress be labeled, and where should it open? | TODAY-F08 | TODAY-01, PIANO progress surfaces, PROFILE-01, C-AGENDA | Weekly totals moved to Profile → Your progress (D-003); Today retains calendar context; detailed metrics design deferred |
| Should Today offer recovery of missed planned practices? | TODAY-F11 | TODAY-01, CAL-01/02/05 | Deferred for discussion; no scope commitment |

## Decision entry template

### Accepted phone-landscape practice layout — 2026-10-07

- Owner approved proposal `captures/generated-practice/2026-10-07-landscape-sidebars-proposal-03/proposal.png`.
- Pause/timer and tools occupy the right sidebar; points and note metrics occupy the left. Session and Feedback are aligned at the top. Note-stat values align in one column. The central score and taller on-screen keyboard use the remaining space.
- Scope: generated on-screen practice in phone landscape; shared practice toolbar and score/input layout. Preserve portrait behavior, key geometry, notebook IDs, timing and scores. No data migration.
- Evidence is an isolated responsive browser quick-practice proposal (844x390), not native acceptance. Production implementation and ordinary-practice/shared-screen regression coverage remain pending. No additional user copy or manual availability claims until verified.
- Implementation follow-up: src/landscape-keyboard.css is imported by main.js and scoped to managed mobile keyboard practice on short phone-landscape screens. Production quick/self-paced/timed captures inspected in 2026-10-07-landscape-applied; focused rotation, tools/sound and pause/resume checks pass in phone/tablet portrait/landscape. Existing keyboard geometry and standalone layout regression pass. Manual session overview reflects verified browser behavior. Native acceptance remains open; no APK or publication.

For each new decision record: ID/title/date, exact accepted behavior, evidence/rationale, exceptions, current and previously reviewed affected screens, shared components, migration/data impact, implementation references, manual/translation impact, verification evidence and closure state. Avoid recording a suggestion or a preselected answer as an accepted decision.


### Native Android/iOS parity review requested — 2026-10-11

The owner requested screenshots and a difference list across both platforms and four device layouts. The [audit](platform-comparison.md) records proposed priorities and observed evidence. It accepts no new product layout, platform scope or implementation. Evaluate PLATFORM findings before selecting fixes. Earlier accepted screen objectives and browser approvals remain valid; native comparative evidence does not close physical MIDI, cloud-provider, printer or accessibility gates.

Native follow-up to the accepted phone-landscape sidebar layout: PLATFORM-13 records 8px fixed control offsets against 62px iPhone horizontal safe insets. Reopen native verification of PRACTICE-02 and Quick practice; safe-area compensation is proposed, not implemented or accepted. The existing layout objective is preserved.

PLATFORM-15 reopens C-DIALOG initial focus/scroll behavior for warm-up and other long dialogs. Native iPad evidence starts at the closing action rather than the introduction; the focus/scroll repair is proposed. No guide artwork or new layout is accepted by this finding.

## 2026-10-11 — iOS parity requirements and selected fixes

The owner requires MIDI and notifications on iOS, approves PLATFORM-04 date/time sizing and PLATFORM-13 safe-area compensation, and directs PLATFORM-12 to ignore Wi-Fi/metered-network type on iOS. The [implementation follow-up](platform-ios-followup.md) records source changes and targeted evidence. Notification delivery acceptance and MIDI implementation remain open; the Swift Core MIDI bridge is proposed. No printing, warm-up focus, icon redesign or old-WebView compatibility fix is accepted by this decision.


## 2026-10-12 — Major beta scope approved by owner

The owner requests a custom Apple Core MIDI bridge, iOS closed-app reminders with Android review, and the PLATFORM-15 warm-up initial focus/scroll fix. The owner also requests light/dark/system themes from Profile, native rating/share actions and an initial skippable walkthrough. Current dark appearance is preserved; old notebooks retain dark while new notebooks default to system. Stable record IDs and notebook schema stay unchanged.

The owner identifies stable as 5.2.3 (35) and has no Apple Developer account. The new major package is 6.0.0-beta.1 (40). Android beta uses a separate application ID to protect installed notebooks. iOS distribution is limited to an explicitly labelled Mac/Xcode simulator archive; signed device/TestFlight delivery remains unavailable. Website publication is authorized by the original request. Printing/keyboard and Android PDF acceptance are reserved for the owner's testing. See [release verification](../releases/6.0.0-beta.1.md).


## 2026-10-12 — Beta practice behavior refinements

The owner requests autoplay/timing for new practice, resumption after annotation editing, screen-awake release on pause, direct sync-problem resolution, ongoing automatic synchronization, editable practiced duration at save, and MIDI short reconnect/long settings gestures. Implemented as recorded in ../releases/6.0.0-beta.2.md. Existing notebook schema and stable IDs are preserved. Active work gates incoming synchronization; cloud connection/opt-out choices remain respected. Existing PDF practice and annotation reviews were reopened for the shared pause/edit transition and verified in responsive browser checks. These checks do not close physical MIDI, cloud-provider or native notification delivery gates.


## 2026-10-12 — Persistent app header requested

The owner requests stable top chrome alongside fixed base navigation, with Profile at the top left, the page title and contextual controls in the middle, and MIDI on the right. Content scrolls independently; immersive practice/readers hide or cover app chrome. The owner also requests lighter MIDI styling in light mode. This applies to all six main screens, calendar Week/Month, library repertoire/catalogue and Quick practice. Existing tablet/landscape side-navigation objectives are retained; Profile is relocated to the top header. Implemented and verified in 48 responsive screen/theme/layout states and existing practice/PDF/theme/tour/safe-area regressions; native Android replacement install/foreground is separate evidence. No physical/native layout acceptance is inferred from browser captures.

The beta header keeps at least 68 px of usable height, plus device safe-area insets. Notch-specific responsive browser checks cover portrait and landscape; these are distinct from physical-device acceptance.

## QR notebook linking and portable backup compatibility — 2026-10-12

Owner accepted linking the existing Google Drive/iCloud notebook, rather than introducing SPino accounts. Implemented QR/code identification with an explicit provider file grant on each new device and native wrong-file validation before destination replacement. A QR is not an authentication token. Owner also requires repertoire/annotation inclusion and compatibility warnings/conversion. Both JSON containers include the complete notebook; organized format 2 is optional, explicitly acknowledged, and convertible in both directions without modifying the original. Shared data schema/cloud format remain at version 1. Browser/synthetic round trips verified; physical camera/provider acceptance remains open. See beta 3 release handoff and dated responsive captures.
