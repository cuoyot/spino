# Practice blocks, calendar position and precise timing — 9 November 2026

This is **responsive Chromium evidence**, using disposable synthetic notebooks. The accepted owner objectives are implemented; exact layout and native/physical-device acceptance remain open. No APK or publication. Existing uncommitted work, stable block/session IDs, notebook progress, score bytes and annotations are retained.

- `block-header-*`: activity/duration at the top of the practice block, before its dependent controls; repertoire has no tempo.
- `scale-warmup-*`: enabled optional scale warm-up, duration and static notes in phone/tablet portrait/landscape. New preparation shows the same block disabled until selected. Free, Hanon and Reading are covered by the configured-block and backup tests.
- `calendar-*` and `calendar-sync.json`: the visible date, its offset and loaded weeks survive incoming cards above the viewport in all four layouts. The selected-day sliver threshold ignores subpixel rounding. Explicit range/mode navigation is retained.
- `dial-*`, `dial-geometry.json`, `dial-pixel-centers.json`: centered cardinal markers; the half-width of the 12° segment is subtracted from its start angle. The pseudo-element follows the real responsive border width. The largest measured lateral-axis error is 0.1 px.
- `running-clock.png`: compositor-driven digits with unchanged accessible time text. Existing PDF/MusicXML clock tests cover running, pause, resume and checkpoints in four layouts.

57 focused unit checks and 14 distinct browser checks pass; the final four-check focused rerun also passes. Logs are alongside this file. Source/build hashes and fixture references are in `verification.json`. The shared saved-session renderer and design are unchanged.

Audio generation runs on the [Web Audio rendering thread](https://www.w3.org/TR/webaudio/), independently of UI timers. The real processor renders 60 seconds at 44.1 and 48 kHz on the ideal 137 BPM/subdivision grid, without accumulated drift and within half a sample. The real-browser stress test blocks the interface for 1.8 seconds: message delivery stalls, while the audio-generated beat timestamps stay regular. Silence, accents, count-in and stop are covered. This does **not** measure physical speaker/Bluetooth latency or certify Android hardware audio output; those remain device acceptance work.

The in-app browser review uses `http://127.0.0.1:5196/`, served by `scripts/review/preview-preparation.mjs`, with its own synthetic notebook. Automated browser tests use separate temporary profiles and origins. No installed personal notebook is used.
