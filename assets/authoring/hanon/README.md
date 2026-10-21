# Editable Hanon production sources

The accepted beta4 baseline uses No. 1 in `public/warmups/hanon-frames-v2/` and Nos. 2–10
in `public/warmups/hanon-frames-v3/`. Those original image banks remain as authoring/test baselines. The owner-selected
720 × 400 delivery uses `public/warmups/hanon-video-v1/`; the build excludes
superseded image banks from the APK. Canonical scores and licenses are retained.
`720-delivery.json` indexes a separately verified reusable copy of all30 complete
new videos, the exporter, player, source hash report and smaller APK on the disk.

The reusable authoring archive is on the owner's external disk:

`/Volumes/2TB-MIGUE/SPino/hanon-2026-10-20/archive-2026-10-21/`

`archive.json` indexes all ten complete editable Blender projects and the original
hand assets. The external `inventory.json` records every archived byte and original
path with SHA-256. It also contains the frozen generators, full input/pose caches,
source/native audits, failed studies, material/nail variants, camera studies,
film, MIDI, sampled piano and licenses. Private reference photos, personal
notebooks and native notebook backups are excluded.

## Start a new version

Mount the disk, then create a new working copy (the output must not exist):

```sh
python3 scripts/hanon/prepare_revision.py \
  --exercise 4 --output output/hanon-revisions/no4-look-01
```

Open the resulting `hanon-04-editable.blend` in Blender. It retains the complete
48 fps take (frames 1–2880), both editable hand meshes and rigs, skin weights,
materials, keyboard, lighting and teaching camera. The baseline folder preserves
that exercise's inputs, numerical solutions and scans. Original GLBs and license
records are copied to the working folder for mesh or rig redesign.

- **Nails:** the archive retains `add_attached_nails.py`, including surface binding
  and skin conformance, and all earlier appearance studies. Adapt it to the new
  copied project; do not run historical generators blindly against their old
  output paths. Check nails on every finger throughout the motion before approval.
- **Other views:** add or adjust cameras on the copy. The cinematic camera studies
  remain under `original-paths/output/video/hanon-cinematic-2026-10-20/`.
- **Hand design:** edit the copied meshes/materials or import new geometry. Preserve
  bone names and weights where appropriate; a changed rig requires renewed solver,
  all-finger contact, key/skin clearance and motion validation.

Keep published banks and archived sources immutable. A changed source needs new
identity, score, contact and visual audits and a new versioned export; old
`productionReady` records certify only their original exact source hashes. The
revision helper deliberately creates an **unapproved** copy. It does not add nails,
change cameras, redesign hands or grant production approval automatically.

Set `HANON_ARCHIVE_ROOT` if the complete archive is moved to another mounted disk.
Do not substitute a new folder beneath `/Volumes` when the actual disk is absent.

## Verify or recover the archive

```sh
python3 scripts/hanon/archive_authoring.py verify \
  --plan /Volumes/2TB-MIGUE/SPino/hanon-2026-10-20/archive-2026-10-21/inventory.json

python3 scripts/hanon/archive_authoring.py restore \
  --plan /Volumes/2TB-MIGUE/SPino/hanon-2026-10-20/archive-2026-10-21/inventory.json \
  --destination output/hanon-recovered-workspace
```

Recovery uses a fresh destination and checks every restored file. ExFAT cannot
store symbolic links: the archive keeps portable descriptors for the 118 original
links, and the restore command recreates them on the local filesystem. Original
Hanon output roots retain ignored compatibility aliases to the external archive,
so old source paths and evidence references remain locatable while it is mounted.
Historical browser overlays containing link descriptors need restoration before
being executed. The current complete-exercise viewer remains local and usable.

The cleanup acceptance record in `cleanup.json` binds the actual reproduction,
editable-project inspection, verified archive and local retirement. Archived
sources regenerated the complete No. 2 timeline with all 1,440 exact pose
fingerprints and note states unchanged; the neutral keyboard matched pixel for
pixel, and left/right/both native renders were produced and inspected. All ten
complete editable projects were separately inspected. Disposable filesystem tests
check corruption, new-work detection, hash-bound retirement and symlink recovery;
these tests are not a substitute for the real Blender reproduction evidence.
