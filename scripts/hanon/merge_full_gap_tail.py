"""Assemble disjoint, same-base gap fields without changing the solver.

Every selected original failure window must appear exactly once. Source
metadata, wrist positions and prepared endpoints are invariant. This creates
only a numerical input; full CMC/fresh/native/visual gates remain mandatory.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import numpy as np
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, required=True)
parser.add_argument('--hand', required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--manifest', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
author = args.author_root.resolve()
sys.path.insert(0, str(author)); sys.path.insert(0, str(author.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from input_record_io import load, save
from excerpt_free_preparation import contact_distances

out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / f'input-{args.hand}.json').exists(), 'Preserve a previous merge'
manifest = json.loads(args.manifest.read_text())
assert manifest['number'] == args.number and manifest['hand'] == args.hand


def checked(entry):
    path = Path(entry['path']).resolve()
    assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], str(path)
    return path


original = checked(manifest['sourceInput'])
base = checked(manifest['calibratedInput'])
record = load(base, author, args.hand)
original_record = load(original, author, args.hand)
for key in ['metadata', 'notes', 'wrists', 'gathers', 'couplings', 'pairs', 'prepare']:
    assert original_record[key] == record[key], 'Calibrated input changed a non-goal source field'
assert len(record['wrists']) == 2880
distances = contact_distances(record)
expected = {tuple(window) for window in manifest['expectedWindows']}
seen = set(); deltas = np.zeros((2880, 4, 3)); sources = []
for entry in manifest['fieldReports']:
    path = checked(entry)
    report = json.loads(path.read_text())
    assert report['exercise'] == args.number and report['hand'] == args.hand and not report['failures']
    assert Path(report['source']).resolve() == original
    assert report['goal_equivalence'] == manifest['goalEquivalence']
    local = np.asarray(report['world_corrections_m'], dtype=float)
    assert local.shape == deltas.shape and np.isfinite(local).all()
    mask = np.zeros(2880, dtype=bool)
    for window in report['windows']:
        bounds = (window['first_frame'], window['last_frame'])
        assert bounds in expected and bounds not in seen, 'Missing or duplicated original failure window'
        seen.add(bounds); low, high = bounds[0] - 1, bounds[1] - 1
        mask[low:high + 1] = True
        if low: assert np.max(np.abs(local[low])) < 1e-12, 'Window start must retain the original zero correction'
        if high != 2879: assert np.max(np.abs(local[high])) < 1e-12, 'Window end must retain the original zero correction'
    assert not np.any(np.abs(local[~mask]) > 1e-12), 'A partial report changes another window'
    deltas += local
    sources.append(entry)
assert seen == expected, 'Every original failure window must be assembled before CMC/fresh scanning'
unchanged_held = 0
for i in range(2880):
    for finger in range(2, 6):
        if distances[finger][i] == 0:
            assert np.linalg.norm(deltas[i, finger - 2]) < 1e-9, 'A prepared support moved'
            unchanged_held += 1
        record['world'][finger][i] += Vector(deltas[i, finger - 2])
save(record, out / f'input-{args.hand}.json')
report = {'number': args.number, 'hand': args.hand, 'productionReady': False,
          'status': 'Exact disjoint gap fields assembled; full CMC/fresh/native/visual review pending',
          'sourceInput': manifest['sourceInput'], 'calibratedInput': manifest['calibratedInput'],
          'fieldReports': sources, 'originalWindowCount': len(expected), 'assembledWindowCount': len(seen),
          'preparedLongFingerStatesUnchanged': unchanged_held,
          'fixedNonGoalFieldsCompared': ['metadata', 'notes', 'wrists', 'gathers', 'couplings', 'pairs', 'prepare'],
          'inputSha256': hashlib.sha256((out / f'input-{args.hand}.json').read_bytes()).hexdigest(),
          'addition': 'Same float32 Vector addition as the original serial helper. Original padded windows are disjoint and keep their zero boundary corrections.'}
(out / f'{args.hand}-merge-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report), flush=True)
