# Generated practice with the on-screen keyboard

2026-10-07 accepted phone-landscape sidebar layout is now implemented for managed mobile keyboard reading/technique. Source: src/landscape-keyboard.css and the layout scope attribute in main.js. Quick practice, ordinary self-paced and timed production screenshots are in captures/generated-practice/2026-10-07-landscape-applied. Focused seven-viewport rotation/settings/pause checks pass for timed and self-paced practice; key geometry/material and earlier responsive/range/score checks pass. Browser evidence only, not native acceptance. Portrait/tablet layouts unchanged; no new Android package.

2026-10-07 owner-requested visual proposal, not applied: subtle ivory bevels, textured dark keys and illuminated/depressed press states. Review-only injected CSS and sixteen four-layout responsive captures are in [keyboard depth proposal](captures/generated-practice/2026-10-07-keyboard-depth-proposal/index.html). Real pointer presses show the existing held state. Exact key/edge geometry and MIDI mapping are unchanged; no layout or interaction rewrite, no website screenshot refresh, no new Android package. Await approval before changing production styles. Earlier behavior and native/accessibility gates remain unchanged.

Review ID: **PRACTICE-02**. Status: **D-013 replaces the rejected consolidated menu with flat direct shortcuts; implementation builds, responsive visual/browser re-verification is pending**. Started: 2026-10-04.

This review follows **Open exercise** from the accepted session overview into generated reading and technique without a physical piano. It covers the on-screen keyboard only. Note-name input is PRACTICE-03; physical piano/MIDI is PRACTICE-04. The current baseline includes D-008 and all other uncommitted source work present on 2026-10-04. No application behavior was changed for this review.

## Proposed objective

Read the current musical prompt, answer confidently on a playable on-screen keyboard and immediately understand whether the answer was accepted, while the score and current position remain stable.

Proposed success criteria:

- Keep the current note, answer feedback and Pause/Continue action unambiguous in timed and self-paced practice.
- Keep every generated note playable in the visible keyboard range; range changes must not count as answers and must replace material only after the gesture commits.
- A wrong answer must not move the score or skip the expected note. Self-paced practice must not create missed notes while idle.
- Preserve the line, answer state, range and accumulated result through rotation, pause, return and relaunch.
- Fit the score, keyboard and primary controls in phone/tablet portrait/landscape without page overflow or controls covering playable keys.
- Keep back-to-session and forward-to-next-block navigation predictable and distinct; settings, guides and fingering remain reachable without destabilizing the exercise.

This objective is proposed, not accepted. It preserves the existing product constraints and does not imply a redesign.

## Accepted toolbar direction

The owner requested one minimal upper control area, removal of the persistent lower button bar, a keyboard fixed at the bottom and a stable location for Start/Stop across every practice type. D-010 established the stable control area and D-013 now refines its hierarchy:

1. Back to session, exercise title, MIDI state and forward to the next block or Feedback.
2. Tempo or **No tempo** and **Continue/Pause** remain primary. Sound, guide, fingering and recenter are direct compact shortcuts, and the settings gear opens the Practice tab directly.

There is no **…** menu and no menu entry that opens another settings menu. Detailed keyboard range and presentation controls are ordered inside Practice settings. On phone portrait the direct shortcuts use a compact second line in the same upper control area; wider layouts keep them beside the primary controls. The main action uses words on phones as well as tablets and does not change position when tempo is unavailable.

D-011 replaces the ambiguous Session/Finish pairing with directional navigation. The left control returns without completing the block. The right control names the next block when space permits and says **Feedback** on the last block; narrow phone portrait shows arrows only while retaining complete accessible labels.

## Hanon guide refinement

### 2026-10-09 — 2D frame-animation production proposal

Owner requested a more cartoon rendering of the anchored single pose. Built-in style-only edit saved as `captures/warmups/2026-10-09-frame-pilot/hanon1-left-anchored-cartoon-v1.png`. Prompt: retain five-digit silhouette, fingertip anchors and keyboard geometry; replace realistic skin/fabric textures with smooth peach fills, warm outlines and simple cel shading. Visual inspection retains contacts on C3/E3/F3/G3/A3 below black-key ends. Cartoon-style acceptance and anatomical curvature remain pending; no app integration or animation.

