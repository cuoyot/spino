"""Recover an editable complete Hanon take into a new, never-overwritten revision.

This creates a working copy, not a new approval or a change to published assets.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil

REPO = Path(__file__).resolve().parents[2]
INDEX = REPO / 'assets/authoring/hanon/archive.json'


def sha(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def prepare(number, destination, index_path=INDEX):
    index = json.loads(Path(index_path).read_text())
    archive = Path(os.environ.get('HANON_ARCHIVE_ROOT', index['archiveRoot']))
    if str(archive).startswith('/Volumes/'):
        volume = Path(*archive.parts[:3])
        if not os.path.ismount(volume):
            raise RuntimeError('Mount the archived external disk first')
    if sha(archive / 'inventory.json') != index['inventorySha256']:
        raise ValueError('Archive inventory does not match the preserved baseline')
    exercise = next(row for row in index['exercises'] if row['number'] == number)
    rows = [('hanon-%02d-editable.blend' % number, exercise['editableProject'])]
    rows += [('assets/' + Path(row['path']).name, row) for row in index['handAssets']]
    rows += [('baseline/' + name, row) for name, row in exercise['motionFiles'].items()]
    for name, row in rows:
        source = archive / 'original-paths' / row['path']
        if sha(source) != row['sha256']:
            raise ValueError('Archived revision source changed: ' + str(source))
    destination = Path(destination).resolve()
    destination.mkdir(parents=True, exist_ok=False)
    for name, row in rows:
        source = archive / 'original-paths' / row['path']
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        if sha(target) != row['sha256']:
            raise ValueError('Recovered copy verification failed: ' + str(target))
    record = {'number': number, 'baseline': exercise, 'inventorySha256': index['inventorySha256'],
              'editableProject': 'hanon-%02d-editable.blend' % number, 'productionReady': False,
              'rule': 'Edit this copy. Geometry, nails, cameras or motion changes require fresh review and a new version; never overwrite the accepted banks or manufacture approval hashes.'}
    (destination / 'REVISION.json').write_text(json.dumps(record, indent=2) + '\n')
    (destination / 'README.md').write_text('''# Editable Hanon revision

Open the .blend file in Blender. It contains the complete 48 fps take, rig, mesh,
materials, keyboard and teaching camera. The original source remains immutable.
The baseline folder retains the approved input, numerical pose cache and scans.
Original hand GLBs and their license are in assets/ for geometry/weight changes.

Create additional cameras on this copy for new views. For nails, consult the
archived add_attached_nails.py helper and adapt it to this copied rig; do not run
historical generators blindly because their output paths target old studies.
Keep existing bone names/weights when changing mesh design, or revalidate the
motion solver and every finger after changing the rig.

A changed look or viewpoint is a new source revision. Run whole-hand contact,
clearance, score and visual checks again, then export into a new asset bank.
The old productionReady records certify only the original immutable sources.
''')
    print(destination / record['editableProject'])
    return record


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--exercise', type=int, choices=range(1, 11), required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.exercise, args.output)
