# Generated practice with a physical piano

Review ID: **PRACTICE-04**. Status: **baseline reviewed; objective and corrections proposed**. Started: 2026-10-05.

The owner approved the presented on-screen practice controls and requested the next surface. Hanon remains parked. The previously deferred manual-piano timer visibility issue is now in scope. This initial pass covers manual piano practice; connected/disconnected MIDI is a separate state family within the same review.

## Proposed objective

Let a pianist follow the score at the chosen tempo, pause and resume comfortably, see practised time and move between pages or session blocks, with settings appropriate to the selected input.

## Baseline evidence

[Gallery](captures/generated-practice/2026-10-05-with-piano-baseline/index.html) contains twelve practice captures plus four Settings captures: paused two-hand reading, reading followed by a technique block, and paused two-hand technique across phone/tablet portrait/landscape. Disposable synthetic notebooks and production-browser source/build metadata are preserved in the capture directory. No installed notebook was changed. Responsive-browser evidence does not establish physical piano/MIDI or native acceptance.

The score fills the available input-free area and displays a grand staff. Toolbar and page navigation are visible, and the capture records no horizontal overflow or runtime exceptions. Existing real-time diagnostics confirmed elapsed time advances, pauses and survives return in manual piano mode, but its display is hidden.

## Findings and proposed corrections

- PIANO-F01 / GEN-F07: `.hud` is hidden in manual piano context, also hiding practised time. Proposed correction: keep the timer visible while hiding automatic answer-evaluation statistics.
- PIANO-F02: Settings shows **None (MIDI only)** for manual piano, plus keyboard-size instructions, reveal-after-two-misses and weakest-note statistics. These controls imply screen/MIDI evaluation that manual practice does not provide. Proposed correction: show a clear manual-piano input description and only relevant sound, fingering, score size and reading-light options; preserve MIDI-specific choices when MIDI is selected.
- PIANO-F03 / GEN-F02: the paused score retains **Cuenta atrás…** although the primary control shows a play triangle. Proposed correction: pause should clear the obsolete count-in message or replace it with an accurate paused status.

## Remaining coverage

2026-10-05 MIDI interruption verification: the expanded simulated-input browser regression passes. Disconnect pauses evaluation and returns to the session without changing note states. Reconnect keeps practice paused until explicit Open exercise; generated notes and correct count are retained on re-entry. A second disconnect followed by Use manual tracking switches to piano context and resumes without introducing missed-note errors. No product fix was needed. Physical USB/Bluetooth reconnect and native acceptance remain open. Next UI surface is PRACTICE-05 free/repertoire timer and score entry.

2026-10-05 page/focus verification: the fixed-page regression passes for both manual piano and simulated MIDI. Next/Previous pauses practice, retains original notes and answer counts, and returns to page zero without recording skipped notes as errors. A short touch on a paused note moves focus to its onset; phone portrait-to-landscape rotation preserves that selected onset and the generated notes. Play resumes the paused runtime. This covers responsive-browser page controls and tap-to-focus, not physical-touch/native acceptance or scroll-mode/autonomous page-turn boundaries. No product correction was needed. Next review point is MIDI interruption/reconnection and manual fallback.

2026-10-05 D-021 resolves PIANO-F03: pause during count-in displays **En pausa**, and immediate resume restores **Cuenta atrás…**. These transitions are asserted in each of twelve [new browser captures](captures/generated-practice/2026-10-05-with-piano-paused-status-02/index.html). Next coverage is score/page navigation and preservation of focus, followed by MIDI interruption/reconnection and native acceptance.

2026-10-05 D-020 implements the owner's accepted settings direction. [Manual-piano example](captures/generated-practice/2026-10-05-with-piano-context-settings/index.html) shows the concise input description, sound, score size and reading light; fingering remains in the header. MIDI retains reveal and weakest-note controls and its regression passes. PIANO-F02 is resolved in this scope. The next open correction is PIANO-F03, stale count-in feedback after pausing.

Owner accepted the integrated timer on 2026-10-05 (“perfecto, seguimos”). Next review focus is PIANO-F02. The settings source confirms on-screen input is disabled for piano/MIDI, but screen keyboard size and gesture instructions are still shown; manual piano also shows reveal-after-misses and weakest-note controls despite lacking automatic evaluation. Proposed layout: preserve Settings header sound/fingering shortcuts and score size/reading light; show a concise input-mode description; expose keyboard controls only for an on-screen keyboard and evaluation options only for measured screen/MIDI input. MIDI connection controls remain on General. This layout is proposed, not implemented.

2026-10-05 D-019: the owner requested elapsed practice time inside the play/pause button. Implemented across managed inputs; all three real-time tests pass, including the previously failing piano visibility assertion. [Updated gallery](captures/generated-practice/2026-10-05-with-piano-button-timer/index.html). PIANO-F01/GEN-F07 is resolved in the responsive-browser shell. PIANO-F02/F03 remain open.

- Review the proposed objective and corrections with the owner.
- One-hand/grand-staff, page/scroll modes, page focus and bar/system transitions.
- Pause/resume, return, block advance and background/relaunch recovery.
- MIDI availability, connect/disconnect/reconnect and manual fallback using disposable data.
- English/Spanish copy, enlarged text, keyboard/screen-reader access and native touch/rotation.

Manual source remains unchanged in this baseline pass; proposed corrections are not described as available.