Fixed-contact single-pose result: `captures/warmups/2026-10-09-frame-pilot/hanon1-left-anchored-contact-v1.png`. New deterministic keyboard/contact blueprint generated by `scripts/review/hanon1-contact-guide.cjs`, with JSON anchors on C3/E3/F3/G3/A3 and fingertip-radius clearance below every black-key end. Built-in image edit prompt adds exactly five slender left-hand fingers around those fixed anchors, no rejected hand-image references. Visual review finds five fingertips on the intended exposed white surfaces, below black-key ends and clear of seams. This is visual contact verification, not exact pixel-registration proof, anatomy certification, accepted eight-pose coverage or a completed animation. Skin texture is more realistic than the preferred soft model; hand curvature/spread and style still await owner feedback. App unchanged.

Slim-finger edit saved as `captures/warmups/2026-10-09-frame-pilot/hanon1-eight-base-poses-v2-unapproved.png` (built-in image edit of v1). Prompt preserves eight panels and asks narrower fingers, standard key topology and the exact normalized five-note contacts listed below. Inspection: fingers slimmer, five digits per panel, but inner fingertips still overlap black-key ends and several target centres/seams are wrong. Therefore the exact-white-contact requirement FAILED; this draft is not approved or integrated. Further production needs explicit keyboard/fingertip registration, not a claim that prompt instructions established correctness.

Owner refinement after the eight-pose comparison: slimmer fingers, accurate piano key spacing/shapes, and every fingertip wholly on an individual white key, avoiding black-key surfaces and white-key seams. This supersedes the earlier orientation-only keyboard treatment for the next draft. Normalized pose targets: ascending open C–E–F–G–A, gathered D–E–F–G–A; descending open E–F–G–A–C, gathered E–F–G–A–B. Left fingertips run 5–4–3–2–1 from left to right; right fingertips 1–2–3–4–5. These are translated representative pose anchors, not a full score playback sequence. New generated output still needs visual contact verification; do not claim exact key alignment from a prompt alone.

Eight-pose sheet saved as `captures/warmups/2026-10-09-frame-pilot/hanon1-eight-base-poses-v1.png`. Built-in image generation, original `public/warmups/hanon-soft-snapshots.png` used as sole style reference, no rejected iteration inputs. Prompt: four rows/two columns, ascending LH5/RH1 open then gathered; descending LH1/RH5 open then gathered; five digits per panel, fixed top-down scale, blue/orange cuffs and direction arrows. Inspection counts five digits in each panel and visible open/gather differences. Keyboard strips are orientation context only, not verified note maps. Owner visual acceptance pending; no app integration or animation claim.

Latest owner-approved production scope supersedes the large inventory below: Hanon No. 1 only, four base poses per hand (eight total). Ascending: LH little finger open/gathered; RH thumb open/gathered. Descending: LH thumb open/gathered; RH little finger open/gathered. These are reusable whole-hand shapes; finger presses/releases and keyboard translation remain future animation states, not hundreds of new base positions. Owner requested restarting from the original soft model and explicitly rejected all iterative contact drafts. New output is an eight-panel comparison concept, not an animation or accepted app asset. No note-map or pressed-key claim is made for this pose-only sheet. Original D-015 app art remains unchanged.

New left-hand contact study: `captures/warmups/2026-10-09-frame-pilot/hanon1-left-front-contact-v2.png`, generated with the built-in image tool using the owner's photo for anatomy/contact depth and contact-draft-v2 only for illustration style. Prompt constraints: five digits, front-edge C3 contact with little finger 5; remaining fingertips over E3/F3/G3/A3; skip D3; black-key groups 2+3; only C3 depressed. The initial attempt had an extra key/misplaced labels and was rejected; the targeted keyboard correction now has the intended relative contact map. White-key widths, convincing depression and residual little-finger spread still need refinement/owner feedback. This is not an accepted frame, implemented animation or native evidence.

