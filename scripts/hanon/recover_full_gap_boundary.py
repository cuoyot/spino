"""Recover one proven free-neighbour boundary from its immutable candidate table.

The existing family and every completed earlier field stay intact. A small
measured index/middle preparation is available only around the failed boundary;
actual skin, key and prepared-pad checks decide its use. Full CMC, fresh scans
and independent native/visual review still follow.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import time

import numpy as np
from mathutils import Matrix, Vector

parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, required=True)
parser.add_argument('--hand', choices=('left', 'right'), required=True)
parser.add_argument('--frame', type=int, required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--failed-dir', type=Path, required=True)
parser.add_argument('--probe', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = args.author_root.resolve()
sys.path[:0] = [str(Path(__file__).resolve().parent), str(root), str(root.parent)]
from input_record_io import load, save
from exact_solver_cache import install
from excerpt_gap_family import MODES, offsets
from excerpt_free_preparation import contact_distances
from self_clearance import prepare_partitions
import pad_metrics

out = args.output_dir.resolve()
out.mkdir(parents=True, exist_ok=True)
assert not (out / 'boundary-repair-state.json').exists(), 'Preserve previous boundary evidence'
failed = args.failed_dir.resolve()
plan_path = failed / f'{args.hand}-plan.json'
prefix_path = failed / f'{args.hand}-checkpoint.json'
source = failed / f'calibrated-search-input-{args.hand}.json'
plan = json.loads(plan_path.read_text())
prefix = json.loads(prefix_path.read_text())
assert not prefix['failures'] and plan['windows'] == prefix['windows']
assert len(plan['failures']) == 1 and plan['failures'][0]['infeasible_frames'] == [args.frame]
failure = plan['failures'][0]
assert failure['reason'] == 'No physically clear gap-family state'
original_source = Path(plan['source'])
assert hashlib.sha256(original_source.read_bytes()).hexdigest() == plan['source_input_sha256']
assert original_source.resolve() == Path(prefix['source']).resolve()
proof = json.loads(args.probe.read_text())
assert proof['source_sha256'] == hashlib.sha256(source.read_bytes()).hexdigest()
assert any(r['frame'] == args.frame and r['nong_thumb_gap_pass'] and r['prepared_pulp_pass']
           for r in proof['free_context_probes']), 'A measured healthy boundary witness is required'
table_path = failed / f'{args.hand}-window-{failure["first_frame"]}-{failure["last_frame"]}-infeasible.npz'
table = np.load(table_path)
low, high = int(table['first']), int(table['last'])
assert low + 1 == failure['first_frame'] and high + 1 == failure['last_frame']
assert (np.where(~np.isfinite(table['costs']).any(axis=1))[0] + low + 1).tolist() == [args.frame]
record = load(source, root, args.hand)
assert len(record['wrists']) == 2880
cache = install(record)
rotation = Matrix.Rotation(math.radians(16), 3, 'X')
partitions = prepare_partitions(record['geometry'])
prepared = pad_metrics.prepare(record['geometry'], root.parent / 'assets' / (args.hand + '.glb'), args.hand)
distances = contact_distances(record)
world = {f: [p.copy() for p in values] for f, values in record['world'].items()}
started = time.monotonic()


def entry(path):
    return {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


report = {'number': args.number, 'hand': args.hand, 'productionReady': False,
          'status': 'Measured local boundary preparation and saved-table recovery running',
          'source': entry(source), 'originalSource': entry(original_source), 'originalPlan': entry(plan_path),
          'retainedPrefix': entry(prefix_path), 'originalCandidateTable': entry(table_path),
          'measuredWitness': entry(args.probe.resolve()),
          'generatorSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'failedNativeFrame': args.frame, 'recoveredWindow': [low + 1, high + 1],
          'earlierCompletedWindows': len(prefix['windows']), 'failures': [],
          'scope': 'Only free index/middle contextual preferences near this measured boundary. All scored supports, wrist, thumb, other fingers, fixed geometry and original earlier fields remain invariant. Authoring bounds are not anatomy limits.'}


def checkpoint():
    report['seconds'] = time.monotonic() - started
    temporary = out / 'boundary-repair-state.json.tmp'
    temporary.write_text(json.dumps(report, indent=2) + '\n')
    temporary.replace(out / 'boundary-repair-state.json')


def check(i, delta, pulp=False):
    for finger in range(2, 6):
        record['world'][finger][i] = world[finger][i] + Vector(delta[finger - 2])
    try:
        for finger in range(2, 6):
            if distances[finger][i] == 0:
                assert np.linalg.norm(delta[finger - 2]) < 1e-9, 'A prepared support moved'
        result = cache.solve(record, i, rotation, thumb_clearance=(0, 0))
        cross = cache.cross(result[1], partitions)
        keys = result[3]['white_collisions'] + result[3]['black_collisions']
        active = int(record['metadata']['active_finger'][i])
        idle = [r for r in result[3]['fingers'] if r['finger'] != active
                and r['minimum_actual_key_clearance_m'] is not None
                and r['minimum_actual_key_clearance_m'] <= .00045]
        passed = not any(int(f) != 1 for f in cross) and not keys and not idle
        metric = {}
        if passed and pulp and record['prepare'][i]:
            metric = pad_metrics.support(record['geometry'], result[0], result[1], rotation, active,
                                         int(record['metadata']['note_d'][i]),
                                         float(record['metadata']['pressure'][i]), prepared)
            passed = metric['key_skin_error_m'] < .0003 and (
                active == 1 or metric['intrinsic_support_radial_dot_dorsal_mean'] < 0)
        return passed, {'frame': i + 1, 'crossings': cross, 'key_collisions': keys,
                        'low_idle_count': len(idle), 'prepared_support': metric}
    except Exception as error:
        return False, {'frame': i + 1, 'error': str(error)}
    finally:
        for finger in range(2, 6):
            record['world'][finger][i] = world[finger][i].copy()


checkpoint()
try:
    # The frozen177-state table is reused exactly outside the measured boundary.
    descriptors = [(gap, index_extra, middle_depth) for gap in (14, 15, 16)
                   for index_extra in (0, .0005, .001, .0015, .002)
                   for middle_depth in (0, -.0005, -.001, -.0015)
                   if index_extra or middle_depth]
    old_count = table['costs'].shape[1]
    length = high - low + 1
    total = old_count + len(descriptors)
    costs = np.full((length, total), np.inf)
    deltas = np.zeros((length, total, 4, 3))
    costs[:, :old_count] = table['costs']
    deltas[:, :old_count] = table['deltas']
    mode = [name for name, _ in MODES].index('23')
    center = args.frame - 1
    context_low, context_high = center - 5, center + 7
    lateral_sign = 1 if args.hand == 'left' else -1
    healthy_states = []
    for i in range(context_low, context_high + 1):
        t = ((i - context_low) / (center - context_low) if i <= center
             else (context_high - i) / (context_high - center))
        envelope = t * t * (3 - 2 * t)
        for column, (gap, index_extra, middle_depth) in enumerate(descriptors, old_count):
            candidate = offsets(record, args.hand, i, mode, gap * .001, distances, rotation)
            if candidate is None:
                continue
            if distances[2][i] == 0 and index_extra:
                continue
            candidate[0, 0] += lateral_sign * index_extra * envelope
            if distances[3][i] > 0:
                candidate[1, 1] += middle_depth * envelope
            # Free radial bounds are checked by the unchanged fixed-length solve.
            passed, detail = check(i, candidate, pulp=True)
            if passed:
                deltas[i - low, column] = candidate
                costs[i - low, column] = .1 * float(np.sum((candidate / .001) ** 2))
                if i == center:
                    healthy_states.append({'column': column, 'gap_mm': gap,
                                           'extra_index_lateral_m': lateral_sign * index_extra,
                                           'free_middle_depth_m': middle_depth, 'detail': detail})
        print(json.dumps({'stage': 'boundary-context-candidates', 'frame': i + 1,
                          'finite_states': int(np.isfinite(costs[i - low]).sum()),
                          'seconds': time.monotonic() - started}), flush=True)
    assert np.isfinite(costs).any(axis=1).all(), 'Measured context still has an unresolved frame'
    assert healthy_states
    report['healthy_boundary_states'] = healthy_states
    np.savez_compressed(out / 'augmented-final-window.npz', costs=costs, deltas=deltas,
                        first=low, last=high, descriptors=np.array(descriptors), original_states=table['states'])
    checkpoint()

    values = np.where(np.isfinite(costs[0]), 0.0, np.inf)
    for row in range(1, length):
        difference = (deltas[row - 1, :, None] - deltas[row, None, :]) / .001
        step = np.max(np.linalg.norm(difference, axis=-1), axis=-1)
        values = np.min(np.maximum(values[:, None], step), axis=0)
        values[~np.isfinite(costs[row])] = np.inf
    bound = max(.00301, float(np.min(values)) * .001 + 1e-9)
    cumulative = costs.copy()
    previous = np.zeros(costs.shape, dtype=np.int16)
    for row in range(1, length):
        difference = (deltas[row - 1, :, None] - deltas[row, None, :]) / .001
        step = np.max(np.linalg.norm(difference, axis=-1), axis=-1)
        transitions = 8 * np.sum(difference ** 2, axis=(-2, -1))
        transitions[step > bound / .001] = np.inf
        candidates = cumulative[row - 1, :, None] + transitions
        previous[row] = np.argmin(candidates, axis=0)
        cumulative[row] += np.min(candidates, axis=0)
    last = int(np.argmin(cumulative[-1]))
    assert np.isfinite(cumulative[-1, last]), 'The measured states do not form a finite route'
    selected = np.zeros(length, dtype=int)
    for row in range(length - 1, -1, -1):
        selected[row] = last
        last = int(previous[row, last])
    field = deltas[np.arange(length), selected].copy()
    for _ in range(2):
        proposed = field.copy()
        for row in range(1, length - 1):
            i = low + row
            value = (field[row - 1] + 2 * field[row] + field[row + 1]) / 4
            for finger in range(2, 6):
                if distances[finger][i] == 0:
                    value[finger - 2] = 0
            if max(np.linalg.norm(value - field[row - 1], axis=1).max(),
                   np.linalg.norm(field[row + 1] - value, axis=1).max()) > bound:
                continue
            if np.max(np.abs(value - field[row])) > 1e-10 and check(i, value, pulp=True)[0]:
                proposed[row] = value
        field = proposed
    all_field = np.asarray(prefix['world_corrections_m'], dtype=float)
    assert all_field.shape == (2880, 4, 3)
    assert np.max(np.abs(all_field[low:high + 1])) == 0, 'The failed tail must not replace an earlier field'
    retained = all_field.copy()
    all_field[low:high + 1] = field
    assert np.array_equal(all_field[:low], retained[:low]), 'Earlier completed fields changed'
    support_samples = []
    checked = 0
    for i, value in enumerate(all_field):
        if np.any(value) or low <= i <= high:
            passed, detail = check(i, value, pulp=True)
            assert passed, ('Selected or retained field failed actual skin/key/pulp checks', detail)
            if low <= i <= high:
                support_samples.append(detail)
            checked += 1
        if (i + 1) % 240 == 0:
            print(json.dumps({'stage': 'retained-and-recovered-fields-fresh-check',
                              'frame': i + 1, 'checked_nonzero_or_tail_frames': checked,
                              'seconds': time.monotonic() - started}), flush=True)
    for i, value in enumerate(all_field):
        for finger in range(2, 6):
            record['world'][finger][i] += Vector(value[finger - 2])
    output_input = out / f'input-{args.hand}.json'
    save(record, output_input)
    report.update(status='Recovered whole gap input passed actual selected/retained checks; fullCMC/fresh/native review pending',
                  input=entry(output_input), retainedEarlierFieldsExactly=True,
                  freshCheckedNonzeroOrTailFrames=checked, finalWindowSupportSamples=support_samples,
                  authoringBottleneckM=bound,
                  maximumFinalCorrectionM=float(np.linalg.norm(field, axis=-1).max()),
                  maximumFinalCorrectionStepM=float(np.linalg.norm(np.diff(field, axis=0), axis=-1).max()),
                  geometryCheckedRelaxationPasses=2,
                  selected_augmented_native_frames=(np.where(selected >= old_count)[0] + low + 1).tolist())
except Exception as error:
    report.update(status='Incomplete physical boundary recovery; do not export', error=str(error))
    report['failures'].append(str(error))
    checkpoint()
    raise
checkpoint()
print(json.dumps({k: report[k] for k in ('status', 'authoringBottleneckM', 'maximumFinalCorrectionStepM',
                                       'selected_augmented_native_frames', 'seconds')}), flush=True)
