"""Merge exact disjoint original CMC windows before a fresh full-hand scan."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, required=True)
parser.add_argument('--hand', choices=('left', 'right'), required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--manifest', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = args.author_root.resolve()
sys.path[:0] = [str(root), str(root.parent)]
from input_record_io import load, save
from piano_preparation import contact_neighbours

out = args.output_dir.resolve()
out.mkdir(parents=True, exist_ok=True)
assert not (out / f'input-{args.hand}.json').exists(), 'Preserve a prior merge'
manifest = json.loads(args.manifest.read_text())
assert manifest['number'] == args.number and manifest['hand'] == args.hand


def checked(entry):
    path = Path(entry['path']).resolve()
    assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], str(path)
    return path


source = checked(manifest['sourceInput'])
record = load(source, root, args.hand)
assert len(record['wrists']) == 2880 and not np.any(np.asarray(record['clearance_angles']))
expected = {tuple(window) for window in manifest['expectedWindows']}
seen = set()
angles = np.zeros((2880, 2))
summaries = []
for entry in manifest['fieldReports']:
    report_path = checked(entry)
    report = json.loads(report_path.read_text())
    assert report['exercise'] == args.number and report['hand'] == args.hand and not report['failures']
    assert Path(report['source_input']).resolve() == source
    assert report['source_input_sha256'] == manifest['sourceInput']['sha256']
    field = np.asarray(report['angles_radians'], dtype=float)
    assert field.shape == angles.shape and np.isfinite(field).all()
    mask = np.zeros(2880, dtype=bool)
    for window in report['windows']:
        bounds = (window['first_frame'], window['last_frame'])
        assert bounds in expected and bounds not in seen, 'Missing or duplicate original CMC window'
        seen.add(bounds)
        low, high = bounds[0] - 1, bounds[1] - 1
        mask[low:high + 1] = True
        if low:
            assert np.max(np.abs(field[low])) < 1e-12
        if high != 2879:
            assert np.max(np.abs(field[high])) < 1e-12
        summaries.append(window)
    assert not np.any(np.abs(field[~mask]) > 1e-12), 'Partial field changes another original window'
    angles += field
assert seen == expected, 'All original CMC windows are required before the fresh full scan'
metadata = record['metadata']
contacts = [int(metadata['active_finger'][i]) == 1 and metadata['pressure'][i] > .001 for i in range(2880)]
distance = contact_neighbours(contacts)[2]
for i in range(2880):
    if distance[i] <= 1:
        assert np.max(np.abs(angles[i])) < 1e-12, 'Prepared/playing thumb support moved'
record['clearance_angles'] = angles.tolist()
destination = out / f'input-{args.hand}.json'
save(record, destination)
report = {'number': args.number, 'hand': args.hand, 'productionReady': False,
          'status': 'Exact original CMC windows assembled; fresh all-five-finger/native/visual review pending',
          'sourceInput': manifest['sourceInput'], 'fieldReports': manifest['fieldReports'],
          'expectedWindows': manifest['expectedWindows'], 'assembledWindowCount': len(seen),
          'allSourceGoalsWristsMetadataUnchanged': True,
          'addition': 'Each original disjoint window appears exactly once; only its CMC angle field is copied.',
          'windows': sorted(summaries, key=lambda row: row['first_frame']),
          'input': {'path': str(destination), 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest()}}
(out / f'{args.hand}-cmc-merge-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report), flush=True)