Scope narrowed by owner: produce Hanon No. 1 only before considering Nos. 2–10. The supplied real left-hand photo is a pose/depth reference, not a score to copy. Owner rejected excessive little-finger extension in contact-draft-v2: finger 5 should contact near the player-facing front edge of the white key while longer fingers occupy deeper positions. New left-only starting-frame brief uses actual No. 1 C3–E3–F3–G3–A3 positions with fingers 5–4–3–2–1, skipping D3, and only C3 pressed. The ascending figure is C–E–F–G–A–G–F–E, fingers LH 5–4–3–2–1–2–3–4 and RH 1–2–3–4–5–4–3–2. Do not infer a universal hand posture from one photograph or present this generated draft as teacher-approved.

Owner reopened this work: generated static animation frames using the soft hand model, movement arrows, active fingers, physically depressed keys and plausible anatomy. Existing D-015 artwork and exercise data remain unchanged. This is planning and a visual pilot, not an accepted replacement or verified app feature.

Pilot rejection: the first generated contact frame showed six left-hand fingers, identified by the owner. It fails the basic anatomy gate and must not be integrated or used as a pose reference. Targeted correction is pending independent inspection. Count exactly five digits, check thumb attachment and fingertip/key correspondence before any animation sequence production.

Corrected built-in image-generation draft: `captures/warmups/2026-10-09-frame-pilot/contact-draft-v2.png`. Visual inspection now counts five digits on each hand. This repairs the count only: keyboard anchoring, contact/depression clarity and softer 2D treatment still require review. The frame is not production-ready or anatomically certified. Prompt: preserve the scene and right hand; remove the extra curled left digit between the little and ring fingers and reconstruct the natural palm/web space, retaining exactly thumb/index/middle/ring/little.

Inventory from `warmups.js`: Nos. 1–10 each have eight ascending/eight descending slots per hand, seven groups each way and a final tonic: 226 note events, or 113 paired instants, per cycle. Current notes are natural. Most figures span six white keys, not an octave; No. 7 and No. 5's descending figure span five. Supplied photographs inform hand depth/contact, not a mandatory octave stretch.

| No. | Relative press states, both hands/directions | Main inspection |
| --- | ---: | --- |
| 1 | 20 | Skipped second degree, reach and return |
| 2 | 22 | Outer jump and central alternation |
| 3 | 22 | Outer jump and inward run |
| 4 | 26 | Initial-note return and outer jump |
| 5 | 20 | Outer repeats; different descending shape |
| 6 | 20 | Repeated outer anchor without rigid holding |
| 7 | 22 | Alternating pairs, narrower span |
| 8 | 20 | Open and fold back |
| 9 | 20 | Local direction reversals |
| 10 | 20 | Outer jump and central turns |

There are 212 relative press states keyed by exercise/direction/hand/step/finger, before cross-exercise reuse. These are data counts, not certified anatomical poses. Key topology, hand depth/spread and travel direction may require additional variants. Left/right hands require independent checks; do not simply mirror labelled scenes.

