## Current 720 × 400 video delivery (21 October 2026)

The owner selected 720 × 400 and an APK target below50 MB. Complete approved
No.1 v2 and Nos.2–10 v3 native frame timelines are transcoded without altering
motion or canonical note/fingering data. Thirty independent modes remain offline.

```sh
python3 scripts/hanon/export_video_bank.py \
  --destination public/warmups/hanon-video-v1 \
  --work output/hanon-size-2026-10-21/full-export-01
python3 scripts/hanon/audit_video_bank.py \
  --output output/hanon-size-2026-10-21/codec-audit-01
```

The destination must be new. The exporter records source image and timeline
SHA256, ffprobe verifies1440 frames/24fps/720×400, and the image audit compares
90 decoded frames with the approved source images. H.264 CRF30/yuv420p, one-second
keyframes and fast-start metadata support offline playback and bounded seeking.
Quality metrics are diagnostic; responsive visual and installed Android reviews
are separate required gates. The canonical frame table still controls note
stepping, guide fingers, release state and slow playback.

Vite excludes superseded `hanon-frames-v1/v2/v3` banks from dist only after the
complete new index exists; it never removes authoring baselines from public.
Editable full Blender sources, all original authoring evidence and recovery tools
are indexed at `assets/authoring/hanon/`. See that README for verified external
recovery and safe new revision creation. The sections below retain the original
static-bank authoring contracts and historical pilot details.

# Approved Hanon No. 1 static export

These scripts export the approved Blender No. 1 take as offline WebP frames. They do not modify the Blender project or provide a runtime 3D engine. The app selects this asset set only for No. 1; the existing v1 assets for all exercises remain available for rollback.

The input is the owner-approved `hanon-piano-candidate-08.blend`, SHA256 `e624a12b1f0da93b30f047d4e54b7746a4285d4d3d930a0dffa43d18c5d4fd4b`. The exporter rejects a different source. Keep the original project and evidence outside app assets.

## Reproduction

The recorded environment is `output/app-no1-2026-10-20/export-environment.json`. Export requires Blender at `/Applications/Blender.app/Contents/MacOS/Blender`, Python, Pillow and NumPy. The retained job files record the exact source, output and canonical-score paths.

First scan the complete native timeline with a JSON job for `render_native_no1.py`:

```json
{
  "sourceBlend": "/absolute/path/to/hanon-piano-candidate-08.blend",
  "outputDirectory": "/absolute/path/to/new-run/plan",
  "scanTimeline": true,
  "canonicalExercise": "/absolute/path/to/public/warmups/hanon-frames-v1/exercises/hanon-1.json"
}
```

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python scripts/hanon/render_native_no1.py -- --job /absolute/path/to/new-run/plan/job.json
```

Then export into a new empty destination:

```sh
python3 scripts/hanon/export_no1_frames.py \
  --source /absolute/path/to/hanon-piano-candidate-08.blend \
  --timeline /absolute/path/to/new-run/plan/native-export-report.json \
  --canonical public/warmups/hanon-frames-v1/exercises/hanon-1.json \
  --work /absolute/path/to/new-run/export \
  --destination /absolute/path/to/new-assets \
  --workers 2 --chunk-size 32 \
  --license /absolute/path/to/hand-source/LICENSE.md
```

An existing completed chunk is reused only if its configuration and every atlas hash match. Preserve failed attempts and use a new work directory after changing code or settings. Two render workers use two Blender threads each. Native PNG spools are bounded to one chunk per worker and removed after durable atlas/alpha verification. Logs, native-key checks and chunk manifests remain.

## Asset contract

- 1,440 frames at 24 fps; 113 canonical events. Samples use native `1 + 2*i` for indices 0–1438, then native frame 2880 for the fully released terminal sample. Notes and fingering are checked against v1, while pressure comes from the native take.
- `index.json` declares `bakedKeys: true` and `composition: "single-mode-sprite"`. A frame displays one independently rendered left, right or both mode, including its actual depressed/highlighted key and shadows.
- Nine-value sprite tuples are `[pack, sx, sy, sw, sh, x, y, width, height]`; source and destination dimensions match at 1:1. The exercise retains the v1 eight-value frame tuple, with zero offsets, and adds a `both` sprite-ID track and `nativeFrames` provenance.
- `keyboard.webp` is a lossless neutral native render. Exact changed pixels form each mode's binary alpha mask. Before encoding, the neutral image plus one mode sprite must reproduce every full native RGB pixel. Independently compositing left and right sprites failed because native shadows overlapped the other hand, so it is not used.
- WebP quality 90 is fixed. Every atlas preserves alpha exactly, is at most 2048 pixels per dimension and uses less than 5 MiB decoded RGBA. The player cache limit is eight atlases. GPU/browser overhead and transient decoding need separate runtime measurement.
- The package includes three posters and the hand asset's MIT license. It ships no `.blend`, GLB, render engine, sampled-piano bank or private reference photos.

## Verification

`validate_no1_frames.py` reconstructs the full image from the lossless keyboard and **decoded** atlas sprite, then compares it with genuine native reference renders. The recorded six native states cover playing, gathering, ascent/descent and release in all three modes. It reports full-image, alpha-edge, black-key and red-felt errors. The fixed quality checks are MAE ≤ 2.5/255 and PSNR ≥ 35 dB; representative reconstructions also require visual inspection.

`audit_no1_export.py` verifies all native white-key states, hidden-key neutrality, final sprite/pack mappings, source/camera/geometry evidence, complete event sampling, staging/public hashes and all preserved v1 files. Its `--preserved-v1` input is the recorded read-only manifest, not a newly generated baseline after export.

```sh
python3 scripts/hanon/validate_no1_frames.py \
  --assets public/warmups/hanon-frames-v2 \
  --reference output/app-no1-2026-10-20/probe-01 \
  --timeline output/app-no1-2026-10-20/plan-01/native-export-report.json \
  --output output/app-no1-2026-10-20/final-validation-01

