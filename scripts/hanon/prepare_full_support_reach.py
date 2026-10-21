"""Repair a measured prepared-support reach exception with a small key/palm context.

Only the scored key's depth and a downward wrist preparation are candidates.
The complete event and its temporal neighbours are checked before selection;
free-neighbour routes, fresh full scans and native review remain mandatory.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import time

from mathutils import Matrix, Vector

parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, required=True)
parser.add_argument('--hand', choices=('left', 'right'), required=True)
parser.add_argument('--frame', type=int, required=True)
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
from piano_preparation import retreat_on_key
from self_clearance import prepare_partitions
from support_depth08 import intervals
import pad_metrics

out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / f'{args.hand}-support-reach.json').exists(), 'Preserve previous reach probes'
record = load(args.input_path.resolve(), root, args.hand)
cache = install(record)
rotation = Matrix.Rotation(math.radians(16), 3, 'X')
prepared = pad_metrics.prepare(record['geometry'], root.parent / 'assets' / (args.hand + '.glb'), args.hand)
partitions = prepare_partitions(record['geometry'])
distances = contact_distances(record)
event = next(row for row in intervals(record) if row['first'] <= args.frame - 1 <= row['last'])
first, last, finger, note = (int(event[key]) for key in ('first', 'last', 'finger', 'note'))
assert finger in (2, 3, 4, 5) and record['prepare'][args.frame - 1], 'This helper is for prepared long-finger support'
count = len(record['wrists'])
indices = list(range(max(0, first - 7), min(count, last + 8)))
wrists = [point.copy() for point in record['wrists']]
world = {f: [point.copy() for point in points] for f, points in record['world'].items()}
start = time.monotonic()
report = {
    'exercise': args.number, 'hand': args.hand, 'exception_frame': args.frame,
    'source_input_sha256': hashlib.sha256(args.input_path.read_bytes()).hexdigest(),
    'generator_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'event': event,
    'method': 'Minimum measured in-key retreat or downward palm preparation for an unreachable prepared long finger. Each candidate retains actual note/fingering, fixed bone lengths and all other real supports, and is checked on the entire scored event plus seven frames on either side. Self intersections are reported for the following free-neighbour routing stage.',
    'attempts': [], 'selected': None, 'fresh_full_five_finger_native_review_required': True,
}


def apply(retreat, down):
    for i in indices:
        envelope = smooth(max(0, 1 - max(first - i, i - last, 0) / 8))
        delta = Vector((0, 0, -down * envelope))
        record['wrists'][i] = wrists[i] + delta
        for f in world:
            follow = smooth(min(6, float(distances[f][i])) / 6)
            record['world'][f][i] = world[f][i] + delta * follow
        # Adjacent independent contacts stay at their own scored support.
        other_support = record['prepare'][i] and int(record['metadata']['active_finger'][i]) == finger and not first <= i <= last
        if not other_support:
            retreat_on_key(record['world'][finger][i], retreat * envelope, record['notes'][i][finger - 1])


def measure(sample_indices):
    rows = []
    for i in sample_indices:
        active = int(record['metadata']['active_finger'][i])
        current_note = int(record['metadata']['note_d'][i])
        try:
            solution, vertices, targets, check = cache.solve(record, i, rotation, thumb_clearance=(0, 0))
            metric = pad_metrics.support(record['geometry'], solution, vertices, rotation, active, current_note,
                                         float(record['metadata']['pressure'][i]), prepared) if record['prepare'][i] else {}
            collisions = check['white_collisions'] + check['black_collisions']
            passed = not collisions and all(row['finger'] == active or row['minimum_actual_key_clearance_m'] is None
                                             or row['minimum_actual_key_clearance_m'] > .00045 for row in check['fingers'])
            if record['prepare'][i]:
                passed = passed and metric['key_skin_error_m'] < .0003
                if first <= i <= last: passed = passed and metric['intrinsic_support_radial_dot_dorsal_mean'] < 0
            metric.update({'frame': i + 1, 'active_finger': active, 'note': current_note,
                           'inside_target_event': first <= i <= last, 'key_collisions': collisions,
                           'target_m': list(targets[active]), 'passed': passed})
            if passed: metric['self_crossings_deferred'] = cache.cross(vertices, partitions)
            rows.append(metric)
        except Exception as error:
            rows.append({'frame': i + 1, 'error': str(error), 'passed': False}); passed = False
        if not passed: return False, rows
    return True, rows


states = sorted([(retreat * .00025, down * .00025) for retreat in range(9) for down in range(5) if retreat or down],
                key=lambda row: (row[0] ** 2 + 2 * row[1] ** 2, row))
for retreat, down in states:
    apply(retreat, down)
    passed, measured = measure(list(dict.fromkeys([args.frame - 1, first, min(last, first + 4), last])))
    if passed: passed, measured = measure(indices)
    row = {'support_retreat_m': retreat, 'wrist_world_delta_m': [0, 0, -down], 'passed': passed, 'samples': measured}
    report['attempts'].append(row)
    if passed:
        report['selected'] = row
        break

report['seconds'] = time.monotonic() - start; report['exact_search_cache'] = cache.stats
report['status'] = 'Measured support reach context selected; support replan and complete clearance/native review pending' if report['selected'] else 'Unresolved support reach; do not export'
(out / f'{args.hand}-support-reach.json').write_text(json.dumps(report, indent=2) + '\n')
if report['selected'] is None:
    raise ValueError('No measured small support context passed')
save(record, out / f'input-{args.hand}.json')
print(json.dumps({'stage': 'prepared-support-reach-selected', 'exercise': args.number, 'hand': args.hand,
                  'event_native': [first + 1, last + 1], 'support_retreat_m': report['selected']['support_retreat_m'],
                  'wrist_world_delta_m': report['selected']['wrist_world_delta_m'],
                  'all_context_frames': len(report['selected']['samples']), 'seconds': report['seconds']}), flush=True)
