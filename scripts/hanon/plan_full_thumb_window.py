"""Route a free thumb through measured whole-skin clearance.

The reviewed playing/prepared thumb is pinned. Search bounds are authoring
controls, not anatomical limits; the final native motion review remains a gate.
"""
import argparse
from array import array
from collections import OrderedDict
import hashlib
import json
import math
from pathlib import Path
import sys
import time

import numpy as np
from mathutils import Matrix

parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, required=True)
parser.add_argument('--hand', choices=('left', 'right'), required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--input-path', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
parser.add_argument('--original-precheck', type=Path, required=True)
parser.add_argument('--original-generator', type=Path, required=True)
parser.add_argument('--only-window', required=True, help='One original native first:last window')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = args.author_root.resolve()
sys.path.insert(0, str(root))
sys.path.insert(0, str(root.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from input_record_io import load, save
from excerpt_thumb_clearance import apply_arc, windows
from piano_preparation import contact_neighbours
from self_clearance import prepare_partitions
from exact_solver_cache import install

out = args.output_dir.resolve()
out.mkdir(parents=True, exist_ok=True)
assert not (out / f'{args.hand}-thumb-plan.json').exists(), 'Preserve previous evidence'
start = time.monotonic()
record = load(args.input_path.resolve(), root, args.hand)
cache = install(record)
rotation = Matrix.Rotation(math.radians(16), 3, 'X')
partitions = prepare_partitions(record['geometry'])
thumb_partition = {1: partitions[1]}
m = record['metadata']
count = len(record['wrists'])
contact = [int(m['active_finger'][i]) == 1 and m['pressure'][i] > .001 for i in range(count)]
distance = contact_neighbours(contact)[2]
angles = np.zeros((count, 2))
report = {
    'exercise': args.number, 'hand': args.hand,
    'method': 'Exact native-input candidate memoization, measured feasible-state bottleneck routing and actual-skin checked relaxation. Free-thumb CMC offsets retain the reviewed articulated thumb and fixed lengths. Prepared/playing thumb supports stay fixed. Fresh full-five-finger and native review are required afterward.',
    'source_input': str(args.input_path.resolve()),
    'source_input_sha256': hashlib.sha256(args.input_path.read_bytes()).hexdigest(),
    'generator_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'pinned_prepared_thumb_distance_frames': 1,
    'authoring_controls_are_not_anatomical_acceptance': True,
    'full_five_finger_native_audit_required': True,
    'precheck': {'frames': count, 'thumb_crossing_frames': [], 'non_thumb_failures': [], 'physics_failures': []},
    'windows': [], 'failures': [], 'evaluated_states': 0,
}


def emit(stage, **values):
    print(json.dumps({'stage': stage, 'exercise': args.number, 'hand': args.hand,
                      **values, 'seconds': time.monotonic() - start}), flush=True)


def write_checkpoint():
    report['exact_search_cache'] = cache.stats
    report['seconds'] = time.monotonic() - start
    (out / f'{args.hand}-thumb-checkpoint.json').write_text(
        json.dumps(report | {'angles_radians': angles.tolist()}, indent=2) + '\n')


# Reuse only an immutable complete precheck for the identical source. The
# numerical search below is unchanged; full fresh/native gates remain required.
original = json.loads(args.original_precheck.read_text())
assert original['exercise'] == args.number and original['hand'] == args.hand
assert Path(original['source_input']).resolve() == args.input_path.resolve()
assert original['source_input_sha256'] == report['source_input_sha256']
assert original['generator_sha256'] == hashlib.sha256(args.original_generator.read_bytes()).hexdigest()
assert original['precheck']['frames'] == count == 2880
assert not original['precheck']['physics_failures'] and not original['precheck']['non_thumb_failures']
assert not original['failures']
assert not np.any(np.asarray(record['clearance_angles'])), 'Original independent-window source must have zero CMC offsets'
report['precheck'] = original['precheck']
report['reused_exact_source_precheck'] = {
    'path': str(args.original_precheck.resolve()),
    'sha256': hashlib.sha256(args.original_precheck.read_bytes()).hexdigest(),
    'original_generator': str(args.original_generator.resolve()),
    'original_generator_sha256': original['generator_sha256'],
    'meaning': 'Scheduling input only; not a fresh final source scan'}
report['partial_original_window_only'] = True
requested = tuple(int(v) for v in args.only_window.split(':'))
original_windows = windows([frame - 1 for frame in report['precheck']['thumb_crossing_frames']], count)
assert requested in [(low + 1, high + 1) for low, high in original_windows]
report['original_windows_native'] = [[low + 1, high + 1] for low, high in original_windows]
if report['precheck']['non_thumb_failures'] or report['precheck']['physics_failures']:
    report['failures'].append({'reason': 'Long-finger or physical context must be repaired before CMC routing'})
else:
    # Stable global state IDs permit local refinement without replacing evidence.
    states = np.array([(a, b) for a in np.arange(0, 6.01, .5)
                       for b in np.arange(0, 10.01, .5)])
    radians = np.radians(states)
    primary = np.where((states[:, 0] <= 3) & (states[:, 1] <= 3)
                       & (states[:, 0] % 1 == 0) & (states[:, 1] % 1 == 0))[0]
    small = np.where((states[:, 0] <= 3) & (states[:, 1] <= 3))[0]
    expanded_integer = np.where((states[:, 0] % 1 == 0) & (states[:, 1] % 1 == 0))[0]
    step = np.linalg.norm(states[:, None] - states[None, :], axis=-1)
    preference = .1 * np.sum(states ** 2, axis=1)
    memo = OrderedDict()
    memo_checks = 0

    for low, high in original_windows:
        if (low + 1, high + 1) != requested:
            continue
        length = high - low + 1
        costs = np.full((length, len(states)), np.inf)
        tested = [set() for _ in range(length)]
        bases = {}
        local_failures = []

        def valid_uncached(i, angle):
            if distance[i] <= 1 and np.any(angle):
                return False
            result = apply_arc(record, i, rotation, bases[i], angle)
            check = result[3]
            if check['white_collisions'] or check['black_collisions']:
                return False
            if any(row['finger'] != int(m['active_finger'][i])
                   and row['minimum_actual_key_clearance_m'] is not None
                   and row['minimum_actual_key_clearance_m'] < .00045 for row in check['fingers']):
                return False
            return not cache.cross(result[1], thumb_partition)

        def valid(i, angle):
            global memo_checks
            key = cache.solve_key(record, i, rotation, (0, 0)) + array('d', angle).tobytes()
            if key in memo:
                result = memo.pop(key)
                memo[key] = result
                if memo_checks < 8:
                    assert valid_uncached(i, angle) == result, 'Exact CMC duplicate mismatch'
                    memo_checks += 1
                return result
            result = valid_uncached(i, angle)
            memo[key] = result
            while len(memo) > 8192:
                memo.popitem(last=False)
            return result

        def evaluate(i, ids):
            for sid in ids:
                sid = int(sid)
                if sid in tested[i - low]:
                    continue
                tested[i - low].add(sid)
                if ((i in (low, high) and i not in (0, count - 1)) or distance[i] <= 1) and sid:
                    continue
                report['evaluated_states'] += 1
                if valid(i, radians[sid]):
                    costs[i - low, sid] = preference[sid]

        for i in range(low, high + 1):
            bases[i] = cache.solve(record, i, rotation, thumb_clearance=(0, 0))
            evaluate(i, primary)
            if not np.isfinite(costs[i - low]).any():
                evaluate(i, small)
            if not np.isfinite(costs[i - low]).any():
                evaluate(i, expanded_integer)
            if not np.isfinite(costs[i - low]).any():
                evaluate(i, range(len(states)))
            if not np.isfinite(costs[i - low]).any():
                local_failures.append({'frame': i + 1,
                                       'prepared_thumb_pinned': bool(distance[i] <= 1),
                                       'reason': 'No actual-skin clear state in the measured CMC family'})
            if (i - low) % 48 == 0:
                emit('thumb-measured-candidates', window=[low + 1, high + 1], frame=i + 1,
                     evaluated=report['evaluated_states'], blocked_frames=len(local_failures))
        np.savez_compressed(out / f'{args.hand}-thumb-window-{low+1}-{high+1}.npz',
                            costs=costs, states=states, first=low, last=high)
        if local_failures:
            report['failures'].extend(local_failures)
            write_checkpoint()
            break

        def bottleneck():
            values = np.where(np.isfinite(costs[0]), 0., np.inf)
            for row in range(1, length):
                values = np.min(np.maximum(values[:, None], step), axis=0)
                values[~np.isfinite(costs[row])] = np.inf
            return float(np.min(values)) if high == count - 1 else float(values[0])

        bound = max(1.51, bottleneck() + 1e-8)
        transitions = 8 * step ** 2
        transitions[step > bound] = np.inf
        cumulative = costs.copy()
        previous = np.zeros(costs.shape, dtype=np.int16)
        for row in range(1, length):
            candidates = cumulative[row - 1, :, None] + transitions
            previous[row] = np.argmin(candidates, axis=0)
            cumulative[row] += np.min(candidates, axis=0)
        sid = int(np.argmin(cumulative[-1])) if high == count - 1 else 0
        assert np.isfinite(cumulative[-1, sid]), 'Measured state route unexpectedly disconnected'
        selected = np.zeros(length, dtype=int)
        for row in range(length - 1, -1, -1):
            selected[row] = sid
            sid = int(previous[row, sid])
        values = radians[selected].copy()
        for _ in range(2):
            proposed = values.copy()
            for row in range(1, length - 1):
                point = (values[row - 1] + 2 * values[row] + values[row + 1]) / 4
                if np.linalg.norm(point - values[row]) > 1e-8 and valid(low + row, point):
                    proposed[row] = point
            values = proposed
        for row, value in enumerate(values):
            assert valid(low + row, value), 'Selected CMC state no longer clears'
        angles[low:high + 1] = values
        degrees = np.degrees(values)
        window = {'first_frame': low + 1, 'last_frame': high + 1,
                  'minimum_feasible_states': int(np.isfinite(costs).sum(axis=1).min()),
                  'measured_authoring_bottleneck_degrees': bound,
                  'maximum_palmar_degrees': float(degrees[:, 0].max()),
                  'maximum_outward_yaw_degrees': float(degrees[:, 1].max()),
                  'maximum_step_degrees': float(np.linalg.norm(np.diff(degrees, axis=0), axis=1).max()) if length > 1 else 0,
                  'nonzero_frames': int(np.count_nonzero(np.any(values, axis=1))),
                  'geometry_checked_relaxation_passes': 2}
        report['windows'].append(window)
        write_checkpoint()
        emit('thumb-measured-route', window=window)
    report['exact_cmc_duplicates_checked'] = memo_checks

report['angles_radians'] = angles.tolist()
report['exact_search_cache'] = cache.stats
report['seconds'] = time.monotonic() - start
report['status'] = 'Partial original-window CMC field only; no full source clearance' if not report['failures'] else 'Incomplete physical context; do not export'
(out / f'{args.hand}-thumb-plan.json').write_text(json.dumps(report, indent=2) + '\n')
if report['failures']:
    raise ValueError(report['failures'][:8])
record['clearance_angles'] = angles.tolist()
save(record, out / f'input-{args.hand}.json')
emit('thumb-route-finished', status=report['status'], windows=len(report['windows']))
