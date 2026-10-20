# Hanon static-frame animation and repository cleanup plan

Proposed execution plan requested on 20 October 2026, refined by the owner's instruction to use static rendered frames in the app. The first scope is the ten Hanon exercises already available in SPino, using their existing notes and fingering. The approved complete Blender No. 1 is the visual and movement reference. Blender remains the offline authoring tool; the app receives images and timing metadata. The cinematic montage uses excerpts; app coverage requires complete tracks for every exercise.

## Production sequence

| Stage | Deliverable | Completion condition |
| --- | --- | --- |
| Preserve the reference | One canonical pair of hands, rig, materials, keyboard and teaching camera, with reproducible generators and license records. | Identity, dimensions, key construction and the approved appearance remain consistent. |
| Prove mobile delivery | Complete No. 1 as rendered frames, using the current atlas player in an isolated browser and Android WebView pilot. | Preserve the approved appearance and pulp contacts while measuring image quality, download size, startup, memory and sustained playback. Select frame rate, resolution, WebP quality and sheet dimensions from these results. |
| Produce complete motion | Twenty tracks: ten exercises times two independently authored hands, plus thirty starting posters for left, right and both hands. | Every track includes all seven ascending and seven descending groups, final tonic, preparation, gathering, reopening and release. |
| Integrate and verify | A shared app player with the current guide controls and synchronized notation. | Whole-hand validation, responsive browser review and separate native playback checks pass. |
| Release and archive | A reviewed beta, verified website downloads and a compact working repository. | Final artifacts and source manifests are retained; older experiments are recoverable outside the checkout before caches are pruned. |

The [canonical exercise data](../../src/companion/warmups.js) produces 113 notes per hand and exercise: 2,260 note events across the twenty complete tracks. Preserve edition choices, including No. 7's independent left-hand fingering. Generate each passage from its actual keyboard position; translating a short cinematic excerpt does not cover every white-key topology.

These are twenty logical motion tracks, sharing one pair of hand models and one keyboard. Export left, right and both-hand display views for each exercise. The No. 1 pilot must verify whether the current independently composited hand layers reproduce the Blender view accurately, including shadows and depressed keys. If they do not, pack thirty complete display sequences instead. Keep one continuous keyboard in every displayed frame. This image-packing choice does not reopen the accepted model or movement style.

## Motion and playback requirements

Retain the approved warm skin tone, soft hands, wrapping blue and orange sleeves and current absence of nails. Keep keyboard dimensions and scale invariant, including the full terminal white key, rear felt seam, deep black-key bodies, wood sides and hinged travel.

Validate all five fingers at played contacts, zero-pressure prepared supports, releases and travel. Check pulp support, compact shallow thumb movement, fixed bone lengths, actual key and skin clearance, and context-dependent fore/aft staggering around E–F and B–C. Free fingers may gather and travel independently. Numerical search bounds are authoring controls; review actual movement and images rather than presenting them as anatomical limits.

Use one note timeline for fingering, key travel, blue/orange highlights and audio. Solo modes must also disable the hidden hand's key actions. Retain Play/Pause, next-note stepping, slow/normal speed, seeking, retry, starting posters, guide event updates and lifecycle cleanup from the [current player](../../src/companion/hanon-animation.js) and [guide](../../src/companion/warmup-guide.js). Preserve the Android first-frame timing repair and pause when the page is hidden. Check contact and release timing after frame sampling and compression. The cinematic piano sound bank is a separate soundtrack resource; app audio packaging is a distinct size decision.

Start with one No. 1 mobile pilot before rendering every delivery sequence. Use the existing 24 fps playback as the first measured target, retain the original 48 fps authoring source, and keep decoding and memory bounded. Do not stretch or interpolate bitmap hands between unrelated poses. The current production fallback contains 203 tracked files totaling approximately 18.36 MiB; retain it until the replacement passes its integration checks.

## Verification and release

Keep and extend the meaningful regressions in `hand-positions.test.js`, `hanon-animation.test.js`, `warmups.test.js`, `warmup.browser.test.js` and `hanon-spacing.browser.test.js`. Consolidate prototype geometry, pulp, identity and scored-key checks into a reproducible authoring command. Run complete pose validation per source change; re-render only affected assets. Preserve representative evidence and the source/build manifest for each accepted result.

Review phone and tablet portrait/landscape with disposable synthetic notebooks. Check hand selection, guide fingering, seeking, final tonic, replay, background pause, reopen, offline assets and memory release. Label browser evidence separately from native evidence. For an Android review build, use replacement installation, preserve notebook data, launch the app and confirm foreground activity. Publish the beta and verify public artifact hashes after this production integration passes; update the manual with verified behavior.

## Repository cleanup

Consolidate maintained generators and geometry checks under `scripts/hanon/`, authoring manifests and license records under `assets/authoring/hanon/`, and runtime images and metadata under a versioned `public/warmups/hanon-frames-v2/`. Keep focused regressions in the existing `tests/` suite. Move the current one-off helpers only after recording their original paths and dependencies; do not maintain two competing generation pipelines.

Store large authoring binaries and movies in the indexed artifact archive; retain their manifests and reproducible commands in Git. Keep runtime assets with the application's existing versioned delivery workflow.

Before moving any prototype files, inventory active jobs, tracked files, uncommitted work and links from review records. Archive superseded Blender candidates, failed studies, one-off search helpers, intermediate renders and logs outside the working checkout, for example under `/Users/migue/Source/spino-artifacts/hanon/2026-10-20/`. Give the archive a path index, SHA-256 manifest and verified recovery check. Keep failed evidence immutable, and update review links to the archive index when files move.

After the archive is verified and dependent jobs have ended, prune only reproducible frame spools, redundant caches and temporary QA pages. Add narrow ignore rules and configure future generated output outside the checkout. Preserve personal photographs privately, all notebook records and stable IDs, PDFs, annotations, release handoffs and unrelated concurrent work. Avoid blanket cleanup of `output/review` or the repository: those locations contain other tasks' evidence.

The first concrete step after the cinematic handoff is the complete No. 1 mobile pilot, accompanied by the canonical source manifest. Production expansion and archival cleanup follow its verified result.
