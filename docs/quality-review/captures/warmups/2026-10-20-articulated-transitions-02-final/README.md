# Hanon No. 1 — approved movement reference, 2026-10-20

The owner reviewed the separate browser preview and approved its direction: “wow, el resultado es mucho mejor ahora! Esto es lo que buscamos!!”. That approval covers the soft hand identities and articulated close/reopen movement. App integration remains outside the authorized scope.

The complete preview has 1,440 static composition frames at 24 fps, 113 paired note events and a 60-second ascending/descending cycle with the final tonic. It uses the existing No. 1 score and fingering. The keyboard is one immutable 1080 × 600 raster with 23 white keys and 44 px key spacing. Only the currently pressed key in each hand is colored, blue for left and orange for right.

The final source has 154 independently posed bitmap states. Finger lengths, hand geometry, materials, camera and cuff dimensions remain constant. Closing begins during the return through each figure; the next figure reopens around the stationary playing fingertip. Both 1–2 and 5–4 spacing vary: measured ranges are 20.4–45.1 px across the four hand/direction cases. Idle fingers can hover between keys while traveling. They are not modeled as five simultaneous held notes.

The owner requested removing the nail dots and making the sleeves wrap the wrists. The final source contains zero nail meshes and raised, longer cuffs whose upper edge covers the wrist base. The normal player has no fingertip markers; the optional all-ten-finger inspection adds colored measurement markers.

## Verification

- [Browser playback and 36 responsive captures](browser-validation.json): all 1,440 frames render, note/finger registration passes, one keyboard canvas, controls, pause, slow playback, state-echo handling, 320 px layout and a full real-time cycle reaching frame 1,439.
- [Both-theme label/control bounds](layout-bounds.json): phone/tablet portrait/landscape and 320 px; all-ten-finger inspection remains accessible.
- [Image packing fidelity](image-fidelity.json): decoded atlas compared with the original RGBA source, RGB RMSE 1.65/255 and mean alpha error 0.28/255. This final run preserves the smooth source contours; earlier packing captures remain in the `01` run.
- 770 source finger/skin patches and 14,400 composed finger positions are checked. There are 2,202 active skin contacts; maximum surface error is 0.190 mm and minimum settled idle clearance is 1.575 mm. All source poses have zero white/black key intersections. Every skin vertex below the black-key height is at least 228.47 px deep; black keys end at 211 px, preserving clearance under all group translations.
- [Ascending inspection sheet](motion-sheet-ascending.jpg), [descending sheet](motion-sheet-descending.jpg), [turnaround](motion-sheet-turnaround.jpg), [release and final tonic](motion-sheet-release-and-final.jpg).

This is responsive-browser evidence from disposable Chrome profiles. No notebook is loaded. No application source, native package, personal notebook, PDF, annotation or published site was changed. The source build is `6c91f4af02473f81451be04631a4f9fba081fcf7` plus the existing working tree.

## Reproduction and sources

The conversation fragment is [hanon-articulated-preview.html](../../../../../output/previews/hanon-articulated-transitions-2026-10-20/hanon-articulated-preview.html); the [browser wrapper](../../../../../output/previews/hanon-articulated-transitions-2026-10-20/browser-review.html) is served at http://127.0.0.1:5476/browser-review.html. The [manifest](../../../../../output/previews/hanon-articulated-transitions-2026-10-20/manifest.json) retains events, frame composition, per-source hashes and all-finger measurements. Authoring and bake scripts are retained beside it; the player renders static images only.

The same continuous generic-hand meshes are posed offline from the [WebXR input profiles assets](https://github.com/immersive-web/webxr-input-profiles/tree/main/packages/assets), with the retained MIT license and original left/right GLB files. The soft peach skin and blue/orange cuffs follow the existing visual direction. No new AI artwork was generated for this articulated refinement. One earlier guided AI attempt is retained unused in the prior repair folder; the original failed atlas and whole-hand audit remain intact.

Next: extend these approved identities to Nos. 2–10 with exercise-specific whole-hand movement. Each requires its own score/fingering and skin/contact checks. The completion heartbeat continues that newly authorized scope; app integration still awaits a later owner instruction.
