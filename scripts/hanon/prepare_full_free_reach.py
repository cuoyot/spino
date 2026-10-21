"""Reserve geometric reach for a free finger's actual-skin clearance lift.

Only previously unreachable free goals are shortened along their reach radius.
Bones and real supports are never scaled or moved. Fresh support/key/self/native
validation is required after this small preparation correction.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import sys
import time

from mathutils import Matrix

parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, required=True)
parser.add_argument('--hand', choices=('left', 'right'), required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--input-path', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = args.author_root.resolve()
sys.path.insert(0, str(root)); sys.path.insert(0, str(root.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from input_record_io import load, save
from exact_solver_cache import install
from excerpt_free_preparation import contact_distances
from keyboard_math import smooth
from rig_math import chain_names

out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / f'{args.hand}-free-reach.json').exists(), 'Preserve previous reach evidence'
record = load(args.input_path.resolve(), root, args.hand)
cache = install(record)
rotation = Matrix.Rotation(math.radians(16), 3, 'X'); inverse = rotation.transposed()
distances = contact_distances(record)
report = {'exercise': args.number, 'hand': args.hand,
          'source_input_sha256': hashlib.sha256(args.input_path.read_bytes()).hexdigest(),
          'generator_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'method': 'Small measured radial reservation for a free endpoint that otherwise becomes unreachable during its owned-skin key-clearance lift. Six-frame temporal envelope pins prepared supports. Real bone lengths, hand identity, score and joint distribution stay unchanged.',
          'changes': [], 'failures': [], 'fresh_full_five_finger_native_scan_required': True}
start = time.monotonic(); count = len(record['wrists'])
for i in range(count):
    try:
        cache.solve(record, i, rotation, thumb_clearance=(0, 0))
    except Exception as error:
        match = re.search(r'Finger ([1-5]): Unreachable support endpoint', str(error))
        finger = int(match.group(1)) if match else None
        if finger is None or (finger == int(record['metadata']['active_finger'][i]) and record['prepare'][i]):
            report['failures'].append({'frame': i + 1, 'error': str(error), 'reason': 'Not a free reach reservation case'})
            continue
        original = record['world'][finger][i].copy()
        root_point = record['geometry']['rest'][chain_names(finger)[0]]
        local = inverse @ (original - record['wrists'][i]); radial = local - root_point
        attempts = []; selected = None
        for shortening in (.0005, .00075, .001, .0015, .002, .003):
            delta = rotation @ (-radial.normalized() * shortening)
            record['world'][finger][i] = original + delta
            try:
                result = cache.solve(record, i, rotation, thumb_clearance=(0, 0))
                check = result[3]
                passed = not check['white_collisions'] and not check['black_collisions'] and all(
                    row['finger'] == int(record['metadata']['active_finger'][i])
                    or row['minimum_actual_key_clearance_m'] is None
                    or row['minimum_actual_key_clearance_m'] > .00045 for row in check['fingers'])
                attempts.append({'shortening_m': shortening, 'passed': passed})
                if passed: selected = delta; break
            except Exception as trial_error:
                attempts.append({'shortening_m': shortening, 'passed': False, 'error': str(trial_error)})
        record['world'][finger][i] = original
        if selected is None:
            report['failures'].append({'frame': i + 1, 'finger': finger, 'error': str(error), 'attempts': attempts})
            continue
        changed = []
        center_gate = smooth(min(6, float(distances[finger][i])) / 6)
        assert center_gate > 0
        for j in range(max(0, i - 6), min(count, i + 7)):
            if int(record['metadata']['active_finger'][j]) == finger and record['prepare'][j]: continue
            envelope = smooth(1 - abs(j - i) / 7)
            gate = min(1, smooth(min(6, float(distances[finger][j])) / 6) / center_gate)
            delta = selected * (envelope * gate)
            record['world'][finger][j] += delta
            changed.append({'frame': j + 1, 'world_delta_m': list(delta)})
        report['changes'].append({'frame': i + 1, 'finger': finger, 'source_error': str(error),
                                  'attempts': attempts, 'authored_free_goals': changed})
    if (i + 1) % 240 == 0:
        print(json.dumps({'stage': 'free-reach-preflight', 'exercise': args.number, 'hand': args.hand,
                          'frame': i + 1, 'changed_contexts': len(report['changes']),
                          'failures': len(report['failures']), 'seconds': time.monotonic() - start}), flush=True)
report['seconds'] = time.monotonic() - start; report['exact_search_cache'] = cache.stats
report['status'] = 'Free reach prepared; support and complete clearance review pending' if not report['failures'] else 'Unresolved physical frame; do not export'
(out / f'{args.hand}-free-reach.json').write_text(json.dumps(report, indent=2) + '\n')
save(record, out / f'input-{args.hand}-checkpoint.json')
if report['failures']: raise ValueError(report['failures'][:4])
save(record, out / f'input-{args.hand}.json')