Frame grammar: prepare/contact, press, release, gather/advance inward, lateral travel, reopen/settle. Inner fingers can enter the spaces between black keys without playing them. Thumb/little-finger contacts should look plausible, not enforce a fixed 90-degree angle. Include forearm alignment; avoid forced stretches or exaggerated lifts. Piano-teacher review is an acceptance gate. Reference: [Royal Conservatory guidance on smaller hands](https://teacherportal.rcmusic.com/Q-As/Ask-an-Examiner/Question-Regarding-Dealing-with-Students-with-Smal).

Proposed architecture: generated registered hand rasters, fixed camera/scale, assembled into static displayed frames against deterministic keyboard geometry. Arrows, active-finger numbers and depressed keys come from the exercise manifest, not invented image text. Translation may reuse an approved hand cutout; do not stretch or anatomically morph it. Different black-key topology requires separately checked contact. Depression needs a visible depth/front-edge cue, not just colour. No procedural finger rig.

Budget: 212 press + 212 release/preparation + approximately 160 transitions (four stages × two directions × two hands × ten exercises) + 20 rest/final assets = about 604 hand rasters before reuse. Allow 600–800 accepted assets for topology corrections, subject to pilot revision. Full paired scenes generated anew at every note would already require 1,130 press frames, before releases/transitions. Static compositing avoids regenerating repeated states.

Estimated production/review effort: specification 3–5 h; No. 1 pilot 5–8 h; remaining generation/corrections 20–40 h; player/synchronization/accessibility 6–10 h; anatomy/responsive checks 6–10 h. Total approximately 40–75 h, not a delivery guarantee or generation runtime; revise after the pilot. External teacher review and retries may extend elapsed time. Monetary cost is not estimated without confirmed billing.

First gate: one style/contact draft, then 24–36 displayed frames for a No. 1 excerpt covering both hands, releases, inward preparation, shift and reopening. Review slow playback and frame stepping before expanding descending figures and Nos. 2–10. Proposed player supports pause, frame stepping, slow speed, one/both hands and reduced-motion static steps. Synchronization follows actual note timing without artificial pauses after each figure. Synthetic four-layout browser checks and native acceptance remain separate. No APK/publication or manual feature claim at this stage.

The shared READER-05 Hanon child surface follows D-015. The owner rejected the procedural SVG/3D hand animation because its anatomy and motion were not convincing, and selected a four-snapshot explanation using the softer B hand model. The sequence shows relaxed placement, playing, gathering/advancing, and shifting/reopening. For wider spans, the hand moves toward the back of the keys before reopening so the thumb and little finger can meet the keys more perpendicularly without a wrist twist.

The session card now uses a single snapshot from the same artwork; **How to play** presents all four with short captions and fingering rows. The production build and seven focused unit checks pass. A live responsive-browser review confirmed the four cards form one 305 px column at 390 × 844. Product-owner acceptance, a preserved four-layout evidence run and native-device coverage remain open.

## Baseline evidence

[Open the four-layout gallery](captures/generated-practice/2026-10-04-baseline/index.html). The run contains **16 captures across 16 state/layout combinations**. [Metadata](captures/generated-practice/2026-10-04-baseline/capture.json) records exact synthetic notebooks, source hashes, viewport geometry, runtime state and the Chromium version.

| State | Representative purpose |
| --- | --- |
| Timed reading | Paused score, tempo controls, page navigation and on-screen keyboard. |
| Self-paced reading | One correct and one wrong answer; the expected note remains current. |
| Adapted range | A committed range change pauses with a new playable line and a prominent Continue action. |
| Self-paced technique | Active technique after one correct answer, using the same score/keyboard shell. |

Each state was entered through **Today → Resume session → Open exercise** with a fresh disposable notebook. Time, locale and random generation were fixed. The run used the production web build in Chromium at 390×844, 844×390, 768×1024 and 1024×768 CSS pixels. It did not write the installed notebook and is responsive-browser evidence, not native-device acceptance.

No horizontal or vertical page overflow and no runtime exceptions were recorded. The score, keyboard, Return, Finish and Pause/Continue controls remain visible in all 16 captures. Score height ranges from 112 px in timed phone landscape to 556 px in the tablet portrait self-paced states. The keyboard remains visible from 94 px high in phone landscape to 252 px in tablet portrait. Existing white/black key minimum checks pass in the responsive suite.

## Findings

Owner scope update, 2026-10-05: defer GEN-F07 timer visibility and its proposed correction until the PRACTICE-04 “With piano” review. It is not a blocker for PRACTICE-02 on-screen practice. Preserve the diagnostic finding and test for that later review; no timer fix is authorized by this deferral.

2026-10-05 owner feedback: the presented UI looks good; this accepts the reviewed visual direction, while the recorded overlaps and remaining coverage stay open. The owner reported missing practised time and requested testing. A real-time disposable-browser probe confirmed that timed and self-paced on-screen practice advance, pause, resume and retain the same elapsed time in the session/block clocks. With piano mode also records time correctly, but its clock has computed `visibility: hidden`: `app.css` hides the entire `.hud` for `data-context=piano`. GEN-F07 is therefore a confirmed timer presentation defect in PRACTICE-04/shared practice controls. The new `tests/practice-clock.browser.test.js` passes both on-screen modes and fails the piano visibility assertion, documenting the defect. No product fix was made in this diagnostic pass. Proposed correction: preserve the session-time statistic while hiding only answer-evaluation statistics in manual piano mode.

| ID | Observation | Scope and status |
| --- | --- | --- |
| GEN-F01 | The recovered-session toast is displayed over the centre of the keyboard in every fixture. It covers playable keys for several seconds and can remain while self-paced practice is already active, although it says the session was recovered paused. | PRACTICE-02, C-PRACTICE. Confirm on Android and decide whether recovery belongs above the input, disappears on resume, or becomes a non-obstructing status. Open. |
| GEN-F02 | Timed practice paused during the initial count-in retains **Cuenta atrás…** in the feedback row while the primary control has returned to Play. The score is paused, but the status describes a transition that is no longer occurring. | PRACTICE-02/04, C-PRACTICE. Reproduce from ordinary user timing before changing copy/state. Open. |
| GEN-F03 | The compact statistics row relies on symbols for correct, wrong, streak and response time. It is space-efficient and stable, but the distinction between the top session clock and the small response-time value is not self-explanatory in the captures. | PRACTICE-02–04, C-PRACTICE and accessibility review. Inspect accessible names and enlarged text before proposing labels. Open. |
| GEN-F04 | The range-change state is coherent: the score is replaced only after commit, **Continue** becomes dominant and the explicit status explains why practice paused. The gesture hint and reset control remain visible. | Positive baseline; behavior is functionally covered. Physical touch/pinch and native rotation remain open. |
| GEN-F05 | Phone landscape preserves the full workflow without page scroll, but the 94 px keyboard and 112–160 px score are the tightest presentation. The current notes remain legible in these fixtures; longer feedback, enlarged text, guides/fingering and multiple systems are not yet evidenced. | PRACTICE-02, C-SCORE, SYSTEM-03. Open coverage rather than a confirmed defect. |

## Unified-toolbar verification

[Open the D-010 follow-up gallery](captures/generated-practice/2026-10-04-unified-toolbar-03/index.html). It contains the same 16 state/layout views plus the Tools panel opened in all four layouts. Two earlier same-day implementation captures are retained as historical iterations; `unified-toolbar-03` is the final D-010-stage comparison. D-012 later changed that layout and D-013 now supersedes its menu hierarchy.

- The header has exactly two rows in every managed generated-practice view.
- For each device, Continue/Pause has identical x, y, width and 44 px height across timed reading, self-paced reading, range adaptation and technique.
- Phone portrait main action: x=181, y=58, width=105, height=44 CSS px.
- Phone landscape: x=424, y=54, width=316, height=44 CSS px.
- Tablet portrait: x=384, y=60, width=256, height=44 CSS px.
- Tablet landscape: x=524, y=60, width=376, height=44 CSS px.
- The keyboard bottom equals the viewport bottom in all 16 views. No lower button strip remains during managed practice.
- The anchored Tools panel fits the viewport and exposes range/recenter, guide and fingering without moving the primary controls.
- No horizontal/vertical page overflow or runtime exceptions were recorded.

The production build and **28 focused browser checks passed**, adding the score-guide/fingering regression to the original 27 checks. Responsive-browser evidence does not establish native safe-area or physical-touch acceptance.

## Directional-navigation verification

[Open the D-011 follow-up gallery](captures/generated-practice/2026-10-04-directional-navigation/index.html). It contains **20 state/layout views**: the prior four fixtures plus a two-block reading-to-technique session in all four standard layouts.

- Phone portrait uses only the outer left/right arrows; wider layouts show **Session** and **Next: Technique**.
- Final-block fixtures show **Feedback** instead of the misleading **Finish** label.
- Back returns to the session without completing the block; forward retains the existing next-block/feedback lifecycle.
- The fixed two-row toolbar and bottom-anchored keyboard from D-010 remain unchanged, with no page overflow or runtime exceptions.
- The production build and **32 focused browser checks passed**, including English/Spanish labels and the next-block path.

## Consolidated-menu verification

[Open the historical D-012 gallery](captures/generated-practice/2026-10-04-consolidated-tools-03/index.html). It contains the same **20 state/layout views** plus the consolidated menu opened in all four standard layouts.

- Practice settings, Sound, range/recenter, guide and fingering are all reachable from **…** and remain legible at phone portrait width.
- The fixed second row now has only timing, Continue/Pause and **…**.
- Elapsed practice time is grouped with correct, wrong, streak and average response time; the five metrics use a compact left-aligned gap.
- The keyboard remains bottom-anchored, with no page overflow or runtime exceptions.
- The production build and **32 focused browser checks passed**. A targeted regression also asserts the new menu ownership and clock placement.

This is retained as historical D-012 evidence only. The owner rejected the nested hierarchy after reviewing it, and D-013 supersedes the menu layout while retaining the compact metrics row.

## Direct-shortcut refinement

### 2026-10-05 responsive review

The owner parked Hanon work and resumed the general UI review. [Current gallery](captures/generated-practice/2026-10-05-flat-controls-settings/index.html) contains 20 practice views and four directly opened Practice settings views, using the five synthetic fixtures and the four standard phone/tablet layouts. [Metadata](captures/generated-practice/2026-10-05-flat-controls-settings/capture.json) records source hashes, production build version and control geometry. No horizontal overflow or runtime exceptions were recorded. This is responsive-browser evidence; no native acceptance is claimed.

GEN-F06: in phone landscape, Continue and recenter share x=640, y=54, width=44, height=44; Sound and Guide share x=688, y=54, width=44, height=44. The later controls cover the primary action and Sound. The standalone phone-landscape column rule has greater specificity than the generic managed-practice columns, leaving seven named control areas with only four declared columns. Proposed correction: explicitly define the seven columns for managed phone landscape and reserve sufficient width for the textual primary action. This proposal has not been implemented in this review pass.

The recovery toast still covers playable keys (GEN-F01), and the paused timed-reading portrait state still says **Cuenta atrás…** (GEN-F02). Proposed follow-ups remain a non-obstructing recovery status and feedback reflecting the paused state. Practice settings opens its Practice tab directly and its mobile content scrolls within the dialog; no intermediate menu is present.

Hanon D-015 is parked at the owner's request, with its visual acceptance and remaining evidence pending.

D-013 removes the **…** trigger and its anchored panel. Sound, guide, fingering and keyboard recenter are visible compact actions, while the gear opens the Practice settings tab directly. The detailed range slider is part of that tab. The rule carried to later screens is hierarchy-based: overflow is for terminal secondary actions, not for wrapping another settings destination.

The production build and syntax checks pass. A revised focused browser assertion covers direct ownership and the direct Practice-tab entry, and the capture script now records the opened settings tab rather than an overflow panel. In this run, disposable Chromium did not finish starting, so the test and capture attempts timed out before the app loaded. D-013 responsive visuals, target measurements and browser interaction remain explicitly unverified; the incomplete attempt is not evidence.

## Functional verification

The production web build passed. **27 focused browser checks passed**:

- 14 responsive sizes from 320×568 through 1180×820;
- timed and self-paced reading and technique range adaptation;
- correct/wrong answer behavior and fixed score geometry;
- idle self-paced behavior, pause/resume and full-line replacement;
- rotation without replacing partial progress;
- range slider, two-finger pan/pinch, wheel commit and automatic recentering;
- return/reload recovery of notes, range and accumulated answers.

These checks confirm behavior, not visual acceptance. The responsive legacy-reader layout suite also covers the key-size contract, but the managed-practice states captured here remain subject to native touch and accessibility checks.

## Remaining coverage

- [ ] Capture and review D-013 direct shortcuts in the four standard layouts; the consolidated D-012 menu is rejected and must not return.
- [ ] Reproduce GEN-F01/GEN-F02 on the installed Android build without modifying personal notebook data.
- [ ] Capture guides, fingering, multiple page/system boundaries and enlarged text.
- [ ] Verify keyboard-only navigation, focus visibility, accessible names and screen-reader announcements.
- [ ] Exercise physical touch range pan/pinch and in-place rotation on Android; keep iOS as a separate gate.
- [ ] Continue separately into PRACTICE-03 note names and PRACTICE-04 piano/MIDI after this surface's direction is decided.

## Manual status

No manual behavior was added in this baseline pass. The existing session chapter remains draft and already describes verified self-paced and keyboard-range behavior. A dedicated generated-practice chapter remains pending until the objective and visible presentation are accepted and the outstanding branches above are checked.
