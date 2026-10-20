# Hanon Nos. 1–10 — integrated player browser evidence

This is responsive Chromium evidence of the real app guide/player, using a disposable profile and no personal notebook. It is separate from native-emulator and physical-device acceptance. The owner approved the No. 1 hands before the extension and authorized the beta and website publication.

`browser-validation.json` records all 14,400 composed display frames, a fixed keyboard pixel, both themes in four orientations plus 320 px, single-hand views, synchronized fingering rows and a complete 60-second No. 2 playback. No runtime exceptions were observed. Native/source measurements are recorded separately in `composed-pose-validation.json`: all 129,600 additional finger targets, 2,390 immutable source poses, active skin contact error under 0.198 mm, idle clearance over 1.51 mm, and no white/black-key intersections. No. 1 retains its accepted 154-pose source and earlier full-hand measurements.

Idle fingers are measured as lifted or traveling endpoints, not five simultaneously held keys. The same-finger changes in Nos. 2/3/4/7 are retained. The app's existing No. 7 LH ascending final 2/3 differs from Mutopia's 3/4; the app score was preserved. The No. 7 RH descending replacement is confirmed in the primary source.

The WebP sheets contain the same native-resolution source pixels and use at most eight decoded packs; each is under 6.4 MiB decoded. The player only composes static sprites and highlights over the single fixed keyboard. It starts paused and stops/cleans resources when the guide closes or the document hides.

The earlier `2026-10-20-hanon-1-10-app-01` captures are preserved. That first playback was interrupted by a development-server reload while source changed after frame 1261. This final run used a separate server with watching and HMR disabled; all 14,400 frames and the complete playback pass. No additional visual-generation iteration was used.

Build/source hashes and native/package/public results are recorded in the beta.2 release manifests. The separate Blender prototype does not replace these approved assets.

## Final native timestamp repair

The geometry/all-frame run predates a small player timing correction. Android's first requestAnimationFrame timestamp can be earlier than performance.now() at Play; the final player clamps this delta to zero and cannot address frame -1. A deterministic early-timestamp browser regression passes in `beta612-final-hanon-tests.log`. Play/Replay is also refreshed after seeking. No source drawing, key geometry or movement frame was changed. `final-source-hashes.json` identifies the packaged revision; `source-hashes.json` preserves the earlier all-frame run. `app-dialog-final/` repeats the actual modal evidence against this final production build. Native package and complete playback evidence are tracked separately in the release manifest.