python3 scripts/hanon/audit_no1_export.py \
  --work output/app-no1-2026-10-20/export-01 \
  --assets public/warmups/hanon-frames-v2 \
  --timeline output/app-no1-2026-10-20/plan-01/native-export-report.json \
  --preserved-v1 output/app-no1-2026-10-20/preserved-v1-inputs.json \
  --reference output/app-no1-2026-10-20/probe-01 \
  --output output/app-no1-2026-10-20/final-validation-01/native-export-audit.json
```

App/browser/native playback, release signing and publication are separate checks. The numerical exporter checks do not independently establish anatomical approval; the source take retains its approved visual review.

## Complete Nos. 2–10 bank

The approved No. 1 v2 assets remain immutable. `render_native_bank.py` applies the full numerical motion cache to that same rig, checks all five native endpoints and actual deformed skin, resets hidden-hand keys, and renders independent left/right/both views at720×400. An accepted No. 1 technical probe reproduced the original native pixels exactly, retained all1,440sampledframes, and recovered the same797/805/818unique mode counts. This proves the cache-to-rig exporter; it does not clear any remaining exercise.

`bank_contract.py` requires a hash-bound per-exercise handoff: `number`, `productionReady:true`, `authorRoot`, `sourceBlend`, `canonical`, `hands.left/right.input/solutions/scan`, and `nativeAudit`. Every file entry is `{path,sha256}`. Both fresh full scans must contain14,400finger checks, no physics/support/self-crossing errors, correct canonical data, matching input/NPZ hashes and a released terminal sample. The native audit must independently record `passed:true`, `nativeFrames:2880`, `motionContinuityPassed:true`, `visualReviewPassed:true`, and the exact per-hand `inputSha256`/`solutionsSha256`. These are measured completion flags, never bypasses for partial sources.

After one complete exercise passes, add it incrementally:

```sh
python3 scripts/hanon/export_frame_bank.py add \
  --track /absolute/path/to/passed-hanon-02.json \
  --work output/app-hanon-2-10-2026-10-20/export-bank-01 \
  --destination public/warmups/hanon-frames-v3 --workers 2
```

Use the same work/destination for each passed exercise. Only exact evaluated final pose/key fingerprints share images. Chunks have durable hashes, bounded disposable PNG spools and individual attempt logs/PIDs. Completed chunks are verified and reused after interruption; a file lock prevents competing controllers. Code, codec or source changes require a new preserved run. AVIF uses quality70, lossless alpha,4:4:4,8bit/full range,CICP1/13/6. Every reconstructed frame must retain lossless alpha and meet native-pixel fidelity bounds. Atlases remain below2048px and5MiBdecoded; the runtime retains at most eight.

The public runtime index is intentionally absent until every complete exercise2–10 is present:

```sh
python3 scripts/hanon/export_frame_bank.py finalize \
  --work output/app-hanon-2-10-2026-10-20/export-bank-01 \
  --destination public/warmups/hanon-frames-v3 \
  --license /absolute/path/to/retained-hand-license.txt
```

Run `python3 -m unittest discover -s scripts/hanon -p 'test_bank_*.py' -v` for seven contract/controller checks. Controller tests use synthetic pictures and mocked native audits in disposable temporary directories; they verify interruption recovery, exact identity indexing, AVIF packing, completion gating and corruption detection, and are not whole-hand validation evidence. Real authoring/native/pad/motion and app/browser/native-release checks remain mandatory.

For human interpretation, `summarize_native_diagnostics.py --motion motion.json --pad pad.json --output NEW_SUMMARY.json` checks the native source identity and groups contact outliers by hand, finger and role. It retains exact report hashes, per-bone/thumb/travel maxima and candidate inspection frames. It never sets production approval. The accepted No. 1 diagnostic reference is retained separately; its numerical ranges are review context, not anatomical limits or automatic acceptance thresholds.

For serial overnight work, `queue_approved_exports.py --root EVIDENCE_ROOT --work BANK_WORK --destination BANK_ASSETS` waits only for root-created `passed-hanon-NN.json` records that pass the real contract. It takes its own coordinator lock, respects an existing bank controller, records child PIDs/logs, and stops on an export failure without retrying or publishing. Pass `--external-running 2` when attaching to an already running No.2 export; its failure requires human inspection rather than a blind restart. While the queue is active, do not launch competing manual `add` commands. Source approval, finalization, app/native review and release remain explicit separate steps.
