"""Prepare full actual-score targets using the frozen approved hand authoring basis.

Run in Blender. This stage is input preparation, never motion/placement clearance.
It creates no .blend copies and never edits the accepted No.1 assets or project.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import time
from array import array

from mathutils import Matrix

parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, choices=range(2, 11), required=True)
parser.add_argument('--hand', choices=('left', 'right'), required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--source-index', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
root = args.author_root.resolve()
sys.path.insert(0, str(root));sys.path.insert(0, str(root.parent))
import math
import excerpt_input_tracks as source
from excerpt_input_solver import calibrate_boundary_field
from excerpt_free_preparation import prepare_free_reach
from input_record_io import save

out = args.output_dir.resolve();out.mkdir(parents=True, exist_ok=True)
destination = out/f'input-{args.hand}.json'
assert not destination.exists(), ('Preserve existing prepared inputs', destination)
started = time.monotonic()
original = source.original_retarget_sample
memo = {}
counts = {'calls': 0, 'uniqueLegacyInputs': 0, 'memoHits': 0, 'duplicateResultsIndependentlyChecked': 0}


def copies(value):
    wrist, targets, metadata = value
    return wrist.copy(), {f:p.copy() for f,p in targets.items()}, metadata.copy()


def cached_original(index, side, geometry):
    # Capture every actual argument of the preserved deterministic preparation.
    # No pose rounding or octave translation is permitted for cache identity.
    j, half = divmod(index, 2)
    a, b = source.legacy.source_sample(j, side), source.legacy.source_sample(j+1, side)
    wrist = a['wrist'].lerp(b['wrist'], half/2)
    targets = {f:a['targets'][f].lerp(b['targets'][f], half/2) for f in range(1, 6)}
    digest = hashlib.sha256(array('f', list(wrist)+[v for f in range(1, 6) for v in targets[f]]).tobytes())
    digest.update(json.dumps([side, a['active'], a['note'], source.legacy.pressure_at(index)]).encode())
    key = digest.hexdigest();counts['calls'] += 1
    if key not in memo:
        memo[key] = copies(original(index, side, geometry));counts['uniqueLegacyInputs'] += 1
    else:
        counts['memoHits'] += 1
        if counts['duplicateResultsIndependentlyChecked'] < 8:
            check = original(index, side, geometry)
            saved = memo[key]
            assert check[0] == saved[0] and check[2] == saved[2]
            assert all(check[1][f] == saved[1][f] for f in range(1, 6))
            counts['duplicateResultsIndependentlyChecked'] += 1
    return copies(memo[key])


source.original_retarget_sample = cached_original
rotation = Matrix.Rotation(math.radians(16), 3, 'X')
def progress(frame, total):
    print(json.dumps({'stage':'full-source-inputs','exercise':args.number,'hand':args.hand,'frame':frame,'total':total,'elapsedSeconds':time.monotonic()-started,**counts}), flush=True)

record = source.read_excerpt(args.hand, root, rotation, args.source_index.resolve(), args.number, 0, 60,
                             padding_frames=0, progress=progress)
assert len(record['wrists']) == 2880
record['clearance_angles'] = [(0., 0.)]*2880
source_info = record['source']
source_info['purpose'] = 'Complete static app track input preparation, not film excerpt clearance'
source_info['status'] = 'Full canonical targets only; actual whole-hand/contact/motion validation pending'
print(json.dumps({'stage':'free-reach-before','exercise':args.number,'hand':args.hand,'elapsedSeconds':time.monotonic()-started}), flush=True)
before = prepare_free_reach(record, rotation)
boundary = calibrate_boundary_field(record, rotation)
after = prepare_free_reach(record, rotation)
generation = {str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.glob('*.py')}
source_info['generation_hashes'] = generation
save(record, destination)
report = {'status':'Complete canonical input targets prepared; no placement or native-motion clearance claimed',
          'exercise':args.number,'hand':args.hand,'nativeFrames':2880,'range':[1,2880],
          'sourceIndexSha256':hashlib.sha256(args.source_index.read_bytes()).hexdigest(),
          'inputSha256':hashlib.sha256(destination.read_bytes()).hexdigest(),
          'generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'exactMemoization':counts,'freeReachBefore':before,'boundaryCalibration':boundary,'freeReachAfter':after,
          'elapsedSeconds':time.monotonic()-started,'generationHashes':generation}
(out/f'{args.hand}-input-preparation.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ('generationHashes','freeReachBefore','freeReachAfter')}, indent=2), flush=True)
